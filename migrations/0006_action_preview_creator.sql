-- Security P1: four-eyes approval support.
--
-- Stores the creator (server-set session.userId) of an action preview so the
-- approval route can enforce approver != creator (self-approval prevention).
--
-- Additive and non-destructive: the column is nullable with no default, so all
-- existing rows get NULL. A NULL creator is treated as "missing creator" and
-- fails closed at approval time (the approval is rejected). Action previews are
-- short-lived (30-minute expiry), so no backfill is required.
ALTER TABLE action_previews ADD COLUMN created_by_user_id TEXT;
