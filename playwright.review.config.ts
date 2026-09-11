import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

/** Reproduce the actual keyboard-driven catch as a review video. */
export default defineConfig({
  ...config,
  testMatch: ["lakeside.spec.ts", "mobile.spec.ts"],
  grep: /the crafted net catches|plays Solo Fishing with an on-screen/,
  projects: [config.projects![0], config.projects![3]],
  workers: 1,
  outputDir: "test-results/art-review",
  use: {
    ...config.use,
    viewport: { width: 1280, height: 720 },
    video: { mode: "on", size: { width: 1280, height: 720 } },
  },
});
