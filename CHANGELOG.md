# Changelog

## 0.2.0

### Added

- `limit` prop to cap the number of rendered posts.
- `separator` prop (correct spelling); `seperator` is kept as a deprecated alias.
- Exported `ClassList` type shared by all components.
- Tests (vitest + Astro container API) and GitHub Actions CI.

### Changed

- Replaced `rss-parser` with the built-in `fetch` and `fast-xml-parser`.
- `astro` is now a peer dependency (`>=4`); package publishes only `src/` via `files`/`exports`.
- Posts with a missing or invalid date no longer render `Invalid Date`; dates use a `<time>` element.
- Updated prettier and prettier-plugin-astro.

### Fixed

- README documented `seperate`, which never matched the actual prop.
