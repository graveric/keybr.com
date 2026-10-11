import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import {
  Geometry,
  KeyboardContext,
  Layout,
  loadKeyboard,
} from "@keybr/keyboard";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { render } from "@testing-library/react";
import { isNotNull, isNull, isTrue } from "rich-assert";
import { LastSessionTransitionsPanel } from "./LastSessionTransitionsPanel.tsx";

const keyboard = loadKeyboard(Layout.EN_US, Geometry.ANSI_101);

function makeResult() {
  return new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.now(),
    10,
    1000,
    0,
    new Histogram([
      {
        codePoint: 0x0062,
        hitCount: 10,
        missCount: 1,
        timeToType: 200,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 200,
              prevKeyId: "KeyA",
              currentKeyId: "KeyB",
            },
          ],
        ]),
      },
    ]),
  );
}

function renderPanel(result: Result | null) {
  return render(
    <FakeIntlProvider>
      <KeyboardContext.Provider value={keyboard}>
        <LastSessionTransitionsPanel result={result} />
      </KeyboardContext.Provider>
    </FakeIntlProvider>,
  );
}

test("render nothing without a result", () => {
  const r = renderPanel(null);
  isNull(r.queryByText("Last session transitions"));
  r.unmount();
});

test("render nothing for a result without bigrams", () => {
  const result = new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.now(),
    10,
    1000,
    0,
    new Histogram([
      { codePoint: 0x0061, hitCount: 10, missCount: 1, timeToType: 100 },
    ]),
  );
  const r = renderPanel(result);
  isNull(r.queryByText("Last session transitions"));
  r.unmount();
});

test("render the slowest transitions of the last result", () => {
  const r = renderPanel(makeResult());
  isNotNull(r.getByText("Last session transitions"));
  isTrue(r.container.textContent?.includes("a \u2192 b"));
  r.unmount();
});

test("render cyrillic letters literally, not as U+XXXX", () => {
  const result = new Result(
    Layout.RU_RU,
    TextType.GENERATED,
    Date.now(),
    10,
    1000,
    0,
    new Histogram([
      {
        codePoint: 0x043f,
        hitCount: 10,
        missCount: 1,
        timeToType: 300,
        bigrams: new Map([
          [
            0x0430,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 300,
              prevKeyId: "KeyF",
              currentKeyId: "KeyH",
            },
          ],
        ]),
      },
    ]),
  );
  const r = renderPanel(result);
  isNotNull(r.getByText("Last session transitions"));
  isTrue(r.container.textContent?.includes("\u0430 \u2192 \u043f"));
  r.unmount();
});
