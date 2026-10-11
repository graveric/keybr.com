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
import { render } from "@testing-library/react";
import { isNotNull } from "rich-assert";
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
      { codePoint: 0x0063, hitCount: 10, missCount: 1, timeToType: 300 },
    ]),
  });
}

test("render transitions table", async () => {
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

  isNotNull(await r.findByText("Slowest Transitions"));
  isNotNull(await r.findByText("KeyA \u2192 KeyB"));
  isNotNull(await r.findByText("KeyB \u2192 KeyA"));

  r.unmount();
});
