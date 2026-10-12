import { type LessonKey, type LessonKeys } from "@keybr/lesson";
import { type ClassName } from "@keybr/widget";
import { type MouseEvent, useRef } from "react";
import { Key } from "./Key.tsx";

export type KeyExtra = {
  readonly selectable?: boolean;
  readonly added?: boolean;
  readonly manualExcluded?: boolean;
  readonly title?: string;
};

export const KeySet = ({
  id,
  className,
  lessonKeys,
  resolveKey,
  onKeyHoverIn,
  onKeyHoverOut,
  onKeyClick,
  onKeyContextMenu,
}: {
  id?: string;
  className?: ClassName;
  lessonKeys: LessonKeys;
  resolveKey?: (key: LessonKey) => KeyExtra;
  onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
  onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
  onKeyClick?: (key: LessonKey, elem: Element, event: MouseEvent) => void;
  onKeyContextMenu?: (key: LessonKey, elem: Element, event: MouseEvent) => void;
}) => {
  const ref = useRef<HTMLElement>(null);
  return (
    <span
      ref={ref}
      id={id}
      className={className}
      onMouseOver={(event) => {
        relayEvent(ref.current!, event, onKeyHoverIn);
      }}
      onMouseOut={(event) => {
        relayEvent(ref.current!, event, onKeyHoverOut);
      }}
      onClick={(event) => {
        relayEvent(ref.current!, event, onKeyClick);
      }}
      onContextMenu={(event) => {
        if (onKeyContextMenu != null) {
          event.preventDefault();
          relayEvent(ref.current!, event, onKeyContextMenu);
        }
      }}
    >
      {[...lessonKeys].map((lessonKey) => {
        const extra = resolveKey?.(lessonKey);
        return (
          <Key
            key={lessonKey.letter.codePoint}
            lessonKey={lessonKey}
            isSelectable={extra?.selectable}
            isAdded={extra?.added}
            isManualExcluded={extra?.manualExcluded}
            title={extra?.title}
          />
        );
      })}
    </span>
  );
};

function relayEvent(
  root: Element,
  event: { target: any } & MouseEvent,
  handler?: (key: LessonKey, elem: Element, event: MouseEvent) => void,
) {
  let { target } = event;
  while (
    handler != null &&
    target instanceof Element &&
    root.contains(target)
  ) {
    const key = Key.attached(target);
    if (key) {
      handler(key, target, event);
      return;
    }
    target = target.parentElement;
  }
}
