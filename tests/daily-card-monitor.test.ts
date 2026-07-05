import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Daily Card Monitor Master Script", () => {
  it("verifies master script file exists and is executable", () => {
    const scriptPath = path.join(process.cwd(), "scripts", "run-daily-card-monitor.mjs");
    expect(existsSync(scriptPath)).toBe(true);

    const content = readFileSync(scriptPath, "utf8");
    expect(content).toContain("audit-official-pages.mjs");
    expect(content).toContain("scrape-technofino.mjs");
    expect(content).toContain("OpenClaw Daily Card Monitor");
  });
});
