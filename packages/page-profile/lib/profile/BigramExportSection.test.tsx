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
import { isNotNull, isTrue } from "rich-assert";
import { BigramExportSection } from "./BigramExportSection.tsx";
import { ResultGrouper } from "./ResultGrouper.tsx";

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

function renderSection() {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <FakeResultContext initialResults={[makeResult()]}>
          <ResultGrouper>
            {(keyStatsMap: KeyStatsMap) => (
              <BigramExportSection keyStatsMap={keyStatsMap} />
            )}
          </ResultGrouper>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );
  return r;
}

test("export transitions as CSV, JSON and SVG", async () => {
  const user = userEvent.setup();
  const r = renderSection();

  const caption = await r.findByText("Export Transition Statistics");
  const figure = caption.closest("figure")!;

  const downloads: { href: string; download: string }[] = [];
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    downloads.push({ href: this.href, download: this.download });
  };

  try {
    await user.click(within(figure).getByText("Download"));
    isTrue(downloads[0].href.startsWith("data:text/csv"));
    isTrue(downloads[0].download.endsWith(".csv"));

    await user.click(within(figure).getByText("\u25BA"));
    await user.click(within(r.getByRole("menu")).getByText("JSON"));
    await user.click(within(figure).getByText("Download"));

    isNotNull(downloads[1]);
    isTrue(downloads[1].href.startsWith("data:application/json"));
    isTrue(downloads[1].download.endsWith(".json"));

    await user.click(within(figure).getByText("\u25BA"));
    await user.click(within(r.getByRole("menu")).getByText("SVG"));
    await user.click(within(figure).getByText("Download"));

    isNotNull(downloads[2]);
    isTrue(downloads[2].href.startsWith("data:image/svg+xml"));
    isTrue(downloads[2].download.endsWith(".svg"));
  } finally {
    HTMLAnchorElement.prototype.click = originalClick;
  }

  r.unmount();
});
