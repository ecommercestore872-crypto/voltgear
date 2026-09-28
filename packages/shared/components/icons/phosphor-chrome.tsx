import type { IconProps } from "@phosphor-icons/react";

/** Header / chrome: regular weight, ~16px */
export const PHOSPHOR_HEADER: Pick<IconProps, "size" | "weight"> = {
  size: 16,
  weight: "regular",
};

/** Search magnifier inside pill (slightly smaller) */
export const PHOSPHOR_SEARCH: Pick<IconProps, "size" | "weight"> = {
  size: 14,
  weight: "regular",
};

/** Trust strip cells: duotone for depth without emoji */
export const PHOSPHOR_TRUST: Pick<IconProps, "size" | "weight"> = {
  size: 14,
  weight: "duotone",
};
