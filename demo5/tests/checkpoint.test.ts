import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  approveCheckpoint,
  createInitialCheckpoint,
  finalizeApprovedCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
} from "../src/checkpoint-store.ts";
import { generatePrdAndPauseForApproval } from "../src/prd-workflow.ts";

test("saves and loads a checkpoint by threadId", async () => {
  const dir = await mkdtemp(join(tmpdir(), "demo5-checkpoint-"));

  try {
    const checkpoint = createInitialCheckpoint({
      threadId: "run_test_001",
      idea: "AI PDF assistant",
    });

    await saveCheckpoint(dir, checkpoint);
    const restored = await loadCheckpoint(dir, "run_test_001");

    assert.equal(restored.threadId, "run_test_001");
    assert.equal(restored.currentNode, "requirementsApproval");
    assert.equal(restored.nextNode, "generatePrd");
    assert.equal(restored.status, "waiting_for_human");
    assert.equal(restored.state.idea, "AI PDF assistant");
    assert.equal(restored.state.approvalStatus, "pending");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("approve writes human decision and routes workflow to the next node", async () => {
  const checkpoint = createInitialCheckpoint({
    threadId: "run_test_002",
    idea: "ProductCraft",
  });

  const approved = approveCheckpoint(checkpoint);

  assert.equal(approved.status, "running");
  assert.equal(approved.currentNode, "requirementsApproval");
  assert.equal(approved.nextNode, "generatePrd");
  assert.equal(approved.state.approvalStatus, "approved");
  assert.deepEqual(approved.state.humanFeedback, {
    action: "approve",
    editedFields: [],
  });
});

test("demo saves, restores, approves, and resumes one workflow run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "demo5-run-"));

  try {
    const { runStatePersistenceDemo } = await import("../src/demo.ts");

    const result = await runStatePersistenceDemo({
      checkpointDir: dir,
      threadId: "run_demo_001",
      idea: "AI PDF assistant",
      generatePrd: async (state) => `PRD for ${state.idea}`,
    });

    assert.equal(result.created.status, "waiting_for_human");
    assert.equal(result.restored.currentNode, "requirementsApproval");
    assert.equal(result.approved.state.approvalStatus, "approved");
    assert.equal(result.prdApproval.currentNode, "prdApproval");
    assert.equal(result.prdApproval.status, "waiting_for_human");
    assert.equal(result.prdApproval.state.prdDraft, "PRD for AI PDF assistant");
    assert.equal(result.resumedFrom, "requirementsApproval");
    assert.equal(result.resumedTo, "prdApproval");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generates PRD draft, saves it in state, and pauses for human approval", async () => {
  const checkpoint = approveCheckpoint(
    createInitialCheckpoint({
      threadId: "run_test_003",
      idea: "AI PDF assistant",
    }),
  );

  const prdCheckpoint = await generatePrdAndPauseForApproval(
    checkpoint,
    async (state) => `PRD for ${state.idea}`,
  );

  assert.equal(prdCheckpoint.currentNode, "prdApproval");
  assert.equal(prdCheckpoint.nextNode, "finalize");
  assert.equal(prdCheckpoint.status, "waiting_for_human");
  assert.equal(prdCheckpoint.state.prdDraft, "PRD for AI PDF assistant");
  assert.equal(prdCheckpoint.state.approvalStatus, "pending");
});

test("final approval moves PRD approval checkpoint to completed finalize state", async () => {
  const prdApproval = await generatePrdAndPauseForApproval(
    approveCheckpoint(
      createInitialCheckpoint({
        threadId: "run_test_004",
        idea: "AI PDF assistant",
      }),
    ),
    async () => "Approved PRD draft",
  );

  const completed = finalizeApprovedCheckpoint(prdApproval);

  assert.equal(completed.currentNode, "finalize");
  assert.equal(completed.nextNode, undefined);
  assert.equal(completed.status, "completed");
  assert.equal(completed.state.approvalStatus, "approved");
  assert.deepEqual(completed.state.humanFeedback, {
    action: "approve",
    editedFields: [],
    comment: "PRD approved and workflow finalized.",
  });
});
