import { test } from "node:test";
import { Layout } from "@keybr/keyboard";
import { type Step } from "@keybr/textinput";
import { deepEqual, equal } from "rich-assert";
import { makeBigrams } from "./bigrams.ts";

function step(
  codePoint: number,
  timeToType: number,
  typo = false,
): Step {
  return { timeStamp: 0, codePoint, timeToType, typo };
}

test("aggregate same-hand pairs", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0058, 0), // X, the first char is only a prev
    step(0x0061, 100), // a
    step(0x0073, 200), // s
  ]);

  // a is typed after X (cross-hand, but still stored)
  equal(bigrams.has(0x0061), true);
  equal(bigrams.get(0x0061)!.get(0x0058)!.timeToType, 100);
  // s is typed after a (same hand, left)
  equal(bigrams.has(0x0073), true);
  equal(bigrams.get(0x0073)!.get(0x0061)!.timeToType, 200);
  equal(bigrams.get(0x0073)!.get(0x0061)!.prevKeyId, "KeyA");
  equal(bigrams.get(0x0073)!.get(0x0061)!.currentKeyId, "KeyS");
});

test("average repeated pair times", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0061, 0), // a
    step(0x0073, 100), // s
    step(0x0061, 200), // a
    step(0x0073, 300), // s
  ]);

  const sample = bigrams.get(0x0073)!.get(0x0061)!;
  equal(sample.hitCount, 2);
  equal(sample.missCount, 0);
  equal(sample.timeToType, 200);
});

test("count typos without time", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0061, 0), // a
    step(0x0073, 120, true), // s, typo
  ]);

  const sample = bigrams.get(0x0073)!.get(0x0061)!;
  equal(sample.hitCount, 1);
  equal(sample.missCount, 1);
  equal(sample.timeToType, 0);
});

test("drop space pairs", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0061, 0), // a
    step(0x0020, 100), // space
    step(0x0073, 200), // s
  ]);

  equal(bigrams.has(0x0020), false);
  // the pair space -> s is dropped, so s has no bigrams
  equal(bigrams.has(0x0073), false);
});

test("drop unknown characters", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0061, 0), // a
    step(0x0001, 100), // not in the layout
  ]);

  equal(bigrams.size, 0);
});

test("no bigrams for a single step", () => {
  const bigrams = makeBigrams(Layout.EN_US, [step(0x0061, 0)]);
  equal(bigrams.size, 0);
});

test("drop pairs with an invalid mean time", () => {
  const bigrams = makeBigrams(Layout.EN_US, [
    step(0x0061, 0), // a
    step(0x0073, 1), // s, too fast
  ]);

  deepEqual(bigrams.get(0x0073), undefined);
});
