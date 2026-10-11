import { injectable } from "@fastr/invert";
import { DataDir } from "@keybr/config";
import { PublicId } from "@keybr/publicid";
import { File } from "@sosimple/fsx-file";
import { UserData } from "./userdata.ts";

@injectable({ singleton: true })
export class UserDataFactory {
  constructor(readonly dataDir: DataDir) {}

  load(userId: number, spaceId: number): UserData {
    return new UserData(new PublicId(spaceId), this.getFile(userId, spaceId));
  }

  /**
   * @deprecated Loads the legacy pre-spaces file layout,
   * where all user data was keyed by the user id alone.
   */
  loadLegacy(id: PublicId): UserData {
    if (id.example) {
      throw new TypeError();
    } else {
      return new UserData(id, this.getFileLegacy(id));
    }
  }

  getFile(userId: number, spaceId: number): File {
    return new File(this.dataDir.spaceStatsFile(userId, spaceId));
  }

  /**
   * @deprecated Returns the legacy pre-spaces file path.
   */
  getFileLegacy(id: PublicId): File {
    if (id.example) {
      throw new TypeError();
    } else {
      return new File(this.dataDir.userStatsFile(id.id));
    }
  }
}
