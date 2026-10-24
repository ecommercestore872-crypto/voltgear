/** An unsuccessful response does not always establish that a write rolled back. */
export class AdminRequestError extends Error {
  constructor(message: string, public status?: number, public outcomeUncertain = false) { super(message); }
}
