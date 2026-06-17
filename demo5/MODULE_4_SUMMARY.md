# Module 4 Summary: State, Persistence, Checkpoint, and HITL

## 1. What This Module Covers

Module 4 focuses on recoverable AI workflows.

The core question is:

```text
How can an AI workflow pause, persist, restore, wait for humans, and continue from the correct step?
```

This is different from a one-shot AI generation page. A recoverable workflow needs structured state, checkpoint persistence, execution position, and human routing.

## 2. Core Concepts

### State

State is the data a workflow uses while running.

In this module, the most important state is Agent State:

- User input after submit
- Confirmed requirements
- AI-generated output
- Human decision
- Revision count
- Human feedback

### UI State

UI State only controls the interface.

Examples:

- Button loading
- Open tab
- Expanded panel
- Unsaved input draft

UI State should not drive backend workflow recovery.

### Model Messages

Model Messages are the conversation context for the model.

They answer:

```text
What did user, assistant, or tool say?
```

They should not be the only source of workflow progress.

### Persistence

Persistence means saving data so it can be read later.

It answers:

```text
Can this data survive refresh, restart, or failure?
```

Persistence is a mechanism, not the same thing as Memory.

### Memory

Memory is reusable information that may help future tasks.

Examples:

- User prefers engineering interview style
- User often uses Next.js and TypeScript
- User prefers concise answers

Quick rule:

```text
Persistence checks whether data is saved.
Memory checks whether data is useful in the future.
```

### Checkpoint

Checkpoint is a persisted recovery snapshot.

It usually contains:

- `threadId`
- `currentNode`
- `nextNode`
- `status`
- Full Agent State
- Timestamps and metadata

Quick rule:

```text
State says what data exists.
Checkpoint says how to recover the workflow.
```

### threadId

`threadId` identifies one recoverable workflow run.

It is not the same as user ID.

One user may have many workflow runs, so one user may have many thread IDs.

### Resume

Resume means loading a checkpoint and continuing from the correct point.

It is not the same as restarting the workflow.

### Human-in-the-loop

HITL means a human can approve, reject, or edit at key workflow points.

Human decisions should be written into structured state, not only shown in the UI.

## 3. Demo5 Capability

Demo5 implements a ProductCraft-style recoverable workflow:

```text
User enters product idea
-> backend creates threadId
-> checkpoint at requirements approval
-> restore by threadId
-> DeepSeek generates PRD
-> checkpoint at PRD approval
-> human chooses Approve / Reject / Edit
-> workflow finalizes, retries, or regenerates
```

Key files:

- `app/page.tsx`: visual workflow console
- `app/api/workflow/start/route.ts`: starts workflow and calls DeepSeek
- `app/api/workflow/update/route.ts`: handles Approve, Reject, and Edit
- `src/checkpoint-store.ts`: checkpoint and state transitions
- `src/prd-workflow.ts`: PRD generation and pause
- `src/deepseek-prd-generator.ts`: AI SDK + DeepSeek call
- `STATE_DESIGN.md`: state boundaries
- `CHECKPOINT_HITL_FLOW.md`: checkpoint and HITL flow

## 4. High-Frequency Interview Questions

### Q1. State, Messages, and Checkpoint: what is the difference?

Messages are model context and chat history. State is structured workflow data used to drive execution. Checkpoint is a persisted recovery snapshot that contains State plus execution position, such as threadId, currentNode, nextNode, and status.

Short version:

```text
Messages: what the model sees.
State: what the workflow uses.
Checkpoint: how the workflow resumes.
```

### Q2. Persistence vs Memory: what is the difference?

Persistence is the mechanism of saving data so it can be read later. Memory is reusable information that should influence future tasks. Not all persisted data is Memory. Checkpoints and logs can be persisted, but they are not necessarily long-term memory.

Short version:

```text
Persistence checks whether data is saved.
Memory checks whether data should be reused later.
```

### Q3. Why not store all workflow state in messages?

Messages can restore conversation content, but they do not reliably restore execution position. A workflow also needs currentNode, status, nextNode, threadId, and structured Agent State. Without checkpoint, the system may show old chat content but fail to resume from the correct node.

### Q4. How does a page restore a HITL approval UI after refresh?

The frontend uses threadId to ask the backend for the latest checkpoint. The backend returns currentNode, status, and Agent State. The frontend checks whether the current node is an approval node and whether status is `waiting_for_human`. If so, it restores the approval UI and shows Approve, Reject, and Edit actions.

### Q5. What is the difference between currentNode and status?

`currentNode` is the workflow position. `status` is the runtime state of that position.

Example:

```text
currentNode = prdApproval
status = waiting_for_human
```

This means the workflow is at the PRD approval node and is waiting for a human.

### Q6. Approve, Reject, and Edit: how do they differ?

Approve means the current output is accepted, so the workflow can continue or finish. Reject means the current output is not acceptable, so the workflow usually returns for revision or regeneration. Edit means the human changed upstream input, so affected downstream output should be invalidated and regenerated.

### Q7. Why should Edit invalidate old output?

AI output depends on upstream input. If the input changes, the old output was generated from outdated conditions. The system should update Agent State, clear or mark the old output invalid, regenerate affected content, and ask for approval again.

### Q8. What does threadId do?

threadId identifies one recoverable workflow run. It lets the system find the correct checkpoint. It should not be confused with user ID, because one user can have multiple workflow runs.

## 5. Project Design Question

Question:

```text
Design an AI report-generation workflow that supports human approval and page-refresh recovery.
```

Expected answer:

```text
I would generate a threadId for each report workflow. The workflow state would include user input, report draft, approval result, revision count, and human feedback. At key steps, such as draft generated and waiting for approval, I would save a checkpoint with currentNode, nextNode, status, and full Agent State. If the page refreshes, the frontend uses threadId to load the latest checkpoint and restore the approval UI. Approve finalizes the report, Reject routes back to revision, and Edit updates upstream input and regenerates the report.
```

## 6. Common Mistakes

- Treating messages as the only source of workflow state.
- Saving State but not saving currentNode or status.
- Treating Reject as always stopping the workflow.
- Treating Edit as just changing UI text.
- Not invalidating old output after upstream input changes.
- Confusing userId and threadId.
- Confusing currentNode and status.
- Thinking a demo is complete just because it can call a model.

## 7. Mastery Checklist

You should be able to explain:

- The difference between UI State, Model Messages, Agent State, and Checkpoint.
- The difference between Persistence and Memory.
- Why checkpoint is needed for recoverable AI workflows.
- What threadId is used for.
- How Resume works after page refresh.
- How HITL actions change workflow routing.
- Why Edit requires regenerating affected output.
- How Demo5 proves these ideas in code.

## 8. Final Interview Pitch

In this module, I built a recoverable AI workflow demo. The system uses DeepSeek through AI SDK to generate a PRD, but the model call is only one node in the workflow. The important part is that the workflow saves checkpoints with threadId, currentNode, status, and full Agent State. When the user refreshes the page or returns later, the system can restore the approval UI from checkpoint. Human actions like Approve, Reject, and Edit are written into state and route the workflow to finalize, revise, or regenerate. This makes the demo closer to an enterprise AI workflow than a one-shot generation page.
