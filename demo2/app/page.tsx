"use client";

import { useState } from "react";
import type { ProductBrief } from "../lib/productcraft/schema";

const PRODUCT_IDEA_SAMPLE =
  "我想做一个面向独立开发者的 AI 落地页生成工具，解决他们不会写产品定位和首屏文案的问题。";

export default function Home() {
  const [productIdea, setProductIdea] = useState(PRODUCT_IDEA_SAMPLE);
  const [brief, setBrief] = useState<ProductBrief | null>(null);
  const [briefStatus, setBriefStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [briefError, setBriefError] = useState("");

  const generateProductBrief = async () => {
    const idea = productIdea.trim();
    if (!idea || briefStatus === "generating") {
      return;
    }

    setBriefStatus("generating");
    setBriefError("");

    try {
      const response = await fetch("/api/product-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const payload = (await response.json()) as { brief?: ProductBrief; message?: string };

      if (!response.ok || !payload.brief) {
        throw new Error(payload.message ?? "产品简报生成失败，请补充更明确的信息。");
      }

      setBrief(payload.brief);
      setBriefStatus("done");
    } catch (fetchError) {
      setBriefStatus("error");
      setBriefError(fetchError instanceof Error ? fetchError.message : "产品简报生成失败。");
    }
  };

  const updateBrief = <Key extends keyof ProductBrief>(key: Key, value: ProductBrief[Key]) => {
    setBrief((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateBriefList = (key: "targetUsers" | "painPoints" | "coreFeatures", value: string) => {
    updateBrief(
      key,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  };

  return (
    <main className="workspace">
      <section className="briefing">
        <p className="eyebrow">Module 2 · Structured Output</p>
        <h1>ProductCraft 工作台</h1>
        <p className="summary">
          面向 AI 应用开发求职作品集的模块 2 Demo：用 Zod Schema 和
          <code>Output.object</code> 把产品想法收敛成可校验、可编辑、可进入后续工具调用的
          ProductBrief。
        </p>
        <div className="status-row" aria-live="polite">
          <span className={`status status-${briefStatus}`}>{briefStatus === "generating" ? "生成中" : "待生成"}</span>
          <span>ProductBrief · Zod Schema · Human Edit</span>
        </div>
      </section>

      <section className="productcraft" aria-label="ProductCraft 结构化输出工作台">
        <div className="productcraft-input">
          <p className="eyebrow">Product idea</p>
          <h2>生成 ProductBrief</h2>
          <p>
            输入一句产品想法，后端会先做输入校验，再用结构化输出生成一份可人工确认的产品简报。
          </p>
          <textarea
            disabled={briefStatus === "generating"}
            onChange={(event) => setProductIdea(event.target.value)}
            value={productIdea}
          />
          <div className="composer-actions">
            <button
              disabled={!productIdea.trim() || briefStatus === "generating"}
              onClick={generateProductBrief}
              type="button"
            >
              {briefStatus === "generating" ? "生成中" : "生成 ProductBrief"}
            </button>
          </div>
          {briefError ? <p className="error">{briefError}</p> : null}
        </div>

        <div className="brief-editor">
          {brief ? (
            <>
              <div className="brief-editor-header">
                <span className="status">confidence {brief.confidence.toFixed(2)}</span>
                <span>{brief.confidence < 0.6 ? "建议人工补充后再保存" : "结构已生成，可人工确认"}</span>
              </div>

              <label>
                产品名称
                <input
                  onChange={(event) => updateBrief("productName", event.target.value)}
                  value={brief.productName}
                />
              </label>
              <label>
                一句话定位
                <textarea
                  onChange={(event) => updateBrief("oneSentencePitch", event.target.value)}
                  value={brief.oneSentencePitch}
                />
              </label>
              <label>
                目标用户（每行一个）
                <textarea
                  onChange={(event) => updateBriefList("targetUsers", event.target.value)}
                  value={brief.targetUsers.join("\n")}
                />
              </label>
              <label>
                用户痛点（每行一个）
                <textarea
                  onChange={(event) => updateBriefList("painPoints", event.target.value)}
                  value={brief.painPoints.join("\n")}
                />
              </label>
              <label>
                核心功能（每行一个，最多 5 个）
                <textarea
                  onChange={(event) => updateBriefList("coreFeatures", event.target.value)}
                  value={brief.coreFeatures.join("\n")}
                />
              </label>
              <label>
                初步定价
                <input
                  onChange={(event) => updateBrief("pricing", event.target.value || null)}
                  placeholder="暂无可靠定价"
                  value={brief.pricing ?? ""}
                />
              </label>
            </>
          ) : (
            <div className="empty-state">
              <span>Schema Ready</span>
              <p>生成后会在这里展示可人工编辑的 ProductBrief 草稿。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
