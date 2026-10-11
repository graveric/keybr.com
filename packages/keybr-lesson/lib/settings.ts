import { Syntax } from "@keybr/code";
import { Book } from "@keybr/content";
import { type Layout } from "@keybr/keyboard";
import {
  booleanProp,
  flagsProp,
  itemProp,
  type NumberProp,
  numberProp,
  type Settings,
  stringProp,
} from "@keybr/settings";
import { LessonType } from "./lessontype.ts";

export const lessonProps = {
  type: itemProp("lesson.type", LessonType.ALL, LessonType.GUIDED),
  length: numberProp("lesson.length", 0, { min: 0, max: 1 }),
  guided: {
    naturalWords: booleanProp("lesson.guided.naturalWords", true),
    keyboardOrder: booleanProp("lesson.guided.keyboardOrder", false),
    alphabetSize: numberProp("lesson.guided.alphabetSize", 0, {
      min: 0,
      max: 1,
    }),
    recoverKeys: booleanProp("lesson.guided.recoverKeys", false),
  } as const,
  wordList: {
    wordListSize: numberProp("lesson.wordList.wordListSize", 1000, {
      min: 10,
      max: 1000,
    }),
    longWordsOnly: booleanProp("lesson.wordList.longWordsOnly", false),
  } as const,
  books: {
    book: itemProp("lesson.books.book", Book.ALL, Book.EN_ALICE_WONDERLAND),
    paragraphIndex: numberProp("lesson.books.paragraphIndex", 0, {
      min: 0,
      max: 1000,
    }),
    lettersOnly: booleanProp("lesson.books.lettersOnly", false),
    lowercase: booleanProp("lesson.books.lowercase", false),
  },
  customText: {
    content: stringProp(
      "lesson.customText.content",
      "The quick brown fox jumps over the lazy dog.",
      { maxLength: 10_000 },
    ),
    lettersOnly: booleanProp("lesson.customText.lettersOnly", true),
    lowercase: booleanProp("lesson.customText.lowercase", true),
    randomize: booleanProp("lesson.customText.randomize", false),
  } as const,
  numbers: {
    benford: booleanProp("lesson.numbers.benford", true),
  } as const,
  code: {
    syntax: itemProp("lesson.code.syntax", Syntax.ALL, Syntax.HTML),
    flags: flagsProp("lesson.code.flags", Syntax.FLAGS),
  } as const,
  capitals: numberProp("lesson.capitals", 0, { min: 0, max: 1 }),
  punctuators: numberProp("lesson.punctuators", 0, { min: 0, max: 1 }),
  repeatWords: numberProp("lesson.repeatWords", 1, { min: 1, max: 10 }),
  targetSpeed: numberProp("lesson.targetSpeed", 175, { min: 75, max: 750 }),
  dailyGoal: numberProp("lesson.dailyGoal", 30, { min: 0, max: 120 }),
} as const;

export const dailyGoalDefault = 30;
export const dailyGoalMin = 0;
export const dailyGoalMax = 120;

/**
 * The daily goal is stored per-layout. Layouts that have no explicit value
 * fall back to the legacy global `lesson.dailyGoal` value.
 */
export function dailyGoalProp(layout: Layout): NumberProp {
  return numberProp(`lesson.dailyGoal.${layout.id}`, dailyGoalDefault, {
    min: dailyGoalMin,
    max: dailyGoalMax,
  });
}

export function getDailyGoal(settings: Settings, layout: Layout): number {
  return settings.get(
    dailyGoalProp(layout),
    settings.get(lessonProps.dailyGoal),
  );
}

export function setDailyGoal(
  settings: Settings,
  layout: Layout,
  value: number,
): Settings {
  return settings.set(dailyGoalProp(layout), value);
}
