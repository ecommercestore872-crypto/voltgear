import { getOrderByPublicId } from "@/lib/db/store";
import { createPostExOrder } from "@/lib/postex";
import { runPostExBookOrder } from "@/lib/postex-book-order";
import {
  claimPostExBookingRow,
  completePostExBookingRow,
  markPostExBookingUnknownRow,
  releasePostExBookingClaimRow,
} from "@/lib/postex-book-order-db";
import { fetchPostExOperationalCityNames } from "@/lib/postex-connectivity";
import {
  buildPostExOrderPayloadFromOrder,
  formatPostExOrderPayloadBuildError,
} from "@/lib/postex-order-payload";
import { getServiceClient } from "@/lib/supabase/server";

/** Books one order with PostEx using the real claim/complete flow. Shared by the admin button and the WhatsApp auto-confirm. */
export function bookOrderOnPostEx(orderId: string) {
  const client = getServiceClient();
  return runPostExBookOrder(orderId, {
    getOrder: getOrderByPublicId,
    buildPostExPayload: async (order) => {
      const operationalCities = await fetchPostExOperationalCityNames();
      if (!operationalCities.ok) {
        return {
          ok: false,
          status: operationalCities.httpStatus ?? 502,
          error: operationalCities.error,
        };
      }

      const built = buildPostExOrderPayloadFromOrder(order, operationalCities.cities);
      if (!built.ok) {
        return {
          ok: false,
          status: 400,
          error: formatPostExOrderPayloadBuildError(built.missingOrInvalid),
        };
      }

      return { ok: true, payload: built.payload };
    },
    claimOrder: (id, claimedAt) => claimPostExBookingRow(client, id, claimedAt),
    releaseClaim: (id, attemptId) => releasePostExBookingClaimRow(client, id, attemptId),
    markUnknown: (id, attemptId) => markPostExBookingUnknownRow(client, id, attemptId),
    completeBooking: (id, trackingNumber, attemptId, completedAt) =>
      completePostExBookingRow(client, id, trackingNumber, attemptId, completedAt),
    createPostExOrder: async (payload) => {
      const created = await createPostExOrder(payload);
      if (!created.ok) return created;
      return { ok: true as const, trackingNumber: created.trackingNumber };
    },
  });
}
