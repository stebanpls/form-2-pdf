/**
 * Represents the result of an asynchronous operation, like saving data or generating a PDF.
 */
export interface ActionResult {
  success: boolean;
  error?: unknown;
}
