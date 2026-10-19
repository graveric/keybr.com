import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { Geometry, keyboardProps, Layout } from "@keybr/keyboard";
import { FakeResultContext, ResultFaker } from "@keybr/result";
import { FakeSettingsContext, Settings, useSettings } from "@keybr/settings";
import { fireEvent, render } from "@testing-library/react";
import { equal, includes, isNull } from "rich-assert";
import { LayoutSwitcher } from "./LayoutSwitcher.tsx";

const faker = new ResultFaker();

test("include the current layout", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings().set(
          keyboardProps.layout,
          Layout.EN_DVORAK,
        )}
      >
        <FakeResultContext
          initialResults={[faker.nextResult({ layout: Layout.EN_US })]}
        >
          <LayoutSwitcher />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  includes((await r.findByTitle("Layout")).textContent!, "Dvorak");

  fireEvent.click(await r.findByText(/Dvorak/));
  equal(r.getAllByRole("menuitem").length, 2);

  r.unmount();
});

test("hide when only one layout", () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings().set(keyboardProps.layout, Layout.EN_US)}
      >
        <FakeResultContext>
          <LayoutSwitcher />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNull(r.queryByTitle("Layout"));

  r.unmount();
});

test("show used layouts and switch", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings()
          .set(keyboardProps.layout, Layout.EN_US)
          .set(keyboardProps.geometry, Geometry.ANSI_101)}
      >
        <FakeResultContext
          initialResults={[
            faker.nextResult({ layout: Layout.EN_US }),
            faker.nextResult({ layout: Layout.DE_DE }),
            faker.nextResult({ layout: Layout.EN_US }),
          ]}
        >
          <LayoutSwitcher />
          <SettingsProbe />
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  equal((await r.findByTitle("layout")).textContent, "en-us");

  fireEvent.click(await r.findByText("English/United States"));
  equal(r.getAllByRole("menuitem").length, 2);

  fireEvent.click(await r.findByText(/German/));

  equal((await r.findByTitle("layout")).textContent, "de-de");
  equal((await r.findByTitle("language")).textContent, "de");
  equal((await r.findByTitle("geometry")).textContent, "ansi101");

  r.unmount();
});

function SettingsProbe() {
  const { settings } = useSettings();
  return (
    <div>
      <div title="layout">{settings.get(keyboardProps.layout).id}</div>
      <div title="language">{settings.get(keyboardProps.language).id}</div>
      <div title="geometry">{settings.get(keyboardProps.geometry).id}</div>
    </div>
  );
}
