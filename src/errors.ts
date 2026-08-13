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

export function extractErrors(body: unknown): Record<string, unknown> | undefined {
    if (typeof body === "object" && body !== null && "errors" in body) {
        const { errors } = body as { errors: unknown };
        if (typeof errors === "object" && errors !== null && !Array.isArray(errors)) {
            return errors as Record<string, unknown>;
        }
    }
    return undefined;
}

export function createErrorMessage(status: number, errors?: Record<string, unknown>): string {
    if (errors !== undefined) {
        const [first] = Object.values(errors);
        if (typeof first === "string") {
            return first;
        }
        if (typeof first === "object" && first !== null) {
            const { msg } = first as { msg?: unknown };
            if (typeof msg === "string") {
                return msg;
            }
        }
    }
    return `Request failed with status ${status}`;
}
