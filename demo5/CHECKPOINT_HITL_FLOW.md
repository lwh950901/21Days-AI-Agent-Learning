# Checkpoint and HITL Flow

## 1. Goal

This document explains the minimum recoverable human-in-the-loop workflow in Demo5.

The goal is to show how an AI workflow can:

- Pause at a human approval step
- Persist a checkpoint
- Restore by `threadId`
- Accept Approve, Reject, or Edit
- Resume from the correct step

## 2. Minimum Flow

```text
1. User starts a workflow.
2. Backend creates a threadId.
3. Workflow reaches a key step.
4. Backend saves a checkpoint.
5. status becomes waiting_for_human.
6. Frontend shows the approval UI.
7. User chooses Approve, Reject, or Edit.
8. Backend writes the human decision into Agent State.
9. Workflow resumes to finalize, revise, or regenerate.
10. Backend saves the new checkpoint.
```

## 3. What the Checkpoint Stores

A checkpoint is the recovery package for one workflow run.

It stores:

- `threadId`: which workflow run this is
- `currentNode`: where the workflow currently is
- `nextNode`: where it may go next
- `status`: running, waiting for human, completed, or failed
- `state`: the full Agent State
- `createdAt` and `updatedAt`: when the checkpoint was saved

The key idea:

```text
State says what data exists.
Checkpoint says how to recover the workflow.
```

## 4. When Demo5 Saves Checkpoints

Demo5 saves checkpoints at important boundaries:

- After entering requirements approval
- After restoring and approving requirements
- After DeepSeek generates the PRD draft
- After PRD approval, rejection, or edit
- After final approval

These are useful checkpoint moments because the workflow may pause, fail, refresh, or need human input.

## 5. Resume Flow After Refresh

```text
1. Page refreshes.
2. Frontend keeps or receives the threadId.
3. Frontend asks backend for the latest checkpoint.
4. Backend loads the checkpoint from persistence.
5. Backend returns currentNode, status, and state.
6. Frontend checks status.
7. If status is waiting_for_human, frontend shows approval actions.
8. User chooses an action.
9. Backend updates state and routes the workflow.
```

If only chat messages are restored, the page may show old conversation content, but the workflow may not know which node to resume from.

## 6. Human Actions

### Approve

Meaning:

```text
The current output is accepted.
```

Workflow effect:

```text
approvalStatus = approved
status = running or completed
route to next node or finalize
```

### Reject

Meaning:

```text
The current output is not acceptable.
```

Workflow effect:

```text
approvalStatus = rejected
old output becomes invalid
route back to revise or regenerate
```

Reject does not always stop the workflow. It usually sends the workflow back for correction.

### Edit

Meaning:

```text
The human changed upstream input or constraints.
```

Workflow effect:

```text
approvalStatus = edited
update Agent State
old output becomes invalid
rerun affected downstream node
return to approval
```

Edit is different from Reject because Edit changes the input, not only the output judgment.

## 7. Demo5 Route Mapping

| Human Action | Demo5 Result |
| --- | --- |
| Approve PRD | `finalizeApprovedCheckpoint` sets `currentNode = finalize` and `status = completed` |
| Reject PRD | `rejectCheckpoint` clears old PRD and returns to requirements approval |
| Edit requirements | `editCheckpoint` updates state, clears old PRD, calls DeepSeek again, and pauses at PRD approval |

## 8. Common Mistakes

- Treating Approve as a frontend-only button state.
- Treating Reject as always stopping the workflow.
- Treating Edit as just changing text on screen.
- Not clearing old output after upstream input changes.
- Restoring messages but not restoring checkpoint.
- Saving current node but not saving `status = waiting_for_human`.

## 9. Interview Expression

A recoverable HITL workflow saves a checkpoint before waiting for human input. The checkpoint includes the workflow ID, current node, runtime status, and structured Agent State. When the user approves, rejects, or edits, the backend writes that decision into state and routes the workflow accordingly. Approve continues or finalizes, Reject usually sends the workflow back for revision, and Edit updates upstream state and reruns affected downstream nodes.

## 10. Project Expression

In Demo5, DeepSeek generates a PRD draft, but the system does not publish it immediately. It saves a checkpoint and pauses at PRD approval. The user can approve, reject, or edit. Approve completes the workflow, Reject invalidates the PRD and returns to requirements approval, and Edit updates the requirements, regenerates the PRD with DeepSeek, and pauses again for approval. This demonstrates a recoverable enterprise-style AI workflow rather than a one-shot generation page.
