begin;

create extension if not exists pgtap with schema extensions;

select
  to_regclass('public.subscription_billing_adjustments') is null
    as phase2_missing_adjustment_table,
  to_regprocedure(
    'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)'
  ) is null as phase2_missing_adjustment_rpc
\gset

\if :phase2_missing_adjustment_table
\warn 1..85
\warn not ok 1 - phase2 RED missing adjustment table
\endif
\if :phase2_missing_adjustment_rpc
\warn not ok 2 - phase2 RED missing adjustment RPC
\endif

select plan(97);

select ok(
  to_regclass('public.subscription_billing_adjustments') is not null,
  'phase2 RED missing adjustment table'
);
select ok(
  to_regprocedure(
    'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)'
  ) is not null,
  'phase2 RED missing adjustment RPC'
);

create or replace function pg_temp.phase2_subscription_billing_contract()
returns setof text
language plpgsql
as $phase2$
declare
  expired_reconciliation_token uuid;
  reconciliation_expires_at timestamptz;
  reconciliation_started_at timestamptz;
  issued_reconciliation_token uuid;
  visible_count bigint;
  readiness_ok boolean;
  write_denied boolean := false;
begin
  if to_regclass('public.subscription_billing_adjustments') is null
    or to_regprocedure(
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)'
    ) is null
  then
    return next skip(
      'phase2 subscription billing implementation not present during RED',
      95
    );
    return;
  end if;

  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscription_billing_adjustments'::regclass
        and conname = 'subscription_billing_adjustments_pkey'
        and contype = 'p'
    ),
    'adjustments have a database-owned primary key'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscription_billing_adjustments'::regclass
        and conname =
          'subscription_billing_adjustments_provider_identity_key'
        and contype = 'u'
    ),
    'provider adjustment identities are unique'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscription_billing_adjustments'::regclass
        and conname = 'subscription_billing_adjustments_kind_status_check'
        and contype = 'c'
    ),
    'adjustment kinds and states use a constrained contract'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscription_billing_adjustments'::regclass
        and conname = 'subscription_billing_adjustments_supersession_check'
        and contype = 'c'
    ),
    'adjustment supersession evidence is stored as a complete state'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscriptions'::regclass
        and conname = 'subscriptions_latest_paid_payment_check'
        and contype = 'c'
    ),
    'subscription paid-payment watermarks use a complete constrained state'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid = 'public.subscriptions'::regclass
        and conname = 'subscriptions_reconciliation_closure_check'
        and contype = 'c'
    ),
    'synthetic reconciliation closure is constrained to canceled rows'
  );
  return next ok(
    to_regclass(
      'public.stripe_customer_reconciliation_tokens'
    ) is not null,
    'customer reconciliation watermarks use an opaque token table'
  );
  return next ok(
    exists (
      select 1
      from pg_constraint
      where conrelid =
          'public.stripe_customer_reconciliation_tokens'::regclass
        and conname =
          'stripe_customer_reconciliation_tokens_lifetime_check'
        and contype = 'c'
    ),
    'reconciliation token use is bounded to fifteen minutes'
  );

  return next lives_ok(
    $$
      insert into public.billing_events (
        provider,
        provider_event_id,
        event_type,
        payload
      ) values (
        'stripe',
        'evt_phase2_receipt_allowlist',
        'charge.dispute.created',
        jsonb_build_object(
          'apiVersion', null,
          'chargeId', 'ch_phase2_receipt_allowlist',
          'created', 1785081600,
          'customerId', 'cus_phase2_receipt_allowlist',
          'disputeId', 'du_phase2_receipt_allowlist',
          'id', 'evt_phase2_receipt_allowlist',
          'livemode', false,
          'objectId', 'du_phase2_receipt_allowlist',
          'objectType', 'dispute',
          'paymentId', 'pi_phase2_receipt_allowlist',
          'subscriptionId', 'sub_phase2_receipt_allowlist',
          'type', 'charge.dispute.created'
        )
      )
    $$,
    'Stripe receipts accept only the bounded Phase 2 reference keys'
  );
  return next throws_like(
    $$
      insert into public.billing_events (
        provider,
        provider_event_id,
        event_type,
        payload
      ) values (
        'stripe',
        'evt_phase2_receipt_private',
        'charge.dispute.created',
        jsonb_build_object(
          'id', 'evt_phase2_receipt_private',
          'type', 'charge.dispute.created',
          'customerEmail', 'private@example.test'
        )
      )
    $$,
    '%billing_events_stripe_payload_minimized%',
    'Stripe receipts still reject customer data and unbounded payload keys'
  );

  return next ok(
    has_table_privilege(
      'authenticated',
      'public.subscription_billing_adjustments',
      'select'
    ),
    'authenticated owners can select adjustments through RLS'
  );
  return next ok(
    not has_table_privilege(
      'authenticated',
      'public.subscription_billing_adjustments',
      'insert'
    ),
    'authenticated clients cannot insert adjustments'
  );
  return next ok(
    not has_table_privilege(
      'authenticated',
      'public.subscription_billing_adjustments',
      'update'
    ),
    'authenticated clients cannot update adjustments'
  );
  return next ok(
    not has_table_privilege(
      'authenticated',
      'public.subscription_billing_adjustments',
      'delete'
    ),
    'authenticated clients cannot delete adjustments'
  );
  return next ok(
    has_table_privilege(
      'service_role',
      'public.subscription_billing_adjustments',
      'select,insert,update'
    ),
    'service role can synchronize normalized adjustment state'
  );
  return next ok(
    not has_function_privilege(
      'authenticated',
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)',
      'execute'
    ),
    'authenticated clients cannot execute adjustment synchronization'
  );
  return next ok(
    not has_function_privilege(
      'authenticated',
      'public.reconcile_stripe_subscription_paid_payment(text,text,timestamptz)',
      'execute'
    ),
    'authenticated clients cannot reconcile verified subscription payments'
  );
  return next ok(
    not has_function_privilege(
      'authenticated',
      'public.close_missing_stripe_customer_subscriptions(text,text[],uuid)',
      'execute'
    ),
    'authenticated clients cannot close missing customer subscriptions'
  );
  return next ok(
    not has_function_privilege(
      'authenticated',
      'public.begin_stripe_customer_reconciliation(text)',
      'execute'
    ),
    'authenticated clients cannot issue reconciliation tokens'
  );
  return next ok(
    not has_table_privilege(
      'authenticated',
      'public.stripe_customer_reconciliation_tokens',
      'select'
    ),
    'authenticated clients cannot inspect opaque reconciliation tokens'
  );
  return next ok(
    not has_function_privilege(
      'authenticated',
      'public.get_phase2_billing_schema_readiness()',
      'execute'
    ),
    'authenticated clients cannot inspect Phase 2 schema readiness'
  );
  return next ok(
    has_function_privilege(
      'service_role',
      'public.sync_stripe_subscription_adjustment(text,text,text,text,text,integer,text,timestamptz)',
      'execute'
    ),
    'service role can synchronize subscription adjustments'
  );
  return next ok(
    has_function_privilege(
      'service_role',
      'public.reconcile_stripe_subscription_paid_payment(text,text,timestamptz)',
      'execute'
    ),
    'service role can reconcile a later verified paid payment'
  );
  return next ok(
    has_function_privilege(
      'service_role',
      'public.close_missing_stripe_customer_subscriptions(text,text[],uuid)',
      'execute'
    ),
    'service role can close race-safe missing customer subscriptions'
  );
  return next ok(
    has_function_privilege(
      'service_role',
      'public.begin_stripe_customer_reconciliation(text)',
      'execute'
    ),
    'service role can issue database reconciliation tokens'
  );
  return next ok(
    not has_table_privilege(
      'service_role',
      'public.stripe_customer_reconciliation_tokens',
      'select'
    ),
    'service role must use token RPCs instead of direct table access'
  );
  return next ok(
    has_function_privilege(
      'service_role',
      'public.get_phase2_billing_schema_readiness()',
      'execute'
    ),
    'service role can inspect Phase 2 schema readiness'
  );
  return next ok(
    not has_function_privilege(
      'service_role',
      'public.recompute_stripe_subscription_access(uuid,timestamptz)',
      'execute'
    ),
    'the shared access recomputation helper remains internal'
  );

  perform set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    true
  );
  execute 'set local role service_role';
  select
    adjustment_table
    and adjustment_constraints
    and access_helper
    and adjustment_sync_rpc
    and paid_reconciliation_rpc
    and adjustment_rls
    and service_role_grants
    and authenticated_no_write
    and receipt_allowlist
  into readiness_ok
  from public.get_phase2_billing_schema_readiness();
  execute 'reset role';
  return next ok(
    readiness_ok,
    'Phase 2 schema readiness proves every named local database boundary'
  );

  insert into auth.users (id, email)
  values
    (
      '00000000-0000-4000-8000-000000000121',
      'phase2-adjustment-owner@soji.local'
    ),
    (
      '00000000-0000-4000-8000-000000000122',
      'phase2-adjustment-other@soji.local'
    ),
    (
      '00000000-0000-4000-8000-000000000123',
      'phase2-adjustment-admin@soji.local'
    ),
    (
      '00000000-0000-4000-8000-000000000124',
      'phase2-paid-first-owner@soji.local'
    ),
    (
      '00000000-0000-4000-8000-000000000125',
      'phase2-reconciliation-owner@soji.local'
    );

  insert into public.profiles (id, email, full_name)
  values
    (
      '00000000-0000-4000-8000-000000000121',
      'phase2-adjustment-owner@soji.local',
      'Phase 2 Adjustment Owner'
    ),
    (
      '00000000-0000-4000-8000-000000000122',
      'phase2-adjustment-other@soji.local',
      'Phase 2 Adjustment Other'
    ),
    (
      '00000000-0000-4000-8000-000000000123',
      'phase2-adjustment-admin@soji.local',
      'Phase 2 Adjustment Admin'
    ),
    (
      '00000000-0000-4000-8000-000000000124',
      'phase2-paid-first-owner@soji.local',
      'Phase 2 Paid First Owner'
    ),
    (
      '00000000-0000-4000-8000-000000000125',
      'phase2-reconciliation-owner@soji.local',
      'Phase 2 Reconciliation Owner'
    );

  insert into public.user_roles (user_id, role)
  values
    ('00000000-0000-4000-8000-000000000121', 'member'),
    ('00000000-0000-4000-8000-000000000122', 'member'),
    ('00000000-0000-4000-8000-000000000123', 'member'),
    ('00000000-0000-4000-8000-000000000123', 'admin'),
    ('00000000-0000-4000-8000-000000000124', 'member'),
    ('00000000-0000-4000-8000-000000000125', 'member');

  return next is(
    public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000121',
      'sub_phase2_adjustment',
      'cus_phase2_adjustment',
      'tier_1',
      'active',
      '2026-09-01T12:00:00Z',
      null,
      '2026-07-26T12:00:00Z'
    ),
    'tier_1'::membership_tier,
    'an eligible subscription starts with its plan tier'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at = '2026-09-01T12:00:00Z'
    ),
    (
      select count(*)
      from public.plan_entitlements
      where plan_id = 'tier_1'
    ),
    'eligible subscription access is derived atomically from the plan'
  );
  return next is(
    (
      select tier
      from public.profiles
      where id = '00000000-0000-4000-8000-000000000121'
    ),
    'tier_1'::membership_tier,
    'eligible subscription access updates the effective profile tier'
  );

  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_initial',
      're_phase2_partial',
      'refund',
      'partially_refunded',
      100,
      'usd',
      '2026-07-26T12:01:00Z'
    ),
    'partially_refunded',
    'a partial membership refund is recorded'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_partial'
        and blocks_access = false
        and superseded_at is null
    ),
    'a partial membership refund is non-blocking'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at = '2026-09-01T12:00:00Z'
    ),
    (
      select count(*)
      from public.plan_entitlements
      where plan_id = 'tier_1'
    ),
    'a partial membership refund preserves otherwise-eligible access'
  );

  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_initial',
      're_phase2_full',
      'refund',
      'refunded',
      1000,
      'usd',
      '2026-07-26T12:02:00Z'
    ),
    'refunded',
    'a full membership refund is recorded'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
        and blocks_access = true
        and superseded_at is null
    ),
    'a current full refund blocks access'
  );
  return next is(
    (
      select count(*)
      from public.subscription_billing_adjustments
      where subscription_id = (
        select id
        from public.subscriptions
        where provider_subscription_id = 'sub_phase2_adjustment'
      )
    ),
    2::bigint,
    'one subscription retains multiple normalized adjustments'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at > '2026-07-26T12:02:00Z'
    ),
    0::bigint,
    'a full refund atomically ends current subscription entitlements'
  );
  return next is(
    (
      select tier
      from public.profiles
      where id = '00000000-0000-4000-8000-000000000121'
    ),
    'free'::membership_tier,
    'a full refund atomically lowers the effective profile tier'
  );

  return next is(
    public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000121',
      'sub_phase2_adjustment',
      'cus_phase2_adjustment',
      'tier_1',
      'active',
      '2026-09-02T12:00:00Z',
      null,
      '2026-07-26T12:03:00Z'
    ),
    'free'::membership_tier,
    'a later active subscription refresh cannot erase a refund block'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at > '2026-07-26T12:03:00Z'
    ),
    0::bigint,
    'active subscription refresh leaves blocked entitlements ended'
  );

  perform public.sync_stripe_subscription_adjustment(
    'sub_phase2_adjustment',
    'pi_phase2_initial',
    're_phase2_full',
    'refund',
    'refunded',
    1000,
    'usd',
    '2026-07-26T12:02:00Z'
  );
  return next is(
    (
      select updated_at
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
    ),
    (
      select created_at
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
    ),
    'an exact duplicate adjustment replay is idempotent'
  );
  perform public.sync_stripe_subscription_adjustment(
    'sub_phase2_adjustment',
    'pi_phase2_initial',
    're_phase2_full',
    'refund',
    'partially_refunded',
    100,
    'usd',
    '2026-07-26T12:01:30Z'
  );
  return next is(
    (
      select status
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
    ),
    'refunded',
    'an older partial-refund replay cannot reverse a full refund'
  );
  perform public.sync_stripe_subscription_adjustment(
    'sub_phase2_adjustment',
    'pi_phase2_initial',
    're_phase2_full',
    'refund',
    'partially_refunded',
    100,
    'usd',
    '2026-07-26T12:02:00Z'
  );
  return next is(
    (
      select status
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
    ),
    'refunded',
    'an equal-time weaker refund state cannot reverse a full refund'
  );

  return next is(
    public.reconcile_stripe_subscription_paid_payment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      '2026-07-26T12:04:00Z'
    ),
    'tier_1'::membership_tier,
    'a later verified paid payment restores an eligible subscription'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_full'
        and superseded_by_provider_payment_id = 'pi_phase2_later'
        and superseded_at = '2026-07-26T12:04:00Z'
    ),
    'later paid evidence records bounded full-refund supersession'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at = '2026-09-02T12:00:00Z'
    ),
    (
      select count(*)
      from public.plan_entitlements
      where plan_id = 'tier_1'
    ),
    'later paid evidence atomically restores plan entitlements'
  );

  return next is(
    public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000124',
      'sub_phase2_paid_first',
      'cus_phase2_paid_first',
      'tier_1',
      'active',
      '2026-09-04T12:00:00Z',
      null,
      '2026-07-26T12:18:00Z'
    ),
    'tier_1'::membership_tier,
    'the paid-first delivery-order fixture starts eligible'
  );
  return next is(
    public.reconcile_stripe_subscription_paid_payment(
      'sub_phase2_paid_first',
      'pi_phase2_paid_first',
      '2026-07-26T12:20:00Z'
    ),
    'tier_1'::membership_tier,
    'paid evidence is accepted before any refund row exists'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions as subscription
      where subscription.provider_subscription_id = 'sub_phase2_paid_first'
        and subscription.latest_paid_provider_payment_id =
          'pi_phase2_paid_first'
        and subscription.latest_paid_observed_at =
          '2026-07-26T12:20:00Z'
        and not exists (
          select 1
          from public.subscription_billing_adjustments as adjustment
          where adjustment.subscription_id = subscription.id
        )
    ),
    'paid evidence persists a watermark even with no refund to update'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_paid_first',
      'pi_phase2_old_charge',
      're_phase2_paid_first_older',
      'refund',
      'refunded',
      500,
      'usd',
      '2026-07-26T12:19:00Z'
    ),
    'refunded',
    'an older full refund can arrive after the newer paid payment'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_paid_first_older'
        and superseded_by_provider_payment_id = 'pi_phase2_paid_first'
        and superseded_at = '2026-07-26T12:20:00Z'
    ),
    'paid-first delivery creates the older refund already superseded'
  );
  return next is(
    (
      select tier
      from public.profiles
      where id = '00000000-0000-4000-8000-000000000124'
    ),
    'tier_1'::membership_tier,
    'an older late-delivered refund cannot revoke newer paid access'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_paid_first',
      'pi_phase2_old_charge',
      're_phase2_paid_first_older',
      'refund',
      'refunded',
      500,
      'usd',
      '2026-07-26T12:19:00Z'
    ),
    'refunded',
    'the paid-first refund replay is idempotent'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_paid_first_older'
        and superseded_by_provider_payment_id = 'pi_phase2_paid_first'
        and superseded_at = '2026-07-26T12:20:00Z'
    ),
    'a duplicate refund replay preserves its original supersession'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_paid_first',
      'pi_phase2_equal_charge',
      're_phase2_paid_first_equal',
      'refund',
      'refunded',
      500,
      'usd',
      '2026-07-26T12:20:00Z'
    ),
    'refunded',
    'an equal-time full refund remains a current block'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_paid_first_equal'
        and superseded_at is null
    )
    and (
      select tier
      from public.profiles
      where id = '00000000-0000-4000-8000-000000000124'
    ) = 'free'::membership_tier,
    'equal provider time does not claim a later successful payment'
  );
  return next is(
    public.reconcile_stripe_subscription_paid_payment(
      'sub_phase2_paid_first',
      'pi_phase2_paid_first_older_replay',
      '2026-07-26T12:19:30Z'
    ),
    'free'::membership_tier,
    'an older paid-payment replay cannot clear the equal-time refund'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id = 'sub_phase2_paid_first'
        and latest_paid_provider_payment_id = 'pi_phase2_paid_first'
        and latest_paid_observed_at = '2026-07-26T12:20:00Z'
    ),
    'older paid evidence cannot regress the persisted watermark'
  );
  return next is(
    public.reconcile_stripe_subscription_paid_payment(
      'sub_phase2_paid_first',
      'pi_phase2_z_equal',
      '2026-07-26T12:20:00Z'
    ),
    'free'::membership_tier,
    'equal-time paid evidence uses a deterministic watermark tie-breaker'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id = 'sub_phase2_paid_first'
        and latest_paid_provider_payment_id = 'pi_phase2_z_equal'
        and latest_paid_observed_at = '2026-07-26T12:20:00Z'
    )
    and exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_paid_first_equal'
        and superseded_at is null
    ),
    'equal-time paid evidence remains monotonic without superseding a peer'
  );
  return next is(
    public.reconcile_stripe_subscription_paid_payment(
      'sub_phase2_paid_first',
      'pi_phase2_strictly_later',
      '2026-07-26T12:21:00Z'
    ),
    'tier_1'::membership_tier,
    'a strictly later paid payment restores the equal-time refund block'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 're_phase2_paid_first_equal'
        and superseded_by_provider_payment_id =
          'pi_phase2_strictly_later'
        and superseded_at = '2026-07-26T12:21:00Z'
    ),
    'strictly later paid evidence records monotonic supersession'
  );

  perform public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000125',
    'sub_phase2_reconciliation_stale',
    'cus_phase2_reconciliation',
    'tier_1',
    'active',
    '2026-09-05T12:00:00Z',
    null,
    '2026-07-26T12:29:00Z'
  );
  perform public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000125',
    'sub_phase2_reconciliation_concurrent',
    'cus_phase2_reconciliation',
    'tier_1',
    'active',
    '2026-09-05T12:00:00Z',
    null,
    '2026-07-26T12:30:30Z'
  );

  select
    watermark.reconciliation_token,
    watermark.started_at,
    watermark.expires_at
  into
    issued_reconciliation_token,
    reconciliation_started_at,
    reconciliation_expires_at
  from public.begin_stripe_customer_reconciliation(
    'cus_phase2_reconciliation'
  ) as watermark;

  update public.subscriptions
  set
    created_at = case provider_subscription_id
      when 'sub_phase2_reconciliation_stale'
        then reconciliation_started_at - interval '2 minutes'
      else reconciliation_started_at - interval '1 minute'
    end,
    provider_synced_at = case provider_subscription_id
      when 'sub_phase2_reconciliation_stale'
        then reconciliation_started_at - interval '1 minute'
      else reconciliation_started_at
    end
  where provider_subscription_id in (
    'sub_phase2_reconciliation_stale',
    'sub_phase2_reconciliation_concurrent'
  );

  perform public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000125',
    'sub_phase2_reconciliation_concurrent',
    'cus_phase2_reconciliation',
    'tier_1',
    'active',
    '2026-09-05T12:00:00Z',
    null,
    '2026-07-26T12:30:30Z'
  );

  return next ok(
    issued_reconciliation_token is not null
      and reconciliation_expires_at =
        reconciliation_started_at + interval '15 minutes'
      and reconciliation_started_at <= clock_timestamp(),
    'begin reconciliation returns a database-clock token with bounded use'
  );
  return next throws_like(
    format(
      $misuse$
        select public.close_missing_stripe_customer_subscriptions(
          'cus_phase2_wrong_customer',
          array[]::text[],
          %L::uuid
        )
      $misuse$,
      issued_reconciliation_token
    ),
    '%reconciliation_token_customer_mismatch%',
    'a token cannot be used for another provider customer'
  );
  return next ok(
    exists (
      select 1
      from public.stripe_customer_reconciliation_tokens as token
      where token.reconciliation_token = issued_reconciliation_token
        and token.consumed_at is null
    ),
    'customer mismatch fails before consuming the valid token'
  );

  return next is(
    public.close_missing_stripe_customer_subscriptions(
      'cus_phase2_reconciliation',
      array[]::text[],
      issued_reconciliation_token
    ),
    1,
    'customer reconciliation closes only pre-watermark missing rows'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id = 'sub_phase2_reconciliation_stale'
        and status = 'canceled'
        and reconciliation_closed_at = reconciliation_started_at
    ),
    'a stale missing row records its synthetic reconciliation closure'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id =
          'sub_phase2_reconciliation_concurrent'
        and status = 'active'
        and reconciliation_closed_at is null
    ),
    'a provider sync after enumeration start cannot be closed as stale'
  );
  return next ok(
    exists (
      select 1
      from public.stripe_customer_reconciliation_tokens as token
      where token.reconciliation_token = issued_reconciliation_token
        and token.consumed_at is not null
    ),
    'successful closure consumes its opaque token exactly once'
  );
  return next throws_like(
    format(
      $replay$
        select public.close_missing_stripe_customer_subscriptions(
          'cus_phase2_reconciliation',
          array[]::text[],
          %L::uuid
        )
      $replay$,
      issued_reconciliation_token
    ),
    '%reconciliation_token_consumed%',
    'a consumed reconciliation token cannot be replayed'
  );

  select watermark.reconciliation_token
  into expired_reconciliation_token
  from public.begin_stripe_customer_reconciliation(
    'cus_phase2_reconciliation'
  ) as watermark;
  update public.stripe_customer_reconciliation_tokens as token
  set
    started_at = transaction_timestamp() - interval '20 minutes',
    expires_at = transaction_timestamp() - interval '5 minutes'
  where token.reconciliation_token = expired_reconciliation_token;
  return next throws_like(
    format(
      $expired$
        select public.close_missing_stripe_customer_subscriptions(
          'cus_phase2_reconciliation',
          array[]::text[],
          %L::uuid
        )
      $expired$,
      expired_reconciliation_token
    ),
    '%reconciliation_token_expired%',
    'an expired reconciliation token fails closed'
  );
  return next is(
    public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000125',
      'sub_phase2_reconciliation_stale',
      'cus_phase2_reconciliation',
      'tier_1',
      'active',
      '2026-09-05T12:00:00Z',
      null,
      '2026-07-26T12:29:00Z'
    ),
    'tier_1'::membership_tier,
    'an authoritative current-provider observation repairs synthetic closure'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id = 'sub_phase2_reconciliation_stale'
        and status = 'active'
        and reconciliation_closed_at is null
    ),
    'repair clears the synthetic closure marker without weakening status truth'
  );
  perform public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000125',
    'sub_phase2_reconciliation_concurrent',
    'cus_phase2_reconciliation',
    'tier_1',
    'canceled',
    '2026-09-05T12:00:00Z',
    '2026-07-26T12:33:00Z',
    '2026-07-26T12:33:00Z'
  );
  return next is(
    public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000125',
      'sub_phase2_reconciliation_concurrent',
      'cus_phase2_reconciliation',
      'tier_1',
      'active',
      '2026-09-05T12:00:00Z',
      null,
      '2026-07-26T12:34:00Z'
    ),
    'tier_1'::membership_tier,
    'provider-terminal closure remains monotonic while another plan is active'
  );
  return next ok(
    exists (
      select 1
      from public.subscriptions
      where provider_subscription_id =
          'sub_phase2_reconciliation_concurrent'
        and status = 'canceled'
        and reconciliation_closed_at is null
    ),
    'repairability applies only to synthetic reconciliation closure'
  );

  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'needs_response',
      1000,
      'usd',
      '2026-07-26T12:05:00Z'
    ),
    'needs_response',
    'an open membership dispute is recorded'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at > '2026-07-26T12:05:00Z'
    ),
    0::bigint,
    'an open membership dispute pauses access atomically'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'won',
      1000,
      'usd',
      '2026-07-26T12:04:30Z'
    ),
    'needs_response',
    'an older dispute win cannot overwrite a newer open state'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'won',
      1000,
      'usd',
      '2026-07-26T12:06:00Z'
    ),
    'won',
    'a newer dispute win resolves its access block'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at = '2026-09-02T12:00:00Z'
    ),
    (
      select count(*)
      from public.plan_entitlements
      where plan_id = 'tier_1'
    ),
    'an eligible dispute win restores plan entitlements'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'under_review',
      1000,
      'usd',
      '2026-07-26T12:06:00Z'
    ),
    'won',
    'an equal-time open snapshot cannot overwrite a dispute win'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'lost',
      1000,
      'usd',
      '2026-07-26T12:07:00Z'
    ),
    'lost',
    'a membership dispute loss becomes terminal'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where user_id = '00000000-0000-4000-8000-000000000121'
        and source_type = 'subscription'
        and source_id = 'sub_phase2_adjustment'
        and ends_at > '2026-07-26T12:07:00Z'
    ),
    0::bigint,
    'a membership dispute loss ends access'
  );
  return next is(
    public.sync_stripe_subscription_adjustment(
      'sub_phase2_adjustment',
      'pi_phase2_later',
      'du_phase2_dispute',
      'dispute',
      'won',
      1000,
      'usd',
      '2026-07-26T12:08:00Z'
    ),
    'lost',
    'a later dispute win cannot overwrite a terminal membership loss'
  );
  perform public.reconcile_stripe_subscription_paid_payment(
    'sub_phase2_adjustment',
    'pi_phase2_after_loss',
    '2026-07-26T12:09:00Z'
  );
  return next ok(
    exists (
      select 1
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 'du_phase2_dispute'
        and status = 'lost'
        and blocks_access
        and superseded_at is null
    ),
    'later paid evidence cannot supersede a lost dispute'
  );
  return next is(
    (
      select tier
      from public.profiles
      where id = '00000000-0000-4000-8000-000000000121'
    ),
    'free'::membership_tier,
    'a lost dispute keeps the effective profile tier blocked'
  );

  perform public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000121',
    'sub_phase2_rollback',
    'cus_phase2_adjustment',
    'tier_1',
    'active',
    '2026-09-03T12:00:00Z',
    null,
    '2026-07-26T12:10:00Z'
  );
  perform public.sync_stripe_subscription_adjustment(
    'sub_phase2_rollback',
    'pi_phase2_rollback',
    'du_phase2_rollback',
    'dispute',
    'needs_response',
    500,
    'usd',
    '2026-07-26T12:11:00Z'
  );

  create function pg_temp.reject_phase2_entitlement_restore()
  returns trigger
  language plpgsql
  as $trigger$
  begin
    if new.source_type = 'subscription'
      and new.source_id = 'sub_phase2_rollback'
    then
      raise exception 'forced phase2 entitlement restore failure';
    end if;
    return new;
  end;
  $trigger$;
  create trigger reject_phase2_entitlement_restore
  before insert on public.user_entitlements
  for each row execute function pg_temp.reject_phase2_entitlement_restore();

  return next throws_like(
    $$
      select public.sync_stripe_subscription_adjustment(
        'sub_phase2_rollback',
        'pi_phase2_rollback',
        'du_phase2_rollback',
        'dispute',
        'won',
        500,
        'usd',
        '2026-07-26T12:12:00Z'
      )
    $$,
    '%forced phase2 entitlement restore failure%',
    'an entitlement restore failure rejects the whole adjustment transaction'
  );
  return next is(
    (
      select status
      from public.subscription_billing_adjustments
      where provider_adjustment_id = 'du_phase2_rollback'
    ),
    'needs_response',
    'failed access recomputation rolls back the adjustment state'
  );
  return next is(
    (
      select count(*)
      from public.user_entitlements
      where source_type = 'subscription'
        and source_id = 'sub_phase2_rollback'
        and ends_at > '2026-07-26T12:11:00Z'
    ),
    0::bigint,
    'failed access recomputation leaves blocked entitlements unchanged'
  );

  drop trigger reject_phase2_entitlement_restore on public.user_entitlements;
  drop function pg_temp.reject_phase2_entitlement_restore();

  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000121","role":"authenticated"}',
    true
  );
  execute 'set local role authenticated';
  select count(*)
  into visible_count
  from public.subscription_billing_adjustments;
  execute 'reset role';
  return next ok(
    visible_count >= 4,
    'an authenticated owner can read their normalized adjustments'
  );

  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000122","role":"authenticated"}',
    true
  );
  execute 'set local role authenticated';
  select count(*)
  into visible_count
  from public.subscription_billing_adjustments;
  execute 'reset role';
  return next is(
    visible_count,
    0::bigint,
    'an authenticated member cannot read another owner adjustment'
  );

  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000123","role":"authenticated"}',
    true
  );
  execute 'set local role authenticated';
  select count(*)
  into visible_count
  from public.subscription_billing_adjustments;
  execute 'reset role';
  return next ok(
    visible_count >= 4,
    'an Admin can inspect normalized membership adjustments'
  );

  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000121","role":"authenticated"}',
    true
  );
  execute 'set local role authenticated';
  begin
    insert into public.subscription_billing_adjustments (
      subscription_id,
      provider,
      provider_payment_id,
      provider_adjustment_id,
      kind,
      status,
      amount,
      currency,
      blocks_access,
      observed_at
    ) values (
      (
        select id
        from public.subscriptions
        where provider_subscription_id = 'sub_phase2_adjustment'
      ),
      'stripe',
      'pi_phase2_forged',
      'du_phase2_forged',
      'dispute',
      'won',
      1000,
      'usd',
      false,
      '2026-07-26T12:13:00Z'
    );
  exception
    when insufficient_privilege then
      write_denied := true;
  end;
  execute 'reset role';
  return next ok(
    write_denied,
    'authenticated clients cannot forge adjustment rows directly'
  );

  return;
end;
$phase2$;

select *
from pg_temp.phase2_subscription_billing_contract();

select * from finish();
rollback;
