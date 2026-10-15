import { runCheckoutCommunications } from "@/lib/checkout-post-persist-communications";
import { runCheckoutTracking } from "@/lib/checkout-post-persist-tracking";
import type { CheckoutPostPersistInput } from "@/lib/checkout-post-persist-contract";

export type { CheckoutPostPersistInput } from "@/lib/checkout-post-persist-contract";

export async function runCheckoutPostPersist(
  input: CheckoutPostPersistInput,
): Promise<void> {
  await runCheckoutTracking(input);
  await runCheckoutCommunications(input);
}
