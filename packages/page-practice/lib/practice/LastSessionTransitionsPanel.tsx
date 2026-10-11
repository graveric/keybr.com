import {
  barWidth,
  buildBigramTransitionsFromResult,
  formatChar,
  transitionColor,
} from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { type Result } from "@keybr/result";
import { type ReactNode, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./LastSessionTransitionsPanel.module.less";

const maxTransitions = 8;

export function LastSessionTransitionsPanel({
  result,
}: {
  readonly result: Result | null;
}): ReactNode {
  const keyboard = useKeyboard();
  const { formatNumber } = useIntl();

  const transitions = useMemo(
    () =>
      result != null
        ? buildBigramTransitionsFromResult(result, keyboard, {
            minPresses: 1,
          }).slice(0, maxTransitions)
        : [],
    [result, keyboard],
  );

  const [min, max] = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const transition of transitions) {
      if (transition.timeToType > 0) {
        min = Math.min(min, transition.timeToType);
        max = Math.max(max, transition.timeToType);
      }
    }
    return min <= max ? [min, max] : [0, 0];
  }, [transitions]);

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.title}>
        <FormattedMessage
          id="practice.lastSession.caption"
          defaultMessage="Last session transitions"
        />
      </h3>
      <ul className={styles.list}>
        {transitions.map((transition) => (
          <li
            key={`${transition.prevKeyId}\u0000${transition.currentKeyId}\u0000${transition.prevCodePoint}\u0000${transition.currentCodePoint}`}
            className={styles.item}
          >
            <span className={styles.pair}>
              {`${formatChar(transition.prevCodePoint)} \u2192 ${formatChar(transition.currentCodePoint)}`}
            </span>
            <span className={styles.barWrap}>
              <span
                className={styles.bar}
                style={{
                  width: `${barWidth(transition.timeToType, min, max)}%`,
                  backgroundColor: transitionColor(transition.timeToType),
                }}
              />
            </span>
            <span className={styles.time}>
              {transition.timeToType > 0
                ? formatNumber(transition.timeToType, {
                    style: "unit",
                    unit: "millisecond",
                    unitDisplay: "short",
                  })
                : "\u2013"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
