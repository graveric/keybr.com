import { type KeyId } from "./types.ts";

/**
 * The canonical ordered list of all physical key identifiers.
 *
 * This list is the union of key identifiers across all geometry dictionaries.
 * The order is stable and must be preserved to keep backward compatibility of
 * the binary result format. New key identifiers must be appended at the end,
 * never inserted in the middle.
 */
export const KEY_IDS: readonly KeyId[] = [
  "AltLeft",
  "AltRight",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Backquote",
  "Backslash",
  "Backspace",
  "BracketLeft",
  "BracketRight",
  "CapsLock",
  "Comma",
  "ControlLeft",
  "ControlRight",
  "Delete",
  "Digit0",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "End",
  "Enter",
  "Equal",
  "Home",
  "Insert",
  "IntlBackslash",
  "IntlHanZen",
  "IntlHenkan",
  "IntlHiraKata",
  "IntlMuhenkan",
  "IntlRo",
  "IntlYen",
  "KeyA",
  "KeyB",
  "KeyC",
  "KeyD",
  "KeyE",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyI",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyM",
  "KeyN",
  "KeyO",
  "KeyP",
  "KeyQ",
  "KeyR",
  "KeyS",
  "KeyT",
  "KeyU",
  "KeyV",
  "KeyW",
  "KeyX",
  "KeyY",
  "KeyZ",
  "Lang1",
  "Lang2",
  "Minus",
  "NumLock",
  "Numpad0",
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad5",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",
  "NumpadAdd",
  "NumpadDecimal",
  "NumpadDivide",
  "NumpadEnter",
  "NumpadMultiply",
  "NumpadSubtract",
  "PageDown",
  "PageUp",
  "Period",
  "Quote",
  "Semicolon",
  "ShiftLeft",
  "ShiftRight",
  "Slash",
  "Space",
  "Tab",
  "ThumbClusterLeft1",
  "ThumbClusterLeft2",
  "ThumbClusterRight1",
  "ThumbClusterRight2",
];

/**
 * Convert a key identifier to its index in the canonical key list.
 * Throws an error if the given identifier is not a known physical key.
 */
export function keyIdToIndex(id: KeyId): number {
  const index = KEY_IDS.indexOf(id);
  if (index < 0) {
    throw new Error(`Unknown key identifier: ${id}`);
  }
  return index;
}

/**
 * Convert an index in the canonical key list to the key identifier.
 * Returns null if the given index is out of bounds.
 */
export function keyIdFromIndex(index: number): KeyId | null {
  return KEY_IDS[index] ?? null;
}