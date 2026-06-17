import { join } from "node:path";

import { runStatePersistenceDemo } from "./demo.ts";
import { createDeepSeekPrdDraft } from "./deepseek-prd-generator.ts";

const checkpointDir = join(process.cwd(), "data", "checkpoints");
const threadId = `run_${Date.now()}`;

const result = await runStatePersistenceDemo({
  checkpointDir,
  threadId,
  idea: "AI PDF assistant for legal and research teams",
  generatePrd: createDeepSeekPrdDraft,
});

console.log("Module 4 Demo 1: State persistence + checkpoint + HITL pause");
console.log("");
console.log(`threadId: ${result.created.threadId}`);
console.log("model: DeepSeek via AI SDK");
console.log(`checkpoint 1: ${result.created.currentNode} (${result.created.status})`);
console.log(`restored currentNode: ${result.restored.currentNode}`);
console.log(`human action at requirementsApproval: ${result.approved.state.approvalStatus}`);
console.log(`checkpoint 2: ${result.prdApproval.currentNode} (${result.prdApproval.status})`);
console.log(`resume path: ${result.resumedFrom} -> ${result.resumedTo}`);
console.log("");
console.log("PRD draft preview:");
console.log((result.prdApproval.state.prdDraft ?? "").slice(0, 500));
console.log("");
console.log(`checkpoint file: ${join(checkpointDir, `${threadId}.json`)}`);
