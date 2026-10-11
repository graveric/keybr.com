import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import {
  FakeResultContext,
  type KeyStatsMap,
  ResultFaker,
} from "@keybr/result";
import { FakeSettingsContext } from "@keybr/settings";
import { Histogram } from "@keybr/textinput";
import { render, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { isNotNull, isNull } from "rich-assert";
import { ResultGrouper } from "./ResultGrouper.tsx";
import { SlowestTransitionsSection } from "./SlowestTransitionsSection.tsx";

const faker = new ResultFaker();

function makeResult() {
  return faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: 0x0061,
        hitCount: 10,
        missCount: 1,
        timeToType: 100,
        bigrams: new Map([
          [
            0x0062,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 100,
              prevKeyId: "KeyB",
              currentKeyId: "KeyA",
            },
          ],
        ]),
      },
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
      {
        // 'j' is on the right hand, so a -> j is a cross-hand transition.
        codePoint: 0x006a,
        hitCount: 10,
        missCount: 1,
        timeToType: 150,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 150,
              prevKeyId: "KeyA",
              currentKeyId: "KeyJ",
            },
          ],
        ]),
      },
      { codePoint: 0x0063, hitCount: 10, missCount: 1, timeToType: 300 },
    ]),
  });
}

function renderSection() {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <FakeResultContext initialResults={[makeResult()]}>
          <ResultGrouper>
            {(keyStatsMap: KeyStatsMap) => (
              <SlowestTransitionsSection keyStatsMap={keyStatsMap} />
            )}
          </ResultGrouper>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );
  return r;
}

test("render transitions table", async () => {
  const r = renderSection();

  isNotNull(await r.findByText("Slowest Transitions"));
  isNotNull(await r.findByText("KeyA \u2192 KeyB"));
  isNotNull(await r.findByText("KeyB \u2192 KeyA"));
  isNotNull(await r.findByText("KeyA \u2192 KeyJ"));

  r.unmount();
});

test("filter transitions by pair type", async () => {
  const user = userEvent.setup();
  const r = renderSection();

  isNotNull(await r.findByText("KeyA \u2192 KeyJ"));

  // Same hand: both left-hand transitions, the cross-hand one is hidden.
  await user.click(within(r.getByTitle("Pairs:")).getByText("\u25BA"));
  await user.click(within(r.getByRole("menu")).getByText("Same hand"));
  isNotNull(await r.findByText("KeyA \u2192 KeyB"));
  isNotNull(await r.findByText("KeyB \u2192 KeyA"));
  isNull(r.queryByText("KeyA \u2192 KeyJ"));

  // Cross hand: only the left-to-right transition is shown.
  await user.click(within(r.getByTitle("Pairs:")).getByText("\u25BA"));
  await user.click(within(r.getByRole("menu")).getByText("Cross hand"));
  isNull(r.queryByText("KeyA \u2192 KeyB"));
  isNull(r.queryByText("KeyB \u2192 KeyA"));
  isNotNull(await r.findByText("KeyA \u2192 KeyJ"));

  r.unmount();
});
