export type ProductAction =
  | "create"
  | "save"
  | "publish"
  | "unpublish"
  | "discard"
  | "delete";

export type ProductActionRequest<TDocument> = {
  path: string;
  init: {
    method: "POST" | "PATCH" | "DELETE";
    body?: string;
  };
};

export function buildProductActionRequest<TDocument>({
  action,
  id,
  document,
  collectionIds,
}: {
  action: ProductAction;
  id?: string;
  document: TDocument;
  collectionIds: string[];
}): ProductActionRequest<TDocument> | null {
  if (action === "create") {
    return {
      path: "/api/admin/products",
      init: {
        method: "POST",
        body: JSON.stringify({
          doc: document,
          collectionIds: [...collectionIds],
        }),
      },
    };
  }

  if (!id) return null;

  if (action === "delete") {
    return {
      path: `/api/admin/products/${id}`,
      init: { method: "DELETE" },
    };
  }

  return {
    path: `/api/admin/products/${id}`,
    init: {
      method: "PATCH",
      body: JSON.stringify({
        action,
        doc: document,
        collectionIds: [...collectionIds],
      }),
    },
  };
}
