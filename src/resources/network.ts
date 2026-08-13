import type { IdCloudHostClient } from "../client";

export interface PrivateNetwork {
    vlan_id: number;
    subnet: string;
    subnet_ipv6: string;
    name: string;
    created_at: string;
    updated_at: string;
    uuid: string;
    type: string;
    is_default: boolean;
    vm_uuids: string[];
    resources_count: number;
}

export type FloatingIpResourceType = "virtual_machine" | "service" | "load_balancer";

export interface FloatingIp {
    id: number;
    address: string;
    user_id: number;
    billing_account_id: number;
    type: string;
    network_id: string | null;
    name: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    is_virtual: boolean;
    assigned_to: string | null;
    assigned_to_resource_type?: FloatingIpResourceType;
    assigned_to_private_ip?: string;
    unassigned_at?: string;
    uuid?: string;
}

export interface CreateFloatingIpParams {
    billingAccountId: number;
    name?: string;
}

export interface ModifyFloatingIpParams {
    billingAccountId?: number;
    name?: string;
}

export interface ListFloatingIpsParams {
    billingAccountId?: number;
    vmUuid?: string;
}

export interface AssignFloatingIpParams {
    assignedTo: string;
    assignedToResourceType: FloatingIpResourceType;
}

export type FirewallProtocol = "tcp" | "udp" | "icmp" | string;

export interface FirewallRule {
    uuid?: string;
    protocol: FirewallProtocol;
    direction: "inbound" | "outbound";
    /** Null denotes all ports. */
    port_start: number | null;
    /** Null implies it is equal to `port_start`. */
    port_end: number | null;
    endpoint_spec_type: "any" | "ip_prefixes";
    /** IP addresses or CIDR prefixes; required when `endpoint_spec_type` is `ip_prefixes`. */
    endpoint_spec?: string[];
}

export interface Firewall {
    uuid: string;
    name?: string;
    description?: string;
    display_name?: string;
    billing_account_id: number;
    rules: FirewallRule[];
    resources_assigned: FirewallAssignment[];
    created_at: string;
    deleted_at?: string | null;
    user_id?: number;
}

export interface FirewallAssignment {
    resource_type: string;
    resource_uuid: string;
}

export interface CreateFirewallParams {
    displayName: string;
    billingAccountId?: number;
    rules: FirewallRule[];
}

export interface UpdateFirewallParams {
    name?: string;
    description?: string;
    rules?: FirewallRule[];
}

export interface LoadBalancerForwardingRule {
    uuid?: string;
    protocol?: string;
    created_at?: string;
    source_port: number;
    target_port: number;
    settings?: {
        connection_limit?: number;
        session_persistence?: string;
    };
}

export interface LoadBalancerTarget {
    created_at?: string;
    target_uuid: string;
    target_type: string;
    target_ip_address?: string;
}

export interface LoadBalancer {
    uuid: string;
    display_name?: string;
    network_uuid: string;
    user_id: number;
    billing_account_id: number;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    private_address: string;
    forwarding_rules: LoadBalancerForwardingRule[];
    targets: LoadBalancerTarget[];
}

export interface CreateLoadBalancerParams {
    displayName?: string;
    billingAccountId?: number;
    networkUuid?: string;
    reservePublicIp?: boolean;
    rules?: { sourcePort: number; targetPort: number }[];
    targets?: { targetUuid: string; targetType: string }[];
}

export interface AddLoadBalancerTargetParams {
    targetUuid: string;
    targetType: string;
}

export interface AddLoadBalancerForwardingRuleParams {
    sourcePort: number;
    targetPort: number;
}

/**
 * Networking endpoints: private networks, floating IPs, firewalls and network
 * load balancers. All endpoints are location-specific.
 */
export class NetworkResource {
    readonly privateNetworks: PrivateNetworkResource;
    readonly floatingIps: FloatingIpResource;
    readonly firewalls: FirewallResource;
    readonly loadBalancers: LoadBalancerResource;

    constructor(client: IdCloudHostClient) {
        this.privateNetworks = new PrivateNetworkResource(client);
        this.floatingIps = new FloatingIpResource(client);
        this.firewalls = new FirewallResource(client);
        this.loadBalancers = new LoadBalancerResource(client);
    }
}

/**
 * Private networks. All endpoints are location-specific.
 */
export class PrivateNetworkResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists the user's networks with their resources. */
    list(): Promise<PrivateNetwork[]> {
        return this.client.request<PrivateNetwork[]>("GET", "network/networks");
    }

    /** Gets a network's data. */
    get(networkUuid: string): Promise<PrivateNetwork> {
        return this.client.request<PrivateNetwork>("GET", `network/network/${networkUuid}`);
    }

    /**
     * Creates a new private network. If it is the user's first network, it is set
     * as default.
     */
    create(params: { name?: string } = {}): Promise<PrivateNetwork> {
        return this.client.request<PrivateNetwork>("POST", "network/network", {
            query: { name: params.name },
        });
    }

    /** Deletes a network. It must be empty and not the default network. */
    delete(networkUuid: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", `network/network/${networkUuid}`);
    }

    /** Makes the network the default one for future resources. */
    setDefault(networkUuid: string): Promise<PrivateNetwork> {
        return this.client.request<PrivateNetwork>("PUT", `network/network/${networkUuid}/default`);
    }

    /** Renames a network. */
    rename(networkUuid: string, params: { name?: string } = {}): Promise<PrivateNetwork> {
        return this.client.request<PrivateNetwork>("PATCH", `network/network/${networkUuid}`, {
            json: { name: params.name },
        });
    }
}

/**
 * Floating IP addresses. All endpoints are location-specific.
 */
export class FloatingIpResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists floating IPs, optionally filtered by billing account or VM. */
    list(params: ListFloatingIpsParams = {}): Promise<FloatingIp[]> {
        return this.client.request<FloatingIp[]>("GET", "network/ip_addresses", {
            query: {
                billing_account_id: params.billingAccountId,
                vm_uuid: params.vmUuid,
            },
        });
    }

    /** Gets a floating IP by its public IPv4 address. */
    get(publicIpv4Address: string): Promise<FloatingIp> {
        return this.client.request<FloatingIp>("GET", `network/ip_addresses/${publicIpv4Address}`);
    }

    /** Creates a new floating IP. */
    create(params: CreateFloatingIpParams): Promise<FloatingIp> {
        return this.client.request<FloatingIp>("POST", "network/ip_addresses/", {
            json: {
                billing_account_id: params.billingAccountId,
                name: params.name,
            },
        });
    }

    /** Updates a floating IP. */
    modify(publicIpv4Address: string, params: ModifyFloatingIpParams = {}): Promise<FloatingIp> {
        return this.client.request<FloatingIp>(
            "PATCH",
            `network/ip_addresses/${publicIpv4Address}`,
            {
                json: {
                    billing_account_id: params.billingAccountId,
                    name: params.name,
                },
            }
        );
    }

    /** Deletes a floating IP. */
    delete(publicIpv4Address: string): Promise<undefined> {
        return this.client.request<undefined>(
            "DELETE",
            `network/ip_addresses/${publicIpv4Address}`
        );
    }

    /** Assigns a floating IP to a VM, service or load balancer. */
    assign(publicIpv4Address: string, params: AssignFloatingIpParams): Promise<FloatingIp> {
        return this.client.request<FloatingIp>(
            "POST",
            `network/ip_addresses/${publicIpv4Address}/assign`,
            {
                json: {
                    assigned_to: params.assignedTo,
                    assigned_to_resource_type: params.assignedToResourceType,
                },
            }
        );
    }

    /** Un-assigns a floating IP. */
    unassign(publicIpv4Address: string): Promise<FloatingIp> {
        return this.client.request<FloatingIp>(
            "POST",
            `network/ip_addresses/${publicIpv4Address}/unassign`
        );
    }
}

/**
 * Firewalls. All endpoints are location-specific.
 */
export class FirewallResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists the current user's firewalls. */
    list(): Promise<Firewall[]> {
        return this.client.request<Firewall[]>("GET", "network/firewalls");
    }

    /** Creates a new firewall with the given set of rules. */
    create(params: CreateFirewallParams): Promise<Firewall> {
        return this.client.request<Firewall>("POST", "network/firewalls", {
            json: {
                display_name: params.displayName,
                billing_account_id: params.billingAccountId,
                rules: params.rules,
            },
        });
    }

    /** Updates an existing firewall configuration. */
    update(firewallUuid: string, params: UpdateFirewallParams = {}): Promise<Firewall> {
        return this.client.request<Firewall>("PUT", `network/firewalls/${firewallUuid}`, {
            json: {
                name: params.name,
                description: params.description,
                rules: params.rules,
            },
        });
    }

    /** Deletes a firewall. */
    delete(firewallUuid: string): Promise<undefined> {
        return this.client.request<undefined>("DELETE", `network/firewalls/${firewallUuid}`);
    }

    /** Associates a firewall with a virtual machine. */
    assignVm(firewallUuid: string, params: { vmUuid: string }): Promise<FirewallAssignment[]> {
        return this.client.request<FirewallAssignment[]>(
            "POST",
            `network/firewalls/${firewallUuid}/vms`,
            { query: { vm_uuid: params.vmUuid } }
        );
    }

    /** Removes the association between a firewall and a virtual machine. */
    unassignVm(firewallUuid: string, params: { vmUuid: string }): Promise<undefined> {
        return this.client.request<undefined>("DELETE", `network/firewalls/${firewallUuid}/vms`, {
            query: { vm_uuid: params.vmUuid },
        });
    }
}

/**
 * Network load balancers. All endpoints are location-specific.
 */
export class LoadBalancerResource {
    private readonly client: IdCloudHostClient;

    constructor(client: IdCloudHostClient) {
        this.client = client;
    }

    /** Lists the load balancers owned by the user. */
    list(): Promise<LoadBalancer[]> {
        return this.client.request<LoadBalancer[]>("GET", "network/load_balancers");
    }

    /** Gets a load balancer by UUID. */
    get(loadBalancerUuid: string): Promise<LoadBalancer> {
        return this.client.request<LoadBalancer>(
            "GET",
            `network/load_balancers/${loadBalancerUuid}`
        );
    }

    /** Creates a new load balancer. */
    create(params: CreateLoadBalancerParams = {}): Promise<LoadBalancer> {
        return this.client.request<LoadBalancer>("POST", "network/load_balancers", {
            json: {
                display_name: params.displayName,
                billing_account_id: params.billingAccountId,
                network_uuid: params.networkUuid,
                reserve_public_ip: params.reservePublicIp,
                rules: params.rules?.map((rule) => ({
                    source_port: rule.sourcePort,
                    target_port: rule.targetPort,
                })),
                targets: params.targets?.map((target) => ({
                    target_uuid: target.targetUuid,
                    target_type: target.targetType,
                })),
            },
        });
    }

    /** Renames a load balancer. */
    rename(loadBalancerUuid: string, params: { displayName: string }): Promise<LoadBalancer> {
        return this.client.request<LoadBalancer>(
            "PATCH",
            `network/load_balancers/${loadBalancerUuid}`,
            { json: { display_name: params.displayName } }
        );
    }

    /** Deletes a load balancer. */
    delete(loadBalancerUuid: string): Promise<undefined> {
        return this.client.request<undefined>(
            "DELETE",
            `network/load_balancers/${loadBalancerUuid}`
        );
    }

    /** Adds a new target to a load balancer. */
    addTarget(
        loadBalancerUuid: string,
        params: AddLoadBalancerTargetParams
    ): Promise<LoadBalancerTarget> {
        return this.client.request<LoadBalancerTarget>(
            "POST",
            `network/load_balancers/${loadBalancerUuid}/targets`,
            {
                json: {
                    target_uuid: params.targetUuid,
                    target_type: params.targetType,
                },
            }
        );
    }

    /** Unlinks a target from a load balancer. */
    removeTarget(loadBalancerUuid: string, targetUuid: string): Promise<undefined> {
        return this.client.request<undefined>(
            "DELETE",
            `network/load_balancers/${loadBalancerUuid}/targets/${targetUuid}`
        );
    }

    /** Adds a new port forwarding rule to a load balancer. */
    addForwardingRule(
        loadBalancerUuid: string,
        params: AddLoadBalancerForwardingRuleParams
    ): Promise<LoadBalancerForwardingRule> {
        return this.client.request<LoadBalancerForwardingRule>(
            "POST",
            `network/load_balancers/${loadBalancerUuid}/forwarding_rules`,
            {
                json: {
                    source_port: params.sourcePort,
                    target_port: params.targetPort,
                },
            }
        );
    }

    /** Drops a port forwarding rule from a load balancer. */
    removeForwardingRule(loadBalancerUuid: string, ruleUuid: string): Promise<undefined> {
        return this.client.request<undefined>(
            "DELETE",
            `network/load_balancers/${loadBalancerUuid}/forwarding_rules/${ruleUuid}`
        );
    }

    /** Changes the billing account a load balancer is assigned to. */
    setBillingAccount(
        loadBalancerUuid: string,
        params: { billingAccountId: number }
    ): Promise<LoadBalancer> {
        return this.client.request<LoadBalancer>(
            "PUT",
            `network/load_balancers/${loadBalancerUuid}/billing_account`,
            { json: { set_id: params.billingAccountId } }
        );
    }
}
