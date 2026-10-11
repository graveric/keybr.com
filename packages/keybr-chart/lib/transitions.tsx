import {
  type Keyboard,
  type KeyId,
  type ZoneId,
} from "@keybr/keyboard";
import { KeyLayer, TransitionsLayer, VirtualKeyboard } from "@keybr/keyboard-ui";
import { type KeyStatsMap } from "@keybr/result";
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
  const opts: BigramStatsOptions = { ...defaultBigramStatsOptions, ...options };
  const aggregates = new Map<string, MutableTransition>();
  for (const stats of keyStatsMap) {
    const currentCodePoint = stats.letter.codePoint;
    const bigrams = stats.bigrams;
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

export function TransitionsKeyboard({
  keyboard,
  transitions,
}: {
  readonly keyboard: Keyboard;
  readonly transitions: readonly BigramTransition[];
}): ReactNode {
  return (
    <VirtualKeyboard keyboard={keyboard}>
      <KeyLayer />
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
