import {
  freeModeStore,
  freeScope,
  type FreeState,
  getEffectiveFreeState,
  hydrateFreeScope,
  type Lesson,
} from "@keybr/lesson";
import { type Settings } from "@keybr/settings";
import { useSyncExternalStore } from "react";

export function useFreeState(settings: Settings, lesson: Lesson): FreeState {
  useSyncExternalStore(freeModeStore.subscribe, freeModeStore.getVersion);
  const scope = freeScope(lesson);
  hydrateFreeScope(settings, scope);
  return getEffectiveFreeState(settings, lesson);
}
