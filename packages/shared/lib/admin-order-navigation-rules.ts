/** Build the URL used by the server-filtered admin order list. */
export function ordersListHref(
  basePath: string,
  opts: { tab: string; page: number; q: string },
): string {
  const params = new URLSearchParams();
  if (opts.tab && opts.tab !== "all") params.set("tab", opts.tab);
  if (opts.page > 1) params.set("page", String(opts.page));
  const q = opts.q.trim();
  if (q.length >= 2) params.set("q", q);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

type OrderListNavigationState = {
  revision: number;
  pending: ReadonlyMap<string, number>;
};

export function createOrderListNavigationState(): OrderListNavigationState {
  return { revision: 0, pending: new Map() };
}

export function editOrderListNavigation(
  state: OrderListNavigationState,
): OrderListNavigationState {
  return { ...state, revision: state.revision + 1 };
}

export function recordOrderListNavigation(
  state: OrderListNavigationState,
  href: string,
): OrderListNavigationState {
  const revision = state.revision + 1;
  const pending = new Map(state.pending);
  pending.delete(href);
  pending.set(href, revision);
  // Superseded Next navigations may never commit. Keep only recent requests.
  if (pending.size > 32) pending.delete(pending.keys().next().value!);
  return { revision, pending };
}

export function acknowledgeOrderListNavigation(
  state: OrderListNavigationState,
  href: string,
): { state: OrderListNavigationState; preserveDraft: boolean } {
  const submittedRevision = state.pending.get(href);
  if (submittedRevision !== undefined && submittedRevision < state.revision) {
    const pending = new Map(state.pending);
    pending.delete(href);
    return { state: { ...state, pending }, preserveDraft: true };
  }
  // The newest request, or an external URL, becomes authoritative. Clearing old
  // requests also means a later Back visit to one is treated as external.
  return {
    state: { revision: state.revision + 1, pending: new Map() },
    preserveDraft: false,
  };
}
