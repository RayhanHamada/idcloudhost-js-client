import type { IdCloudHostClient } from "../client";

export interface UsageConfiguration {
    cpus: number;
    disk_size_GB: number | null;
    os_name: string | null;
    ram_MB: number;
    vm_name: string;
}

export interface ResourceUsage {
    billing_account_id: number;
    configurations: UsageConfiguration[];
    cost: number;
    description: string;
    hours: number;
    owner_uuid: string;
    price: number;
    price_unit: string;
    uptime_types: string[];
    user_id?: number;
}

export interface GetUsageParams {
    billingAccountId: number;
}

/**
 * Resource usage and charging data.
 */
export class ChargingResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Returns resource usage, prices and costs for the current month. */
    getUsage(params: GetUsageParams): Promise<ResourceUsage[]> {
        return this.client.request<ResourceUsage[]>("GET", "charging/usage", {
            query: { billing_account_id: params.billingAccountId },
        });
    }
}
