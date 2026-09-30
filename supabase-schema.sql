-- ═══════════════════════════════════════════════════════════
-- ACHIEVERS GOSPEL CHAPEL — Supabase schema (static-site edition)
-- Run this once in the Supabase SQL Editor for a NEW project.
-- Public read-only content only. No admin tables, no auth tables.
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Website Settings (key/value CMS content) ──────────────
CREATE TABLE IF NOT EXISTS website_settings (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key     VARCHAR(100) UNIQUE NOT NULL,
  value   TEXT,
  type    VARCHAR(20) NOT NULL DEFAULT 'text',
  label   VARCHAR(200),
  section VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Service Times ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_times (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL,
  day_label   VARCHAR(100),
  time_label  VARCHAR(100),
  icon        VARCHAR(10) DEFAULT '🕊',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Sermons ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sermons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          VARCHAR(255) NOT NULL,
  preacher       VARCHAR(150),
  description    TEXT,
  audio_url      VARCHAR(500),
  video_url      VARCHAR(500),
  notes_url      VARCHAR(500),
  facebook_url   VARCHAR(500),
  thumbnail_url  VARCHAR(500),
  scripture_ref  VARCHAR(150),
  scripture_text TEXT,
  sermon_type    VARCHAR(20) DEFAULT 'video',
  sermon_date    DATE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  featured       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(255) UNIQUE NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  icon        VARCHAR(10) DEFAULT '📷',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_date  DATE,
  event_time  VARCHAR(50),
  location    VARCHAR(255),
  entry       VARCHAR(100) DEFAULT 'Free',
  image_url   VARCHAR(500),
  icon        VARCHAR(10) DEFAULT '🎉',
  category    VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  recurrence  VARCHAR(150),
  attendance  INTEGER,
  gallery_event_id UUID REFERENCES gallery_events(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Programs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url   VARCHAR(500),
  schedule    VARCHAR(255),
  location    VARCHAR(255),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Departments & Ministries ───────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  leader_name VARCHAR(100),
  leader_role VARCHAR(150),
  image_url   VARCHAR(500),
  meeting_time VARCHAR(255),
  tags        VARCHAR(255),
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ministries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  leader_name VARCHAR(100),
  leader_role VARCHAR(150),
  image_url   VARCHAR(500),
  meeting_time VARCHAR(255),
  tags        VARCHAR(255),
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Leadership (Elders / Ministers / Choir Leaders) ────────
CREATE TABLE IF NOT EXISTS elders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) NOT NULL,
  position VARCHAR(150), biography TEXT, image_url VARCHAR(500),
  phone VARCHAR(30), email VARCHAR(255), is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ministers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) NOT NULL,
  position VARCHAR(150), biography TEXT, image_url VARCHAR(500),
  phone VARCHAR(30), email VARCHAR(255), is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS choir_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) NOT NULL,
  position VARCHAR(150), biography TEXT, image_url VARCHAR(500),
  phone VARCHAR(30), email VARCHAR(255), is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0
);

-- ── Gallery ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url   VARCHAR(500) NOT NULL,
  caption     VARCHAR(255),
  event_id    UUID REFERENCES gallery_events(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Testimonies ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  category   VARCHAR(50) NOT NULL DEFAULT 'general',
  testimony  TEXT NOT NULL,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Announcements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'info',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — read-only for everyone, no writes at all
-- (no policy is created for insert/update/delete, so with RLS
-- enabled those are blocked by default for every role)
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'website_settings','service_times','sermons','events','gallery_events',
    'programs','departments','ministries','elders','ministers','choir_leaders',
    'gallery','testimonies','announcements'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public read" ON %I', t);
    EXECUTE format('CREATE POLICY "public read" ON %I FOR SELECT USING (true)', t);
  END LOOP;
END $$;
-- Testimonies: only approved ones are publicly readable
DROP POLICY IF EXISTS "public read" ON testimonies;
CREATE POLICY "public read approved testimonies" ON testimonies FOR SELECT USING (approved = true);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA — carried over from your existing content
-- ═══════════════════════════════════════════════════════════

INSERT INTO service_times (name, day_label, time_label, icon, sort_order) VALUES
  ('Sunday Worship','Every Sunday','9:00 AM','🕊',1),
  ('Bible Study','Tuesdays','6:00 PM','📖',2),
  ('Gethsemane Hour','Wednesdays','11:00 AM','🙏',3),
  ('Achievers Hour','1st & 2nd Thursdays','6:30 PM','🔥',4);

INSERT INTO website_settings (key, value, type, label, section) VALUES
  ('church_name','Achievers Gospel Chapel','text','Church Name','general'),
  ('church_email','achieversgospelchurch@gmail.com','text','Church Email','contact'),
  ('church_phone','+232 76 618024','text','Church Phone','contact'),
  ('church_address','27 Davies Street, Kissy Shell Old Road, Freetown, Sierra Leone','text','Address','contact'),
  ('site_logo','assets/images/church-logo.jpeg','text','Site Logo','appearance'),
  ('theme_mauve','#9B7B9E','text','Primary Color','appearance'),
  ('theme_mauve_dark','#6B4E6E','text','Primary Dark','appearance'),
  ('theme_mauve_deep','#4A2D4E','text','Primary Deepest','appearance'),
  ('theme_gold','#C9A84C','text','Accent Color','appearance'),
  ('hero_title_prefix','Welcome to','text','Hero Title Line 1','hero'),
  ('hero_title_accent','Achievers Gospel Chapel','text','Hero Title Accent','hero'),
  ('hero_subtitle','More Than Conquerors — Through Him That Loved Us','text','Hero Subtitle','hero'),
  ('mission_text','Liberating Souls, Equipping The Saints And Standing Steadfast In The Faith','html','Mission','welcome'),
  ('vision_text','Building Lives And Shaping Destinies','html','Vision','welcome'),
  ('academy_name','Achievers Royal Academy','text','School Name','academy'),
  ('academy_tagline','Nurturing Minds, Building Character, Raising Achievers','html','Tagline','academy')
ON CONFLICT (key) DO NOTHING;

INSERT INTO programs (title, slug, description, is_active, sort_order) VALUES
  ('Medical Outreach','medical-outreach','Free medical care and health screenings for the community.',true,1),
  ('Intimacy Worship','intimacy-worship','A sacred gathering dedicated to deep, uninterrupted worship.',true,2),
  ('Ecclesiastes','ecclesiastes','An evening of poetry, drama, and artistic expression in worship.',true,3);

INSERT INTO elders (name, position, biography, image_url, sort_order) VALUES
  ('Elder Catherine Y. Yamba','Church Elder','A faithful servant of God who provides spiritual oversight and wisdom to the congregation.','assets/images/elder-catherine-yamba.jpg',1),
  ('Elder (Mrs.) Aldephine E. John','Eagles Dept. Supervisor & Missions Head','Dedicated to prayer, the Word, and the spiritual health of the entire congregation.','assets/images/elder-aldephine-john.jpg',2),
  ('Elder Moses Lansana','Head of Welfare Department','Brings years of experience and spiritual maturity to guide the church in difficult decisions.','assets/images/elder-moses-lansana.jpg',3);

INSERT INTO ministers (name, position, biography, image_url, sort_order) VALUES
  ('Min. Melvin A. Cole','Gethsemane Hour & Fire in My Bones Coordinator','Gifted in teaching and discipleship, serves the congregation with passion and dedication.','assets/images/min-melvin-cole.jpg',1),
  ('Min. Sylvanus Langley','Leader of Scholarship Trust Fund','Called to serve the community and empower members through education.','assets/images/min-sylvanus-langley.jpg',2),
  ('Rev. Desmond John','Supervisor — Men''s Department','A devoted man of God leading the Men''s Department with strength and purpose.','assets/images/rev-desmond-john.jpg',3),
  ('Rev. Paul Massaquoi','Supervisor of Evangelism & Missions Coordinator','Ordained to spread the gospel and lead evangelism across Sierra Leone.','assets/images/rev-paul-massaquoi.jpg',4),
  ('Min. Dr. Prestige B. M. Conteh','Leader of Eagles Dept & Head of Medical Committee','Dedicated to the spiritual and physical wellbeing of the congregation.','assets/images/prestige.jpeg',5);

INSERT INTO choir_leaders (name, position, biography, image_url, sort_order) VALUES
  ('Mr. Andrew Mayborn Arinze','Choral Ensemble Choir Master','Directs the Choral Assembly with excellence and passion for worship.','assets/images/mr-andrew-arinze.jpg',1),
  ('Ms. Christiana E. Gbabai','Choir Mistress — Achievers Gospel Choir','Leads the Achievers Gospel Choir with skill, dedication and a heart for God.','assets/images/ms-christiana-gbabai.jpg',2),
  ('Mr. Alicious Kamara','Choir Director — Achievers Gospel Choir','Brings out the best in the choir through musical excellence.','assets/images/mr-alicious-kamara.jpg',3);

INSERT INTO gallery_events (slug, title, description, icon, sort_order) VALUES
  ('anniversary','10th Anniversary Celebration','AGC@10 — A Decade of God''s Faithfulness','🎉',1),
  ('youth','Youth Programs','Chosen Generation — Raising a generation of faith and purpose','🔥',2),
  ('young-adults','Young Adult Thanksgiving','A celebration of gratitude and faith by the young adults of AGC','✨',3),
  ('first-sunday','First Sunday Service','Monthly First Sunday celebration services','🌟',4),
  ('community','Medical Outreach','Taking the love of God beyond the church walls','🌍',5),
  ('worship','Worship Services','Sunday Divine Services','🕊',6),
  ('intimacy','Intimacy Worship Night','An evening of deep worship, prayer and encounter with God','🎶',7),
  ('ecclesiastes','The Ecclesiastes','Poetry · Worship · Purpose','📜',8),
  ('academy','Achievers Royal Academy','Life at our Christian school','🎓',9);
