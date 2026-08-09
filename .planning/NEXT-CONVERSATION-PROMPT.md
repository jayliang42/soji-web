# 新对话 Prompt

下面整段可以直接复制到下一个 Codex 对话：

```text
/goal 请继续在 /Users/liangzhisong/PersonalProject/soji-web 收尾 Soji Web 项目，不要重新规划一个新产品。

先读取并以这些文件为准：
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/ROADMAP.md
- .planning/STATE.md
- .planning/REMAINING-GAPS.md
- .planning/HANDOFF.json
- .planning/phases/05-production-deployment-and-rollback/.continue-here.md
- .planning/phases/05-production-deployment-and-rollback/05-04-PLAN.md
- docs/phase-4-experience-and-operations-acceptance.md
- docs/phase-5-production-deployment-and-rollback.md
- .planning/phases/05-production-deployment-and-rollback/05-UAT-EVIDENCE.md

执行约束：
1. 全程只使用 Codex，不使用 Claude，也不要调用 Claude/Ultraplan。
2. 重点是功能闭环、真实 UAT、发布、回滚和 UI/UX 收尾；不要启动泛化安全审计。只保留完成这些流程必需的 fail-closed 检查。
3. 不要重复开发已经完成的 UI 功能。当前剩余主要是 48 条 owner/provider 真实观察，不是缺少页面骨架。
4. 不要逐项向我索要登录。先一次性告诉我全部需要准备的 Hosting/Vercel、Supabase、SMTP、Google、Stripe、Soji 角色账号、运维接收方和 policy reviewer 上下文，集中成一个 checkpoint。
5. 不要让我把密码、token、邮箱、完整 provider ID、session URL 或 webhook/body/header 粘贴到聊天、终端、截图或文件里。使用已经登录的本地 CLI/浏览器上下文；如果外部上下文暂不可用，先完成所有可自动化工作并保持证据为 PENDING。
6. 保护现有 dirty worktree：先 `git status --short`，不要 reset、checkout、clean，也不要整体 stage。只提交本轮明确修改的文件。
7. 继续使用本地 GSD 流程。先执行 `$gsd-resume-work` 或等价的恢复流程；Phase 5 Plan 04 是唯一剩余计划，Plan 05-01 至 05-03 已完成。

下一步顺序：
1. 检查 handoff 与 05-04 plan，确认当前状态。
2. 一次性展示 consolidated owner checkpoint，列出所有需要登录/授权/外部观察的项目，不要分批提问。
3. 在任何 provider mutation 前，从 exact clean detached commit 运行：
   corepack pnpm phase5:release:check
   corepack pnpm phase1:uat:check
   corepack pnpm phase2:uat:check
   corepack pnpm phase3:uat:check
   corepack pnpm phase4:uat:check
   corepack pnpm phase5:uat:check
4. 如果 owner/provider 上下文已经可用，按 05-04 顺序完成 Phase 1–4 外部观察，然后执行 Phase 5 staged deploy → staged smoke → promotion → canonical smoke → rollback → prior smoke → re-promotion → final smoke。
5. 只把直接观察到的结果写进对应 UAT evidence；未观察到的保持 PENDING，矛盾保持 FAIL/BLOCKED。
6. 最后运行所有 `*:uat:ready`、`docs:check`、必要的全量测试/构建，更新 REQUIREMENTS、ROADMAP、STATE、verification 和 launch checklist 的真实状态。
7. 按 GSD 创建范围明确的 commits，并给出最终剩余项与任何需要我一次性处理的外部动作。

本项目的单一登录/owner 清单位置：
docs/phase-4-experience-and-operations-acceptance.md#consolidated-owner-checkpoint
```

## 重要说明

这个 prompt 的目标是“收尾当前 Soji 项目”，不是重新初始化 GSD，也不是再次做 UI brainstorm。外部登录和 provider 验收可以一次完成；如果你暂时不登录，Codex 仍应继续执行本地可自动化检查，不要把本地 PASS 误写成生产 PASS。
