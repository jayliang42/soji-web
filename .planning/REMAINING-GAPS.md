# Soji 项目收尾缺口

更新时间：2026-08-09T00:06:44Z

这份文档是下一轮对话的收尾清单。当前项目不是缺少大量页面或基础代码，主要缺口是生产环境、第三方服务和一次性人工验收。自动化证明不能替代真实 provider 观察，因此不能把本地测试直接改成生产 PASS。

## 当前结论

- Phase 3：已完成。
- Phase 4：已完成。
- Phase 5 Plan 01–03：已完成；Plan 04 是唯一剩余计划，且必须在一次 owner-authorized session 中执行。
- Phase 5：10 条自动化证据已 PASS，48 条 owner/provider 证据仍为 PENDING。
- `phase5:uat:ready` 在 48 条真实观察完成前必须保持非零。
- 当前 UI/UX 增强已经覆盖共享导航、阅读进度、阅读字号、保存、分享、Office Hours 下载、Continue reading 和 Support request composer；下一步不要继续堆新功能，优先关闭生产缺口。

## 一次性人工 checkpoint

不要分批询问登录。下一次对话必须一次性向用户列出以下所有需要准备的上下文，完成后再执行：

1. Hosting/Vercel `soji-web` 生产项目和 scheduler 权限。
2. Supabase production 项目 owner 权限，包括 Auth、迁移、service role 和 SMTP 设置。
3. Google OAuth owner 权限及两个受控邮箱供应商。
4. Stripe test mode owner 权限。
5. Soji 受控账号：Admin、editor、普通 member、三档会员、回访会员、产品购买者、非购买者。
6. 运维告警接收方权限。
7. 业务 owner 或合格 policy reviewer。

任何密码、token、邮箱地址、完整 provider ID、session URL、webhook body、response body、header、私有文件路径都不能粘贴到聊天、终端输出、截图、证据或 commit。

## Phase 1：Production Identity and Admin

对应证据：`.planning/phases/05-production-deployment-and-rollback/05-UAT-EVIDENCE.md`

| Scenario | 需要完成的真实观察 |
|---|---|
| `INFRA-01-READINESS` | production Supabase 迁移、service-role readiness 和所有命名 readiness booleans 为真。 |
| `AUTH-01-SIGNUP` | 两个受控邮箱完成 signup、确认邮件和 canonical callback。 |
| `AUTH-01-RECOVERY` | 用最新 recovery 邮件设置新密码，退出后用新密码重新登录。 |
| `AUTH-02-GOOGLE` | 从受保护目的地完成 Google consent，回到 canonical callback 和安全的原始路径。 |
| `ADMIN-01-ROLE-TRANSITION` | 临时授予/撤销第二 Admin，确认审计记录和最后一个 Admin 保护。 |
| `ADMIN-01-WORKSPACES` | 验证 Admin、editor、member 在 Users、Content、Products、Office Hours、Billing 等工作区的边界。 |

## Phase 2：Billing and Fulfillment

对应文档：`docs/phase-2-billing-and-fulfillment-uat.md`、`.planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md`

### 生产 schema 与 catalog

- `BILL-DB-SCHEMA-PARITY`：在核对 preflight 后，只应用两份已审阅 migration，确认本地/线上 parity 和 readiness。
- `BILL-01-CATALOG`：三档月付 USD Price、金额、周期和 lookup key 全部符合锁定配置。
- `BILL-01-PORTAL-CONFIG`：Customer Portal 管理、取消和 canonical Account return 正常。

### Membership Checkout

- `BILL-03-TIER-1-CHECKOUT`
- `BILL-03-TIER-2-CHECKOUT`
- `BILL-03-TIER-3-CHECKOUT`
- `BILL-03-CUSTOMER-REUSE`
- `BILL-03-PORTAL-CANCEL`

每档都要观察签名 webhook、Account 权益、Admin receipt，以及同一 customer 的连续购买/Portal 取消同步。

### Receipt、失败恢复与 reconciliation

- `BILL-02-SIGNED-RECEIPT`
- `BILL-02-IGNORED-RECEIPT`
- `BILL-02-FAILED-RETRY`
- `BILL-02-RECONCILIATION`

必须证明 receipt 已持久化和 processing outcome 相互独立；控制一次可恢复失败，使用 Retry，再做 authoritative reconciliation。

### Product delivery 与 reversal

- `BILL-04-PRODUCT-CATALOG`
- `BILL-04-PRODUCT-DELIVERY`
- `BILL-04-UNAUTHORIZED-DOWNLOAD`
- `BILL-04-PARTIAL-REFUND`
- `BILL-04-FULL-REFUND`
- `BILL-04-DISPUTE-OPEN`
- `BILL-04-DISPUTE-WON`
- `BILL-04-DISPUTE-LOST`

### Membership reversal policy

- `BILL-05-PARTIAL-REFUND`
- `BILL-05-FULL-REFUND`
- `BILL-05-DISPUTE-OPEN`
- `BILL-05-DISPUTE-WON`
- `BILL-05-DISPUTE-LOST`

Product 和 membership 都要验证 partial/full refund、dispute open/won/lost、Account/Admin 状态、直接下载/访问授权和后续 refresh 的稳定性。

## Phase 3：Launch Content and Customer Policy

- `PH3-OFFICE-MEMBER-SIGNUP`：entitled member 能打开真实 signup。
- `PH3-OFFICE-MEMBER-REPLAY`：entitled member 能打开真实 replay。
- `PH3-SUPPORT-RESPONSE`：Support action 到达真实可响应渠道。
- `PH3-POLICY-OWNER-APPROVAL`：owner/reviewer 审核 Privacy、Terms、Refund 和 Financial disclaimer。
- `PH3-STRIPE-TERMS-LIVE`：Hosted Checkout 显示并要求 canonical Terms acceptance。
- `PH3-CANONICAL-CONTENT-STATES`：guest、locked member、entitled member 的真实 content state 符合合同。

## Phase 4：Experience and Operations

- `PH4-OPS-RECEIVER-LIVE`：触发一次可重试 payment-processing failure，接收方收到版本化、脱敏事件，原业务结果不变。
- `PH4-CLEANUP-SCHEDULER-LIVE`：scheduler 成功调用 cleanup，只返回 aggregate totals，失败项仍可在 Admin 重试。
- `PH4-ADMIN-BILLING-LIVE`：production Admin Billing 清楚区分 receipt、processing、failed、ignored、Retry 和 reconciliation。

## Phase 5：Production Deployment and Rollback

- `PH5-ENV-READINESS`：确认 Vercel 环境变量名称、`apps/web/vercel.json`、demo mode、scheduler 和 readiness；不记录值。
- `PH5-STAGED-DEPLOYMENT`：从 exact clean detached commit 创建 `vercel deploy --prod --skip-domain` candidate，确认 READY、exact commit、无 canonical alias。
- `PH5-STAGED-SMOKE`：对 staged origin 做 liveness、readiness、security headers 和固定 public route smoke。
- `PH5-CANONICAL-PROMOTION`：不 rebuild，提升同一个 inspected candidate。
- `PH5-CANONICAL-SMOKE`：canonical guest/customer/Admin/Auth/access/billing/receiver/scheduler smoke 全部通过。
- `PH5-ROLLBACK`：Vercel Instant Rollback 恢复立即前一个 known-good deployment。
- `PH5-PRIOR-SMOKE`：恢复后的 prior 版本通过 identity、liveness、readiness、canonical 和 cron 检查。
- `PH5-REPROMOTE-SMOKE`：重新提升同一个 candidate，恢复正常生产状态并重跑最终 smoke。

回滚只操作应用 deployment；数据库迁移历史保持 forward-only，不做 down migration 或 snapshot restore。

## 自动化收尾命令

在任何 provider mutation 前，必须从 exact clean detached commit 运行：

```sh
corepack pnpm phase5:release:check
corepack pnpm phase1:uat:check
corepack pnpm phase2:uat:check
corepack pnpm phase3:uat:check
corepack pnpm phase4:uat:check
corepack pnpm phase5:uat:check
```

完成真实观察后再运行：

```sh
corepack pnpm phase1:uat:ready
corepack pnpm phase2:uat:ready
corepack pnpm phase3:uat:ready
corepack pnpm phase4:uat:ready
corepack pnpm phase5:uat:ready
corepack pnpm docs:check
```

任何 `PENDING`、`BLOCKED` 或 `FAIL` 都要保持真实状态，不可用 fixture、mock、设置截图或本地测试代替。

## 必须保留的项目边界

- 不要重新做已经完成的 UI 功能，也不要为了“看起来完成”修改证据状态。
- 不要创建第二份登录清单；所有登录和 owner 动作只放在 `docs/phase-4-experience-and-operations-acceptance.md#consolidated-owner-checkpoint`。
- 不要把当前工作区的既有未提交修改整体 stage；提交时只包含明确的 GSD 文件。
- 不要上传或打印任何 secret；Codex 通过已登录 CLI/浏览器上下文操作即可。
- 当前阶段重点是功能闭环、真实验收和发布收尾；不再启动泛化的安全审计。

## 权威阅读顺序

1. `.planning/PROJECT.md`
2. `.planning/REQUIREMENTS.md`
3. `.planning/ROADMAP.md`
4. `.planning/STATE.md`
5. `.planning/REMAINING-GAPS.md`
6. `.planning/phases/05-production-deployment-and-rollback/05-04-PLAN.md`
7. `docs/phase-4-experience-and-operations-acceptance.md`
8. `docs/phase-5-production-deployment-and-rollback.md`
9. `.planning/phases/05-production-deployment-and-rollback/05-UAT-EVIDENCE.md`
