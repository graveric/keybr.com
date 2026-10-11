import { useIntlDurations } from "@keybr/intl";
import { type Layout } from "@keybr/keyboard";
import { getDailyGoal, setDailyGoal } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import {
  Description,
  Explainer,
  Field,
  FieldList,
  FieldSet,
  Range,
  Value,
} from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export function DailyGoalSettings({
  layout,
}: {
  readonly layout: Layout;
}): ReactNode {
  const { formatMessage } = useIntl();
  const { formatDuration } = useIntlDurations();
  const { settings, updateSettings } = useSettings();
  const dailyGoal = getDailyGoal(settings, layout);
  return (
    <FieldSet>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:" />
        </Field>
        <Field>
          <Range
            size={16}
            min={0}
            max={24}
            step={1}
            value={Math.round(dailyGoal / 5)}
            onChange={(value) => {
              updateSettings(setDailyGoal(settings, layout, value * 5));
            }}
          />
        </Field>
        <Field>
          {dailyGoal === 0 ? (
            formatMessage({
              id: "t_Not_set",
              defaultMessage: "Not set",
            })
          ) : (
            <Value value={formatDuration({ minutes: dailyGoal })} />
          )}
        </Field>
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage
            id="settings.dailyGoal.description"
            defaultMessage="Set the time you want to spend on the exercises daily. It is a simple reminder which does not limit you in any way. You can stop practicing whenever you want."
          />
        </Description>
      </Explainer>
    </FieldSet>
  );
}
