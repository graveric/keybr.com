import {
  type Character,
  type Keyboard,
  KeyCharacters,
  type KeyId,
  type KeyShape,
  type LabelShape,
  type ZoneId,
} from "@keybr/keyboard";
import {
  getFrameSize,
  KeyLayer,
  keySize,
  margin,
  TransitionsLayer,
  VirtualKeyboard,
} from "@keybr/keyboard-ui";
import { type KeyStatsMap, type Result } from "@keybr/result";
import { type BigramSample } from "@keybr/textinput";
import { type CodePoint } from "@keybr/unicode";
import { type ReactNode } from "react";

export type PairType = "same-hand" | "cross-hand" | "unknown";

export type PairTypeFilter = "all" | "same-hand" | "cross-hand";

export type KeyPosition = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly hand: ZoneId | null;
  readonly finger: ZoneId | null;
  readonly row: ZoneId | null;
};

export type BigramTransition = {
  readonly prevCodePoint: CodePoint;
  readonly currentCodePoint: CodePoint;
  readonly prevKeyId: KeyId;
  readonly currentKeyId: KeyId;
  readonly prevPosition: KeyPosition | null;
  readonly currentPosition: KeyPosition | null;
  readonly pairType: PairType;
  readonly hitCount: number;
  readonly missCount: number;
  /** The mean time-to-type of the pair in milliseconds. */
  readonly timeToType: number;
};

export type BigramStatsOptions = {
  /** Which pairs to keep, based on the hands of the two keys. */
  readonly pairType: PairTypeFilter;
  /** Ignore transitions with fewer presses than this. */
  readonly minPresses: number;
};

export const defaultBigramStatsOptions: BigramStatsOptions = {
  pairType: "all",
  minPresses: 3,
};

/**
 * Aggregates the per-letter bigram samples of a key stats map into a list of
 * keyboard transitions, enriched with the positions and hands of the two keys.
 * The order is from the slowest transition to the fastest.
 */
export function buildBigramTransitions(
  keyStatsMap: KeyStatsMap,
  keyboard: Keyboard,
  options: Partial<BigramStatsOptions> = {},
): readonly BigramTransition[] {
  return buildTransitions(mapToSource(keyStatsMap), keyboard, options);
}

/**
 * Aggregates the bigram samples of a single result into a list of keyboard
 * transitions, enriched with the positions and hands of the two keys.
 * The order is from the slowest transition to the fastest.
 */
export function buildBigramTransitionsFromResult(
  result: Result,
  keyboard: Keyboard,
  options: Partial<BigramStatsOptions> = {},
): readonly BigramTransition[] {
  return buildTransitions(resultToSource(result), keyboard, options);
}

function buildTransitions(
  source: Iterable<TransitionSource>,
  keyboard: Keyboard,
  options: Partial<BigramStatsOptions> = {},
): readonly BigramTransition[] {
  const opts: BigramStatsOptions = { ...defaultBigramStatsOptions, ...options };
  const aggregates = new Map<string, MutableTransition>();
  for (const item of source) {
    const currentCodePoint = item.letter.codePoint;
    const bigrams = item.bigrams;
    if (bigrams == null) {
      continue;
    }
    for (const bigram of bigrams) {
      const {
        prevCodePoint,
        prevKeyId,
        currentKeyId,
        hitCount,
        missCount,
        timeToType,
      } = bigram;
      const key = `${prevKeyId}\u0000${currentKeyId}\u0000${prevCodePoint}\u0000${currentCodePoint}`;
      let aggregate = aggregates.get(key);
      if (aggregate == null) {
        aggregates.set(
          key,
          (aggregate = {
            prevCodePoint,
            currentCodePoint,
            prevKeyId,
            currentKeyId,
            hitCount: 0,
            missCount: 0,
            timeSum: 0,
            timeCount: 0,
          }),
        );
      }
      aggregate.hitCount += hitCount;
      aggregate.missCount += missCount;
      if (timeToType > 0) {
        aggregate.timeSum += timeToType;
        aggregate.timeCount += 1;
      }
    }
  }
  const list: BigramTransition[] = [];
  for (const aggregate of aggregates.values()) {
    if (aggregate.hitCount < opts.minPresses) {
      continue;
    }
    const prevPosition = getPosition(keyboard, aggregate.prevKeyId);
    const currentPosition = getPosition(keyboard, aggregate.currentKeyId);
    const pairType = pairTypeOf(prevPosition, currentPosition);
    if (opts.pairType !== "all" && pairType !== opts.pairType) {
      continue;
    }
    list.push({
      prevCodePoint: aggregate.prevCodePoint,
      currentCodePoint: aggregate.currentCodePoint,
      prevKeyId: aggregate.prevKeyId,
      currentKeyId: aggregate.currentKeyId,
      prevPosition,
      currentPosition,
      pairType,
      hitCount: aggregate.hitCount,
      missCount: aggregate.missCount,
      timeToType:
        aggregate.timeCount > 0
          ? Math.round(aggregate.timeSum / aggregate.timeCount)
          : 0,
    });
  }
  list.sort(
    (a, b) =>
      b.timeToType - a.timeToType ||
      b.hitCount - a.hitCount ||
      a.prevCodePoint - b.prevCodePoint ||
      a.currentCodePoint - b.currentCodePoint,
  );
  return list;
}

type TransitionSource = {
  readonly letter: { readonly codePoint: CodePoint };
  readonly bigrams?: readonly BigramSource[];
};

type BigramSource = {
  readonly prevCodePoint: CodePoint;
  readonly prevKeyId: KeyId;
  readonly currentKeyId: KeyId;
  readonly hitCount: number;
  readonly missCount: number;
  readonly timeToType: number;
};

function mapToSource(keyStatsMap: KeyStatsMap): Iterable<TransitionSource> {
  return {
    [Symbol.iterator]() {
      return (function* () {
        for (const stats of keyStatsMap) {
          yield {
            letter: { codePoint: stats.letter.codePoint },
            bigrams: stats.bigrams,
          };
        }
      })();
    },
  };
}

function resultToSource(result: Result): Iterable<TransitionSource> {
  return {
    [Symbol.iterator]() {
      return (function* () {
        for (const sample of result.histogram) {
          const bigrams = sample.bigrams;
          if (bigrams == null) {
            continue;
          }
          yield {
            letter: { codePoint: sample.codePoint },
            bigrams: [...bigrams].map(([prevCodePoint, bigram]): BigramSource =>
              mapBigramSample(prevCodePoint, bigram),
            ),
          };
        }
      })();
    },
  };
}

function mapBigramSample(
  prevCodePoint: CodePoint,
  { hitCount, missCount, timeToType, prevKeyId, currentKeyId }: BigramSample,
): BigramSource {
  return {
    prevCodePoint,
    prevKeyId,
    currentKeyId,
    hitCount,
    missCount,
    timeToType,
  };
}

type MutableTransition = {
  prevCodePoint: CodePoint;
  currentCodePoint: CodePoint;
  prevKeyId: KeyId;
  currentKeyId: KeyId;
  hitCount: number;
  missCount: number;
  timeSum: number;
  timeCount: number;
};

function pairTypeOf(
  prev: KeyPosition | null,
  current: KeyPosition | null,
): PairType {
  if (prev?.hand == null || current?.hand == null) {
    return "unknown";
  }
  return prev.hand === current.hand ? "same-hand" : "cross-hand";
}

export function getPosition(
  keyboard: Keyboard,
  keyId: KeyId,
): KeyPosition | null {
  const shape = keyboard.getShape(keyId);
  if (shape == null) {
    return null;
  }
  return {
    x: shape.x,
    y: shape.y,
    w: shape.w,
    h: shape.h,
    hand: shape.hand,
    finger: shape.finger,
    row: shape.row,
  };
}

/** The fastest mean time-to-type considered to be a healthy (green) speed. */
export const transitionColorMin = 180;
/** The slowest mean time-to-type considered to be a poor (red) speed. */
export const transitionColorMax = 350;

/**
 * Maps a mean time-to-type in milliseconds to a color,
 * from green for fast transitions to red for slow transitions.
 */
export function transitionColor(timeToType: number): string {
  if (timeToType <= 0) {
    return "#808080";
  }
  if (timeToType <= transitionColorMin) {
    return "#2e8b57";
  }
  if (timeToType >= transitionColorMax) {
    return "#d32f2f";
  }
  const t =
    (timeToType - transitionColorMin) /
    (transitionColorMax - transitionColorMin);
  const hue = 120 * (1 - t);
  return `hsl(${Math.round(hue)} 70% 45%)`;
}

/**
 * Maps a mean time-to-type in milliseconds to a relative bar width,
 * given the minimum and the maximum of the displayed range.
 */
export function barWidth(timeToType: number, min: number, max: number): number {
  if (timeToType <= 0) {
    return 0;
  }
  if (max <= min) {
    return 100;
  }
  return clamp01((timeToType - min) / (max - min)) * 100;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Formats a code point for display: printable characters such as latin or
 * cyrillic letters are shown literally, control characters fall back to the
 * "U+XXXX" escape.
 */
export function formatChar(codePoint: CodePoint): string {
  const char = String.fromCodePoint(codePoint);
  return /[\p{Cc}]/u.test(char)
    ? `U+${codePoint.toString(16).toUpperCase()}`
    : char;
}

export function TransitionsKeyboard({
  keyboard,
  transitions,
  toggledKeys = [],
  onKeyClick,
}: {
  readonly keyboard: Keyboard;
  readonly transitions: readonly BigramTransition[];
  readonly toggledKeys?: readonly KeyId[];
  readonly onKeyClick?: (key: KeyId, elem: Element) => void;
}): ReactNode {
  return (
    <VirtualKeyboard keyboard={keyboard}>
      <KeyLayer toggledKeys={toggledKeys} onKeyClick={onKeyClick} />
      <TransitionsLayer
        histogram={transitions.map(
          (transition) =>
            [
              transition.prevCodePoint,
              transition.currentCodePoint,
              transition.timeToType > 0
                ? transition.timeToType
                : transition.hitCount,
            ] as const,
        )}
        modifier="h"
      />
    </VirtualKeyboard>
  );
}

export function transitionsToJson(
  transitions: readonly BigramTransition[],
  keyboard: Keyboard,
): string {
  return JSON.stringify(
    {
      layoutId: keyboard.layout.id,
      geometryId: keyboard.geometry.id,
      transitions,
    },
    null,
    2,
  );
}

export function transitionsToCsv(
  transitions: readonly BigramTransition[],
): string {
  const header = [
    "prevCodePoint",
    "currentCodePoint",
    "prevChar",
    "currentChar",
    "prevKeyId",
    "currentKeyId",
    "pairType",
    "prevHand",
    "currentHand",
    "prevFinger",
    "currentFinger",
    "prevX",
    "prevY",
    "prevW",
    "prevH",
    "currentX",
    "currentY",
    "currentW",
    "currentH",
    "hitCount",
    "missCount",
    "timeToType",
  ];
  const rows = [header.map(escapeCsv).join(",")];
  for (const transition of transitions) {
    const { prevPosition, currentPosition } = transition;
    rows.push(
      [
        hex(transition.prevCodePoint),
        hex(transition.currentCodePoint),
        String.fromCodePoint(transition.prevCodePoint),
        String.fromCodePoint(transition.currentCodePoint),
        transition.prevKeyId,
        transition.currentKeyId,
        transition.pairType,
        prevPosition?.hand ?? "",
        currentPosition?.hand ?? "",
        prevPosition?.finger ?? "",
        currentPosition?.finger ?? "",
        num(prevPosition?.x),
        num(prevPosition?.y),
        num(prevPosition?.w),
        num(prevPosition?.h),
        num(currentPosition?.x),
        num(currentPosition?.y),
        num(currentPosition?.w),
        num(currentPosition?.h),
        String(transition.hitCount),
        String(transition.missCount),
        String(transition.timeToType),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return rows.join("\n");
}

function hex(codePoint: number): string {
  return `0x${codePoint.toString(16)}`;
}

function num(v: number | undefined): string {
  return v != null ? String(v) : "";
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type TransitionsSvgOptions = {
  /** The maximum width of an arrow in pixels. */
  readonly arrowWidth: number;
  /** The maximum opacity of an arrow. */
  readonly arrowOpacityMax: number;
  /** The maximum number of arrows to draw. */
  readonly maxArrows: number;
};

export const defaultTransitionsSvgOptions: TransitionsSvgOptions = {
  arrowWidth: 6,
  arrowOpacityMax: 1,
  maxArrows: 100,
};

/**
 * Serializes the transitions as a self-contained SVG image of the keyboard
 * with the transition arrows drawn on top of it.
 */
export function transitionsToSvg(
  transitions: readonly BigramTransition[],
  keyboard: Keyboard,
  options: Partial<TransitionsSvgOptions> = {},
): string {
  const { arrowWidth, arrowOpacityMax, maxArrows } = {
    ...defaultTransitionsSvgOptions,
    ...options,
  };
  const { width, height } = getFrameSize(keyboard);
  const items = [...transitions]
    .filter(
      (transition) =>
        transition.timeToType > 0 &&
        transition.prevPosition != null &&
        transition.currentPosition != null,
    )
    .sort((a, b) => b.timeToType - a.timeToType)
    .slice(0, maxArrows);
  const times = items.map((transition) => transition.timeToType);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fx(width)}" height="${fx(height)}" viewBox="0 0 ${fx(width)} ${fx(height)}">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  for (const shape of keyboard.shapes.values()) {
    parts.push(drawKey(shape, keyboard.layout.language.letterName));
  }
  parts.push(
    `<defs><marker id="arrow" markerWidth="5" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 0 6 L 5 3 z" fill="context-stroke" stroke="none"/></marker></defs>`,
  );
  for (const transition of items) {
    parts.push(drawArrow(transition, min, max, arrowWidth, arrowOpacityMax));
  }
  parts.push(`</svg>`);
  return parts.join("\n");
}

function drawKey(
  shape: KeyShape,
  letterName: (codePoint: number) => string,
): string {
  const { isCodePoint, isDead, isLigature } = KeyCharacters;
  const x = margin + shape.x * keySize;
  const y = margin + shape.y * keySize;
  const w = shape.w * keySize - 2;
  const h = shape.h * keySize - 2;
  const parts: string[] = [];
  parts.push(`<g>`);
  parts.push(
    `<rect x="${fx(x + 1)}" y="${fx(y + 1)}" width="${fx(w)}" height="${fx(h)}" rx="4" fill="#f4f4f4" stroke="#00000033" stroke-width="1"/>`,
  );
  for (const label of shape.labels) {
    parts.push(drawLabel(label, x, y));
  }
  // Render layer characters similar to the on-screen keyboard.
  for (const [character, lx, ly] of [
    [shape.a, 10, 27] as const,
    [shape.b, 10, 12] as const,
    [shape.c, 25, 27] as const,
    [shape.d, 25, 12] as const,
  ]) {
    if (isCodePoint(character)) {
      if (isSpace(character)) {
        continue;
      }
      parts.push(drawSymbol(letterName(character), x + lx, y + ly));
    } else if (isDead(character)) {
      parts.push(
        drawSymbol(
          String.fromCodePoint(0x25cc, character.dead),
          x + lx,
          y + ly,
        ),
      );
    } else if (isLigature(character)) {
      parts.push(drawSymbol(character.ligature, x + lx, y + ly));
    }
  }
  if (shape.homing) {
    parts.push(
      `<circle cx="${fx(x + (shape.w * keySize) / 2)}" cy="${fx(y + h - 4)}" r="3" fill="#00000033"/>`,
    );
  }
  parts.push(`</g>`);
  return parts.join("\n");
}

function drawLabel(label: LabelShape, ox: number, oy: number): string {
  const { text, pos = [10, 20], align = ["s", "m"] } = label;
  const [x, y] = pos;
  const [ha, va] = align;
  const textAnchor = ha === "e" ? "end" : ha === "m" ? "middle" : "start";
  const dominantBaseline =
    va === "b" ? "text-after-edge" : va === "t" ? "text-before-edge" : "middle";
  return `<text x="${fx(ox + x)}" y="${fx(oy + y)}" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" direction="ltr" font-family="sans-serif" font-size="11" fill="#888888">${escapeXml(text)}</text>`;
}

function drawSymbol(text: string, x: number, y: number): string {
  return `<text x="${fx(x)}" y="${fx(y)}" text-anchor="middle" dominant-baseline="middle" direction="ltr" font-family="sans-serif" font-size="12" fill="#333333">${escapeXml(text)}</text>`;
}

function isSpace(character: number): boolean {
  return character === 0x0020 || character === 0x00a0 || character === 0x202f;
}

function keyCenter(position: KeyPosition): { x: number; y: number } {
  return {
    x: position.x * keySize + (position.w * (keySize - 2)) / 2,
    y: position.y * keySize + (position.h * (keySize - 2)) / 2,
  };
}

function drawArrow(
  transition: BigramTransition,
  min: number,
  max: number,
  arrowWidth: number,
  arrowOpacityMax: number,
): string {
  const { prevPosition, currentPosition, timeToType } = transition;
  const { x: x0, y: y0 } = keyCenter(prevPosition!);
  const { x: x1, y: y1 } = keyCenter(currentPosition!);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const theta = Math.atan2(dy, dx);
  const l = Math.sqrt(dx * dx + dy * dy);
  const ox = (y1 - y0) / l;
  const oy = -(x1 - x0) / l;
  const mx = x0 + (x1 - x0) / 2 + (ox * l) / 4;
  const my = y0 + (y1 - y0) / 2 + (oy * l) / 4;
  const t = 3;
  const X1 = x0 + Math.cos(theta) * t;
  const Y1 = y0 + Math.sin(theta) * t;
  const X2 = x1 - Math.cos(theta) * t;
  const Y2 = y1 - Math.sin(theta) * t;
  const intensity = max > min ? (timeToType - min) / (max - min) : 0.5;
  const width = 1 + intensity * (arrowWidth - 1);
  const opacity = 0.2 + intensity * (arrowOpacityMax - 0.2);
  return `<path d="M ${fx(margin + X1)} ${fx(margin + Y1)} Q ${fx(margin + mx)} ${fx(margin + my)} ${fx(margin + X2)} ${fx(margin + Y2)}" fill="none" stroke="${transitionColor(timeToType)}" stroke-width="${fx(width)}" stroke-linecap="round" opacity="${fx(opacity)}" marker-end="url(#arrow)"/>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fx(v: number): string {
  return String(Math.round(v * 100) / 100);
}
