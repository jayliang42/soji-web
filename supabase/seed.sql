insert into membership_plans (id, name, monthly_price, stripe_lookup_key, revenuecat_entitlement, description)
values
  ('free', 'Free', 0, null, null, 'Public access only.'),
  ('tier_1', 'Tier 1', 29, 'tier_1_monthly', 'tier_1', 'Monthly articles and the foundational content library.'),
  ('tier_2', 'Tier 2', 128, 'tier_2_monthly', 'tier_2', 'Full content, case studies, templates, and monthly update drops.'),
  ('tier_3', 'Tier 3', 299, 'tier_3_monthly', 'tier_3', 'Everything in Tier 2 plus office hours and private group access.')
on conflict (id) do update
set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  stripe_lookup_key = excluded.stripe_lookup_key,
  revenuecat_entitlement = excluded.revenuecat_entitlement,
  description = excluded.description;

insert into entitlements (id, label, description)
values
  ('content.basic', 'Basic content', 'Unlocks foundational member articles.'),
  ('content.all', 'All content', 'Unlocks all articles and advanced pieces.'),
  ('library.case_studies', 'Case studies', 'Unlocks the case study library.'),
  ('library.templates', 'Templates', 'Unlocks the template library.'),
  ('monthly.updates', 'Monthly updates', 'Unlocks monthly update packs.'),
  ('office_hours.join', 'Office hours', 'Unlocks office hour registration.'),
  ('community.vip_access', 'VIP community', 'Unlocks the private group link.'),
  ('contact.unlock', 'Contact unlock', 'Unlocks direct contact details.'),
  ('product.digital', 'Digital products', 'Unlocks standalone digital products.')
on conflict (id) do update
set
  label = excluded.label,
  description = excluded.description;

insert into plan_entitlements (plan_id, entitlement_id)
values
  ('tier_1', 'content.basic'),
  ('tier_2', 'content.basic'),
  ('tier_2', 'content.all'),
  ('tier_2', 'library.case_studies'),
  ('tier_2', 'library.templates'),
  ('tier_2', 'monthly.updates'),
  ('tier_3', 'content.basic'),
  ('tier_3', 'content.all'),
  ('tier_3', 'library.case_studies'),
  ('tier_3', 'library.templates'),
  ('tier_3', 'monthly.updates'),
  ('tier_3', 'office_hours.join'),
  ('tier_3', 'community.vip_access'),
  ('tier_3', 'contact.unlock')
on conflict (plan_id, entitlement_id) do nothing;

with content_seed as (
  insert into content_items (
    slug,
    title,
    summary,
    type,
    visibility,
    body_markdown,
    cover_image_url,
    published_at
  )
  values
    (
      'money-reset-ritual',
      'Money Reset Ritual',
      'A structured monthly ritual for reviewing spending, savings, and emotional money patterns.',
      'article',
      'members_only',
      '## Monthly reset workflow

1. Review last month''s spending.
2. Mark the purchases that felt high-value.
3. Cut one category with low emotional return.
4. Re-allocate that money to savings or debt payoff.

This is the baseline ritual for Tier 1 members.',
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
      now() - interval '10 days'
    ),
    (
      'salary-negotiation-playbook',
      'Salary Negotiation Playbook',
      'An annotated case study with messaging, leverage framing, and outcome analysis.',
      'case_study',
      'members_only',
      '## Case study breakdown

This case study walks through:

- how the candidate framed impact
- how they anchored the number
- how they handled pushback
- how they closed without over-talking

Use this as a reusable negotiation reference.',
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
      now() - interval '7 days'
    ),
    (
      'wealth-dashboard-template',
      'Wealth Dashboard Template',
      'A simple personal wealth tracker covering net worth, cash runway, and monthly focus metrics.',
      'template',
      'members_only',
      '## Template notes

This template should be paired with a file download in storage later.

For now, use the structure below:

- Net worth tracker
- Cash position
- Investing check-in
- Debt snapshot
- Monthly priority list',
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
      now() - interval '4 days'
    ),
    (
      'march-2026-update-pack',
      'March 2026 Update Pack',
      'A monthly drop with updated scripts, budget notes, and momentum prompts.',
      'monthly_update',
      'members_only',
      '## This month''s update

- revised reset checklist
- new pricing prompt list
- three content ideas for side-income testing',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
      now() - interval '2 days'
    )
  on conflict (slug) do update
  set
    title = excluded.title,
    summary = excluded.summary,
    type = excluded.type,
    visibility = excluded.visibility,
    body_markdown = excluded.body_markdown,
    cover_image_url = excluded.cover_image_url,
    published_at = excluded.published_at
  returning id, slug
)
insert into content_access_rules (content_id, entitlement_id)
select id, entitlement_id
from (
  values
    ('money-reset-ritual', 'content.basic'),
    ('salary-negotiation-playbook', 'library.case_studies'),
    ('wealth-dashboard-template', 'library.templates'),
    ('march-2026-update-pack', 'monthly.updates')
) as mapping(slug, entitlement_id)
join content_seed using (slug)
on conflict (content_id, entitlement_id) do nothing;

insert into office_hour_sessions (
  title,
  starts_at,
  signup_url,
  replay_url,
  required_entitlement_id
)
values
  (
    'April Office Hour: Pricing Your Expertise',
    now() + interval '14 days',
    'https://example.com/office-hour-signup',
    'https://example.com/office-hour-replay',
    'office_hours.join'
  )
on conflict do nothing;
