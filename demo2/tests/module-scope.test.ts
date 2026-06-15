import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = process.cwd();
const sourceFiles = ["app/page.tsx", "README.md", "lib/ai/prompts.ts"];

describe("Module 2 demo scope", () => {
  test("does not keep the Module 1 chat API route", () => {
    expect(existsSync(join(projectRoot, "app/api/chat/route.ts"))).toBe(false);
  });

  test("does not keep contract-analysis learning copy", () => {
    const combinedSource = sourceFiles
      .filter((file) => existsSync(join(projectRoot, file)))
      .map((file) => readFileSync(join(projectRoot, file), "utf8"))
      .join("\n");

    expect(combinedSource).not.toContain("合同");
    expect(combinedSource).not.toContain("Module 1");
    expect(combinedSource).not.toContain("streamText");
  });
});
