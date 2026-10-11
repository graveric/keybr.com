import { body, controller, http, pathParam } from "@fastr/controller";
import { Context } from "@fastr/core";
import { BadRequestError, NotFoundError } from "@fastr/errors";
import { injectable } from "@fastr/invert";
import { type RouterState } from "@fastr/middleware-router";
import { User, UserSpace } from "@keybr/database";
import { HighScoresFactory } from "@keybr/highscores";
import { type NamedUser } from "@keybr/pages-shared";
import { PublicId } from "@keybr/publicid";
import { type Result } from "@keybr/result";
import { parseMessage } from "@keybr/result-io";
import { UserDataFactory } from "@keybr/result-userdata";
import { type AuthState, pProfileOwner } from "../auth/index.ts";

@injectable()
@controller()
export class Controller {
  constructor(
    readonly highScores: HighScoresFactory,
    readonly userData: UserDataFactory,
  ) {}

  @http.GET("/_/sync/data/{id:[a-zA-Z0-9]+}")
  async getPublicData(
    ctx: Context<RouterState & AuthState>,
    @pathParam("id", pProfileOwner) profileOwner: NamedUser,
  ) {
    const user = await User.findById(PublicId.of(profileOwner.id).id);
    if (user == null) {
      throw new NotFoundError(); // Includes example users.
    }
    const space = await UserSpace.ensureDefaultFor(user.id!);
    await this.userData.load(user.id!, space.id!).serve(ctx);
  }

  @http.GET("/_/sync/data")
  async getData(ctx: Context<RouterState & AuthState>) {
    const { id: userId } = ctx.state.requireUser();
    const { id: spaceId } = ctx.state.requireSpace();
    await this.userData.load(userId!, spaceId!).serve(ctx);
  }

  @http.POST("/_/sync/data")
  async postData(
    ctx: Context<RouterState & AuthState>,
    @body.binary(null, { maxLength: 1048576 }) value: Buffer,
  ) {
    const { id: userId } = ctx.state.requireUser();
    const space = ctx.state.requireSpace();
    const results = await parseResults(value);
    await this.userData.load(userId!, space.id!).append(results);
    if (space.isDefault != null) {
      // Only the default space of the user is visible to the public,
      // so only its results are eligible for the high scores table.
      await this.highScores.append(userId!, results);
    }
    ctx.response.status = 204;
  }

  @http.DELETE("/_/sync/data")
  async deleteData(ctx: Context<RouterState & AuthState>) {
    const { id: userId } = ctx.state.requireUser();
    const { id: spaceId } = ctx.state.requireSpace();
    await this.userData.load(userId!, spaceId!).delete();
    ctx.response.status = 204;
  }
}

// TODO Parse asynchronously in batches.
// TODO Convert to middleware.
async function parseResults(buffer: Buffer): Promise<Result[]> {
  const results = [];
  try {
    for (const result of parseMessage(buffer)) {
      if (result.validate()) {
        results.push(result);
      }
    }
  } catch (err: any) {
    throw new BadRequestError(err.message);
  }
  return results;
}
