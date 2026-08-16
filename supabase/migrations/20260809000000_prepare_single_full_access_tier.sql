begin;

-- Migrations run before seed.sql on a fresh project. Ensure the target plan
-- and every referenced entitlement exist before the tier-normalization
-- migration runs. Existing production rows remain unchanged.
insert into public.membership_plans (
  id,
  name,
  monthly_price,
  stripe_lookup_key,
  revenuecat_entitlement,
  description
)
values (
  'tier_1'::membership_tier,
  'Full Access',
  99,
  'full_access_monthly',
  'full_access',
  'One membership for the complete library, every digital product, live support, and all member benefits.'
)
on conflict (id) do nothing;

insert into public.entitlements (id, label, description)
values
  ('content.basic', 'Basic content', 'Unlocks foundational member articles.'),
  ('content.all', 'All content', 'Unlocks all articles and advanced pieces.'),
  ('library.case_studies', 'Case studies', 'Unlocks the case study library.'),
  ('library.templates', 'Templates', 'Unlocks the template library.'),
  ('monthly.updates', 'Monthly updates', 'Unlocks monthly update drops.'),
  ('office_hours.join', 'Office hours', 'Allows joining office hours.'),
  ('community.vip_access', 'Private community', 'Unlocks the private member group.'),
  ('contact.unlock', 'Direct contact', 'Unlocks direct contact access.'),
  ('product.digital', 'Digital products', 'Unlocks all current digital products.')
on conflict (id) do nothing;

commit;
