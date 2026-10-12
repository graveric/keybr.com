import { type KeyId, useKeyboard } from "@keybr/keyboard";
import {
  applyFreeFocus,
  applyFreeOverride,
  freeScope,
  GuidedLesson,
  guidedMinSize,
  hydrateFreeScope,
  type LessonKey,
  lessonProps,
  withFreeFocus,
  withFreeOverride,
} from "@keybr/lesson";
import { type Result } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { type LineList } from "@keybr/textinput";
import { addKey, deleteKey, emulateLayout } from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import {
  useDocumentEvent,
  useHotkeys,
  useTimeout,
  useWindowEvent,
} from "@keybr/widget";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import { Presenter } from "./Presenter.tsx";
import {
  type LastLesson,
  LessonState,
  makeLastLesson,
  type Progress,
} from "./state/index.ts";
import { useFreeState } from "./use-free-state.ts";

export const Controller = memo(function Controller({
  progress,
  onResult,
}: {
  readonly progress: Progress;
  readonly onResult: (result: Result) => void;
}): ReactNode {
  const {
    state,
    lastResult,
    handleResetLesson,
    handleSkipLesson,
    handleKeyClick,
    handleKeyContextMenu,
    handleKeyDown,
    handleKeyUp,
    handleInput,
  } = useLessonState(progress, onResult);
  useHotkeys({
    ["Ctrl+ArrowLeft"]: handleResetLesson,
    ["Ctrl+ArrowRight"]: handleSkipLesson,
    ["Escape"]: handleResetLesson,
  });
  useWindowEvent("focus", handleResetLesson);
  useWindowEvent("blur", handleResetLesson);
  useDocumentEvent("visibilitychange", handleResetLesson);
  return (
    <Presenter
      state={state}
      lines={state.lines}
      depressedKeys={state.depressedKeys}
      lastResult={lastResult}
      onResetLesson={handleResetLesson}
      onSkipLesson={handleSkipLesson}
      onKeyClick={handleKeyClick}
      onKeyContextMenu={handleKeyContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onInput={handleInput}
    />
  );
});

function useLessonState(
  progress: Progress,
  onResult: (result: Result) => void,
) {
  const { settings, updateSettings } = useSettings();
  const keyboard = useKeyboard();
  const timeout = useTimeout();
  const free = useFreeState(settings, progress.lesson);
  const freeEnabled =
    settings.get(lessonProps.guided.freeMode) &&
    progress.lesson instanceof GuidedLesson;
  const [key, setKey] = useState(0); // Creates new LessonState instances.
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const [, setDepressedKeys] = useState<readonly KeyId[]>([]); // Forces UI update.
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const lastLessonRef = useRef<LastLesson | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  return useMemo(() => {
    // New lesson.
    const state = new LessonState(progress, (result, textInput) => {
      setKey(key + 1);
      lastLessonRef.current = makeLastLesson(result, textInput.steps);
      setLastResult(result);
      onResultRef.current(result);
    });
    state.lastLesson = lastLessonRef.current;
    setLines(state.lines);
    setDepressedKeys(state.depressedKeys);
    const handleResetLesson = () => {
      state.resetLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const handleSkipLesson = () => {
      state.skipLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const handleKeyClick = (lessonKey: LessonKey) => {
      if (!freeEnabled) {
        return;
      }
      const scope = freeScope(progress.lesson);
      hydrateFreeScope(settings, scope);
      const { codePoint } = lessonKey.letter;
      const override = free.overrides.get(codePoint);
      let next = settings;
      if (override === "excluded" || !lessonKey.isIncluded) {
        // Add a locked or excluded letter to the training set.
        applyFreeOverride(scope, codePoint, "added");
        next = withFreeOverride(settings, scope, codePoint, "added");
      } else if (lessonKey.isFocused) {
        if (override === "added") {
          // Click on a manually added focused key removes it,
          // back to automatic behavior.
          applyFreeOverride(scope, codePoint, null);
          next = withFreeOverride(settings, scope, codePoint, null);
        }
        // Click on the focused key resets to automatic focus.
        applyFreeFocus(scope, null);
        next = withFreeFocus(next, scope, null);
      } else {
        applyFreeFocus(scope, codePoint);
        next = withFreeFocus(settings, scope, codePoint);
      }
      updateSettings(next);
      setKey(key + 1);
    };
    const handleKeyContextMenu = (lessonKey: LessonKey, elem: Element) => {
      if (!freeEnabled) {
        return;
      }
      const scope = freeScope(progress.lesson);
      hydrateFreeScope(settings, scope);
      const { codePoint } = lessonKey.letter;
      const position = state.lessonKeys.letters.findIndex(
        (letter) => letter.codePoint === codePoint,
      );
      if (position >= 0 && position < guidedMinSize) {
        // The initial key set is inviolable.
        return;
      }
      const override = free.overrides.get(codePoint);
      let next = settings;
      if (override === "excluded") {
        // Bring an excluded letter back to automatic behavior.
        applyFreeOverride(scope, codePoint, null);
        next = withFreeOverride(settings, scope, codePoint, null);
      } else {
        // Exclude a letter from the training set.
        applyFreeOverride(scope, codePoint, "excluded");
        next = withFreeOverride(settings, scope, codePoint, "excluded");
      }
      updateSettings(next);
      setKey(key + 1);
    };
    const playSounds = makeSoundPlayer(state.settings);
    const { onKeyDown, onKeyUp, onInput } = emulateLayout(
      state.settings,
      keyboard,
      {
        onKeyDown: (event) => {
          setDepressedKeys(
            (state.depressedKeys = addKey(state.depressedKeys, event.code)),
          );
        },
        onKeyUp: (event) => {
          setDepressedKeys(
            (state.depressedKeys = deleteKey(state.depressedKeys, event.code)),
          );
        },
        onInput: (event) => {
          state.lastLesson = null;
          const feedback = state.onInput(event);
          setLines(state.lines);
          playSounds(feedback);
          timeout.schedule(handleResetLesson, 10000);
        },
      },
    );
    return {
      state,
      lastResult,
      handleResetLesson,
      handleSkipLesson,
      handleKeyClick: freeEnabled ? handleKeyClick : null,
      handleKeyContextMenu: freeEnabled ? handleKeyContextMenu : null,
      handleKeyDown: onKeyDown,
      handleKeyUp: onKeyUp,
      handleInput: onInput,
    };
  }, [
    progress,
    keyboard,
    timeout,
    key,
    lastResult,
    settings,
    updateSettings,
    free,
    freeEnabled,
  ]);
}
