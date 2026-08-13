/**
 * Error thrown when the IDCloudHost API responds with a non-success status code.
 *
 * The API reports failures in the body as `{"errors": {...}}`. The errors object is
 * preserved and exposed through {@link IdCloudHostError.errors}.
 */
export class IdCloudHostError extends Error {
    /** HTTP status code of the failed response. */
    readonly status: number;
    /** Parsed response body, when available. */
    readonly body: unknown;
    /** The `errors` object from the response body, when present. */
    readonly errors?: Record<string, unknown>;

    constructor(
        message: string,
        options: { status: number; body?: unknown; errors?: Record<string, unknown> }
    ) {
        super(message);
        this.name = "IdCloudHostError";
        this.status = options.status;
        this.body = options.body;
        this.errors = options.errors;
    }
}
