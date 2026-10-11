import { test } from "node:test";
import { equal } from "rich-assert";
import { DataDir } from "./datadir.ts";

test("get file name for user id", () => {
  const dataDir = new DataDir("/keybr");

  equal(dataDir.userSettingsFile(1), "/keybr/user_settings/000/000/000000001");
  equal(
    dataDir.userSettingsFile(123_456_789),
    "/keybr/user_settings/123/456/123456789",
  );
  equal(dataDir.userStatsFile(1), "/keybr/user_stats/000/000/000000001");
  equal(
    dataDir.userStatsFile(123_456_789),
    "/keybr/user_stats/123/456/123456789",
  );
});

test("get file name for space id", () => {
  const dataDir = new DataDir("/keybr");

  equal(
    dataDir.spaceSettingsFile(1, 2),
    "/keybr/space_settings/000/000/000000001/2",
  );
  equal(
    dataDir.spaceSettingsFile(123_456_789, 10),
    "/keybr/space_settings/123/456/123456789/10",
  );
  equal(dataDir.spaceStatsFile(1, 2), "/keybr/space_stats/000/000/000000001/2");
  equal(
    dataDir.spaceStatsFile(123_456_789, 10),
    "/keybr/space_stats/123/456/123456789/10",
  );
});
