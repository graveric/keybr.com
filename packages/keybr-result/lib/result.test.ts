import { describe, it, test } from "node:test";
import { Layout } from "@keybr/keyboard";
import { Histogram } from "@keybr/textinput";
import { deepEqual, equal, isFalse, isTrue, throws } from "rich-assert";
import { Result, speedToTime, timeToSpeed } from "./result.ts";
import { TextType } from "./texttype.ts";

describe("validate", () => {
  const result = new Result(
    /* layout= */ Layout.EN_US,
    /* textType= */ TextType.GENERATED,
    /* timeStamp= */ Date.parse("2001-02-03T03:05:06Z"),
    /* length= */ 10,
    /* time= */ 1000,
    /* errors= */ 0,
    /* histogram= */ new Histogram([
      { codePoint: 0x0061, hitCount: 11, missCount: 1, timeToType: 111 },
      { codePoint: 0x0062, hitCount: 22, missCount: 2, timeToType: 222 },
      { codePoint: 0x0063, hitCount: 33, missCount: 3, timeToType: 333 },
    ]),
  );

  describe("using the default filter", () => {
    it("should accept a valid result", () => {
      isTrue(result.validate());
      isTrue(result.validate({}));
      isTrue(result.validate(Result.filter));
    });

    it("should reject if the length is too short", () => {
      isFalse(
        new Result(
          /* layout= */ result.layout,
          /* textType= */ result.textType,
          /* timeStamp= */ result.timeStamp,
          /* length= */ 9,
          /* time= */ result.time,
          /* errors= */ result.errors,
          /* histogram= */ result.histogram,
        ).validate(),
      );
    });

    it("should reject if the time is too short", () => {
      isFalse(
        new Result(
          /* layout= */ result.layout,
          /* textType= */ result.textType,
          /* timeStamp= */ result.timeStamp,
          /* length= */ result.length,
          /* time= */ 999,
          /* errors= */ result.errors,
          /* histogram= */ result.histogram,
        ).validate(),
      );
    });

    it("should reject if the complexity is too small", () => {
      isFalse(
        new Result(
          /* layout= */ result.layout,
          /* textType= */ result.textType,
          /* timeStamp= */ result.timeStamp,
          /* length= */ result.length,
          /* time= */ result.time,
          /* errors= */ result.errors,
          /* histogram= */ new Histogram([]),
        ).validate(),
      );
    });
  });

  describe("using a custom filter", () => {
    it("should reject if the length is too short", () => {
      isFalse(result.validate({ minLength: 100 }));
    });

    it("should reject if the time is too short", () => {
      isFalse(result.validate({ minTime: 60000 }));
    });

    it("should reject if the complexity is too small", () => {
      isFalse(result.validate({ minComplexity: 10 }));
    });

    it("should reject if the speed is too slow", () => {
      isFalse(result.validate({ minSpeed: 1000 }));
    });

    it("should reject if the speed is too fast", () => {
      isFalse(result.validate({ maxSpeed: 1 }));
    });
  });
});

test("serialize as JSON", () => {
  const result = new Result(
    /* layout= */ Layout.EN_US,
    /* textType= */ TextType.GENERATED,
    /* timeStamp= */ Date.parse("2001-02-03T03:05:06Z"),
    /* length= */ 100,
    /* time= */ 10000,
    /* errors= */ 3,
    /* histogram= */ new Histogram([
      { codePoint: 0x0061, hitCount: 11, missCount: 1, timeToType: 111 },
      { codePoint: 0x0062, hitCount: 22, missCount: 2, timeToType: 222 },
      { codePoint: 0x0063, hitCount: 33, missCount: 3, timeToType: 333 },
    ]),
  );

  deepEqual(JSON.parse(JSON.stringify(result)), {
    layout: "en-us",
    textType: "generated",
    timeStamp: "2001-02-03T03:05:06.000Z",
    length: 100,
    time: 10000,
    errors: 3,
    speed: 600,
    histogram: [
      { codePoint: 0x0061, hitCount: 11, missCount: 1, timeToType: 111 },
      { codePoint: 0x0062, hitCount: 22, missCount: 2, timeToType: 222 },
      { codePoint: 0x0063, hitCount: 33, missCount: 3, timeToType: 333 },
    ],
  });
});

test("serialize bigrams as JSON", () => {
  const result = new Result(
    /* layout= */ Layout.EN_US,
    /* textType= */ TextType.GENERATED,
    /* timeStamp= */ Date.parse("2001-02-03T03:05:06Z"),
    /* length= */ 100,
    /* time= */ 10000,
    /* errors= */ 3,
    /* histogram= */ new Histogram([
      {
        codePoint: 0x0062,
        hitCount: 22,
        missCount: 2,
        timeToType: 222,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 22,
              missCount: 2,
              timeToType: 222,
              prevKeyId: "KeyA",
              currentKeyId: "KeyB",
            },
          ],
        ]),
      },
    ]),
  );

  deepEqual(JSON.parse(JSON.stringify(result)), {
    layout: "en-us",
    textType: "generated",
    timeStamp: "2001-02-03T03:05:06.000Z",
    length: 100,
    time: 10000,
    errors: 3,
    speed: 600,
    histogram: [
      {
        codePoint: 0x0062,
        hitCount: 22,
        missCount: 2,
        timeToType: 222,
        bigrams: [
          {
            prevCodePoint: 0x0061,
            hitCount: 22,
            missCount: 2,
            timeToType: 222,
            prevKeyId: "KeyA",
            currentKeyId: "KeyB",
          },
        ],
      },
    ],
  });
});

test("build bigrams from steps", () => {
  const steps = [
    { timeStamp: 0, codePoint: 0x0058, timeToType: 0, typo: false },
    { timeStamp: 0, codePoint: 0x0061, timeToType: 100, typo: false },
    { timeStamp: 0, codePoint: 0x0073, timeToType: 200, typo: false },
  ];

  const result = Result.fromStats(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    steps,
  );

  // The first char is not in the histogram, but is the prev of the first pair.
  equal(result.histogram.has(0x0058), false);
  equal(result.histogram.get(0x0061)!.bigrams!.get(0x0058)!.timeToType, 100);
  equal(result.histogram.get(0x0073)!.bigrams!.get(0x0061)!.timeToType, 200);
});

test("no bigrams for a single step", () => {
  const result = Result.fromStats(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    [{ timeStamp: 0, codePoint: 0x0061, timeToType: 100, typo: false }],
  );

  equal(result.histogram.complexity, 0);
});

test("convert units", () => {
  throws(() => timeToSpeed(Infinity));
  throws(() => timeToSpeed(NaN));
  throws(() => timeToSpeed(0));
  throws(() => speedToTime(Infinity));
  throws(() => speedToTime(NaN));
  throws(() => speedToTime(0));
  equal(timeToSpeed(250), 240);
  equal(timeToSpeed(100), 600);
  equal(speedToTime(240), 250);
  equal(speedToTime(600), 100);
});
