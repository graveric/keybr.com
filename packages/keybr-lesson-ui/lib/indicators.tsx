import { useIntlNumbers } from "@keybr/intl";
import {
  type DailyGoal as DailyGoalType,
  type LessonKey,
  type LessonKeys,
} from "@keybr/lesson";
import {
  type StreakList as StreakListType,
  type SummaryStats,
} from "@keybr/result";
import { Name, NameValue } from "@keybr/widget";
import { memo } from "react";
import { type MouseEvent } from "react";
import { useIntl } from "react-intl";
import { CurrentKey } from "./CurrentKey.tsx";
import { DailyGoal } from "./DailyGoal.tsx";
import { useFormatter } from "./format.ts";
import { GaugeList } from "./gauges.tsx";
import * as styles from "./indicators.module.less";
import { type KeyExtra, KeySet } from "./KeySet.tsx";
import { type Names } from "./names.ts";
import { StreakList } from "./StreakList.tsx";

export const GaugeRow = memo(function GaugeRow({
  summaryStats,
  names,
}: {
  summaryStats: SummaryStats;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_Metrics",
          defaultMessage: "Metrics",
        })}
      />
      <GaugeList summaryStats={summaryStats} names={names} />
    </div>
  );
});

export const KeySetRow = memo(function KeySetRow({
  lessonKeys,
  names,
  resolveKey,
  onKeyHoverIn,
  onKeyHoverOut,
  onKeyClick,
  onKeyContextMenu,
}: {
  lessonKeys: LessonKeys;
  names?: Names;
  resolveKey?: (key: LessonKey) => KeyExtra;
  onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
  onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
  onKeyClick?: (key: LessonKey, elem: Element, event: MouseEvent) => void;
  onKeyContextMenu?: (key: LessonKey, elem: Element, event: MouseEvent) => void;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_All_keys",
          defaultMessage: "All keys",
        })}
      />
      <KeySet
        id={names?.keySet}
        className={styles.value}
        lessonKeys={lessonKeys}
        resolveKey={resolveKey}
        onKeyHoverIn={onKeyHoverIn}
        onKeyHoverOut={onKeyHoverOut}
        onKeyClick={onKeyClick}
        onKeyContextMenu={onKeyContextMenu}
      />
    </div>
  );
});

export const CurrentKeyRow = memo(function CurrentKeyRow({
  lessonKeys,
  names,
}: {
  lessonKeys: LessonKeys;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_Current_key",
          defaultMessage: "Current key",
        })}
      />
      <CurrentKey
        id={names?.currentKey}
        className={styles.value}
        lessonKeys={lessonKeys}
      />
    </div>
  );
});

export const StreakListRow = memo(function StreakListRow({
  streakList,
  names,
}: {
  streakList: StreakListType;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_Accuracy",
          defaultMessage: "Accuracy",
        })}
      />
      <StreakList
        id={names?.streakList}
        className={styles.value}
        streakList={streakList}
      />
    </div>
  );
});

export const TodayStatsRow = memo(function TodayStatsRow({
  summaryStats: { speed, accuracy },
}: {
  summaryStats: SummaryStats;
}) {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const { formatSpeed } = useFormatter();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_Statistics_for_Today",
          defaultMessage: "Statistics for Today",
        })}
      />
      <div className={styles.value}>
        <NameValue
          name={formatMessage({
            id: "t_Average_speed",
            defaultMessage: "Average speed",
          })}
          value={speed.avg > 0 ? formatSpeed(speed.avg) : "N/A"}
        />
        <NameValue
          name={formatMessage({
            id: "t_Top_speed",
            defaultMessage: "Top speed",
          })}
          value={speed.max > 0 ? formatSpeed(speed.max) : "N/A"}
        />
        <NameValue
          name={formatMessage({
            id: "t_Average_accuracy",
            defaultMessage: "Average accuracy",
          })}
          value={accuracy.avg > 0 ? formatPercents(accuracy.avg) : "N/A"}
        />
        <NameValue
          name={formatMessage({
            id: "t_Top_accuracy",
            defaultMessage: "Top accuracy",
          })}
          value={accuracy.max > 0 ? formatPercents(accuracy.max) : "N/A"}
        />
      </div>
    </div>
  );
});

export const DailyGoalRow = memo(function DailyGoalRow({
  dailyGoal,
  names,
}: {
  dailyGoal: DailyGoalType;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className={styles.row}>
      <Name
        className={styles.name}
        name={formatMessage({
          id: "t_Daily_goal",
          defaultMessage: "Daily goal",
        })}
      />
      <DailyGoal
        id={names?.dailyGoal}
        className={styles.value}
        dailyGoal={dailyGoal}
      />
    </div>
  );
});
