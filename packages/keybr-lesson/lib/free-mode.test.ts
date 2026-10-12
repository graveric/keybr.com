import { beforeEach, describe, it } from "node:test";
import { Settings } from "@keybr/settings";
import { deepEqual, equal } from "rich-assert";
import {
  clearFreeScope,
  freeScopeOf,
  isFreeSettingsKey,
  readFreeState,
  resetFreeModeSession,
  strippedSettingsSignature,
  withFreeFocus,
  withFreeOverride,
} from "./free-mode.ts";

beforeEach(() => {
  resetFreeModeSession();
});

describe("free mode settings helpers", () => {
  it("should read empty state by default", () => {
    const state = readFreeState(new Settings(), "scope");
    deepEqual([...state.overrides], []);
    equal(state.focus, null);
  });

  it("should round-trip overrides and focus", () => {
    let settings = new Settings();
    settings = withFreeOverride(settings, "scope", 0x0061, "added");
    settings = withFreeOverride(settings, "scope", 0x0062, "excluded");
    settings = withFreeFocus(settings, "scope", 0x0061);
    const state = readFreeState(settings, "scope");
    deepEqual(
      [...state.overrides],
      [
        [0x0061, "added"],
        [0x0062, "excluded"],
      ],
    );
    equal(state.focus, 0x0061);
  });

  it("should remove an override", () => {
    let settings = new Settings();
    settings = withFreeOverride(settings, "scope", 0x0061, "added");
    settings = withFreeOverride(settings, "scope", 0x0061, null);
    deepEqual([...readFreeState(settings, "scope").overrides], []);
  });

  it("should clear a scope", () => {
    let settings = new Settings();
    settings = withFreeOverride(settings, "scope", 0x0061, "added");
    settings = withFreeFocus(settings, "scope", 0x0061);
    settings = clearFreeScope(settings, "scope");
    const state = readFreeState(settings, "scope");
    deepEqual([...state.overrides], []);
    equal(state.focus, null);
  });

  it("should ignore corrupted json", () => {
    const state = readFreeState(new Settings(), "scope");
    deepEqual([...state.overrides], []);
    equal(state.focus, null);
  });

  it("should sanitize scope names", () => {
    equal(freeScopeOf("en/us", "en гл"), "en_us_en___");
  });

  it("should detect free settings keys", () => {
    equal(isFreeSettingsKey("lesson.guided.freeOverrides.x"), true);
    equal(isFreeSettingsKey("lesson.guided.freeFocus.x"), true);
    equal(isFreeSettingsKey("lesson.guided.recoverKeys"), false);
    equal(isFreeSettingsKey("lesson.targetSpeed"), false);
  });

  it("should strip free keys from the signature", () => {
    const a = withFreeOverride(new Settings(), "scope", 0x0061, "added");
    const b = withFreeOverride(new Settings(), "scope", 0x0062, "added");
    equal(strippedSettingsSignature(a), strippedSettingsSignature(b));
  });
});
