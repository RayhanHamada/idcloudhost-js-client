import { describe, expect, it } from "vitest";

import { createClient } from "./helpers";

describe("ConfigResource", () => {
    it("lists locations", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.config.listLocations();
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/config/locations" });
    });

    it("gets VM parameters", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.config.getVmParameters();
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/api/parameters/vm" });
    });

    it("lists VM images and image variants", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.config.listVmImages();
        await client.config.listPlainOsImages();
        await client.config.listAppCatalogImages();
        expect(requests.map((request) => request.path)).toStrictEqual([
            "/v1/config/vm_images",
            "/v1/config/vm_images/plain_os",
            "/v1/config/vm_images/app_catalog",
        ]);
    });

    it("lists bootable media images", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.config.listBootImages();
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/config/boot_images" });
    });

    it("gets the pricing policy", async () => {
        const { client, requests } = createClient(() => ({ body: { policy: [] } }));
        const policy = await client.config.getPricingPolicy();
        expect(policy.policy).toStrictEqual([]);
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/pricing/policy" });
    });
});

describe("UserResource", () => {
    it("gets the authenticated user", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.user.get();
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/user-resource/user" });
    });

    it("updates the profile with form fields", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.user.updateProfile({ firstName: "Cloudia", phoneNumber: "+98765" });
        const form = new URLSearchParams(requests[0].body);
        expect(requests[0]).toMatchObject({
            method: "PATCH",
            path: "/v1/user-resource/user/profile",
        });
        expect(form.get("first_name")).toBe("Cloudia");
        expect(form.get("phone_number")).toBe("+98765");
        expect(form.has("last_name")).toBeFalsy();
    });

    it("manages SSH keys", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.user.listSshKeys();
        await client.user.createSshKey({ name: "laptop", publicKey: "ssh-ed25519 AAAA" });
        await client.user.renameSshKey("key-uuid", { name: "personal" });
        await client.user.deleteSshKey("key-uuid");

        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/user-resource/ssh_keys" });
        expect(requests[1]).toMatchObject({ method: "POST", path: "/v1/user-resource/ssh_keys" });
        expect(JSON.parse(requests[1].body ?? "")).toStrictEqual({
            name: "laptop",
            public_key: "ssh-ed25519 AAAA",
        });
        expect({
            method: requests[2].method,
            path: requests[2].path,
            body: JSON.parse(requests[2].body ?? ""),
        }).toStrictEqual({
            method: "PATCH",
            path: "/v1/user-resource/ssh_keys/key-uuid",
            body: { name: "personal" },
        });
        expect(requests[3]).toMatchObject({
            method: "DELETE",
            path: "/v1/user-resource/ssh_keys/key-uuid",
        });
    });
});

describe("TokenResource", () => {
    it("lists tokens", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.token.list();
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/user-resource/token/list" });
    });

    it("creates a token", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.token.create({ description: "ci", restricted: true, billingAccountId: 6 });
        const form = new URLSearchParams(requests[0].body);
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/user-resource/token" });
        expect(form.get("description")).toBe("ci");
        expect(form.get("restricted")).toBe("true");
        expect(form.get("billing_account_id")).toBe("6");
    });

    it("updates and deletes a token", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.token.update({ tokenId: 3, description: "renamed" });
        await client.token.delete({ tokenId: 3 });
        expect(requests[0]).toMatchObject({ method: "PATCH", path: "/v1/user-resource/token" });
        expect(new URLSearchParams(requests[0].body).get("token_id")).toBe("3");
        expect(requests[1]).toMatchObject({ method: "DELETE", path: "/v1/user-resource/token" });
        expect(new URLSearchParams(requests[1].body).get("token_id")).toBe("3");
    });
});
