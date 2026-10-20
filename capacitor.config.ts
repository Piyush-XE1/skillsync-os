import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.skillsync.os",
  appName: "SkillSync",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#08080A",
  },
};

export default config;
