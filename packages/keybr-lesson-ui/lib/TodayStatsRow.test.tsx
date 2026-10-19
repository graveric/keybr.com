import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { makeSummaryStats, ResultFaker } from "@keybr/result";
import { FakeSettingsContext } from "@keybr/settings";
import { render } from "@testing-library/react";
import { equal, isNotNull } from "rich-assert";
import { TodayStatsRow } from "./indicators.tsx";

const faker = new ResultFaker();

test("render without results", () => {
  // Arrange.

  const stats = makeSummaryStats([]);

  // Act.

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <TodayStatsRow summaryStats={stats} />
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  // Assert.

  isNotNull(r.queryByText("Statistics for Today:"));
  isNotNull(r.queryByText("Average speed:"));
  isNotNull(r.queryByText("Top speed:"));
  isNotNull(r.queryByText("Average accuracy:"));
  isNotNull(r.queryByText("Top accuracy:"));
  equal(r.queryAllByText("N/A").length, 4);

  r.unmount();
});

test("render with results", () => {
  // Arrange.

  const stats = makeSummaryStats(faker.nextResultList(3));

  // Act.

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <TodayStatsRow summaryStats={stats} />
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  // Assert.

  isNotNull(r.queryByText("Statistics for Today:"));
  equal(r.queryAllByText("N/A").length, 0);

  r.unmount();
});
