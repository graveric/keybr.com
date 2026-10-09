import {
  type Keyboard,
  type KeyCombo,
  type KeyId,
  KeyModifier,
  type ZoneId,
} from "@keybr/keyboard";
import { type Result } from "@keybr/result";

export type KeyEffortOptions = {
  /** Weight of the normalized average time-to-type. */
  readonly timeWeight: number;
  /** Weight of the normalized miss rate. */
  readonly missWeight: number;
  /** Cells with fewer presses are marked as low confidence. */
  readonly minPresses: number;
  /** Whether to normalize within each layer or across all layers. */
  readonly normalizeScope: "layer" | "global";
  /** Inclusive lower bound of the result time stamp, or null. */
  readonly from: number | null;
  /** Inclusive upper bound of the result time stamp, or null. */
  readonly to: number | null;
  /** The matrix creation time stamp, or null to use the current time. */
  readonly generatedAt: number | null;
};

export const defaultKeyEffortOptions: KeyEffortOptions = {
  timeWeight: 0.7,
  missWeight: 0.3,
  minPresses: 10,
  normalizeScope: "layer",
  from: null,
  to: null,
  generatedAt: null,
};

export type KeyEffortCell = {
  readonly keyId: KeyId;
  readonly layerId: string;
  readonly modifierId: string;
  readonly dead: boolean;
  readonly prefixId: KeyId | null;
  readonly prefixModifierId: string | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly hand: ZoneId | null;
  readonly finger: ZoneId | null;
  readonly row: ZoneId | null;
  readonly codePoints: readonly number[];
  readonly symbols: string;
  readonly hits: number;
  readonly misses: number;
  readonly missRate: number | null;
  readonly avgTime: number | null;
  readonly timeNorm: number | null;
  readonly missNorm: number | null;
  readonly effort: number | null;
  readonly lowConfidence: boolean;
};

export type KeyEffortLayer = {
  readonly id: string;
  readonly modifierId: string;
  readonly dead: boolean;
  readonly cells: readonly KeyEffortCell[];
  readonly timeRange: readonly [number, number] | null;
  readonly missRateRange: readonly [number, number] | null;
};

export type KeyEffortMatrix = {
  readonly layoutId: string;
  readonly geometryId: string;
  readonly generatedAt: number;
  readonly options: KeyEffortOptions;
  readonly layers: readonly KeyEffortLayer[];
};

const layerOrder = ["none", "shift", "alt", "shift-alt", "dead"] as const;

export function buildKeyEffortMatrix(
  results: readonly Result[],
  keyboard: Keyboard,
  options: Partial<KeyEffortOptions> = {},
): KeyEffortMatrix {
  const opts: KeyEffortOptions = { ...defaultKeyEffortOptions, ...options };
  const aggregates = new Map<string, Aggregate>();
  for (const result of results) {
    if (!result.validate()) {
      continue;
    }
    if (result.layout.id !== keyboard.layout.id) {
      continue;
    }
    if (opts.from != null && result.timeStamp < opts.from) {
      continue;
    }
    if (opts.to != null && result.timeStamp > opts.to) {
      continue;
    }
    for (const sample of result.histogram) {
      const combo = keyboard.getCombo(sample.codePoint);
      if (combo == null || !isPrintable(sample.codePoint)) {
        continue;
      }
      const shape = keyboard.getShape(combo.id);
      if (shape == null) {
        continue;
      }
      const layerId = layerOf(combo);
      const aggregateKey = `${layerId}\u0000${combo.id}`;
      let aggregate = aggregates.get(aggregateKey);
      if (aggregate == null) {
        aggregates.set(
          aggregateKey,
          (aggregate = {
            keyId: combo.id,
            layerId,
            modifierId: modifierIdOf(combo.modifier),
            dead: combo.prefix != null,
            prefixId: combo.prefix?.id ?? null,
            prefixModifierId:
              combo.prefix != null
                ? modifierIdOf(combo.prefix.modifier)
                : null,
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: shape.h,
            hand: shape.hand,
            finger: shape.finger,
            row: shape.row,
            hits: 0,
            misses: 0,
            successes: 0,
            timeSum: 0,
            codePoints: new Set(),
          }),
        );
      }
      aggregate.hits += sample.hitCount;
      aggregate.misses += sample.missCount;
      const successes = Math.max(0, sample.hitCount - sample.missCount);
      aggregate.successes += successes;
      if (sample.timeToType > 0) {
        aggregate.timeSum += sample.timeToType * successes;
      }
      aggregate.codePoints.add(sample.codePoint);
    }
  }

  const rawCells: KeyEffortCell[] = [...aggregates.values()].map(
    (aggregate): KeyEffortCell => {
      const missRate =
        aggregate.hits > 0 ? aggregate.misses / aggregate.hits : null;
      const avgTime =
        aggregate.successes > 0 && aggregate.timeSum > 0
          ? aggregate.timeSum / aggregate.successes
          : null;
      const codePoints = [...aggregate.codePoints].sort((a, b) => a - b);
      return {
        keyId: aggregate.keyId,
        layerId: aggregate.layerId,
        modifierId: aggregate.modifierId,
        dead: aggregate.dead,
        prefixId: aggregate.prefixId,
        prefixModifierId: aggregate.prefixModifierId,
        x: aggregate.x,
        y: aggregate.y,
        w: aggregate.w,
        h: aggregate.h,
        hand: aggregate.hand,
        finger: aggregate.finger,
        row: aggregate.row,
        codePoints,
        symbols: codePoints
          .map((codePoint) => String.fromCodePoint(codePoint))
          .join(""),
        hits: aggregate.hits,
        misses: aggregate.misses,
        missRate,
        avgTime,
        timeNorm: null,
        missNorm: null,
        effort: null,
        lowConfidence: aggregate.hits < opts.minPresses,
      };
    },
  );

  const scopeKey = (cell: KeyEffortCell): string =>
    opts.normalizeScope === "global" ? "" : cell.layerId;
  const timeRanges = new Map<string, readonly [number, number] | null>();
  const missRanges = new Map<string, readonly [number, number] | null>();
  for (const key of new Set(rawCells.map(scopeKey))) {
    const group = rawCells.filter((cell) => scopeKey(cell) === key);
    timeRanges.set(key, timeRange(group));
    missRanges.set(key, missRateRange(group));
  }

  const cells: KeyEffortCell[] = rawCells.map((cell): KeyEffortCell => {
    const key = scopeKey(cell);
    const timeNorm = toNorm(cell.avgTime, timeRanges.get(key) ?? null);
    const missNorm = toNorm(cell.missRate, missRanges.get(key) ?? null);
    return {
      ...cell,
      timeNorm,
      missNorm,
      effort: combine(timeNorm, missNorm, opts),
    };
  });

  const layers: KeyEffortLayer[] = [];
  for (const layerId of layerOrder) {
    const layerCells = cells.filter((cell) => cell.layerId === layerId);
    if (layerCells.length === 0) {
      continue;
    }
    layerCells.sort(
      (a, b) => a.y - b.y || a.x - b.x || (a.keyId < b.keyId ? -1 : 1),
    );
    layers.push({
      id: layerId,
      modifierId: layerCells[0].modifierId,
      dead: layerCells[0].dead,
      cells: layerCells,
      timeRange: timeRange(layerCells),
      missRateRange: missRateRange(layerCells),
    });
  }

  return {
    layoutId: keyboard.layout.id,
    geometryId: keyboard.geometry.id,
    generatedAt: opts.generatedAt ?? Date.now(),
    options: opts,
    layers,
  };
}

type Aggregate = {
  keyId: KeyId;
  layerId: string;
  modifierId: string;
  dead: boolean;
  prefixId: KeyId | null;
  prefixModifierId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  hand: ZoneId | null;
  finger: ZoneId | null;
  row: ZoneId | null;
  hits: number;
  misses: number;
  successes: number;
  timeSum: number;
  codePoints: Set<number>;
};

function combine(
  timeNorm: number | null,
  missNorm: number | null,
  { timeWeight, missWeight }: KeyEffortOptions,
): number | null {
  if (timeNorm == null && missNorm == null) {
    return null;
  }
  const weightSum =
    (timeNorm != null ? timeWeight : 0) + (missNorm != null ? missWeight : 0);
  if (weightSum <= 0) {
    return null;
  }
  return (
    (timeWeight * (timeNorm ?? 0) + missWeight * (missNorm ?? 0)) / weightSum
  );
}

function toNorm(
  value: number | null,
  range: readonly [number, number] | null,
): number | null {
  if (value == null || range == null) {
    return null;
  }
  const [min, max] = range;
  if (max <= min) {
    return 0;
  }
  return clamp01((value - min) / (max - min));
}

function timeRange(
  cells: readonly KeyEffortCell[],
): readonly [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const cell of cells) {
    if (!cell.lowConfidence && cell.avgTime != null) {
      min = Math.min(min, cell.avgTime);
      max = Math.max(max, cell.avgTime);
    }
  }
  return min <= max ? [min, max] : null;
}

function missRateRange(
  cells: readonly KeyEffortCell[],
): readonly [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const cell of cells) {
    if (!cell.lowConfidence && cell.missRate != null) {
      min = Math.min(min, cell.missRate);
      max = Math.max(max, cell.missRate);
    }
  }
  return min <= max ? [min, max] : null;
}

function layerOf(combo: KeyCombo): string {
  if (combo.prefix != null) {
    return "dead";
  }
  return modifierIdOf(combo.modifier);
}

function modifierIdOf(modifier: KeyModifier): string {
  if (modifier === KeyModifier.None) {
    return "none";
  }
  if (modifier === KeyModifier.Shift) {
    return "shift";
  }
  if (modifier === KeyModifier.Alt) {
    return "alt";
  }
  return "shift-alt";
}

function isPrintable(codePoint: number): boolean {
  if (codePoint < 0x0021) {
    return false;
  }
  if (codePoint === 0x007f) {
    return false;
  }
  if (codePoint >= 0x0080 && codePoint <= 0x009f) {
    return false;
  }
  return true;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export type SvgOptions = {
  readonly unit: number;
  readonly padding: number;
  readonly titleHeight: number;
  readonly layerGap: number;
};

export const defaultSvgOptions: SvgOptions = {
  unit: 48,
  padding: 16,
  titleHeight: 28,
  layerGap: 16,
};

export function toSvg(
  matrix: KeyEffortMatrix,
  options: Partial<SvgOptions> = {},
): string {
  const { unit, padding, titleHeight, layerGap } = {
    ...defaultSvgOptions,
    ...options,
  };
  const layouts = matrix.layers.map((layer) => {
    let maxX = 0;
    let maxY = 0;
    for (const cell of layer.cells) {
      maxX = Math.max(maxX, cell.x + cell.w);
      maxY = Math.max(maxY, cell.y + cell.h);
    }
    return { layer, width: maxX * unit, height: maxY * unit };
  });
  const contentWidth = Math.max(0, ...layouts.map(({ width }) => width));
  const contentHeight = layouts.reduce(
    (acc, { height }) => acc + titleHeight + height + layerGap,
    0,
  );
  const width = contentWidth + padding * 2;
  const height = contentHeight + padding * 2;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fx(width)}" height="${fx(height)}" viewBox="0 0 ${fx(width)} ${fx(height)}">`,
  );
  parts.push(
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
  );
  let offsetY = padding;
  for (const { layer, height: layerHeight } of layouts) {
    parts.push(
      `<text x="${fx(padding)}" y="${fx(offsetY + titleHeight - 10)}" font-family="sans-serif" font-size="16" fill="#333333">${escapeXml(layerTitle(layer.id))}</text>`,
    );
    offsetY += titleHeight;
    for (const cell of layer.cells) {
      const x = padding + cell.x * unit + 2;
      const y = offsetY + cell.y * unit + 2;
      const w = cell.w * unit - 4;
      const h = cell.h * unit - 4;
      const fill = effortColor(cell.effort);
      const textColor =
        cell.effort != null && cell.effort > 0.5 ? "#ffffff" : "#000000";
      parts.push(`<g>`);
      parts.push(
        `<rect x="${fx(x)}" y="${fx(y)}" width="${fx(w)}" height="${fx(h)}" rx="6" fill="${fill}" stroke="#00000022"/>`,
      );
      if (cell.symbols !== "") {
        parts.push(
          `<text x="${fx(x + w / 2)}" y="${fx(y + h / 2)}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="${fx(Math.min(20, unit * 0.4))}" fill="${textColor}">${escapeXml(cell.symbols.slice(0, 3))}</text>`,
        );
      }
      parts.push(`</g>`);
    }
    offsetY += layerHeight + layerGap;
  }
  parts.push(`</svg>`);
  return parts.join("\n");
}

function effortColor(effort: number | null): string {
  if (effort == null) {
    return "#e6e6e6";
  }
  const hue = 120 * (1 - clamp01(effort));
  return `hsl(${Math.round(hue)} 70% 55%)`;
}

function layerTitle(id: string): string {
  switch (id) {
    case "none":
      return "Base";
    case "shift":
      return "Shift";
    case "alt":
      return "Alt";
    case "shift-alt":
      return "Shift+Alt";
    case "dead":
      return "Dead keys";
    default:
      return id;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fx(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function toJson(matrix: KeyEffortMatrix): string {
  return JSON.stringify(matrix, null, 2);
}

export function toCsv(matrix: KeyEffortMatrix): string {
  const header = [
    "layoutId",
    "layerId",
    "keyId",
    "modifierId",
    "dead",
    "prefixId",
    "prefixModifierId",
    "x",
    "y",
    "w",
    "h",
    "hand",
    "finger",
    "row",
    "symbols",
    "codePoints",
    "hits",
    "misses",
    "missRate",
    "avgTimeMs",
    "effort",
    "lowConfidence",
  ];
  const rows = [header.map(escapeCsv).join(",")];
  for (const layer of matrix.layers) {
    for (const cell of layer.cells) {
      rows.push(
        [
          matrix.layoutId,
          layer.id,
          cell.keyId,
          cell.modifierId,
          String(cell.dead),
          cell.prefixId ?? "",
          cell.prefixModifierId ?? "",
          String(cell.x),
          String(cell.y),
          String(cell.w),
          String(cell.h),
          cell.hand ?? "",
          cell.finger ?? "",
          cell.row ?? "",
          cell.symbols,
          cell.codePoints
            .map((codePoint) => codePoint.toString(16))
            .join(" "),
          String(cell.hits),
          String(cell.misses),
          round(cell.missRate, 4),
          round(cell.avgTime, 1),
          round(cell.effort, 4),
          String(cell.lowConfidence),
        ]
          .map(escapeCsv)
          .join(","),
      );
    }
  }
  return rows.join("\n");
}

function round(v: number | null, digits: number): string {
  if (v == null) {
    return "";
  }
  const factor = 10 ** digits;
  return String(Math.round(v * factor) / factor);
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
