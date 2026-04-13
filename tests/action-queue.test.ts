import { describe, it, expect } from "vitest";

import { actionQueue } from "../electron/action-queue.js";

describe("ActionQueue", () => {
  it("executes a single action", async () => {
    const result = await actionQueue.enqueue("test-1", async () => ({
      ok: true,
      message: "done"
    }));
    expect(result).toEqual({ ok: true, message: "done" });
  });

  it("serializes concurrent actions", async () => {
    const order: number[] = [];

    const p1 = actionQueue.enqueue("serial-1", async () => {
      await new Promise((r) => setTimeout(r, 50));
      order.push(1);
      return { ok: true, message: "1" };
    });
    const p2 = actionQueue.enqueue("serial-2", async () => {
      order.push(2);
      return { ok: true, message: "2" };
    });
    const p3 = actionQueue.enqueue("serial-3", async () => {
      order.push(3);
      return { ok: true, message: "3" };
    });

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("propagates errors to the caller", async () => {
    await expect(
      actionQueue.enqueue("fail", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });

  it("continues processing after a failed action", async () => {
    const failP = actionQueue.enqueue("fail2", async () => { throw new Error("fail"); });
    const okP = actionQueue.enqueue("ok-after-fail", async () => ({ ok: true, message: "recovered" }));

    await expect(failP).rejects.toThrow();
    const result = await okP;
    expect(result).toEqual({ ok: true, message: "recovered" });
  });

  it("reports pending count", async () => {
    expect(actionQueue.pending).toBe(0);
  });
});
