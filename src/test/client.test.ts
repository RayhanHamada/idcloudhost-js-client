import { describe, expect, it } from "vitest";

import { IdCloudHostError } from "../errors";
import { createClient } from "./helpers";

describe("IdCloudHostClient", () => {
    it("builds default-location URLs", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.vm.list();
        expect(requests[0].path).toBe("/v1/user-resource/vm/list");
    });

    it("inserts the location slug after the version", async () => {
        const { client, requests } = createClient(() => ({ body: [] }), { location: "jkt01" });
        await client.vm.list();
        expect(requests[0].path).toBe("/v1/jkt01/user-resource/vm/list");
    });

    it("sends the apikey header on every request", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.config.listLocations();
        expect(requests[0].headers.apikey).toBe("test-key");
    });

    it("encodes form bodies, booleans and repeated array values", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.vm.create({
            name: "web",
            osName: "ubuntu",
            vcpu: 2,
            ram: 2048,
            reservePublicIp: false,
            publicKeys: ["ssh-a", "ssh-b"],
        });
        const form = new URLSearchParams(requests[0].body);
        expect(requests[0].headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
        expect({
            name: form.get("name"),
            os_name: form.get("os_name"),
            vcpu: form.get("vcpu"),
            reserve_public_ip: form.get("reserve_public_ip"),
            public_keys: form.getAll("public_keys"),
            has_password: form.has("password"),
        }).toStrictEqual({
            name: "web",
            os_name: "ubuntu",
            vcpu: "2",
            reserve_public_ip: "false",
            public_keys: ["ssh-a", "ssh-b"],
            has_password: false,
        });
    });

    it("sends JSON bodies with the proper content type", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.user.createSshKey({ name: "laptop", publicKey: "ssh-ed25519 AAAA" });
        expect(requests[0].headers["Content-Type"]).toBe("application/json");
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            name: "laptop",
            public_key: "ssh-ed25519 AAAA",
        });
    });

    it("appends query parameters and skips undefined values", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.vm.get("some-uuid");
        await client.network.floatingIps.list({ billingAccountId: 7 });
        expect(requests[0].query.get("uuid")).toBe("some-uuid");
        expect(requests[1].query.get("billing_account_id")).toBe("7");
        expect(requests[1].query.has("vm_uuid")).toBeFalsy();
    });

    it("returns undefined for 204 responses", async () => {
        const { client } = createClient(() => ({ status: 204 }));
        await expect(client.user.deleteSshKey("uuid")).resolves.toBeUndefined();
    });

    it("returns undefined for empty 200 responses", async () => {
        const { client } = createClient(() => ({ status: 200, body: undefined }));
        await expect(client.network.loadBalancers.delete("lb")).resolves.toBeUndefined();
    });

    it("throws IdCloudHostError with extracted errors on failure", async () => {
        const { client } = createClient(() => ({
            status: 404,
            body: { errors: { Error: "No such virtual machine exists." } },
        }));
        const promise = client.vm.get("nope");
        await expect(promise).rejects.toBeInstanceOf(IdCloudHostError);
        await expect(promise).rejects.toMatchObject({
            status: 404,
            message: "No such virtual machine exists.",
            errors: { Error: "No such virtual machine exists." },
        });
    });

    it("extracts msg from payment-style error objects", async () => {
        const { client } = createClient(() => ({
            status: 403,
            body: {
                errors: {
                    "consumer::resource_forbidden": {
                        msg: "Consumer not allowed to access resource.",
                        subtype: "resource_forbidden",
                        type: "consumer",
                    },
                },
            },
        }));
        const promise = client.payment.payAll({ billingAccountId: 1 });
        await expect(promise).rejects.toThrow("Consumer not allowed to access resource.");
    });

    it("merges default headers into every request", async () => {
        const { client, requests } = createClient(() => ({ body: {} }), {
            headers: { "x-request-id": "abc", "x-custom": "yes" },
        });
        await client.vm.list();
        expect(requests[0].headers["x-request-id"]).toBe("abc");
        expect(requests[0].headers["x-custom"]).toBe("yes");
    });

    it("keeps the apikey header authoritative over default headers", async () => {
        const { client, requests } = createClient(() => ({ body: {} }), {
            headers: { apikey: "spoofed" },
        });
        await client.vm.list();
        expect(requests[0].headers.apikey).toBe("test-key");
    });

    it("lets request-specific content types override default headers", async () => {
        const { client, requests } = createClient(() => ({ body: {} }), {
            headers: { "Content-Type": "text/plain" },
        });
        await client.user.createSshKey({ name: "laptop", publicKey: "ssh-ed25519 AAAA" });
        expect(requests[0].headers["Content-Type"]).toBe("application/json");
    });

    it("propagates default headers to location-scoped clients", async () => {
        const { client, requests } = createClient(() => ({ body: {} }), {
            headers: { "x-request-id": "abc" },
        });
        await client.withLocation("jkt01").vm.list();
        expect(requests[0].path).toBe("/v1/jkt01/user-resource/vm/list");
        expect(requests[0].headers["x-request-id"]).toBe("abc");
    });
});
