import type { IdCloudHostClient } from "../client";

export interface ApiToken {
    billing_account_id: number;
    consumer_id: string;
    created_at: string;
    description: string;
    id: number;
    kong_id: string;
    restricted: boolean;
    token: string;
    updated_at: string | null;
    user_id: number;
}

export interface CreateTokenParams {
    description?: string;
    restricted?: boolean;
    billingAccountId?: number;
}

export interface UpdateTokenParams {
    tokenId: number;
    description?: string;
    restricted?: boolean;
    billingAccountId?: number;
}

export interface DeleteTokenParams {
    tokenId: number;
}

/**
 * API token management.
 */
export class TokenResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists the user's API tokens. */
    list(): Promise<ApiToken[]> {
        return this.client.request<ApiToken[]>("GET", "user-resource/token/list");
    }

    /** Creates a new API token and registers it at the API gateway. */
    create(params: CreateTokenParams = {}): Promise<ApiToken[]> {
        return this.client.request<ApiToken[]>("POST", "user-resource/token", {
            form: {
                description: params.description,
                restricted: params.restricted,
                billing_account_id: params.billingAccountId,
            },
        });
    }

    /** Updates an existing API token's options. */
    update(params: UpdateTokenParams): Promise<ApiToken[]> {
        return this.client.request<ApiToken[]>("PATCH", "user-resource/token", {
            form: {
                token_id: params.tokenId,
                description: params.description,
                restricted: params.restricted,
                billing_account_id: params.billingAccountId,
            },
        });
    }

    /** Deletes an API token. */
    delete(params: DeleteTokenParams): Promise<undefined> {
        return this.client.request<undefined>("DELETE", "user-resource/token", {
            form: { token_id: params.tokenId },
        });
    }
}
