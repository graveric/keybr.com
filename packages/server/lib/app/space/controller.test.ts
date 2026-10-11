import { test } from "node:test";
import { Application } from "@fastr/core";
import { UserSpace } from "@keybr/database";
import { type SpaceDetails } from "@keybr/pages-shared";
import { ResultFaker } from "@keybr/result";
import { UserDataFactory } from "@keybr/result-userdata";
import { Settings, stringProp } from "@keybr/settings";
import { SettingsDatabase } from "@keybr/settings-database";
import { deepEqual, equal, isFalse, isNull, isTrue } from "rich-assert";
import { kMain } from "../module.ts";
import { TestContext } from "../test/context.ts";
import { startApp, type TestRequest } from "../test/request.ts";
import { findUser } from "../test/sql.ts";

const context = new TestContext();

test("handle unauthenticated user", async () => {
  // Arrange.

  const request = startApp(context.get(Application, kMain));

  // Assert.

  equal((await request.POST("/_/spaces").send({ name: "Work" })).status, 403);
  equal((await request.PUT("/_/spaces/1").send({ name: "Work" })).status, 403);
  equal((await request.DELETE("/_/spaces/1").send()).status, 403);
  equal((await request.POST("/_/spaces/1/default").send()).status, 403);
  equal((await request.POST("/_/spaces/active/1").send()).status, 403);
});

test("create space", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);

  // Act.

  const response = await request.POST("/_/spaces").send({ name: "Work" });

  // Assert.

  equal(response.status, 200);
  const spaces = await response.body.json<readonly SpaceDetails[]>();
  equal(spaces.length, 2);
  deepEqual(spaces[0], {
    id: defaultSpace.id,
    name: "Default",
    isDefault: true,
  });
  equal(spaces[1].name, "Work");
  equal(spaces[1].isDefault, false);
});

test("create space copies settings of the default space", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);

  const database = context.get(SettingsDatabase);
  await database.set(
    user.id!,
    defaultSpace.id!,
    new Settings().set(stringProp("prop", "abc"), "abc"),
  );

  // Act.

  const response = await request.POST("/_/spaces").send({ name: "Work" });
  const [, space] = await response.body.json<readonly SpaceDetails[]>();

  // Assert.

  equal(
    (await database.get(user.id!, space.id))?.get(stringProp("prop", "abc")),
    "abc",
  );
});

test("validate space name on create", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  await UserSpace.ensureDefaultFor(user.id!);

  // Act, Assert.

  equal((await request.POST("/_/spaces").send({})).status, 400);
  equal((await request.POST("/_/spaces").send({ name: "" })).status, 400);
  equal((await request.POST("/_/spaces").send({ name: "  " })).status, 400);
  equal(
    (await request.POST("/_/spaces").send({ name: "x".repeat(51) })).status,
    400,
  );
});

test("rename space", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const space = await createSpace(request, "Work");

  // Act.

  const response = await request
    .PUT(`/_/spaces/${space.id}`)
    .send({ name: "Home" });

  // Assert.

  equal(response.status, 200);
  const spaces = await response.body.json<readonly SpaceDetails[]>();
  equal(spaces.find((s) => s.id === space.id)?.name, "Home");
  equal((await UserSpace.findOwned(user.id!, space.id))?.name, "Home");
});

test("delete space", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const space = await createSpace(request, "Work");

  const settingsDatabase = context.get(SettingsDatabase);
  const userDataFactory = context.get(UserDataFactory);
  await settingsDatabase.set(
    user.id!,
    space.id,
    new Settings().set(stringProp("prop", "abc"), "abc"),
  );
  const faker = new ResultFaker();
  await userDataFactory.load(user.id!, space.id).append([faker.nextResult()]);

  // Act.

  const response = await request.DELETE(`/_/spaces/${space.id}`).send();

  // Assert.

  equal(response.status, 200);
  isNull(await UserSpace.findOwned(user.id!, space.id));
  isNull(await settingsDatabase.get(user.id!, space.id));
  isFalse(await userDataFactory.load(user.id!, space.id).exists());
});

test("cannot delete default space", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);

  // Act.

  const response = await request.DELETE(`/_/spaces/${defaultSpace.id!}`).send();

  // Assert.

  equal(response.status, 400);
  isTrue((await UserSpace.findOwned(user.id!, defaultSpace.id!)) != null);
});

test("make space default", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);
  const space = await createSpace(request, "Work");

  // Act.

  const response = await request.POST(`/_/spaces/${space.id}/default`).send();

  // Assert.

  equal(response.status, 200);
  const spaces = await response.body.json<readonly SpaceDetails[]>();
  equal(spaces.find((s) => s.id === defaultSpace.id!)?.isDefault, false);
  equal(spaces.find((s) => s.id === space.id)?.isDefault, true);
  equal((await UserSpace.loadDefaultFor(user.id!))?.id, space.id);
});

test("activate space affects the sync endpoints", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  const defaultSpace = await UserSpace.ensureDefaultFor(user.id!);

  const database = context.get(SettingsDatabase);
  const prop = stringProp("prop", "abc");
  await database.set(user.id!, defaultSpace.id!, new Settings().set(prop, "a"));
  const space = await createSpace(request, "Work");
  await database.set(user.id!, space.id, new Settings().set(prop, "b"));

  // Act, Assert.

  equal((await getSettings(request)).get(prop), "a");

  equal(
    (await request.POST(`/_/spaces/active/${space.id}`).send()).status,
    200,
  );
  equal((await getSettings(request)).get(prop), "b");

  await request.POST(`/_/spaces/active/${defaultSpace.id!}`).send();
  equal((await getSettings(request)).get(prop), "a");
});

test("activating a space of another user does nothing", async () => {
  // Arrange.

  const user = await findUser("user1@keybr.com");
  const otherUser = await findUser("user2@keybr.com");
  const otherSpace = await UserSpace.ensureDefaultFor(otherUser.id!);

  const request = startApp(context.get(Application, kMain));
  await request.become(user.id!);
  await UserSpace.ensureDefaultFor(user.id!);

  // Act.

  const response = await request
    .POST(`/_/spaces/active/${otherSpace.id}`)
    .send();

  // Assert.

  equal(response.status, 404);
});

async function createSpace(
  request: TestRequest,
  name: string,
): Promise<SpaceDetails> {
  const response = await request.POST("/_/spaces").send({ name });
  equal(response.status, 200);
  const spaces = await response.body.json<readonly SpaceDetails[]>();
  return spaces[spaces.length - 1]!;
}

async function getSettings(request: TestRequest): Promise<Settings> {
  const response = await request.GET("/_/sync/settings").send();
  equal(response.status, 200);
  return new Settings(await response.body.json());
}
