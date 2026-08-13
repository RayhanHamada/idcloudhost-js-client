import { IdCloudHostError, createErrorMessage, extractErrors } from "./errors";
import { BillingResource } from "./resources/billing";
import { ChargingResource } from "./resources/charging";
import { ConfigResource } from "./resources/config";
import { NetworkResource } from "./resources/network";
import { PaymentResource } from "./resources/payment";
import { ServicesResource } from "./resources/services";
import { StorageResource } from "./resources/storage";
import { TokenResource } from "./resources/token";
import { UserResource } from "./resources/user";
import { VmResource } from "./resources/vm";

/** Value types accepted in form-encoded request bodies. */
export type FormValue = string | number | boolean | null | undefined;

/** Value types accepted in URL query strings. */
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
    /** Query string parameters appended to the request URL. */
    query?: Record<string, QueryValue>;
    /** Body sent as `application/x-www-form-urlencoded`. Array values are repeated. */
    form?: Record<string, FormValue | FormValue[]>;
    /** Body sent as `application/json`. */
    json?: unknown;
}

export interface IdCloudHostClientOptions {
    /** IDCloudHost API token. */
    apiKey: string;
    /** Base URL of the API. Defaults to `https://api.idcloudhost.com`. */
    baseUrl?: string;
    /**
     * Location slug that location-specific resources operate on (e.g. `jkt01`).
     * When omitted, the API default location is used.
     */
    location?: string;
    /** Custom fetch implementation. Useful for testing or proxying. */
    fetch?: typeof fetch;
}

export const DEFAULT_BASE_URL = "https://api.idcloudhost.com";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Client for the IDCloudHost API.
 *
 * Authenticates with an API token sent in the `apikey` header. Resources that are
 * bound to a data centre (VM, block storage, networks, firewalls, load balancers,
 * billing resources) are addressed through the location configured on the client;
 * use {@link IdCloudHostClient.withLocation} to target a specific location.
 *
 * ```ts
 * const client = new IdCloudHostClient({ apiKey: "meowmeowmeow" });
 * const vms = await client.vm.list();
 * const jkt = await client.withLocation("jkt01").vm.list();
 * ```
 */
export class IdCloudHostClient {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly location: string | undefined;

    readonly config: ConfigResource;
    readonly user: UserResource;
    readonly token: TokenResource;
    readonly vm: VmResource;
    readonly storage: StorageResource;
    readonly network: NetworkResource;
    readonly billing: BillingResource;
    readonly payment: PaymentResource;
    readonly charging: ChargingResource;
    readonly services: ServicesResource;

    private readonly fetchImpl: typeof fetch;

    constructor(options: IdCloudHostClientOptions) {
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
        this.location = options.location;
        this.fetchImpl = options.fetch ?? ((...args) => globalThis.fetch(...args));

        this.config = new ConfigResource(this);
        this.user = new UserResource(this);
        this.token = new TokenResource(this);
        this.vm = new VmResource(this);
        this.storage = new StorageResource(this);
        this.network = new NetworkResource(this);
        this.billing = new BillingResource(this);
        this.payment = new PaymentResource(this);
        this.charging = new ChargingResource(this);
        this.services = new ServicesResource(this);
    }

    /**
     * Returns a client bound to the given location. Location-specific resources on
     * the returned client are addressed via `https://.../v1/{location}/...`.
     */
    withLocation(location: string): IdCloudHostClient {
        return new IdCloudHostClient({
            apiKey: this.apiKey,
            baseUrl: this.baseUrl,
            location,
            fetch: this.fetchImpl,
        });
    }

    /**
     * Performs a raw API request. Resource methods are thin wrappers around this.
     *
     * @param method HTTP method
     * @param path Path relative to `/v1[/{location}]`, without a leading slash.
     */
    async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
        const url = this.buildUrl(path, options.query);
        const headers: Record<string, string> = { apikey: this.apiKey };
        let body: string | undefined;

        if (options.json !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.json);
        } else if (options.form !== undefined) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            body = encodeForm(options.form);
        }

        const response = await this.fetchImpl(url, { method, headers, body });
        return parseResponse<T>(response);
    }

    private buildUrl(path: string, query?: Record<string, QueryValue>): string {
        const locationSegment = this.location === undefined ? "" : `/${this.location}`;
        const url = new URL(`${this.baseUrl}/v1${locationSegment}/${path}`);
        if (query !== undefined) {
            for (const [key, value] of Object.entries(query)) {
                if (value === undefined || value === null) {
                    continue;
                }
                url.searchParams.append(key, String(value));
            }
        }
        return url.toString();
    }
}

function encodeForm(form: Record<string, FormValue | FormValue[]>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(form)) {
        if (value === undefined || value === null) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null) {
                    params.append(key, String(item));
                }
            }
        } else {
            params.append(key, String(value));
        }
    }
    return params.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const body: unknown = text === "" ? undefined : parseJson(text);

    if (!response.ok) {
        const errors = extractErrors(body);
        throw new IdCloudHostError(createErrorMessage(response.status, errors), {
            status: response.status,
            body,
            errors,
        });
    }
    return body as T;
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
