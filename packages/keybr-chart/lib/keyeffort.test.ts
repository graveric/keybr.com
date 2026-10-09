import { test } from "node:test";
import {
  Geometry,
  type Keyboard,
  Layout,
  loadKeyboard,
} from "@keybr/keyboard";
import { Result, TextType } from "@keybr/result";
import { Histogram, type Sample } from "@keybr/textinput";
import { deepEqual, equal, ok } from "rich-assert";
import {
  buildKeyEffortMatrix,
  type KeyEffortCell,
  toCsv,
  toJson,
  toSvg,
} from "./keyeffort.ts";

const keyboard = loadKeyboard(Layout.EN_US, Geometry.ANSI_101);

function makeResult(
  samples: readonly Sample[],
  timeStamp = 1000,
  layout = Layout.EN_US,
): Result {
  return new Result(
    layout,
    TextType.GENERATED,
    timeStamp,
    100,
    50000,
    0,
    new Histogram(samples),
  );
}

function findCell(
  matrix: ReturnType<typeof buildKeyEffortMatrix>,
  layerId: string,
  keyId: string,
): KeyEffortCell {
  const layer = matrix.layers.find((layer) => layer.id === layerId);
  ok(layer != null);
  const cell = layer.cells.find((cell) => cell.keyId === keyId);
  ok(cell != null);
  return cell;
}

test("empty", () => {
  const matrix = buildKeyEffortMatrix([], keyboard);
  deepEqual(matrix.layers, []);
  equal(matrix.layoutId, "en-us");
  equal(matrix.geometryId, "ansi101");
});

test("aggregation", () => {
  const matrix = buildKeyEffortMatrix(
    [
      makeResult([
        { codePoint: 0x61, hitCount: 20, missCount: 2, timeToType: 200 },
        { codePoint: 0x62, hitCount: 20, missCount: 0, timeToType: 300 },
        { codePoint: 0x63, hitCount: 20, missCount: 4, timeToType: 100 },
        { codePoint: 0x41, hitCount: 10, missCount: 0, timeToType: 400 },
      ]),
    ],
    keyboard,
    { generatedAt: 0 },
  );

  deepEqual(
    matrix.layers.map((layer) => layer.id),
    ["none", "shift"],
  );

  const keyA = keyboard.getCombo(0x61)!.id;
  const keyB = keyboard.getCombo(0x62)!.id;
  const keyC = keyboard.getCombo(0x63)!.id;
  const keyAShift = keyboard.getCombo(0x41)!.id;

  const cellA = findCell(matrix, "none", keyA);
  equal(cellA.symbols, "a");
  equal(cellA.hits, 20);
  equal(cellA.misses, 2);
  equal(cellA.missRate, 0.1);
  equal(cellA.avgTime, 200);
  equal(cellA.hand, "left");

  const cellB = findCell(matrix, "none", keyB);
  equal(cellB.symbols, "b");
  equal(cellB.missRate, 0);
  equal(cellB.avgTime, 300);

  const cellC = findCell(matrix, "none", keyC);
  equal(cellC.symbols, "c");
  equal(cellC.hits, 20);
  equal(cellC.misses, 4);
  equal(cellC.missRate, 0.2);
  equal(cellC.avgTime, 100);

  ok(Math.abs(cellA.effort! - 0.5) < 1e-9);
  ok(Math.abs(cellB.effort! - 0.7) < 1e-9);
  ok(Math.abs(cellC.effort! - 0.3) < 1e-9);

  const shiftCellA = findCell(matrix, "shift", keyAShift);
  equal(shiftCellA.symbols, "A");
  equal(shiftCellA.hits, 10);
  equal(shiftCellA.avgTime, 400);
  equal(shiftCellA.missRate, 0);
});

test("multiple results", () => {
  const matrix = buildKeyEffortMatrix(
    [
      makeResult(
        [
          { codePoint: 0x61, hitCount: 10, missCount: 0, timeToType: 100 },
          { codePoint: 0x62, hitCount: 10, missCount: 0, timeToType: 100 },
          { codePoint: 0x63, hitCount: 10, missCount: 0, timeToType: 100 },
        ],
        1000,
      ),
      makeResult(
        [
          { codePoint: 0x61, hitCount: 10, missCount: 2, timeToType: 300 },
          { codePoint: 0x62, hitCount: 10, missCount: 0, timeToType: 100 },
          { codePoint: 0x63, hitCount: 10, missCount: 0, timeToType: 100 },
        ],
        2000,
      ),
    ],
    keyboard,
    { generatedAt: 0 },
  );

  const keyA = keyboard.getCombo(0x61)!.id;
  const cellA = findCell(matrix, "none", keyA);
  equal(cellA.hits, 20);
  equal(cellA.misses, 2);
  equal(cellA.missRate, 0.1);
  ok(Math.abs(cellA.avgTime! - (100 * 10 + 300 * 8) / 18) < 1e-9);
});

test("time range filter", () => {
  const results = [
    makeResult(
      [
        { codePoint: 0x61, hitCount: 10, missCount: 0, timeToType: 100 },
        { codePoint: 0x62, hitCount: 10, missCount: 0, timeToType: 100 },
        { codePoint: 0x63, hitCount: 10, missCount: 0, timeToType: 100 },
      ],
      1000,
    ),
    makeResult(
      [
        { codePoint: 0x61, hitCount: 10, missCount: 0, timeToType: 100 },
        { codePoint: 0x62, hitCount: 10, missCount: 0, timeToType: 100 },
        { codePoint: 0x63, hitCount: 10, missCount: 0, timeToType: 100 },
      ],
      2000,
    ),
  ];
  const matrix = buildKeyEffortMatrix(results, keyboard, {
    generatedAt: 0,
    from: 2000,
  });
  equal(findCell(matrix, "none", keyboard.getCombo(0x61)!.id).hits, 10);
});

test("low confidence", () => {
  const matrix = buildKeyEffortMatrix(
    [
      makeResult([
        { codePoint: 0x61, hitCount: 50, missCount: 0, timeToType: 100 },
        { codePoint: 0x62, hitCount: 50, missCount: 0, timeToType: 300 },
        { codePoint: 0x63, hitCount: 5, missCount: 0, timeToType: 900 },
      ]),
    ],
    keyboard,
    { generatedAt: 0, minPresses: 10 },
  );

  const keyA = keyboard.getCombo(0x61)!.id;
  const keyC = keyboard.getCombo(0x63)!.id;
  const cellA = findCell(matrix, "none", keyA);
  const cellC = findCell(matrix, "none", keyC);
  equal(cellA.lowConfidence, false);
  equal(cellC.lowConfidence, true);
  equal(cellC.hits, 5);
  equal(cellC.avgTime, 900);
  const layer = matrix.layers.find((layer) => layer.id === "none")!;
  deepEqual(layer.timeRange, [100, 300]);
});

test("global normalization", () => {
  const matrix = buildKeyEffortMatrix(
    [
      makeResult([
        { codePoint: 0x61, hitCount: 20, missCount: 0, timeToType: 100 },
        { codePoint: 0x62, hitCount: 20, missCount: 0, timeToType: 300 },
        { codePoint: 0x63, hitCount: 20, missCount: 0, timeToType: 500 },
        { codePoint: 0x41, hitCount: 20, missCount: 0, timeToType: 300 },
      ]),
    ],
    keyboard,
    { generatedAt: 0, normalizeScope: "global" },
  );

  const keyB = keyboard.getCombo(0x62)!.id;
  const keyAShift = keyboard.getCombo(0x41)!.id;
  deepEqual(findCell(matrix, "none", keyB).timeNorm, 0.5);
  deepEqual(findCell(matrix, "shift", keyAShift).timeNorm, 0.5);
});

test("dead keys", () => {
  const deadKeyboard = loadKeyboard(Layout.FR_FR, Geometry.ISO_102);
  const deadCombo = [...deadKeyboard.combos.values()].find(
    (combo) => combo.prefix != null,
  );
  ok(deadCombo != null);
  const matrix = buildKeyEffortMatrix(
    [
      makeResult(
        [
          { codePoint: 0x61, hitCount: 10, missCount: 0, timeToType: 100 },
          { codePoint: 0x62, hitCount: 10, missCount: 0, timeToType: 100 },
          { codePoint: 0x63, hitCount: 10, missCount: 0, timeToType: 100 },
          {
            codePoint: deadCombo.codePoint,
            hitCount: 10,
            missCount: 0,
            timeToType: 100,
          },
        ],
        1000,
        Layout.FR_FR,
      ),
    ],
    deadKeyboard,
    { generatedAt: 0 },
  );
  const deadLayer = matrix.layers.find((layer) => layer.id === "dead");
  ok(deadLayer != null);
  ok(deadLayer.cells.some((cell) => cell.keyId === deadCombo.id));
});

test("serialization", () => {
  const matrix = buildKeyEffortMatrix(
    [
      makeResult([
        { codePoint: 0x61, hitCount: 20, missCount: 2, timeToType: 200 },
        { codePoint: 0x62, hitCount: 20, missCount: 0, timeToType: 300 },
        { codePoint: 0x63, hitCount: 20, missCount: 4, timeToType: 100 },
      ]),
    ],
    keyboard,
    { generatedAt: 0 },
  );

  const csv = toCsv(matrix);
  const lines = csv.split("\n");
  ok(lines[0].startsWith("layoutId,layerId,keyId,"));
  ok(csv.includes(keyboard.getCombo(0x61)!.id));
  ok(csv.includes("0.1"));
  ok(csv.includes(",none,"));

  const json = JSON.parse(toJson(matrix));
  equal(json.layoutId, "en-us");
  equal(json.geometryId, "ansi101");
  equal(json.generatedAt, 0);
  equal(json.layers.length, 1);
  equal(json.layers[0].cells.length, 3);

  const svg = toSvg(matrix);
  ok(svg.startsWith("<svg "));
  ok(svg.endsWith("</svg>"));
  ok(svg.includes("Base"));
  ok(svg.includes(">a<"));
});
