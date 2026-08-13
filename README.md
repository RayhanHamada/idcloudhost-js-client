# idcloudhost-js-client

TypeScript SDK for the [IDCloudHost API](https://api.idcloudhost.com/). Zero runtime dependencies — it uses the platform's native `fetch`.

## Install

```sh
bun add idcloudhost-js-client
# npm install idcloudhost-js-client
# pnpm add idcloudhost-js-client
```

## Quickstart

```ts
import { IdCloudHostClient, waitForVmStatus } from "idcloudhost-js-client";

const client = new IdCloudHostClient({ apiKey: process.env.IDCLOUDHOST_API_KEY });

// Locations
const locations = await client.config.listLocations();

// List VMs in the default location
const vms = await client.vm.list();

// Create a VM
const vm = await client.vm.create({
    name: "web-server",
    osName: "ubuntu",
    osVersion: "24.04",
    vcpu: 2,
    ram: 2048,
    disks: 40,
    username: "root",
    password: "Secret1234",
});

// Wait for the VM to stop
await client.vm.stop(vm.uuid, { force: true });
await waitForVmStatus(client.vm, vm.uuid, "stopped");

// Location-scoped operations
const jkt = client.withLocation("jkt01");
const jktVms = await jkt.vm.list();
```

## Authentication

The API key is sent in the `apikey` header of every request:

```ts
const client = new IdCloudHostClient({ apiKey: "meowmeowmeow" });
```

## Locations

Location-specific resources (VMs, block storage, networks, floating IPs, firewalls, load balancers, billing resources) are addressed through a location slug. By default the API's default location is used. Target a specific location with `withLocation`:

```ts
const client = new IdCloudHostClient({ apiKey: "..." });
const bus02 = client.withLocation("bus02");

await bus02.vm.list(); // GET /v1/bus02/user-resource/vm/list
await client.vm.list(); // GET /v1/user-resource/vm/list
```

## Errors

Failed requests throw an `IdCloudHostError` with the HTTP status, the parsed body and the API's `errors` object:

```ts
import { IdCloudHostError } from "idcloudhost-js-client";

try {
    await client.vm.get("nope");
} catch (error) {
    if (error instanceof IdCloudHostError) {
        console.error(error.status, error.errors);
    }
}
```

## API coverage

| Namespace | Resources |
| --- | --- |
| `client.config` | locations, VM parameters, VM images (plain OS / app catalog), boot images, pricing policy |
| `client.user` | user info, profile, SSH keys |
| `client.token` | API token CRUD |
| `client.vm` | list/get/create/modify/delete, start/stop, change password, reinstall, rebuild, clone, auto backup, host pools, replicas, boot ISO media, attached disks |
| `client.storage.disks` | block storage disks CRUD, attach/detach |
| `client.storage.buckets` | S3 buckets CRUD, S3 API info, S3 keys |
| `client.network.privateNetworks` | private network CRUD, default, rename |
| `client.network.floatingIps` | floating IP CRUD, assign/unassign |
| `client.network.firewalls` | firewall CRUD, assign/unassign to VMs |
| `client.network.loadBalancers` | load balancer CRUD, targets, forwarding rules, billing account |
| `client.billing` | billing account resources, resource billing configuration |
| `client.payment` | billing accounts, credit cards, credit, invoices, payments, campaigns |
| `client.charging` | resource usage |
| `client.services` | managed service packages, secrets, whitelists |

## Waiting for async operations

VM operations like start, stop and reinstall are asynchronous. Poll with `waitFor` / `waitForVmStatus`:

```ts
import { waitFor, waitForVmStatus } from "idcloudhost-js-client";

await client.vm.start(vm.uuid);
await waitForVmStatus(client.vm, vm.uuid, "running", {
    timeoutMs: 300_000,
    intervalMs: 5_000,
});

const disk = await waitFor(
    () => client.storage.disks.get(diskUuid),
    (result) => result.status === "Active"
);
```

## Development

```sh
bun install
bun test          # vitest
bun run typecheck # tsc --noEmit
bun run check     # ultracite (oxlint + oxfmt check)
bun run build     # tsdown
```
