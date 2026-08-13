import { BaseResource } from "./base";

export interface Location {
    display_name: string;
    is_default: boolean;
    is_preferred: boolean;
    description: string;
    order_nr: number;
    slug: string;
    country_code: string;
}

export type VmParameterType = "integer" | "string";

export interface VmParameterLimit {
    mandatory?: boolean;
    min?: number;
    max?: number;
    os_name?: string;
    values?: string[];
}

export interface VmParameter {
    constraint: "range" | "enum" | "regexp";
    description: string;
    mandatory: boolean;
    parameter: string;
    type: VmParameterType;
    min?: number;
    max?: number;
    values?: string[];
    expression?: string;
    limited_by?: string;
    limits?: VmParameterLimit[];
}

export interface VmImageVersion {
    os_version: string;
    display_name: string;
    published: boolean;
}

export interface VmImage {
    os_name: string;
    display_name: string;
    ui_position: number;
    is_default: boolean;
    is_app_catalog: boolean;
    icon: string;
    versions: VmImageVersion[];
}

export interface BootImage {
    uuid: string;
    image_name: string;
    is_installation_media: boolean;
    description: string;
    is_published: boolean;
}

export interface PricingPolicyItem {
    numCpus?: number;
    megsRam?: number;
    policyId: number;
    price: number;
    resourceType: string;
    serviceNameInUptime?: string;
    serviceNameUserFriendly?: string;
}

export interface PricingPolicy {
    policy: PricingPolicyItem[];
}

/**
 * Global configuration endpoints: locations, VM parameters, images and pricing.
 */
export class ConfigResource extends BaseResource {
    /** Lists all available locations (data centres). */
    listLocations(): Promise<Location[]> {
        return this.client.request<Location[]>("GET", "config/locations");
    }

    /** Describes VM creation parameters and their allowed values. */
    getVmParameters(): Promise<VmParameter[]> {
        return this.client.request<VmParameter[]>("GET", "api/parameters/vm");
    }

    /** Lists all VM images for the platform Compute section. */
    listVmImages(): Promise<VmImage[]> {
        return this.client.request<VmImage[]>("GET", "config/vm_images");
    }

    /** Lists plain OS VM images (non app-catalog). */
    listPlainOsImages(): Promise<VmImage[]> {
        return this.client.request<VmImage[]>("GET", "config/vm_images/plain_os");
    }

    /** Lists app catalog VM images. */
    listAppCatalogImages(): Promise<VmImage[]> {
        return this.client.request<VmImage[]>("GET", "config/vm_images/app_catalog");
    }

    /** Lists available bootable ISO images. */
    listBootImages(): Promise<BootImage[]> {
        return this.client.request<BootImage[]>("GET", "config/boot_images");
    }

    /** Returns the policy that describes how resources are priced. */
    getPricingPolicy(): Promise<PricingPolicy> {
        return this.client.request<PricingPolicy>("GET", "pricing/policy");
    }
}
