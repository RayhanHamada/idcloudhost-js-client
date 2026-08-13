---
name: idcloudhost-storage
description: "Use when working with IDCloudHost storage — block storage disks (CRUD, attach/detach to VMs, read-only bootable media) and S3 object storage (buckets and keys). Disks are location-specific; buckets are global. See the idcloudhost skill for client setup and the idcloudhost-vm skill for VM-attached disks."
---

# IDCloudHost storage

Two sub-namespaces:

- `client.storage.disks` — block storage, **location-specific**
- `client.storage.buckets` — S3 object storage, **global** (location never applies)

## Block storage disks — `client.storage.disks`

### Create

```ts
const disk = await client.storage.disks.create({
    sizeGb: 20, // required if size is not implied by the source
    billingAccountId: 123, // required with a global API token
    displayName: "data-disk",
    sourceImageType: "OS_BASE", // "OS_BASE" | "DISK" | "SNAPSHOT" | "EMPTY" (default)
    sourceImage: "ubuntu_20.04", // OS base name, or disk/snapshot UUID
});
```

### Read, modify, delete

```ts
const disks = await client.storage.disks.list({ readOnlyBootable: false }); // true = only bootable media
const disk = await client.storage.disks.get(disk.uuid);
await client.storage.disks.modify(disk.uuid, {
    displayName: "renamed",
    billingAccountId: 456,
    readOnlyBootable: true, // mark as read-only bootable media
});
await client.storage.disks.delete(disk.uuid); // deletes snapshots too — irrecoverable
```

### Attach / detach to VMs

```ts
await client.storage.disks.attach({ uuid: vm.uuid, storageUuid: disk.uuid });
await client.storage.disks.detach({ uuid: vm.uuid, storageUuid: disk.uuid });
```

`Disk` shape: `{ uuid, status, size_gb, source_image_type, source_image, display_name, snapshots?, billing_account_id }`.

## S3 object storage — `client.storage.buckets`

### Buckets

```ts
const { url } = await client.storage.buckets.getS3Info(); // S3 endpoint URL

const bucket = await client.storage.buckets.create({ name: "my-bucket" }); // S3 naming rules, globally unique
await client.storage.buckets.list({ billingAccountId: 123 }); // optional filter
await client.storage.buckets.get("my-bucket");
await client.storage.buckets.modify({ name: "my-bucket", billingAccountId: 456 });
await client.storage.buckets.delete("my-bucket"); // only EMPTY buckets can be deleted
```

### S3 keys

```ts
const keys = await client.storage.buckets.listKeys(); // [{ accessKey, secretKey, userId }]
const all = await client.storage.buckets.generateKey(); // creates a pair, returns ALL keys
await client.storage.buckets.deleteKey(keys[0].accessKey);
```

## Waiting

Disk creation is asynchronous; poll `get` until the desired status:

```ts
const ready = await waitFor(
    () => client.storage.disks.get(disk.uuid),
    (d) => d.status === "Active"
);
```

## Gotchas

- Only empty buckets can be deleted; remove objects first (via S3 tooling, not the SDK).
- A disk marked `readOnlyBootable` can serve as boot media for VMs.
- `storage.disks.delete` removes the disk and all its snapshots; snapshots of OTHER disks are unaffected.
- Deletion of a primary VM disk is not allowed via `vm.deleteDisk`; use `vm.delete` instead.
