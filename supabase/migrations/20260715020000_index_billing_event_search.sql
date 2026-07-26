create index if not exists billing_events_created_at_id_idx
on public.billing_events (created_at desc, id desc);

create index if not exists billing_events_status_created_at_id_idx
on public.billing_events (status, created_at desc, id desc);
