import type { IdCloudHostClient } from "../client";

/**
 * Base class for resource namespaces. Holds the client that endpoint methods
 * dispatch their requests through.
 */
export class BaseResource {
    protected readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }
}
