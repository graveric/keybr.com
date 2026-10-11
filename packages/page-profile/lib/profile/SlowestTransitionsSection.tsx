import {
  buildBigramTransitions,
  type PairType,
  type PairTypeFilter,
  TransitionsKeyboard,
} from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import {
  Explainer,
  Field,
  FieldList,
  Figure,
  OptionList,
} from "@keybr/widget";
import { type ReactNode, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./SlowestTransitionsSection.module.less";

export function SlowestTransitionsSection({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}): ReactNode {
  const keyboard = useKeyboard();
  const { formatMessage, formatNumber } = useIntl();
  const [pairType, setPairType] = useState<PairTypeFilter>("all");

  const transitions = useMemo(
    () =>
      buildBigramTransitions(keyStatsMap, keyboard, {
        pairType,
        minPresses: 3,
      }),
    [keyStatsMap, keyboard, pairType],
  );

  const filterOptions = [
    {
      value: "all",
      name: formatMessage({
        id: "profile.transitions.filter.all",
        defaultMessage: "All",
      }),
    },
    {
      value: "same-hand",
      name: formatMessage({
        id: "profile.transitions.filter.sameHand",
        defaultMessage: "Same hand",
      }),
    },
    {
      value: "cross-hand",
      name: formatMessage({
        id: "profile.transitions.filter.crossHand",
        defaultMessage: "Cross hand",
      }),
    },
  ];

  return (
    <Figure>
      <Figure.Caption>
        <FormattedMessage
          id="profile.transitions.caption"
          defaultMessage="Slowest Transitions"
        />
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage
            id="profile.transitions.description"
            defaultMessage="Mean time to type for the slowest pairs of characters. Only transitions with at least three presses are shown."
          />
        </Figure.Description>
      </Explainer>

      <FieldList>
        <Field>
          <FormattedMessage
            id="profile.transitions.filter"
            defaultMessage="Pairs:"
          />
        </Field>
        <Field>
          <OptionList
            title={formatMessage({
              id: "profile.transitions.filter",
              defaultMessage: "Pairs:",
            })}
            options={filterOptions}
            value={pairType}
            onSelect={(value) => {
              setPairType(value as PairTypeFilter);
            }}
          />
        </Field>
      </FieldList>

      {transitions.length > 0 ? (
        <>
          <TransitionsKeyboard keyboard={keyboard} transitions={transitions} />
          <div className={styles.root}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.row}>
                  <th className={styles.cell}>
                    <FormattedMessage
                      id="profile.transitions.column.transition"
                      defaultMessage="Transition"
                    />
                  </th>
                  <th className={styles.cell}>
                    <FormattedMessage
                      id="profile.transitions.column.keys"
                      defaultMessage="Keys"
                    />
                  </th>
                  <th className={styles.cell}>
                    <FormattedMessage
                      id="profile.transitions.column.type"
                      defaultMessage="Type"
                    />
                  </th>
                  <th className={styles.numeric}>
                    <FormattedMessage
                      id="profile.transitions.column.presses"
                      defaultMessage="Presses"
                    />
                  </th>
                  <th className={styles.numeric}>
                    <FormattedMessage
                      id="profile.transitions.column.time"
                      defaultMessage="Mean time"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {transitions.map((transition) => (
                  <tr
                    key={`${transition.prevKeyId}\u0000${transition.currentKeyId}\u0000${transition.prevCodePoint}\u0000${transition.currentCodePoint}`}
                    className={styles.row}
                  >
                    <td className={styles.mono}>
                      {`${formatChar(transition.prevCodePoint)} \u2192 ${formatChar(transition.currentCodePoint)}`}
                    </td>
                    <td className={styles.mono}>
                      {`${transition.prevKeyId} \u2192 ${transition.currentKeyId}`}
                    </td>
                    <td>
                      {formatMessage(pairTypeMessage(transition.pairType))}
                    </td>
                    <td className={styles.numeric}>
                      {formatNumber(transition.hitCount)}
                    </td>
                    <td className={styles.numeric}>
                      {transition.timeToType > 0
                        ? formatNumber(transition.timeToType, {
                            style: "unit",
                            unit: "millisecond",
                            unitDisplay: "short",
                          })
                        : "\u2013"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <FormattedMessage
            id="profile.transitions.empty"
            defaultMessage="Not enough data yet. Keep practicing to collect transition statistics."
          />
        </div>
      )}

      <Figure.Legend>
        <FormattedMessage
          id="profile.transitions.legend"
          defaultMessage="Arrows show the slowest transitions; the thicker the arrow, the slower the transition."
        />
      </Figure.Legend>
    </Figure>
  );
}

function pairTypeMessage(pairType: PairType): {
  id: string;
  defaultMessage: string;
} {
  switch (pairType) {
    case "same-hand":
      return {
        id: "profile.transitions.type.sameHand",
        defaultMessage: "Same hand",
      };
    case "cross-hand":
      return {
        id: "profile.transitions.type.crossHand",
        defaultMessage: "Cross hand",
      };
    default:
      return {
        id: "profile.transitions.type.unknown",
        defaultMessage: "Unknown",
      };
  }
}

function formatChar(codePoint: number): string {
  const char = String.fromCodePoint(codePoint);
  return /^[\u0020-\u007e]$/.test(char)
    ? char
    : `U+${codePoint.toString(16).toUpperCase()}`;
}
