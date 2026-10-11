import { type User, type UserSpace } from "@keybr/database";
import { type AnyUser } from "@keybr/pages-shared";

export type AuthState = {
  readonly sessionId: string;
  readonly user: User | null;
  readonly publicUser: AnyUser;
  readonly requireUser: () => User;
  /**
   * The profile spaces of the authenticated user,
   * or an empty list if the user is anonymous.
   */
  readonly spaces: readonly UserSpace[];
  /**
   * The currently active profile space of the authenticated user,
   * or null if the user is anonymous.
   */
  readonly space: UserSpace | null;
  readonly requireSpace: () => UserSpace;
};
