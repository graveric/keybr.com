import {
  averageKeySpeed,
  type KeySample,
  lastKeySpeed,
  maxKeySpeed,
  Today,
} from "@keybr/result";
import { NameValue } from "@keybr/widget";
import { useIntl } from "react-intl";
import { useFormatter } from "./format.ts";
import * as styles from "./styles.module.less";

export const KeyRawDetails = ({
  samples,
}: {
  samples: readonly KeySample[];
}) => {
  const { formatMessage } = useIntl();
  const { formatSpeed } = useFormatter();
  const todaySpeed = averageKeySpeed(samples, new Today());
  const allTimeSpeed = averageKeySpeed(samples);
  const lastSpeed = lastKeySpeed(samples);
  const maxSpeed = maxKeySpeed(samples);
  return (
    <span className={styles.keyRawDetails}>
      <NameValue
        name={formatMessage({
          id: "t_Today",
          defaultMessage: "Today",
        })}
        value={todaySpeed > 0 ? formatSpeed(todaySpeed) : "N/A"}
      />
      <NameValue
        name={formatMessage({
          id: "t_All_time",
          defaultMessage: "All time",
        })}
        value={allTimeSpeed > 0 ? formatSpeed(allTimeSpeed) : "N/A"}
      />
      <NameValue
        name={formatMessage({
          id: "t_Last_raw_speed",
          defaultMessage: "Last raw",
        })}
        value={lastSpeed > 0 ? formatSpeed(lastSpeed) : "N/A"}
      />
      <NameValue
        name={formatMessage({
          id: "t_Max_raw_speed",
          defaultMessage: "Max raw",
        })}
        value={maxSpeed > 0 ? formatSpeed(maxSpeed) : "N/A"}
      />
    </span>
  );
};
