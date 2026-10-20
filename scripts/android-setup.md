# SkillSync → Android APK

SkillSync ships as a **fully offline** Android app. The web app is built into a
static bundle, the bundle is packaged inside a native shell (Capacitor), and the
result is an installable `.apk`. No server, no network, no cloud.

Everything below is already wired up in this repo:

```
scripts/build-mobile.mjs        builds the offline bundle (dist/client)
capacitor.config.ts             native app id / name / webDir
android/                        the native Android project (committed)
android/app/build.gradle        version + release signing (reads secrets)
.github/workflows/android.yml   cloud build pipeline → downloadable APK
```

---

## Option A — Build in the cloud (recommended, nothing to install)

### 1. Push this project to GitHub

In Lovable: **Plus (+) menu → GitHub → Connect**, then push.

### 2. Create your signing key (once, on your own machine)

The key identifies you as the publisher. **Keep it forever** — every future
update must be signed with the same key or Android refuses to install it.

```bash
keytool -genkey -v -keystore skillsync-release.jks \
  -alias skillsync -keyalg RSA -keysize 2048 -validity 10000
```

Store the file and the two passwords in a password manager. Then encode it:

```bash
# macOS
base64 -i skillsync-release.jks | pbcopy
# Linux
base64 -w0 skillsync-release.jks
```

### 3. Add four GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                      | Value                         |
| --------------------------- | ----------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | the base64 string from step 2 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password             |
| `ANDROID_KEY_ALIAS`         | `skillsync`                   |
| `ANDROID_KEY_PASSWORD`      | key password                  |

If you skip this, builds still work — you just get an **unsigned** release APK
(fine for testing, not for sharing).

### 4. Build

- **Actions → Android APK → Run workflow** (optionally set version name/code), or
- push a tag to also create a GitHub Release with the APK attached:

  ```bash
  git tag v1.0.0 && git push origin v1.0.0
  ```

When it finishes, download `skillsync-apk-<version>` from the run's
**Artifacts** section. It contains:

- `SkillSync-<version>-release.apk` → install this one
- `SkillSync-<version>-debug.apk` → for debugging

### 5. Install on your phone

Copy the APK to the device, tap it, and allow _"Install unknown apps"_ for
your file manager / browser when prompted.

---

## Option B — Build locally

Requires **Node 20+**, **JDK 21**, and the **Android SDK**
(easiest via [Android Studio](https://developer.android.com/studio)).

```bash
bun install

# Debug APK (unsigned, installable, quickest)
bun run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk

# Signed release APK
#   create android/keystore.properties first (git-ignored):
#     storeFile=/absolute/path/skillsync-release.jks
#     storePassword=...
#     keyAlias=skillsync
#     keyPassword=...
bun run android:release
# → android/app/build/outputs/apk/release/app-release.apk
```

Prefer Android Studio? `bun run android:sync && bun run android:open`.

---

## Shipping an update

1. Change the code as usual in Lovable and push.
2. Bump the version — `versionCode` **must increase every time**:
   - cloud: pass `versionName` / `versionCode` when running the workflow, or push
     a new `vX.Y.Z` tag (the run number becomes the version code);
   - local: `ORG_GRADLE_PROJECT_skillsyncVersionName=1.1.0
ORG_GRADLE_PROJECT_skillsyncVersionCode=2 bun run android:release`.
3. Install the new APK over the old one.

**Your data survives updates.** SkillSync stores everything locally under the
app id `com.skillsync.os`. Installing a newer, same-signed APK keeps it.
Uninstalling deletes it — so before anything risky, use
**Profile → Backup & Restore → Create Backup** and keep the `.json` file.

---

## Native shell details

| Setting          | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| App id           | `com.skillsync.os`                                                                       |
| App name         | SkillSync                                                                                |
| Min / target SDK | 24 / 36 (Android 7 → 16)                                                                 |
| Orientation      | Portrait                                                                                 |
| Keyboard         | `adjustResize` (pairs with the in-app keyboard-inset handling)                           |
| System bars      | Transparent, dark content, edge-to-edge                                                  |
| Launch screen    | Monograph Noir canvas `#08080A` + brass-and-ivory SkillSync mark                         |
| Permissions      | `INTERNET` (local WebView bridge), `VIBRATE` (haptics), `POST_NOTIFICATIONS` (reminders) |

Icons and the splash mark are generated from `public/icon-512.png` into
`android/app/src/main/res/mipmap-*` and `drawable-*`. Replace that file and
re-generate if the brand mark changes.

## Troubleshooting

| Symptom                   | Fix                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| White screen after launch | Re-run `bun run android:sync`; `dist/client/index.html` must exist                                 |
| "App not installed"       | A different signing key than the installed build — uninstall first, or reuse the original keystore |
| Gradle: SDK not found     | Open the `android/` folder once in Android Studio and let it install the SDK                       |
| Workflow warns "unsigned" | The four GitHub secrets aren't set (see step 3)                                                    |

## Native Android integrations (back button, haptics, notifications)

The APK ships a small first-party Capacitor plugin — no extra npm packages:

| File                         | Role                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MainActivity.java`          | Registers the plugin, re-arms reminders on launch, and handles the Android back gesture via `OnBackPressedDispatcher` (WebView history first, `finish()` only at the root). Notification taps are forwarded to the web app as a `skillsync:open` event. |
| `SkillSyncNativePlugin.java` | JS bridge: `vibrate`, `vibratePattern`, `haptic`, `notify`, `schedule`, `cancel`, `cancelAll`, `listScheduled`, `checkNotificationPermission`, `requestNotificationPermission`, `capabilities`.                                                         |
| `ReminderScheduler.java`     | Notification channel + `AlarmManager` scheduling (exact when allowed), recurrence maths, `NotificationManagerCompat` display.                                                                                                                           |
| `ReminderReceiver.java`      | Fires reminders with the app closed and re-arms recurring ones.                                                                                                                                                                                         |
| `BootReceiver.java`          | Re-arms stored reminders after reboot / app update.                                                                                                                                                                                                     |
| `ReminderStore.java`         | Offline `SharedPreferences` store for scheduled reminders.                                                                                                                                                                                              |

Web side: `src/lib/native/bridge.ts` detects the plugin at runtime. `haptics.ts`,
`notifications/adapter.ts`, `notifications/permission.ts` and
`notifications/native-sync.ts` prefer it and fall back to browser APIs when the
app runs outside the APK. Diagnostics (`/profile/notifications`) reports native
capabilities instead of the browser Notification API when running in the APK.

Permissions added: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`,
`USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` (plus existing `VIBRATE`).
Release signing and the keystore setup are unchanged.
