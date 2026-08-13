import { describe, expect, it } from "vitest";

import { createClient } from "./helpers";

const vmBody = { uuid: "vm-uuid", status: "running" };

describe("VmResource", () => {
    it("lists and gets VMs", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.list();
        await client.vm.get("vm-uuid");
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/user-resource/vm/list" });
        expect(requests[1]).toMatchObject({ method: "GET", path: "/v1/user-resource/vm" });
        expect(requests[1].query.get("uuid")).toBe("vm-uuid");
    });

    it("creates a VM with mapped form fields", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.create({
            name: "web",
            osName: "ubuntu",
            osVersion: "24.04",
            disks: 40,
            vcpu: 2,
            ram: 2048,
            username: "root",
            password: "Secret123",
            billingAccountId: 6,
            designatedPoolUuid: "pool-uuid",
            networkUuid: "net-uuid",
            backup: true,
            cloudInit: '{"runcmd": ["/firstboot"]}',
        });
        const form = new URLSearchParams(requests[0].body);
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/user-resource/vm" });
        expect({
            os_name: form.get("os_name"),
            os_version: form.get("os_version"),
            disks: form.get("disks"),
            billing_account_id: form.get("billing_account_id"),
            designated_pool_uuid: form.get("designated_pool_uuid"),
            network_uuid: form.get("network_uuid"),
            backup: form.get("backup"),
            cloud_init: form.get("cloud_init"),
        }).toStrictEqual({
            os_name: "ubuntu",
            os_version: "24.04",
            disks: "40",
            billing_account_id: "6",
            designated_pool_uuid: "pool-uuid",
            network_uuid: "net-uuid",
            backup: "true",
            cloud_init: '{"runcmd": ["/firstboot"]}',
        });
    });

    it("modifies and deletes a VM", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.modify({ uuid: "vm-uuid", name: "new-name", vcpu: 4, ram: 4096 });
        await client.vm.delete("vm-uuid");
        expect(requests[0]).toMatchObject({ method: "PATCH", path: "/v1/user-resource/vm" });
        expect(new URLSearchParams(requests[0].body).get("vcpu")).toBe("4");
        expect(requests[1]).toMatchObject({ method: "DELETE", path: "/v1/user-resource/vm" });
        expect(new URLSearchParams(requests[1].body).get("uuid")).toBe("vm-uuid");
    });

    it("starts and stops a VM", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.start("vm-uuid");
        await client.vm.stop("vm-uuid", { force: true });
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/user-resource/vm/start" });
        expect(requests[1]).toMatchObject({ method: "POST", path: "/v1/user-resource/vm/stop" });
        expect(new URLSearchParams(requests[1].body).get("force")).toBe("true");
    });

    it("changes password, reinstalls, rebuilds, clones and toggles backup", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.changePassword({
            uuid: "vm-uuid",
            username: "root",
            password: "Secret123",
        });
        await client.vm.reinstall({ uuid: "vm-uuid", osName: "ubuntu", osVersion: "22.04-lts" });
        await client.vm.rebuild({ uuid: "vm-uuid", replicaUuid: "replica-uuid" });
        await client.vm.clone({ uuid: "vm-uuid", name: "clone" });
        await client.vm.toggleAutoBackup("vm-uuid");
        expect(requests.map((request) => request.path)).toStrictEqual([
            "/v1/user-resource/vm/user",
            "/v1/user-resource/vm/reinstall",
            "/v1/user-resource/vm/rebuild",
            "/v1/user-resource/vm/clone",
            "/v1/user-resource/vm/backup",
        ]);
        expect(requests.map((request) => request.method)).toStrictEqual([
            "PATCH",
            "POST",
            "POST",
            "POST",
            "POST",
        ]);
        expect(new URLSearchParams(requests[2].body).get("replica_uuid")).toBe("replica-uuid");
    });

    it("lists host pools", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.vm.listHostPools();
        expect(requests[0]).toMatchObject({
            method: "GET",
            path: "/v1/user-resource/host_pool/list",
        });
    });

    it("manages replicas", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.vm.listReplicas({ uuid: "vm-uuid", type: "snapshot" });
        await client.vm.createReplica("vm-uuid");
        await client.vm.deleteReplica({ replicaUuid: "replica-uuid" });
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/user-resource/vm/replica" });
        expect({
            uuid: requests[0].query.get("uuid"),
            r_type: requests[0].query.get("r_type"),
        }).toStrictEqual({ uuid: "vm-uuid", r_type: "snapshot" });
        expect(requests[1]).toMatchObject({ method: "POST", path: "/v1/user-resource/vm/replica" });
        expect(requests[2]).toMatchObject({
            method: "DELETE",
            path: "/v1/user-resource/vm/replica",
        });
        expect(new URLSearchParams(requests[2].body).get("replica_uuid")).toBe("replica-uuid");
    });

    it("boots rescue or installation media", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.vm.bootIsoMedia({
            uuid: "vm-uuid",
            bootImageUuid: "iso-uuid",
            bootImageRepository: "private",
        });
        const form = new URLSearchParams(requests[0].body);
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/vm/boot_iso_media",
        });
        expect(form.get("boot_image_uuid")).toBe("iso-uuid");
        expect(form.get("boot_image_repository")).toBe("private");
    });

    it("manages attached disks", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.vm.addDisk({ uuid: "vm-uuid", sizeGb: 50 });
        await client.vm.modifyDisk({ uuid: "vm-uuid", diskUuid: "disk-uuid", sizeGb: 60 });
        await client.vm.deleteDisk({ uuid: "vm-uuid", storageUuid: "disk-uuid" });
        expect(requests.map((request) => request.path)).toStrictEqual([
            "/v1/user-resource/vm/storage",
            "/v1/user-resource/vm/storage",
            "/v1/user-resource/vm/storage",
        ]);
        expect(requests.map((request) => request.method)).toStrictEqual([
            "POST",
            "PATCH",
            "DELETE",
        ]);
        expect(new URLSearchParams(requests[2].body).get("storage_uuid")).toBe("disk-uuid");
    });

    it("exposes deprecated public IP endpoints", async () => {
        const { client, requests } = createClient(() => ({ body: vmBody }));
        await client.vm.reservePublicIp("vm-uuid");
        await client.vm.releasePublicIp("vm-uuid");
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/vm/ip/public",
        });
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/user-resource/vm/ip/public",
        });
    });
});
