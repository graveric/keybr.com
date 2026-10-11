import { Layout } from "@keybr/keyboard";
import { isPlainObject, isString } from "@keybr/lang";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";

export type ResultJson = {
  readonly l: string;
  readonly m: string;
  readonly ts: number;
  readonly n: number;
  readonly t: number;
  readonly e: number;
  readonly h: HistogramtJson;
  readonly b?: BigramsJson;
};

export type HistogramtJson = {
  readonly [codePoint: number]: {
    readonly h: number;
    readonly m: number;
    readonly t: number;
    readonly b?: BigramsJsonMap;
  };
};

export type BigramsJsonMap = {
  readonly [prevCodePoint: number]: {
    readonly h: number;
    readonly m: number;
    readonly t: number;
    readonly pk: string;
    readonly ck: string;
  };
};

export type BigramsJson = BigramsJsonMap;

export function resultToJson(result: Result): ResultJson {
  return {
    l: result.layout.id,
    m: result.textType.id,
    ts: result.timeStamp,
    n: result.length,
    t: result.time,
    e: result.errors,
    h: histogramToJson(result.histogram),
  };
}

export function histogramToJson(histogram: Histogram): HistogramtJson {
  const json: any = {};
  for (const sample of histogram) {
    const { codePoint, hitCount, missCount, timeToType, bigrams } = sample;
    const obj: any = {
      h: hitCount,
      m: missCount,
      t: timeToType,
    };
    if (bigrams != null && bigrams.size > 0) {
      const b: any = {};
      for (const [prev, bs] of bigrams) {
        b[prev] = {
          h: bs.hitCount,
          m: bs.missCount,
          t: bs.timeToType,
          pk: bs.prevKeyId,
          ck: bs.currentKeyId,
        };
      }
      obj.b = b;
    }
    json[codePoint] = obj;
  }
  return json;
}

export function resultFromJson(json: ResultJson): Result | null {
  if (!isPlainObject(json)) {
    return null;
  }
  const {
    l: layoutId,
    m: textTypeId,
    ts: timeStamp,
    n: length,
    t: time,
    e: errors,
    h: histogramJson,
  } = json;
  if (
    !(
      isString(layoutId) &&
      isString(textTypeId) &&
      Number.isSafeInteger(timeStamp) &&
      Number.isSafeInteger(length) &&
      Number.isSafeInteger(time) &&
      Number.isSafeInteger(errors)
    )
  ) {
    return null;
  }
  const histogram = histogramFromJson(histogramJson);
  if (histogram == null) {
    return null;
  }
  try {
    return new Result(
      Layout.ALL.get(fixLegacyLayoutId(layoutId)),
      TextType.ALL.get(fixTextTypeId(textTypeId)),
      timeStamp,
      length,
      time,
      errors,
      histogram,
    );
  } catch {
    return null;
  }
}

export function histogramFromJson(json: HistogramtJson): Histogram | null {
  if (!isPlainObject(json)) {
    return null;
  }
  const samples = [];
  for (const [key, sample] of Object.entries(json)) {
    const codePoint = Number(key);
    if (
      !(Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 65535)
    ) {
      return null;
    }
    if (!isPlainObject(sample)) {
      return null;
    }
    const {
      h: hitCount,
      m: missCount,
      t: timeToType,
      b: bigramsJson,
    } = sample as any;
    if (
      !(
        Number.isSafeInteger(hitCount) &&
        Number.isSafeInteger(missCount) &&
        Number.isFinite(timeToType)
      )
    ) {
      return null;
    }
    let bigrams: ReadonlyMap<number, any> | undefined;
    if (bigramsJson != null) {
      if (!isPlainObject(bigramsJson)) {
        return null;
      }
      const map = new Map();
      for (const [pkey, bsample] of Object.entries(bigramsJson)) {
        const prevCodePoint = Number(pkey);
        if (
          !(
            Number.isSafeInteger(prevCodePoint) &&
            prevCodePoint > 0 &&
            prevCodePoint <= 65535
          )
        ) {
          return null;
        }
        if (!isPlainObject(bsample)) {
          return null;
        }
        const {
          h: bh,
          m: bm,
          t: bt,
          pk,
          ck,
        } = bsample as any;
        if (
          !(
            Number.isSafeInteger(bh) &&
            Number.isSafeInteger(bm) &&
            Number.isFinite(bt) &&
            isString(pk) &&
            isString(ck)
          )
        ) {
          return null;
        }
        map.set(prevCodePoint, {
          hitCount: bh,
          missCount: bm,
          timeToType: Math.round(bt),
          prevKeyId: pk,
          currentKeyId: ck,
        });
      }
      bigrams = map;
    }
    const sampleObj: any = {
      codePoint,
      hitCount,
      missCount,
      timeToType: Math.round(timeToType),
    };
    if (bigrams != null && bigrams.size > 0) {
      sampleObj.bigrams = bigrams;
    }
    samples.push(sampleObj);
  }
  return new Histogram(samples);
}

function fixLegacyLayoutId(id: string): string {
  // Fix layout identifiers that were changed in cfafe818d5edd3d72a738183730dae049b967ebc
  switch (id) {
    case "be":
      return Layout.BE_BY.id;
    case "cz":
      return Layout.CS_CZ.id;
    case "de":
      return Layout.DE_DE.id;
    case "fr":
      return Layout.FR_FR.id;
    case "it":
      return Layout.IT_IT.id;
    case "pl":
      return Layout.PL_PL.id;
    case "ru":
      return Layout.RU_RU.id;
    case "se":
      return Layout.SV_SE.id;
    case "ua":
      return Layout.UK_UA.id;
    case "uk":
      return Layout.EN_UK.id;
    case "us":
      return Layout.EN_US.id;
    case "us-canary-matrix":
      return Layout.EN_CANARY_MATRIX.id;
    case "us-colemak":
      return Layout.EN_COLEMAK.id;
    case "us-colemak-dh":
      return Layout.EN_COLEMAK_DH_ANSI.id;
    case "us-colemak-dh-matrix":
      return Layout.EN_COLEMAK_DH_MATRIX.id;
    case "us-dvorak":
      return Layout.EN_DVORAK.id;
    case "us-workman":
      return Layout.EN_WORKMAN.id;
    default:
      return id;
  }
}

function fixTextTypeId(id: string): string {
  switch (id) {
    case "guided":
      return TextType.GENERATED.id;
    case "custom":
      return TextType.NATURAL.id;
    default:
      return id;
  }
}
