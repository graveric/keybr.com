import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { LessonKey, LessonKeys } from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { type KeySample, type KeyStats, type KeyStatsMap } from "@keybr/result";
import { FakeSettingsContext } from "@keybr/settings";
import { render } from "@testing-library/react";
import { equal, isNotNull, isNull } from "rich-assert";
import { CurrentKeySpeedRow } from "./indicators.tsx";

const letter = FakePhoneticModel.letter1;

function makeSample(timeStamp: number, timeToType: number): KeySample {
  return {
    index: 0,
    timeStamp,
    hitCount: 1,
    missCount: 0,
    timeToType,
    filteredTimeToType: timeToType,
  };
}

function makeKeyStatsMap(samples: readonly KeySample[]): KeyStatsMap {
  const keyStats: KeyStats = {
    letter,
    samples,
    timeToType: null,
    bestTimeToType: null,
    bigrams: [],
  };
  return {
    letters: [letter],
    results: [],
    get: () => keyStats,
    [Symbol.iterator]: () => [keyStats][Symbol.iterator](),
  };
}

function makeLessonKeys({ focused = true } = {}): LessonKeys {
  return new LessonKeys([
    new LessonKey({
      letter,
      samples: [],
      timeToType: null,
      bestTimeToType: null,
      confidence: null,
      bestConfidence: null,
      isFocused: focused,
    }),
  ]);
}

function renderRow({
  lessonKeys,
  keyStatsMap,
}: {
  lessonKeys: LessonKeys;
  keyStatsMap: KeyStatsMap;
}) {
  return render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <CurrentKeySpeedRow lessonKeys={lessonKeys} keyStatsMap={keyStatsMap} />
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );
}

test("render today and all time speed", () => {
  // Arrange.

  const r = renderRow({
    lessonKeys: makeLessonKeys(),
    keyStatsMap: makeKeyStatsMap([makeSample(Date.now(), 500)]),
  });

  // Assert.

  isNotNull(r.queryByText("Today:"));
  isNotNull(r.queryByText("All time:"));
  isNotNull(r.queryByText("Last raw:"));
  isNotNull(r.queryByText("Max raw:"));
  equal(r.queryAllByText("24.0wpm").length, 4);
  equal(r.queryAllByText("N/A").length, 0);

  r.unmount();
});

test("render N/A for today without today samples", () => {
  // Arrange.

  const r = renderRow({
    lessonKeys: makeLessonKeys(),
    keyStatsMap: makeKeyStatsMap([makeSample(0, 500)]),
  });

  // Assert.

  equal(r.queryAllByText("24.0wpm").length, 3);
  equal(r.queryAllByText("N/A").length, 1);

  r.unmount();
});

test("render last and max raw speed", () => {
  // Arrange.

  const now = Date.now();
  const r = renderRow({
    lessonKeys: makeLessonKeys(),
    keyStatsMap: makeKeyStatsMap([
      makeSample(now, 500),
      makeSample(now + 1, 100),
    ]),
  });

  // Assert.

  equal(r.queryAllByText("72.0wpm").length, 2);
  equal(r.queryAllByText("120.0wpm").length, 2);

  r.unmount();
});

test("render nothing without a focused key", () => {
  // Arrange.

  const r = renderRow({
    lessonKeys: makeLessonKeys({ focused: false }),
    keyStatsMap: makeKeyStatsMap([makeSample(Date.now(), 500)]),
  });

  // Assert.

  isNull(r.queryByText("Today:"));
  isNull(r.queryByText("Last raw:"));

  r.unmount();
});
