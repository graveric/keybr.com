import { test } from "node:test";
import { Layout } from "@keybr/keyboard";
import { LocalDate, ResultFaker, Today } from "@keybr/result";
import { Settings } from "@keybr/settings";
import { deepEqual } from "rich-assert";
import { MutableDailyGoal } from "./dailygoal.ts";
import { getDailyGoal, lessonProps, setDailyGoal } from "./settings.ts";

test("daily goal is not set", () => {
  // Arrange.

  const today = new LocalDate(2001, 2, 3);
  const faker = new ResultFaker({ timeStamp: today.timeStamp });
  const dailyGoal = new MutableDailyGoal(
    new Settings().set(lessonProps.dailyGoal, 0),
    Layout.EN_US,
    new Today(today),
  );

  // Assert.

  deepEqual(dailyGoal.copy(), { goal: 0, value: 0 });

  // Act.

  dailyGoal.append(faker.nextResult({ time: 60000 }));
  dailyGoal.append(faker.nextResult({ time: 60000 }));

  // Assert.

  deepEqual(dailyGoal.copy(), { goal: 0, value: 0 });
});

test("daily goal is set", () => {
  // Arrange.

  const today = new LocalDate(2001, 2, 3);
  const faker = new ResultFaker({ timeStamp: today.timeStamp });
  const dailyGoal = new MutableDailyGoal(
    new Settings().set(lessonProps.dailyGoal, 10),
    Layout.EN_US,
    new Today(today),
  );

  // Act, Assert.

  dailyGoal.append(faker.nextResult({ time: 60000, timeStamp: 0 }));
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0 });

  // Act, Assert.

  dailyGoal.append(faker.nextResult({ time: 60000 }));
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0.1 });

  // Act, Assert.

  dailyGoal.append(faker.nextResult({ time: 60000 }));
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0.2 });

  // Act, Assert.

  dailyGoal.append(
    faker.nextResult({
      time: 60000,
      timeStamp: today.plusDays(1).timeStamp,
    }),
  );
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0.2 });
});

test("daily goal is scoped to a layout", () => {
  // Arrange.

  const today = new LocalDate(2001, 2, 3);
  const faker = new ResultFaker({ timeStamp: today.timeStamp });
  const dailyGoal = new MutableDailyGoal(
    new Settings().set(lessonProps.dailyGoal, 10),
    Layout.EN_US,
    new Today(today),
  );

  // Act, Assert.

  dailyGoal.append(faker.nextResult({ layout: Layout.DE_DE, time: 60000 }));
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0 });

  // Act, Assert.

  dailyGoal.append(faker.nextResult({ layout: Layout.EN_US, time: 60000 }));
  deepEqual(dailyGoal.copy(), { goal: 10, value: 0.1 });
});

test("daily goal falls back to the legacy global value", () => {
  // Arrange.

  const settings = new Settings().set(lessonProps.dailyGoal, 45);

  // Assert.

  deepEqual(getDailyGoal(settings, Layout.EN_US), 45);
  deepEqual(getDailyGoal(settings, Layout.RU_RU), 45);
});

test("daily goal can be set per layout", () => {
  // Arrange.

  const settings = new Settings().set(lessonProps.dailyGoal, 45);

  // Act.

  const updated = setDailyGoal(settings, Layout.RU_RU, 60);

  // Assert.

  deepEqual(getDailyGoal(updated, Layout.EN_US), 45);
  deepEqual(getDailyGoal(updated, Layout.RU_RU), 60);
});
