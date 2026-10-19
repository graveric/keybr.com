import { type Filter, makeFilter } from "@keybr/math";
import { type Letter } from "@keybr/phonetic-model";
import { type BigramSample } from "@keybr/textinput";
import { type CodePoint } from "@keybr/unicode";
import { type Result, timeToSpeed } from "./result.ts";

export function makeKeyStatsMap(
  letters: readonly Letter[],
  results: readonly Result[],
): KeyStatsMap {
  const map = new MutableKeyStatsMap(letters);
  for (const result of results) {
    map.append(result);
  }
  return map.copy();
}

export type KeyStatsMap<T extends KeyStats = KeyStats> = {
  readonly letters: readonly Letter[];
  readonly results: readonly Result[];
  get(letter: Letter): T;
} & Iterable<T>;

export type KeyStats = {
  readonly letter: Letter;
  readonly samples: readonly KeySample[];
  readonly timeToType: number | null;
  readonly bestTimeToType: number | null;
  readonly bigrams?: readonly BigramStats[];
};

export type BigramStats = {
  readonly prevCodePoint: CodePoint;
  readonly prevKeyId: string;
  readonly currentKeyId: string;
  readonly hitCount: number;
  readonly missCount: number;
  readonly timeToType: number;
};

export type KeySample = {
  readonly index: number;
  readonly timeStamp: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly timeToType: number;
  readonly filteredTimeToType: number;
};

export function averageKeySpeed(
  samples: readonly KeySample[],
  range?: { includes(timeStamp: number): boolean },
): number {
  let sum = 0;
  let count = 0;
  for (const { timeStamp, timeToType } of samples) {
    if (range == null || range.includes(timeStamp)) {
      if (timeToType > 0) {
        sum += timeToSpeed(timeToType);
        count += 1;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

export function averageFilteredKeySpeed(
  samples: readonly KeySample[],
  range?: { includes(timeStamp: number): boolean },
): number {
  let sum = 0;
  let count = 0;
  for (const { timeStamp, filteredTimeToType } of samples) {
    if (range == null || range.includes(timeStamp)) {
      if (filteredTimeToType > 0) {
        sum += timeToSpeed(filteredTimeToType);
        count += 1;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

export function lastKeySpeed(
  samples: readonly KeySample[],
  range?: { includes(timeStamp: number): boolean },
): number {
  for (let index = samples.length - 1; index >= 0; index--) {
    const { timeStamp, timeToType } = samples[index];
    if (range == null || range.includes(timeStamp)) {
      if (timeToType > 0) {
        return timeToSpeed(timeToType);
      }
    }
  }
  return 0;
}

export function maxKeySpeed(
  samples: readonly KeySample[],
  range?: { includes(timeStamp: number): boolean },
): number {
  let max = 0;
  for (const { timeStamp, timeToType } of samples) {
    if (range == null || range.includes(timeStamp)) {
      if (timeToType > 0) {
        max = Math.max(max, timeToSpeed(timeToType));
      }
    }
  }
  return max;
}

export class MutableKeyStatsMap implements KeyStatsMap<MutableKeyStats> {
  readonly #letters: Letter[];
  readonly #results: Result[];
  readonly #map: Map<Letter, MutableKeyStats>;

  constructor(letters: readonly Letter[]) {
    this.#letters = [...letters];
    this.#results = [];
    this.#map = new Map();
    for (const letter of letters) {
      this.#map.set(letter, new MutableKeyStats(letter));
    }
  }

  get letters(): readonly Letter[] {
    return this.#letters;
  }

  get results(): readonly Result[] {
    return this.#results;
  }

  get(letter: Letter): MutableKeyStats {
    return this.#map.get(letter)!;
  }

  [Symbol.iterator](): IterableIterator<MutableKeyStats> {
    return this.#map.values();
  }

  append(result: Result) {
    this.#results.push(result);
    for (const item of this.#map.values()) {
      item.append(result);
    }
  }

  copy(): KeyStatsMap {
    const letters = [...this.#letters];
    const results = [...this.#results];
    const map = new Map(
      [...this.#map].map(([key, value]) => [key, value.copy()]),
    );
    return {
      get letters(): readonly Letter[] {
        return letters;
      },
      get results(): readonly Result[] {
        return results;
      },
      get(letter): KeyStats {
        return map.get(letter)!;
      },
      [Symbol.iterator](): IterableIterator<KeyStats> {
        return map.values();
      },
    };
  }
}

export class MutableKeyStats implements KeyStats {
  readonly #letter: Letter;
  readonly #samples: KeySample[];
  readonly #filter: Filter;
  #index: number;
  #timeToType: number | null;
  #bestTimeToType: number | null;
  readonly #bigrams: BigramStats[];

  constructor(letter: Letter) {
    this.#letter = letter;
    this.#samples = [];
    this.#filter = makeFilter(0.1);
    this.#index = 0;
    this.#timeToType = null;
    this.#bestTimeToType = null;
    this.#bigrams = [];
  }

  get letter(): Letter {
    return this.#letter;
  }

  get samples(): readonly KeySample[] {
    return this.#samples;
  }

  get timeToType(): number | null {
    return this.#timeToType;
  }

  get bestTimeToType(): number | null {
    return this.#bestTimeToType;
  }

  get bigrams(): readonly BigramStats[] {
    return this.#bigrams;
  }

  append(result: Result) {
    const { timeStamp, histogram } = result;
    const sample = histogram.get(this.#letter.codePoint);
    if (sample != null) {
      const { hitCount, missCount, timeToType, bigrams } = sample;
      if (timeToType > 0) {
        const filteredTimeToType = this.#filter.add(timeToType);
        this.#samples.push({
          index: this.#index,
          timeStamp,
          hitCount,
          missCount,
          timeToType,
          filteredTimeToType,
        });
        this.#timeToType = filteredTimeToType;
        this.#bestTimeToType = Math.min(
          this.#bestTimeToType ?? Infinity,
          filteredTimeToType,
        );
      }
      if (bigrams != null) {
        for (const [prevCodePoint, bigramSample] of bigrams.entries()) {
          this.#bigrams.push({
            prevCodePoint,
            prevKeyId: bigramSample.prevKeyId,
            currentKeyId: bigramSample.currentKeyId,
            hitCount: bigramSample.hitCount,
            missCount: bigramSample.missCount,
            timeToType: bigramSample.timeToType,
          });
        }
      }
    }
    this.#index += 1;
    return this;
  }

  copy(): KeyStats {
    return {
      letter: this.#letter,
      samples: [...this.#samples],
      timeToType: this.#timeToType,
      bestTimeToType: this.#bestTimeToType,
      bigrams: [...this.#bigrams],
    };
  }
}
