import { test } from "node:test";
import { Geometry, Layout, loadKeyboard } from "@keybr/keyboard";
import { Letter } from "@keybr/phonetic-model";
import { MutableKeyStatsMap, Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { equal, ok } from "rich-assert";
import {
  barWidth,
  buildBigramTransitions,
  buildBigramTransitionsFromResult,
  formatChar,
  transitionColor,
  transitionColorMax,
  transitionColorMin,
  transitionsToCsv,
  transitionsToJson,
  transitionsToSvg,
} from "./transitions.tsx";

const keyboard = loadKeyboard(Layout.EN_US, Geometry.ANSI_101);

const letterA = new Letter(0x0061, 1, "A");
const letterS = new Letter(0x0073, 1, "S");
const letterJ = new Letter(0x006a, 1, "J");

function makeKeyStatsMap(): MutableKeyStatsMap {
  const map = new MutableKeyStatsMap([letterA, letterS, letterJ]);
  map.append({
    histogram: new Histogram([
      {
        codePoint: 0x0073,
        hitCount: 10,
        missCount: 1,
        timeToType: 300,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 300,
              prevKeyId: "KeyA",
              currentKeyId: "KeyS",
            },
          ],
        ]),
      },
      {
        codePoint: 0x006a,
        hitCount: 10,
        missCount: 0,
        timeToType: 200,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 10,
              missCount: 0,
              timeToType: 200,
              prevKeyId: "KeyA",
              currentKeyId: "KeyJ",
            },
          ],
        ]),
      },
    ]),
  } as any);
  return map;
}

test("build transitions sorted by mean time", () => {
  const transitions = buildBigramTransitions(makeKeyStatsMap(), keyboard);

  equal(transitions.length, 2);

  const [first, second] = transitions;
  equal(first.prevKeyId, "KeyA");
  equal(first.currentKeyId, "KeyS");
  equal(first.pairType, "same-hand");
  equal(first.prevPosition?.hand, "left");
  equal(first.currentPosition?.hand, "left");
  equal(first.hitCount, 10);
  equal(first.missCount, 1);
  equal(first.timeToType, 300);

  equal(second.prevKeyId, "KeyA");
  equal(second.currentKeyId, "KeyJ");
  equal(second.pairType, "cross-hand");
  equal(second.currentPosition?.hand, "right");
  equal(second.timeToType, 200);
});

test("filter by pair type", () => {
  const sameHand = buildBigramTransitions(makeKeyStatsMap(), keyboard, {
    pairType: "same-hand",
  });
  equal(sameHand.length, 1);
  equal(sameHand[0].pairType, "same-hand");

  const crossHand = buildBigramTransitions(makeKeyStatsMap(), keyboard, {
    pairType: "cross-hand",
  });
  equal(crossHand.length, 1);
  equal(crossHand[0].pairType, "cross-hand");
});

test("filter by minimum presses", () => {
  equal(
    buildBigramTransitions(makeKeyStatsMap(), keyboard, { minPresses: 11 })
      .length,
    0,
  );
});

test("aggregate across results with a mean time", () => {
  const map = new MutableKeyStatsMap([letterS]);
  const bigram = (timeToType: number) => ({
    codePoint: 0x0073,
    hitCount: 5,
    missCount: 0,
    timeToType,
    bigrams: new Map([
      [
        0x0061,
        {
          hitCount: 5,
          missCount: 0,
          timeToType,
          prevKeyId: "KeyA" as const,
          currentKeyId: "KeyS" as const,
        },
      ],
    ]),
  });
  map.append({ histogram: new Histogram([bigram(100)]) } as any);
  map.append({ histogram: new Histogram([bigram(300)]) } as any);

  const transitions = buildBigramTransitions(map, keyboard);
  equal(transitions.length, 1);
  equal(transitions[0].hitCount, 10);
  equal(transitions[0].timeToType, 200);
});

test("export to CSV", () => {
  const transitions = buildBigramTransitions(makeKeyStatsMap(), keyboard);
  const csv = transitionsToCsv(transitions);
  const lines = csv.split("\n");
  equal(lines.length, 3);
  ok(lines[0].startsWith("prevCodePoint,currentCodePoint"));
  ok(lines[1].includes("KeyA,KeyS,same-hand"));
  ok(lines[2].includes("KeyA,KeyJ,cross-hand"));
});

test("export to JSON", () => {
  const transitions = buildBigramTransitions(makeKeyStatsMap(), keyboard);
  const json = JSON.parse(transitionsToJson(transitions, keyboard));
  equal(json.layoutId, "en-us");
  equal(json.geometryId, "ansi101");
  equal(json.transitions.length, 2);
  equal(json.transitions[0].pairType, "same-hand");
  equal(json.transitions[0].prevPosition.hand, "left");
});

test("build transitions from a result", () => {
  const result = new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.now(),
    10,
    1000,
    0,
    new Histogram([
      {
        codePoint: 0x0073,
        hitCount: 10,
        missCount: 1,
        timeToType: 300,
        bigrams: new Map([
          [
            0x0061,
            {
              hitCount: 10,
              missCount: 1,
              timeToType: 300,
              prevKeyId: "KeyA",
              currentKeyId: "KeyS",
            },
          ],
        ]),
      },
    ]),
  );

  const transitions = buildBigramTransitionsFromResult(result, keyboard);
  equal(transitions.length, 1);
  equal(transitions[0].prevKeyId, "KeyA");
  equal(transitions[0].currentKeyId, "KeyS");
  equal(transitions[0].pairType, "same-hand");
  equal(transitions[0].hitCount, 10);
  equal(transitions[0].missCount, 1);
  equal(transitions[0].timeToType, 300);
});

test("transition color", () => {
  equal(transitionColor(transitionColorMin), "#2e8b57");
  equal(transitionColor(transitionColorMax), "#d32f2f");
  equal(transitionColor(0), "#808080");
  equal(transitionColor(1), "#2e8b57");
  equal(transitionColor(1000000), "#d32f2f");
});

test("bar width", () => {
  equal(barWidth(0, 0, 300), 0);
  equal(barWidth(300, 0, 300), 100);
  equal(barWidth(150, 0, 300), 50);
  equal(barWidth(200, 0, 0), 100);
});

test("format characters", () => {
  // ASCII letters and symbols are shown as-is.
  equal(formatChar("a".codePointAt(0)!), "a");
  equal(formatChar(" ".codePointAt(0)!), " ");
  // Cyrillic letters are shown literally, not as U+XXXX.
  equal(formatChar("а".codePointAt(0)!), "а");
  equal(formatChar("ё".codePointAt(0)!), "ё");
  // Control characters fall back to U+XXXX.
  equal(formatChar("\u0000".codePointAt(0)!), "U+0");
  equal(formatChar("\u000a".codePointAt(0)!), "U+A");
});

test("export to SVG", () => {
  const transitions = buildBigramTransitions(makeKeyStatsMap(), keyboard);
  const svg = transitionsToSvg(transitions, keyboard);
  ok(svg.startsWith("<svg"));
  ok(svg.endsWith("</svg>"));
  ok(svg.includes('viewBox="0 0'));
  ok(!svg.includes("KeyA"));
  ok(svg.includes('marker-end="url(#arrow)"'));
  // The marker itself also contains a `path` element, so count the arrows.
  equal((svg.match(/marker-end="url\(#arrow\)"/g) ?? []).length, 2);
  // Slow (300ms) transitions are warmer, fast (200ms) transitions are greener.
  ok(svg.includes('stroke="hsl(35 70% 45%)"'));
  ok(svg.includes('stroke="hsl(106 70% 45%)"'));
});
