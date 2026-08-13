import { describe, expect, it } from "vitest";

import type { FirewallRule } from "../resources/network";
import { createClient } from "./helpers";

describe("PrivateNetworkResource", () => {
    it("lists and gets networks", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.privateNetworks.list();
        await client.network.privateNetworks.get("net-uuid");
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/network/networks" });
        expect(requests[1]).toMatchObject({
            method: "GET",
            path: "/v1/network/network/net-uuid",
        });
    });

    it("creates a network with a name query parameter", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.privateNetworks.create({ name: "network3" });
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/network/network" });
        expect(requests[0].query.get("name")).toBe("network3");
    });

    it("deletes, sets default and renames a network", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.privateNetworks.delete("net-uuid");
        await client.network.privateNetworks.setDefault("net-uuid");
        await client.network.privateNetworks.rename("net-uuid", { name: "new name" });
        expect(requests[0]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/network/net-uuid",
        });
        expect(requests[1]).toMatchObject({
            method: "PUT",
            path: "/v1/network/network/net-uuid/default",
        });
        expect(requests[2]).toMatchObject({
            method: "PATCH",
            path: "/v1/network/network/net-uuid",
        });
        expect(JSON.parse(requests[2].body ?? "")).toStrictEqual({ name: "new name" });
    });
});

describe("FloatingIpResource", () => {
    it("lists floating IPs with filters", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.network.floatingIps.list({ billingAccountId: 1, vmUuid: "vm-uuid" });
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/network/ip_addresses" });
        expect(requests[0].query.get("billing_account_id")).toBe("1");
        expect(requests[0].query.get("vm_uuid")).toBe("vm-uuid");
    });

    it("creates a floating IP with a JSON body", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.floatingIps.create({ billingAccountId: 2, name: "my_ip" });
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/network/ip_addresses/" });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            billing_account_id: 2,
            name: "my_ip",
        });
    });

    it("gets, modifies and deletes a floating IP", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.floatingIps.get("1.1.1.1");
        await client.network.floatingIps.modify("1.1.1.1", { name: "renamed" });
        await client.network.floatingIps.delete("1.1.1.1");
        expect(requests.map((request) => request.path)).toStrictEqual([
            "/v1/network/ip_addresses/1.1.1.1",
            "/v1/network/ip_addresses/1.1.1.1",
            "/v1/network/ip_addresses/1.1.1.1",
        ]);
        expect(requests.map((request) => request.method)).toStrictEqual(["GET", "PATCH", "DELETE"]);
    });

    it("assigns and unassigns a floating IP", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.floatingIps.assign("1.1.1.1", {
            assignedTo: "vm-uuid",
            assignedToResourceType: "virtual_machine",
        });
        await client.network.floatingIps.unassign("1.1.1.1");
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/network/ip_addresses/1.1.1.1/assign",
        });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            assigned_to: "vm-uuid",
            assigned_to_resource_type: "virtual_machine",
        });
        expect(requests[1]).toMatchObject({
            method: "POST",
            path: "/v1/network/ip_addresses/1.1.1.1/unassign",
        });
    });
});

describe("FirewallResource", () => {
    const rule: FirewallRule = {
        protocol: "tcp",
        direction: "inbound",
        port_start: 3306,
        port_end: 3306,
        endpoint_spec_type: "ip_prefixes",
        endpoint_spec: ["10.0.0.0/24"],
    };

    it("lists and creates firewalls", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.firewalls.list();
        await client.network.firewalls.create({
            displayName: "DB Firewall",
            billingAccountId: 123,
            rules: [rule],
        });
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/network/firewalls" });
        expect(requests[1]).toMatchObject({ method: "POST", path: "/v1/network/firewalls" });
        expect(JSON.parse(requests[1].body ?? "")).toStrictEqual({
            display_name: "DB Firewall",
            billing_account_id: 123,
            rules: [rule],
        });
    });

    it("updates and deletes a firewall", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.firewalls.update("fw-uuid", { name: "Renamed", rules: [rule] });
        await client.network.firewalls.delete("fw-uuid");
        expect(requests[0]).toMatchObject({ method: "PUT", path: "/v1/network/firewalls/fw-uuid" });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            name: "Renamed",
            rules: [rule],
        });
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/firewalls/fw-uuid",
        });
    });

    it("assigns and unassigns a firewall to a VM", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.network.firewalls.assignVm("fw-uuid", { vmUuid: "vm-uuid" });
        await client.network.firewalls.unassignVm("fw-uuid", { vmUuid: "vm-uuid" });
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/network/firewalls/fw-uuid/vms",
        });
        expect(requests[0].query.get("vm_uuid")).toBe("vm-uuid");
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/firewalls/fw-uuid/vms",
        });
    });
});

describe("LoadBalancerResource", () => {
    it("lists and gets load balancers", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.loadBalancers.list();
        await client.network.loadBalancers.get("lb-uuid");
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/network/load_balancers" });
        expect(requests[1]).toMatchObject({
            method: "GET",
            path: "/v1/network/load_balancers/lb-uuid",
        });
    });

    it("creates a load balancer with mapped rules and targets", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.loadBalancers.create({
            displayName: "my LB",
            billingAccountId: 12,
            networkUuid: "net-uuid",
            reservePublicIp: true,
            rules: [{ sourcePort: 8080, targetPort: 80 }],
            targets: [{ targetUuid: "vm-uuid", targetType: "vm" }],
        });
        expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/network/load_balancers" });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            display_name: "my LB",
            billing_account_id: 12,
            network_uuid: "net-uuid",
            reserve_public_ip: true,
            rules: [{ source_port: 8080, target_port: 80 }],
            targets: [{ target_uuid: "vm-uuid", target_type: "vm" }],
        });
    });

    it("renames and deletes a load balancer", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.loadBalancers.rename("lb-uuid", { displayName: "new name" });
        await client.network.loadBalancers.delete("lb-uuid");
        expect(requests[0]).toMatchObject({
            method: "PATCH",
            path: "/v1/network/load_balancers/lb-uuid",
        });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({ display_name: "new name" });
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/load_balancers/lb-uuid",
        });
    });

    it("manages targets", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.loadBalancers.addTarget("lb-uuid", {
            targetUuid: "vm-uuid",
            targetType: "vm",
        });
        await client.network.loadBalancers.removeTarget("lb-uuid", "vm-uuid");
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/network/load_balancers/lb-uuid/targets",
        });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            target_uuid: "vm-uuid",
            target_type: "vm",
        });
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/load_balancers/lb-uuid/targets/vm-uuid",
        });
    });

    it("manages forwarding rules and billing account", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.network.loadBalancers.addForwardingRule("lb-uuid", {
            sourcePort: 8080,
            targetPort: 80,
        });
        await client.network.loadBalancers.removeForwardingRule("lb-uuid", "rule-uuid");
        await client.network.loadBalancers.setBillingAccount("lb-uuid", { billingAccountId: 42 });
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/network/load_balancers/lb-uuid/forwarding_rules",
        });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            source_port: 8080,
            target_port: 80,
        });
        expect(requests[1]).toMatchObject({
            method: "DELETE",
            path: "/v1/network/load_balancers/lb-uuid/forwarding_rules/rule-uuid",
        });
        expect(requests[2]).toMatchObject({
            method: "PUT",
            path: "/v1/network/load_balancers/lb-uuid/billing_account",
        });
        expect(JSON.parse(requests[2].body ?? "")).toStrictEqual({ set_id: 42 });
    });
});
