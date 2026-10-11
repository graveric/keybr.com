import { test } from "node:test";
import { DataDir } from "@keybr/config";
import { removeDir } from "@sosimple/fsx";
import { File } from "@sosimple/fsx-file";
import { isFalse, isTrue } from "rich-assert";
import { LegacyFileMigrator } from "./migration.ts";

const tmp = process.env.DATA_DIR ?? "/tmp/keybr";

test.beforeEach(async () => {
  await removeDir(tmp);
});

test.afterEach(async () => {
  await removeDir(tmp);
});

test("migrates legacy files to the default space", async () => {
  // Arrange.

  const dataDir = new DataDir(tmp);
  const migrator = new LegacyFileMigrator(dataDir);
  const legacySettingsFile = new File(dataDir.userSettingsFile(1));
  const legacyStatsFile = new File(dataDir.userStatsFile(1));
  await legacySettingsFile.dir().create();
  await legacyStatsFile.dir().create();
  await legacySettingsFile.write('{"prop": "abc"}');
  await legacyStatsFile.write("something");

  // Act.

  await migrator.migrate(1, 42);

  // Assert.

  isFalse(await legacySettingsFile.exists());
  isFalse(await legacyStatsFile.exists());
  isTrue(await new File(dataDir.spaceSettingsFile(1, 42)).exists());
  isTrue(await new File(dataDir.spaceStatsFile(1, 42)).exists());
});

test("does nothing when there are no legacy files", async () => {
  // Arrange.

  const dataDir = new DataDir(tmp);
  const migrator = new LegacyFileMigrator(dataDir);

  // Act.

  await migrator.migrate(1, 42);

  // Assert.

  isFalse(await new File(dataDir.spaceSettingsFile(1, 42)).exists());
  isFalse(await new File(dataDir.spaceStatsFile(1, 42)).exists());
});
