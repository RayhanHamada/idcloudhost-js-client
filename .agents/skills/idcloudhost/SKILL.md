---
name: idcloudhost
description: Use when writing code against the idcloudhost-js-client SDK (IDCloudHost cloud API) — client setup, authentication, locations, error handling, waiting for async VM operations, or when unsure which resource namespace to use. Load the focused skills (idcloudhost-vm, idcloudhost-network, idcloudhost-storage, idcloudhost-billing) for domain-specific operations.
---

# idcloudhost-js-client

TypeScript SDK for the [IDCloudHost API](https://api.idcloudhost.com/). Zero runtime dependencies (native `fetch`). Unofficial, AI-generated client — verify endpoints against the official docs when debugging API mismatches.

## When to use

Use when the user asks to provision, query, modify or destroy IDCloudHost cloud resources from TypeScript/JavaScript: VMs, disks, S3 buckets, networks, floating IPs, firewalls, load balancers, billing accounts, payments, or managed services.

## Install

```sh
bun add idcloudhost-js-client   # or: npm install idcloudhost-js-client
```

ESM only (`import { ... } from "idcloudhost-js-client"`).

## Client setup

```ts
import { IdCloudHostClient } from "idcloudhost-js-client";

const client = new IdCloudHostClient({
    apiKey: process.env.IDCLOUDHOST_API_KEY, // sent as `apikey` header on every request
    baseUrl: "https://api.idcloudhost.com", // optional, this is the default
    location: "jkt01", // optional location slug
    headers: { "x-request-id": "abc-123" }, // optional extra headers (apikey wins)
});
```

## Locations

Location-scoped resources (VM, disks, private networks, floating IPs, firewalls, load balancers, billing resources) are routed as `/v1/{location}/...` when a location is set, otherwise `/v1/...` (API default location).

```ts
const bus02 = client.withLocation("bus02"); // returns a NEW client bound to bus02
await bus02.vm.list(); // GET /v1/bus02/user-resource/vm/list
await client.vm.list(); // GET /v1/user-resource/vm/list

const locations = await client.config.listLocations(); // { slug, display_name, is_default, ... }[]
```

## Namespace map

| Namespace | Purpose | Skill |
| --- | --- | --- |
| `client.vm` | Virtual machines: CRUD, start/stop, reinstall, rebuild, clone, replicas, disks, boot ISO | idcloudhost-vm |
| `client.storage.disks` | Block storage disks: CRUD, attach/detach | idcloudhost-storage |
| `client.storage.buckets` | S3 buckets + S3 keys (global, not location-scoped) | idcloudhost-storage |
| `client.network.privateNetworks` | Private networks | idcloudhost-network |
| `client.network.floatingIps` | Floating IPs | idcloudhost-network |
| `client.network.firewalls` | Firewalls + VM assignment | idcloudhost-network |
| `client.network.loadBalancers` | Load balancers, targets, forwarding rules | idcloudhost-network |
| `client.config` | Locations, VM params, images, boot ISOs, pricing | this skill |
| `client.user` | User info, profile, SSH keys | this skill |
| `client.token` | API token CRUD | this skill |
| `client.billing` | Billing account resource associations | idcloudhost-billing |
| `client.payment` | Billing accounts, cards, credit, invoices | idcloudhost-billing |
| `client.charging` | Monthly resource usage | idcloudhost-billing |
| `client.services` | Managed services (postgres, mariadb...), whitelists | idcloudhost-billing |

## Error handling

Non-2xx responses throw `IdCloudHostError` carrying `status`, `body`, and the API `errors` object:

```ts
import { IdCloudHostError } from "idcloudhost-js-client";

try {
    await client.vm.get("nope");
} catch (error) {
    if (error instanceof IdCloudHostError) {
        console.error(error.status, error.errors); // e.g. 404 { uuid: "VM not found" }
    }
}
```

Always catch this error type when writing SDK-consuming code; the message is the first error string from the API's `{"errors": {...}}` body.

## Waiting for async operations

VM start/stop/reinstall and disk attach are asynchronous. Poll:

```ts
import { waitFor, waitForVmStatus, WaitTimeoutError } from "idcloudhost-js-client";

await client.vm.start(uuid);
await waitForVmStatus(client.vm, uuid, "running", { timeoutMs: 300_000, intervalMs: 5_000 });

const disk = await waitFor(
    () => client.storage.disks.get(diskUuid),
    (d) => d.status === "Active"
);
```

Defaults: `timeoutMs` = 300000 (5 min), `intervalMs` = 5000. Timeout throws `WaitTimeoutError`.

## Config namespace

```ts
const locations = await client.config.listLocations();
const params = await client.config.getVmParameters(); // constraint, min/max, values per parameter
const images = await client.config.listVmImages(); // all Compute images
const os = await client.config.listPlainOsImages(); // plain OS only
const apps = await client.config.listAppCatalogImages(); // app catalog only
const isos = await client.config.listBootImages(); // bootable ISO media
const pricing = await client.config.getPricingPolicy(); // { policy: PricingPolicyItem[] }
```

Use `getVmParameters()` to validate vcpu/ram limits before creating a VM.

## User and tokens

```ts
const me = await client.user.get();
await client.user.updateProfile({
    firstName: "Ada",
    lastName: "Lovelace",
    phoneNumber: "...",
    personalIdNumber: "...",
});

const key = await client.user.createSshKey({ name: "laptop", publicKey: "ssh-ed25519 AAAA..." });
await client.user.listSshKeys();
await client.user.renameSshKey(key.uuid, { name: "work" });
await client.user.deleteSshKey(key.uuid);

await client.token.list();
await client.token.create({ description: "ci", restricted: true, billingAccountId: 123 });
await client.token.update({ tokenId: 1, description: "updated", restricted: false });
await client.token.delete({ tokenId: 1 });
```

## Raw requests for uncovered endpoints

```ts
// request<T>(method, path, { query?, form?, json? }) — path is relative to /v1[/{location}]
await client.request("GET", "user-resource/vm/list", { query: { page: 2 } });
await client.request("POST", "user-resource/vm", { form: { name: "x", vcpu: 1, ram: 1024 } }); // x-www-form-urlencoded
await client.request("PATCH", "network/network/<uuid>", { json: { name: "new" } }); // application/json
```

Array form values are sent as repeated keys.

## Common workflow

```ts
import { IdCloudHostClient, waitForVmStatus } from "idcloudhost-js-client";

const client = new IdCloudHostClient({ apiKey: process.env.IDCLOUDHOST_API_KEY });
const vm = await client.vm.create({
    name: "web",
    osName: "ubuntu",
    osVersion: "24.04",
    vcpu: 2,
    ram: 2048,
    disks: 40,
    username: "root",
    password: "Secret1234",
});
await client.vm.start(vm.uuid);
await waitForVmStatus(client.vm, vm.uuid, "running");
// ... then tear down:
await client.vm.stop(vm.uuid, { force: true });
await waitForVmStatus(client.vm, vm.uuid, "stopped");
await client.vm.delete(vm.uuid);
```

## Gotchas

- `withLocation` returns a new client — it does not mutate the original.
- `billingAccountId` is required for many create operations when using a global (unrestricted) API token.
- Most write endpoints take `form` (urlencoded); network and service endpoints take `json`. The SDK handles this internally — just pass the typed params.
- `vm.releasePublicIp` / `vm.reservePublicIp` are deprecated; use `client.network.floatingIps`.
