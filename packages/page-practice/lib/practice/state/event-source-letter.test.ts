import { test } from "node:test";
import {
  LessonKey,
  LessonKeys,
  lessonProps,
  resetFreeModeSession,
  withFreeOverride,
} from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { ResultFaker } from "@keybr/result";
import { Settings } from "@keybr/settings";
import { deepEqual } from "rich-assert";
import { LetterEvents } from "./event-source-letter.ts";
import { type LessonEvent } from "./event-types.ts";

const keyArgs = {
  samples: [],
  timeToType: null,
  bestTimeToType: null,
  confidence: null,
  bestConfidence: null,
};
const { letter1, letter2, letter3, letter4 } = FakePhoneticModel;
const key1 = new LessonKey({ ...keyArgs, letter: letter1 });
const key2 = new LessonKey({ ...keyArgs, letter: letter2 });
const key3 = new LessonKey({ ...keyArgs, letter: letter3 });
const key4 = new LessonKey({ ...keyArgs, letter: letter4 });

test("generate events", () => {
  // Arrange.

  const lesson = {
    settings: new Settings(),
    lessonKeys: new LessonKeys([
      key1.asIncluded(),
      key2.asIncluded(),
      key3.asExcluded(),
      key4.asExcluded(),
    ]),
    update() {
      return lesson.lessonKeys;
    },
  };
  const keyStatsMap = {};

  const faker = new ResultFaker();
  const source = new LetterEvents(lesson as any, keyStatsMap as any);
  const events = new Set<LessonEvent>();
  const listener = events.add.bind(events);

  // Act.

  source.append(faker.nextResult(), listener);

  // Assert.

  deepEqual([...events], []);
  events.clear();

  // Act.

  lesson.lessonKeys = new LessonKeys([
    key1.asIncluded(),
    key2.asIncluded(),
    key3.asIncluded(),
    key4.asExcluded(),
  ]);
  source.append(faker.nextResult(), listener);

  // Assert.

  deepEqual(
    [...events],
    [{ type: "new-letter", lessonKey: key3.asIncluded() }],
  );
  events.clear();

  // Act.

  source.append(faker.nextResult(), listener);

  // Assert.

  deepEqual([...events], []);
  events.clear();

  // Act.

  lesson.lessonKeys = new LessonKeys([
    key1.asIncluded(),
    key2.asIncluded(),
    key3.asIncluded(),
    key4.asIncluded(),
  ]);
  source.append(faker.nextResult(), listener);

  // Assert.

  deepEqual(
    [...events],
    [{ type: "new-letter", lessonKey: key4.asIncluded() }],
  );
  events.clear();
});

test("skip manually added letters", () => {
  // Arrange.

  resetFreeModeSession();
  const scope = "fake-layout_fake-lang";
  const settings = withFreeOverride(
    new Settings().set(lessonProps.guided.freeMode, true),
    scope,
    letter3.codePoint,
    "added",
  );

  const lesson = {
    settings,
    keyboard: { layout: { id: "fake-layout" } },
    model: { language: { id: "fake-lang" } },
    lessonKeys: new LessonKeys([
      key1.asIncluded(),
      key2.asIncluded(),
      key3.asExcluded(),
      key4.asExcluded(),
    ]),
    update() {
      return lesson.lessonKeys;
    },
  };
  const keyStatsMap = {};

  const faker = new ResultFaker();
  const source = new LetterEvents(lesson as any, keyStatsMap as any);
  const events = new Set<LessonEvent>();
  const listener = events.add.bind(events);

  // Act.

  lesson.lessonKeys = new LessonKeys([
    key1.asIncluded(),
    key2.asIncluded(),
    key3.asIncluded(),
    key4.asExcluded(),
  ]);
  source.append(faker.nextResult(), listener);

  // Assert, no event for the manually added letter.

  deepEqual([...events], []);
  events.clear();

  // Act.

  lesson.lessonKeys = new LessonKeys([
    key1.asIncluded(),
    key2.asIncluded(),
    key3.asIncluded(),
    key4.asIncluded(),
  ]);
  source.append(faker.nextResult(), listener);

  // Assert, event for the automatically unlocked letter.

  deepEqual(
    [...events],
    [{ type: "new-letter", lessonKey: key4.asIncluded() }],
  );
  events.clear();
});
