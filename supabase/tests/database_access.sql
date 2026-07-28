begin;

create extension if not exists pgtap with schema extensions;

select plan(277);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000101', 'member-db-test@soji.local'),
  ('00000000-0000-4000-8000-000000000102', 'admin-db-test@soji.local'),
  ('00000000-0000-4000-8000-000000000103', 'bootstrap-db-test@soji.local'),
  ('00000000-0000-4000-8000-000000000104', 'rollback-db-test@soji.local'),
  ('00000000-0000-4000-8000-000000000105', 'first-admin-db-test@soji.local'),
  ('00000000-0000-4000-8000-000000000106', null);

insert into public.profiles (id, email, full_name)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'member-db-test@soji.local',
    'Database Member'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'admin-db-test@soji.local',
    'Database Admin'
  ),
  (
    '00000000-0000-4000-8000-000000000105',
    'first-admin-db-test@soji.local',
    'First Admin Candidate'
  );

insert into public.user_roles (user_id, role)
values ('00000000-0000-4000-8000-000000000105', 'editor');

set local role service_role;
select throws_like(
  $$ select * from public.bootstrap_first_admin('your-main-email@example.com') $$,
  '%invalid_target_email%',
  'first-admin bootstrap rejects the unchanged setup placeholder'
);
select throws_like(
  $$ select * from public.bootstrap_first_admin('missing-admin@soji.local') $$,
  '%user_not_found%',
  'first-admin bootstrap rejects an account without a profile'
);
select lives_ok(
  $$ select * from public.bootstrap_first_admin('  FIRST-ADMIN-DB-TEST@SOJI.LOCAL  ') $$,
  'service role can bootstrap the first admin by normalized email'
);
select throws_like(
  $$ select * from public.bootstrap_first_admin('first-admin-db-test@soji.local') $$,
  '%first_admin_already_exists%',
  'first-admin bootstrap cannot be reused after an admin exists'
);
reset role;

select results_eq(
  $$
    select role::text
    from public.user_roles
    where user_id = '00000000-0000-4000-8000-000000000105'
    order by role::text
  $$,
  array['admin', 'member'],
  'first-admin bootstrap retains member and removes conflicting editor access'
);
select is(
  (
    select count(*)
    from public.role_change_events
    where target_user_id = '00000000-0000-4000-8000-000000000105'
      and previous_role = 'editor'
      and assigned_role = 'admin'
      and change_source = 'first_admin_bootstrap'
  ),
  1::bigint,
  'first-admin bootstrap records its source and role transition'
);
select ok(
  (
    select actor_user_id is null
    from public.role_change_events
    where target_user_id = '00000000-0000-4000-8000-000000000105'
  ),
  'first-admin audit does not misidentify the target as an authenticated actor'
);
select is(
  (
    select tier::text
    from public.profiles
    where id = '00000000-0000-4000-8000-000000000105'
  ),
  'free',
  'admin bootstrap does not grant paid membership access'
);
select throws_like(
  $$
    insert into public.role_change_events (
      actor_user_id,
      target_user_id,
      previous_role,
      assigned_role,
      change_source
    ) values (
      '00000000-0000-4000-8000-000000000105',
      '00000000-0000-4000-8000-000000000105',
      'member',
      'admin',
      'first_admin_bootstrap'
    )
  $$,
  '%role_change_events_actor_source_check%',
  'bootstrap audit events cannot claim an authenticated actor'
);
select throws_like(
  $$
    insert into public.role_change_events (
      actor_user_id,
      target_user_id,
      previous_role,
      assigned_role,
      change_source
    ) values (
      null,
      '00000000-0000-4000-8000-000000000105',
      'member',
      'admin',
      'admin_rpc'
    )
  $$,
  '%role_change_events_actor_source_check%',
  'normal admin audit events require an authenticated actor'
);

delete from public.role_change_events
where target_user_id = '00000000-0000-4000-8000-000000000105';
delete from public.user_roles
where user_id = '00000000-0000-4000-8000-000000000105';
delete from public.profiles
where id = '00000000-0000-4000-8000-000000000105';
delete from auth.users
where id = '00000000-0000-4000-8000-000000000105';

insert into public.user_roles (user_id, role)
values
  ('00000000-0000-4000-8000-000000000101', 'member'),
  ('00000000-0000-4000-8000-000000000102', 'member'),
  ('00000000-0000-4000-8000-000000000102', 'admin');

insert into public.billing_events (
  provider,
  provider_event_id,
  event_type,
  payload,
  status,
  processing_error
)
values (
  'stripe',
  'evt_database_access_test',
  'invoice.payment_failed',
  jsonb_build_object(
    'apiVersion', null,
    'created', 1784124000,
    'id', 'evt_database_access_test',
    'livemode', false,
    'objectId', 'in_database_access_test',
    'objectType', 'invoice',
    'type', 'invoice.payment_failed'
  ),
  'failed',
  'Database test fixture'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'billing_events'
      and indexname = 'billing_events_created_at_id_idx'
      and indexdef like '%(created_at DESC, id DESC)%'
  ),
  'billing event chronology has a deterministic pagination index'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'billing_events'
      and indexname = 'billing_events_status_created_at_id_idx'
      and indexdef like '%(status, created_at DESC, id DESC)%'
  ),
  'billing event status filtering has a deterministic pagination index'
);

select ok(
  has_table_privilege('anon', 'public.membership_plans', 'select'),
  'anonymous clients can select public plans'
);
select ok(
  not has_table_privilege('anon', 'public.billing_events', 'select'),
  'anonymous clients have no billing table privilege'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'select'),
  'authenticated clients can select profiles through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert'),
  'authenticated clients cannot insert profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'update'),
  'authenticated clients cannot update profile identity directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.checkout_rate_limits', 'select'),
  'authenticated clients cannot inspect rate-limit storage'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.subscription_checkout_intents',
    'select'
  ),
  'authenticated clients cannot inspect subscription checkout claims'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.subscription_checkout_intents',
    'insert,update,delete'
  ),
  'authenticated clients cannot mutate subscription checkout claims directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.product_checkout_intents',
    'select'
  ),
  'authenticated clients cannot inspect product checkout claims'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.product_checkout_intents',
    'insert,update,delete'
  ),
  'authenticated clients cannot mutate product checkout claims directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'delete'),
  'authenticated clients cannot delete roles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'insert'),
  'authenticated clients cannot insert roles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_roles', 'update'),
  'authenticated clients cannot update roles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_assets', 'insert'),
  'authenticated clients cannot insert product assets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_assets', 'update'),
  'authenticated clients cannot update product assets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_assets', 'delete'),
  'authenticated clients cannot delete product assets directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_asset_cleanup_jobs', 'insert'),
  'authenticated clients cannot insert asset cleanup jobs directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_asset_cleanup_jobs', 'update'),
  'authenticated clients cannot forge asset cleanup outcomes'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_asset_cleanup_jobs', 'delete'),
  'authenticated clients cannot erase asset cleanup evidence'
);
select ok(
  not has_function_privilege('anon', 'public.bootstrap_user_profile()', 'execute'),
  'anonymous clients cannot execute profile bootstrap'
);
select ok(
  has_function_privilege('authenticated', 'public.bootstrap_user_profile()', 'execute'),
  'authenticated clients can execute profile bootstrap'
);
select ok(
  to_regprocedure('public.profile_tier_unchanged(uuid,membership_tier)') is null,
  'obsolete direct-profile update guard is removed'
);
select ok(
  not has_function_privilege('anon', 'public.bootstrap_first_admin(text)', 'execute'),
  'anonymous clients cannot execute first-admin bootstrap'
);
select ok(
  not has_function_privilege('authenticated', 'public.bootstrap_first_admin(text)', 'execute'),
  'authenticated clients cannot execute first-admin bootstrap'
);
select ok(
  has_function_privilege('service_role', 'public.bootstrap_first_admin(text)', 'execute'),
  'service role can execute first-admin bootstrap'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.consume_checkout_rate_limit(text)',
    'execute'
  ),
  'anonymous clients cannot consume the authenticated rate-limit RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.consume_checkout_rate_limit(text)',
    'execute'
  ),
  'authenticated clients can consume the rate-limit RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_subscription_checkout(uuid)',
    'execute'
  ),
  'anonymous clients cannot claim a subscription checkout'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.claim_subscription_checkout(uuid)',
    'execute'
  ),
  'authenticated clients can claim a subscription checkout'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_product_checkout(uuid,uuid)',
    'execute'
  ),
  'anonymous clients cannot claim a product checkout'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.claim_product_checkout(uuid,uuid)',
    'execute'
  ),
  'authenticated clients can claim a product checkout'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.list_managed_users(text,integer,integer)',
    'execute'
  ),
  'anonymous clients cannot execute managed user search'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.list_managed_users(text,integer,integer)',
    'execute'
  ),
  'authenticated clients can reach the admin-guarded user search RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.upsert_content_item(uuid,text,text,text,content_type,visibility,text,text,text,text,text[],boolean,text[],bigint)',
    'execute'
  ),
  'anonymous clients cannot execute atomic content writes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.upsert_content_item(uuid,text,text,text,content_type,visibility,text,text,text,text,text[],boolean,text[],bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded content RPC'
);
select has_column(
  'public',
  'content_items',
  'preview_markdown',
  'content items persist an explicit public preview'
);
select has_column(
  'public',
  'content_items',
  'cover_image_alt',
  'content items persist meaningful cover alternative text'
);
select has_column(
  'public',
  'content_items',
  'tags',
  'content items persist reader-facing tags'
);
select col_type_is(
  'public',
  'content_items',
  'tags',
  'text[]',
  'content tags use a normalized text array'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.delete_content_item(uuid,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed content deletion'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_content_item(uuid,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded content deletion RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.upsert_product(uuid,text,text,text,integer,text,text[],text,text,boolean,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed product writes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.upsert_product(uuid,text,text,text,integer,text,text[],text,text,boolean,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded product write RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.archive_product(uuid,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed product archiving'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.archive_product(uuid,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded product archive RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.replace_product_asset(uuid,text,text,text,bigint,uuid,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed product asset replacement'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_product_asset(uuid,text,text,text,bigint,uuid,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded asset replacement RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.delete_product_asset(uuid,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed product asset deletion'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_product_asset(uuid,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded asset deletion RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.prepare_product_asset_upload(uuid,text)',
    'execute'
  ),
  'anonymous clients cannot prepare private asset uploads'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.prepare_product_asset_upload(uuid,text)',
    'execute'
  ),
  'authenticated clients can reach publisher-guarded upload preparation'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.record_product_asset_cleanup_attempt(uuid,boolean,text,uuid)',
    'execute'
  ),
  'anonymous clients cannot forge asset cleanup receipts'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.record_product_asset_cleanup_attempt(uuid,boolean,text,uuid)',
    'execute'
  ),
  'authenticated clients can reach publisher-guarded cleanup receipts'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_product_asset_cleanup_jobs(integer,uuid)',
    'execute'
  ),
  'anonymous clients cannot claim private asset cleanup jobs'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.claim_product_asset_cleanup_jobs(integer,uuid)',
    'execute'
  ),
  'authenticated clients can reach the role-guarded cleanup claim RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.products', 'insert'),
  'authenticated clients cannot bypass managed product creation'
);
select ok(
  not has_table_privilege('authenticated', 'public.products', 'update'),
  'authenticated clients cannot bypass product revision checks'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.upsert_office_hour(uuid,text,timestamptz,text,text,text,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed office-hour writes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.upsert_office_hour(uuid,text,timestamptz,text,text,text,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded office-hour write RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.delete_office_hour(uuid,bigint)',
    'execute'
  ),
  'anonymous clients cannot execute managed office-hour deletion'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_office_hour(uuid,bigint)',
    'execute'
  ),
  'authenticated clients can reach the publisher-guarded office-hour delete RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.office_hour_sessions', 'insert'),
  'authenticated clients cannot bypass managed office-hour creation'
);
select ok(
  not has_table_privilege('authenticated', 'public.office_hour_sessions', 'update'),
  'authenticated clients cannot bypass office-hour revision checks'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_items', 'insert'),
  'authenticated clients cannot bypass atomic content item writes'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_access_rules', 'insert'),
  'authenticated clients cannot bypass atomic content access-rule writes'
);
select ok(
  has_table_privilege('service_role', 'public.content_items', 'select'),
  'service role can read content for server-rendered pages'
);
select ok(
  has_table_privilege('service_role', 'public.content_access_rules', 'select'),
  'service role can read content access rules for server-rendered pages'
);
select ok(
  has_table_privilege('service_role', 'public.office_hour_sessions', 'select'),
  'service role can read office hours for server-rendered pages'
);
select ok(
  has_table_privilege('service_role', 'public.products', 'select'),
  'service role can read products for server-rendered pages'
);
select ok(
  has_table_privilege('service_role', 'public.billing_events', 'insert'),
  'service role can persist billing event receipts'
);
select ok(
  has_table_privilege('service_role', 'public.billing_events', 'select,update'),
  'service role can inspect and finalize billing event receipts'
);
select ok(
  has_function_privilege('service_role', 'public.service_role_readiness()', 'execute'),
  'service role can execute the non-mutating readiness RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.begin_billing_event_attempt(uuid)',
    'execute'
  ),
  'service role can record billing processing attempts'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.begin_billing_event_attempt(uuid)',
    'execute'
  ),
  'authenticated clients cannot record billing processing attempts'
);
select ok(
  not has_function_privilege('anon', 'public.begin_billing_event_attempt(uuid)', 'execute'),
  'anonymous clients cannot record billing processing attempts'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.finish_billing_event_attempt(uuid,uuid,boolean,text,text)',
    'execute'
  ),
  'service role can settle the billing processing lease it owns'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.finish_billing_event_attempt(uuid,uuid,boolean,text,text)',
    'execute'
  ),
  'authenticated clients cannot settle billing processing leases'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.finish_billing_event_attempt(uuid,uuid,boolean,text,text)',
    'execute'
  ),
  'anonymous clients cannot settle billing processing leases'
);
select ok(
  not has_function_privilege('authenticated', 'public.service_role_readiness()', 'execute'),
  'authenticated clients cannot execute the service-role readiness RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.sync_stripe_subscription_state(uuid,text,text,membership_tier,text,timestamptz,timestamptz,timestamptz,boolean)',
    'execute'
  ),
  'authenticated clients cannot execute Stripe subscription synchronization'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.sync_stripe_product_purchase(uuid,uuid,text,text,timestamptz)',
    'execute'
  ),
  'authenticated clients cannot execute Stripe purchase synchronization'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.sync_stripe_subscription_state(uuid,text,text,membership_tier,text,timestamptz,timestamptz,timestamptz,boolean)',
    'execute'
  ),
  'service role can execute Stripe subscription synchronization'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.sync_stripe_product_purchase(uuid,uuid,text,text,timestamptz)',
    'execute'
  ),
  'service role can execute Stripe purchase synchronization'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.sync_stripe_product_dispute(text,text,text,timestamptz)',
    'execute'
  ),
  'authenticated clients cannot execute Stripe dispute synchronization'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.sync_stripe_product_dispute(text,text,text,timestamptz)',
    'execute'
  ),
  'service role can execute Stripe dispute synchronization'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_product_asset_cleanup_attempt(uuid,boolean,text,uuid)',
    'execute'
  ),
  'service role can record scheduled asset cleanup outcomes'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_product_asset_cleanup_jobs(integer,uuid)',
    'execute'
  ),
  'service role can atomically claim scheduled asset cleanup work'
);
select is(
  (select public from storage.buckets where id = 'product-files'),
  false,
  'product delivery storage is private'
);

set local role anon;
select ok(
  (select count(*) from public.membership_plans) > 0,
  'anonymous RLS exposes seeded public plans'
);
reset role;

insert into public.product_asset_cleanup_jobs (
  storage_path,
  reason,
  not_before
) values (
  'cron-test/abandoned.pdf',
  'abandoned_upload',
  now() - interval '1 hour'
);

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
select throws_like(
  $$
    insert into public.billing_events (
      provider,
      provider_event_id,
      event_type,
      payload
    ) values (
      'stripe',
      'evt_payload_privacy_test',
      'checkout.session.completed',
      '{
        "id": "evt_payload_privacy_test",
        "type": "checkout.session.completed",
        "customer_email": "private@example.com"
      }'::jsonb
    )
  $$,
  '%billing_events_stripe_payload_minimized%',
  'Stripe receipts reject payload fields outside the minimal audit contract'
);
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test')
  ) ->> 'claimed',
  'true',
  'the first worker claims billing event processing'
);
select ok(
  (
    select last_attempted_at is not null
    from public.billing_events
    where provider_event_id = 'evt_database_access_test'
  ),
  'a billing processing claim records its attempt time'
);
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test')
  ) ->> 'claimed',
  'false',
  'an active billing processing lease rejects a concurrent worker'
);
select is(
  (
    select attempt_count
    from public.billing_events
    where provider_event_id = 'evt_database_access_test'
  ),
  1,
  'a rejected concurrent worker does not increment billing attempts'
);
update public.billing_events
set
  processing_token = '00000000-0000-4000-8000-000000000598',
  processing_started_at = now() - interval '3 minutes'
where provider_event_id = 'evt_database_access_test';
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test')
  ) ->> 'claimed',
  'true',
  'an expired billing processing lease can be reclaimed'
);
select is(
  public.finish_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test'),
    '00000000-0000-4000-8000-000000000598',
    false,
    'stale worker failure'
  ) ->> 'settled',
  'false',
  'a stale billing worker cannot overwrite a reclaimed event'
);
select is(
  public.finish_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test'),
    (
      select processing_token
      from public.billing_events
      where provider_event_id = 'evt_database_access_test'
    ),
    true,
    null
  ) ->> 'settled',
  'true',
  'the current billing worker can complete its processing lease'
);
select results_eq(
  $$
    select status, attempt_count, processing_token is null
    from public.billing_events
    where provider_event_id = 'evt_database_access_test'
  $$,
  $$ values ('processed'::text, 2, true) $$,
  'billing completion retains attempts and clears claim state'
);
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_access_test')
  ) ->> 'claimed',
  'false',
  'a processed billing event cannot be claimed again'
);
insert into public.billing_events (
  provider,
  provider_event_id,
  event_type,
  payload
) values (
  'stripe',
  'evt_database_ignored_test',
  'invoice.created',
  jsonb_build_object(
    'apiVersion', null,
    'created', 1784124001,
    'id', 'evt_database_ignored_test',
    'livemode', false,
    'objectId', 'in_database_ignored_test',
    'objectType', 'invoice',
    'type', 'invoice.created'
  )
);
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_ignored_test')
  ) ->> 'claimed',
  'true',
  'an unhandled billing event can be claimed once'
);
select is(
  public.finish_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_ignored_test'),
    (
      select processing_token
      from public.billing_events
      where provider_event_id = 'evt_database_ignored_test'
    ),
    true,
    null,
    'ignored'
  ) ->> 'status',
  'ignored',
  'a signed event without a business handler has a distinct ignored outcome'
);
select is(
  public.begin_billing_event_attempt(
    (select id from public.billing_events where provider_event_id = 'evt_database_ignored_test')
  ) ->> 'claimed',
  'false',
  'an ignored billing event cannot be claimed again'
);
select throws_like(
  $$
    insert into public.billing_events (
      provider, provider_event_id, event_type, payload, status
    ) values (
      'stripe',
      'evt_database_unknown_status',
      'invoice.created',
      jsonb_build_object(
        'id', 'evt_database_unknown_status',
        'type', 'invoice.created'
      ),
      'unknown'
    )
  $$,
  '%billing_events_status_check%',
  'billing receipts reject unknown lifecycle states'
);
select is(
  (
    select count(*) from public.claim_product_asset_cleanup_jobs(50, null)
    where storage_path = 'cron-test/abandoned.pdf'
  ),
  1::bigint,
  'service role atomically claims one due cleanup job'
);
select is(
  (
    select count(*) from public.claim_product_asset_cleanup_jobs(50, null)
    where storage_path = 'cron-test/abandoned.pdf'
  ),
  0::bigint,
  'an active cleanup lease prevents a second worker from claiming the same job'
);
update public.product_asset_cleanup_jobs
set
  claim_token = '00000000-0000-4000-8000-000000000599',
  claimed_at = now() - interval '3 minutes'
where storage_path = 'cron-test/abandoned.pdf';
select is(
  (
    select count(*) from public.claim_product_asset_cleanup_jobs(50, null)
    where storage_path = 'cron-test/abandoned.pdf'
  ),
  1::bigint,
  'an expired cleanup lease can be reclaimed with a new token'
);
select is(
  (
    select count(*) from public.record_product_asset_cleanup_attempt(
      (select id from public.product_asset_cleanup_jobs where storage_path = 'cron-test/abandoned.pdf'),
      true,
      null,
      '00000000-0000-4000-8000-000000000599'
    )
  ),
  0::bigint,
  'a stale cleanup worker cannot finalize a reclaimed job'
);
select lives_ok(
  $$
    select * from public.record_product_asset_cleanup_attempt(
      (select id from public.product_asset_cleanup_jobs where storage_path = 'cron-test/abandoned.pdf'),
      true,
      null,
      (select claim_token from public.product_asset_cleanup_jobs where storage_path = 'cron-test/abandoned.pdf')
    )
  $$,
  'service role can finalize a scheduled asset cleanup job'
);
reset role;
select results_eq(
  $$
    select status, attempt_count
    from public.product_asset_cleanup_jobs
    where storage_path = 'cron-test/abandoned.pdf'
  $$,
  $$ values ('processed'::text, 1) $$,
  'scheduled cleanup retains a durable service-role attempt receipt'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated","email":"  BOOTSTRAP-DB-TEST@SOJI.LOCAL  ","user_metadata":{"full_name":"Bootstrap Member","avatar_url":"https://example.test/avatar.png"}}',
  true
);
select is(
  public.bootstrap_user_profile(),
  '00000000-0000-4000-8000-000000000103'::uuid,
  'authenticated profile bootstrap returns the current user id'
);
reset role;
select is(
  (select full_name from public.profiles where id = '00000000-0000-4000-8000-000000000103'),
  'Bootstrap Member',
  'profile bootstrap creates metadata-backed profile data'
);
select is(
  (select email from public.profiles where id = '00000000-0000-4000-8000-000000000103'),
  'bootstrap-db-test@soji.local',
  'profile bootstrap stores the JWT email in canonical form'
);
select is(
  (
    select count(*) from public.user_roles
    where user_id = '00000000-0000-4000-8000-000000000103' and role = 'member'
  ),
  1::bigint,
  'profile bootstrap creates exactly one member role'
);
select throws_like(
  $$
    update public.profiles
    set email = 'BOOTSTRAP-DB-TEST@SOJI.LOCAL'
    where id = '00000000-0000-4000-8000-000000000103'
  $$,
  '%profiles_email_canonical_check%',
  'profile storage rejects non-canonical email even for privileged writes'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000106","role":"authenticated","user_metadata":{"full_name":"No Email Member"}}',
  true
);
select throws_like(
  $$ select public.bootstrap_user_profile() $$,
  '%profile_email_required%',
  'profile bootstrap rejects an authenticated identity without an email'
);
reset role;
select is(
  (select count(*) from public.profiles where id = '00000000-0000-4000-8000-000000000106'),
  0::bigint,
  'missing-email bootstrap leaves no partial profile'
);

create function public.reject_rollback_bootstrap_test()
returns trigger
language plpgsql
as $$
begin
  if new.user_id = '00000000-0000-4000-8000-000000000104' then
    raise exception 'forced role bootstrap failure';
  end if;
  return new;
end;
$$;
create trigger reject_rollback_bootstrap_test
before insert on public.user_roles
for each row execute function public.reject_rollback_bootstrap_test();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated","email":"rollback-db-test@soji.local","user_metadata":{"full_name":"Must Roll Back"}}',
  true
);
select throws_like(
  $$ select public.bootstrap_user_profile() $$,
  '%forced role bootstrap failure%',
  'role failure rejects the entire profile bootstrap transaction'
);
reset role;
select is(
  (select count(*) from public.profiles where id = '00000000-0000-4000-8000-000000000104'),
  0::bigint,
  'failed role creation rolls back the profile write'
);
drop trigger reject_rollback_bootstrap_test on public.user_roles;
drop function public.reject_rollback_bootstrap_test();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_subscription_checkout(
      '00000000-0000-4000-8000-000000000701'
    )
  $$,
  array['claimed'],
  'the first subscription checkout request claims the user slot'
);
reset role;
select ok(
  (
    select expires_at > clock_timestamp() + interval '34 minutes'
    from public.subscription_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  'a subscription checkout claim covers the Stripe session creation window'
);
create temporary table subscription_checkout_claim_baseline as
select expires_at
from public.subscription_checkout_intents
where user_id = '00000000-0000-4000-8000-000000000101';

set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_subscription_checkout(
      '00000000-0000-4000-8000-000000000701'
    )
  $$,
  array['claimed'],
  'retrying the same subscription checkout request remains idempotent'
);
reset role;
select is(
  (
    select expires_at
    from public.subscription_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  (select expires_at from subscription_checkout_claim_baseline),
  'an idempotent retry preserves the Stripe session expiry'
);

set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_subscription_checkout(
      '00000000-0000-4000-8000-000000000702'
    )
  $$,
  array['checkout_in_progress'],
  'a different request cannot open a concurrent subscription checkout'
);
reset role;
select is(
  (
    select request_id
    from public.subscription_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  '00000000-0000-4000-8000-000000000701'::uuid,
  'a rejected concurrent request does not replace the active claim'
);

update public.subscription_checkout_intents
set
  created_at = clock_timestamp() - interval '36 minutes',
  expires_at = clock_timestamp() - interval '1 minute'
where user_id = '00000000-0000-4000-8000-000000000101';
set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_subscription_checkout(
      '00000000-0000-4000-8000-000000000702'
    )
  $$,
  array['claimed'],
  'a new request can replace an expired subscription checkout claim'
);
reset role;
select is(
  (
    select request_id
    from public.subscription_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  '00000000-0000-4000-8000-000000000702'::uuid,
  'the replacement claim records the new request id'
);

select is(
  public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000101',
    'sub_database_atomic_test',
    'cus_database_atomic_test',
    'tier_2',
    'active',
    '2026-08-14T12:00:00Z',
    null,
    '2026-07-14T12:00:00Z',
    true
  ),
  'tier_2'::membership_tier,
  'subscription synchronization returns the effective tier'
);
select is(
  (
    select tier from public.profiles
    where id = '00000000-0000-4000-8000-000000000101'
  ),
  'tier_2'::membership_tier,
  'subscription synchronization updates the profile tier atomically'
);
select is(
  (
    select cancel_at_period_end from public.subscriptions
    where provider_subscription_id = 'sub_database_atomic_test'
  ),
  true,
  'subscription synchronization preserves a scheduled period-end cancellation'
);
set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_subscription_checkout(
      '00000000-0000-4000-8000-000000000703'
    )
  $$,
  array['existing_subscription'],
  'a live Stripe subscription blocks a new checkout before claim expiry'
);
reset role;
select is(
  (
    select count(*)
    from public.user_entitlements
    where user_id = '00000000-0000-4000-8000-000000000101'
      and source_id = 'sub_database_atomic_test'
      and ends_at = '2026-08-14T12:00:00Z'
  ),
  (
    select count(*) from public.plan_entitlements where plan_id = 'tier_2'
  ),
  'subscription synchronization derives every entitlement from the plan'
);
select is(
  public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000101',
    'sub_database_atomic_test',
    'cus_database_atomic_test',
    'tier_2',
    'canceled',
    '2026-08-14T12:00:00Z',
    '2026-07-15T12:00:00Z',
    '2026-07-15T12:00:00Z'
  ),
  'free'::membership_tier,
  'canceling the only subscription recalculates the effective tier'
);
select is(
  (
    select count(*)
    from public.user_entitlements
    where source_id = 'sub_database_atomic_test'
      and ends_at = '2026-07-15T12:00:00Z'
  ),
  (
    select count(*) from public.plan_entitlements where plan_id = 'tier_2'
  ),
  'canceling a subscription expires all of its entitlements'
);
select is(
  public.sync_stripe_subscription_state(
    '00000000-0000-4000-8000-000000000101',
    'sub_database_atomic_test',
    'cus_database_atomic_test',
    'tier_2',
    'active',
    '2026-08-14T12:00:00Z',
    null,
    '2026-07-16T18:00:00Z'
  ),
  'free'::membership_tier,
  'a delayed active snapshot cannot reverse a terminal cancellation'
);
select ok(
  exists (
    select 1 from public.subscriptions
    where provider_subscription_id = 'sub_database_atomic_test'
      and status = 'canceled'
      and status_observed_at = '2026-07-15T12:00:00Z'
  ),
  'the subscription keeps its newest observed provider state'
);
select is(
  (
    select tier from public.profiles
    where id = '00000000-0000-4000-8000-000000000101'
  ),
  'free'::membership_tier,
  'a delayed subscription snapshot cannot restore the profile tier'
);
select is(
  (
    select count(*)
    from public.user_entitlements
    where source_id = 'sub_database_atomic_test'
      and ends_at = '2026-07-15T12:00:00Z'
  ),
  (
    select count(*) from public.plan_entitlements where plan_id = 'tier_2'
  ),
  'a delayed subscription snapshot cannot reactivate expired entitlements'
);
select throws_like(
  $$
    select public.sync_stripe_subscription_state(
      '00000000-0000-4000-8000-000000000102',
      'sub_database_atomic_test',
      'cus_database_atomic_test',
      'tier_3',
      'active',
      '2026-08-14T12:00:00Z',
      null,
      '2026-07-16T12:00:00Z'
    )
  $$,
  '%subscription_ownership_conflict%',
  'an existing Stripe subscription cannot be rebound to another user'
);
select is(
  (
    select user_id from public.subscriptions
    where provider_subscription_id = 'sub_database_atomic_test'
  ),
  '00000000-0000-4000-8000-000000000101'::uuid,
  'a rejected subscription rebind leaves the original owner unchanged'
);

insert into public.products (
  id,
  slug,
  title,
  summary,
  stripe_price_id,
  entitlement_id,
  is_active
) values (
  '00000000-0000-4000-8000-000000000201',
  'atomic-purchase-test',
  'Atomic purchase test',
  'Temporary pgTAP fixture',
  'price_atomicpurchasetest',
  'product.digital',
  false
);

insert into public.product_assets (
  product_id,
  storage_path,
  original_filename,
  content_type,
  size_bytes
) values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000201/workbook.pdf',
  'workbook.pdf',
  'application/pdf',
  1024
);

update public.products
set is_active = true
where id = '00000000-0000-4000-8000-000000000201';

insert into public.products (
  id,
  slug,
  title,
  summary,
  stripe_price_id,
  entitlement_id,
  is_active
) values (
  '00000000-0000-4000-8000-000000000204',
  'parallel-purchase-test',
  'Parallel purchase test',
  'Temporary pgTAP fixture',
  'price_parallelpurchasetest',
  'product.digital',
  false
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000801'
    )
  $$,
  array['claimed'],
  'the first product checkout request claims the user and product slot'
);
reset role;
select ok(
  (
    select expires_at > clock_timestamp() + interval '34 minutes'
    from public.product_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
      and product_id = '00000000-0000-4000-8000-000000000201'
  ),
  'a product checkout claim covers the Stripe session creation window'
);
create temporary table product_checkout_claim_baseline as
select expires_at
from public.product_checkout_intents
where user_id = '00000000-0000-4000-8000-000000000101'
  and product_id = '00000000-0000-4000-8000-000000000201';

set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000801'
    )
  $$,
  array['claimed'],
  'retrying the same product checkout request remains idempotent'
);
reset role;
select is(
  (
    select expires_at
    from public.product_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
      and product_id = '00000000-0000-4000-8000-000000000201'
  ),
  (select expires_at from product_checkout_claim_baseline),
  'an idempotent product retry preserves the Stripe session expiry'
);

set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000802'
    )
  $$,
  array['checkout_in_progress'],
  'a different request cannot open a concurrent checkout for the same product'
);
reset role;
select is(
  (
    select request_id
    from public.product_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
      and product_id = '00000000-0000-4000-8000-000000000201'
  ),
  '00000000-0000-4000-8000-000000000801'::uuid,
  'a rejected product request does not replace the active claim'
);

set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000803'
    )
  $$,
  array['claimed'],
  'the same user can claim a different product independently'
);
reset role;

update public.product_checkout_intents
set
  created_at = clock_timestamp() - interval '36 minutes',
  expires_at = clock_timestamp() - interval '1 minute'
where user_id = '00000000-0000-4000-8000-000000000101'
  and product_id = '00000000-0000-4000-8000-000000000201';
set local role authenticated;
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000802'
    )
  $$,
  array['claimed'],
  'a new request can replace an expired product checkout claim'
);
reset role;
select is(
  (
    select request_id
    from public.product_checkout_intents
    where user_id = '00000000-0000-4000-8000-000000000101'
      and product_id = '00000000-0000-4000-8000-000000000201'
  ),
  '00000000-0000-4000-8000-000000000802'::uuid,
  'the replacement product claim records the new request id'
);

select set_config('request.jwt.claims', '{}', true);
select throws_like(
  $$
    select * from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000804'
    )
  $$,
  '%not_authenticated%',
  'a product checkout claim requires authentication'
);

select throws_like(
  $$
    select public.sync_stripe_product_purchase(
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000201',
      'pi_database_unpaid_test',
      'unpaid',
      '2026-07-14T12:00:00Z'
    )
  $$,
  '%purchase_payment_not_complete%',
  'an incomplete payment cannot create a purchase entitlement'
);
select is(
  (
    select count(*) from public.purchases
    where provider_payment_id = 'pi_database_unpaid_test'
  ),
  0::bigint,
  'a rejected incomplete payment leaves no purchase row'
);

select is(
  public.sync_stripe_product_purchase(
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000201',
    'pi_database_atomic_test',
    'paid',
    '2026-07-14T12:00:00Z'
  ),
  'product.digital'::text,
  'purchase synchronization returns the database-owned entitlement'
);
select ok(
  exists (
    select 1 from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
  ) and exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_atomic_test'
      and entitlement_id = 'product.digital'
  ),
  'purchase synchronization writes the purchase and entitlement together'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000805'
    )
  $$,
  array['already_purchased'],
  'a paid product purchase blocks a new checkout before claim expiry'
);
reset role;
select is(
  public.sync_stripe_product_purchase(
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000204',
    'pi_database_no_payment_test',
    'no_payment_required',
    '2026-07-14T12:00:00Z'
  ),
  'product.digital'::text,
  'a no-payment checkout creates the database-owned entitlement'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000806'
    )
  $$,
  array['already_purchased'],
  'a no-payment product purchase blocks a new checkout'
);
reset role;
select throws_like(
  $$
    select public.sync_stripe_product_purchase(
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000201',
      'pi_database_atomic_test',
      'paid',
      '2026-07-14T12:00:00Z'
    )
  $$,
  '%payment_ownership_conflict%',
  'an existing payment cannot be rebound to another user'
);
select is(
  (
    select count(*) from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
      and user_id = '00000000-0000-4000-8000-000000000101'
  ),
  1::bigint,
  'a rejected payment rebind leaves the original purchase unchanged'
);
select is(
  public.sync_stripe_product_refund(
    'pi_database_atomic_test',
    'partially_refunded',
    '2026-07-14T13:00:00Z'
  ),
  'partially_refunded'::text,
  'a partial refund updates the matching Stripe purchase'
);
select ok(
  exists (
    select 1 from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
      and status = 'partially_refunded'
  ) and exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_atomic_test'
      and entitlement_id = 'product.digital'
  ),
  'a partial refund keeps the purchase entitlement active'
);
select is(
  (
    select status_observed_at from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
  ),
  '2026-07-14T13:00:00Z'::timestamptz,
  'a refund persists the Stripe event observation time'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000807'
    )
  $$,
  array['already_purchased'],
  'a partially refunded purchase still blocks duplicate checkout'
);
select is(
  (
    select count(*) from public.product_assets
    where product_id = '00000000-0000-4000-8000-000000000201'
  ),
  1::bigint,
  'a partially refunded buyer retains private delivery asset access'
);
reset role;
select is(
  public.sync_stripe_product_refund(
    'pi_database_atomic_test',
    'refunded',
    '2026-07-14T14:00:00Z'
  ),
  'refunded'::text,
  'a full refund updates the matching Stripe purchase'
);
select ok(
  exists (
    select 1 from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
      and status = 'refunded'
  ) and not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_atomic_test'
  ),
  'a full refund atomically revokes the purchase entitlement'
);
select is(
  public.sync_stripe_product_purchase(
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000201',
    'pi_database_atomic_test',
    'paid',
    '2026-07-14T12:00:00Z'
  ),
  'product.digital'::text,
  'a delayed checkout replay remains idempotent after a full refund'
);
select ok(
  exists (
    select 1 from public.purchases
    where provider_payment_id = 'pi_database_atomic_test'
      and status = 'refunded'
  ) and not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_atomic_test'
  ),
  'a delayed paid event cannot restore a fully refunded purchase'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select results_eq(
  $$
    select outcome
    from public.claim_product_checkout(
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000808'
    )
  $$,
  array['claimed'],
  'a fully refunded product can be purchased again'
);
select is(
  (
    select count(*) from public.product_assets
    where product_id = '00000000-0000-4000-8000-000000000201'
  ),
  0::bigint,
  'a fully refunded buyer cannot read the private delivery asset'
);
reset role;

select public.sync_stripe_product_purchase(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'pi_database_dispute_test',
  'paid',
  '2026-07-14T14:30:00Z'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'needs_response',
    '2026-07-14T14:31:00Z'
  ),
  'needs_response'::text,
  'an open dispute pauses the matching purchase'
);
select ok(
  exists (
    select 1 from public.purchases
    where provider_payment_id = 'pi_database_dispute_test'
      and status = 'paid'
      and dispute_id = 'du_database_dispute_test'
      and dispute_status = 'needs_response'
  ) and not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_dispute_test'
  ),
  'an open dispute retains payment evidence and atomically revokes delivery'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select is(
  (
    select count(*) from public.product_assets
    where product_id = '00000000-0000-4000-8000-000000000201'
  ),
  0::bigint,
  'a buyer cannot read private delivery metadata during a dispute'
);
reset role;
select public.sync_stripe_product_purchase(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'pi_database_dispute_test',
  'paid',
  '2026-07-14T14:30:00Z'
);
select ok(
  not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_dispute_test'
  ),
  'a delayed paid Checkout event cannot restore delivery during a dispute'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'won',
    '2026-07-14T14:29:00Z'
  ),
  'needs_response'::text,
  'an older dispute resolution cannot overwrite a newer open state'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'won',
    '2026-07-14T14:32:00Z'
  ),
  'won'::text,
  'a newer dispute win restores an eligible purchase'
);
select ok(
  exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_dispute_test'
  ),
  'a dispute win atomically restores digital delivery'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',
  true
);
select is(
  (
    select count(*) from public.product_assets
    where product_id = '00000000-0000-4000-8000-000000000201'
  ),
  1::bigint,
  'a buyer regains private delivery metadata after a dispute win'
);
reset role;
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'under_review',
    '2026-07-14T14:32:00Z'
  ),
  'won'::text,
  'an equal-time open snapshot cannot overwrite a terminal win'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'lost',
    '2026-07-14T14:33:00Z'
  ),
  'lost'::text,
  'a dispute loss ends digital delivery'
);
select ok(
  not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_dispute_test'
  ),
  'a dispute loss keeps the purchase record but revokes its entitlement'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'won',
    '2026-07-14T14:34:00Z'
  ),
  'won'::text,
  'a Stripe late win can restore delivery after a loss'
);
select is(
  public.sync_stripe_product_refund(
    'pi_database_dispute_test',
    'refunded',
    '2026-07-14T14:35:00Z'
  ),
  'refunded'::text,
  'a fully refunded disputed purchase remains a refund'
);
select is(
  public.sync_stripe_product_dispute(
    'pi_database_dispute_test',
    'du_database_dispute_test',
    'won',
    '2026-07-14T14:36:00Z'
  ),
  'won'::text,
  'a dispute resolution remains auditable after a full refund'
);
select ok(
  not exists (
    select 1 from public.user_entitlements
    where source_type = 'purchase'
      and source_id = 'pi_database_dispute_test'
  ),
  'a dispute win cannot restore delivery after a full refund'
);
select throws_like(
  $$
    update public.purchases
    set dispute_status = 'won'
    where provider_payment_id = 'pi_database_atomic_test'
  $$,
  '%purchases_dispute_state_check%',
  'purchase dispute evidence must be stored as one complete state'
);

select public.sync_stripe_product_purchase(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'pi_database_repurchase_test',
  'paid',
  '2026-07-14T15:00:00Z'
);

insert into public.products (
  id,
  slug,
  title,
  summary,
  stripe_price_id,
  entitlement_id,
  is_active
) values (
  '00000000-0000-4000-8000-000000000202',
  'missing-entitlement-test',
  'Missing entitlement test',
  'Temporary pgTAP fixture',
  'price_missingentitlementtest',
  null,
  false
);

insert into public.products (
  id,
  slug,
  title,
  summary,
  stripe_price_id,
  entitlement_id,
  is_active
) values (
  '00000000-0000-4000-8000-000000000203',
  'asset-delete-test',
  'Asset delete test',
  'Temporary pgTAP fixture',
  'price_assetdeletetest',
  'product.digital',
  false
);
insert into public.product_assets (
  product_id,
  storage_path,
  original_filename,
  content_type,
  size_bytes
) values (
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000203/delete-test.pdf',
  'delete-test.pdf',
  'application/pdf',
  1024
);
update public.products
set is_active = true
where id = '00000000-0000-4000-8000-000000000203';
delete from public.product_assets
where product_id = '00000000-0000-4000-8000-000000000203';
select is(
  (
    select is_active from public.products
    where id = '00000000-0000-4000-8000-000000000203'
  ),
  false,
  'deleting a delivery asset atomically deactivates its product'
);

select throws_like(
  $$
    select public.sync_stripe_product_purchase(
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000202',
      'pi_database_missing_entitlement_test',
      'paid',
      '2026-07-14T12:00:00Z'
    )
  $$,
  '%product_entitlement_not_configured%',
  'a product without an entitlement rejects purchase synchronization'
);
select is(
  (
    select count(*) from public.purchases
    where provider_payment_id = 'pi_database_missing_entitlement_test'
  ),
  0::bigint,
  'a rejected purchase synchronization leaves no partial purchase row'
);

update public.products
set is_active = false
where id = '00000000-0000-4000-8000-000000000201';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000101',
  true
);
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a member sees only their own profile'
);
select is(
  (select count(*) from public.billing_events),
  0::bigint,
  'a member cannot see billing events'
);
select is(
  (
    select count(*)
    from public.products
    where id = '00000000-0000-4000-8000-000000000201'
  ),
  1::bigint,
  'a purchaser can still read an archived product referenced by their receipt'
);
select is(
  (
    select count(*)
    from public.product_assets
    where product_id = '00000000-0000-4000-8000-000000000201'
  ),
  1::bigint,
  'a paid purchaser can read their product delivery metadata'
);
select throws_like(
  $$
    update public.profiles
    set tier = 'tier_3'
    where id = '00000000-0000-4000-8000-000000000101'
  $$,
  '%permission denied for table profiles%',
  'a member cannot promote their own membership tier'
);
select throws_like(
  $$
    update public.profiles
    set email = 'publisher@soji.local'
    where id = '00000000-0000-4000-8000-000000000101'
  $$,
  '%permission denied for table profiles%',
  'a member cannot rewrite the profile email used by admin bootstrap and search'
);
select throws_like(
  $$
    insert into public.profiles (id, email)
    values ('00000000-0000-4000-8000-000000000104', 'forged@soji.local')
  $$,
  '%permission denied for table profiles%',
  'a member cannot forge another profile before its JWT bootstrap'
);
select throws_like(
  $$
    insert into public.user_roles (user_id, role)
    values ('00000000-0000-4000-8000-000000000101', 'admin')
  $$,
  '%permission denied for table user_roles%',
  'a member cannot grant themselves the admin role'
);
select throws_like(
  $$
    select * from public.set_user_access_role(
      '00000000-0000-4000-8000-000000000101',
      'editor'
    )
  $$,
  '%admin_role_required%',
  'a member cannot invoke admin role management'
);
select throws_like(
  $$
    select public.list_managed_users(null, 25, 0)
  $$,
  '%admin_role_required%',
  'a member cannot search managed users'
);
select throws_like(
  $$
    select * from public.upsert_content_item(
      null,
      'member-content-write-test',
      'Member content write test',
      'A member must not be allowed to create this content.',
      'article',
      'members_only',
      'A sufficiently long body that must never be persisted by a member.',
      'A useful public preview that must never authorize this member write.',
      null,
      '',
      array['Member test'],
      true,
      array['content.basic']
    )
  $$,
  '%publisher_role_required%',
  'a member cannot invoke atomic content writes'
);
select throws_like(
  $$
    select * from public.upsert_product(
      null,
      'member-product-write-test',
      'Member product write test',
      'A member must not be allowed to create this product.',
      100,
      '$1',
      array['Protected download'],
      null,
      'product.digital',
      false,
      null
    )
  $$,
  '%publisher_role_required%',
  'a member cannot invoke managed product writes'
);
select throws_like(
  $$
    select * from public.replace_product_asset(
      '00000000-0000-4000-8000-000000000201',
      'member-forbidden.pdf',
      'member-forbidden.pdf',
      'application/pdf',
      1024,
      null::uuid,
      null
    )
  $$,
  '%publisher_role_required%',
  'a member cannot invoke managed product asset writes'
);
select throws_like(
  $$
    select * from public.upsert_office_hour(
      null,
      'Member office-hour write test',
      '2026-08-01T18:00:00Z',
      'https://example.com/member-signup',
      null,
      'office_hours.join',
      null
    )
  $$,
  '%publisher_role_required%',
  'a member cannot invoke managed office-hour writes'
);
select results_eq(
  $$
    select allowed
    from public.consume_checkout_rate_limit('product')
    union all
    select allowed
    from public.consume_checkout_rate_limit('product')
    union all
    select allowed
    from public.consume_checkout_rate_limit('product')
    union all
    select allowed
    from public.consume_checkout_rate_limit('product')
    union all
    select allowed
    from public.consume_checkout_rate_limit('product')
    union all
    select allowed
    from public.consume_checkout_rate_limit('product')
  $$,
  array[true, true, true, true, true, false],
  'the sixth checkout attempt in one window is denied'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000102',
  true
);
select is(
  (
    select count(*)
    from public.billing_events
    where provider_event_id = 'evt_database_access_test'
  ),
  1::bigint,
  'an admin can inspect failed billing events'
);
select lives_ok(
  $$
    select * from public.set_user_access_role(
      '00000000-0000-4000-8000-000000000101',
      'editor'
    )
  $$,
  'an admin can assign editor access through the managed RPC'
);
select ok(
  exists (
    select 1 from public.user_roles
    where user_id = '00000000-0000-4000-8000-000000000101'
      and role = 'editor'
  ),
  'the managed role update is persisted'
);
select is(
  (
    select count(*) from public.role_change_events
    where target_user_id = '00000000-0000-4000-8000-000000000101'
      and assigned_role = 'editor'
  ),
  1::bigint,
  'the managed role update creates an audit event'
);
select is(
  (
    public.list_managed_users('member-db-test', 25, 0)->>'total_items'
  )::bigint,
  1::bigint,
  'admin user search returns an exact filtered total'
);
select is(
  (
    public.list_managed_users('Database Member', 25, 0)->>'total_items'
  )::bigint,
  1::bigint,
  'admin user search matches full names'
);
select throws_like(
  $$
    select * from public.set_user_access_role(
      '00000000-0000-4000-8000-000000000102',
      'member'
    )
  $$,
  '%last_admin_required%',
  'the final admin cannot be demoted'
);
select lives_ok(
  $$
    select * from public.upsert_product(
      null,
      'database-access-test',
      'Database access test',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      'price_databaseaccesstest',
      'product.digital',
      false,
      null
    );
    select * from public.replace_product_asset(
      (select id from public.products where slug = 'database-access-test'),
      (select id::text from public.products where slug = 'database-access-test') ||
        '/11111111-1111-4111-8111-111111111111.pdf',
      'admin-test.pdf',
      'application/pdf',
      1024,
      public.prepare_product_asset_upload(
        (select id from public.products where slug = 'database-access-test'),
        (select id::text from public.products where slug = 'database-access-test') ||
          '/11111111-1111-4111-8111-111111111111.pdf'
      ),
      null
    );
    select * from public.upsert_product(
      (select id from public.products where slug = 'database-access-test'),
      'database-access-test',
      'Database access test',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      'price_databaseaccesstest',
      'product.digital',
      true,
      1
    )
  $$,
  'an admin can create a draft, attach delivery, and activate it'
);
select is(
  (select revision from public.products where slug = 'database-access-test'),
  2::bigint,
  'a managed product update increments its revision'
);
select is(
  (
    select revision from public.product_assets
    where product_id = (select id from public.products where slug = 'database-access-test')
  ),
  1::bigint,
  'a new managed product asset starts at revision one'
);
select is(
  (
    select status from public.product_asset_cleanup_jobs
    where storage_path =
      (select id::text from public.products where slug = 'database-access-test') ||
      '/11111111-1111-4111-8111-111111111111.pdf'
  ),
  'processed',
  'committing asset metadata closes the abandoned-upload cleanup reservation'
);
select lives_ok(
  $$
    select * from public.replace_product_asset(
      (select id from public.products where slug = 'database-access-test'),
      (select id::text from public.products where slug = 'database-access-test') ||
        '/22222222-2222-4222-8222-222222222222.pdf',
      'admin-test-v2.pdf',
      'application/pdf',
      2048,
      public.prepare_product_asset_upload(
        (select id from public.products where slug = 'database-access-test'),
        (select id::text from public.products where slug = 'database-access-test') ||
          '/22222222-2222-4222-8222-222222222222.pdf'
      ),
      1
    )
  $$,
  'an admin can replace the product asset revision they loaded'
);
select results_eq(
  $$
    select revision, storage_path
    from public.product_assets
    where product_id = (select id from public.products where slug = 'database-access-test')
  $$,
  $$
    select 2::bigint,
      id::text || '/22222222-2222-4222-8222-222222222222.pdf'
    from public.products where slug = 'database-access-test'
  $$,
  'managed asset replacement increments revision and stores the new path'
);
select is(
  (
    select status from public.product_asset_cleanup_jobs
    where storage_path =
      (select id::text from public.products where slug = 'database-access-test') ||
      '/11111111-1111-4111-8111-111111111111.pdf'
  ),
  'pending',
  'asset replacement transactionally queues the previous Storage object'
);
select is(
  (
    select count(*) from public.claim_product_asset_cleanup_jobs(
      1,
      (
        select id from public.product_asset_cleanup_jobs
        where storage_path =
          (select id::text from public.products where slug = 'database-access-test') ||
          '/11111111-1111-4111-8111-111111111111.pdf'
      )
    )
  ),
  1::bigint,
  'a publisher can claim the exact cleanup job returned by an asset operation'
);
select lives_ok(
  $$
    select * from public.record_product_asset_cleanup_attempt(
      (
        select id from public.product_asset_cleanup_jobs
        where storage_path =
          (select id::text from public.products where slug = 'database-access-test') ||
          '/11111111-1111-4111-8111-111111111111.pdf'
      ),
      true,
      null,
      (
        select claim_token from public.product_asset_cleanup_jobs
        where storage_path =
          (select id::text from public.products where slug = 'database-access-test') ||
          '/11111111-1111-4111-8111-111111111111.pdf'
      )
    )
  $$,
  'a publisher can record successful cleanup of a replaced object'
);
select results_eq(
  $$
    select status, attempt_count
    from public.product_asset_cleanup_jobs
    where storage_path =
      (select id::text from public.products where slug = 'database-access-test') ||
      '/11111111-1111-4111-8111-111111111111.pdf'
  $$,
  $$ values ('processed'::text, 1) $$,
  'cleanup receipts retain terminal status and attempt evidence'
);
select throws_like(
  $$
    select * from public.replace_product_asset(
      (select id from public.products where slug = 'database-access-test'),
      (select id::text from public.products where slug = 'database-access-test') ||
        '/33333333-3333-4333-8333-333333333333.pdf',
      'stale.pdf',
      'application/pdf',
      512,
      public.prepare_product_asset_upload(
        (select id from public.products where slug = 'database-access-test'),
        (select id::text from public.products where slug = 'database-access-test') ||
          '/33333333-3333-4333-8333-333333333333.pdf'
      ),
      1
    )
  $$,
  '%product_asset_write_conflict%',
  'a stale admin cannot replace a newer product asset revision'
);
select throws_like(
  $$
    select * from public.delete_product_asset(
      (select id from public.products where slug = 'database-access-test'),
      1
    )
  $$,
  '%product_asset_delete_conflict%',
  'a stale admin cannot delete a newer product asset revision'
);
select is(
  (
    select storage_path from public.product_assets
    where product_id = (select id from public.products where slug = 'database-access-test')
  ),
  (
    select id::text || '/22222222-2222-4222-8222-222222222222.pdf'
    from public.products where slug = 'database-access-test'
  ),
  'rejected stale asset operations preserve the current delivery file'
);
select throws_like(
  $$
    select * from public.upsert_product(
      (select id from public.products where slug = 'database-access-test'),
      'database-access-test',
      'Stale product overwrite',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      'price_databaseaccesstest',
      'product.digital',
      true,
      1
    )
  $$,
  '%product_write_conflict%',
  'a stale admin cannot overwrite a newer product revision'
);
select is(
  (select title from public.products where slug = 'database-access-test'),
  'Database access test',
  'a rejected stale product update preserves the newer fields'
);
select throws_like(
  $$
    select * from public.archive_product(
      (select id from public.products where slug = 'database-access-test'),
      1
    )
  $$,
  '%product_archive_conflict%',
  'a stale admin cannot archive a newer product revision'
);
select is(
  (select is_active from public.products where slug = 'database-access-test'),
  true,
  'a rejected stale archive leaves the newer product active'
);
select lives_ok(
  $$
    select * from public.archive_product(
      (select id from public.products where slug = 'database-access-test'),
      2
    )
  $$,
  'an admin can archive the product revision they loaded'
);
select is(
  (select is_active from public.products where slug = 'database-access-test'),
  false,
  'managed product archiving deactivates the product'
);
select lives_ok(
  $$
    select * from public.delete_product_asset(
      (select id from public.products where slug = 'database-access-test'),
      2
    )
  $$,
  'an admin can delete the product asset revision they loaded'
);
select is(
  (
    select reason from public.product_asset_cleanup_jobs
    where storage_path =
      (select id::text from public.products where slug = 'database-access-test') ||
      '/22222222-2222-4222-8222-222222222222.pdf'
  ),
  'deleted_asset',
  'managed asset deletion transactionally queues its Storage object'
);
select lives_ok(
  $$
    select * from public.upsert_office_hour(
      null,
      'Database office hour',
      '2026-08-01T18:00:00Z',
      'https://example.com/database-signup',
      'https://example.com/database-replay',
      'office_hours.join',
      null
    )
  $$,
  'an admin can create an office hour through the managed RPC'
);
select is(
  (
    select revision from public.office_hour_sessions
    where title = 'Database office hour'
  ),
  1::bigint,
  'a new office hour starts at revision one'
);
select lives_ok(
  $$
    select * from public.upsert_office_hour(
      (select id from public.office_hour_sessions where title = 'Database office hour'),
      'Database office hour updated',
      '2026-08-01T19:00:00Z',
      'https://example.com/database-signup',
      'https://example.com/database-replay',
      'office_hours.join',
      1
    )
  $$,
  'an admin can update the office-hour revision they loaded'
);
select is(
  (
    select revision from public.office_hour_sessions
    where title = 'Database office hour updated'
  ),
  2::bigint,
  'a managed office-hour update increments its revision'
);
select throws_like(
  $$
    select * from public.upsert_office_hour(
      (select id from public.office_hour_sessions where title = 'Database office hour updated'),
      'Stale office-hour overwrite',
      '2026-08-01T20:00:00Z',
      'https://example.com/database-signup',
      null,
      'office_hours.join',
      1
    )
  $$,
  '%office_hour_write_conflict%',
  'a stale admin cannot overwrite a newer office-hour revision'
);
select is(
  (
    select title from public.office_hour_sessions
    where title = 'Database office hour updated'
  ),
  'Database office hour updated',
  'a rejected stale office-hour update preserves the newer fields'
);
select throws_like(
  $$
    select public.delete_office_hour(
      (select id from public.office_hour_sessions where title = 'Database office hour updated'),
      1
    )
  $$,
  '%office_hour_delete_conflict%',
  'a stale admin cannot delete a newer office-hour revision'
);
select is(
  (
    select count(*) from public.office_hour_sessions
    where title = 'Database office hour updated'
  ),
  1::bigint,
  'a rejected stale office-hour deletion preserves the newer session'
);
select lives_ok(
  $$
    select public.delete_office_hour(
      (select id from public.office_hour_sessions where title = 'Database office hour updated'),
      2
    )
  $$,
  'an admin can delete the office-hour revision they loaded'
);
select is(
  (
    select count(*) from public.office_hour_sessions
    where title = 'Database office hour updated'
  ),
  0::bigint,
  'managed office-hour deletion removes the session'
);
select throws_like(
  $$
    select public.delete_office_hour(
      '00000000-0000-4000-8000-000000000699',
      1
    )
  $$,
  '%office_hour_not_found%',
  'managed office-hour deletion distinguishes an already-missing session'
);
select lives_ok(
  $$
    select * from public.upsert_content_item(
      null,
      'database-atomic-content',
      'Database atomic content',
      'A temporary content fixture for transaction verification.',
      'article',
      'members_only',
      'This body is long enough to represent a real protected content item.',
      'This explicit preview gives visitors useful context without the private body.',
      '/covers/database-atomic-content.webp',
      'A paper plan used to test atomic content publication.',
      array['Decision making', 'Database test'],
      true,
      array['content.basic']
    )
  $$,
  'an admin can create content and access rules atomically'
);
select is(
  (
    select count(*)
    from public.content_access_rules r
    join public.content_items c on c.id = r.content_id
    where c.slug = 'database-atomic-content'
      and r.entitlement_id = 'content.basic'
  ),
  1::bigint,
  'the atomic content create persists its entitlement rule'
);
select is(
  (
    select preview_markdown from public.content_items
    where slug = 'database-atomic-content'
  ),
  'This explicit preview gives visitors useful context without the private body.',
  'the atomic content create persists its explicit preview'
);
select is(
  (
    select cover_image_alt from public.content_items
    where slug = 'database-atomic-content'
  ),
  'A paper plan used to test atomic content publication.',
  'the atomic content create persists its cover alternative text'
);
select results_eq(
  $$
    select unnest(tags)
    from public.content_items
    where slug = 'database-atomic-content'
    order by 1
  $$,
  array['Database test', 'Decision making'],
  'the atomic content create persists normalized tags'
);
select is(
  (
    select revision from public.content_items
    where slug = 'database-atomic-content'
  ),
  1::bigint,
  'new content starts at revision one'
);
select lives_ok(
  $$
    select * from public.upsert_content_item(
      (select id from public.content_items where slug = 'database-atomic-content'),
      'database-atomic-content',
      'Database concurrent edit',
      'A temporary content fixture for transaction verification.',
      'article',
      'members_only',
      'This body is long enough to represent a real protected content item.',
      'An updated explicit preview that remains separate from the private body.',
      '/covers/database-atomic-content.webp',
      'A revised paper plan used to test atomic content publication.',
      array['Decision making', 'Database test'],
      true,
      array['content.basic'],
      1
    )
  $$,
  'an admin can update the revision they loaded'
);
select is(
  (
    select revision from public.content_items
    where slug = 'database-atomic-content'
  ),
  2::bigint,
  'a successful content update increments its revision'
);
select ok(
  (
    select published_at < updated_at from public.content_items
    where slug = 'database-atomic-content'
  ),
  'editing published content preserves its publication timestamp'
);
select throws_like(
  $$
    select * from public.upsert_content_item(
      (select id from public.content_items where slug = 'database-atomic-content'),
      'database-atomic-content',
      'Stale editor overwrite',
      'A temporary content fixture for transaction verification.',
      'article',
      'members_only',
      'This body is long enough to represent a real protected content item.',
      'A stale preview that must never replace the saved launch copy.',
      '/covers/database-atomic-content.webp',
      'A stale cover description that must not be saved.',
      array['Stale metadata'],
      true,
      array['content.basic'],
      1
    )
  $$,
  '%content_write_conflict%',
  'a stale editor cannot overwrite a newer content revision'
);
select is(
  (
    select title from public.content_items
    where slug = 'database-atomic-content'
  ),
  'Database concurrent edit',
  'a rejected stale update preserves the newer content'
);
select throws_like(
  $$
    select * from public.upsert_content_item(
      (select id from public.content_items where slug = 'database-atomic-content'),
      'database-atomic-content',
      'This title must roll back',
      'A temporary content fixture for transaction verification.',
      'article',
      'members_only',
      'This body is long enough to represent a real protected content item.',
      'This preview must roll back with the rejected access rule.',
      '/covers/database-atomic-content.webp',
      'A cover description that must roll back.',
      array['Rollback test'],
      true,
      array['missing.entitlement'],
      2
    )
  $$,
  '%content_access_rules_entitlement_id_fkey%',
  'an invalid entitlement rejects the entire content update transaction'
);
select is(
  (
    select title from public.content_items
    where slug = 'database-atomic-content'
  ),
  'Database concurrent edit',
  'a rejected access-rule update rolls back the content fields'
);
select is(
  (
    select preview_markdown from public.content_items
    where slug = 'database-atomic-content'
  ),
  'An updated explicit preview that remains separate from the private body.',
  'a rejected access-rule update rolls back launch metadata'
);
select is(
  (
    select count(*)
    from public.content_access_rules r
    join public.content_items c on c.id = r.content_id
    where c.slug = 'database-atomic-content'
      and r.entitlement_id = 'content.basic'
  ),
  1::bigint,
  'a rejected access-rule update preserves the previous rule'
);
select throws_like(
  $$
    select public.delete_content_item(
      (select id from public.content_items where slug = 'database-atomic-content'),
      1
    )
  $$,
  '%content_delete_conflict%',
  'a stale editor cannot delete a newer content revision'
);
select is(
  (
    select count(*) from public.content_items
    where slug = 'database-atomic-content'
  ),
  1::bigint,
  'a rejected stale deletion preserves the newer content'
);
select lives_ok(
  $$
    select public.delete_content_item(
      (select id from public.content_items where slug = 'database-atomic-content'),
      2
    )
  $$,
  'an admin can delete content through the managed RPC'
);
select is(
  (
    select count(*) from public.content_items
    where slug = 'database-atomic-content'
  ),
  0::bigint,
  'managed content deletion removes the item and cascades its rules'
);
select throws_like(
  $$
    select public.delete_content_item(
      '00000000-0000-4000-8000-000000000499',
      1
    )
  $$,
  '%content_not_found%',
  'managed content deletion distinguishes an already-missing item'
);
select throws_like(
  $$
    select * from public.upsert_product(
      null,
      'database-invalid-active-product',
      'Invalid active product',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      null,
      'product.digital',
      false,
      null
    );
    select * from public.replace_product_asset(
      (select id from public.products where slug = 'database-invalid-active-product'),
      (select id::text from public.products where slug = 'database-invalid-active-product') ||
        '/55555555-5555-4555-8555-555555555555.pdf',
      'invalid-active.pdf',
      'application/pdf',
      1024,
      public.prepare_product_asset_upload(
        (select id from public.products where slug = 'database-invalid-active-product'),
        (select id::text from public.products where slug = 'database-invalid-active-product') ||
          '/55555555-5555-4555-8555-555555555555.pdf'
      ),
      null
    );
    select * from public.upsert_product(
      (select id from public.products where slug = 'database-invalid-active-product'),
      'database-invalid-active-product',
      'Invalid active product',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      null,
      'product.digital',
      true,
      1
    )
  $$,
  '%products_active_checkout_configured%',
  'an active product requires checkout and fulfillment configuration'
);
select throws_like(
  $$
    select * from public.upsert_product(
      null,
      'database-missing-delivery-product',
      'Missing delivery product',
      'Temporary pgTAP fixture',
      100,
      '$1',
      array['Protected download'],
      'price_missingdeliverytest',
      'product.digital',
      true,
      null
    )
  $$,
  '%product_delivery_not_configured%',
  'an otherwise configured product cannot activate without a delivery asset'
);
select is(
  (
    select count(*)
    from public.products
    where slug = 'database-access-test'
  ),
  1::bigint,
  'the admin product write is visible'
);
reset role;

select * from finish();
rollback;
