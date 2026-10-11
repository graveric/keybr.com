import { createServer } from "node:http";
import { after, test } from "node:test";
import { request } from "@fastr/client";
import { start } from "@fastr/client-testlib";
import { Application } from "@fastr/core";
import { Reader, Writer } from "@keybr/binary";
import { DataDir } from "@keybr/config";
import { PublicId } from "@keybr/publicid";
import { type Result, ResultFaker } from "@keybr/result";
import { getHeaderVersion, HEADER_SIGNATURE } from "@keybr/result-io";
import { exists, removeDir, touch } from "@sosimple/fsx";
import {
  deepEqual,
  equal,
  isFalse,
  isTrue,
  match,
  notEqual,
} from "rich-assert";
import { type UserData, UserDataFactory } from "./index.ts";

const tmp = process.env.DATA_DIR ?? "/tmp/keybr";

test.beforeEach(async () => {
  await removeDir(tmp);
});

test.afterEach(async () => {
  await removeDir(tmp);
});

test("handle missing data file", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const userData = factory.loadLegacy(id);

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);
});

test("append new results", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const userData = factory.loadLegacy(id);
  const faker = new ResultFaker();
  const results = [faker.nextResult(), faker.nextResult(), faker.nextResult()];

  // Act.

  await userData.append([]);

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);

  // Act.

  await userData.append(results);

  // Assert.

  isTrue(await userData.exists());
  deepEqual(await readAll(userData), results);
});

test("delete missing file", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const path = factory.getFileLegacy(id).path;
  const userData = factory.loadLegacy(id);

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);
  isFalse(await exists(path + "~1"));

  // Act.

  await userData.delete();

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);
  isFalse(await exists(path + "~1"));
});

test("delete existing file", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const path = factory.getFileLegacy(id).path;
  const userData = factory.loadLegacy(id);
  const faker = new ResultFaker();
  const results = [faker.nextResult(), faker.nextResult(), faker.nextResult()];

  // Act.

  await userData.append(results);

  // Assert.

  isTrue(await userData.exists());
  deepEqual(await readAll(userData), results);
  isFalse(await exists(path + "~1"));

  // Act.

  await userData.delete();

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);
  isTrue(await exists(path + "~1"));
});

test("delete existing file second time", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const path = factory.getFileLegacy(id).path;
  const userData = factory.loadLegacy(id);
  const faker = new ResultFaker();
  const results = [faker.nextResult(), faker.nextResult(), faker.nextResult()];
  await touch(path + "~1");
  await touch(path + "~2");

  // Act.

  await userData.append(results);

  // Assert.

  isTrue(await userData.exists());
  deepEqual(await readAll(userData), results);
  isFalse(await exists(path + "~3"));

  // Act.

  await userData.delete();

  // Assert.

  isFalse(await userData.exists());
  deepEqual(await readAll(userData), []);
  isTrue(await exists(path + "~3"));
});

test("serve", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const userData = factory.loadLegacy(id);
  const app = new Application();
  app.use(async (ctx) => {
    await userData.serve(ctx);
  });
  const req = request.use(start(createTestServer(app.callback())));
  const faker = new ResultFaker();

  let etag1;
  let etag2;

  {
    // Act.

    const { status, headers, body } = await req.GET("/").send();

    // Assert.

    equal(status, 200);
    equal(headers.get("Content-Type"), "application/octet-stream");
    equal(headers.get("Content-Length"), "0");
    equal(headers.get("Content-Encoding"), null);
    equal(
      headers.get("Content-Disposition"),
      'attachment; filename="stats.data"',
    );
    equal(headers.get("Cache-Control"), "private, no-cache");
    equal(headers.get("Last-Modified"), null);
    equal((await body.buffer()).length, 0);
    etag1 = headers.get("ETag")!;
  }

  {
    // Act.

    await userData.append([faker.nextResult()]);

    const { status, headers, body } = await req.GET("/").send();

    // Assert.

    equal(status, 200);
    equal(headers.get("Content-Type"), "application/octet-stream");
    equal(headers.get("Content-Length"), "80");
    equal(headers.get("Content-Encoding"), null);
    equal(
      headers.get("Content-Disposition"),
      'attachment; filename="stats.data"',
    );
    equal(headers.get("Cache-Control"), "private, no-cache");
    equal(headers.get("Last-Modified"), null);
    equal((await body.buffer()).length, 80);
    etag2 = headers.get("ETag")!;
  }

  match(etag1, /"[a-zA-Z0-9]+"/);
  match(etag2, /"[a-zA-Z0-9]+"/);
  notEqual(etag1, etag2);
});

test("append to an existing v2 file upgrades it to v3", async () => {
  // Arrange.

  const id = new PublicId(1);
  const factory = new UserDataFactory(new DataDir(tmp));
  const file = factory.getFileLegacy(id);
  const userData = factory.loadLegacy(id);
  const faker = new ResultFaker();
  const oldResults = [faker.nextResult(), faker.nextResult()];
  await file.write(formatV2File(oldResults));
  const newResults = [faker.nextResult()];

  // Act.

  await userData.append(newResults);

  // Assert.

  deepEqual(await readAll(userData), [...oldResults, ...newResults]);
  equal(getHeaderVersion(new Reader(await file.read())), 3);
});

async function readAll(userData: UserData) {
  const results = [];
  for await (const result of userData.read()) {
    results.push(result);
  }
  return results;
}

function formatV2File(results: readonly Result[]): Uint8Array {
  const writer = new Writer();
  writer.putUint32(HEADER_SIGNATURE);
  writer.putUint32(2);
  for (const result of results) {
    writer.putUint8(result.layout.xid);
    writer.putUint8(result.textType.xid);
    writer.putUint32(Math.round(result.timeStamp / 1000));
    writer.putUintVlq(result.time);
    writer.putUintVlq(result.length);
    writer.putUintVlq(result.errors);
    const samples = [...result.histogram];
    writer.putUintVlq(samples.length);
    for (const sample of samples) {
      writer.putUintVlq(sample.codePoint);
      writer.putUintVlq(sample.hitCount);
      writer.putUintVlq(sample.missCount);
      writer.putUintVlq(sample.timeToType);
    }
  }
  return writer.buffer();
}

function createTestServer(callback: any) {
  const server = createServer(callback);
  after(() => {
    server.close();
  });
  return server;
}
