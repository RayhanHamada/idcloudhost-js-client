import { describe, expect, it } from "vitest";

import { createClient } from "./helpers";

describe("DiskResource", () => {
    it("creates, lists and gets disks", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.storage.disks.create({
            sizeGb: 50,
            billingAccountId: 7,
            displayName: "DB data",
            sourceImageType: "EMPTY",
        });
        await client.storage.disks.list({ readOnlyBootable: true });
        await client.storage.disks.get("disk-uuid");
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/storage/disks" });
        expect(new URLSearchParams(requests[0].body).get("source_image_type")).toBe("EMPTY");
        expect(requests[1]).toMatchObject({ method: "GET", path: "/v1/storage/disks" });
        expect(requests[1].query.get("read_only_bootable")).toBe("true");
        expect(requests[2]).toMatchObject({ method: "GET", path: "/v1/storage/disks/disk-uuid" });
    });

    it("modifies and deletes a disk", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.storage.disks.modify("disk-uuid", {
            billingAccountId: 8,
            displayName: "Web backup",
            readOnlyBootable: true,
        });
        await client.storage.disks.delete("disk-uuid");
        expect(requests[0]).toMatchObject({ method: "PATCH", path: "/v1/storage/disks/disk-uuid" });
        expect(new URLSearchParams(requests[0].body).get("read_only_bootable")).toBe("true");
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/storage/disks/disk-uuid",
        });
    });

    it("attaches and detaches disks from VMs", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.storage.disks.attach({ uuid: "vm-uuid", storageUuid: "disk-uuid" });
        await client.storage.disks.detach({ uuid: "vm-uuid", storageUuid: "disk-uuid" });
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/vm/storage/attach",
        });
        expect(new URLSearchParams(requests[0].body).get("storage_uuid")).toBe("disk-uuid");
        expect(requests[1]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/vm/storage/detach",
        });
    });
});

describe("BucketResource", () => {
    it("gets S3 API info", async () => {
        const { client, requests } = createClient(() => ({ body: { url: "https://s3.test/" } }));
        const info = await client.storage.buckets.getS3Info();
        expect(info.url).toBe("https://s3.test/");
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/storage/api/s3" });
    });

    it("creates, modifies, gets and deletes buckets", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.storage.buckets.create({ name: "pang1", billingAccountId: 9 });
        await client.storage.buckets.modify({ name: "pang1", billingAccountId: 10 });
        await client.storage.buckets.get("pang1");
        await client.storage.buckets.delete("pang1");
        expect(requests[0]).toMatchObject({ method: "PUT", path: "/v1/storage/bucket" });
        expect(new URLSearchParams(requests[0].body).get("name")).toBe("pang1");
        expect(requests[1]).toMatchObject({ method: "PATCH", path: "/v1/storage/bucket" });
        expect(
            requests.slice(2).map((request) => ({
                method: request.method,
                name: request.query.get("name"),
            }))
        ).toStrictEqual([
            { method: "GET", name: "pang1" },
            { method: "DELETE", name: "pang1" },
        ]);
    });

    it("lists buckets with a billing account filter", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.storage.buckets.list({ billingAccountId: 9 });
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/storage/bucket/list" });
        expect(requests[0].query.get("billing_account_id")).toBe("9");
    });

    it("manages S3 keys", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.storage.buckets.listKeys();
        await client.storage.buckets.generateKey();
        await client.storage.buckets.deleteKey("ACCESS");
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/storage/user/keys" });
        expect(requests[1]).toMatchObject({ method: "POST", path: "/v1/storage/user/keys" });
        expect(requests[2]).toMatchObject({ method: "DELETE", path: "/v1/storage/user/keys" });
        expect(new URLSearchParams(requests[2].body).get("access_key")).toBe("ACCESS");
    });
});
