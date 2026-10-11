import { test } from "node:test";
import { Geometry, Layout, loadKeyboard } from "@keybr/keyboard";
import { render } from "@testing-library/react";
import { isNotNull } from "rich-assert";
import { type BigramTransition, TransitionsKeyboard } from "./transitions.tsx";

test("render transitions keyboard", () => {
  const keyboard = loadKeyboard(Layout.EN_US, Geometry.ANSI_101);
  const transitions: readonly BigramTransition[] = [
    {
      prevCodePoint: 0x0061,
      currentCodePoint: 0x0073,
      prevKeyId: "KeyA",
      currentKeyId: "KeyS",
      prevPosition: null,
      currentPosition: null,
      pairType: "unknown",
      hitCount: 10,
      missCount: 1,
      timeToType: 250,
    },
  ];

  const r = render(
    <TransitionsKeyboard keyboard={keyboard} transitions={transitions} />,
  );

  isNotNull(document.querySelector("svg"));

  r.unmount();
});
