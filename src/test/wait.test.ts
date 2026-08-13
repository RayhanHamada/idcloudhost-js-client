import { describe, expect, it, vi } from "vitest";

import { WaitTimeoutError, waitFor, waitForVmStatus } from "../wait";
import { createClient } from "./helpers";

describe(waitFor, () => {
    it("returns as soon as the predicate matches", async () => {
        const calls: number[] = [];
        const value = await waitFor(
            async () => {
                calls.push(1);
                return calls.length >= 3 ? "ready" : "pending";
            },
            (result) => result === "ready",
            { timeoutMs: 10_000, intervalMs: 1 }
        );
        expect(value).toBe("ready");
        expect(calls).toHaveLength(3);
    });

    it("throws WaitTimeoutError when the condition is never met", async () => {
        await expect(
            waitFor(
                async () => "pending",
                (result) => result === "ready",
                {
                    timeoutMs: 20,
                    intervalMs: 1,
                }
            )
        ).rejects.toBeInstanceOf(WaitTimeoutError);
    });

    it("polls the VM resource until the expected status", async () => {
        const statuses = ["provisioning", "running"];
        const { client } = createClient(() => ({
            body: { uuid: "vm-uuid", status: statuses.length > 1 ? statuses.shift() : "running" },
        }));
        const machine = await waitForVmStatus(client.vm, "vm-uuid", "running", {
            timeoutMs: 10_000,
            intervalMs: 1,
        });
        expect(machine.status).toBe("running");
    });

    it("does not poll again after the predicate matches", async () => {
        const fn = vi.fn<() => Promise<string>>(async () => "running");
        await waitFor(fn, (status) => status === "running", { intervalMs: 1 });
        expect(fn).toHaveBeenCalledOnce();
    });
});
