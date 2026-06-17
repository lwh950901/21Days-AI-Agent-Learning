# Module 4 Demo 1: State, Checkpoint, Resume, and HITL

This demo focuses on Module 4's first runnable workflow: saving Agent State, restoring a checkpoint, recording a human approval event, calling DeepSeek through AI SDK to generate a PRD draft, and pausing again for PRD approval.

## Run

```bash
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

CLI mode:

```bash
npm run demo
```

## Test

```bash
npm run test:checkpoint
npm run typecheck
```

## What This Demo Shows

- `Agent State`: business data needed by the workflow, such as idea, clarified requirements, approval status, and revision count.
- `Checkpoint`: a persisted workflow snapshot that contains `threadId`, current node, next node, status, timestamps, and the full Agent State.
- `threadId`: the ID for one recoverable workflow run.
- `Resume`: loading the checkpoint, writing the human approval result into state, and routing the workflow to the next node.
- `HITL`: human-in-the-loop approval is stored as structured state instead of only being shown in the UI.
- `AI Node`: PRD generation is modeled as one workflow node and calls DeepSeek through AI SDK.
- Frontend page: a visible control surface for starting the workflow, watching checkpoint transitions, reading the PRD draft, and approving the final PRD.

## Workflow

```text
create threadId
-> save checkpoint at requirementsApproval
-> restore checkpoint by threadId
-> write human approval into Agent State
-> call DeepSeek to generate PRD draft
-> save checkpoint at prdApproval
-> wait for human approval again
-> approve PRD and finalize
```

## DeepSeek Configuration

This demo follows the same OpenAI-compatible style used in `demo3`: `@ai-sdk/openai` creates a provider, and `OPENAI_BASE_URL` points to DeepSeek.

```bash
OPENAI_API_KEY=your_deepseek_api_key_here
OPENAI_BASE_URL=https://api.deepseek.com
AI_MODEL_FAST=deepseek-v4-flash
```

Both the frontend API and CLI call DeepSeek. Tests inject a deterministic generator only so automated checks do not spend tokens or depend on network availability.

## Key Files

- `src/checkpoint-store.ts`: defines Agent State, checkpoint shape, save/load, and approval update.
- `src/prd-workflow.ts`: turns approved state into a PRD draft and pauses at `prdApproval`.
- `src/model.ts`: central model configuration for OpenAI-compatible DeepSeek access.
- `src/deepseek-prd-generator.ts`: AI SDK `generateText` PRD generator.
- `app/page.tsx`: frontend workflow control surface.
- `app/api/workflow/start/route.ts`: starts the recoverable workflow and calls DeepSeek.
- `app/api/workflow/finalize/route.ts`: writes final approval and completes the workflow.
- `tests/checkpoint.test.ts`: verifies save/load, approve, resume, and PRD approval pause.

## Interview Expression

In a recoverable AI workflow, model calls should be treated as workflow nodes, not as the whole application. The system should persist a structured checkpoint that includes business state, execution position, run identifier, and status. When a human approves or edits a paused step, that decision should be written into structured state, and the workflow should resume from the correct node.

## Project Expression

This demo models a ProductCraft-style workflow where a product idea reaches a human approval point, gets saved as a checkpoint, is restored by `threadId`, continues into a DeepSeek PRD generation node, and pauses again before final approval. The page makes the state transitions visible so the workflow is easier to explain in an interview.
