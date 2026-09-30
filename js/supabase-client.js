'use strict';
/**
 * FILL THESE IN after creating your Supabase project:
 *   Supabase Dashboard → Project Settings → API
 *     - "Project URL"      → SUPABASE_URL
 *     - "anon public" key  → SUPABASE_ANON_KEY
 * The anon key is safe to publish in client-side code — it can only do
 * what your Row Level Security policies allow (read-only, per the schema).
 */
const SUPABASE_URL = 'https://iriiwbivuwwfsspwvvsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaWl3Yml2dXd3ZnNzcHd2dnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTk1MjYsImV4cCI6MjEwNjI5NTUyNn0.oMN0LGgXutFZ_gJP5NO_wve9uugMPNYvVV_1s3olUnQ';
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
