import { useCollator } from "@keybr/intl";
import {
  KeyboardOptions,
  keyboardProps,
  Layout,
  useFormattedNames,
} from "@keybr/keyboard";
import { ResultGroups, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Field, FieldList, OptionList } from "@keybr/widget";
import { memo, type ReactNode, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

/**
 * A quick keyboard layout switcher for the practice screen. It offers the
 * layouts that the user has already practiced on, plus the currently
 * configured layout, so the user can switch the training without opening
 * the settings screen.
 */
export const LayoutSwitcher = memo(function LayoutSwitcher(): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const { results } = useResults();
  const { formatFullLayoutName } = useFormattedNames();
  const { compare } = useCollator();

  const options = KeyboardOptions.from(settings);
  const currentLayout = settings.get(keyboardProps.layout);

  const layouts = useMemo(() => {
    const map = new Map<string, Layout>();
    for (const layout of ResultGroups.byLayout(results).keys()) {
      map.set(layout.id, layout);
    }
    map.set(currentLayout.id, currentLayout);
    return [...map.values()];
  }, [results, currentLayout]);

  const layoutOptions = layouts
    .map((layout) => ({
      value: layout.id,
      name: formatFullLayoutName(layout),
    }))
    .sort((a, b) => compare(a.name, b.name));

  if (layoutOptions.length < 2) {
    return null;
  }

  return (
    <FieldList>
      <Field>
        <FormattedMessage id="t_Layout:" defaultMessage="Layout:" />
      </Field>
      <Field>
        <OptionList
          title={formatMessage({
            id: "t_Layout",
            defaultMessage: "Layout",
          })}
          options={layoutOptions}
          value={currentLayout.id}
          onSelect={(id) => {
            const layout = Layout.ALL.get(id);
            updateSettings(
              options
                .withLanguage(layout.language)
                .withLayout(layout)
                .withGeometry(options.geometry)
                .withZones(options.zones)
                .save(settings),
            );
          }}
        />
      </Field>
    </FieldList>
  );
});
