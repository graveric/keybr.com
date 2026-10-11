import { usePageData } from "@keybr/pages-shared";
import {
  Button,
  Field,
  FieldList,
  Icon,
  OptionList,
  TextField,
  toast,
} from "@keybr/widget";
import {
  mdiCheck,
  mdiClose,
  mdiDelete,
  mdiPencil,
  mdiPlus,
  mdiStar,
} from "@mdi/js";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { SpaceService } from "./service.ts";

type Mode = null | "create" | "rename";

export function SpacesSection() {
  const { formatMessage } = useIntl();
  const { spaces, activeSpaceId } = usePageData();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");

  if (activeSpaceId == null || spaces == null || spaces.length === 0) {
    return null;
  }

  const activeSpace = spaces.find(({ id }) => id === activeSpaceId) ?? null;
  if (activeSpace == null) {
    return null;
  }

  const handleAction = (action: () => Promise<unknown>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    action().then(
      () => {
        window.location.reload();
      },
      (error: any) => {
        setBusy(false);
        toast(
          <div>
            {String(error?.message ?? error)}{" "}
            <a href={window.location.href}>
              <FormattedMessage id="t_Reload" defaultMessage="Reload" />
            </a>
          </div>,
        );
      },
    );
  };

  const trimmedName = name.trim();

  if (mode != null) {
    return (
      <FieldList>
        <Field>
          {mode === "create" ? (
            <FormattedMessage id="t_New_space" defaultMessage="New space" />
          ) : (
            <FormattedMessage
              id="t_Rename_space"
              defaultMessage="Rename space"
            />
          )}
        </Field>
        <Field>
          <TextField
            maxLength={50}
            value={name}
            onChange={(value) => {
              setName(value);
            }}
          />
        </Field>
        <Field>
          <Button
            disabled={busy || trimmedName.length === 0}
            icon={<Icon shape={mdiCheck} />}
            label={formatMessage({ id: "t_Save", defaultMessage: "Save" })}
            onClick={() => {
              handleAction(() =>
                mode === "create"
                  ? SpaceService.create(trimmedName)
                  : SpaceService.rename(activeSpace.id, trimmedName),
              );
            }}
          />
        </Field>
        <Field>
          <Button
            disabled={busy}
            icon={<Icon shape={mdiClose} />}
            label={formatMessage({ id: "t_Cancel", defaultMessage: "Cancel" })}
            onClick={() => {
              setMode(null);
              setName("");
            }}
          />
        </Field>
      </FieldList>
    );
  }

  return (
    <FieldList>
      <Field>
        <FormattedMessage
          id="t_Profile_space:"
          defaultMessage="Profile space:"
        />
      </Field>
      <Field>
        <OptionList
          disabled={busy}
          options={spaces.map((space) => ({
            value: String(space.id),
            name: space.isDefault
              ? formatMessage(
                  {
                    id: "t_Space_name_default",
                    defaultMessage: "{name} (default)",
                  },
                  { name: space.name },
                )
              : space.name,
          }))}
          value={String(activeSpace.id)}
          onSelect={(value) => {
            if (Number(value) !== activeSpace.id) {
              handleAction(() => SpaceService.activate(Number(value)));
            }
          }}
        />
      </Field>
      <Field>
        <Button
          disabled={busy}
          icon={<Icon shape={mdiPlus} />}
          label={formatMessage({ id: "t_New", defaultMessage: "New" })}
          title={formatMessage({
            id: "profile.spaces.new.description",
            defaultMessage:
              "Create a new profile space with independent settings and statistics. " +
              "The settings of the default space are used as a starting point.",
          })}
          onClick={() => {
            setMode("create");
            setName("");
          }}
        />
      </Field>
      <Field>
        <Button
          disabled={busy}
          icon={<Icon shape={mdiPencil} />}
          label={formatMessage({ id: "t_Rename", defaultMessage: "Rename" })}
          onClick={() => {
            setMode("rename");
            setName(activeSpace.name);
          }}
        />
      </Field>
      <Field>
        <Button
          disabled={busy || activeSpace.isDefault}
          icon={<Icon shape={mdiStar} />}
          label={formatMessage({
            id: "t_Make_default",
            defaultMessage: "Make default",
          })}
          title={formatMessage({
            id: "profile.spaces.makeDefault.description",
            defaultMessage:
              "The default space is the one visible to the outside world: " +
              "its statistics are shown on the public profile and the high scores table.",
          })}
          onClick={() => {
            handleAction(() => SpaceService.makeDefault(activeSpace.id));
          }}
        />
      </Field>
      <Field.Filler />
      <Field>
        <Button
          disabled={busy || activeSpace.isDefault}
          icon={<Icon shape={mdiDelete} />}
          label={formatMessage({ id: "t_Delete", defaultMessage: "Delete" })}
          title={formatMessage({
            id: "profile.spaces.delete.description",
            defaultMessage:
              "Permanently delete the current profile space together with " +
              "all its settings and statistics.",
          })}
          onClick={() => {
            const message = formatMessage(
              {
                id: "profile.spaces.delete.message",
                defaultMessage:
                  "Are you sure you want to delete the profile space {name}? " +
                  "All settings and statistics in this space will be permanently deleted. " +
                  "This operation is permanent and cannot be undone!",
              },
              { name: JSON.stringify(activeSpace.name) },
            );
            if (window.confirm(message)) {
              handleAction(() => SpaceService.remove(activeSpace.id));
            }
          }}
        />
      </Field>
    </FieldList>
  );
}
