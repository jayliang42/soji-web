# Supabase Notes

This schema is the baseline for:

- shared user profiles tied to `auth.users`
- membership subscriptions from Stripe and app stores
- internal entitlements used by both web and app
- content items with entitlement-based access control
- one-off digital product purchases
- office hour scheduling metadata

Recommended next steps:

1. Add RLS policies for `profiles`, `subscriptions`, `user_entitlements`, and `content_items`
2. Create SQL functions or RPCs to compute effective entitlements
3. Mirror Stripe and RevenueCat webhook events into a `billing_events` audit table
4. Add storage buckets for template downloads and content assets
