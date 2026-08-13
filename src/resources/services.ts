import { BaseResource } from "./base";

export interface ServicePrice {
    priceMultiplier: number;
    resourceType: string;
    serviceNameInUptime?: string;
}

export interface ServiceProperties {
    service_ip?: string;
    location?: string;
    sql_user?: string;
    port?: number;
    [key: string]: unknown;
}

export interface ServiceResourceAllocation {
    address?: string;
    memory?: number;
    vcpu?: number;
    status?: string;
    storage?: unknown[];
    [key: string]: unknown;
}

export interface ServiceResource {
    resource_allocation: ServiceResourceAllocation;
    resource_id: string;
    resource_location: string;
    resource_type: string;
}

export interface ServicePackage {
    billing_account_id: number;
    created_at: string;
    deleted_at?: string;
    display_name: string;
    is_deleted: boolean;
    is_multi_node: boolean;
    prices: ServicePrice[];
    properties: ServiceProperties;
    resources: ServiceResource[];
    service: string;
    status: string;
    updated_at: string;
    user_id: number;
    uuid: string;
    version: string;
}

export interface CreateServicePackageParams {
    billingAccountId: number;
    /** Service type, e.g. `postgresql` or `mariadb`. */
    service: string;
    version: string;
    displayName: string;
    vmCpu: number;
    vmRam: number;
    vmDiskGb: number;
    /** JSON-encoded service-specific parameters, e.g. `{"location":"jkt01"}`. */
    packageParameters?: string;
    isMultiNode?: boolean;
}

export interface UpdateServicePackageParams {
    billingAccountId?: number;
    displayName?: string;
}

/**
 * Managed services. Package CRUD is global; whitelist endpoints are
 * location-specific.
 */
export class ServicesResource extends BaseResource {
    /** Creates a new managed service package. */
    create(params: CreateServicePackageParams): Promise<ServicePackage> {
        return this.client.request<ServicePackage>("POST", "user-resource/service/package", {
            json: {
                billing_account_id: params.billingAccountId,
                service: params.service,
                version: params.version,
                display_name: params.displayName,
                vm_cpu: params.vmCpu,
                vm_ram: params.vmRam,
                vm_disk_gb: params.vmDiskGb,
                package_parameters: params.packageParameters,
                is_multi_node: params.isMultiNode,
            },
        });
    }

    /** Lists the service packages of the user. */
    list(): Promise<ServicePackage[]> {
        return this.client.request<ServicePackage[]>("GET", "user-resource/service/packages");
    }

    /** Gets a service package by UUID. */
    get(servicePackageUuid: string): Promise<ServicePackage> {
        return this.client.request<ServicePackage>(
            "GET",
            `user-resource/service/package/${servicePackageUuid}`
        );
    }

    /** Updates a service package's display name and billing account. */
    update(
        servicePackageUuid: string,
        params: UpdateServicePackageParams = {}
    ): Promise<ServicePackage> {
        return this.client.request<ServicePackage>(
            "PATCH",
            `user-resource/service/package/${servicePackageUuid}`,
            {
                json: {
                    billing_account_id: params.billingAccountId,
                    display_name: params.displayName,
                },
            }
        );
    }

    /** Returns the service secrets (e.g. database passwords). */
    getSecrets(servicePackageUuid: string): Promise<Record<string, string>> {
        return this.client.request<Record<string, string>>(
            "GET",
            `user-resource/service/package/${servicePackageUuid}/secrets`
        );
    }

    /** Deletes a service package and its resources. */
    delete(servicePackageUuid: string): Promise<ServicePackage> {
        return this.client.request<ServicePackage>(
            "DELETE",
            `user-resource/service/package/${servicePackageUuid}`
        );
    }

    /**
     * Lists the whitelist of addresses allowed to connect to the service host(s).
     * An empty whitelist means no restrictions.
     */
    listWhitelist(servicePackageUuid: string): Promise<string[]> {
        return this.client.request<string[]>(
            "GET",
            `user-resource/service/package/${servicePackageUuid}/whitelist_addresses`
        );
    }

    /** Adds an IP address or CIDR subnet to a service's whitelist. */
    addWhitelistEntry(
        servicePackageUuid: string,
        params: { ipAddress: string }
    ): Promise<string[]> {
        return this.client.request<string[]>(
            "POST",
            `user-resource/service/package/${servicePackageUuid}/whitelist_addresses`,
            { form: { ip_address: params.ipAddress } }
        );
    }

    /** Removes an entry from a service's whitelist. */
    removeWhitelistEntry(
        servicePackageUuid: string,
        params: { ipAddress: string }
    ): Promise<string[]> {
        return this.client.request<string[]>(
            "DELETE",
            `user-resource/service/package/${servicePackageUuid}/whitelist_addresses`,
            { form: { ip_address: params.ipAddress } }
        );
    }
}
