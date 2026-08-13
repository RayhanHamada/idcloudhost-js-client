import type { FormValue } from "../client";
import type { SuccessResponse } from "../types";
import { BaseResource } from "./base";

export interface EligiblePromotion {
    credit_type: string;
    amount: number;
    top_up_requirement: number;
    top_up_done: number;
}

export interface RunningTotals {
    credit_amount: number;
    credit_available: number;
    discount_amount: number;
    ongoing: number;
    subtotal: number;
    total: number;
    vat_tax: number;
}

export interface PrimaryCard {
    id: string;
    expire_month: number;
    expire_year: number;
    last4: string;
    card_type: string;
    card_holder: string;
    type: string;
    processor_data: Record<string, unknown>;
    is_verified: boolean;
}

export interface BillingAccount {
    additional_data?: string;
    address_line1?: string;
    allow_debt?: boolean;
    can_pay?: boolean;
    city?: string;
    company_name?: string;
    company_reg_code?: string;
    company_vat_number?: string;
    country?: string;
    county?: string;
    created?: number;
    credit_amount?: number;
    discount_percentage?: number;
    eligible_promotions?: EligiblePromotion[];
    email?: string;
    id?: number;
    is_active?: boolean;
    is_default?: boolean;
    is_deleted?: boolean;
    is_recurring_payment_enabled?: boolean;
    paying_by_invoice?: boolean;
    post_index?: string;
    primary_card?: PrimaryCard;
    recurring_payment_amount?: number;
    recurring_payment_threshold?: number;
    referral_share_code?: string;
    reseller?: string;
    restriction_level?: string;
    running_totals?: RunningTotals;
    send_invoice_email?: boolean;
    site?: string;
    suspend_reason?: string;
    title?: string;
    unpaid_amount?: number;
    user_id?: number;
    vat_percentage?: number;
}

export interface RecurringPaymentResult {
    payment_report: {
        triggered: boolean;
        errors: unknown[];
    };
    account: BillingAccount;
}

export interface PaymentMethod {
    additional_data?: string;
    billing_account_id?: number;
    billing_account_processor_identifier_id?: number;
    created?: number;
    id?: number;
    identifier?: string;
    is_primary?: boolean;
    is_verified?: boolean;
    is_deleted?: boolean;
    valid_thru?: number;
}

export interface CreditRecord {
    amount: number;
    billing_account_id: number;
    created: number;
    description: string;
    id: number;
}

export interface InvoiceRecord {
    amount: number;
    created: number;
    descr: string;
    id: number;
    invoice_id: number;
    item_price: number;
    location_slug: string;
    name: string;
    qty: number;
    qty_unit: string;
}

export interface InvoiceTotals {
    subtotal: number;
    discount_amount: number;
    credit: number;
    vat_tax: number;
    total: number;
}

export interface InvoiceTransaction {
    additional_data?: string;
    amount: number;
    created: number;
    id: number;
    identifier: string;
    payment_object_id: number;
}

export interface Invoice {
    account_snapshot?: string;
    billing_account_id: number;
    created: number;
    discount_percentage: number;
    due_date: number;
    id: number;
    name?: string;
    padded_id: string;
    period_end: number;
    period_start: number;
    records_list: InvoiceRecord[];
    /** Invoice status code: 5 = unpaid, 10 = paid. */
    status: number;
    totals: InvoiceTotals;
    transaction_list: InvoiceTransaction[];
    vat_percentage: number;
}

export interface PayAmountResult {
    amount_left: number;
    amount_used: number;
    error_log: string;
    message: string;
    paid_invoices: number[];
    success: boolean;
}

export interface ListBillingAccountsParams {
    /** When set, deleted accounts are included as well. */
    showShadow?: boolean;
}

export interface UpdateBillingAccountParams {
    billingAccountId: number;
    /**
     * Account fields to update, using the API's snake_case field names. All
     * existing fields must be passed along, otherwise they will be deleted
     * (the e-mail field cannot be deleted).
     */
    account: Record<string, FormValue>;
}

export interface ConfigureRecurringPaymentParams {
    isRecurringPaymentEnabled: boolean;
    recurringPaymentAmount: number;
    recurringPaymentThreshold: number;
}

/**
 * Payment endpoints: billing accounts, credit cards, credit and invoices.
 */
export class PaymentResource extends BaseResource {
    /** Lists the billing accounts attached to the user. */
    listBillingAccounts(params: ListBillingAccountsParams = {}): Promise<BillingAccount[]> {
        return this.client.request<BillingAccount[]>("GET", "payment/billing_account/list", {
            query: { show_shadow: params.showShadow },
        });
    }

    /** Gets a billing account's detailed data. */
    getBillingAccount(params: { billingAccountId: number }): Promise<BillingAccount> {
        return this.client.request<BillingAccount>("GET", "payment/billing_account", {
            query: { billing_account_id: params.billingAccountId },
        });
    }

    /**
     * Updates a billing account's data. All existing data fields must be passed
     * along as well, otherwise they will be deleted (the e-mail field cannot be
     * deleted). Recurring payment configuration is handled by a separate endpoint.
     */
    updateBillingAccount(params: UpdateBillingAccountParams): Promise<BillingAccount> {
        return this.client.request<BillingAccount>("PUT", "payment/billing_account", {
            form: {
                billing_account_id: params.billingAccountId,
                ...params.account,
            },
        });
    }

    /** Deletes a billing account. */
    deleteBillingAccount(params: { billingAccountId: number }): Promise<unknown> {
        return this.client.request<unknown>("DELETE", "payment/billing_account", {
            form: { billing_account_id: params.billingAccountId },
        });
    }

    /** Sets a billing account as the default account. */
    setDefaultBillingAccount(params: { billingAccountId: number }): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("POST", "payment/billing_account/set_default", {
            form: { billing_account_id: params.billingAccountId },
        });
    }

    /** Gets a billing account's unpaid total amount (VAT included). */
    getUnpaidAmount(params: { billingAccountId: number }): Promise<{ message: number }> {
        return this.client.request<{ message: number }>(
            "GET",
            "payment/billing_account/unpaid_amount",
            { query: { billing_account_id: params.billingAccountId } }
        );
    }

    /**
     * Configures recurring payment for a billing account. The account needs a
     * payment method capable of automated payments (e.g. a credit card).
     */
    configureRecurringPayment(
        billingAccountId: number,
        params: ConfigureRecurringPaymentParams
    ): Promise<RecurringPaymentResult> {
        return this.client.request<RecurringPaymentResult>(
            "PUT",
            `payment/billing_account/${billingAccountId}/recurring_payment`,
            {
                form: {
                    is_recurring_payment_enabled: params.isRecurringPaymentEnabled,
                    recurring_payment_amount: params.recurringPaymentAmount,
                    recurring_payment_threshold: params.recurringPaymentThreshold,
                },
            }
        );
    }

    /**
     * Applies for the "paying by invoice" payment method. It stays unverified
     * until an admin verifies it.
     */
    applyForInvoicePayment(params: { billingAccountId: number }): Promise<PaymentMethod> {
        return this.client.request<PaymentMethod>("POST", "payment/apply_for_invoice_payment", {
            form: { billing_account_id: params.billingAccountId },
        });
    }

    /** Lists the credit cards attached to a billing account. */
    listCards(params: { billingAccountId: number }): Promise<PaymentMethod[]> {
        return this.client.request<PaymentMethod[]>("GET", "payment/card/list", {
            query: { billing_account_id: params.billingAccountId },
        });
    }

    /** Gets payment method (card) details. */
    getCard(params: { paymentObjectId: number }): Promise<PaymentMethod> {
        return this.client.request<PaymentMethod>("GET", "payment/card", {
            query: { payment_object_id: params.paymentObjectId },
        });
    }

    /** Adds a new credit card using a payment processor token. */
    addCard(params: { billingAccountId: number; token: string }): Promise<PaymentMethod> {
        return this.client.request<PaymentMethod>("POST", "payment/card", {
            form: {
                billing_account_id: params.billingAccountId,
                token: params.token,
            },
        });
    }

    /** Removes a credit card. */
    removeCard(params: { paymentObjectId: number }): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("DELETE", "payment/card", {
            form: { payment_object_id: params.paymentObjectId },
        });
    }

    /** Sets a credit card as primary. Throws if the card is not validated. */
    setCardPrimary(params: { paymentObjectId: number }): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("PUT", "payment/card/set_primary", {
            form: { payment_object_id: params.paymentObjectId },
        });
    }

    /** Lists a billing account's credit records. */
    listCredit(params: { billingAccountId: number }): Promise<CreditRecord[]> {
        return this.client.request<CreditRecord[]>("GET", "payment/credit/list", {
            query: { billing_account_id: params.billingAccountId },
        });
    }

    /** Buys credit for a billing account using the specified credit card. */
    buyCredit(params: {
        billingAccountId: number;
        paymentObjectId: number;
        amount: number;
    }): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("POST", "payment/credit/buy", {
            form: {
                billing_account_id: params.billingAccountId,
                payment_object_id: params.paymentObjectId,
                amount: params.amount,
            },
        });
    }

    /**
     * Requests an invoice for a credit top up via manual bank transfer. The
     * invoice is generated and sent to the billing account's e-mail address.
     */
    requestCreditInvoice(params: {
        billingAccountId: number;
        amount: number;
    }): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("POST", "payment/credit/request_invoice", {
            form: {
                billing_account_id: params.billingAccountId,
                amount: params.amount,
            },
        });
    }

    /** Lists a billing account's invoices. */
    listInvoices(params: { billingAccountId: number }): Promise<Invoice[]> {
        return this.client.request<Invoice[]>("GET", "payment/invoice/list", {
            query: { billing_account_id: params.billingAccountId },
        });
    }

    /** Gets invoice details. */
    getInvoice(params: { invoiceId: number }): Promise<Invoice> {
        return this.client.request<Invoice>("GET", "payment/invoice", {
            query: { invoice_id: params.invoiceId },
        });
    }

    /** Pays all of a billing account's unpaid invoices, oldest first. */
    payAll(params: { billingAccountId: number }): Promise<unknown> {
        return this.client.request<unknown>("POST", "payment/pay_all", {
            form: { billing_account_id: params.billingAccountId },
        });
    }

    /** Pays the given amount against the oldest unpaid invoices. */
    payAmount(params: { billingAccountId: number; amount: number }): Promise<PayAmountResult> {
        return this.client.request<PayAmountResult>("POST", "payment/pay_amount", {
            form: {
                billing_account_id: params.billingAccountId,
                amount: params.amount,
            },
        });
    }

    /** Pays the invoice specified by ID. */
    payInvoice(params: { invoiceId: number }): Promise<unknown> {
        return this.client.request<unknown>("POST", "payment/pay_invoice", {
            form: { invoice_id: params.invoiceId },
        });
    }

    /** Checks whether there are any active campaigns. */
    hasActiveCampaigns(): Promise<SuccessResponse> {
        return this.client.request<SuccessResponse>("GET", "payment/has_active_campaigns");
    }
}
