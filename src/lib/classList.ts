import type { ClassList } from "../types";

let warned = false;

/**
 * Maps the deprecated `toot*` keys to their `post*` names (the new name wins
 * when both are set) and warns once per process when old keys are used.
 */
export function resolveClassList(classList: ClassList): ClassList {
  const resolved: Record<string, string | undefined> = { ...classList };
  const legacy = Object.keys(classList).filter((key) => key.startsWith("toot"));
  for (const key of legacy) {
    const modern = key.replace(/^toot/, "post");
    resolved[modern] ??= resolved[key];
    delete resolved[key];
  }
  if (legacy.length > 0 && !warned) {
    warned = true;
    console.warn(
      `[astro-fedifeed] classList keys starting with "toot" are deprecated; rename them to "post" (${legacy.join(", ")})`,
    );
  }
  return resolved as ClassList;
}
