import {
  barWidth,
  type BigramTransition,
  buildBigramTransitions,
  type PairType,
  type PairTypeFilter,
  transitionColor,
  TransitionsKeyboard,
} from "@keybr/chart";
import { type KeyId, useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import { type CodePoint } from "@keybr/unicode";
import {
  Explainer,
  Field,
  FieldList,
  Figure,
  Icon,
  OptionList,
} from "@keybr/widget";
import { mdiChevronDown, mdiChevronUp, mdiClose } from "@mdi/js";
import { type ReactNode, useMemo, useState } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import * as styles from "./SlowestTransitionsSection.module.less";

const maxDetails = 5;

const msgToggleCollapse = defineMessage({
  id: "profile.transitions.toggle.collapse",
  defaultMessage: "Collapse the transition statistics.",
});

const msgToggleExpand = defineMessage({
  id: "profile.transitions.toggle.expand",
  defaultMessage: "Expand the transition statistics.",
});

export function SlowestTransitionsSection({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}): ReactNode {
  const keyboard = useKeyboard();
  const { formatMessage, formatNumber } = useIntl();
  const [expanded, setExpanded] = useState(false);
  const [pairType, setPairType] = useState<PairTypeFilter>("all");
  const [selected, setSelected] = useState<CodePoint | null>(null);

  const allTransitions = useMemo(
    () => buildBigramTransitions(keyStatsMap, keyboard, { minPresses: 3 }),
    [keyStatsMap, keyboard],
  );

  const transitions = useMemo(
    () =>
      pairType === "all"
        ? allTransitions
        : allTransitions.filter(
            (transition) => transition.pairType === pairType,
          ),
    [allTransitions, pairType],
  );

  const keyIdToCodePoint = useMemo(() => {
    const map = new Map<KeyId, CodePoint>();
    for (const transition of allTransitions) {
      if (!map.has(transition.prevKeyId)) {
        map.set(transition.prevKeyId, transition.prevCodePoint);
      }
      if (!map.has(transition.currentKeyId)) {
        map.set(transition.currentKeyId, transition.currentCodePoint);
      }
    }
    return map;
  }, [allTransitions]);

  const toggledKeys = useMemo(() => {
    if (selected == null) {
      return [];
    }
    const combo = keyboard.getCombo(selected);
    return combo != null ? [combo.id] : [];
  }, [keyboard, selected]);

  const [rangeMin, rangeMax] = useMemo(() => {
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

  const incoming = useMemo(
    () =>
      selected != null
        ? allTransitions
            .filter((transition) => transition.currentCodePoint === selected)
            .slice(0, maxDetails)
        : [],
    [allTransitions, selected],
  );

  const outgoing = useMemo(
    () =>
      selected != null
        ? allTransitions
            .filter((transition) => transition.prevCodePoint === selected)
            .slice(0, maxDetails)
        : [],
    [allTransitions, selected],
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

  function selectLetter(codePoint: CodePoint) {
    setSelected(selected === codePoint ? null : codePoint);
  }

  return (
    <Figure>
      <Figure.Caption>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          title={formatMessage(expanded ? msgToggleCollapse : msgToggleExpand)}
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          <span>
            <FormattedMessage
              id="profile.transitions.caption"
              defaultMessage="Slowest Transitions"
            />
          </span>
          <Icon shape={expanded ? mdiChevronUp : mdiChevronDown} />
        </button>
      </Figure.Caption>

      {expanded && (
        <>
          <Explainer>
            <Figure.Description>
              <FormattedMessage
                id="profile.transitions.description"
                defaultMessage="Mean time to type for the slowest pairs of characters. Only transitions with at least three presses are shown. Select a key to see its incoming and outgoing transitions."
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
              <TransitionsKeyboard
                keyboard={keyboard}
                transitions={transitions}
                toggledKeys={toggledKeys}
                onKeyClick={(key) => {
                  const codePoint = keyIdToCodePoint.get(key);
                  if (codePoint != null) {
                    selectLetter(codePoint);
                  }
                }}
              />
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
                          <button
                            type="button"
                            className={
                              selected === transition.prevCodePoint
                                ? styles.charActive
                                : styles.char
                            }
                            onClick={() => {
                              selectLetter(transition.prevCodePoint);
                            }}
                          >
                            {formatChar(transition.prevCodePoint)}
                          </button>
                          <span className={styles.arrow}>{"\u2192"}</span>
                          <button
                            type="button"
                            className={
                              selected === transition.currentCodePoint
                                ? styles.charActive
                                : styles.char
                            }
                            onClick={() => {
                              selectLetter(transition.currentCodePoint);
                            }}
                          >
                            {formatChar(transition.currentCodePoint)}
                          </button>
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
                          <TimeBar
                            timeToType={transition.timeToType}
                            min={rangeMin}
                            max={rangeMax}
                            label={formatTime(transition.timeToType)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected != null && (
                <TransitionDetails
                  selected={selected}
                  incoming={incoming}
                  outgoing={outgoing}
                  onClose={() => {
                    setSelected(null);
                  }}
                  onSelect={selectLetter}
                />
              )}
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
              defaultMessage="Arrows show the slowest transitions; the thicker the arrow, the slower the transition. Green is fast, red is slow."
            />
          </Figure.Legend>
        </>
      )}
    </Figure>
  );

  function formatTime(timeToType: number): string {
    return timeToType > 0
      ? formatNumber(timeToType, {
          style: "unit",
          unit: "millisecond",
          unitDisplay: "short",
        })
      : "\u2013";
  }
}

function TimeBar({
  timeToType,
  min,
  max,
  label,
}: {
  readonly timeToType: number;
  readonly min: number;
  readonly max: number;
  readonly label: string;
}): ReactNode {
  if (timeToType <= 0) {
    return <span className={styles.timeValue}>{label}</span>;
  }
  return (
    <span className={styles.timeCell}>
      <span
        className={styles.timeBar}
        style={{
          width: `${barWidth(timeToType, min, max)}%`,
          backgroundColor: transitionColor(timeToType),
        }}
      />
      <span className={styles.timeValue}>{label}</span>
    </span>
  );
}

function TransitionDetails({
  selected,
  incoming,
  outgoing,
  onClose,
  onSelect,
}: {
  readonly selected: CodePoint;
  readonly incoming: readonly BigramTransition[];
  readonly outgoing: readonly BigramTransition[];
  readonly onClose: () => void;
  readonly onSelect: (codePoint: CodePoint) => void;
}): ReactNode {
  const { formatMessage, formatNumber } = useIntl();
  const [min, max] = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const transition of [...incoming, ...outgoing]) {
      if (transition.timeToType > 0) {
        min = Math.min(min, transition.timeToType);
        max = Math.max(max, transition.timeToType);
      }
    }
    return min <= max ? [min, max] : [0, 0];
  }, [incoming, outgoing]);
  return (
    <div className={styles.details}>
      <div className={styles.detailsHeader}>
        <span className={styles.detailsTitle}>
          <FormattedMessage
            id="profile.transitions.details.title"
            defaultMessage="Transitions for {char}"
            values={{ char: formatChar(selected) }}
          />
        </span>
        <button
          type="button"
          className={styles.detailsClose}
          title={formatMessage({
            id: "profile.transitions.details.close",
            defaultMessage: "Close the details.",
          })}
          onClick={onClose}
        >
          <Icon shape={mdiClose} />
        </button>
      </div>
      <div className={styles.detailsColumns}>
        <DetailsColumn
          title={
            <FormattedMessage
              id="profile.transitions.details.incoming"
              defaultMessage="Into {char}"
              values={{ char: formatChar(selected) }}
            />
          }
          transitions={incoming}
          min={min}
          max={max}
          other={(transition) => transition.prevCodePoint}
          onSelect={onSelect}
          formatNumber={formatNumber}
        />
        <DetailsColumn
          title={
            <FormattedMessage
              id="profile.transitions.details.outgoing"
              defaultMessage="Out of {char}"
              values={{ char: formatChar(selected) }}
            />
          }
          transitions={outgoing}
          min={min}
          max={max}
          other={(transition) => transition.currentCodePoint}
          onSelect={onSelect}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );
}

function DetailsColumn({
  title,
  transitions,
  min,
  max,
  other,
  onSelect,
  formatNumber,
}: {
  readonly title: ReactNode;
  readonly transitions: readonly BigramTransition[];
  readonly min: number;
  readonly max: number;
  readonly other: (transition: BigramTransition) => CodePoint;
  readonly onSelect: (codePoint: CodePoint) => void;
  readonly formatNumber: (value: number) => string;
}): ReactNode {
  return (
    <section className={styles.detailsColumn}>
      <h4 className={styles.detailsColumnTitle}>{title}</h4>
      {transitions.length > 0 ? (
        <ul className={styles.detailsList}>
          {transitions.map((transition) => (
            <li
              key={`${transition.prevKeyId}\u0000${transition.currentKeyId}`}
              className={styles.detailsItem}
            >
              <button
                type="button"
                className={styles.detailsChar}
                onClick={() => {
                  onSelect(other(transition));
                }}
              >
                {formatChar(other(transition))}
              </button>
              <span className={styles.detailsBarWrap}>
                <span
                  className={styles.detailsBar}
                  style={{
                    width: `${barWidth(transition.timeToType, min, max)}%`,
                    backgroundColor: transitionColor(transition.timeToType),
                  }}
                />
              </span>
              <span className={styles.detailsTime}>
                {transition.timeToType > 0
                  ? formatNumber(transition.timeToType)
                  : "\u2013"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.detailsEmpty}>
          <FormattedMessage
            id="profile.transitions.details.empty"
            defaultMessage="No data."
          />
        </p>
      )}
    </section>
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

export function formatChar(codePoint: number): string {
  const char = String.fromCodePoint(codePoint);
  return /[\p{Cc}]/u.test(char)
    ? `U+${codePoint.toString(16).toUpperCase()}`
    : char;
}
