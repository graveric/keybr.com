import { type Reader, type Writer } from "@keybr/binary";
import { keyIdFromIndex, keyIdToIndex, Layout } from "@keybr/keyboard";
import { Result, TextType } from "@keybr/result";
import {
  type BigramSample,
  Histogram,
  type Sample,
} from "@keybr/textinput";
import { InvalidFormatError } from "./errors.ts";
import { getHeaderVersion, HEADER_VERSION } from "./header.ts";

export function writeResult(writer: Writer, result: Result): void {
  const samples = [...result.histogram];
  writer.putUint8(result.layout.xid);
  writer.putUint8(result.textType.xid);
  writer.putUint32(Math.round(result.timeStamp / 1000));
  writer.putUintVlq(result.time);
  writer.putUintVlq(result.length);
  writer.putUintVlq(result.errors);
  writer.putUintVlq(samples.length);
  for (const sample of samples) {
    writer.putUintVlq(sample.codePoint);
    writer.putUintVlq(sample.hitCount);
    writer.putUintVlq(sample.missCount);
    writer.putUintVlq(sample.timeToType);
    const bigrams = sample.bigrams;
    if (bigrams == null || bigrams.size === 0) {
      writer.putUintVlq(0);
    } else {
      const entries = [...bigrams.entries()];
      writer.putUintVlq(entries.length);
      for (const [prevCodePoint, bigram] of entries) {
        writer.putUintVlq(prevCodePoint);
        writer.putUintVlq(keyIdToIndex(bigram.prevKeyId));
        writer.putUintVlq(keyIdToIndex(bigram.currentKeyId));
        writer.putUintVlq(bigram.hitCount);
        writer.putUintVlq(bigram.missCount);
        writer.putUintVlq(bigram.timeToType);
      }
    }
  }
}

export function writeResults(writer: Writer, results: Iterable<Result>): void {
  for (const result of results) {
    writeResult(writer, result);
  }
}

export function readResult(
  reader: Reader,
  version: number = HEADER_VERSION,
): Result {
  const layoutXId = reader.getUint8();
  const textTypeXId = reader.getUint8();
  const timestamp = reader.getUint32() * 1000;
  const time = reader.getUintVlq();
  const length = reader.getUintVlq();
  const errors = reader.getUintVlq();
  const size = reader.getUintVlq();
  const samples: Sample[] = [];
  for (let i = 0; i < size; i++) {
    const codePoint = reader.getUintVlq();
    const hitCount = reader.getUintVlq();
    const missCount = reader.getUintVlq();
    const timeToType = reader.getUintVlq();
    let bigrams: ReadonlyMap<number, BigramSample> | undefined;
    if (version >= 3) {
      const bigramCount = reader.getUintVlq();
      if (bigramCount > 0) {
        const map = new Map<number, BigramSample>();
        for (let j = 0; j < bigramCount; j++) {
          const prevCodePoint = reader.getUintVlq();
          const prevKeyIdIndex = reader.getUintVlq();
          const currentKeyIdIndex = reader.getUintVlq();
          const bigramHitCount = reader.getUintVlq();
          const bigramMissCount = reader.getUintVlq();
          const bigramTimeToType = reader.getUintVlq();
          const prevKeyId = keyIdFromIndex(prevKeyIdIndex);
          const currentKeyId = keyIdFromIndex(currentKeyIdIndex);
          if (prevKeyId == null || currentKeyId == null) {
            throw new InvalidFormatError("Invalid key id");
          }
          map.set(prevCodePoint, {
            hitCount: bigramHitCount,
            missCount: bigramMissCount,
            timeToType: bigramTimeToType,
            prevKeyId,
            currentKeyId,
          });
        }
        bigrams = map;
      }
    }
    samples.push({
      codePoint,
      hitCount,
      missCount,
      timeToType,
      ...(bigrams != null ? { bigrams } : {}),
    });
  }
  return new Result(
    Layout.ALL.xget(layoutXId),
    TextType.ALL.xget(textTypeXId),
    timestamp,
    length,
    time,
    errors,
    new Histogram(samples),
  );
}

export function* readResults(
  reader: Reader,
  version: number = HEADER_VERSION,
): Iterable<Result> {
  while (reader.remaining() > 0) {
    yield readResult(reader, version);
  }
}

export function* readStructuredContent(reader: Reader): Iterable<Result> {
  if (reader.remaining() > 0) {
    const version = getHeaderVersion(reader);
    if (version == null) {
      throw new InvalidFormatError("Invalid header");
    }
    try {
      yield* readResults(reader, version);
    } catch (err: any) {
      throw new InvalidFormatError("Invalid data format", { cause: err });
    }
  }
}
