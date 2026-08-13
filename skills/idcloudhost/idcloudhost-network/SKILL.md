---
name: idcloudhost-network
description: "Use when working with IDCloudHost networking — private networks, floating IPs, firewalls, and load balancers (CRUD, assignment, targets, forwarding rules). All endpoints are location-specific. See the idcloudhost skill for client setup and error handling."
---

# IDCloudHost networking

All networking endpoints are location-specific. Set the location via `new IdCloudHostClient({ location })` or `client.withLocation(slug)`.

## Private networks — `client.network.privateNetworks`

```ts
const networks = await client.network.privateNetworks.list(); // [{ uuid, name, subnet, vlan_id, vm_uuids, resources_count, is_default }]
const net = await client.network.privateNetworks.create({ name: "lan" }); // first network becomes default
await client.network.privateNetworks.get(net.uuid);
await client.network.privateNetworks.rename(net.uuid, { name: "new-lan" });
await client.network.privateNetworks.setDefault(net.uuid);
await client.network.privateNetworks.delete(net.uuid); // must be empty and NOT the default
```

Reference the network when creating a VM via `networkUuid` in `vm.create`.

## Floating IPs — `client.network.floatingIps`

```ts
const ips = await client.network.floatingIps.list({ billingAccountId: 123, vmUuid: vm.uuid });
const ip = await client.network.floatingIps.create({ billingAccountId: 123, name: "web-ip" });
await client.network.floatingIps.get(ip.address); // by public IPv4 address
await client.network.floatingIps.assign(ip.address, {
    assignedTo: vm.uuid,
    assignedToResourceType: "virtual_machine", // | "service" | "load_balancer"
});
await client.network.floatingIps.unassign(ip.address);
await client.network.floatingIps.modify(ip.address, { name: "renamed" });
await client.network.floatingIps.delete(ip.address);
```

## Firewalls — `client.network.firewalls`

Rules are modeled as:

```ts
interface FirewallRule {
    uuid?: string;
    protocol: "tcp" | "udp" | "icmp" | string;
    direction: "inbound" | "outbound";
    port_start: number | null; // null = all ports
    port_end: number | null; // null = same as port_start
    endpoint_spec_type: "any" | "ip_prefixes";
    endpoint_spec?: string[]; // CIDRs; required for "ip_prefixes"
}
```

```ts
const fw = await client.network.firewalls.create({
    displayName: "web-firewall",
    billingAccountId: 123,
    rules: [
        { protocol: "tcp", direction: "inbound", port_start: 443, port_end: 443,
          endpoint_spec_type: "ip_prefixes", endpoint_spec: ["0.0.0.0/0"] },
        { protocol: "tcp", direction: "inbound", port_start: 22, port_end: null,
          endpoint_spec_type: "any" },
    ],
});

await client.network.firewalls.assignVm(fw.uuid, { vmUuid: vm.uuid });
await client.network.firewalls.unassignVm(fw.uuid, { vmUuid: vm.uuid });
await client.network.firewalls.update(fw.uuid, { name: "...", description: "...", rules: [...] }); // replaces rules
await client.network.firewalls.delete(fw.uuid);
```

## Load balancers — `client.network.loadBalancers`

```ts
const lb = await client.network.loadBalancers.create({
    displayName: "web-lb",
    billingAccountId: 123,
    networkUuid: net.uuid,
    reservePublicIp: true, // assign a public IPv4
    rules: [{ sourcePort: 443, targetPort: 8443 }],
    targets: [{ targetUuid: vm.uuid, targetType: "vm" }],
});

await client.network.loadBalancers.get(lb.uuid);
await client.network.loadBalancers.rename(lb.uuid, { displayName: "new-name" });

// Targets
await client.network.loadBalancers.addTarget(lb.uuid, { targetUuid: vm2.uuid, targetType: "vm" });
await client.network.loadBalancers.removeTarget(lb.uuid, vm2.uuid);

// Forwarding rules
const rule = await client.network.loadBalancers.addForwardingRule(lb.uuid, {
    sourcePort: 80,
    targetPort: 8080,
});
await client.network.loadBalancers.removeForwardingRule(lb.uuid, rule.uuid);

// Billing
await client.network.loadBalancers.setBillingAccount(lb.uuid, { billingAccountId: 456 });

await client.network.loadBalancers.delete(lb.uuid);
```

## Gotchas

- Network and firewall endpoints send `application/json`; the SDK accepts camelCase params and maps them to snake_case fields internally.
- Deleting a default private network or one with attached resources fails.
- A floating IP is identified by its public IPv4 address (`ip.address`), not a UUID.
- Updating a firewall replaces the whole rule set — pass all desired rules.
