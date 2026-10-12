import { test } from "node:test";
import {
  Geometry,
  type Keyboard,
  keyboardProps,
  KeyboardProvider,
  useKeyboard,
} from "@keybr/keyboard";
import { lessonProps, withFreeOverride } from "@keybr/lesson";
import {
  FakeSettingsContext,
  Settings,
  type Settings as SettingsType,
  useSettings,
} from "@keybr/settings";
import { act, render } from "@testing-library/react";
import { equal, isTrue } from "rich-assert";

test("keyboard instance stays stable on free-mode clicks", () => {
  let keyboard: Keyboard | null = null;
  let settings: SettingsType = new Settings();
  let update: ((settings: SettingsType) => void) | null = null;

  function Probe() {
    keyboard = useKeyboard();
    const ctx = useSettings();
    settings = ctx.settings;
    update = ctx.updateSettings;
    return null;
  }

  const r = render(
    <FakeSettingsContext>
      <KeyboardProvider>
        <Probe />
      </KeyboardProvider>
    </FakeSettingsContext>,
  );

  const initial = keyboard;
  isTrue(initial != null);

  // Enabling the free mode must not reload the keyboard.
  act(() => {
    update!(settings.set(lessonProps.guided.freeMode, true));
  });
  equal(keyboard, initial);

  // Persisting a manual letter choice must not reload the keyboard.
  act(() => {
    update!(withFreeOverride(settings, "scope", 0x0061, "added"));
  });
  equal(keyboard, initial);

  act(() => {
    update!(withFreeOverride(settings, "scope", 0x0061, null));
  });
  equal(keyboard, initial);

  // A real keyboard setting still reloads the keyboard.
  act(() => {
    update!(settings.set(keyboardProps.geometry, Geometry.ISO_102));
  });
  isTrue(keyboard != null && keyboard !== initial);

  r.unmount();
});
