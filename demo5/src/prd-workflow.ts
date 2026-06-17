import type {
  ProductCraftAgentState,
  ProductCraftCheckpoint,
} from "./checkpoint-store.ts";

export type PrdGenerator = (
  state: ProductCraftAgentState,
) => Promise<string>;

export async function generatePrdAndPauseForApproval(
  checkpoint: ProductCraftCheckpoint,
  generatePrd: PrdGenerator,
): Promise<ProductCraftCheckpoint> {
  // 模型调用只是一个节点：输入来自 Agent State，输出也必须写回 Agent State。
  const prdDraft = await generatePrd(checkpoint.state);

  // 生成完成后立刻 checkpoint，并暂停给人审批，而不是直接结束流程。
  return {
    ...checkpoint,
    currentNode: "prdApproval",
    nextNode: "finalize",
    status: "waiting_for_human",
    state: {
      ...checkpoint.state,
      prdDraft,
      approvalStatus: "pending",
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function createMockPrdDraft(
  state: ProductCraftAgentState,
): Promise<string> {
  return [
    `# PRD: ${state.idea}`,
    "",
    "## Target Users",
    state.targetUsers ?? "Early-stage SaaS founders and product teams",
    "",
    "## Core Problem",
    "Users need a structured way to turn a product idea into a reviewable product plan.",
    "",
    "## MVP Scope",
    "- Clarify requirements",
    "- Generate a first PRD draft",
    "- Pause for human approval",
    "- Resume from checkpoint after approval",
  ].join("\n");
}
