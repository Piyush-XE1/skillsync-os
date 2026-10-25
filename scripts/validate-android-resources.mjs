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

/* -------------------------------- report --------------------------------- */

if (errors.length === 0) {
  console.log(
    `✓ Android resources valid (${allXml.length} XML files, ${defined.layout.size} layouts, ${defined.string.size} strings)`,
  );
  process.exit(0);
}

for (const { file, line, message } of errors) {
  console.error(`✗ ${relative(ROOT, file)}:${line}: ${message}`);
}
console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"} found.`);
process.exit(1);
