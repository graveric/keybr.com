import { injectable } from "@fastr/invert";
import { DataDir } from "@keybr/config";
import { Settings } from "@keybr/settings";
import { File } from "@sosimple/fsx-file";
import { LockFile } from "@sosimple/fsx-lockfile";
import { exponentialDelay } from "@sosimple/retry";

@injectable()
export class SettingsDatabase {
  constructor(readonly dataDir: DataDir) {}

  async set(
    userId: number,
    spaceId: number,
    settings: Settings | null,
  ): Promise<void> {
    const file = this.#getFile(userId, spaceId);
    await LockFile.withLock(
      file,
      { retryLimit: 5, delayer: exponentialDelay(10) },
      async (lock) => {
        if (settings != null) {
          await lock.writeFile(JSON.stringify(settings.toJSON(), null, 2));
          await lock.commit();
        } else {
          await file.delete();
          await lock.rollback();
        }
      },
    );
  }

  async get(userId: number, spaceId: number): Promise<Settings | null> {
    const file = this.#getFile(userId, spaceId);
    return await LockFile.withLock(
      file,
      {
        retryLimit: 5,
        delayer: exponentialDelay(10),
      },
      async (lock) => {
        try {
          let json: unknown;
          try {
            json = await file.readJson();
          } catch (err: any) {
            if (err.code === "ENOENT") {
              return null;
            } else {
              throw err;
            }
          }
          return new Settings(json as any);
        } finally {
          await lock.rollback();
        }
      },
    );
  }

  #getFile(userId: number, spaceId: number) {
    return new File(this.dataDir.spaceSettingsFile(userId, spaceId));
  }
}
