-- Add the 'physician' role to the user_role enum.
-- ISOLATED in its own migration on purpose: Postgres forbids using a value added
-- by ALTER TYPE ... ADD VALUE inside the same transaction that adds it, and the
-- Supabase CLI runs each migration file as one transaction. Committing the enum
-- value here guarantees later migrations, the seed, and runtime inserts of
-- role='physician' see a committed value.
alter type user_role add value if not exists 'physician';
