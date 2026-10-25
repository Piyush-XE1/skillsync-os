#!/usr/bin/env node
/**
 * Pre-flight validator for the Android project.
 *
 * Gradle is slow and its resource errors are terse ("Invalid unicode escape
 * sequence in string" without telling you which line), so everything aapt2
 * would reject is checked here first — in a second, with the exact file and
 * line. Run it before a build:
 *
 *   node scripts/validate-android-resources.mjs
 *
 * It is deliberately dependency-free: the repo builds the APK on a runner with
 * nothing installed but Bun, Node and the Android SDK.
 *
 * Checks
 *  1. every res/**\/*.xml and the manifest is well-formed;
 *  2. string resources follow aapt2's escaping rules (apostrophes, quotes,
 *     backslashes, leading @ / ?, stray %);
 *  3. string attributes in layouts are escaped the same way;
 *  4. no duplicate resource names;
 *  5. every @type/name reference and every Java R.type.name exists;
 *  6. every <receiver>/<activity> in the manifest exists as a class;
 *  7. widget layouts only use views RemoteViews can inflate.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const RES = join(ROOT, "android/app/src/main/res");
const JAVA_DIR = join(ROOT, "android/app/src/main/java/com/skillsync/os");
const MANIFEST = join(ROOT, "android/app/src/main/AndroidManifest.xml");

const errors = [];
const fail = (file, line, message) => errors.push({ file, line, message });

/* ------------------------------ file walking ----------------------------- */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const allResFiles = walk(RES);
const resFiles = allResFiles.filter((path) => path.endsWith(".xml"));
const allXml = [...resFiles, MANIFEST];

/* --------------------------- 1. well-formedness -------------------------- */

function checkWellFormed(file) {
  const source = readFileSync(file, "utf8");
  const stack = [];
  let line = 1;
  let i = 0;

  const advance = (text) => {
    for (const ch of text) if (ch === "\n") line += 1;
  };

  while (i < source.length) {
    const lt = source.indexOf("<", i);
    if (lt < 0) break;
    advance(source.slice(i, lt));

    if (source.startsWith("<!--", lt)) {
      const end = source.indexOf("-->", lt);
      if (end < 0) return fail(file, line, "unterminated comment");
      advance(source.slice(lt, end + 3));
      i = end + 3;
      continue;
    }
    if (source.startsWith("<![CDATA[", lt)) {
      const end = source.indexOf("]]>", lt);
      if (end < 0) return fail(file, line, "unterminated CDATA");
      advance(source.slice(lt, end + 3));
      i = end + 3;
      continue;
    }
    if (source.startsWith("<?", lt)) {
      const end = source.indexOf("?>", lt);
      if (end < 0) return fail(file, line, "unterminated declaration");
      advance(source.slice(lt, end + 2));
      i = end + 2;
      continue;
    }

    // Scan to the matching ">" while respecting quoted attribute values.
    let j = lt + 1;
    let quote = null;
    while (j < source.length) {
      const ch = source[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j += 1;
    }
    if (j >= source.length) return fail(file, line, "unterminated tag");

    const raw = source.slice(lt, j + 1);
    advance(source.slice(lt, j + 1));

    if (raw.startsWith("</")) {
      const name = raw.slice(2, -1).trim();
      const open = stack.pop();
      if (!open) fail(file, line, `closing </${name}> without an opener`);
      else if (open.name !== name) {
        fail(file, line, `closing </${name}> but <${open.name}> was opened on line ${open.line}`);
      }
    } else if (!raw.endsWith("/>")) {
      const name = raw.slice(1).match(/^[A-Za-z_:][\w.:-]*/)?.[0];
      if (name) stack.push({ name, line });
    }
    i = j + 1;
  }

  if (stack.length > 0) {
    const open = stack[stack.length - 1];
    fail(file, open.line, `<${open.name}> is never closed`);
  }
}

for (const file of allXml) checkWellFormed(file);

/* ------------------------- 2 & 3. string escaping ------------------------ */

/** aapt2 rejects a bare apostrophe, a bare double quote and a dangling \. */
function checkEscaping(value) {
  const problems = [];
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\\") {
      if (i === value.length - 1) problems.push("string ends with a lone backslash");
      i += 1;
      continue;
    }
    if (ch === "'")
      problems.push(
        "apostrophe must be escaped as \\' (or wrap the whole string in double quotes)",
      );
    if (ch === '"') problems.push('double quote must be escaped as \\"');
  }
  return problems;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const stringNames = new Map(); // name -> file:line
const stringValues = new Map();

for (const file of resFiles.filter((path) => /values[^/]*[/\\][^/\\]+\.xml$/.test(path))) {
  const source = readFileSync(file, "utf8");
  const pattern = /<string\b([^>]*)>([\s\S]*?)<\/string>/g;
  let match;
  while ((match = pattern.exec(source))) {
    const attrs = match[1];
    const name = attrs.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const where = `${relative(ROOT, file)}:${lineOf(source, match.index)}`;
    if (stringNames.has(name)) {
      fail(
        file,
        lineOf(source, match.index),
        `duplicate string "${name}" (also ${stringNames.get(name)})`,
      );
    } else {
      stringNames.set(name, where);
    }
    const value = match[2];
    stringValues.set(name, value);
    for (const problem of checkEscaping(value)) {
      fail(file, lineOf(source, match.index), `string "${name}": ${problem}`);
    }
    if (
      /^[@?]/.test(value.trim()) &&
      !value.trim().startsWith("\\@") &&
      !value.trim().startsWith("\\?")
    ) {
      fail(file, lineOf(source, match.index), `string "${name}" starts with @ or ? — escape it`);
    }
    // A lone % is a format marker: aapt2 expects positional args or formatted="false".
    const percentCount = (value.match(/(?<!\\)%/g) ?? []).length;
    if (percentCount === 1 && !/formatted="false"/.test(attrs)) {
      fail(
        file,
        lineOf(source, match.index),
        `string "${name}" has a single % — use %% or add formatted="false"`,
      );
    }
  }
}

const STRING_ATTRIBUTES = [
  "android:text",
  "android:hint",
  "android:contentDescription",
  "android:title",
];

for (const file of resFiles.filter((path) => path.includes(`${join("res", "layout")}`))) {
  const source = readFileSync(file, "utf8");
  for (const attr of STRING_ATTRIBUTES) {
    const pattern = new RegExp(`${attr}="([^"]*)"`, "g");
    let match;
    while ((match = pattern.exec(source))) {
      const value = match[1];
      if (value.startsWith("@") || value.startsWith("?")) continue;
      for (const problem of checkEscaping(value)) {
        fail(file, lineOf(source, match.index), `${attr}: ${problem}`);
      }
    }
  }
}

/* ---------------------------- 4. duplicate resources --------------------- */

const defined = {
  string: new Set(),
  color: new Set(),
  drawable: new Set(),
  layout: new Set(),
  id: new Set(),
  xml: new Set(),
  style: new Set(),
  mipmap: new Set(),
  array: new Set(),
  bool: new Set(),
  integer: new Set(),
  dimen: new Set(),
};
const defineWith = (kind, file, source, regex) => {
  let match;
  while ((match = regex.exec(source))) defined[kind].add(match[1]);
};

// Bitmaps count as resources too: drawable-hdpi/splash_logo.png defines
// @drawable/splash_logo, so scan every file, not just XML.
for (const file of allResFiles) {
  const base = file.split("/").pop();
  const stem = base.replace(/\.(xml|png|webp|jpg)$/, "");
  if (file.includes("mipmap")) {
    defined.mipmap.add(stem);
  } else if (/drawable(-[a-z0-9]+)*(-v\d+)?$/.test(file.split("/").slice(-2)[0])) {
    defined.drawable.add(stem);
  }
}

for (const file of resFiles) {
  const source = readFileSync(file, "utf8");
  if (file.includes(`${join("res", "layout")}`)) {
    defined.layout.add(
      relative(RES, file)
        .split("/")
        .pop()
        .replace(/\.xml$/, ""),
    );
    defineWith("id", file, source, /@\+id\/([A-Za-z0-9_]+)/g);
  }
  if (file.includes(`${join("res", "xml")}`)) {
    defined.xml.add(
      relative(RES, file)
        .split("/")
        .pop()
        .replace(/\.xml$/, ""),
    );
  }
  defineWith("color", file, source, /<color name="([A-Za-z0-9_]+)"/g);
  defineWith("style", file, source, /<style name="([A-Za-z0-9_.]+)"/g);
  defineWith("string", file, source, /<string name="([A-Za-z0-9_.]+)"/g);
  defineWith("array", file, source, /<(?:string-array|integer-array) name="([A-Za-z0-9_]+)"/g);
  defineWith("bool", file, source, /<bool name="([A-Za-z0-9_]+)"/g);
  defineWith("integer", file, source, /<integer name="([A-Za-z0-9_]+)"/g);
  defineWith("dimen", file, source, /<dimen name="([A-Za-z0-9_]+)"/g);
}

/* ------------------- 5. references (xml + java) -------------------------- */

const IGNORED = new Set(["android", "tools", "app"]);

function checkReference(kind, name, file, line) {
  const bucket = defined[kind];
  if (!bucket) return; // @+id, @{...}, data binding…
  if (IGNORED.has(kind)) return;
  if (kind === "id") return; // ids may be declared anywhere
  if (!bucket.has(name)) fail(file, line, `@${kind}/${name} is not defined`);
}

for (const file of [...resFiles, MANIFEST]) {
  const source = readFileSync(file, "utf8");
  const pattern = /@(?!\+)([a-z]+)\/([A-Za-z0-9_.]+)/g;
  let match;
  while ((match = pattern.exec(source))) {
    checkReference(match[1], match[2], file, lineOf(source, match.index));
  }
}

const javaFiles = walk(JAVA_DIR).filter((path) => path.endsWith(".java"));
for (const file of javaFiles) {
  const source = readFileSync(file, "utf8");
  const pattern = /R\.([a-z]+)\.([A-Za-z0-9_]+)/g;
  let match;
  while ((match = pattern.exec(source))) {
    const [, kind, name] = match;
    if (kind === "id") continue;
    if (!defined[kind]) continue;
    if (!defined[kind].has(name)) {
      fail(file, lineOf(source, match.index), `R.${kind}.${name} does not exist`);
    }
  }
}

/* ------------------- 6. manifest classes exist as files ------------------ */

const classNames = new Set(
  javaFiles.map((path) =>
    path
      .split("/")
      .pop()
      .replace(/\.java$/, ""),
  ),
);
const manifestSource = readFileSync(MANIFEST, "utf8");
for (const match of manifestSource.matchAll(/android:name="\.([A-Za-z0-9_]+)"/g)) {
  if (!classNames.has(match[1])) {
    fail(
      MANIFEST,
      lineOf(manifestSource, match.index),
      `class ${match[1]} does not exist in ${relative(ROOT, JAVA_DIR)}`,
    );
  }
}

/* ----------------------- 7. RemoteViews view allow-list ------------------ */

const REMOTEVIEW_SAFE = new Set([
  "LinearLayout",
  "FrameLayout",
  "RelativeLayout",
  "GridLayout",
  "TextView",
  "ImageView",
  "ImageButton",
  "Button",
  "ProgressBar",
  "Chronometer",
  "AnalogClock",
  "ViewFlipper",
  "ListView",
  "GridView",
  "StackView",
  "AdapterViewFlipper",
  "TextClock",
  "ViewStub",
  "Space",
]);

// widget_expense_dialog / widget_capture_dialog are real activities, not widgets.
const DIALOG_LAYOUTS = new Set(["widget_expense_dialog.xml", "widget_capture_dialog.xml"]);

for (const file of resFiles.filter((path) => /layout[/\\]widget_.*\.xml$/.test(path))) {
  const base = file.split("/").pop();
  if (DIALOG_LAYOUTS.has(base)) continue;
  const source = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  for (const match of source.matchAll(/<([A-Za-z][A-Za-z0-9.]*)[\s/>]/g)) {
    if (!REMOTEVIEW_SAFE.has(match[1])) {
      fail(file, lineOf(source, match.index), `<${match[1]}> cannot be inflated by RemoteViews`);
    }
  }
}

/* -------------------------- override visibility -------------------------- */
/*
 * javac only says "attempting to assign weaker access privileges; was public"
 * after Gradle has spent a minute getting there. A Java override may widen
 * visibility but never narrow it, so check each @Override against the parent's
 * real declaration: the Capacitor sources in node_modules when the parent is a
 * Capacitor class, otherwise a table of framework signatures.
 */

const ACCESS_RANK = { private: 0, package: 1, protected: 2, public: 3 };

// Framework parents we subclass. Signatures from the AOSP sources they ship as.
const FRAMEWORK_METHODS = {
  "android.app.Activity": {
    onCreate: "protected",
    onStart: "protected",
    onResume: "protected",
    onPause: "protected",
    onStop: "protected",
    onDestroy: "protected",
    onNewIntent: "protected",
    onRestart: "protected",
    onPostCreate: "protected",
    onPostResume: "protected",
    onSaveInstanceState: "protected",
    onRestoreInstanceState: "protected",
    onActivityResult: "protected",
    onConfigurationChanged: "protected",
    onUserLeaveHint: "protected",
    onBackPressed: "public",
    onRequestPermissionsResult: "public",
    onCreateOptionsMenu: "public",
    onOptionsItemSelected: "public",
  },
  "android.app.Service": {
    onCreate: "public",
    onStartCommand: "public",
    onDestroy: "public",
    onBind: "public",
  },
  "android.content.BroadcastReceiver": { onReceive: "public" },
  "android.appwidget.AppWidgetProvider": {
    onReceive: "public",
    onUpdate: "public",
    onEnabled: "public",
    onDisabled: "public",
    onDeleted: "public",
    onRestored: "public",
    onAppWidgetOptionsChanged: "public",
  },
  "android.view.View": {
    onDraw: "protected",
    onMeasure: "protected",
    onLayout: "protected",
    onTouchEvent: "public",
  },
};

const METHOD_DECL = (source) =>
  new RegExp(
    String.raw`(^|\n)[ \t]*(public|protected|private)?[ \t]*(?:static[ \t]+|final[ \t]+|abstract[ \t]+|synchronized[ \t]+)*[\w<>\[\],.? \t]+[ \t]+(\w+)[ \t]*\(([^)]*)\)`,
    "g",
  );

const arity = (args) => args.split(",").filter((part) => part.trim().length > 0).length;
const declKey = (name, args) => `${name}/${arity(args)}`;

/** method key -> weakest access a subclass may use (the parent's own modifier). */
function methodsOf(source) {
  const map = new Map();
  for (const match of source.matchAll(METHOD_DECL())) {
    const modifier = match[2] || "package";
    if (["if", "for", "while", "switch", "catch", "return", "new"].includes(match[3])) continue;
    if (modifier === "private") continue; // private methods are not overridden
    map.set(declKey(match[3], match[4]), modifier);
  }
  return map;
}

// Both sources end up as Map<"method/arity" | "method/*", modifier>.
const parents = new Map();
for (const [name, methods] of Object.entries(FRAMEWORK_METHODS)) {
  parents.set(
    name,
    new Map(Object.entries(methods).map(([method, modifier]) => [`${method}/*`, modifier])),
  );
}

// Our own base classes count too: SkillSyncWidgetProvider declares
// `public abstract String widgetType()`, so the 13 providers must keep it public.
for (const file of javaFiles) {
  const source = readFileSync(file, "utf8");
  const name = /class\s+(\w+)/.exec(source)?.[1];
  if (name) parents.set(name, methodsOf(source));
}

const CAPACITOR_DIR = join(
  ROOT,
  "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor",
);
try {
  for (const file of walk(CAPACITOR_DIR).filter((path) => path.endsWith(".java"))) {
    const source = readFileSync(file, "utf8");
    const name = /class\s+(\w+)/.exec(source)?.[1];
    if (name) parents.set(name, methodsOf(source));
  }
} catch {
  console.warn(
    "! node_modules/@capacitor/android not installed — skipping Capacitor override checks",
  );
}

/** Loose framework match: our code names parents either fully or simply. */
function parentMethods(superName) {
  if (!superName) return null;
  const simple = superName.split(".").pop();
  return (
    parents.get(superName) ??
    parents.get(`android.app.${simple}`) ??
    [...parents].find(([key]) => key.split(".").pop() === simple && key !== simple)?.[1] ??
    null
  );
}

let overridesChecked = 0;

for (const file of javaFiles) {
  const source = readFileSync(file, "utf8");
  const declaration = /class\s+(\w+)\s+extends\s+([\w.]+)/.exec(source);
  if (!declaration) continue;
  const inherited = parentMethods(declaration[2]);
  if (!inherited) continue;
  for (const match of source.matchAll(
    /@Override\s*\n\s*(?:(public|protected|private)\s+)?[^;\n(]*?(\w+)\s*\(([^)]*)\)/g,
  )) {
    const modifier = match[1] || "package";
    const name = match[2];
    const args = match[3].split(",").filter((part) => part.trim().length > 0).length;
    // Framework entries are keyed by name only; Capacitor ones carry the arity.
    const required = inherited.get(`${name}/${args}`) ?? inherited.get(`${name}/*`);
    if (!required) continue;
    overridesChecked += 1;
    if (ACCESS_RANK[modifier] < ACCESS_RANK[required]) {
      fail(
        file,
        lineOf(source, match.index),
        `${declaration[1]}.${name}() is ${modifier} but ${declaration[2]}.${name}() is ${required} — ` +
          `an override may widen visibility, never narrow it`,
      );
    }
  }
}

/* -------------------------------- report --------------------------------- */

if (errors.length === 0) {
  console.log(
    `✓ Android resources valid (${allXml.length} XML files, ${defined.layout.size} layouts, ` +
      `${defined.string.size} strings, ${overridesChecked} overrides checked)`,
  );
  process.exit(0);
}

for (const { file, line, message } of errors) {
  console.error(`✗ ${relative(ROOT, file)}:${line}: ${message}`);
}
console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"} found.`);
process.exit(1);
