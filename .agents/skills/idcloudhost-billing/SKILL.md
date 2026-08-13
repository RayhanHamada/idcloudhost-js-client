---
name: idcloudhost-billing
description: Use when working with IDCloudHost billing and finances — billing accounts, credit cards, credit top-ups, invoices and payments, monthly usage/charging data, resource-to-account association — or managed service packages (postgresql, mariadb) and their whitelists. See the idcloudhost skill for client setup and error handling.
---

# IDCloudHost billing, payment and managed services

Four namespaces:

- `client.billing` — resource ↔ billing account association (**location-specific**)
- `client.payment` — accounts, cards, credit, invoices (**global**)
- `client.charging` — monthly usage (**global**)
- `client.services` — managed services (**global** CRUD, **location-specific** whitelists)

## Billing account resource association — `client.billing`

```ts
const resources = await client.billing.listResources({ id: 123, resourceType: "vm" }); // default "vm"
await client.billing.setResourceBilling({ billingAccountId: 123, uuid: vm.uuid }); // move a resource
```

## Payment — `client.payment`

### Billing accounts

```ts
const accounts = await client.payment.listBillingAccounts({ showShadow: false }); // true includes deleted
const account = await client.payment.getBillingAccount({ billingAccountId: 123 });
await client.payment.getUnpaidAmount({ billingAccountId: 123 }); // { message: number } VAT included
await client.payment.setDefaultBillingAccount({ billingAccountId: 123 });

// WARNING: replaces all fields — pass the complete account or fields get deleted
// (the e-mail field cannot be deleted). Uses the API's snake_case field names.
await client.payment.updateBillingAccount({
    billingAccountId: 123,
    account: { city: "Jakarta", ...existing },
});

await client.payment.configureRecurringPayment(123, {
    isRecurringPaymentEnabled: true,
    recurringPaymentAmount: 100,
    recurringPaymentThreshold: 50, // auto top-up when credit drops below
});
await client.payment.applyForInvoicePayment({ billingAccountId: 123 }); // stays unverified until admin approves
await client.payment.deleteBillingAccount({ billingAccountId: 123 });
```

### Credit cards

```ts
const cards = await client.payment.listCards({ billingAccountId: 123 });
await client.payment.getCard({ paymentObjectId: 1 });
await client.payment.addCard({ billingAccountId: 123, token: "processor-token" }); // token from payment gateway
await client.payment.setCardPrimary({ paymentObjectId: 1 }); // throws unless card is validated
await client.payment.removeCard({ paymentObjectId: 1 });
```

### Credit

```ts
await client.payment.listCredit({ billingAccountId: 123 });
await client.payment.buyCredit({ billingAccountId: 123, paymentObjectId: 1, amount: 500 });
await client.payment.requestCreditInvoice({ billingAccountId: 123, amount: 500 }); // manual bank transfer
```

### Invoices and payments

```ts
const invoices = await client.payment.listInvoices({ billingAccountId: 123 });
// Invoice: { id, padded_id, status (5 = unpaid, 10 = paid), totals: { subtotal, discount_amount, credit, vat_tax, total }, records_list, transaction_list }
await client.payment.getInvoice({ invoiceId: invoices[0].id });
await client.payment.payInvoice({ invoiceId: invoices[0].id });
await client.payment.payAll({ billingAccountId: 123 }); // oldest unpaid first
await client.payment.payAmount({ billingAccountId: 123, amount: 250 }); // against oldest unpaid; returns PayAmountResult
await client.payment.hasActiveCampaigns();
```

## Usage — `client.charging`

```ts
const usage = await client.charging.getUsage({ billingAccountId: 123 });
// [{ billing_account_id, cost, price, price_unit, hours, owner_uuid, description, configurations, uptime_types }]
```

## Managed services — `client.services`

```ts
const svc = await client.services.create({
    billingAccountId: 123,
    service: "postgresql", // e.g. "postgresql", "mariadb"
    version: "14",
    displayName: "my-db",
    vmCpu: 1,
    vmRam: 1024, // MB
    vmDiskGb: 20,
    packageParameters: JSON.stringify({ location: "jkt01" }), // service-specific
    isMultiNode: false,
});

const packages = await client.services.list();
const one = await client.services.get(svc.uuid);
await client.services.update(svc.uuid, { displayName: "renamed", billingAccountId: 456 });
const secrets = await client.services.getSecrets(svc.uuid); // e.g. { password: "..." }

// Whitelist (location-specific): empty whitelist = no restrictions
await client.services.addWhitelistEntry(svc.uuid, { ipAddress: "203.0.113.10" });
await client.services.listWhitelist(svc.uuid);
await client.services.removeWhitelistEntry(svc.uuid, { ipAddress: "203.0.113.10" });

await client.services.delete(svc.uuid); // deletes package and its resources
```

## Gotchas

- `updateBillingAccount` is destructive: it overwrites the whole account object — always pass previously fetched fields.
- Credit card operations need a `token` obtained from the payment processor (e.g. Midtrans), not raw card numbers.
- Invoice `status` is numeric: 5 = unpaid, 10 = paid.
- Service whitelists accept single IPs or CIDR subnets.
