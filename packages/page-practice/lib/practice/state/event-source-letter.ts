import { getEffectiveFreeState, type Lesson, lessonProps } from "@keybr/lesson";
import { type Letter } from "@keybr/phonetic-model";
import { type KeyStatsMap, type Result } from "@keybr/result";
import { type CodePoint } from "@keybr/unicode";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

export class LetterEvents implements LessonEventSource {
  readonly #lesson: Lesson;
  readonly #keyStatsMap: KeyStatsMap;
  readonly #included: Set<Letter>;

  constructor(lesson: Lesson, keyStatsMap: KeyStatsMap) {
    this.#lesson = lesson;
    this.#keyStatsMap = keyStatsMap;
    this.#included = new Set();
    const lessonKeys = this.#lesson.update(this.#keyStatsMap);
    for (const lessonKey of lessonKeys.findIncludedKeys()) {
      if (!this.#included.has(lessonKey.letter)) {
        this.#included.add(lessonKey.letter);
      }
    }
  }

  append(result: Result, listener: LessonEventListener): void {
    const lessonKeys = this.#lesson.update(this.#keyStatsMap);
    const manual = findManualCodePoints(this.#lesson);
    for (const lessonKey of lessonKeys.findIncludedKeys()) {
      if (!this.#included.has(lessonKey.letter)) {
        this.#included.add(lessonKey.letter);
        if (!manual.has(lessonKey.letter.codePoint)) {
          listener({ type: "new-letter", lessonKey });
        }
      }
    }
  }
}

function findManualCodePoints(lesson: Lesson): Set<CodePoint> {
  if (!lesson.settings.get(lessonProps.guided.freeMode)) {
    return new Set();
  }
  const { overrides } = getEffectiveFreeState(lesson.settings, lesson);
  return new Set(
    [...overrides]
      .filter(([, override]) => override === "added")
      .map(([codePoint]) => codePoint),
  );
}
