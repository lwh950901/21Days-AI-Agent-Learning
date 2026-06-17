import {
  approveCheckpoint,
  createInitialCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type ProductCraftCheckpoint,
} from "./checkpoint-store.ts";
import {
  generatePrdAndPauseForApproval,
  type PrdGenerator,
} from "./prd-workflow.ts";

export type StatePersistenceDemoInput = {
  checkpointDir: string;
  threadId: string;
  idea: string;
  generatePrd: PrdGenerator;
};

export type StatePersistenceDemoResult = {
  created: ProductCraftCheckpoint;
  restored: ProductCraftCheckpoint;
  approved: ProductCraftCheckpoint;
  prdApproval: ProductCraftCheckpoint;
  resumedFrom: ProductCraftCheckpoint["currentNode"];
  resumedTo: ProductCraftCheckpoint["currentNode"];
};

export async function runStatePersistenceDemo(
  input: StatePersistenceDemoInput,
): Promise<StatePersistenceDemoResult> {
  const created = createInitialCheckpoint({
    threadId: input.threadId,
    idea: input.idea,
  });

  await saveCheckpoint(input.checkpointDir, created);

  const restored = await loadCheckpoint(input.checkpointDir, input.threadId);
  const approved = approveCheckpoint(restored);

  await saveCheckpoint(input.checkpointDir, approved);

  const prdApproval = await generatePrdAndPauseForApproval(
    approved,
    input.generatePrd,
  );

  await saveCheckpoint(input.checkpointDir, prdApproval);

  return {
    created,
    restored,
    approved,
    prdApproval,
    resumedFrom: approved.currentNode,
    resumedTo: prdApproval.currentNode,
  };
}
