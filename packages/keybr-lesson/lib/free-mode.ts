import { numberProp, type Settings, stringProp } from "@keybr/settings";
import { type CodePoint } from "@keybr/unicode";
import { type Lesson } from "./lesson.ts";

export type FreeOverride = "added" | "excluded";

export type FreeState = {
  readonly overrides: ReadonlyMap<CodePoint, FreeOverride>;
  readonly focus: CodePoint | null;
};

export const noFreeState: FreeState = {
  overrides: new Map(),
  focus: null,
};

const OVERRIDES_PREFIX = "lesson.guided.freeOverrides.";
const FOCUS_PREFIX = "lesson.guided.freeFocus.";

export function isFreeSettingsKey(key: string): boolean {
  return key.startsWith(OVERRIDES_PREFIX) || key.startsWith(FOCUS_PREFIX);
}

/**
 * Scope of the manual letter choices. Keyed by keyboard layout and
 * language, so choices made for one language never leak into another.
 * Intentionally does not include `keyboardOrder`: overrides are stored
 * by code point (not by position), the tail is recomputed in whatever
 * order is currently active.
 */
export function freeScope(lesson: Lesson): string {
  const raw = `${lesson.keyboard.layout.id}.${lesson.model.language.id}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function freeScopeOf(layoutId: string, languageId: string): string {
  return `${layoutId}.${languageId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function freeOverridesProp(scope: string) {
  return stringProp(`${OVERRIDES_PREFIX}${scope}`, "{}", {
    maxLength: 10000,
  });
}

export function freeFocusProp(scope: string) {
  return numberProp(`${FOCUS_PREFIX}${scope}`, -1, {
    min: -1,
    max: 0x10ffff,
  });
}

export function readFreeState(settings: Settings, scope: string): FreeState {
  const overrides = new Map<CodePoint, FreeOverride>();
  try {
    const json = JSON.parse(settings.get(freeOverridesProp(scope))) as unknown;
    if (json != null && typeof json === "object") {
      for (const [key, value] of Object.entries(json)) {
        const codePoint = Number(key);
        if (
          Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          (value === "added" || value === "excluded")
        ) {
          overrides.set(codePoint, value);
        }
      }
    }
  } catch {
    // Corrupted JSON, treat as empty.
  }
  const focus = settings.get(freeFocusProp(scope));
  return {
    overrides,
    focus: focus >= 0 ? focus : null,
  };
}

export function withFreeOverride(
  settings: Settings,
  scope: string,
  codePoint: CodePoint,
  override: FreeOverride | null,
): Settings {
  const { overrides, focus } = readFreeState(settings, scope);
  const next = new Map(overrides);
  if (override == null) {
    next.delete(codePoint);
  } else {
    next.set(codePoint, override);
  }
  return withFreeState(settings, scope, { overrides: next, focus });
}

export function withFreeFocus(
  settings: Settings,
  scope: string,
  focus: CodePoint | null,
): Settings {
  const { overrides } = readFreeState(settings, scope);
  return withFreeState(settings, scope, { overrides, focus });
}

export function clearFreeScope(settings: Settings, scope: string): Settings {
  return withFreeState(settings, scope, noFreeState);
}

function withFreeState(
  settings: Settings,
  scope: string,
  state: FreeState,
): Settings {
  const json: Record<string, FreeOverride> = {};
  for (const [codePoint, override] of state.overrides) {
    json[String(codePoint)] = override;
  }
  return settings
    .set(freeOverridesProp(scope), JSON.stringify(json))
    .set(freeFocusProp(scope), state.focus ?? -1);
}

/**
 * Signature of the settings with all free-mode override keys stripped.
 * Used as a React memo/effect dependency so that manual letter clicks
 * (which persist through the global settings) do not recreate the
 * lesson or reseed the progress. The fresh override values reach
 * `GuidedLesson.update()` through the session store below instead.
 */
export function strippedSettingsSignature(settings: Settings): string {
  const json = settings.toJSON() as Record<string, unknown>;
  const entries = Object.entries(json).filter(
    ([key]) => !isFreeSettingsKey(key),
  );
  return JSON.stringify(entries);
}

// Session store. Holds the freshest free-mode choices during the practice
// session so that clicks regenerate the lesson instantly, without waiting
// for the global settings round-trip (which would also recreate the lesson
// and reseed the progress). The global settings copy is still updated on
// every click for persistence and cross-device sync; the session entry wins
// while it exists and is hydrated from the settings on first use.

const session = new Map<string, FreeState>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  for (const listener of [...listeners]) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion(): number {
  return version;
}

export const freeModeStore = {
  subscribe,
  getVersion,
};

export function hydrateFreeScope(settings: Settings, scope: string): void {
  if (!session.has(scope)) {
    session.set(scope, readFreeState(settings, scope));
  }
}

export function applyFreeOverride(
  scope: string,
  codePoint: CodePoint,
  override: FreeOverride | null,
): void {
  const current = session.get(scope) ?? noFreeState;
  const next = new Map(current.overrides);
  if (override == null) {
    next.delete(codePoint);
  } else {
    next.set(codePoint, override);
  }
  session.set(scope, { overrides: next, focus: current.focus });
  emit();
}

export function applyFreeFocus(scope: string, focus: CodePoint | null): void {
  const current = session.get(scope) ?? noFreeState;
  session.set(scope, { overrides: current.overrides, focus });
  emit();
}

export function clearFreeSession(scope: string): void {
  session.set(scope, noFreeState);
  emit();
}

export function getEffectiveFreeState(
  settings: Settings,
  lesson: Lesson,
): FreeState {
  const scope = freeScope(lesson);
  return session.get(scope) ?? readFreeState(settings, scope);
}

/** Test helper, resets the in-memory session store. */
export function resetFreeModeSession(): void {
  session.clear();
  emit();
}
