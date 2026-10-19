import { test } from "node:test";
import { Layout, loadKeyboard } from "@keybr/keyboard";
import { GuidedLesson } from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { LocalDate, ResultFaker } from "@keybr/result";
import { Settings } from "@keybr/settings";
import { equal } from "rich-assert";
import { Progress } from "./progress.ts";

test("today stats only include results of today and the current layout", () => {
  // Arrange.

  const settings = new Settings();
  const keyboard = loadKeyboard(Layout.EN_US);
  const model = new FakePhoneticModel(["uno", "due", "tre"]);
  const lesson = new GuidedLesson(settings, keyboard, model, []);
  const progress = new Progress(settings, lesson);

  const today = LocalDate.now();
  const yesterday = today.minusDays(1);
  const faker = new ResultFaker();
  const current1 = faker.nextResult({
    timeStamp: today.timeStamp,
    length: 100,
    time: 50000,
  });
  const current2 = faker.nextResult({
    timeStamp: today.timeStamp,
    length: 100,
    time: 100000,
  });
  const otherDay = faker.nextResult({
    timeStamp: yesterday.timeStamp,
    length: 200,
    time: 50000,
  });
  const otherLayout = faker.nextResult({
    timeStamp: today.timeStamp,
    layout: Layout.DE_DE,
    length: 100,
    time: 50000,
  });

  // Act.

  progress.seed([current1, current2, otherDay, otherLayout]);

  // Assert.

  equal(progress.summaryStats.count, 4);
  equal(progress.todayStats.count, 2);
  equal(progress.todayStats.speed.avg, 90);
  equal(progress.todayStats.speed.max, 120);
  equal(progress.todayStats.accuracy.avg, 1);
  equal(progress.todayStats.accuracy.max, 1);
});
