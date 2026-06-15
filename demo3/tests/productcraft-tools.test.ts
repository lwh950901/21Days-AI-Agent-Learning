import { describe, expect, test } from "vitest";
import {
  saveProjectForDemo,
  searchCompetitorsForDemo,
  toToolCallLog,
} from "../lib/productcraft/tools";

describe("searchCompetitorsForDemo", () => {
  test("returns competitor candidates without changing project data", async () => {
    const result = await searchCompetitorsForDemo({ query: "AI landing page", limit: 2 });

    expect(result.ok).toBe(true);
    expect(result.ok && result.competitors).toHaveLength(2);
  });

  test("returns a structured tool error for simulated search timeouts", async () => {
    const result = await searchCompetitorsForDemo({ query: "timeout", limit: 2 });

    expect(result).toEqual({
      ok: false,
      error: "SEARCH_TIMEOUT",
      message: "竞品搜索超时，请稍后重试。",
    });
  });
});

describe("saveProjectForDemo", () => {
  test("returns a minimal save receipt", async () => {
    const result = await saveProjectForDemo({
      projectName: "LaunchCraft",
      brief: {
        productName: "LaunchCraft",
        oneSentencePitch: "帮助独立开发者生成落地页定位和首屏文案。",
        targetUsers: ["独立开发者"],
        painPoints: ["不会写产品定位"],
        coreFeatures: ["生成定位", "生成首屏文案"],
        competitors: [],
        pricing: null,
        confidence: 0.82,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.projectId).toMatch(/^proj_/);
    expect(result.ok && result.status).toBe("saved");
  });
});

describe("toToolCallLog", () => {
  test("records tool name, risk level, status, and timestamp", () => {
    const log = toToolCallLog({
      toolName: "saveProject",
      risk: "business",
      input: { projectName: "LaunchCraft" },
      result: { ok: true, projectId: "proj_123", status: "saved" },
    });

    expect(log).toMatchObject({
      toolName: "saveProject",
      risk: "business",
      status: "success",
    });
    expect(log.createdAt).toEqual(expect.any(String));
  });
});
