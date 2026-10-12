import {
  clearFreeScope,
  clearFreeSession,
  freeScope,
  type GuidedLesson,
  lessonProps,
} from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import {
  Button,
  CheckBox,
  Description,
  Explainer,
  Field,
  FieldList,
} from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export function FreeModeProp({
  lesson,
}: {
  readonly lesson: GuidedLesson;
}): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const freeMode = settings.get(lessonProps.guided.freeMode);
  return (
    <>
      <FieldList>
        <Field>
          <FormattedMessage
            id="t_Free_training_mode:"
            defaultMessage="Free training mode:"
          />
        </Field>
        <Field>
          <CheckBox
            label={formatMessage({
              id: "t_Let_me_choose_the_let",
              defaultMessage:
                "Let me choose the letters to train by clicking on them",
            })}
            checked={freeMode}
            onChange={(value) => {
              updateSettings(settings.set(lessonProps.guided.freeMode, value));
            }}
          />
        </Field>
        {freeMode && (
          <Field>
            <Button
              label={formatMessage({
                id: "t_Reset_manual_choices",
                defaultMessage: "Reset manual choices",
              })}
              onClick={() => {
                const scope = freeScope(lesson);
                clearFreeSession(scope);
                updateSettings(clearFreeScope(settings, scope));
              }}
            />
          </Field>
        )}
      </FieldList>
      <Explainer>
        <Description>
          <FormattedMessage
            id="settings.freeMode.description"
            defaultMessage="When this option is enabled, training works as usual, but you can click any open letter in the key set above the text to train it. Click a locked letter to add it ahead of time, click a manually added focused letter again to remove it. Right-click a letter to exclude it from training or to bring it back. A new letter is unlocked automatically only when the last open letter reaches the target speed."
          />
        </Description>
      </Explainer>
    </>
  );
}
