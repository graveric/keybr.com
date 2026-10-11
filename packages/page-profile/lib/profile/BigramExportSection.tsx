import {
  buildBigramTransitions,
  transitionsToCsv,
  transitionsToJson,
} from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import {
  Button,
  Explainer,
  Field,
  FieldList,
  Figure,
  Icon,
  OptionList,
} from "@keybr/widget";
import { mdiDownload } from "@mdi/js";
import { type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

const formatOptions = [
  { value: "csv", name: "CSV" },
  { value: "json", name: "JSON" },
];

export function BigramExportSection({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}): ReactNode {
  const { formatMessage } = useIntl();
  const keyboard = useKeyboard();
  const [format, setFormat] = useState("csv");

  const handleDownload = () => {
    const transitions = buildBigramTransitions(keyStatsMap, keyboard, {
      pairType: "all",
      minPresses: 1,
    });
    const base = `transitions-${keyboard.layout.id}-${keyboard.geometry.id}`;
    switch (format) {
      case "csv":
        triggerDownload(
          toDataUrl("text/csv;charset=utf-8", transitionsToCsv(transitions)),
          `${base}.csv`,
        );
        break;
      case "json":
        triggerDownload(
          toDataUrl(
            "application/json",
            transitionsToJson(transitions, keyboard),
          ),
          `${base}.json`,
        );
        break;
    }
  };

  return (
    <Figure>
      <Figure.Caption>
        <FormattedMessage
          id="profile.transitions.export.caption"
          defaultMessage="Export Transition Statistics"
        />
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage
            id="profile.transitions.export.description"
            defaultMessage="Download the collected transition statistics, including the pair type and the positions of both keys, for external analysis."
          />
        </Figure.Description>
      </Explainer>

      <FieldList>
        <Field>
          <OptionList
            options={formatOptions}
            value={format}
            onSelect={setFormat}
          />
        </Field>
        <Field>
          <Button
            size={16}
            icon={<Icon shape={mdiDownload} />}
            label={formatMessage({
              id: "t_Download",
              defaultMessage: "Download",
            })}
            title={formatMessage({
              id: "profile.transitions.export.download",
              defaultMessage: "Download the transition statistics.",
            })}
            onClick={handleDownload}
          />
        </Field>
      </FieldList>
    </Figure>
  );
}

function toDataUrl(mime: string, data: string): string {
  return `data:${mime},${encodeURIComponent(data)}`;
}

function triggerDownload(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
  }, 0);
}
