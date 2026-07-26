update public.billing_events
set
  payload = jsonb_build_object(
    'apiVersion', case
      when jsonb_typeof(payload -> 'api_version') = 'string'
        then payload -> 'api_version'
      else 'null'::jsonb
    end,
    'created', case
      when jsonb_typeof(payload -> 'created') = 'number'
        then payload -> 'created'
      else 'null'::jsonb
    end,
    'id', to_jsonb(provider_event_id),
    'livemode', case
      when jsonb_typeof(payload -> 'livemode') = 'boolean'
        then payload -> 'livemode'
      else 'null'::jsonb
    end,
    'objectId', case
      when jsonb_typeof(payload #> '{data,object,id}') = 'string'
        then payload #> '{data,object,id}'
      else 'null'::jsonb
    end,
    'objectType', case
      when jsonb_typeof(payload #> '{data,object,object}') = 'string'
        then payload #> '{data,object,object}'
      else 'null'::jsonb
    end,
    'type', to_jsonb(event_type)
  ),
  updated_at = clock_timestamp()
where provider = 'stripe'
  and event_type <> 'admin.billing.reconcile';

alter table public.billing_events
  drop constraint if exists billing_events_stripe_payload_minimized;

alter table public.billing_events
  add constraint billing_events_stripe_payload_minimized
  check (
    provider <> 'stripe'
    or event_type = 'admin.billing.reconcile'
    or (
      jsonb_typeof(payload) = 'object'
      and payload ->> 'id' = provider_event_id
      and payload ->> 'type' = event_type
      and payload - array[
        'apiVersion',
        'created',
        'id',
        'livemode',
        'objectId',
        'objectType',
        'type'
      ] = '{}'::jsonb
    )
  );
