import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { type KeySample } from "@keybr/result";
import { FakeSettingsContext } from "@keybr/settings";
import { render } from "@testing-library/react";
import { equal, isNotNull } from "rich-assert";
import { KeySpeedDetails } from "./KeySpeedDetails.tsx";

function makeSample(
  timeStamp: number,
  timeToType: number,
  filteredTimeToType = timeToType,
): KeySample {
  return {
    index: 0,
    timeStamp,
    hitCount: 1,
    missCount: 0,
    timeToType,
    filteredTimeToType,
  };
}

function renderDetails(samples: readonly KeySample[]) {
  return render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <KeySpeedDetails samples={samples} />
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );
}

test("render speeds", () => {
  // Arrange.

  const r = renderDetails([makeSample(Date.now(), 500)]);

  // Assert.

  isNotNull(r.queryByText("Today:"));
  isNotNull(r.queryByText("All time:"));
  isNotNull(r.queryByText("Last raw:"));
  isNotNull(r.queryByText("Max raw:"));
  equal(r.queryAllByText("24.0wpm").length, 4);
  equal(r.queryAllByText("N/A").length, 0);

  r.unmount();
});

test("render smoothed today and all time averages", () => {
  // Arrange.

  const r = renderDetails([makeSample(Date.now(), 500, 1000)]);

  // Assert.

  equal(r.queryAllByText("12.0wpm").length, 2);
  equal(r.queryAllByText("24.0wpm").length, 2);

  r.unmount();
});

test("render N/A without samples", () => {
  // Arrange.

  const r = renderDetails([]);

  // Assert.

  equal(r.queryAllByText("N/A").length, 4);

  r.unmount();
});

test("render N/A for today without today samples", () => {
  // Arrange.

  const r = renderDetails([makeSample(0, 500)]);

  // Assert.

  equal(r.queryAllByText("24.0wpm").length, 3);
  equal(r.queryAllByText("N/A").length, 1);

  r.unmount();
});
