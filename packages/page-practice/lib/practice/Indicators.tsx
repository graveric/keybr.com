import { Tasks } from "@keybr/lang";
import {
  GuidedLesson,
  guidedMinSize,
  type LessonKey,
  lessonProps,
} from "@keybr/lesson";
import {
  CurrentKeyRow,
  CurrentKeySpeedRow,
  DailyGoalRow,
  GaugeRow,
  type KeyExtra,
  KeySetRow,
  names,
  StreakListRow,
  TodayStatsRow,
} from "@keybr/lesson-ui";
import { useSettings } from "@keybr/settings";
import { Popup, Portal } from "@keybr/widget";
import {
  memo,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useIntl } from "react-intl";
import * as styles from "./Indicators.module.less";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { type LessonState } from "./state/index.ts";
import { useFreeState } from "./use-free-state.ts";

export const Indicators = memo(function Indicators({
  state: {
    lesson,
    keyStatsMap,
    summaryStats,
    todayStats,
    lessonKeys,
    streakList,
    dailyGoal,
  },
  onKeyClick,
  onKeyContextMenu,
}: {
  readonly state: LessonState;
  readonly onKeyClick:
    ((key: LessonKey, elem: Element, event: MouseEvent) => void) | null;
  readonly onKeyContextMenu:
    ((key: LessonKey, elem: Element, event: MouseEvent) => void) | null;
}): ReactNode {
  const { settings } = useSettings();
  const { formatMessage } = useIntl();
  const freeMode =
    settings.get(lessonProps.guided.freeMode) && lesson instanceof GuidedLesson;
  const free = useFreeState(settings, lesson);
  const resolveKey = useMemo(() => {
    if (!freeMode) {
      return undefined;
    }
    const positionOf = new Map(
      lessonKeys.letters.map((letter, index) => [letter.codePoint, index]),
    );
    return (key: LessonKey): KeyExtra => {
      const { codePoint } = key.letter;
      const override = free.overrides.get(codePoint);
      const position = positionOf.get(codePoint) ?? 0;
      const added = override === "added";
      if (key.isFocused) {
        if (added) {
          return {
            selectable: true,
            added,
            title: formatMessage({
              id: "t_Free_focused_added_key",
              defaultMessage:
                "Trained now, added manually. Click to remove it and return to automatic focus.",
            }),
          };
        }
        return {
          selectable: true,
          added,
          title: formatMessage({
            id: "t_Free_focused_key",
            defaultMessage: "Trained now. Click to return to automatic focus.",
          }),
        };
      }
      if (override === "excluded") {
        return {
          selectable: true,
          manualExcluded: true,
          title: formatMessage({
            id: "t_Free_excluded_key",
            defaultMessage:
              "Excluded. Click to add back to training. Right-click to return to automatic behavior.",
          }),
        };
      }
      if (!key.isIncluded) {
        return {
          selectable: true,
          title: formatMessage({
            id: "t_Free_locked_key",
            defaultMessage:
              "Click to add this letter ahead of time. Right-click to exclude it.",
          }),
        };
      }
      if (added) {
        return {
          selectable: true,
          added,
          title: formatMessage({
            id: "t_Free_added_key",
            defaultMessage:
              "Added manually. Click to train it. Right-click to exclude it.",
          }),
        };
      }
      if (position < guidedMinSize) {
        return {
          selectable: true,
          added,
          title: formatMessage({
            id: "t_Free_basic_key",
            defaultMessage: "Click to train this letter.",
          }),
        };
      }
      return {
        selectable: true,
        added,
        title: formatMessage({
          id: "t_Free_included_key",
          defaultMessage:
            "Click to train this letter. Right-click to exclude it from training.",
        }),
      };
    };
  }, [freeMode, free, lessonKeys, formatMessage]);
  type State = Readonly<
    | { type: "hidden" }
    | { type: "visible-in"; key: LessonKey; elem: Element }
    | { type: "visible"; key: LessonKey; elem: Element }
    | { type: "visible-out"; key: LessonKey; elem: Element }
  >;
  const [state, setState] = useState<State>({ type: "hidden" });
  useEffect(() => {
    const tasks = new Tasks();
    switch (state.type) {
      case "visible-in":
        tasks.delayed(300, () => {
          setState({ ...state, type: "visible" });
        });
        break;
      case "visible-out":
        tasks.delayed(300, () => {
          setState({ type: "hidden" });
        });
        break;
    }
    return () => {
      tasks.cancelAll();
    };
  }, [state]);
  return (
    <div id={names.indicators} className={styles.indicators}>
      <GaugeRow summaryStats={summaryStats} names={names} />
      <KeySetRow
        lessonKeys={lessonKeys}
        names={names}
        resolveKey={resolveKey}
        onKeyHoverIn={(key, elem) => {
          setState({ type: "visible-in", key, elem });
        }}
        onKeyHoverOut={() => {
          switch (state.type) {
            case "visible-in":
              setState({ type: "hidden" });
              break;
            case "visible":
              setState({ ...state, type: "visible-out" });
              break;
          }
        }}
        onKeyClick={onKeyClick ?? undefined}
        onKeyContextMenu={onKeyContextMenu ?? undefined}
      />
      <CurrentKeyRow lessonKeys={lessonKeys} names={names} />
      <CurrentKeySpeedRow lessonKeys={lessonKeys} keyStatsMap={keyStatsMap} />
      <StreakListRow streakList={streakList} names={names} />
      <TodayStatsRow summaryStats={todayStats} />
      {dailyGoal.goal > 0 && (
        <DailyGoalRow dailyGoal={dailyGoal} names={names} />
      )}
      {(state.type === "visible" || state.type === "visible-out") && (
        <Portal>
          <Popup
            anchor={state.elem}
            onMouseEnter={() => {
              setState({ ...state, type: "visible" });
            }}
            onMouseLeave={() => {
              setState({ ...state, type: "visible-out" });
            }}
          >
            <KeyExtendedDetails
              lessonKey={state.key}
              keyStats={keyStatsMap.get(state.key.letter)}
            />
          </Popup>
        </Portal>
      )}
    </div>
  );
});
