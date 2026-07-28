insert into public.entitlements (id, label, description)
values (
  'content.basic',
  'Basic content',
  'Unlocks foundational member articles.'
)
on conflict (id) do nothing;

with flagship as (
  insert into public.content_items (
    slug,
    title,
    summary,
    type,
    visibility,
    body_markdown,
    preview_markdown,
    cover_image_url,
    cover_image_alt,
    tags,
    published_at
  )
  values (
    'wealth-without-drift',
    'Wealth Without Drift: A 90-Minute Decision Reset',
    'A focused reset for turning open money questions into a values-led, cash-aware 30-day plan.',
    'article',
    'members_only',
    $flagship_body$
## What this reset is for

Most money drift does not begin with one dramatic mistake. It begins when small decisions remain open for too long: a subscription no one uses, a savings transfer that never became automatic, a family goal that sounds important but never reaches the calendar. Each item seems manageable alone. Together, they create a background feeling that money is happening to you instead of being directed by you.

This reset is designed for one focused 90-minute session. You will not rebuild your entire financial life, optimize every account, or predict the next year. You will identify the decisions creating the most drag, connect them to what matters now, and leave with a short list of actions for the next 30 days. The finished result should fit on one page.

Before you begin, gather the last two months of bank and card activity, your recurring-bill list, a blank sheet of paper, and any calendar shared with the people affected by your choices. Put your phone on Do Not Disturb. If exact numbers are difficult to find, use a reasonable range and mark it for follow-up. The goal is not perfect accounting. It is to turn vague pressure into a few visible decisions.

## Minutes 0–15: build the decision inventory

Draw three columns: **Keep**, **Change**, and **Decide later**. Write each open money decision on one line, without solving it yet. Include commitments of time and attention as well as dollars. A cheap obligation that creates weekly friction may deserve attention before a larger expense that is working exactly as intended.

Scan your recent activity and recurring bills. Look for purchases you postponed evaluating, renewals you meant to cancel, savings goals without a transfer, debt payments that still rely on memory, and household costs that regularly surprise someone. Then add decisions that may not appear in a statement: an upcoming trip, a repair, support for a relative, a career change, or a school expense.

Keep the inventory concrete. Replace “spend less” with “decide whether two restaurant nights each week still fit.” Replace “save more” with “choose a monthly transfer for the emergency reserve.” Replace “figure out insurance” with “compare the current deductible with the cash available for an emergency.” A decision you can name can be scheduled, assigned, or declined.

Now mark each line with one of three symbols. Use a dot for decisions that affect only you, two dots for decisions that affect another person, and a small clock for anything with a real deadline. This prevents a private preference from being treated like a family agreement and keeps a quiet deadline from becoming an expensive surprise.

## Minutes 15–30: test value against total cost

Choose the eight items with the most financial or emotional weight. For each one, write two short answers: **What value does this create?** and **What does it cost in full?** Value may be safety, time, health, connection, learning, flexibility, or simple enjoyment. Cost includes the price, but it may also include maintenance, coordination, storage, attention, or the loss of another option.

Do not use “responsible” or “irresponsible” as answers. Those labels hide the tradeoff. A costly convenience can be worthwhile during a demanding season. A low-cost habit can be poor value when it adds clutter or repeated guilt. The useful question is whether the exchange still supports the life you are currently living.

Next, give each item a simple value-to-cost result: **clear yes**, **clear no**, or **needs a condition**. A condition makes an uncertain choice testable. You might keep a service if it replaces two other expenses, continue an activity if it is used twice this month, or delay a purchase until the emergency reserve reaches a named amount.

Look for mismatches between your stated priorities and your calendar or cash flow. If family time matters but every weekend is crowded with costly obligations, the issue may be schedule design rather than a spending category. If flexibility matters but fixed commitments keep rising, the next useful move may be reducing one recurring obligation instead of chasing a higher return.

## Minutes 30–50: map cash-flow commitments

On a fresh section of the page, write monthly take-home income as a range if it varies. Under it, list four groups: **essential commitments**, **future commitments**, **flexible living**, and **unassigned margin**. Essential commitments cover the bills and obligations that keep life functioning. Future commitments include savings, debt reduction beyond minimums, and known upcoming costs. Flexible living covers choices that can move from month to month. Unassigned margin is the money not already promised.

The groups are not moral rankings. They are a visibility tool. The same expense can sit in different groups for different households. What matters is that every recurring promise has a place and that the total does not depend on an unusually good month.

Circle any commitment that is both recurring and still manually remembered. These are strong candidates for automation or a calendar trigger. Put a box around any annual or irregular cost that has no monthly contribution. Divide the expected amount by the number of months remaining, then decide whether the result belongs in the next 30-day plan.

If the page shows little or no margin, avoid trying to solve ten categories at once. Identify one structural commitment and one flexible pattern to review. Structural changes may take longer but can create durable room. Flexible changes can create immediate feedback. Pairing one of each is usually more realistic than an aggressive temporary cut across everything.

Now run a pressure test. Ask what happens if income arrives late, a bill is 20 percent higher, or a planned expense moves forward by one month. You are not forecasting every emergency. You are checking whether the current plan has any tolerance. If one small change breaks the month, preserving margin becomes a decision in its own right.

## Minutes 50–65: hold the family conversation

If another person shares the consequences, do not present the page as a verdict. Start with observations: “These are the commitments I found, these are the deadlines, and these two items seem to be creating the most pressure.” Then ask what they see differently. A useful conversation separates facts, preferences, and fears rather than arguing about all three at once.

Use three prompts. First: **What are we protecting in the next 90 days?** Second: **Which commitment no longer matches this season?** Third: **What would make the plan feel fair enough to follow?** The word “enough” matters. A plan that requires one person to absorb every inconvenience is unlikely to survive contact with ordinary life.

When priorities conflict, write both before choosing. One person may value a larger cash buffer while another values a planned experience. The job is not to prove which value is correct. It is to design a condition both people can understand, such as booking after a reserve threshold is reached or choosing a lower-cost version that does not delay another shared goal.

Assign ownership for each follow-up. “We should call” is not an assignment. Write one name, one next action, and one date. If a child or relative is affected, decide what they need to know and what remains an adult responsibility. Transparency should reduce uncertainty, not transfer financial anxiety to someone who cannot act on it.

## Minutes 65–80: choose the few decisions that matter

Return to the inventory and select no more than five decisions for the next 30 days. A balanced list usually contains one item that protects stability, one that removes friction, one that advances a future goal, one conversation, and—when the budget allows—one choice that supports enjoyment or connection. Money direction should make life more intentional, not merely smaller.

For each selected decision, use a four-part action line: **verb, amount or boundary, owner, date**. Examples include “Move $150 to the repair reserve on payday,” “Cancel the unused software before the 12th,” “Compare two insurance deductibles by Friday,” or “Choose the trip budget together on Sunday.” Specific lines are easier to finish and easier to review without blame.

Decide what you are explicitly not changing this month. This protects attention from endless optimization. A Keep decision is still a decision when you have reviewed the tradeoff and chosen it on purpose. Write the reason in one sentence so you do not reopen the same question next week.

Move everything else to Decide later with a trigger, not a vague delay. Use a date, a balance threshold, a contract renewal, or a life event. A decision without a trigger remains mental clutter. A triggered decision has a safe place to wait.

## Minutes 80–90: install the 30-day review

Put the five action lines on your calendar or task system while the session is still open. Schedule a 20-minute review 30 days from now. The review has only four questions: What did we complete? What changed? Which assumption was wrong? What is the next decision?

Choose one small signal to watch during the month. It might be unassigned margin after each payday, the number of manual transfers still open, or whether a recurring service was actually used. A single signal can reveal whether the reset changed behavior without turning daily life into a financial dashboard.

End by writing a one-sentence direction for the month. Keep it practical: “Protect the repair reserve and make the summer decision together,” or “Reduce recurring friction before adding a new goal.” This sentence is not a slogan. It is a filter for choices that appear before the next review.

## When the page reveals a harder problem

A 90-minute reset cannot solve insufficient income, unsafe debt, an urgent legal or tax issue, financial abuse, or a complex investment decision. If the inventory reveals a problem with serious consequences, the useful outcome may be identifying the right qualified professional, community resource, or trusted support person and making that contact.

Soji provides general financial education, not individualized investment, legal, tax, or accounting advice. The examples here cannot account for your full circumstances, local rules, contractual obligations, or risk tolerance. Verify important information and seek qualified help when a decision requires advice specific to you.

The reset has worked if the page is clearer than the worry you started with. You do not need certainty about every future choice. You need a small number of visible decisions, enough margin to respond to change, and a date when you will look again.
$flagship_body$,
    $flagship_preview$
Most money drift does not begin with one dramatic mistake. It begins when small decisions remain open for too long: a subscription no one uses, a savings transfer that never became automatic, a family goal that sounds important but never reaches the calendar.

This reset is designed for one focused 90-minute session. You will not rebuild your entire financial life. You will identify the decisions creating the most drag, connect them to what matters now, and leave with a short list of actions for the next 30 days.

Before you begin, gather the last two months of bank and card activity, your recurring-bill list, a blank sheet of paper, and any calendar shared with the people affected by your choices. Put your phone on Do Not Disturb. The goal is not perfect accounting. It is to turn vague pressure into a few visible decisions.

Start by drawing three columns: Keep, Change, and Decide Later. Write each open money decision on one line, without solving it yet. Include commitments of time and attention as well as dollars. A cheap obligation that creates weekly friction may deserve attention before a larger expense that is working exactly as intended.
$flagship_preview$,
    '/covers/wealth-without-drift.webp',
    'Paper decision map, pencil, linen ledger, and ceramic dish in warm window light.',
    array['decision-making', 'cash flow', 'family', '30-day reset'],
    '2026-07-28T00:00:00.000Z'::timestamptz
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    summary = excluded.summary,
    type = excluded.type,
    visibility = excluded.visibility,
    body_markdown = excluded.body_markdown,
    preview_markdown = excluded.preview_markdown,
    cover_image_url = excluded.cover_image_url,
    cover_image_alt = excluded.cover_image_alt,
    tags = excluded.tags,
    published_at = excluded.published_at,
    updated_at = clock_timestamp()
  returning id
),
cleared_rules as (
  delete from public.content_access_rules as rules
  using flagship
  where rules.content_id = flagship.id
  returning rules.content_id
)
insert into public.content_access_rules (content_id, entitlement_id)
select flagship.id, 'content.basic'
from flagship
on conflict (content_id, entitlement_id) do nothing;
