# Supabase

- `migrations/`: SQL files, one per change, named `YYYYMMDDHHMM_description.sql`.
- `functions/`: edge functions (AI calls go here so keys stay on the server).

Environments on the free plan (2 projects): **staging** and **production**.
Local development uses the Supabase CLI. Donald owns this folder.

Every table that holds user data must have Row Level Security turned on.
