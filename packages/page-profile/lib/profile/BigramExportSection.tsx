import {
  buildBigramTransitions,
  transitionsToCsv,
  transitionsToJson,
  transitionsToSvg,
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
import { type ReactNode, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./BigramExportSection.module.less";

const formatOptions = [
  { value: "csv", name: "CSV" },
  { value: "json", name: "JSON" },
  { value: "svg", name: "SVG" },
  { value: "png", name: "PNG" },
];

export function BigramExportSection({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}): ReactNode {
  const { formatMessage } = useIntl();
  const keyboard = useKeyboard();
  const [format, setFormat] = useState("csv");

  const transitions = useMemo(
    () =>
      buildBigramTransitions(keyStatsMap, keyboard, {
        pairType: "all",
        minPresses: 1,
      }),
    [keyStatsMap, keyboard],
  );

  const svg = useMemo(
    () => transitionsToSvg(transitions, keyboard),
    [transitions, keyboard],
  );
  const svgUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    [svg],
  );

  const handleDownload = () => {
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
      case "svg":
        triggerDownload(
          toDataUrl("image/svg+xml;charset=utf-8", svg),
          `${base}.svg`,
        );
        break;
      case "png":
        downloadPng(svg, `${base}.png`);
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
            defaultMessage="Download the collected transition statistics, including the pair type and the positions of both keys, for external analysis, or export the transition keyboard as an image."
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

      <img
        className={styles.preview}
        src={svgUrl}
        alt={formatMessage({
          id: "profile.transitions.export.preview",
          defaultMessage: "Transition keyboard preview.",
        })}
      />

      <Figure.Legend>
        <FormattedMessage
          id="profile.transitions.export.legend"
          defaultMessage="Arrows show the slowest transitions; green is fast, red is slow."
        />
      </Figure.Legend>
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

function downloadPng(svg: string, name: string) {
  const match = /width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  const width = match != null ? Number(match[1]) : 0;
  const height = match != null ? Number(match[2]) : 0;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || width;
    canvas.height = image.naturalHeight || height;
    const context = canvas.getContext("2d");
    if (context == null) {
      return;
    }
    context.drawImage(image, 0, 0);
    triggerDownload(canvas.toDataURL("image/png"), name);
  };
  image.src = toDataUrl("image/svg+xml;charset=utf-8", svg);
}
