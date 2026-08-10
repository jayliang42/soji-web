begin;

-- Keep the enum values for backwards compatibility, but normalize all paid
-- records to the one active offer before removing the legacy plan rows.
update public.subscriptions
set plan_id = 'tier_1'::membership_tier
where plan_id in ('tier_2'::membership_tier, 'tier_3'::membership_tier);

update public.profiles as profile
set tier = case
  when exists (
    select 1
    from public.subscriptions as subscription
    where subscription.user_id = profile.id
      and subscription.plan_id = 'tier_1'::membership_tier
      and subscription.status in ('active', 'trialing')
  ) then 'tier_1'::membership_tier
  else 'free'::membership_tier
end
where profile.tier in ('tier_2'::membership_tier, 'tier_3'::membership_tier);

update public.membership_plans
set
  name = 'Full Access',
  monthly_price = 99,
  stripe_lookup_key = 'full_access_monthly',
  revenuecat_entitlement = 'full_access',
  description = 'One membership for the complete library, every digital product, live support, and all member benefits.'
where id = 'tier_1'::membership_tier;

delete from public.plan_entitlements
where plan_id in ('tier_2'::membership_tier, 'tier_3'::membership_tier);

insert into public.plan_entitlements (plan_id, entitlement_id)
values
  ('tier_1'::membership_tier, 'content.basic'),
  ('tier_1'::membership_tier, 'content.all'),
  ('tier_1'::membership_tier, 'library.case_studies'),
  ('tier_1'::membership_tier, 'library.templates'),
  ('tier_1'::membership_tier, 'monthly.updates'),
  ('tier_1'::membership_tier, 'office_hours.join'),
  ('tier_1'::membership_tier, 'community.vip_access'),
  ('tier_1'::membership_tier, 'contact.unlock'),
  ('tier_1'::membership_tier, 'product.digital')
on conflict (plan_id, entitlement_id) do nothing;

-- Existing active subscribers should receive the newly added product grant
-- without waiting for the next Stripe webhook.
insert into public.user_entitlements (
  user_id,
  entitlement_id,
  source_type,
  source_id,
  starts_at,
  ends_at
)
select
  subscription.user_id,
  plan_entitlement.entitlement_id,
  'subscription',
  subscription.provider_subscription_id,
  subscription.created_at,
  subscription.current_period_ends_at
from public.subscriptions as subscription
cross join public.plan_entitlements as plan_entitlement
where subscription.plan_id = 'tier_1'::membership_tier
  and subscription.status in ('active', 'trialing')
  and plan_entitlement.plan_id = 'tier_1'::membership_tier
on conflict (user_id, entitlement_id, source_type, source_id) do update
set ends_at = excluded.ends_at;

delete from public.membership_plans
where id in ('tier_2'::membership_tier, 'tier_3'::membership_tier);

commit;
