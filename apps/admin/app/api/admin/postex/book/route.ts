import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  claimPostExBookingRow,
  completePostExBookingRow,
  markPostExBookingUnknownRow,
  releasePostExBookingClaimRow,
} from "@/lib/postex-book-order-db";
import { runPostExBookOrder } from "@/lib/postex-book-order";
import { getOrderByPublicId } from "@/lib/db/store";
import { fetchPostExOperationalCityNames } from "@/lib/postex-connectivity";
import {
  buildPostExOrderPayloadFromOrder,
  formatPostExOrderPayloadBuildError,
} from "@/lib/postex-order-payload";
import { getServiceClient } from "@/lib/supabase/server";
import { createPostExOrder } from "@/lib/postex";

async function POSTHandler(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();
    const client = getServiceClient();

    const result = await runPostExBookOrder(orderId, {
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

        const built = buildPostExOrderPayloadFromOrder(
          order,
          operationalCities.cities,
        );
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

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    console.error("[PostEx Book Route Error]: unexpected failure");
    return NextResponse.json({ error: "Could not process PostEx booking." }, { status: 500 });
  }
}

export const POST = withAdminApiObservability("POST /api/admin/postex/book", POSTHandler);
