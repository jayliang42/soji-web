begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

select ok(
  to_regclass('public.guest_full_access_checkouts') is not null,
  'guest checkout ledger exists'
);
select ok(
  to_regclass('public.guest_full_access_checkout_rate_limits') is not null,
  'guest checkout rate-limit storage exists'
);
select ok(
  not has_table_privilege('anon', 'public.guest_full_access_checkouts', 'select'),
  'anonymous clients cannot inspect guest purchases'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.guest_full_access_checkouts',
    'select,insert,update,delete'
  ),
  'authenticated clients cannot inspect or mutate guest purchases'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.reserve_guest_full_access_checkout(uuid,text)',
    'execute'
  ),
  'anonymous clients cannot reserve guest checkout rows'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_guest_full_access_checkout(uuid,text,text,uuid)',
    'execute'
  ),
  'authenticated clients cannot bypass the server claim boundary'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_guest_full_access_checkout(uuid,text,text,uuid)',
    'execute'
  ),
  'service role can execute atomic guest claims'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_guest_full_access_checkout_for_cancel(uuid,text)',
    'execute'
  ),
  'anonymous clients cannot locate guest checkout sessions'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.close_guest_full_access_checkout(text,uuid,text,text,timestamptz)',
    'execute'
  ),
  'authenticated clients cannot close guest checkout rows directly'
);

select throws_like(
  $$
    insert into public.guest_full_access_checkouts (
      request_id,
      browser_hmac,
      stripe_expires_at,
      status
    ) values (
      '00000000-0000-4000-8000-000000000920',
      repeat('0', 64),
      clock_timestamp() + interval '30 minutes',
      'paid_unclaimed'
    )
  $$,
  '%guest_full_access_paid_evidence_check%',
  'paid-unclaimed state requires complete payment and email evidence'
);
select throws_like(
  $$
    insert into public.guest_full_access_checkouts (
      request_id,
      browser_hmac,
      stripe_expires_at,
      status
    ) values (
      '00000000-0000-4000-8000-000000000921',
      repeat('0', 64),
      clock_timestamp() + interval '30 minutes',
      'refunded'
    )
  $$,
  '%guest_full_access_refund_evidence_check%',
  'refunded state requires durable refund evidence'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000901', 'guest-one@soji.local'),
  ('00000000-0000-4000-8000-000000000902', 'guest-two@soji.local');

insert into public.profiles (id, email, full_name)
values
  (
    '00000000-0000-4000-8000-000000000901',
    'guest-one@soji.local',
    'Guest One'
  ),
  (
    '00000000-0000-4000-8000-000000000902',
    'guest-two@soji.local',
    'Guest Two'
  );

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select results_eq(
  $$
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
    union all
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
    union all
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
    union all
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
    union all
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
    union all
    select allowed
    from public.consume_guest_full_access_checkout_rate_limit(
      repeat('1', 64), repeat('2', 64)
    )
  $$,
  array[true, true, true, true, true, false],
  'the sixth guest checkout attempt in one window is denied'
);
select is(
  (
    select allowed
    from generate_series(1, 21) as attempt
    cross join lateral public.consume_guest_full_access_checkout_rate_limit(
      encode(digest('guest-browser-' || attempt::text, 'sha256'), 'hex'),
      repeat('3', 64)
    )
    order by attempt desc
    limit 1
  ),
  false,
  'the network limiter cannot be bypassed by rotating browser cookies'
);
select is(
  (
    select count(*)
    from public.guest_full_access_checkout_rate_limits
    where dimension = 'browser'
  ),
  21::bigint,
  'a denied network does not create another attacker-controlled browser row'
);

create temporary table guest_primary as
select *
from public.reserve_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000911',
  repeat('a', 64)
);

select is(
  (select outcome from guest_primary),
  'reserved'::text,
  'a guest browser reserves a server-owned checkout identity'
);
select is(
  (select expected_amount_cents from guest_primary),
  9900,
  'the reservation fixes the Full Access amount on the server'
);
select is(
  (select expected_currency from guest_primary),
  'usd'::text,
  'the reservation fixes the checkout currency on the server'
);
select ok(
  (select stripe_expires_at > clock_timestamp() + interval '34 minutes'
   from guest_primary),
  'the reservation covers the Stripe session creation window'
);
select results_eq(
  $$
    select outcome
    from public.reserve_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000911',
      repeat('a', 64)
    )
  $$,
  array['existing'::text],
  'reservation retries are idempotent for the same browser'
);
select throws_like(
  $$
    select *
    from public.reserve_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000911',
      repeat('b', 64)
    )
  $$,
  '%guest_checkout_request_conflict%',
  'another browser cannot reuse a request id'
);
select results_eq(
  $$
    select outcome
    from public.attach_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000911',
      repeat('a', 64),
      'cs_test_guestprimary',
      (select stripe_expires_at from guest_primary)
    )
  $$,
  array['attached'::text],
  'the matching browser attaches its Stripe session'
);
select results_eq(
  $$
    select outcome
    from public.attach_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000911',
      repeat('a', 64),
      'cs_test_guestprimary',
      (select stripe_expires_at from guest_primary)
    )
  $$,
  array['existing'::text],
  'attaching the same Stripe session is idempotent'
);
select throws_like(
  $$
    select public.record_stripe_guest_full_access_payment(
      'cs_test_guestprimary',
      'pi_guest_primary',
      'paid',
      1,
      'usd',
      repeat('c', 64),
      '2026-08-24T06:00:00Z'
    )
  $$,
  '%guest_payment_catalog_mismatch%',
  'provider payment evidence cannot change the server price'
);
select is(
  public.record_stripe_guest_full_access_payment(
    'cs_test_guestprimary',
    'pi_guest_primary',
    'paid',
    9900,
    'usd',
    repeat('c', 64),
    '2026-08-24T06:00:00Z'
  ),
  'paid_unclaimed'::text,
  'a verified payment remains unclaimed before login'
);
select is(
  (
    select status
    from public.guest_full_access_checkouts
    where request_id = '00000000-0000-4000-8000-000000000911'
  ),
  'paid_unclaimed'::text,
  'the ledger persists paid but unclaimed state'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000901',
      repeat('d', 64),
      repeat('a', 64)
    )
  $$,
  array['email_mismatch'::text],
  'a different verified email cannot claim the browser purchase'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000901',
      repeat('c', 64),
      repeat('a', 64),
      '00000000-0000-4000-8000-000000000911'
    )
  $$,
  array['claimed'::text],
  'the matching verified email atomically claims the purchase'
);
select ok(
  exists (
    select 1
    from public.membership_purchases
    where user_id = '00000000-0000-4000-8000-000000000901'
      and provider_payment_id = 'pi_guest_primary'
  ),
  'claiming writes durable membership purchase evidence'
);
select ok(
  exists (
    select 1
    from public.user_entitlements
    where user_id = '00000000-0000-4000-8000-000000000901'
      and entitlement_id = 'content.all'
      and source_id = 'pi_guest_primary'
  ),
  'claiming grants Full Access to the matched account'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000901',
      repeat('c', 64),
      repeat('a', 64),
      '00000000-0000-4000-8000-000000000911'
    )
  $$,
  array['claimed'::text],
  'repeating a successful claim is idempotent for the same user'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000902',
      repeat('c', 64),
      repeat('a', 64),
      '00000000-0000-4000-8000-000000000911'
    )
  $$,
  array['invalid'::text],
  'a purchase already claimed by another account cannot be replayed'
);

create temporary table guest_wrong_email as
select *
from public.reserve_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000915',
  repeat('a', 64)
);
select * from public.attach_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000915',
  repeat('a', 64),
  'cs_test_guestwrongemail',
  (select stripe_expires_at from guest_wrong_email)
);
select public.record_stripe_guest_full_access_payment(
  'cs_test_guestwrongemail',
  'pi_guest_wrong_email',
  'paid',
  9900,
  'usd',
  repeat('d', 64),
  '2026-08-24T06:04:00Z'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000901',
      repeat('c', 64),
      repeat('a', 64),
      '00000000-0000-4000-8000-000000000915'
    )
  $$,
  array['email_mismatch'::text],
  'an older claim cannot mask an email mismatch on the current checkout'
);

select public.sync_stripe_membership_purchase(
  '00000000-0000-4000-8000-000000000901',
  'tier_1'::membership_tier,
  'pi_guest_primary',
  'paid',
  '2026-08-24T06:10:00Z'
);
select results_eq(
  $$
    select outcome
    from public.sync_stripe_guest_full_access_refund(
      (select checkout_id from guest_primary),
      'pi_guest_primary',
      'refunded',
      '2026-08-24T06:05:00Z'
    )
  $$,
  array['claimed'::text],
  'a stale refund ignored by membership state also leaves the guest row claimed'
);
select is(
  (
    select status
    from public.membership_purchases
    where provider_payment_id = 'pi_guest_primary'
  ),
  'paid'::text,
  'the stale refund does not change the durable membership purchase'
);
select ok(
  exists (
    select 1
    from public.user_entitlements
    where user_id = '00000000-0000-4000-8000-000000000901'
      and source_id = 'pi_guest_primary'
  ),
  'the stale refund cannot create guest-ledger and entitlement divergence'
);
select * from public.sync_stripe_guest_full_access_dispute(
  (select checkout_id from guest_primary),
  'pi_guest_primary',
  'du_guest_primary',
  'needs_response',
  '2026-08-24T06:11:00Z'
);
select results_eq(
  $$
    select outcome
    from public.sync_stripe_guest_full_access_refund(
      (select checkout_id from guest_primary),
      'pi_guest_primary',
      'partially_refunded',
      '2026-08-24T06:12:00Z'
    )
  $$,
  array['disputed'::text],
  'a partial refund cannot reopen a claimed purchase with a blocking dispute'
);

create temporary table guest_refunded as
select *
from public.reserve_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000912',
  repeat('e', 64)
);
select * from public.attach_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000912',
  repeat('e', 64),
  'cs_test_guestrefunded',
  (select stripe_expires_at from guest_refunded)
);
select * from public.sync_stripe_guest_full_access_refund(
  (select checkout_id from guest_refunded),
  'pi_guest_refunded',
  'refunded',
  '2026-08-24T06:02:00Z'
);
select is(
  public.record_stripe_guest_full_access_payment(
    'cs_test_guestrefunded',
    'pi_guest_refunded',
    'paid',
    9900,
    'usd',
    repeat('f', 64),
    '2026-08-24T06:00:00Z'
  ),
  'refunded'::text,
  'a delayed paid event cannot reverse a full pre-claim refund'
);
select is(
  (
    select claim_email_hmac
    from public.guest_full_access_checkouts
    where request_id = '00000000-0000-4000-8000-000000000912'
  ),
  null::text,
  'a fully refunded unclaimed purchase does not retain its email HMAC'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000902',
      repeat('f', 64),
      repeat('e', 64)
    )
  $$,
  array['invalid'::text],
  'a fully refunded guest payment cannot be claimed'
);
select is_empty(
  $$
    select checkout_id
    from public.get_guest_full_access_checkout_for_cancel(
      '00000000-0000-4000-8000-000000000912',
      repeat('e', 64)
    )
  $$,
  'a paid or refunded checkout cannot be located through the cancel endpoint'
);

create temporary table guest_disputed as
select *
from public.reserve_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000913',
  repeat('7', 64)
);
select * from public.attach_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000913',
  repeat('7', 64),
  'cs_test_guestdisputed',
  (select stripe_expires_at from guest_disputed)
);
select * from public.sync_stripe_guest_full_access_dispute(
  (select checkout_id from guest_disputed),
  'pi_guest_disputed',
  'du_guest_disputed',
  'needs_response',
  '2026-08-24T06:01:00Z'
);
select is(
  public.record_stripe_guest_full_access_payment(
    'cs_test_guestdisputed',
    'pi_guest_disputed',
    'paid',
    9900,
    'usd',
    repeat('8', 64),
    '2026-08-24T06:00:00Z'
  ),
  'disputed'::text,
  'a blocking dispute prevents a delayed paid event from becoming claimable'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000902',
      repeat('8', 64),
      repeat('7', 64)
    )
  $$,
  array['invalid'::text],
  'a blocking dispute prevents guest claim'
);
select results_eq(
  $$
    select outcome
    from public.sync_stripe_guest_full_access_refund(
      (select checkout_id from guest_disputed),
      'pi_guest_disputed',
      'partially_refunded',
      '2026-08-24T06:02:00Z'
    )
  $$,
  array['disputed'::text],
  'a partial refund cannot reopen an unclaimed purchase with a blocking dispute'
);
select results_eq(
  $$
    select outcome
    from public.sync_stripe_guest_full_access_dispute(
      (select checkout_id from guest_disputed),
      'pi_guest_disputed',
      'du_guest_disputed',
      'won',
      '2026-08-24T06:03:00Z'
    )
  $$,
  array['paid_unclaimed'::text],
  'a won dispute restores an unclaimed paid purchase'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000902',
      repeat('8', 64),
      repeat('7', 64)
    )
  $$,
  array['claimed'::text],
  'a restored payment can be claimed by its verified email'
);

select * from public.sync_stripe_guest_full_access_refund(
  (select checkout_id from guest_primary),
  'pi_guest_primary',
  'refunded',
  '2026-08-24T06:20:00Z'
);
select results_eq(
  $$
    select outcome
    from public.claim_guest_full_access_checkout(
      '00000000-0000-4000-8000-000000000901',
      repeat('c', 64),
      repeat('a', 64),
      '00000000-0000-4000-8000-000000000911'
    )
  $$,
  array['invalid'::text],
  'a fully refunded historical claim is not reported as newly claimed'
);

create temporary table guest_cancelled as
select *
from public.reserve_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000914',
  repeat('9', 64)
);
select * from public.attach_guest_full_access_checkout(
  '00000000-0000-4000-8000-000000000914',
  repeat('9', 64),
  'cs_test_guestcancelled',
  (select stripe_expires_at from guest_cancelled)
);
select results_eq(
  $$
    select stripe_checkout_session_id
    from public.get_guest_full_access_checkout_for_cancel(
      '00000000-0000-4000-8000-000000000914',
      repeat('9', 64)
    )
  $$,
  array['cs_test_guestcancelled'::text],
  'the matching HttpOnly browser identity can locate its open session'
);
select is(
  public.close_guest_full_access_checkout(
    'cancelled',
    '00000000-0000-4000-8000-000000000914',
    repeat('9', 64),
    null,
    '2026-08-24T06:05:00Z'
  ),
  'cancelled'::text,
  'a server-confirmed cancellation closes the guest row'
);
select is(
  (
    select status
    from public.guest_full_access_checkouts
    where request_id = '00000000-0000-4000-8000-000000000914'
  ),
  'cancelled'::text,
  'cancelled guest checkout state is durable'
);

reset role;

select * from finish();
rollback;
