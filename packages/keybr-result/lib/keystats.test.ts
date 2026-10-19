import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { Histogram } from "@keybr/textinput";
import { deepEqual, equal } from "rich-assert";
import { ResultFaker } from "./fake.tsx";
import {
  averageFilteredKeySpeed,
  averageKeySpeed,
  type KeySample,
  lastKeySpeed,
  maxKeySpeed,
  MutableKeyStatsMap,
} from "./keystats.ts";

test("compute key stats", () => {
  const faker = new ResultFaker();
  const l1 = new Letter(0x0061, 1, "A");
  const l2 = new Letter(0x0062, 1, "B");
  const r1 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
      },
    ]),
  });
  const r2 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l2.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
      },
    ]),
  });
  const r3 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
      },
    ]),
  });

  const keyStatsMap = new MutableKeyStatsMap([l1, l2]);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [],
    timeToType: null,
    bestTimeToType: null,
    bigrams: [],
  });

  keyStatsMap.append(r1);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
    ],
    timeToType: 500,
    bestTimeToType: 500,
    bigrams: [],
  });

  keyStatsMap.append(r2);
  keyStatsMap.append(r3);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
      {
        index: 2,
        timeStamp: r3.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
        filteredTimeToType: 460,
      },
    ],
    timeToType: 460,
    bestTimeToType: 460,
    bigrams: [],
  });

  deepEqual(keyStatsMap.copy().get(l2), {
    letter: l2,
    samples: [
      {
        index: 1,
        timeStamp: r2.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
        filteredTimeToType: 200,
      },
    ],
    timeToType: 200,
    bestTimeToType: 200,
    bigrams: [],
  });
});

test("compute average key speed", () => {
  const samples: readonly KeySample[] = [
    {
      index: 0,
      timeStamp: 1,
      hitCount: 1,
      missCount: 0,
      timeToType: 500,
      filteredTimeToType: 500,
    },
    {
      index: 1,
      timeStamp: 2,
      hitCount: 1,
      missCount: 0,
      timeToType: 100,
      filteredTimeToType: 460,
    },
  ];

  equal(averageKeySpeed(samples), (120 + 600) / 2);
  equal(
    averageKeySpeed(samples, { includes: (timeStamp) => timeStamp === 2 }),
    600,
  );
  equal(averageKeySpeed([]), 0);
  equal(averageFilteredKeySpeed(samples), (120 + 60000 / 460) / 2);
  equal(
    averageFilteredKeySpeed(samples, {
      includes: (timeStamp) => timeStamp === 2,
    }),
    60000 / 460,
  );
  equal(averageFilteredKeySpeed([]), 0);
  equal(lastKeySpeed(samples), 600);
  equal(
    lastKeySpeed(samples, { includes: (timeStamp) => timeStamp === 1 }),
    120,
  );
  equal(lastKeySpeed([]), 0);
  equal(maxKeySpeed(samples), 600);
  equal(
    maxKeySpeed(samples, { includes: (timeStamp) => timeStamp === 1 }),
    120,
  );
  equal(maxKeySpeed([]), 0);
});
