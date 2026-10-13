import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/node_modules", "**/coverage", "**/.astro", "**/dist"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs["jsx-a11y-recommended"],
  {
    files: ["test/**", "*.config.*"],
    languageOptions: { globals: globals.node },
  },
  {
    // Mastodon's RSS has no caption tracks, so <video>/<audio> can't have a <track>.
    files: ["src/components/FeedMedia.astro"],
    rules: { "astro/jsx-a11y/media-has-caption": "off" },
  },
  prettier,
);
