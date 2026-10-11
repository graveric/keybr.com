import { body, controller, http, pathParam } from "@fastr/controller";
import { Context } from "@fastr/core";
import { BadRequestError, NotFoundError } from "@fastr/errors";
import { injectable } from "@fastr/invert";
import { type RouterState } from "@fastr/middleware-router";
import { type SessionState } from "@fastr/middleware-session";
import { UserSpace } from "@keybr/database";
import { type SpaceDetails } from "@keybr/pages-shared";
import { UserDataFactory } from "@keybr/result-userdata";
import { SettingsDatabase } from "@keybr/settings-database";
import { type AuthState } from "../auth/index.ts";

type SpaceState = RouterState & SessionState & AuthState;

@injectable()
@controller()
export class Controller {
  constructor(
    readonly settingsDatabase: SettingsDatabase,
    readonly userDataFactory: UserDataFactory,
  ) {}

  @http.POST("/_/spaces")
  async createSpace(
    ctx: Context<SpaceState>,
    @body.json(null, { maxLength: 1024 }) value: unknown,
  ) {
    const user = ctx.state.requireUser();
    const defaultSpace = await UserSpace.loadDefaultFor(user.id!);
    if (defaultSpace == null) {
      throw new Error("No default space"); // Unreachable.
    }
    const name = parseSpaceName(value);
    const space = await UserSpace.query().insertAndFetch({
      userId: user.id!,
      name,
    });
    const settings = await this.settingsDatabase.get(
      user.id!,
      defaultSpace.id!,
    );
    if (settings != null) {
      await this.settingsDatabase.set(user.id!, space.id!, settings);
    }
    ctx.response.body = await listSpaces(user.id!);
  }

  @http.PUT("/_/spaces/{id:[0-9]+}")
  async renameSpace(
    ctx: Context<SpaceState>,
    @pathParam("id", pSpaceId) id: number,
    @body.json(null, { maxLength: 1024 }) value: unknown,
  ) {
    const user = ctx.state.requireUser();
    const space = await findSpace(user.id!, id);
    const name = parseSpaceName(value);
    await UserSpace.query().findById(space.id!).patch({ name });
    ctx.response.body = await listSpaces(user.id!);
  }

  @http.DELETE("/_/spaces/{id:[0-9]+}")
  async deleteSpace(
    ctx: Context<SpaceState>,
    @pathParam("id", pSpaceId) id: number,
  ) {
    const user = ctx.state.requireUser();
    const space = await findSpace(user.id!, id);
    if (space.isDefault != null) {
      throw new BadRequestError("The default space cannot be deleted.");
    }
    await UserSpace.query().findById(space.id!).delete();
    await this.settingsDatabase.set(user.id!, space.id!, null);
    await this.userDataFactory.load(user.id!, space.id!).delete();
    if (ctx.state.session.get("spaceId") === space.id) {
      ctx.state.session.delete("spaceId");
    }
    ctx.response.body = await listSpaces(user.id!);
  }

  @http.POST("/_/spaces/{id:[0-9]+}/default")
  async makeDefaultSpace(
    ctx: Context<SpaceState>,
    @pathParam("id", pSpaceId) id: number,
  ) {
    const user = ctx.state.requireUser();
    const space = await findSpace(user.id!, id);
    await UserSpace.setDefault(user.id!, space.id!);
    ctx.response.body = await listSpaces(user.id!);
  }

  @http.POST("/_/spaces/active/{id:[0-9]+}")
  async activateSpace(
    ctx: Context<SpaceState>,
    @pathParam("id", pSpaceId) id: number,
  ) {
    const user = ctx.state.requireUser();
    const space = await findSpace(user.id!, id);
    ctx.state.session.set("spaceId", space.id!);
    ctx.response.body = await listSpaces(user.id!);
  }
}

async function findSpace(userId: number, id: number): Promise<UserSpace> {
  const space = await UserSpace.findOwned(userId, id);
  if (space == null) {
    throw new NotFoundError();
  }
  return space;
}

async function listSpaces(userId: number): Promise<readonly SpaceDetails[]> {
  return (await UserSpace.loadAllFor(userId)).map((space) => space.toDetails());
}

function parseSpaceName(value: unknown): string {
  const { maxLength } = UserSpace.jsonSchema.properties.name;
  if (value != null && typeof value === "object") {
    const { name } = value as { name?: unknown };
    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (trimmedName.length > 0 && trimmedName.length <= maxLength) {
        return trimmedName;
      }
    }
  }
  throw new BadRequestError(
    `Space name must be a string of 1 to ${maxLength} characters.`,
  );
}

function pSpaceId(_ctx: Context<RouterState>, value: string): number {
  const id = parseInt(value, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new NotFoundError();
  }
  return id;
}
