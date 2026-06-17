import { join } from "node:path";

import {
  approveCheckpoint,
  editCheckpoint,
  finalizeApprovedCheckpoint,
  loadCheckpoint,
  rejectCheckpoint,
  saveCheckpoint,
} from "../../../../src/checkpoint-store.ts";
import { generatePrdAndPauseForApproval } from "../../../../src/prd-workflow.ts";
import { createDeepSeekPrdDraft } from "../../../../src/deepseek-prd-generator.ts";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      threadId?: string;
      action?: string;
      edits?: { idea?: string; targetUsers?: string; clarifiedRequirements?: string[] };
    };

    const threadId = body.threadId?.trim();
    const action = body.action ?? "approve";

    if (!threadId) {
      return Response.json(
        { error: "THREAD_ID_REQUIRED", message: "缺少 threadId。" },
        { status: 422 },
      );
    }

    const checkpointDir = join(process.cwd(), "data", "checkpoints");
    const current = await loadCheckpoint(checkpointDir, threadId);

    if (action === "reject") {
      const rejected = rejectCheckpoint(current);
      await saveCheckpoint(checkpointDir, rejected);
      return Response.json({ checkpoint: rejected });
    }

    if (action === "edit") {
      const edited = editCheckpoint(current, body.edits ?? {});
      await saveCheckpoint(checkpointDir, edited);

      // Re-run PRD generation after edit
      const approved = approveCheckpoint(edited);
      const prdApproval = await generatePrdAndPauseForApproval(
        approved,
        createDeepSeekPrdDraft,
      );
      await saveCheckpoint(checkpointDir, prdApproval);

      return Response.json({ checkpoint: prdApproval });
    }

    // default: approve → finalize
    const completed = finalizeApprovedCheckpoint(current);
    await saveCheckpoint(checkpointDir, completed);
    return Response.json({ checkpoint: completed });
  } catch (error) {
    console.error("Workflow update failed", error);
    return Response.json(
      {
        error: "WORKFLOW_UPDATE_FAILED",
        message: "操作失败，请确认 checkpoint 文件存在。",
      },
      { status: 500 },
    );
  }
}
