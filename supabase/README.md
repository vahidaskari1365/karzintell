# Supabase deployment

1. Create a Supabase project and keep the database password in your deployment secret manager.
2. Link the local CLI without putting the access token in the repository:
   `supabase login` then `supabase link --project-ref <project-ref>`.
3. Apply the migration with `supabase db push`, or paste
   `migrations/20260825000000_initial_store.sql` into the Supabase SQL Editor.
4. Copy the **pooled** PostgreSQL connection string (port `6543`) to `DATABASE_URL` for the API.
   Use the **direct** connection (port `5432`) for CLI migrations and administrative tasks.
5. Run `npm run seed` with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` supplied only through
   the environment. If the password is empty, the command generates a one-time password and
   prints it once.

The migration enables RLS for customer/operator access through Supabase Auth and keeps the
existing API JWT flow available during migration. The API uses the service database connection,
so its authorization guards remain the source of truth for current web requests.
