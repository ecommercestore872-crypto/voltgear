import type { PhosphorProps as IconProps } from "@/components/icons/phosphor-lite";

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
