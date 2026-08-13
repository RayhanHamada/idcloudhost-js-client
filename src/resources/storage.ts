import type { IdCloudHostClient } from "../client";
import type { StorageReplica } from "./vm";

export type DiskSourceImageType = "OS_BASE" | "DISK" | "SNAPSHOT" | "EMPTY";

export interface DiskSnapshot {
    uuid: string;
    size_gb: number;
    display_name?: string;
    created_at: string;
    disk_uuid: string;
}

export interface Disk {
    uuid: string;
    status: string;
    user_id: number;
    billing_account_id: number;
    size_gb: number;
    source_image_type: DiskSourceImageType;
    source_image?: string;
    display_name?: string;
    created_at: string;
    updated_at: string;
    storage_pool_uuid?: string;
    snapshots?: DiskSnapshot[];
}

export interface CreateDiskParams {
    /** Disk size in GiB. Required if the size is not apparent from the source image. */
    sizeGb?: number;
    /** Required if using a global API token. */
    billingAccountId?: number;
    displayName?: string;
    /** One of `OS_BASE`, `DISK`, `SNAPSHOT` or `EMPTY` (default). */
    sourceImageType?: DiskSourceImageType;
    /** Image to copy: OS base name (e.g. `ubuntu_20.04`) or a disk/snapshot UUID. */
    sourceImage?: string;
}

export interface ModifyDiskInfoParams {
    billingAccountId?: number;
    displayName?: string;
    /** Marks or unmarks the disk as read-only bootable media. */
    readOnlyBootable?: boolean;
}

export interface ListDisksParams {
    /** When true, returns only disks marked as read-only bootable. */
    readOnlyBootable?: boolean;
}

export interface AttachDiskParams {
    uuid: string;
    storageUuid: string;
}

export interface AttachedDisk {
    created_at: string;
    name: string;
    primary: boolean;
    replica: StorageReplica[];
    size: number;
    user_id?: number;
    uuid: string;
}

export interface S3Info {
    url: string;
}

export interface Bucket {
    name: string;
    size_bytes: number;
    billing_account_id: number;
    num_objects: number;
    created_at: string;
    modified_at: string;
    is_suspended: boolean;
}

export interface CreateBucketParams {
    /** Bucket name, must conform to S3 naming rules and be globally unique. */
    name: string;
    /** Required if using a global API token. */
    billingAccountId?: number;
}

export interface ModifyBucketParams {
    name: string;
    billingAccountId: number;
}

export interface ListBucketsParams {
    billingAccountId?: number;
}

export interface S3Key {
    accessKey: string;
    secretKey: string;
    userId: string;
}

export interface SuccessResponse {
    success: boolean;
}

/**
 * Block storage (location-specific) and object storage (global) endpoints.
 */
export class StorageResource {
    readonly disks: DiskResource;
    readonly buckets: BucketResource;

    constructor(client: IdCloudHostClient) {
        this.disks = new DiskResource(client);
        this.buckets = new BucketResource(client);
    }
}

/**
 * Block storage disks. All endpoints are location-specific.
 */
export class DiskResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /**
     * Creates a new disk. It can be empty or a copy of an OS base image, an
     * existing disk or a snapshot.
     */
    create(params: CreateDiskParams): Promise<Disk> {
        return this.client.request<Disk>("POST", "storage/disks", {
            form: {
                size_gb: params.sizeGb,
                billing_account_id: params.billingAccountId,
                display_name: params.displayName,
                source_image_type: params.sourceImageType,
                source_image: params.sourceImage,
            },
        });
    }

    /** Gets one disk. */
    get(diskUuid: string): Promise<Disk> {
        return this.client.request<Disk>("GET", `storage/disks/${diskUuid}`);
    }

    /** Lists the user's disks. */
    list(params: ListDisksParams = {}): Promise<Disk[]> {
        return this.client.request<Disk[]>("GET", "storage/disks", {
            query: { read_only_bootable: params.readOnlyBootable },
        });
    }

    /** Modifies a disk's metadata. */
    modify(diskUuid: string, params: ModifyDiskInfoParams = {}): Promise<Disk> {
        return this.client.request<Disk>("PATCH", `storage/disks/${diskUuid}`, {
            form: {
                billing_account_id: params.billingAccountId,
                display_name: params.displayName,
                read_only_bootable: params.readOnlyBootable,
            },
        });
    }

    /** Deletes a disk and all of its snapshots. Data is lost irrecoverably. */
    delete(diskUuid: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", `storage/disks/${diskUuid}`);
    }

    /** Attaches a disk to a virtual machine. */
    attach(params: AttachDiskParams): Promise<AttachedDisk> {
        return this.client.request<AttachedDisk>("POST", "user-resource/vm/storage/attach", {
            form: { uuid: params.uuid, storage_uuid: params.storageUuid },
        });
    }

    /** Detaches a disk from a virtual machine. */
    detach(params: AttachDiskParams): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("POST", "user-resource/vm/storage/detach", {
            form: { uuid: params.uuid, storage_uuid: params.storageUuid },
        });
    }
}

/**
 * S3 object storage buckets and keys. These endpoints are not location-specific.
 */
export class BucketResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Returns the S3 API URL. */
    getS3Info(): Promise<S3Info> {
        return this.client.request<S3Info>("GET", "storage/api/s3");
    }

    /** Creates an S3 bucket. */
    create(params: CreateBucketParams): Promise<Bucket> {
        return this.client.request<Bucket>("PUT", "storage/bucket", {
            form: {
                name: params.name,
                billing_account_id: params.billingAccountId,
            },
        });
    }

    /** Changes a bucket's billing account. */
    modify(params: ModifyBucketParams): Promise<Bucket> {
        return this.client.request<Bucket>("PATCH", "storage/bucket", {
            form: {
                name: params.name,
                billing_account_id: params.billingAccountId,
            },
        });
    }

    /** Deletes an S3 bucket. Only empty buckets can be deleted. */
    delete(name: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", "storage/bucket", {
            query: { name },
        });
    }

    /** Gets bucket information. */
    get(name: string): Promise<Bucket> {
        return this.client.request<Bucket>("GET", "storage/bucket", {
            query: { name },
        });
    }

    /** Lists the user's buckets, optionally filtered by billing account. */
    list(params: ListBucketsParams = {}): Promise<Bucket[]> {
        return this.client.request<Bucket[]>("GET", "storage/bucket/list", {
            query: { billing_account_id: params.billingAccountId },
        });
    }

    /** Returns all S3 keys of the user. */
    listKeys(): Promise<S3Key[]> {
        return this.client.request<S3Key[]>("GET", "storage/user/keys");
    }

    /** Generates a new S3 key pair. Returns the list of all keys. */
    generateKey(): Promise<S3Key[]> {
        return this.client.request<S3Key[]>("POST", "storage/user/keys");
    }

    /** Deletes an S3 key. */
    deleteKey(accessKey: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", "storage/user/keys", {
            form: { access_key: accessKey },
        });
    }
}
