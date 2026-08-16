begin;

-- A standalone $5 purchase must not grant the umbrella product.digital
-- entitlement, otherwise buying one case would unlock every digital product.
insert into public.entitlements (id, label, description)
values (
  'product.case_study_single',
  'Single case study',
  'Unlocks the standalone single-case-study product only.'
)
on conflict (id) do update
set
  label = excluded.label,
  description = excluded.description;

-- Stripe price ids are environment-specific. Keep the offer inactive until a
-- verified one-time USD $5 Live price is attached through the admin workflow.
insert into public.products (
  slug,
  title,
  summary,
  price_cents,
  price_label,
  bullets,
  stripe_price_id,
  entitlement_id,
  is_active
)
values (
  'case-study-single',
  '单篇真实录取案例',
  '解锁一篇真实录取案例，聚焦一个具体申请问题，看清背景、选择与结果之间的关系。',
  500,
  '$5',
  array[
    '一次性解锁 1 篇案例',
    '围绕真实客户问题展开分析',
    '查看背景、定位与文书思路',
    '购买后保留账号访问权'
  ],
  null,
  'product.case_study_single',
  false
)
on conflict (slug) do update
set
  title = excluded.title,
  summary = excluded.summary,
  price_cents = excluded.price_cents,
  price_label = excluded.price_label,
  bullets = excluded.bullets,
  entitlement_id = excluded.entitlement_id;

commit;
