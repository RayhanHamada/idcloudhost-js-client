---
name: idcloudhost-vm
description: Use when creating, listing, modifying, deleting, starting, stopping, reinstalling, rebuilding, cloning IDCloudHost virtual machines, or managing VM replicas (snapshots/backups), host pools, boot ISO media, attached disks and cloud-init. Also see the idcloudhost skill for client setup, errors, and waiting helpers.
---

# IDCloudHost VM management

All VM endpoints are location-specific. Client setup, errors (`IdCloudHostError`), and polling helpers (`waitForVmStatus`, `waitFor`) are covered in the `idcloudhost` skill.

## Data model

`VirtualMachine` key fields: `uuid`, `name`, `hostname`, `status` (`"running" | "stopped" | "provisioning" | string`), `vcpu`, `memory` (MB), `os_name`, `os_version`, `public_ipv4` (nullable), `private_ipv4`, `username`, `billing_account`, `storage: VmStorage[]`, `backup: boolean`.

## Create

```ts
const vm = await client.vm.create({
    name: "web-server",
    osName: "ubuntu", // validate with client.config.listPlainOsImages()
    osVersion: "24.04",
    disks: 40, // main storage size in GB
    vcpu: 2,
    ram: 2048, // MB
    username: "root",
    password: "Secret1234",
    billingAccountId: 123, // required with a global API token
    designatedPoolUuid: "...", // resource pool (client.vm.listHostPools())
    networkUuid: "...", // private network; empty = default network
    description: "web tier",
    backup: true, // auto backups
    publicKey: "ssh-ed25519 AAAA...", // single key
    publicKeys: ["ssh-ed25519 AAAA..."], // multiple keys
    reservePublicIp: true, // false = VM without public IPv4
    sourceUuid: "vm-uuid", // build from existing VM (snapshot/backup)
    sourceReplica: "replica-uuid",
    diskUuid: "disk-uuid", // existing unattached disk as boot disk
    cloudInit: "#cloud-config\npackages: [nginx]",
});
```

## Read and modify

```ts
const vms = await client.vm.list();
const vm = await client.vm.get(uuid);

// only name, vcpu, ram; vcpu/ram only while STOPPED
await client.vm.modify({ uuid, name: "renamed", vcpu: 4, ram: 8192 });

await client.vm.delete(uuid); // irrecoverable
```

## Lifecycle

```ts
await client.vm.start(uuid);
await client.vm.stop(uuid, { force: true }); // graceful ACPI first unless force
await client.vm.changePassword({ uuid, username: "root", password: "NewSecret1" });

// Reinstall: discards storage state, overwrites with OS base image.
// osName/osVersion default to the VM's current OS.
await client.vm.reinstall({ uuid, osName: "ubuntu", osVersion: "22.04" });

await client.vm.toggleAutoBackup(uuid);
await client.vm.clone({ uuid, name: "web-server-clone" });
```

After start/stop/reinstall, poll until the desired status is reached:

```ts
await client.vm.start(vm.uuid);
await waitForVmStatus(client.vm, vm.uuid, "running", { timeoutMs: 300_000 });
```

## Replicas (snapshots and backups)

```ts
const replica = await client.vm.createReplica(vm.uuid); // new snapshot
const replicas = await client.vm.listReplicas({ uuid: vm.uuid, type: "snapshot" });
await client.vm.rebuild({ uuid: vm.uuid, replicaUuid: replicas[0].uuid }); // restore storage
await client.vm.deleteReplica({ replicaUuid: replicas[0].uuid });
```

## Host pools

```ts
const pools = await client.vm.listHostPools(); // { uuid, name, description, is_default_designated }
// pass pool uuid as designatedPoolUuid when creating a VM
```

## Boot ISO media

```ts
// One-shot live boot; repository "platform" (default) or "private".
// bootImageUuid required when repository is "private".
await client.vm.bootIsoMedia({ uuid, bootImageUuid: "iso-uuid", bootImageRepository: "private" });
```

## Disks attached to a VM

```ts
const disk = await client.vm.addDisk({ uuid, sizeGb: 20 }); // create + attach
await client.vm.modifyDisk({ uuid, diskUuid: disk.uuid, sizeGb: 40 }); // only grow
await client.vm.deleteDisk({ uuid, storageUuid: disk.uuid }); // primary disks cannot be deleted
```

For standalone block storage disks, use `client.storage.disks` (see idcloudhost-storage skill).

## Deprecated

`releasePublicIp(uuid)` / `reservePublicIp(uuid)` — use `client.network.floatingIps` (idcloudhost-network skill).

## Gotchas

- `modify` with vcpu/ram on a running VM fails — stop first, modify, start again.
- `stop` with `force: false` sends ACPI shutdown; a stuck VM may need `force: true`.
- Created VMs are billed immediately; `billingAccountId` determines the account.
- Validate `osName`/`osVersion` against `client.config.listPlainOsImages()` / `listAppCatalogImages()`.
