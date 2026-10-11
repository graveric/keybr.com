import { type LocaleId } from "@keybr/intl";

export type PageData = {
  /**
   * Base URL.
   */
  readonly base: string;
  /**
   * Active locale identifier.
   */
  readonly locale: LocaleId;
  /**
   * The full details about the currently authenticated user, which include
   * private information such as email, or null if the anonymous is anonymous.
   *
   * This is only visible to the authenticated user.
   */
  readonly user: UserDetails | null;
  /**
   * The current user as is visible to the public.
   *
   * This value does not include any user private information.
   *
   * If the current user is authenticated, then this value is derived from the
   * available user details, or can be anonymized on demand of the user.
   *
   * If the current user is anonymous, then this value is automatically
   * generated.
   */
  readonly publicUser: AnyUser;
  /**
   * Serialized user settings.
   */
  readonly settings: unknown | null;
  /**
   * The list of profile spaces of the authenticated user,
   * or an empty list if the user is anonymous.
   */
  readonly spaces: readonly SpaceDetails[];
  /**
   * The id of the currently active profile space of the authenticated user,
   * or null if the user is anonymous.
   */
  readonly activeSpaceId: number | null;
};

export type UserDetails = {
  /**
   * Unique id.
   */
  readonly id: string;
  /**
   * Unique e-mail.
   */
  readonly email: string;
  /**
   * User name.
   */
  readonly name: string;
  /**
   * Whether the user name is anonymized.
   */
  readonly anonymized: boolean;
  /**
   * Profiles from social networks.
   */
  readonly externalId: readonly UserExternalIdDetails[];
  /**
   * Premium account order.
   */
  readonly order: OrderDetails | null;
  /**
   * Timestamp.
   */
  readonly createdAt: string | Date;
};

export type UserExternalIdDetails = {
  /**
   * Social network name.
   */
  readonly provider: string;
  /**
   * User id in the social network.
   */
  readonly id: string;
  /**
   * User name in the social network.
   */
  readonly name: string | null;
  /**
   * Profile url.
   */
  readonly url: string | null;
  /**
   * Avatar image url.
   */
  readonly imageUrl: string | null;
  /**
   * Timestamp.
   */
  readonly createdAt: string | Date;
};

export type OrderDetails = {
  /**
   * Order unique id.
   */
  readonly id: string;
  /**
   * Order provider.
   */
  readonly provider: string;
  /**
   * Customer email.
   */
  readonly email: string | null;
  /**
   * Customer name.
   */
  readonly name: string | null;
  /**
   * Timestamp.
   */
  readonly createdAt: string | Date;
};

export type SpaceDetails = {
  /**
   * Unique space id.
   */
  readonly id: number;
  /**
   * User-defined space name.
   */
  readonly name: string;
  /**
   * Whether this space is the default space of the user.
   * The default space is the one which is visible to the public.
   */
  readonly isDefault: boolean;
};

export type AnonymousUser = {
  /**
   * Anonymous user id.
   */
  readonly id: null;
  /**
   * Anonymous user name.
   */
  readonly name: string;
  /**
   * Image url for avatar.
   */
  readonly imageUrl: null;
};

export type NamedUser = {
  /**
   * Unique user id.
   */
  readonly id: string;
  /**
   * Non-unique user name.
   */
  readonly name: string;
  /**
   * Image url for avatar.
   */
  readonly imageUrl: string | null;
  /**
   * Whether this is a premium user;
   */
  readonly premium: boolean;
};

export type AnyUser = AnonymousUser | NamedUser;
