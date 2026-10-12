import { loadContent } from "@keybr/content-books";
import { loadWordList } from "@keybr/content-words";
import { catchError } from "@keybr/debug";
import { KeyboardOptions, useKeyboard } from "@keybr/keyboard";
import {
  BooksLesson,
  CodeLesson,
  CustomTextLesson,
  GuidedLesson,
  type Lesson,
  lessonProps,
  LessonType,
  NumbersLesson,
  strippedSettingsSignature,
  WordListLesson,
} from "@keybr/lesson";
import { LoadingProgress } from "@keybr/pages-shared";
import { type PhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { useSettings } from "@keybr/settings";
import { type ReactNode, useEffect, useRef, useState } from "react";

export function LessonLoader({
  children,
  fallback = <LoadingProgress />,
}: {
  readonly children: (result: Lesson) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const { settings } = useSettings();
  const lessonType = settings.get(lessonProps.type);
  const { language } = KeyboardOptions.from(settings);
  return (
    <PhoneticModelLoader language={language}>
      {(model) => (
        <Loader key={lessonType.id} model={model} fallback={fallback}>
          {children}
        </Loader>
      )}
    </PhoneticModelLoader>
  );
}

function Loader({
  model,
  children,
  fallback,
}: {
  readonly model: PhoneticModel;
  readonly children: (result: Lesson) => ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const result = useLoader(model);
  if (result == null) {
    return fallback;
  } else {
    return children(result);
  }
}

function useLoader(model: PhoneticModel): Lesson | null {
  const { settings } = useSettings();
  const keyboard = useKeyboard();
  const [result, setResult] = useState<Lesson | null>(null);
  // Manual free-mode letter choices persist through the global settings,
  // but must not reload the lesson: the fresh values reach the lesson
  // through the free-mode session store instead.
  const signature = strippedSettingsSignature(settings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let didCancel = false;
    const settings = settingsRef.current;

    const load = async (): Promise<void> => {
      switch (settings.get(lessonProps.type)) {
        case LessonType.GUIDED: {
          const { language } = KeyboardOptions.from(settings);
          const wordList = await loadWordList(language);
          if (!didCancel) {
            setResult(new GuidedLesson(settings, keyboard, model, wordList));
          }
          break;
        }
        case LessonType.WORDLIST: {
          const { language } = KeyboardOptions.from(settings);
          const wordList = await loadWordList(language);
          if (!didCancel) {
            setResult(new WordListLesson(settings, keyboard, model, wordList));
          }
          break;
        }
        case LessonType.BOOKS: {
          const book = settings.get(lessonProps.books.book);
          const content = await loadContent(book);
          if (!didCancel) {
            setResult(
              new BooksLesson(settings, keyboard, model, { book, content }),
            );
          }
          break;
        }
        case LessonType.CUSTOM: {
          if (!didCancel) {
            setResult(new CustomTextLesson(settings, keyboard, model));
          }
          break;
        }
        case LessonType.CODE: {
          if (!didCancel) {
            setResult(new CodeLesson(settings, keyboard, model));
          }
          break;
        }
        case LessonType.NUMBERS: {
          if (!didCancel) {
            setResult(new NumbersLesson(settings, keyboard, model));
          }
          break;
        }
        default:
          throw new Error();
      }
    };

    load().catch(catchError);

    return () => {
      didCancel = true;
    };
  }, [signature, keyboard, model]);

  return result;
}
