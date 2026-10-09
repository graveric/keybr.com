import { buildKeyEffortMatrix, toCsv, toJson, toSvg } from "@keybr/chart";
import {
  Geometry,
  KeyboardOptions,
  keyboardProps,
  Layout,
  loadKeyboard,
  useFormattedNames,
} from "@keybr/keyboard";
import { ResultGroups, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import {
  Button,
  Explainer,
  Field,
  FieldList,
  Figure,
  Icon,
  OptionList,
  Range,
} from "@keybr/widget";
import { mdiDownload } from "@mdi/js";
import { type ReactNode, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

const formatOptions = [
  { value: "csv", name: "CSV" },
  { value: "json", name: "JSON" },
  { value: "svg", name: "SVG" },
  { value: "png", name: "PNG" },
];

export function KeyEffortExportSection(): ReactNode {
  const { formatMessage } = useIntl();
  const { formatFullLayoutName } = useFormattedNames();
  const { settings } = useSettings();
  const { results } = useResults();

  const groups = ResultGroups.byLayout(results);
  const resultsLayouts = new Set(groups.keys());
  const configuredLayout = settings.get(keyboardProps.layout);
  if (resultsLayouts.size === 0) {
    resultsLayouts.add(configuredLayout);
  }
  const defaultLayout = () =>
    resultsLayouts.has(configuredLayout)
      ? configuredLayout
      : [...resultsLayouts][0];

  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const [geometry, setGeometry] = useState<Geometry>(() =>
    selectGeometry(layout, settings.get(keyboardProps.geometry)),
  );
  const [format, setFormat] = useState("csv");
  const [timeWeight, setTimeWeight] = useState(0.7);
  const [missWeight, setMissWeight] = useState(0.3);
  const [minPresses, setMinPresses] = useState(10);

  if (!resultsLayouts.has(layout)) {
    setLayout(defaultLayout());
  }
  if (!layout.geometries.has(geometry)) {
    setGeometry(selectGeometry(layout, settings.get(keyboardProps.geometry)));
  }

  const keyboard = useMemo(() => {
    const options = KeyboardOptions.from(settings)
      .withLanguage(layout.language)
      .withLayout(layout)
      .withGeometry(geometry)
      .withZones(settings.get(keyboardProps.zones));
    return loadKeyboard(options);
  }, [settings, layout, geometry]);

  const matrix = useMemo(
    () =>
      buildKeyEffortMatrix(results, keyboard, {
        timeWeight,
        missWeight,
        minPresses,
      }),
    [results, keyboard, timeWeight, missWeight, minPresses],
  );

  const svg = useMemo(() => toSvg(matrix), [matrix]);
  const svgUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    [svg],
  );

  const layoutOptions = [...resultsLayouts]
    .map((item) => ({
      value: item.id,
      name: formatFullLayoutName(item),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const geometryOptions = [...layout.geometries].map((item) => ({
    value: item.id,
    name: item.name,
  }));

  const handleDownload = () => {
    const base = `key-effort-${matrix.layoutId}-${matrix.geometryId}`;
    switch (format) {
      case "csv":
        triggerDownload(
          toDataUrl("text/csv;charset=utf-8", toCsv(matrix)),
          `${base}.csv`,
        );
        break;
      case "json":
        triggerDownload(
          toDataUrl("application/json", toJson(matrix)),
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
          id="profile.keyEffort.caption"
          defaultMessage="Key Effort Matrix"
        />
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage
            id="profile.keyEffort.description"
            defaultMessage="Per-key effort as a combination of the average time-to-type and the miss rate. Normalization is done within each modifier layer."
          />
        </Figure.Description>
      </Explainer>

      <FieldList>
        <Field>
          <FormattedMessage
            id="t_Show_statistics_for:"
            defaultMessage="Show statistics for:"
          />
        </Field>
        <Field>
          <OptionList
            options={layoutOptions}
            value={layout.id}
            onSelect={(value) => {
              setLayout(Layout.ALL.get(value));
            }}
          />
        </Field>
        <Field>
          <OptionList
            options={geometryOptions}
            value={geometry.id}
            onSelect={(value) => {
              setGeometry(Geometry.ALL.get(value));
            }}
          />
        </Field>
      </FieldList>

      <FieldList>
        <Field>
          <FormattedMessage
            id="profile.keyEffort.timeWeight"
            defaultMessage="Time weight:"
          />
        </Field>
        <Field>
          <Range
            min={0}
            max={1}
            step={0.05}
            value={timeWeight}
            onChange={setTimeWeight}
          />
        </Field>
        <Field>
          <FormattedMessage
            id="profile.keyEffort.missWeight"
            defaultMessage="Miss weight:"
          />
        </Field>
        <Field>
          <Range
            min={0}
            max={1}
            step={0.05}
            value={missWeight}
            onChange={setMissWeight}
          />
        </Field>
        <Field>
          <FormattedMessage
            id="profile.keyEffort.minPresses"
            defaultMessage="Min presses:"
          />
        </Field>
        <Field>
          <Range
            min={1}
            max={100}
            step={1}
            value={minPresses}
            onChange={setMinPresses}
          />
        </Field>
      </FieldList>

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
              id: "profile.keyEffort.download",
              defaultMessage: "Download the key effort matrix.",
            })}
            onClick={handleDownload}
          />
        </Field>
      </FieldList>

      <img src={svgUrl} alt={matrix.layoutId} />

      <Figure.Legend>
        <FormattedMessage
          id="profile.keyEffort.legend"
          defaultMessage="Key color: green for low effort, red for high effort, gray for not enough data."
        />
      </Figure.Legend>
    </Figure>
  );
}

function selectGeometry(layout: Layout, geometry: Geometry): Geometry {
  return layout.geometries.has(geometry)
    ? geometry
    : Geometry.first(layout.geometries);
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
