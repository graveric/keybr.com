import { test } from "node:test";
import { DataDir } from "@keybr/config";
import { PublicId } from "@keybr/publicid";
import { equal, throws } from "rich-assert";
import { UserDataFactory } from "./index.ts";

test("get legacy file path for user id", () => {
  const factory = new UserDataFactory(new DataDir("/keybr"));

  equal(
    factory.getFileLegacy(new PublicId(1)).path,
    "/keybr/user_stats/000/000/000000001",
  );
  equal(
    factory.getFileLegacy(new PublicId(123_456_789)).path,
    "/keybr/user_stats/123/456/123456789",
  );
  throws(() => {
    factory.getFileLegacy(PublicId.example1);
  });
});

test("get file path for space id", () => {
  const factory = new UserDataFactory(new DataDir("/keybr"));

  equal(factory.getFile(1, 2).path, "/keybr/space_stats/000/000/000000001/2");
  equal(
    factory.getFile(123_456_789, 10).path,
    "/keybr/space_stats/123/456/123456789/10",
  );
});
