import { type Context, type Middleware, type Next } from "@fastr/core";
import { ForbiddenError } from "@fastr/errors";
import { randomString, type SessionState } from "@fastr/middleware-session";
import { User, UserSpace } from "@keybr/database";
import { LegacyFileMigrator } from "../space/migration.ts";
import { type AuthState } from "./types.ts";

export function loadUser(): Middleware<SessionState & AuthState> {
  return async (
    ctx: Context<SessionState & AuthState>,
    next: Next,
  ): Promise<void> => {
    const { state } = ctx;
    Object.assign(state, await makeAuthState(ctx));
    await next();
  };
}

async function makeAuthState(
  ctx: Context<SessionState & AuthState>,
): Promise<AuthState> {
  const { session } = ctx.state;
  const sessionId = session.id ?? randomString(10);
  const userId = session.get("userId");
  let user: User | null = null;
  if (userId != null) {
    user = await User.findById(userId);
  }
  let spaces: readonly UserSpace[] = [];
  let space: UserSpace | null = null;
  if (user != null) {
    const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);
    await ctx.container
      .get(LegacyFileMigrator)
      .migrate(user.id!, defaultSpace.id!);
    spaces = await UserSpace.loadAllFor(user.id!);
    const activeSpaceId = session.get("spaceId");
    space = spaces.find((space) => space.id === activeSpaceId) ?? defaultSpace;
  }
  const publicUser = User.toPublicUser(user, sessionId);
  return {
    sessionId,
    user,
    publicUser,
    requireUser: () => {
      if (user == null) {
        throw new ForbiddenError();
      } else {
        return user;
      }
    },
    spaces,
    space,
    requireSpace: () => {
      if (space == null) {
        throw new ForbiddenError();
      } else {
        return space;
      }
    },
  };
}
