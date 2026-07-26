# Soji Launch Checklist

这份清单用于把 Soji 从本地 demo preview 推到可收款、可登录、可运营的生产环境。

## 0. 当前结论

- 项目可以部署到服务器。
- 最推荐先部署 `apps/web` 这个 Next.js Web 应用。
- Expo app 目前还是 shell，不建议和 Web 首次上线绑在一起。
- 上线前必须完成 Supabase、Google Auth、Stripe、admin 账户、billing webhook 的生产配置。

2026-07-22 本地配置检查（只检查是否存在，不记录密钥内容）：

- [x] `NEXT_PUBLIC_SITE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `STRIPE_SECRET_KEY`
- [ ] Stripe membership Price 深度检查：三档 lookup key / USD / 月付 / 金额尚未全部通过
- [x] `SOJI_DEMO_MODE`：本地示例为 `true`；生产必须覆盖为 false 或不设置
- [x] `SUPABASE_SERVICE_ROLE_KEY`：已配置并通过生产 Supabase 写入/查询验证
- [ ] `STRIPE_WEBHOOK_SECRET`：当前为空
- [ ] `CRON_SECRET`：缺失；生产需设置独立随机值以启用定时私有文件清理
- [ ] `REVENUECAT_WEBHOOK_AUTHORIZATION`：缺失，Web 首发可以暂缓
- [x] 首个 Admin 已通过受限 RPC bootstrap；`supabase/publisher-setup.sql` 保留安全占位符
- [x] 本地 Supabase：migration 增量同步、可重复 declarative schema、schema lint、247 项数据库回归和并发/清理边界 UAT 已通过

生产 Supabase 的 migration、seed、服务端访问、Google Provider、真实 Google 登录和
首个 Admin 已验证。生产域名回调、自定义 SMTP、Stripe catalog/webhook 和付款 UAT
仍未完成，因此当前仍不能开放真实付款。

## 1. 部署目标确认

- [ ] 选择部署平台

怎么做：

1. 最省事：用 Vercel 部署 `apps/web`。
2. 也可以部署到自己的 VPS/服务器；正式发布使用仓库的多阶段 Docker standalone
   镜像，不在生产主机上复制本地 `.env` 或直接运行开发工作区。
3. 暂时不要把 Expo app 当成首发生产入口。

完成标准：

- 你知道生产域名是什么，比如 `https://soji.example.com`。
- 后续 Supabase、Google、Stripe 的回调地址都用这个域名。

## 2. Web 环境变量

- [ ] 配置生产环境变量

需要配置：

```bash
NEXT_PUBLIC_SITE_URL=https://<your-domain>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-stripe-webhook-signing-secret>
CRON_SECRET=<at-least-32-random-bytes>
SOJI_DEMO_MODE=false
OPS_ALERT_WEBHOOK_URL=<optional-https-operations-endpoint>
```

怎么做：

1. 如果用 Vercel，在 Project Settings -> Environment Variables 添加这些变量。
2. 如果用自己的服务器，把它们写进服务器的生产环境变量，不要提交到 git。
3. `NEXT_PUBLIC_SITE_URL` 必须是最终生产域名的 HTTPS origin，例如
   `https://soji.example.com`；不能使用 localhost、HTTP、路径、query、fragment 或内嵌账号密码。
4. `STRIPE_WEBHOOK_SECRET` 必须直接使用 Stripe endpoint 提供的 `whsec_...` signing secret；
   空值、普通占位文本或首尾空格都会让 Checkout/readiness 按未配置处理。
5. 生产环境不要把 `SOJI_DEMO_MODE` 设为 `true`。开发和测试需要固定预览数据时才显式开启。
6. 部署运行时使用 Node.js 22 或更新版本；仓库 `.nvmrc` 和 package engines 已固定最低版本。
7. 用 `openssl rand -hex 32` 生成独立 `CRON_SECRET`；不要复用 Stripe、Supabase 或登录密钥。

完成标准：

- `/admin` 的 Launch Checklist 不再显示基础配置缺失。
- 必须在 `source: "supabase"` 的真实 Admin 会话中核对；demo preview 的身份、billing
  rows 和商品 fixtures 只用于界面预览，永远不算生产就绪证据。
- `GET /api/health/ready` 返回 `200`，其中 `demoModeDisabled`、
  `supabasePublicOperational`、`supabaseServiceRoleOperational` 和
  `stripeMembershipPrices` 全部为 `true`。
- `corepack pnpm --filter @soji/web build` 在生产变量环境下通过。

## 3. Supabase 项目初始化

- [x] 创建 Supabase project
- [x] 执行 schema
- [x] 执行 seed

Phase 1 的生产 migration parity 与身份 readiness 必须按
[Production Identity and Admin UAT](./phase-1-production-identity-uat.md) 记录到
[Phase 1 evidence](../.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md)。
其中只要求六个 Supabase/identity 检查为 `true`；Stripe 尚未完成时，整个 readiness
endpoint 仍可能返回 `503`，这不应被误判为 Phase 1 失败。

怎么做：

1. 在 Supabase 创建一个生产 project。
2. 在本机运行 `supabase login`，然后用 `supabase link --project-ref <project-ref>` 关联项目。
3. 先运行 `supabase db push --dry-run` 审查待执行 migration，再运行
   `supabase db push`；不要直接编辑已经部署的 migration。
4. 按生产目录需要审查 [seed.sql](../supabase/seed.sql)，
   确认内容正确后再运行 `supabase db push --include-seed`，或在 SQL Editor 单独执行 seed。

完成标准：

- 数据库里有 profiles、user_roles、content_items、products、billing_events 等表。
- `supabase migration list` 显示本地和远端 migration 版本一致。
- 数据库里有 `checkout_rate_limits` 表和 `consume_checkout_rate_limit` RPC。
- Storage 里有公开 bucket：`content-media`。
- `/library`、`/products`、`/office-hours` 能从 Supabase 读数据；真实查询为空时显示空状态，查询失败时显示不可用状态，不会用 demo 数据伪装成功。

## 4. Auth 与密码恢复

- [x] 在 Google Cloud 创建 OAuth Client
- [x] 在 Supabase 启用 Google provider
- [ ] 配置生产 redirect URL
- [ ] 配置生产自定义 SMTP
- [x] 验证 Google 登录（本地回调；生产域名仍待验证）
- [ ] 验证 email 注册、确认邮件和登录
- [ ] 验证密码重置邮件与新密码登录

生产域名 Auth、两家邮箱服务商、自定义 SMTP 和 Google callback 的统一验收步骤见
[Production Identity and Admin UAT](./phase-1-production-identity-uat.md)。上述未勾选项
只有在 [Phase 1 evidence](../.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md)
对应场景为 `PASS` 后才能勾选；localhost 或 preview 结果不能替代生产证据。

怎么做：

1. 打开 Google Cloud Console。
2. 创建 OAuth consent screen。
3. 创建 OAuth Client，类型选 Web application。
4. 添加授权回调地址。Supabase 通常会给一个 callback URL，形如：

```text
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

5. 把 Google Client ID 和 Client Secret 填到 Supabase Dashboard -> Authentication -> Providers -> Google。
6. 在 Supabase Authentication URL Configuration 里确认 Site URL 是：

```text
https://<your-domain>
```

7. 添加 Redirect URLs：

```text
https://<your-domain>/auth/callback
http://localhost:3000/auth/callback
```

8. 在 Supabase Authentication -> Email Templates 检查 Confirm signup 和 Reset password
   模板，确保链接使用 Supabase 提供的确认 URL，不要手工拼接 token。
9. 在 Supabase Authentication -> SMTP Settings 配置生产邮件服务商的 SMTP 凭据、发件人
   地址和名称。不要依赖 Supabase 默认邮件服务上线；默认服务仅适合试用，发送能力和频率受限。
10. 在邮件服务商关闭会改写确认/重置 URL 的 click tracking，并验证 SPF、DKIM、DMARC；
    否则一次性链接可能被改写或进入垃圾邮件。参考
    [Supabase Password-based Auth production guidance](https://supabase.com/docs/guides/auth/passwords#production-checklist)。
11. 若本地 Web 使用的不是 3000 端口，把实际开发地址（例如
   `http://localhost:3002/auth/callback`）也加入 Redirect URLs；生产只保留受控 HTTPS 域名。

完成标准：

- `/login` 点 `Continue with Google` 能跳转 Google。
- Google 登录后能回到 `/auth/callback`。
- 登录成功后能进入 `/account`。
- email 用户点 `Forgot password?` 后始终看到不泄露账号是否存在的确认文案。
- 有效重置邮件经过 `/auth/callback?flow=recovery` 后进入 `/reset-password`，修改密码后
  可以重新登录；过期或已使用链接显示明确失败状态。
- 生产自定义 SMTP 能把确认和重置邮件送到至少两个不同邮箱服务商；链接未被 tracking
  改写，发件域名通过 SPF/DKIM，DMARC 结果符合部署策略。
- 从预览域名打开登录页时，生产 OAuth/reset redirect 仍使用 `NEXT_PUBLIC_SITE_URL`，
  不使用当前代理 Host。
- `GET /api/me` 返回 `source: "supabase"`，不是 `source: "demo"`。

## 5. 第一个 Admin 账户

- [x] 注册主账号
- [x] 通过一次性 bootstrap 给主账号授予 `admin`
- [x] 验证 `/admin`

首个 Admin 已完成，保留为 carried-forward historical evidence。不要为了重新取证而再次
运行 bootstrap。后续角色变化、第二个 Admin 的 grant/revoke、最后一个 Admin 保护和
workspace 边界统一按
[Production Identity and Admin UAT](./phase-1-production-identity-uat.md) 执行，并记录到
[Phase 1 evidence](../.planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md)。

怎么做：

1. 在生产审计记录中检查已存在的 first-Admin 结果，不修改或重跑
   [publisher-setup.sql](../supabase/publisher-setup.sql)。
2. 确认 carried-forward 结果仍是 `member + admin`、没有付费 Tier，并有
   `first_admin_bootstrap` 审计来源。
3. 所有后续角色调整只使用 `/admin?view=users`。
4. 如果系统返回 `first_admin_already_exists`，这是预期保护，不应尝试绕过。

完成标准：

- 主账号可以打开 `/admin`。
- `editor` 或 `admin` 可以管理内容、商品、office hours。
- 只有 `admin` 可以查看 billing events。
- `admin` 可以在 Users 面板授予或撤销 editor/admin；系统不允许撤销最后一个 admin。
- Users 面板可以在全部 profile 中按 email/full name 搜索，并按 25 人翻页。
- 首次授权保留 `member + admin`、不赠送付费 Tier，并写入来源为
  `first_admin_bootstrap` 的 `role_change_events`；后续角色变更均由 Users 面板审计。
- 不再日常手工修改 `user_roles`，也不要重复运行初始化脚本。

## 6. Stripe 会员价格

- [ ] 创建 3 个 membership prices
- [ ] 设置 lookup keys
- [ ] 验证 subscription checkout
- [ ] 配置并验证 Stripe Customer Portal

怎么做：

1. 在 Stripe Dashboard 创建 3 个 recurring price。
2. 给它们设置 lookup key：

```text
tier_1_monthly
tier_2_monthly
tier_3_monthly
```

3. 确保这些 prices 是 active。
4. 在 `/pricing` 用登录账号测试 checkout。
5. 在 Stripe Dashboard -> Settings -> Billing -> Customer portal 启用需要的
   payment method、invoice 和 cancellation 功能。
6. 支付并收到 webhook 后打开 `/account`，确认订阅状态、账期和取消计划正确；
   点击 `Manage billing` 能进入当前账户的 Stripe Portal 并返回 `/account`。
   临时移除 webhook secret 或让 service-role readiness 失败，确认 Account 显示
   `Billing unavailable`，Portal API 返回 `503` 且 Stripe 不创建 Session。
7. 用同一账号快速发起两个不同 `requestId` 的 subscription checkout，确认只有一个
   返回 URL，另一个返回 `409`；重复同一个 `requestId` 应返回同一个 Stripe Session。
8. 完成一笔测试订阅后再次打开 `/pricing`，确认三档 CTA 都变为
   `Manage existing membership`，直接调用 API 也返回 `409`。

完成标准：

- `/pricing` 点击购买能创建 Stripe Checkout Session。
- Checkout 金额来自 Stripe price，不来自客户端。
- 支付成功后 Stripe 会触发 webhook。
- `/api/health/ready` 的 `stripeMembershipPrices` 为 `true`；三档价格都必须是
  active、USD、每月一次，金额分别为 `$29`、`$128`、`$299`。
- 已有 Stripe Customer 的会员再次 checkout 时复用原 Customer，不产生割裂账单历史。
- Portal 只能从当前用户拥有的 subscription 打开，期末取消后 Account 显示
  `Cancels at period end` 和准确的 access-through 日期。
- Portal 只有在 webhook 验签和 billing receipt 写入都就绪时才可打开；不可验证时
  Account 必须明确显示当前订阅未改变，并暂停账单管理。
- 同一用户不能同时创建两个有效 subscription Checkout Session，已有未终止订阅也不能
  再次购买；数据库中的 `subscription_checkout_intents` 不可由 authenticated 客户端读写。

## 7. Stripe 商品价格

- [ ] 给每个 active product 配置 Stripe Price ID
- [ ] 给每个 active product 配置仅购买者可访问的交付文件或内容
- [ ] 验证 product checkout
- [x] 商品保存/软下架使用 revision，直接表写不可绕过并发检查
- [x] 商品编辑器保护未保存字段，文件和归档操作明确丢弃影响

怎么做：

1. 在 Stripe 为每个一次性商品创建 one-time price。
2. 打开 `/admin?view=products`。
3. 先把商品保存为 inactive draft。
4. 上传 PDF、ZIP、XLSX 或 DOCX 交付文件，最大 25 MB。
5. 填写真实 Stripe price ID，确认币种是 USD，金额与 Price cents 一致。
6. 勾选 Active in shop 并保存；管理 API 会验证 Stripe，数据库会验证私有交付资产。
7. 从 `/products` 测试 checkout。
8. 返回 `/account` 后确认 Payment confirmed、购买记录和 Download 按钮都出现。

完成标准：

- 每个 active product 都显示已映射 Stripe price。
- inactive draft 可以不配置 price；缺 price、非 one-time、非 USD、inactive 或金额不一致时无法激活。
- `/products` checkout 可以成功进入 Stripe。
- 没有 price ID 的商品不能被误买。
- 购买者能在 `/account` 查到已处理购买；直接伪造 success URL 不会显示付款成功。
- 每个已上线商品都有真实、仅购买者可访问的交付文件。
- 下载链接由服务端验证购买记录后生成，60 秒过期；删除文件会自动下架商品。

## 8. Stripe Webhook

- [ ] 创建 Stripe webhook endpoint
- [ ] 配置 webhook secret
- [ ] 验证 billing event 落库
- [ ] 验证失败事件可查

怎么做：

1. 在 Stripe Dashboard 创建 webhook endpoint：

```text
https://<your-domain>/api/webhooks/stripe
```

2. 勾选事件：

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
charge.refunded
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
charge.dispute.funds_withdrawn
charge.dispute.funds_reinstated
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

3. 把 Stripe 给的 signing secret 配到：

```bash
STRIPE_WEBHOOK_SECRET=whsec_<your-stripe-webhook-signing-secret>
```

4. 用 Stripe test mode 完成一次 checkout。
5. 打开 `/admin?view=billing` 检查事件。
6. 对测试商品分别执行部分退款和全额退款；确认部分退款仍可下载，全额退款后
   Account 不再显示 Download，直接请求旧下载 URL 也返回 404。
7. 使用 Stripe test dispute 流程验证创建、胜诉和败诉：创建后 Account 显示
   `Payment disputed / Access paused`，败诉显示 `Dispute lost / Access ended`，胜诉恢复 Download。

完成标准：

- Stripe webhook 返回 200。
- `billing_events` 里能看到 `received` 后变成 `processed`、`ignored` 或 `failed`。
- 延迟支付在 `checkout.session.completed` 为 `unpaid` 时不发放权益；只有
  `checkout.session.async_payment_succeeded` 到达后才创建购买记录和下载权限。
- `checkout.session.async_payment_failed` 会作为已验证事件保留在 billing 记录中，但不发放权益。
- 部分退款显示为 `partially_refunded` 并保留交付；全额退款显示为 `refunded`，撤销该笔购买的下载权益，且旧成功事件重放不能恢复。
- dispute 创建/调查期间暂停数字交付，败诉保持结束；胜诉、预警关闭或 prevented 仅在购买
  未全额退款时恢复。争议中的直接下载请求返回 404，旧 Checkout 重放不能恢复权限。
- 如果处理失败，状态会是 `failed`，并且有 `processing_error`。
- `/admin` 可以搜索到成功和失败的 billing event。

## 9. Office Hours

- [ ] 替换 demo signup URL
- [ ] 替换 demo replay URL
- [ ] 验证权限展示
- [x] 更新/删除使用 revision，authenticated 无法直接绕过
- [x] Admin 保护未保存场次，并按本地时区显示 `datetime-local`

怎么做：

1. 打开 `/admin` -> Office Hours。
2. 把 demo 链接换成真实预约链接和回放链接。
3. 确认每场 session 的 required entitlement 正确。

完成标准：

- `/office-hours` 不再暴露 placeholder 链接。
- 有权限用户能看到正确 signup/replay CTA。
- 无权限用户看到升级或购买提示。

## 10. 内容和封面图

- [x] Reader 与 Admin Preview 使用同一套安全 Markdown 渲染
- [x] Markdown 原始 HTML、正文图片和危险链接协议默认禁用
- [x] 内容更新使用 revision 防止多管理员静默覆盖，并保护未保存草稿
- [x] 内容删除同样校验 revision，旧页面不能删除其他管理员保存的新版
- [x] 编辑已发布内容时保留首次发布时间，单独更新编辑时间
- [ ] 上传真实 content cover image
- [ ] 发布至少一篇真实内容
- [ ] 验证内容访问权限

怎么做：

1. 打开 `/admin` -> Content。
2. 上传封面图，确认写入 `content-media` bucket。
3. 创建或编辑内容，设置 visibility 和 required entitlements。
4. 用未登录用户、free 用户、付费用户分别看 `/library/[slug]`。

完成标准：

- public 内容匿名可看。
- members-only 内容需要登录。
- purchase-required 内容需要对应 entitlement。
- 私有正文不会被匿名直接读到。

## 11. Billing 运维能力

- [x] 保留 billing events 查询
- [x] 增加 Stripe webhook retry
- [x] 增加 customer/subscription 主动 reconcile
- [x] 确定拒付争议的数字交付策略并接入 `charge.dispute.*` 事件
- [ ] 确定会员订阅拒付后的暂停、恢复和取消策略

当前状态：

- 已经有 `/admin` billing events 查询。
- 已经能看到 `received`、`processing`、`processed`、`ignored`、`failed`。
- `ignored` 表示签名已验证且已落库，但事件类型没有 Soji handler；它不会伪装成业务处理成功，也不会提供无效 Retry。
- `failed` 和卡在 `received` 的 Stripe 事件可以由 admin 点击 `Retry processing`。
- webhook retry 会从 Stripe 重新读取原始 event；主动对账记录的 retry 会校验已审计的
  `sub_...` / `cus_...` 并重新读取当前状态，不会错误请求不存在的 `reconcile_...` event。
- reconcile 可直接输入 `sub_...` 或 `cus_...`，不依赖原始 event 是否仍可读取。
- reconcile 本身也会先写入 billing event，因此成功、失败和发起人都有审计记录。
- `processing` 使用 120 秒数据库 lease；活跃 worker 期间禁止重复处理，过期后 Admin 可恢复，旧 worker 无法覆盖新结果。
- Stripe receipt 只保留最小事件/对象审计字段，不复制 customer details；上线前仍需确定 billing event 的业务/法务保留期限。
- 单品 dispute 独立记录 Stripe dispute ID/status/time：预警调查和正式争议暂停交付，败诉
  保持结束，胜诉/预警关闭/prevented 可恢复未退款购买。订阅或外部 PaymentIntent 会明确
  标记为 `ignored`，不会误写单品状态。

怎么做：

1. 先使用 Stripe 自动 retry 或 admin `Retry processing`。
2. 如果原始事件已无法读取，在 `/admin` Billing 输入 Stripe `sub_...` 或 `cus_...`。
3. customer 对账会拉取全部远端订阅，并关闭只存在于本地的陈旧订阅记录。
4. 每条陈旧订阅都通过同一个数据库事务同时更新 subscription、entitlements 和 effective tier；某条失败时对账记录保持 failed，可重试。
5. 对 dispute 失败 receipt 使用同一个 Retry；处理器重新读取 Stripe 原始事件和 PaymentIntent，
   然后通过 service-role-only RPC 原子更新 purchase 与 entitlement。

完成标准：

- 你能确认“我收到了 Stripe 事件”。
- 你能确认“处理成功还是失败”。
- 对失败事件有明确恢复手段。
- dispute 创建、调查、胜诉、败诉和 late win 的交付结果可从 Account、下载 API、RLS 与
  Billing receipt 交叉确认；全额退款不会因后续胜诉而恢复。

## 12. 自动化测试

- [x] 增加 checkout route validation tests
- [x] 增加 webhook tests
- [x] 增加 admin role policy tests
- [x] 增加 content access tests
- [x] 增加 checkout rate-limit tests
- [x] 增加 role-change audit 和 final-admin concurrency tests
- [x] 增加 Stripe subscription/purchase 原子事务和 ownership-conflict tests
- [x] 增加 OAuth callback 失败处理和 profile/member role 原子初始化 tests
- [x] 增加 subscription checkout 原子认领、重复订阅和 Pricing fail-closed tests
- [x] 增加 product checkout 按用户/商品原子认领、已购阻断和 Shop fail-closed tests
- [x] 增加 session provider 故障与真实 tier lock 分离的 Library/Office Hours tests
- [x] 增加密码恢复请求、callback、重置页面和 canonical Auth redirect tests
- [x] 将密码重置页加入桌面/移动端 axe 与 overflow 浏览器矩阵
- [x] 增加 Billing ignored 终态、不可重复认领和 Admin 展示 tests
- [x] 增加受支持 Stripe 事件缺少 ownership metadata 时的 fail-visible tests
- [x] 增加 Stripe dispute 暂停/败诉/胜诉/late-win/退款终态和 RLS tests

怎么做：

优先补这些测试：

1. Checkout route 只接受 `planId` / `productSlug` 和 UUID `requestId`，不能接受客户端传价格。
2. Stripe webhook 必须验证签名后才写 `billing_events`。
3. `editor` 不能看 billing events，`admin` 可以。
4. 匿名用户不能看私有内容正文。

当前已验证状态：domain 3 项、Web unit/route 415 项、数据库集成 269 项、
桌面/移动端 E2E 74 项，共 761 项。数据库退款/争议/订阅乱序/RLS、Billing 翻页、ignored 终态、metadata 失败和密码重置响应式场景均已复跑通过。
本地 Supabase RLS、角色管理、Stripe 既有业务状态事务和并发边界已验证；
Stripe 真实签名、重复事件和失败重试仍需生产凭据。

完成标准：

- 每次改 billing/auth/admin/content access，都能靠测试挡住明显回归。
- 在 scratch Supabase 项目连续调用同一类 checkout 6 次，第 6 次返回 `429` 和 `Retry-After`。

## 13. RevenueCat 和 App

- [ ] 暂缓首发
- [ ] 配置独立的 `REVENUECAT_WEBHOOK_AUTHORIZATION`
- [ ] 后续补 RevenueCat webhook
- [ ] 后续补 App Supabase Auth
- [ ] 升级 Expo SDK/工具链并把 OSV 移动端依赖基线降为 0
- [ ] 升级后完成 iOS/Android 真机回归

当前 endpoint 会校验 `Authorization`，但在 entitlement 持久化尚未实现前会返回
`501` 和 `received: false`。这是刻意的 fail-closed 行为，避免把未处理事件误报为已收到。

当前状态：

- Expo app 是 companion shell。
- RevenueCat webhook 文档有规划，但还没有完整生产实现。
- App 端还没有真实 Supabase Auth session。
- 当前完整锁文件仍有 39 个 OSV findings，均位于暂缓发布的 Expo/React Native
  工具链分支；Web 生产依赖图不包含对应受影响版本。

怎么做：

1. Web 先上线。
2. Web billing 稳定后再接 RevenueCat。
3. RevenueCat webhook 后续也应该写入 `billing_events`，和 Stripe 一样可查。
4. 不使用全局 transitive override 强压 Expo 依赖；按 SDK 支持矩阵升级后重新运行
   OSV、类型检查和双平台真机回归。

完成标准：

- App 内购和 Web entitlement 使用同一套权益语义。
- App 购买失败或 webhook 失败也能被追踪。

## 14. 生产监控

- [x] 配置结构化错误日志
- [x] 增加 liveness/readiness endpoints
- [x] 增加带独立密钥和持久回执的定时私有文件清理 endpoint
- [ ] 配置 webhook failure alert
- [ ] 配置 checkout failure alert
- [ ] 在部署平台配置 `CRON_SECRET` 并验证定时任务实际执行

怎么做：

1. 部署平台打开函数日志；支付、webhook 和 reconciliation 错误会输出单行 JSON。
2. 把 `OPS_ALERT_WEBHOOK_URL` 配成 HTTPS 运维接收端，代码会以 2 秒超时发送同一份结构化记录。
   Admin 只有在 URL 通过与运行时相同的校验后才显示 Ready；生产不接受 HTTP、内嵌账号密码或 fragment。
3. Stripe Dashboard 同时打开 webhook failure 监控。
4. 监控 `GET /api/health` 为 `200`；只有 `GET /api/health/ready` 为 `200` 且 `demoModeDisabled` 为 `true` 才允许接流量。
5. 对 `billing_events.status = failed` 做定期检查。
6. Vercel 会按根目录 `vercel.json` 每天 03:00 UTC 调用清理接口；自托管服务器按
   [部署手册](deployment.md)每 15 分钟调用一次，并对非 2xx 或 `failed > 0` 告警。
7. 在 `/admin?view=products` 查看 Private File Cleanup 队列；需要立即恢复时可手动重试。
8. 从部署环境制造一次受控测试错误，确认接收端实际收到；再模拟接收端非 2xx，确认平台日志出现
   `operations.alert_delivery_failed`。URL 合法只代表配置格式正确，不代表远端可达。

当前本地 `/api/health/ready` 会返回 `503`，因为 service-role 和 Stripe webhook secret
尚未配置。这是正确的 fail-closed 状态，不应通过硬编码绕过。

完成标准：

- 支付失败、webhook 失败、Supabase 写入失败不会静默发生。
- 你能在生产环境查到失败原因。

## 15. 部署方式

### 公开发现与用户信任

- [x] 首页、Pricing、Library、Shop、Office Hours 有独立 title、description 和 canonical
- [x] 配置 Open Graph、Twitter 大图、favicon、Web manifest、robots 和 sitemap
- [x] sitemap 排除 Account、Admin、Login、API 和 auth callback
- [x] Account、Admin、Login 显式 `noindex`
- [ ] 确定公开客服邮箱或支持 URL
- [ ] 由业务负责人/律师确认隐私政策、服务条款和退款政策
- [ ] 发布上述政策页面并在页脚与 Checkout 前提供入口

怎么做：

1. 提供一个长期有人处理的支持邮箱或工单 URL，不使用个人临时邮箱。
2. 明确订阅取消、已付周期、数字下载退款、数据保留和联系主体规则。
3. 让适用司法辖区的专业人士审核文本；不要直接复制其他网站条款。
4. 政策确认后再创建公开页面，并把链接加入全站页脚和支付决策页面。

完成标准：

- 搜索引擎只能发现公开内容，分享链接显示真实 Well Endowed 图文。
- 用户付款前能找到支持方式、退款规则、隐私政策和服务条款。

### Vercel 推荐路径

怎么做：

1. 连接 GitHub 仓库。
2. 确认 `quality`、`database`、`e2e`、`container` 四个 GitHub Actions job 全部通过，并在
   `main` 分支保护中设为 required checks。
3. 设置 Root Directory 为项目根目录。
4. Build command 使用：

```bash
corepack pnpm --filter @soji/web build
```

5. Output 由 Next.js/Vercel 自动识别。
6. 配置第 2 节里的环境变量。
7. 确认 Vercel Cron 已读取 `vercel.json`，且最新一次
   `/api/cron/product-asset-cleanup` 调用返回 `200`。
8. 绑定生产域名。

完成标准：

- 生产域名能打开首页。
- `/login`、`/pricing`、`/products`、`/admin` 都能访问。
- Stripe webhook endpoint 能从公网访问。

### 自己的服务器路径

怎么做：

1. 服务器安装 Docker Engine，并在仓库根目录构建环境专属镜像：

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://你的域名 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=你的公开AnonKey \
  -t soji-web:版本号 .
```

2. 把生产变量放在仓库外的 root-only 文件，例如 `/etc/soji/web.env`。公开的
   `NEXT_PUBLIC_*` 运行时值必须和 build args 一致；service role 与 Stripe secrets
   只能在运行时注入，不能作为 build args。
3. 启动非 root standalone 容器：

```bash
docker run -d \
  --name soji-web \
  --restart unless-stopped \
  --env-file /etc/soji/web.env \
  -p 127.0.0.1:3000:3000 \
  soji-web:版本号
```

4. 用 Nginx/Caddy 反向代理到 loopback 端口并配置 HTTPS。
5. 用 `/api/health` 做进程重启判断，用 `/api/health/ready` 做接流量与收款判断。
6. 按 [服务器部署手册](deployment.md) 完成更新、验证和 immutable image 回滚。

完成标准：

- Docker health 显示 `healthy`，容器用户为非 root `nextjs`。
- `corepack pnpm deploy:check` 与镜像构建都通过，镜像不包含任何 `.env` 文件。
- HTTPS 可用。
- `/api/health/ready` 返回 `200` 后才开放 Checkout。
- Stripe webhook 能访问公网 HTTPS 地址。
- 定时私有文件清理至少成功运行一次，Admin Products 队列可查看和手动恢复。

## 16. 最小上线定义

如果只做 Web 首发，至少完成：

- [ ] 生产域名
- [x] Supabase schema/seed
- [ ] Google Auth 或 email auth 至少一种可用
- [x] 第一个 admin 账户
- [ ] Stripe membership prices
- [ ] Product price IDs
- [ ] Stripe webhook
- [ ] 定时私有文件清理已携带 `CRON_SECRET` 成功执行
- [ ] 生产环境 `SOJI_DEMO_MODE` 未开启
- [ ] `/api/health/ready` 返回 `200`
- [ ] `/admin` billing events 可查
- [ ] `/account` 订阅记录和 Customer Portal 可用
- [ ] Office hour 链接替换
- [ ] GitHub `quality`、`database`、`e2e`、`container` 和 OSV PR required checks 全部通过
- [x] `corepack pnpm --filter @soji/web typecheck` 通过
- [ ] `corepack pnpm --filter @soji/web build` 通过

全部完成后，这个项目可以作为 Web 产品上线收款和运营。

## 17. GSD 长期维护工作流

- [x] 本地 Get Shit Done skills 已安装到项目
- [x] 代码库映射、工程审计和测试覆盖文档已建立
- [x] 初始化标准 GSD 项目文件
- [x] 建立 milestone、requirements、roadmap 和 phase 状态

当前 `.planning` 已有审计和 codebase 文档，但缺少 GSD 标准的 `PROJECT.md`、
`REQUIREMENTS.md`、`ROADMAP.md`、`STATE.md` 和 phase 目录。因此审计、修复和
文档方法可以使用，但 `gsd-progress`、phase execution、phase review 还不能完整工作。

怎么做：

1. 明确回复“初始化 GSD”，授权合并现有 `.planning`，不要覆盖已有审计。
2. 先把当前需求、上线清单和 codebase 文档导入标准项目上下文。
3. 建立首个 milestone，把生产凭据 UAT、Google Auth、首个 admin、Stripe 和部署拆成 phases。
4. 后续每个 phase 按 discuss -> plan -> execute -> verify -> audit 推进。
5. 完成真实生产 UAT 前，不把 milestone 标为完成。

完成标准：

- `gsd-progress` 能识别项目和当前 phase。
- 每个上线阻塞项都有 requirement、负责人、验证方式和完成证据。
- UI、billing、auth 或数据库改动都能追溯到 phase 计划和测试结果。
