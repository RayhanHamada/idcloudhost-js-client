import type { IdCloudHostClient } from "../client";
import type { VirtualMachine } from "./vm";

export interface ListBillingResourcesParams {
    /** Billing account ID. */
    id: number;
    /** Resource type, defaults to `vm`. */
    resourceType?: string;
}

export interface SetResourceBillingParams {
    billingAccountId: number;
    uuid: string;
    /** Resource type, defaults to `vm`. */
    resourceType?: string;
}

/**
 * Billing account resource associations. All endpoints are location-specific.
 */
export class BillingResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists all resources actively associated with a billing account. */
    listResources(params: ListBillingResourcesParams): Promise<VirtualMachine[]> {
        return this.client.request<VirtualMachine[]>("GET", "user-resource/billing_resources", {
            query: { id: params.id, resource_type: params.resourceType },
        });
    }

    /** Associates a resource with a billing account. */
    setResourceBilling(params: SetResourceBillingParams): Promise<unknown> {
        return this.client.request<unknown>("POST", "user-resource/resource_billing", {
            form: {
                billing_account_id: params.billingAccountId,
                resource_type: params.resourceType,
                uuid: params.uuid,
            },
        });
    }
}
