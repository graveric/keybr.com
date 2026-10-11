import { test } from "node:test";
import { Reader, Writer } from "@keybr/binary";
import { Layout } from "@keybr/keyboard";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { deepEqual, equal } from "rich-assert";
import { readResult, writeResult } from "./binary.ts";
import { formatFile, parseFile } from "./file.ts";
import {
  getHeaderVersion,
  HEADER_SIGNATURE,
  HEADER_VERSION,
} from "./header.ts";

test("v3 round-trips results with bigrams", () => {
  const histogram = new Histogram([
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
    {
      codePoint: 0x0061,
      hitCount: 11,
      missCount: 1,
      timeToType: 111,
      bigrams: new Map([
        [
          0x0062,
          {
            hitCount: 11,
            missCount: 1,
            timeToType: 0,
            prevKeyId: "KeyB",
            currentKeyId: "KeyA",
          },
        ],
      ]),
    },
  ]);

  const result = new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    123,
    12345,
    3,
    histogram,
  );

  const writer = new Writer();
  writeResult(writer, result);

  const reader = new Reader(writer.buffer());
  deepEqual(readResult(reader, 3), result);
  equal(reader.remaining(), 0);
});

test("v3 round-trips results without bigrams", () => {
  const histogram = new Histogram([
    { codePoint: 0x0061, hitCount: 11, missCount: 1, timeToType: 111 },
  ]);

  const result = new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    123,
    12345,
    3,
    histogram,
  );

  const writer = new Writer();
  writeResult(writer, result);

  const reader = new Reader(writer.buffer());
  deepEqual(readResult(reader, 3), result);
});

test("formatFile writes a v3 header", () => {
  const histogram = new Histogram([
    { codePoint: 0x0061, hitCount: 11, missCount: 1, timeToType: 111 },
  ]);
  const result = new Result(
    Layout.EN_US,
    TextType.GENERATED,
    Date.parse("2001-02-03T03:05:06Z"),
    123,
    12345,
    3,
    histogram,
  );

  const buffer = formatFile([result]);
  const reader = new Reader(buffer);
  equal(getHeaderVersion(reader), HEADER_VERSION);
  deepEqual([...parseFile(buffer)], [result]);
});

test("reads a v2 file without bigram data", () => {
  const writer = new Writer();
  writer.putUint32(HEADER_SIGNATURE);
  writer.putUint32(2);
  writer.putUint8(Layout.EN_US.xid);
  writer.putUint8(TextType.GENERATED.xid);
  writer.putUint32(Math.round(Date.parse("2001-02-03T03:05:06Z") / 1000));
  writer.putUintVlq(12345);
  writer.putUintVlq(123);
  writer.putUintVlq(3);
  writer.putUintVlq(1);
  writer.putUintVlq(0x0061);
  writer.putUintVlq(11);
  writer.putUintVlq(1);
  writer.putUintVlq(111);

  const results = [...parseFile(writer.buffer())];

  equal(results.length, 1);
  const sample = results[0].histogram.get(0x0061);
  equal(sample?.hitCount, 11);
  equal(sample?.bigrams, undefined);
});

test("rejects an unsupported v1 header", () => {
  const writer = new Writer();
  writer.putUint32(HEADER_SIGNATURE);
  writer.putUint32(1);
  writer.putUint8(Layout.EN_US.xid);
  writer.putUint8(TextType.GENERATED.xid);

  let error: unknown = null;
  try {
    void [...parseFile(writer.buffer())];
  } catch (err) {
    error = err;
  }
  equal(error != null, true);
});

test("rejects an unknown key identifier index", () => {
  const writer = new Writer();
  writer.putUint32(HEADER_SIGNATURE);
  writer.putUint32(HEADER_VERSION);
  writer.putUint8(Layout.EN_US.xid);
  writer.putUint8(TextType.GENERATED.xid);
  writer.putUint32(Math.round(Date.parse("2001-02-03T03:05:06Z") / 1000));
  writer.putUintVlq(12345);
  writer.putUintVlq(123);
  writer.putUintVlq(3);
  writer.putUintVlq(1);
  writer.putUintVlq(0x0062);
  writer.putUintVlq(22);
  writer.putUintVlq(2);
  writer.putUintVlq(222);
  writer.putUintVlq(1);
  writer.putUintVlq(0x0061);
  writer.putUintVlq(9999);
  writer.putUintVlq(0);
  writer.putUintVlq(22);
  writer.putUintVlq(2);
  writer.putUintVlq(222);

  let error: unknown = null;
  try {
    void [...parseFile(writer.buffer())];
  } catch (err) {
    error = err;
  }
  equal(error != null, true);
});
