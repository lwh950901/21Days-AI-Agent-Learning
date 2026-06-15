import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = process.cwd();

describe("demo3 scope", () => {
  test("does not keep the demo2 ProductBrief generation API", () => {
    expect(existsSync(join(projectRoot, "app/api/product-brief/route.ts"))).toBe(false);
  });

  test("does not advertise demo2 structured output workflow", () => {
    const files = ["app/page.tsx", "README.md"];
    const combinedSource = files
      .map((file) => readFileSync(join(projectRoot, file), "utf8"))
      .join("\n");

    expect(combinedSource).not.toContain("Output.object");
    expect(combinedSource).not.toContain("Structured Output API");
    expect(combinedSource).not.toContain("生成 ProductBrief");
  });
});
