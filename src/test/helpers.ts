import { afterEach, vi } from "vitest";

import { IdCloudHostClient } from "../client";

export interface RecordedRequest {
    method: string;
    path: string;
    query: URLSearchParams;
    body: string | undefined;
    headers: Record<string, string>;
}

export type MockHandler = (request: RecordedRequest) => { status?: number; body?: unknown };

export interface CreateClientOptions {
    location?: string;
    baseUrl?: string;
    headers?: Record<string, string>;
}

/**
 * Creates an IdCloudHostClient while stubbing `globalThis.fetch` with a mock
 * that records requests and responds with whatever the handler returns
 * (JSON-encoded). The stub is removed after each test.
 */
export function createClient(
    handler: MockHandler,
    options: CreateClientOptions = {}
): { client: IdCloudHostClient; requests: RecordedRequest[] } {
    const requests: RecordedRequest[] = [];
    vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = new URL(String(input));
        const request: RecordedRequest = {
            method: (init?.method ?? "GET").toUpperCase(),
            path: url.pathname,
            query: url.searchParams,
            body: typeof init?.body === "string" ? init.body : undefined,
            headers: (init?.headers ?? {}) as Record<string, string>,
        };
        requests.push(request);
        const mock = handler(request);
        const status = mock.status ?? 200;
        const body = mock.body === undefined ? null : JSON.stringify(mock.body);
        return new Response(body, { status, headers: { "content-type": "application/json" } });
    });
    const client = new IdCloudHostClient({
        apiKey: "test-key",
        baseUrl: options.baseUrl ?? "https://api.test",
        location: options.location,
        headers: options.headers,
    });
    return { client, requests };
}

afterEach(() => {
    vi.unstubAllGlobals();
});
