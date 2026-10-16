# Case 001 · AI Proposal 预期 Diff 与审批行为

初始已批准版本：`project.spec.json`，`revision: 1`，只有已知 `REQ-IK-001`、`EXP-IK-001`、`TEST-IK-001`。

输入：`custom-recipe.proposal.json`，`baseRevision: 1`。

预期差异：

```diff
+ REQ-IK-002 通过自然语言或手动配置创建自定义配方
+ EXP-IK-002 自定义配方表单与预览
+ TEST-IK-002 自定义配方创建与导出
```

这三个新增对象必须通过完整 Schema、ID 唯一性、跨引用检查、动作绑定检查；原有三个对象必须保持不变。

**Diff 里应明确新 Experience 涉及**：配方名称输入、抬升距离滑块、动画时长滑块、校验并预览按钮、错误/状态提示；必须可让用户真实操作，而非截图。

**拒绝结果**：`revision=1`、`requirements.length=1`、`experiences.length=1`、`tests.length=1`，并保留拒绝记录（如用户选择保留历史）。

**批准结果**：一次原子事务，将上述三个对象写入新 approved `revision=2`，要求、交互、测试引用可互相定位。已批准版本中不能有悬空引用；按当前提案，新需求在被批准时 `status=approved`，但这只代表需求规范通过人工审阅，绝不代表 IntentKit 已实现它。

**被拒绝的例子**：
- 把 `baseRevision` 改成 0 或 2：拒绝或标为 stale，不能覆盖当前版本。
- 让 `REQ-IK-002.experienceIds` 引用不存在的 `EXP-IK-999`：拒绝整个 proposal。
- 把 `TEST-IK-002.status` 改成 `external-verified`：**不能让 AI 自证实现成功**，proposal schema 应拒绝。
- 为 Experience 添加未知 component `evalJS`、未知 event action `fetchURL`：拒绝。
- 如果人工批准流程中任何一步失败：全部回滚；不能只新增需求却没新增交互与测试。

**注意**：这个 Diff 是从输入规范计算出来的预期，不是假称 PSW 已经能渲染或执行上述功能。
