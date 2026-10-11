import {
  type Keyboard,
  type KeyId,
  type Layout,
  loadKeyboard,
} from "@keybr/keyboard";
import { type BigramSample, validateSample } from "@keybr/textinput";
import { type Step } from "@keybr/textinput";
import { type CodePoint } from "@keybr/unicode";

const keyboards = new Map<Layout, Keyboard>();

export function getKeyboard(layout: Layout): Keyboard {
  let keyboard = keyboards.get(layout);
  if (keyboard == null) {
    keyboards.set(layout, (keyboard = loadKeyboard(layout)));
  }
  return keyboard;
}

/**
 * Aggregates sequential character pairs into per-character bigram samples.
 *
 * A bigram is a pair of consecutive characters. The time-to-type of a pair is
 * the time-to-type of its second character. Pairs that involve a space
 * character or a character not present in the given layout are skipped. Pairs
 * are aggregated per the second (current) character, keyed by the first
 * (previous) character.
 */
export function makeBigrams(
  layout: Layout,
  steps: readonly Step[],
): ReadonlyMap<CodePoint, ReadonlyMap<CodePoint, BigramSample>> {
  const keyboard = getKeyboard(layout);
  const map = new Map<
    CodePoint,
    Map<CodePoint, MutableBigramSample>
  >();
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;
    const prevKeyId = comboKeyId(keyboard, prev.codePoint);
    const currentKeyId = comboKeyId(keyboard, curr.codePoint);
    if (prevKeyId == null || currentKeyId == null) {
      continue;
    }
    let pairs = map.get(curr.codePoint);
    if (pairs == null) {
      map.set(curr.codePoint, (pairs = new Map()));
    }
    let sample = pairs.get(prev.codePoint);
    if (sample == null) {
      pairs.set(
        prev.codePoint,
        (sample = {
          hitCount: 0,
          missCount: 0,
          time: 0,
          count: 0,
          prevKeyId,
          currentKeyId,
        }),
      );
    }
    sample.hitCount += 1;
    if (curr.typo) {
      sample.missCount += 1;
    } else if (curr.timeToType > 0) {
      sample.time += curr.timeToType;
      sample.count += 1;
    }
  }
  const bigrams = new Map<
    CodePoint,
    ReadonlyMap<CodePoint, BigramSample>
  >();
  for (const [codePoint, pairs] of map) {
    const samples = new Map<CodePoint, BigramSample>();
    for (const [
      prevCodePoint,
      { hitCount, missCount, time, count, prevKeyId, currentKeyId },
    ] of pairs) {
      const timeToType =
        time > 0 && count > 0 ? Math.round(time / count) : 0;
      if (timeToType > 0 && !validateSample({ timeToType })) {
        continue;
      }
      samples.set(prevCodePoint, {
        hitCount,
        missCount,
        timeToType,
        prevKeyId,
        currentKeyId,
      });
    }
    if (samples.size > 0) {
      bigrams.set(codePoint, samples);
    }
  }
  return bigrams;
}

type MutableBigramSample = {
  hitCount: number;
  missCount: number;
  time: number;
  count: number;
  prevKeyId: KeyId;
  currentKeyId: KeyId;
};

function comboKeyId(
  keyboard: Keyboard,
  codePoint: CodePoint,
): KeyId | null {
  if (codePoint === 0x0020) {
    return null;
  }
  const combo = keyboard.getCombo(codePoint);
  return combo?.id ?? null;
}