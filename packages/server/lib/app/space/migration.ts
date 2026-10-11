import { injectable } from "@fastr/invert";
import { DataDir } from "@keybr/config";
import { rename } from "@sosimple/fsx";
import { File } from "@sosimple/fsx-file";

/**
 * Migrates the legacy per-user data files (settings and stats) which were
 * keyed by the user id alone, into the files of the default profile space
 * of the user, which are keyed by the user id and the space id.
 */
@injectable({ singleton: true })
export class LegacyFileMigrator {
  readonly #migrated = new Set<number>();

  constructor(readonly dataDir: DataDir) {}

  async migrate(userId: number, defaultSpaceId: number): Promise<void> {
    if (this.#migrated.has(userId)) {
      return;
    }
    try {
      await migrateFile(
        this.dataDir.userSettingsFile(userId),
        this.dataDir.spaceSettingsFile(userId, defaultSpaceId),
      );
      await migrateFile(
        this.dataDir.userStatsFile(userId),
        this.dataDir.spaceStatsFile(userId, defaultSpaceId),
      );
      this.#migrated.add(userId);
    } catch {
      // Failed to migrate the user data, try again on the next request.
    }
  }
}

async function migrateFile(from: string, to: string): Promise<void> {
  const source = new File(from);
  const target = new File(to);
  if (!(await target.exists()) && (await source.exists())) {
    await target.dir().create();
    try {
      await rename(from, to);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // Another process already migrated this file.
    }
  }
}
