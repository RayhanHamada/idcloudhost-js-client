import type { IdCloudHostClient } from "../client";

export type VmStatus = "running" | "stopped" | "provisioning" | string;

export interface StorageReplica {
    created_at: string;
    id?: number;
    master_id?: number;
    master_uuid?: string;
    pool?: string;
    size: number;
    type: string;
    updated_at?: string | null;
    uuid: string;
}

export interface VmStorage {
    created_at: string;
    id?: number;
    name: string;
    pool?: string;
    primary: boolean;
    public_ipv4?: string | null;
    replica: StorageReplica[];
    shared?: boolean;
    size: number;
    type: string;
    updated_at?: string | null;
    user_id?: number;
    uuid: string;
}

export interface VirtualMachine {
    backup: boolean;
    billing_account: number;
    created_at: string;
    description: string;
    designated_pool_name?: string;
    designated_pool_uuid?: string;
    hostname: string;
    hypervisor_id?: string | null;
    id?: number;
    license_type?: string;
    mac: string;
    memory: number;
    name: string;
    os_name: string;
    os_version: string;
    private_ipv4: string;
    public_ipv4?: string | null;
    public_ipv6?: string;
    status: VmStatus;
    storage: VmStorage[];
    tags: unknown;
    updated_at: string | null;
    user_id: number;
    username: string;
    uuid: string;
    vcpu: number;
}

export interface HostPool {
    created_at: string;
    description: string;
    is_default_designated: boolean;
    name: string;
    updated_at: string;
    uuid: string;
}

export interface CreateVmParams {
    name: string;
    osName?: string;
    osVersion?: string;
    /** Size of the main storage in gigabytes. */
    disks?: number | string;
    vcpu: number;
    /** Amount of RAM in megabytes. */
    ram: number;
    username?: string;
    password?: string;
    billingAccountId?: number;
    /** Resource pool the VM will be allocated into. */
    designatedPoolUuid?: string;
    /** Network the VM is created in. Empty means the default network. */
    networkUuid?: string;
    description?: string;
    /** Enables automatic backups. Defaults to false. */
    backup?: boolean;
    /** OpenSSH public key line. */
    publicKey?: string;
    /** Multiple OpenSSH public key lines. */
    publicKeys?: string[];
    /** Set to false to create a VM without a public IPv4 address. */
    reservePublicIp?: boolean;
    /** VM UUID whose backup or snapshot is used as the source. */
    sourceUuid?: string;
    /** Snapshot or backup UUID used as the source. */
    sourceReplica?: string;
    /** Existing unattached disk used as the boot disk. */
    diskUuid?: string;
    /** cloud-init user-data as a YAML or JSON string. */
    cloudInit?: string;
}

export interface ModifyVmParams {
    uuid: string;
    name?: string;
    vcpu?: number;
    ram?: number;
}

export interface ChangeVmPasswordParams {
    uuid: string;
    username: string;
    password: string;
}

export interface ReinstallVmParams {
    uuid: string;
    osName?: string;
    osVersion?: string;
}

export interface RebuildVmParams {
    uuid: string;
    replicaUuid: string;
}

export interface CloneVmParams {
    uuid: string;
    name: string;
}

export interface ListReplicasParams {
    uuid: string;
    /** Replica type, e.g. `snapshot`. */
    type?: string;
}

export interface DeleteReplicaParams {
    replicaUuid: string;
}

export interface BootIsoMediaParams {
    uuid: string;
    /** Boot media image UUID. Required when repository is `private`. */
    bootImageUuid?: string;
    /** One of `private` or `platform` (default). */
    bootImageRepository?: "private" | "platform";
}

export interface AddDiskParams {
    uuid: string;
    sizeGb: number;
}

export interface ModifyDiskParams {
    uuid: string;
    diskUuid: string;
    sizeGb: number;
}

export interface DeleteDiskParams {
    uuid: string;
    storageUuid: string;
}

export interface SuccessResponse {
    success: boolean;
}

/**
 * Virtual machine lifecycle: create, modify, start/stop, reinstall, replicas,
 * disks and boot media. All endpoints are location-specific.
 */
export class VmResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists virtual machines in the configured location. */
    list(): Promise<VirtualMachine[]> {
        return this.client.request<VirtualMachine[]>("GET", "user-resource/vm/list");
    }

    /** Gets a virtual machine by UUID. */
    get(uuid: string): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("GET", "user-resource/vm", {
            query: { uuid },
        });
    }

    /** Creates a new virtual machine. */
    create(params: CreateVmParams): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm", {
            form: {
                name: params.name,
                os_name: params.osName,
                os_version: params.osVersion,
                disks: params.disks,
                vcpu: params.vcpu,
                ram: params.ram,
                username: params.username,
                password: params.password,
                billing_account_id: params.billingAccountId,
                designated_pool_uuid: params.designatedPoolUuid,
                network_uuid: params.networkUuid,
                description: params.description,
                backup: params.backup,
                public_key: params.publicKey,
                public_keys: params.publicKeys,
                reserve_public_ip: params.reservePublicIp,
                source_uuid: params.sourceUuid,
                source_replica: params.sourceReplica,
                disk_uuid: params.diskUuid,
                cloud_init: params.cloudInit,
            },
        });
    }

    /**
     * Modifies a virtual machine. Only name, vcpu and ram can be changed; vcpu and
     * ram only while the machine is stopped.
     */
    modify(params: ModifyVmParams): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("PATCH", "user-resource/vm", {
            form: {
                uuid: params.uuid,
                name: params.name,
                vcpu: params.vcpu,
                ram: params.ram,
            },
        });
    }

    /** Deletes a virtual machine. */
    delete(uuid: string): Promise<unknown> {
        return this.client.request<unknown>("DELETE", "user-resource/vm", {
            form: { uuid },
        });
    }

    /** Starts a virtual machine. */
    start(uuid: string): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/start", {
            form: { uuid },
        });
    }

    /**
     * Stops a virtual machine. Tries a graceful ACPI shutdown first; set `force`
     * to cut power immediately.
     */
    stop(uuid: string, params: { force?: boolean } = {}): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/stop", {
            form: { uuid, force: params.force },
        });
    }

    /** Sets a new password for an existing user on a running virtual machine. */
    changePassword(params: ChangeVmPasswordParams): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("PATCH", "user-resource/vm/user", {
            form: {
                uuid: params.uuid,
                username: params.username,
                password: params.password,
            },
        });
    }

    /**
     * Discards the VM's current storage state and overwrites it with an OS base
     * image. `osName` and `osVersion` default to the VM's current OS.
     */
    reinstall(params: ReinstallVmParams): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/reinstall", {
            form: {
                uuid: params.uuid,
                os_name: params.osName,
                os_version: params.osVersion,
            },
        });
    }

    /** Restores the VM's storage from the specified replica (snapshot or backup). */
    rebuild(params: RebuildVmParams): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/rebuild", {
            form: {
                uuid: params.uuid,
                replica_uuid: params.replicaUuid,
            },
        });
    }

    /** Clones an existing virtual machine. */
    clone(params: CloneVmParams): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/clone", {
            form: {
                uuid: params.uuid,
                name: params.name,
            },
        });
    }

    /** Toggles automatic backups for a virtual machine. */
    toggleAutoBackup(uuid: string): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/backup", {
            form: { uuid },
        });
    }

    /** Lists resource pools available for hosting compute resources. */
    listHostPools(): Promise<HostPool[]> {
        return this.client.request<HostPool[]>("GET", "user-resource/host_pool/list");
    }

    /** Lists storage replicas (snapshots/backups) of a virtual machine. */
    listReplicas(params: ListReplicasParams): Promise<StorageReplica[]> {
        return this.client.request<StorageReplica[]>("GET", "user-resource/vm/replica", {
            query: { uuid: params.uuid, r_type: params.type },
        });
    }

    /** Creates a new storage replica (snapshot) of a virtual machine. */
    createReplica(uuid: string): Promise<VmStorage> {
        return this.client.request<VmStorage>("POST", "user-resource/vm/replica", {
            form: { uuid },
        });
    }

    /** Deletes a storage replica by UUID. */
    deleteReplica(params: DeleteReplicaParams): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("DELETE", "user-resource/vm/replica", {
            form: { replica_uuid: params.replicaUuid },
        });
    }

    /**
     * Boots the VM with a "live" OS image attached as a cd-rom device. The mode is
     * enabled for a single launch only.
     */
    bootIsoMedia(params: BootIsoMediaParams): Promise<unknown> {
        return this.client.request<unknown>("POST", "user-resource/vm/boot_iso_media", {
            form: {
                uuid: params.uuid,
                boot_image_uuid: params.bootImageUuid,
                boot_image_repository: params.bootImageRepository,
            },
        });
    }

    /** Creates and attaches a disk device of the given capacity to a VM. */
    addDisk(params: AddDiskParams): Promise<VmStorage> {
        return this.client.request<VmStorage>("POST", "user-resource/vm/storage", {
            form: { uuid: params.uuid, size_gb: params.sizeGb },
        });
    }

    /** Resizes an attached disk. The new size cannot be smaller than the current one. */
    modifyDisk(params: ModifyDiskParams): Promise<VmStorage> {
        return this.client.request<VmStorage>("PATCH", "user-resource/vm/storage", {
            form: {
                uuid: params.uuid,
                disk_uuid: params.diskUuid,
                size_gb: params.sizeGb,
            },
        });
    }

    /** Disconnects and completely removes a disk device from a VM. Primary disks cannot be deleted. */
    deleteDisk(params: DeleteDiskParams): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("DELETE", "user-resource/vm/storage", {
            form: { uuid: params.uuid, storage_uuid: params.storageUuid },
        });
    }

    /** @deprecated Use floating IPs (`client.network.floatingIps`) instead. */
    releasePublicIp(uuid: string): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("DELETE", "user-resource/vm/ip/public", {
            form: { uuid },
        });
    }

    /** @deprecated Use floating IPs (`client.network.floatingIps`) instead. */
    reservePublicIp(uuid: string): Promise<VirtualMachine> {
        return this.client.request<VirtualMachine>("POST", "user-resource/vm/ip/public", {
            form: { uuid },
        });
    }
}
