import { test } from "node:test";
import { Layout } from "@keybr/keyboard";
import { Result, ResultFaker, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { deepEqual, isNull } from "rich-assert";
import {
  histogramFromJson,
  resultFromJson,
  resultToJson,
} from "./legacyjson.ts";

test("deserialize valid JSON", () => {
  const faker = new ResultFaker();
  const result = faker.nextResult();

  const json = resultToJson(result);

  const copy = resultFromJson(json);

  deepEqual(copy, result);
});

test("ignore invalid result JSON", () => {
  const faker = new ResultFaker();
  const json = resultToJson(faker.nextResult());

  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson(undefined),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson(null),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson(""),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson(0),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson([]),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson({}),
  );
  isNull(resultFromJson({ ...json, l: "x" }));
  isNull(resultFromJson({ ...json, m: "x" }));
  isNull(resultFromJson({ ...json, ts: 0.1 }));
  isNull(resultFromJson({ ...json, n: 0.1 }));
  isNull(resultFromJson({ ...json, t: 0.1 }));
  isNull(resultFromJson({ ...json, e: 0.1 }));
  isNull(
    // @ts-expect-error Test invalid arguments.
    resultFromJson({ ...json, h: null }),
  );
});

test("ignore invalid histogram JSON", () => {
  const faker = new ResultFaker();
  const json = resultToJson(faker.nextResult());

  isNull(
    // @ts-expect-error Test invalid arguments.
    histogramFromJson(undefined),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    histogramFromJson(null),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    histogramFromJson(""),
  );
  isNull(
    // @ts-expect-error Test invalid arguments.
    histogramFromJson(0),
  );
  isNull(histogramFromJson([]));
  isNull(histogramFromJson({ ...json.h, 0: { h: 1, m: 1, t: 100 } }));
  isNull(histogramFromJson({ ...json.h, 97: { h: 0.1, m: 0.1, t: 100 } }));
});

function makeResultWithBigrams(): Result {
  return new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    100,
    10000,
    0,
    new Histogram([
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
}

test("round-trip bigrams through JSON", () => {
  const result = makeResultWithBigrams();
  const copy = resultFromJson(resultToJson(result));
  deepEqual(copy, result);
});

test("parse JSON without bigrams", () => {
  const result = makeResultWithBigrams();
  const json = resultToJson(result) as any;
  for (const key of Object.keys(json.h)) {
    delete json.h[key].b;
  }
  const copy = resultFromJson(json);
  deepEqual(copy?.histogram.get(0x0062)?.bigrams, undefined);
});

test("reject invalid bigram JSON", () => {
  const result = makeResultWithBigrams();
  const json = resultToJson(result) as any;
  const sample = json.h[0x0062];

  isNull(resultFromJson({ ...json, h: { [0x0062]: { ...sample, b: [] } } }));
  isNull(
    resultFromJson({
      ...json,
      h: { [0x0062]: { ...sample, b: { 0x0061: { h: 1, m: 0, t: 100 } } } },
    }),
  );
  isNull(
    resultFromJson({
      ...json,
      h: {
        [0x0062]: {
          ...sample,
          b: { 0: sample.b[0x0061] },
        },
      },
    }),
  );
});
