# PSW 工作空间协议

## 当前补充：Markdown 与 Proposal v0.2

本节为本轮实现；下方保留 M1 协议说明作为兼容依据，其“尚未接入”等阶段状态由本节和 M2_M4_VALIDATION.md 更新。

- 产品 Schema 仍为原始 0.1.0，SHA256：`ee39c6afe193309b888170f72f5cea7cf1f35496f0f1071a15b7e69d931ea7ff`。不新增产品字段；完整人类 Markdown 在 `unstructuredNotes` 首个以 `<!-- psw:document:v1 -->\n` 开头的条目内。其他原始 notes 保留。
- 无标记的旧项目，首次显示由语义索引投影出 Markdown；编辑后标记原文成为阅读正文。正文任意内容保留；标准标题区域在失焦时同步需求标题、描述、验收和约束，其他段落不猜测映射。Markdown 文件导入直接成为待批准正文，不先包进一份模板。
- 工作空间仍 formatVersion 1，新增可选 `proposalBase: string`，是发出模型请求时当前 draft 的精确 JSON 指纹。新模型候选基于该草稿模拟，保留之前人工改动；指纹变化阻止批准。旧导入提案没有此字段时仍要求手动草稿先处理完毕。
- `proposalBase` 不含 Key，仅含本来就属于工作区的上下文。AI 设置、Key、授权 verifier、authURL、模型目录和调用结果均不进入工作空间。
- Proposal 协议 v0.2 只增加 `updateDocument: {op, markdown}` 白名单操作（最多 200000 字符），不修改项目 schemaVersion。旧提案可原样迁移：`node scripts/migrate-proposal-v01-v02.mjs old.json new.json`。脚本校验后复制，不批准任何内容。原始 fixture 和旧操作回归保留。
- 若已有标记正文且提案修改需求，必须同时 updateDocument。带标准需求章节的提案正文与结构化索引的标题/描述/验收/约束必须一致；否则显示语义错误并禁用批准。任意自由段落不会被自动当作结构字段。
- 有效候选可显式转入人工草稿：不增加 revision，保留撤销，清除待审提案；随后按人工编辑流程审批。
- Schema、reference、scenario、externalImplementation 证据分开；操作预览不会自动改测试状态。只有真实外部证据才支持外部实现声明。
- Codex 交接默认使用批准版镜像 workspace，包含批准快照、审阅、MD、机器 JSON、AGENTS、CODEX_TASK 和验证层级。当前工作草稿只在主动勾选后另附 drafts/；重导入默认打开批准版，草稿附件可单独导入。完整备份仍保留整个工作区。
- M1 旧表单 editor 字段仍能读、备份和明确合并/放弃；新版正文不使用卡片选择式编辑。

## M1 原有约定

规范合同继续使用 `schemaVersion: "0.1.0"`；原始 Schema、基线与提案未改动。M1 新增的备份/本地存储外层是独立的 `formatVersion: 1`，不声称修改了已批准规范 Schema。

```text
format: "psw-workspace"
formatVersion: 1
nextRequirementNumber?: number       单调递增 ID 计数，取消/删除后不复用
approved: ProductSpec                严格原始 Schema + 语义校验
draft: DraftSpec                     未批准草稿，允许不完整需求
baseRevision: number                必须等于 approved.revision 和 draft.revision
snapshots: ProductSpec[]             已批准版本快照，含当前 approved
undo: DraftSpec[]                    本 revision 的未批准编辑历史
redo: DraftSpec[]
editor: {isNew, requirement} | null   未保存到列表的临时表单，刷新可恢复
proposal: Proposal | null            仅候选，结构合法但可 stale / 语义不合法
reviews: {id, at, source, summary, revision}[]
```

字段类型见 `src/domain/types.ts`；导入和存储通过 `assertWorkspace` 验证外层允许字段、所有规范/草稿/快照、版本一致性、表单形状与关联、提案结构及审阅记录。危险键、循环、非 JSON 对象、超深/超大数据拒绝。nextRequirementNumber 为可选的兼容扩展；旧备份不含它时仍可读取，新建需求时从已有规范、快照、撤销/重做中的编号推导安全起点并写入递增计数。有此计数后，不因撤销栈截断而复用删除或取消的 ID。

DraftRequirement 与原始 Requirement 唯一区别是允许标题/描述/验收条件为空，acceptanceCriteria 可为空数组；其他原始字段与类型保留。内部草稿 JSON Schema 从原始 Schema 克隆，只放宽这些必填内容的长度；仍实施唯一 ID、跨引用、双向关联、事件、动作、绑定与范围检查。批准时重新使用未经修改的完整 Schema，再做语义检查。

Requirement 的 status 与项目批准版本不同：批准某 revision 不会自动把所有条目变成 approved，更不会改变测试为 passed。默认新增条目为 draft，用户可在表单选择“需求已确定”。Agent 实施时应读条目状态与验收，不把草稿当作已经确定实现的需求。

## 原子版本与存储

IndexedDB 数据库 `psw-local-workspace`、版本 1、对象仓库 `workspaces`；`active` 记录结构为 `{generation, value: Workspace}`。generation 是每次本地写入递增的存储并发令牌，不能与产品批准 revision 混淆，完整备份不携带 generation。事务读取 active 的 generation，比较页面预期，再整体写入；任何不匹配或写入失败均中止事务。

每次批准增加 approved.revision，写入一次 history，生成快照、清空当前撤销/重做并重置 draft。审批说明、时间与来源另存 reviews；不扩展原始 history 的字段。回退复制某快照内容生成新的 revision，保留原有完整 history 和快照。

损坏恢复是明确用户操作，将原始 active 另存为 `recovery-<time>-<id>`，随后写入恢复内容；两个写入在同一事务中。若 active 已被别页恢复成有效记录，则拒绝覆盖。应用不自动删除恢复副本。

## 导入导出

项目 JSON 创建新的工作空间；完整工作空间 JSON/ZIP 保留所有对象与引用。M1 ZIP 中 workspace.json 是完整备份，product-spec/project.spec.json 和 requirements.md 是当前 approved 投影。两份批准数据不一致时整体拒绝。仅包含受控已知文件，不执行任何归档内容。

Markdown 原文未经解释进入新项目的 draft.unstructuredNotes，approved 初始不包含这些笔记，需审阅批准。文件导入验证失败、用户取消替换、冲突或存储失败时，原工作空间不被替换。项目更换前提示先备份，M1 只保存一个活动项目。

该协议让 Agent 直接读取文件，无需操作 GUI。Proposal 仍按原始 Proposal Schema 交换。M1 ZIP 是备份，尚不是含 AGENTS/CODEX_TASK/验证报告的 M4 Codex Handoff。
