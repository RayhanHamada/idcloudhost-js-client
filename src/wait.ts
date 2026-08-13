import { setTimeout as sleep } from "node:timers/promises";

import type { VirtualMachine, VmResource } from "./resources/vm";

export const DEFAULT_WAIT_TIMEOUT_MS = 300_000;
export const DEFAULT_WAIT_INTERVAL_MS = 5000;

/** Thrown when a {@link waitFor} condition is not met before the timeout. */
export class WaitTimeoutError extends Error {
    constructor(message = "Timed out while waiting for the condition to be met") {
        super(message);
        this.name = "WaitTimeoutError";
    }
}

export interface WaitOptions {
    /** Total time to wait in milliseconds. Defaults to 300000 (5 minutes). */
    timeoutMs?: number;
    /** Delay between polling attempts in milliseconds. Defaults to 5000. */
    intervalMs?: number;
}

/**
 * Polls `fn` until `predicate` returns true for the produced value. The most
 * recent value is returned. Throws {@link WaitTimeoutError} when the timeout is
 * reached.
 *
 * ```ts
 * const running = await waitFor(
 *     () => client.vm.get(uuid),
 *     (vm) => vm.status === "running",
 * );
 * ```
 */
export async function waitFor<T>(
    fn: () => Promise<T>,
    predicate: (value: T) => boolean,
    options: WaitOptions = {}
): Promise<T> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
    return poll(fn, predicate, Date.now() + timeoutMs, intervalMs);
}

/**
 * Polls a virtual machine until its status equals the expected value, e.g. after
 * issuing a start, stop or reinstall request.
 */
export async function waitForVmStatus(
    vm: VmResource,
    uuid: string,
    status: VirtualMachine["status"],
    options: WaitOptions = {}
): Promise<VirtualMachine> {
    return waitFor(
        () => vm.get(uuid),
        (machine) => machine.status === status,
        options
    );
}

async function poll<T>(
    fn: () => Promise<T>,
    predicate: (value: T) => boolean,
    deadline: number,
    intervalMs: number
): Promise<T> {
    const value = await fn();
    if (predicate(value)) {
        return value;
    }
    if (Date.now() >= deadline) {
        throw new WaitTimeoutError();
    }
    await sleep(Math.min(intervalMs, Math.max(deadline - Date.now(), 0)));
    return poll(fn, predicate, deadline, intervalMs);
}
