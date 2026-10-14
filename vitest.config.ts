/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      include: ["src/**"],
      // json-summary feeds the README coverage badge (see .github/workflows/ci.yml)
      reporter: ["text", "html", "clover", "json", "json-summary"],
    },
  },
});
