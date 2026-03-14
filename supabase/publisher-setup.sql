-- Replace the email below with your main account email after you sign up once.
-- This grants your account editor + admin access so you can publish content.

with target_user as (
  select id
  from profiles
  where email = 'your-main-email@example.com'
)
insert into user_roles (user_id, role)
select id, role
from target_user
cross join (
  values
    ('editor'::user_role),
    ('admin'::user_role)
) as roles(role)
on conflict (user_id, role) do nothing;

-- Optional: upgrade your own account to Tier 3 while testing all gated content.
update profiles
set tier = 'tier_3'
where email = 'your-main-email@example.com';
