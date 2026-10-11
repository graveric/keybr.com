import { test } from "node:test";
import { fail } from "rich-assert";
import { KEY_IDS, keyIdFromIndex, keyIdToIndex } from "./keys.ts";
import { Layout } from "./layout.ts";
import { loadKeyboard } from "./load.ts";

test("the key id registry covers all keys of every layout", () => {
  const seen = new Set<string>();
  for (const layout of Layout.ALL) {
    for (const geometry of layout.geometries) {
      const keyboard = loadKeyboard(layout, geometry);
      for (const id of keyboard.shapes.keys()) {
        seen.add(id);
      }
      for (const id of keyboard.characters.keys()) {
        seen.add(id);
      }
    }
  }
  for (const id of seen) {
    if (keyIdToIndex(id) < 0) {
      fail(`Key identifier ${id} is missing from the registry`);
    }
  }
});

test("the key id index round trips", () => {
  for (const [index, id] of KEY_IDS.entries()) {
    if (keyIdFromIndex(index) !== id) {
      fail(`Index ${index} maps to an unexpected key identifier`);
    }
  }
  if (keyIdFromIndex(KEY_IDS.length) != null) {
    fail("Out of bounds index should map to null");
  }
});