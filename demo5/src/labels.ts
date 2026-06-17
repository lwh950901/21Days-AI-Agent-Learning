export const STATUS_LABELS = {
  running: "运行中",
  waiting_for_human: "等待审批",
  completed: "已完成",
  failed: "失败",
} as const;

export const NODE_LABELS = {
  requirementsApproval: "需求确认",
  generatePrd: "PRD 生成中",
  prdApproval: "PRD 审批",
  finalize: "已完结",
} as const;
