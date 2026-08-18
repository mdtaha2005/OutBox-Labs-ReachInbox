import { describe, it, expect } from "vitest";
import { calculateScheduleTimes } from "../../src/utils/scheduler.js";

describe("Scheduler Calculation Algorithm", () => {
  it("should stagger timestamps by delaySeconds", () => {
    const startTime = new Date(Date.now() + 100000);
    const delaySeconds = 2;
    const hourlyLimit = 100;
    const count = 5;

    const times = calculateScheduleTimes(count, startTime, delaySeconds, hourlyLimit);

    expect(times).toHaveLength(5);
    for (let i = 0; i < times.length - 1; i++) {
      const diffMs = times[i + 1].getTime() - times[i].getTime();
      expect(diffMs).toBeGreaterThanOrEqual(delaySeconds * 1000);
    }
  });

  it("should transition to the next hour window when hourly limit is reached", () => {
    const startTime = new Date(Date.now() + 100000);
    const delaySeconds = 2;
    const hourlyLimit = 3; // Small limit for testing
    const count = 5;

    const times = calculateScheduleTimes(count, startTime, delaySeconds, hourlyLimit);

    expect(times).toHaveLength(5);

    // Items 0, 1, 2 belong to hour 1
    // Item 3 should be pushed by at least 1 hour (3600000 ms) from start
    const startMs = startTime.getTime();
    const item3Ms = times[3].getTime();

    expect(item3Ms - startMs).toBeGreaterThanOrEqual(3600 * 1000);
  });
});