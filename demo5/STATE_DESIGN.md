# Demo5 State Design

## 1. Demo Goal

This demo shows how a recoverable AI workflow handles state, persistence, checkpoint, resume, and human-in-the-loop.

The workflow is:

```text
Product idea
-> requirements approval
-> restore by threadId
-> DeepSeek PRD generation
-> PRD approval
-> approve / reject / edit
-> finalize or regenerate
```

The important point is not only that DeepSeek can generate a PRD. The important point is that the workflow can pause, persist, restore, and continue from the correct step.

## 2. Four State Boundaries

### UI State

UI State only controls the interface.

Examples:

- Button loading
- Whether a panel is expanded
- Which tab is open
- Temporary text before the user starts the workflow

UI State should not be used to resume a backend workflow.

### Model Messages

Model Messages are the conversation context sent to or produced by the model.

Examples:

- User message
- Assistant message
- Tool result message

Messages are useful for chat history and model context, but they should not be the only place where workflow progress is stored.

### Agent State

Agent State is the structured business state used by the workflow.

Examples in this demo:

- Product idea after the workflow starts
- Clarified requirements
- DeepSeek PRD draft
- Human decision: approve, reject, or edit
- Revision count
- Human feedback

If a value affects the next node, model generation, human approval, or final output, it belongs in Agent State.

### Checkpoint

Checkpoint is the persisted recovery snapshot.

It contains:

- `threadId`: which workflow run to restore
- `currentNode`: where the workflow is now
- `nextNode`: where the workflow may go next
- `status`: running, waiting for human, completed, or failed
- `state`: the full Agent State
- `createdAt` and `updatedAt`

Checkpoint is what lets the workflow resume after refresh, interruption, or human delay.

## 3. Field Ownership in Demo5

| Data | Belongs To | Reason |
| --- | --- | --- |
| Button loading | UI State | Only controls the page interaction |
| Product idea before submit | UI State | Temporary input draft |
| Product idea after submit | Agent State | It drives PRD generation |
| PRD draft | Agent State | It is a workflow output and needs approval |
| Approve / Reject / Edit | Agent State | Human decision changes workflow routing |
| Current node | Checkpoint | It is execution position, not business content |
| Waiting for approval | Checkpoint | It is runtime status |
| Chat history | Model Messages | It is conversation context |
| Full restore package | Checkpoint | It restores workflow state and position |

## 4. Refresh and Resume Flow

```text
1. Workflow reaches a human approval step.
2. Backend saves a checkpoint.
3. Checkpoint status becomes waiting_for_human.
4. Page refreshes or user comes back later.
5. Frontend uses threadId to request the checkpoint.
6. Backend returns currentNode, status, and state.
7. Frontend restores the approval UI.
8. User chooses Approve, Reject, or Edit.
9. Backend writes the human decision into Agent State.
10. Workflow resumes to finalize, regenerate, or wait again.
```

## 5. Why Not Store Everything in Messages

Messages can show what was said, but they do not reliably describe workflow execution.

If the system only stores messages, it may not know:

- Which node is active
- Whether the workflow is waiting for human approval
- Which node should run next
- Whether an old output was rejected or edited
- Which workflow run is being restored

For recoverable workflows, messages are not enough. The system needs structured Agent State and checkpoint metadata.

## 6. Common Mistakes

- Saving chat history but not saving checkpoint.
- Putting `currentNode` only inside an assistant message.
- Treating Approve as a button color instead of a state transition.
- Letting Edit change input without invalidating the old output.
- Saving `state` but not saving `status`, causing the workflow to skip HITL.

## 7. Interview Expression

In a recoverable AI workflow, I separate UI State, Model Messages, Agent State, and Checkpoint. UI State is only for the interface, Model Messages are for chat history and model context, Agent State stores structured business data used by the workflow, and Checkpoint stores the recovery snapshot with threadId, current node, status, and full Agent State. This avoids putting workflow progress into messages and lets the system resume correctly after refresh, failure, or human approval.

## 8. Project Expression

In Demo5, DeepSeek generates the PRD, but the workflow does not end immediately. The system saves a checkpoint at approval points, including the current node, runtime status, and Agent State. When the user approves, rejects, or edits, the decision is written back into state and the workflow either completes, returns to an earlier step, or regenerates the PRD. This makes the demo closer to an enterprise AI workflow than a simple text-generation page.
