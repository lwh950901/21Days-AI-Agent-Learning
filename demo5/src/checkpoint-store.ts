import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type WorkflowStatus =
  | "running"
  | "waiting_for_human"
  | "completed"
  | "failed";

export type HumanAction = "approve" | "reject" | "edit";

export type ProductCraftAgentState = {
  idea: string;
  clarifiedRequirements: string[];
  targetUsers?: string;
  prdDraft?: string;
  approvalStatus: "pending" | "approved" | "rejected" | "edited";
  revisionCount: number;
  humanFeedback?: {
    action: HumanAction;
    editedFields: string[];
    comment?: string;
  };
};

export type ProductCraftCheckpoint = {
  threadId: string;
  currentNode: "requirementsApproval" | "generatePrd" | "prdApproval" | "finalize";
  nextNode?: "generatePrd" | "prdApproval" | "finalize";
  status: WorkflowStatus;
  state: ProductCraftAgentState;
  createdAt: string;
  updatedAt: string;
};

export function createInitialCheckpoint(input: {
  threadId: string;
  idea: string;
}): ProductCraftCheckpoint {
  const now = new Date().toISOString();

  // 第一个暂停点：需求确认。这里保存的是工作流恢复需要的最小快照。
  return {
    threadId: input.threadId,
    currentNode: "requirementsApproval",
    nextNode: "generatePrd",
    status: "waiting_for_human",
    state: {
      idea: input.idea,
      clarifiedRequirements: [
        "用户已确认这是一次 ProductCraft 产品分析流程。",
      ],
      approvalStatus: "pending",
      revisionCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveCheckpoint(
  directory: string,
  checkpoint: ProductCraftCheckpoint,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(
    checkpointPath(directory, checkpoint.threadId),
    `${JSON.stringify(checkpoint, null, 2)}\n`,
    "utf8",
  );
}

export async function loadCheckpoint(
  directory: string,
  threadId: string,
): Promise<ProductCraftCheckpoint> {
  const content = await readFile(checkpointPath(directory, threadId), "utf8");
  return JSON.parse(content) as ProductCraftCheckpoint;
}

export function approveCheckpoint(
  checkpoint: ProductCraftCheckpoint,
): ProductCraftCheckpoint {
  // Approve 不是 UI 按钮状态，而是会改变 workflow 路由的人工事件。
  return {
    ...checkpoint,
    status: "running",
    nextNode: "generatePrd",
    state: {
      ...checkpoint.state,
      approvalStatus: "approved",
      humanFeedback: {
        action: "approve",
        editedFields: [],
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function rejectCheckpoint(
  checkpoint: ProductCraftCheckpoint,
): ProductCraftCheckpoint {
  return {
    ...checkpoint,
    currentNode: "requirementsApproval",
    nextNode: "generatePrd",
    status: "waiting_for_human",
    state: {
      ...checkpoint.state,
      approvalStatus: "rejected",
      prdDraft: undefined,
      revisionCount: checkpoint.state.revisionCount + 1,
      humanFeedback: {
        action: "reject",
        editedFields: ["prdDraft"],
        comment: "PRD 不符合预期，退回需求澄清阶段。",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function editCheckpoint(
  checkpoint: ProductCraftCheckpoint,
  edits: { idea?: string; targetUsers?: string; clarifiedRequirements?: string[] },
): ProductCraftCheckpoint {
  return {
    ...checkpoint,
    status: "running",
    nextNode: "generatePrd",
    state: {
      ...checkpoint.state,
      idea: edits.idea ?? checkpoint.state.idea,
      targetUsers: edits.targetUsers ?? checkpoint.state.targetUsers,
      clarifiedRequirements: edits.clarifiedRequirements ?? checkpoint.state.clarifiedRequirements,
      approvalStatus: "edited",
      prdDraft: undefined,
      revisionCount: checkpoint.state.revisionCount + 1,
      humanFeedback: {
        action: "edit",
        editedFields: Object.keys(edits),
        comment: "人工修改需求后重新生成 PRD。",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function finalizeApprovedCheckpoint(
  checkpoint: ProductCraftCheckpoint,
): ProductCraftCheckpoint {
  // PRD 审批通过后，流程进入终态；此时不再需要 nextNode。
  return {
    ...checkpoint,
    currentNode: "finalize",
    nextNode: undefined,
    status: "completed",
    state: {
      ...checkpoint.state,
      approvalStatus: "approved",
      humanFeedback: {
        action: "approve",
        editedFields: [],
        comment: "PRD approved and workflow finalized.",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

function checkpointPath(directory: string, threadId: string): string {
  return join(directory, `${threadId}.json`);
}

export { STATUS_LABELS, NODE_LABELS } from "./labels.ts";
