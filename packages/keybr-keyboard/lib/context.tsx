import { useSettings } from "@keybr/settings";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type Keyboard } from "./keyboard.ts";
import { loadKeyboard } from "./load.ts";
import { KeyboardOptions } from "./settings.ts";

export const KeyboardContext = createContext<Keyboard>(null!);

export function useKeyboard(): Keyboard {
  const value = useContext(KeyboardContext);
  if (value == null) {
    throw new Error(
      process.env.NODE_ENV !== "production"
        ? "KeyboardContext is missing"
        : undefined,
    );
  }
  return value;
}

export function KeyboardProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  const { settings } = useSettings();
  // The keyboard instance must stay stable when unrelated settings change.
  // In particular, manual free-mode letter choices persist through the
  // global settings on every click, but must not reload the keyboard
  // (which would cascade into reloading the lesson and reseeding
  // the progress with an empty statistics).
  // The memo key is the keyboard options by identity: enum items are
  // canonical instances, so the keyboard rebuilds only when a real
  // keyboard setting changes.
  const { language, layout, geometry, zones } = KeyboardOptions.from(settings);
  const keyboard = useMemo(
    () =>
      loadKeyboard(
        KeyboardOptions.default()
          .withLanguage(language)
          .withLayout(layout)
          .withGeometry(geometry)
          .withZones(zones),
      ),
    [language, layout, geometry, zones],
  );
  return (
    <KeyboardContext.Provider value={keyboard}>
      {children}
    </KeyboardContext.Provider>
  );
}
