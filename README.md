-- ═══════════════════════════════════════════════════════════
-- OPTIONAL — run this ONLY against your OLD Node/Postgres database,
-- and ONLY if you're fully done with it and have backed up or don't
-- need anything in these tables.
--
-- This does NOT touch Supabase. It has nothing to do with the new
-- static site. It is only here in case you want to clean up the old
-- database you're retiring.
--
-- ⚠️  THIS PERMANENTLY DELETES:
--     - Every contact message ever submitted
--     - Every prayer request ever submitted
--     - Every "plan your visit" request ever submitted
--     - Every department/ministry sign-up ever submitted
--     - Every event registration ever submitted
--     - Every uploaded media file record and admin account
--
-- There is no undo. Do not run this unless you are certain.
-- ═══════════════════════════════════════════════════════════

DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS prayer_requests CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS visit_requests CASCADE;
DROP TABLE IF EXISTS department_applications CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
