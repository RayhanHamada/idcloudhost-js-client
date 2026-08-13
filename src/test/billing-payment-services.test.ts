import { describe, expect, it } from "vitest";

import { createClient } from "./helpers";

describe("BillingResource", () => {
    it("lists a billing account's resources", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.billing.listResources({ id: 6, resourceType: "vm" });
        expect(requests[0]).toMatchObject({
            method: "GET",
            path: "/v1/user-resource/billing_resources",
        });
        expect(requests[0].query.get("id")).toBe("6");
        expect(requests[0].query.get("resource_type")).toBe("vm");
    });

    it("sets a resource's billing configuration", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.billing.setResourceBilling({ billingAccountId: 6, uuid: "vm-uuid" });
        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/resource_billing",
        });
        const form = new URLSearchParams(requests[0].body);
        expect(form.get("billing_account_id")).toBe("6");
        expect(form.get("uuid")).toBe("vm-uuid");
        expect(form.has("resource_type")).toBeFalsy();
    });
});

describe("ChargingResource", () => {
    it("gets resource usage", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.charging.getUsage({ billingAccountId: 6 });
        expect(requests[0]).toMatchObject({ method: "GET", path: "/v1/charging/usage" });
        expect(requests[0].query.get("billing_account_id")).toBe("6");
    });
});

describe("PaymentResource", () => {
    it("manages billing accounts", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.payment.listBillingAccounts({ showShadow: true });
        await client.payment.getBillingAccount({ billingAccountId: 6 });
        await client.payment.updateBillingAccount({
            billingAccountId: 6,
            account: { title: "konto", email: "user@example.com" },
        });
        await client.payment.deleteBillingAccount({ billingAccountId: 6 });
        await client.payment.setDefaultBillingAccount({ billingAccountId: 6 });
        await client.payment.getUnpaidAmount({ billingAccountId: 6 });

        expect(requests.map((request) => `${request.method} ${request.path}`)).toStrictEqual([
            "GET /v1/payment/billing_account/list",
            "GET /v1/payment/billing_account",
            "PUT /v1/payment/billing_account",
            "DELETE /v1/payment/billing_account",
            "POST /v1/payment/billing_account/set_default",
            "GET /v1/payment/billing_account/unpaid_amount",
        ]);
        expect({
            show_shadow: requests[0].query.get("show_shadow"),
            billing_account_id: requests[1].query.get("billing_account_id"),
        }).toStrictEqual({ show_shadow: "true", billing_account_id: "6" });
        const form = new URLSearchParams(requests[2].body);
        expect({
            billing_account_id: form.get("billing_account_id"),
            title: form.get("title"),
        }).toStrictEqual({ billing_account_id: "6", title: "konto" });
    });

    it("configures recurring payment and applies for invoice paying", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.payment.configureRecurringPayment(6, {
            isRecurringPaymentEnabled: true,
            recurringPaymentAmount: 52,
            recurringPaymentThreshold: 55,
        });
        await client.payment.applyForInvoicePayment({ billingAccountId: 6 });
        expect(requests[0]).toMatchObject({
            method: "PUT",
            path: "/v1/payment/billing_account/6/recurring_payment",
        });
        const form = new URLSearchParams(requests[0].body);
        expect(form.get("is_recurring_payment_enabled")).toBe("true");
        expect(form.get("recurring_payment_amount")).toBe("52");
        expect(requests[1]).toMatchObject({
            method: "POST",
            path: "/v1/payment/apply_for_invoice_payment",
        });
    });

    it("manages credit cards", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.payment.listCards({ billingAccountId: 6 });
        await client.payment.getCard({ paymentObjectId: 6 });
        await client.payment.addCard({ billingAccountId: 6, token: "tok" });
        await client.payment.removeCard({ paymentObjectId: 6 });
        await client.payment.setCardPrimary({ paymentObjectId: 6 });
        expect(requests.map((request) => `${request.method} ${request.path}`)).toStrictEqual([
            "GET /v1/payment/card/list",
            "GET /v1/payment/card",
            "POST /v1/payment/card",
            "DELETE /v1/payment/card",
            "PUT /v1/payment/card/set_primary",
        ]);
        expect(new URLSearchParams(requests[3].body).get("payment_object_id")).toBe("6");
    });

    it("manages credit and invoices", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.payment.listCredit({ billingAccountId: 6 });
        await client.payment.buyCredit({ billingAccountId: 6, paymentObjectId: 5, amount: 100 });
        await client.payment.requestCreditInvoice({ billingAccountId: 6, amount: 100 });
        await client.payment.listInvoices({ billingAccountId: 6 });
        await client.payment.getInvoice({ invoiceId: 1 });
        expect(requests.map((request) => `${request.method} ${request.path}`)).toStrictEqual([
            "GET /v1/payment/credit/list",
            "POST /v1/payment/credit/buy",
            "POST /v1/payment/credit/request_invoice",
            "GET /v1/payment/invoice/list",
            "GET /v1/payment/invoice",
        ]);
        expect(new URLSearchParams(requests[1].body).get("amount")).toBe("100");
    });

    it("pays invoices and checks campaigns", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.payment.payAll({ billingAccountId: 6 });
        await client.payment.payAmount({ billingAccountId: 6, amount: 10 });
        await client.payment.payInvoice({ invoiceId: 6 });
        await client.payment.hasActiveCampaigns();
        expect(requests.map((request) => `${request.method} ${request.path}`)).toStrictEqual([
            "POST /v1/payment/pay_all",
            "POST /v1/payment/pay_amount",
            "POST /v1/payment/pay_invoice",
            "GET /v1/payment/has_active_campaigns",
        ]);
    });
});

describe("ServicesResource", () => {
    it("creates, lists, gets and updates service packages", async () => {
        const { client, requests } = createClient(() => ({ body: {} }));
        await client.services.create({
            billingAccountId: 12,
            service: "postgresql",
            version: "14.0",
            displayName: "My Postgre",
            vmCpu: 2,
            vmRam: 4096,
            vmDiskGb: 40,
            packageParameters: '{"location":"jkt01"}',
            isMultiNode: true,
        });
        await client.services.list();
        await client.services.get("pkg-uuid");
        await client.services.update("pkg-uuid", { displayName: "New name" });
        await client.services.getSecrets("pkg-uuid");
        await client.services.delete("pkg-uuid");

        expect(requests[0]).toMatchObject({
            method: "POST",
            path: "/v1/user-resource/service/package",
        });
        expect(JSON.parse(requests[0].body ?? "")).toStrictEqual({
            billing_account_id: 12,
            service: "postgresql",
            version: "14.0",
            display_name: "My Postgre",
            vm_cpu: 2,
            vm_ram: 4096,
            vm_disk_gb: 40,
            package_parameters: '{"location":"jkt01"}',
            is_multi_node: true,
        });
        expect(
            requests.slice(1).map((request) => `${request.method} ${request.path}`)
        ).toStrictEqual([
            "GET /v1/user-resource/service/packages",
            "GET /v1/user-resource/service/package/pkg-uuid",
            "PATCH /v1/user-resource/service/package/pkg-uuid",
            "GET /v1/user-resource/service/package/pkg-uuid/secrets",
            "DELETE /v1/user-resource/service/package/pkg-uuid",
        ]);
    });

    it("manages the service whitelist", async () => {
        const { client, requests } = createClient(() => ({ body: [] }));
        await client.services.listWhitelist("pkg-uuid");
        await client.services.addWhitelistEntry("pkg-uuid", { ipAddress: "1.2.3.0/24" });
        await client.services.removeWhitelistEntry("pkg-uuid", { ipAddress: "1.2.3.0/24" });
        expect(requests.map((request) => request.path)).toStrictEqual([
            "/v1/user-resource/service/package/pkg-uuid/whitelist_addresses",
            "/v1/user-resource/service/package/pkg-uuid/whitelist_addresses",
            "/v1/user-resource/service/package/pkg-uuid/whitelist_addresses",
        ]);
        expect(requests.map((request) => request.method)).toStrictEqual(["GET", "POST", "DELETE"]);
        expect(new URLSearchParams(requests[1].body).get("ip_address")).toBe("1.2.3.0/24");
    });
});
