'use strict';
/**
 * site-content.js — the ONE script that loads all database-backed content
 * on every page, using the Supabase client (window.sb, set up in
 * supabase-client.js). Every function below guards on whether its target
 * elements exist, so one file safely covers every page. Fails safe
 * everywhere: if a query errors or returns nothing, whatever static
 * content is already in the HTML is left alone.
 */
(function () {
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function revealFadeUp(container) {
    container.querySelectorAll('.fade-up').forEach((el) => el.classList.add('visible'));
  }
  function resolveAssetPath(value) {
    if (!value || value.startsWith('http') || value.startsWith('../') || value.startsWith('/')) return value;
    return location.pathname.includes('/pages/') ? `../${value}` : value;
  }
  function formatLong(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return ''; }
  }

  if (!window.sb) {
    console.warn('Supabase client not found — did supabase-client.js load before this script?');
    return;
  }
  const sb = window.sb;

  // ── 1. Settings: theme colors, logo, and any [data-cms-key] text ──
  async function applySettings() {
    const { data, error } = await sb.from('website_settings').select('key,value');
    if (error || !data) return;
    const settings = {};
    data.forEach((r) => { settings[r.key] = r.value; });

    const THEME_VARS = { theme_mauve:'--mauve', theme_mauve_dark:'--mauve-dark', theme_mauve_deep:'--mauve-deep',
      theme_mauve_light:'--mauve-light', theme_gold:'--gold', theme_gold_light:'--gold-light', theme_gold_dark:'--gold-dark' };
    const root = document.documentElement;
    Object.entries(THEME_VARS).forEach(([key, cssVar]) => {
      const v = settings[key];
      if (v && /^#[0-9a-fA-F]{6}$/.test(v.trim())) root.style.setProperty(cssVar, v.trim());
    });

    if (settings.site_logo) {
      document.querySelectorAll('.nav-logo img').forEach((img) => { img.src = resolveAssetPath(settings.site_logo); });
    }

    document.querySelectorAll('[data-cms-key]').forEach((el) => {
      const value = settings[el.dataset.cmsKey];
      if (value == null || value === '') return;
      if (el.hasAttribute('data-cms-strip-label') && value.includes('—')) {
        el.textContent = value.split('—').pop().trim();
      } else if (el.hasAttribute('data-cms-html')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
    document.querySelectorAll('[data-cms-src]').forEach((el) => {
      const value = settings[el.dataset.cmsSrc];
      if (value) { el.src = resolveAssetPath(value); if (el.hasAttribute('data-cms-reveal')) el.style.display = ''; }
    });
  }

  // ── 2. Announcement banner ─────────────────────────────────
  function dismissedIds() {
    try { return JSON.parse(sessionStorage.getItem('agc_dismissed_announcements') || '[]'); } catch { return []; }
  }
  window.__dismissAgcAnnouncement = function (id) {
    const ids = dismissedIds(); if (!ids.includes(id)) ids.push(id);
    try { sessionStorage.setItem('agc_dismissed_announcements', JSON.stringify(ids)); } catch {}
    document.getElementById('agcAnnouncementBar')?.remove();
  };
  async function loadAnnouncement() {
    const TYPE_STYLE = {
      info: { bg:'linear-gradient(90deg,var(--mauve-deep),var(--mauve-dark))', icon:'ℹ️' },
      event:{ bg:'linear-gradient(90deg,var(--gold-dark),var(--gold))', icon:'📅' },
      warning:{ bg:'linear-gradient(90deg,#8a6d1f,#b8901f)', icon:'⚠️' },
      urgent:{ bg:'linear-gradient(90deg,#7a1f1f,#a83232)', icon:'🚨' },
    };
    const { data } = await sb.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (!data || !data.length) return;
    const now = new Date();
    const seen = dismissedIds();
    const active = data.filter((a) => {
      if (seen.includes(a.id)) return false;
      if (a.starts_at && new Date(a.starts_at) > now) return false;
      if (a.ends_at && new Date(a.ends_at) < now) return false;
      return true;
    });
    if (!active.length) return;
    const next = active[0];
    const style = TYPE_STYLE[next.type] || TYPE_STYLE.info;
    const bar = document.createElement('div');
    bar.id = 'agcAnnouncementBar';
    bar.setAttribute('role', 'status');
    bar.style.cssText = `background:${style.bg};color:#fff;font-size:0.85rem;padding:0.65rem 1rem;text-align:center;position:relative;display:flex;align-items:center;justify-content:center;gap:0.6rem;flex-wrap:wrap;`;
    bar.innerHTML = `<span>${style.icon}</span><strong>${esc(next.title)}</strong><span style="opacity:0.9;">${esc(next.content)}</span>
      <button onclick="__dismissAgcAnnouncement('${next.id}')" aria-label="Dismiss" style="position:absolute;right:0.8rem;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:1.1rem;cursor:pointer;">×</button>`;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ── 3. Homepage: programs, upcoming events, testimonies ────
  const PROGRAM_META = { 'medical-outreach':{icon:'🏥',tag:'Outreach'}, 'intimacy-worship':{icon:'🎶',tag:'Worship'}, 'ecclesiastes':{icon:'📜',tag:'Arts'} };
  async function applyHomePrograms() {
    const grid = document.querySelector('.programs-grid');
    if (!grid) return;
    const { data } = await sb.from('programs').select('*').eq('is_active', true).order('sort_order');
    if (!data || !data.length) return;
    grid.innerHTML = data.map((p) => {
      const meta = PROGRAM_META[p.slug] || { icon:'⭐', tag:'Program' };
      return `<article class="program-card fade-up"><div class="program-img">
        ${p.image_url ? `<img src="${esc(resolveAssetPath(p.image_url))}" style="width:100%;height:100%;object-fit:cover;">` : `<div class="program-img-ph">${meta.icon}</div>`}
        <div class="program-overlay"></div><span class="program-tag">${esc(meta.tag)}</span>
        <div class="program-info"><h3>${esc(p.title)}</h3><p>${esc(p.description||'')}</p>
        <a href="pages/programs.html" class="btn btn-primary" style="font-size:0.82rem;padding:0.6rem 1.4rem;">Learn More</a></div>
      </div></article>`;
    }).join('');
    revealFadeUp(grid);
  }
  async function applyHomeEvents() {
    const grid = document.querySelector('.events-grid');
    if (!grid) return;
    const { data } = await sb.from('events').select('*').eq('is_active', true).eq('category', 'upcoming')
      .gte('event_date', new Date().toISOString().slice(0,10)).order('event_date').limit(3);
    if (!data || !data.length) return;
    grid.innerHTML = data.map((e) => `<article class="event-card fade-up">
      <div class="event-img"><div style="width:100%;height:100%;background:linear-gradient(160deg,var(--mauve-deep),var(--mauve-dark));display:flex;align-items:center;justify-content:center;font-size:3rem;">${esc(e.icon||'🎉')}</div></div>
      <div class="event-body"><h4>${esc(e.title)}</h4><p>${esc(e.description||'')}</p>
        <div class="event-meta"><span>⏰ ${esc(e.event_time||'TBA')}</span><span>📍 ${esc(e.location||'TBA')}</span></div>
        <a href="pages/events.html" class="btn btn-mauve" style="font-size:0.82rem;padding:0.6rem 1.4rem;">Details</a></div>
    </article>`).join('');
    revealFadeUp(grid);
  }
  async function applyHomeTestimonies() {
    const grid = document.querySelector('.testimonials-grid');
    if (!grid) return;
    const { data } = await sb.from('testimonies').select('*').order('created_at', { ascending: false }).limit(3);
    if (!data || !data.length) return;
    grid.innerHTML = data.map((t) => `<article class="testimonial-card fade-up"><div class="quote-icon">"</div><p>${esc(t.testimony)}</p>
      <div class="testimony-author"><div class="author-avatar">${esc((t.name||'?').trim()[0]||'?').toUpperCase()}</div>
      <div class="author-info"><div class="name">${esc(t.name)}</div><div class="category">${esc(t.category||'Testimony')}</div></div></div>
    </article>`).join('');
    revealFadeUp(grid);
  }

  // ── 4. Leadership page: pastors (via settings), elders, ministers, choir ──
  function personCard(p) {
    return `<article class="elder-card fade-up"><div class="elder-ph" style="padding:0;">
      ${p.image_url ? `<img src="${esc(resolveAssetPath(p.image_url))}" style="width:100%;height:200px;object-fit:cover;" onerror="this.style.display='none'">` : ''}
      </div><div class="elder-body"><h4>${esc(p.name)}</h4><span class="elder-role">${esc(p.position||'')}</span>
      <p>${esc(p.biography||'')}</p><a href="contact.html" class="btn btn-outline mt-1" style="font-size:0.78rem;padding:0.5rem 1.2rem;">Contact</a></div>
    </article>`;
  }
  async function applyLeadershipGrid(table, selector) {
    const grid = document.querySelector(selector);
    if (!grid) return;
    const { data } = await sb.from(table).select('*').eq('is_active', true).order('sort_order');
    if (!data || !data.length) return;
    grid.innerHTML = data.map(personCard).join('');
    revealFadeUp(grid);
  }

  // ── 5. Sermons page ─────────────────────────────────────────
  const TYPE_ICON = { video:'▶', audio:'🎵', notes:'📝' };
  const TYPE_GRADIENT = { video:'linear-gradient(160deg,var(--mauve-deep),#6B4E6E)', audio:'linear-gradient(160deg,var(--gold-dark),var(--gold))', notes:'linear-gradient(160deg,var(--mauve),var(--mauve-dark))' };
  async function applySermons() {
    const grid = document.querySelector('.sermons-grid');
    if (!grid) return;
    const { data } = await sb.from('sermons').select('*').eq('is_active', true).order('sermon_date', { ascending: false });
    if (!data || !data.length) return;
    grid.innerHTML = data.map((s) => {
      const type = s.sermon_type || 'video';
      const thumb = s.thumbnail_url ? `<img src="${esc(resolveAssetPath(s.thumbnail_url))}" style="width:100%;height:100%;object-fit:cover;">` : `<div class="play-btn">${TYPE_ICON[type]||'▶'}</div>`;
      const links = [
        s.video_url ? `<a href="${esc(s.video_url)}" target="_blank" rel="noopener" class="btn btn-mauve" style="font-size:0.78rem;padding:0.45rem 1rem;">▶ Watch</a>` : '',
        s.facebook_url ? `<a href="${esc(s.facebook_url)}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:0.78rem;padding:0.45rem 1rem;">f Facebook</a>` : '',
        s.audio_url ? `<a href="${esc(s.audio_url)}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:0.78rem;padding:0.45rem 1rem;">🎵 Listen</a>` : '',
        s.notes_url ? `<a href="${esc(s.notes_url)}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:0.78rem;padding:0.45rem 1rem;">📝 Notes</a>` : '',
      ].filter(Boolean).join('');
      return `<article class="sermon-card fade-up" data-type="${esc(type)}">
        <div class="sermon-thumb" style="background:${TYPE_GRADIENT[type]||TYPE_GRADIENT.video};">${thumb}<span class="sermon-type-badge">${type.charAt(0).toUpperCase()+type.slice(1)}</span></div>
        <div class="sermon-body"><h4>${esc(s.title)}</h4>
        <div class="sermon-meta">${s.sermon_date?`<span>📅 ${formatLong(s.sermon_date)}</span>`:''}${s.preacher?`<span>👤 ${esc(s.preacher)}</span>`:''}</div>
        ${s.scripture_ref?`<blockquote class="sermon-scripture">${esc(s.scripture_ref)}</blockquote>`:''}
        <div class="sermon-actions">${links}</div></div></article>`;
    }).join('');
    revealFadeUp(grid);
  }

  // ── 6. Events page: Upcoming / Ongoing / Past tabs ─────────
  const EVENT_EMPTY = { upcoming:'No upcoming events right now — check back soon.', ongoing:'Nothing ongoing has been listed yet.', past:'No past events have been added yet.' };
  function eventCard(e, category) {
    const dateLong = formatLong(e.event_date);
    const hero = e.image_url
      ? `<div class="event-hero-img" style="background-image:url('${esc(resolveAssetPath(e.image_url))}');background-size:cover;background-position:center;"></div>`
      : `<div class="event-hero-img" style="background:${category==='past'?'linear-gradient(160deg,#555,#777)':'linear-gradient(160deg,var(--mauve),var(--mauve-deep))'};">${esc(e.icon||'🎉')}</div>`;
    if (category === 'ongoing') {
      return `<article class="event-full-card fade-up">${hero}<div class="event-full-body"><h3>${esc(e.title)}</h3><p>${esc(e.description||'')}</p>
        <div class="event-info-grid">${e.recurrence?`<div class="event-info-item"><div class="label">Day</div><div class="value">${esc(e.recurrence)}</div></div>`:''}${e.event_time?`<div class="event-info-item"><div class="label">Time</div><div class="value">${esc(e.event_time)}</div></div>`:''}</div>
        <a href="contact.html" class="btn btn-mauve" style="width:100%;display:block;text-align:center;">Join This Week</a></div></article>`;
    }
    if (category === 'past') {
      return `<article class="event-full-card past-card fade-up">${hero}<div class="event-full-body"><h3>${esc(e.title)}</h3><p>${esc(e.description||'')}</p>
        <div class="event-info-grid">${e.event_date?`<div class="event-info-item"><div class="label">Date</div><div class="value">${dateLong}</div></div>`:''}${e.attendance?`<div class="event-info-item"><div class="label">Attendance</div><div class="value">${esc(e.attendance)}+</div></div>`:''}</div>
        ${e.gallery_event_id?`<a href="gallery.html" class="btn btn-outline" style="width:100%;display:block;text-align:center;">View Gallery</a>`:''}</div></article>`;
    }
    return `<article class="event-full-card fade-up">${hero}<div class="event-full-body"><h3>${esc(e.title)}</h3><p>${esc(e.description||'')}</p>
      <div class="event-info-grid">${e.event_date?`<div class="event-info-item"><div class="label">Date</div><div class="value">${dateLong}</div></div>`:''}${e.event_time?`<div class="event-info-item"><div class="label">Time</div><div class="value">${esc(e.event_time)}</div></div>`:''}${e.location?`<div class="event-info-item"><div class="label">Location</div><div class="value">${esc(e.location)}</div></div>`:''}<div class="event-info-item"><div class="label">Entry</div><div class="value">${esc(e.entry||'Free')}</div></div></div>
      <button class="btn btn-mauve" style="width:100%;" onclick="openModal('${esc(e.title).replace(/'/g,"\\'")}', '${dateLong.replace(/'/g,"\\'")}')">Register Now</button></div></article>`;
  }
  async function applyEventsPage() {
    if (!document.getElementById('panel-upcoming')) return;
    const { data } = await sb.from('events').select('*').eq('is_active', true).order('event_date');
    const byCat = { upcoming:[], ongoing:[], past:[] };
    (data||[]).forEach((e) => { (byCat[e.category]||byCat.upcoming).push(e); });
    ['upcoming','ongoing','past'].forEach((cat) => {
      const panel = document.getElementById(`panel-${cat}`);
      if (!panel) return;
      if (!byCat[cat].length) { panel.innerHTML = `<p class="events-empty-state" style="text-align:center;color:var(--text-light);padding:3rem 1rem;grid-column:1/-1;">${EVENT_EMPTY[cat]}</p>`; return; }
      panel.innerHTML = byCat[cat].map((e) => eventCard(e, cat)).join('');
      revealFadeUp(panel);
    });
  }

  // ── 7. Gallery: top strip + accordion, Academy: its own grid ──
  async function applyGalleryStrip() {
    const grid = document.getElementById('glimpseGrid');
    if (!grid) return;
    const { data } = await sb.from('gallery').select('*').eq('is_active', true).is('event_id', null).order('sort_order').limit(24);
    if (!data || !data.length) return;
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    grid.innerHTML = data.map((p) => `<div style="overflow:hidden;border-radius:12px;aspect-ratio:1;"><img src="${esc(resolveAssetPath(p.image_url))}" alt="${esc(p.caption||'')}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></div>`).join('');
  }
  async function applyGalleryAccordion() {
    const container = document.getElementById('galleryAccordion');
    if (!container) return;
    const { data: events } = await sb.from('gallery_events').select('*').eq('is_active', true).order('sort_order');
    if (!events || !events.length) return;
    const { data: photos } = await sb.from('gallery').select('*').not('event_id', 'is', null).eq('is_active', true).order('sort_order');
    events.forEach((ev) => {
      if (ev.slug === 'academy') return; // Academy photos live on the Academy page only
      const evPhotos = (photos||[]).filter((p) => p.event_id === ev.id);
      if (!evPhotos.length) return;
      const previews = evPhotos.slice(0,3).map((p) => `<img src="${esc(resolveAssetPath(p.image_url))}" alt="" loading="lazy">`).join('');
      const strip = evPhotos.slice(0,5).map((p) => `<img src="${esc(resolveAssetPath(p.image_url))}" style="width:100%;height:80px;object-fit:cover;" loading="lazy">`).join('');
      const full = evPhotos.map((p) => `<div class="photo-card"><img loading="lazy" src="${esc(resolveAssetPath(p.image_url))}" alt="${esc(p.caption||'')}"><div class="photo-overlay">🔍</div></div>`).join('');
      const html = `<div class="gallery-event" data-event="${esc(ev.slug)}" data-dynamic="1">
        <div class="gallery-event-header"><div class="gallery-event-icon">${esc(ev.icon||'📷')}</div>
          <div class="gallery-event-info"><h3>${esc(ev.title)}</h3><p>${esc(ev.description||'')}</p></div>
          <div class="gallery-event-previews">${previews}</div>
          <div class="gallery-event-meta"><span class="gallery-event-count">${evPhotos.length} Photo${evPhotos.length===1?'':'s'}</span><div class="gallery-event-chevron">▾</div></div>
        </div>
        <div class="gallery-event-body"><div class="gallery-event-divider"></div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;margin-bottom:1rem;border-radius:10px;overflow:hidden;">${strip}</div>
          <div class="photo-grid">${full}</div>
        </div></div>`;
      const existing = container.querySelector(`.gallery-event[data-event="${ev.slug}"]`);
      if (existing) existing.outerHTML = html; else container.insertAdjacentHTML('beforeend', html);
    });
    document.querySelectorAll('.gallery-event[data-dynamic="1"] .gallery-event-header').forEach((header) => {
      if (header.dataset.bound) return;
      header.dataset.bound = '1';
      header.addEventListener('click', () => {
        const eventEl = header.parentElement;
        const isOpen = eventEl.classList.contains('open');
        document.querySelectorAll('.gallery-event').forEach((e) => e.classList.remove('open'));
        if (!isOpen) { eventEl.classList.add('open'); setTimeout(() => eventEl.scrollIntoView({behavior:'smooth',block:'nearest'}), 50); }
      });
    });
  }
  async function applyAcademyGallery() {
    const grid = document.getElementById('academyGalleryGrid');
    if (!grid) return;
    const { data: academyEvent } = await sb.from('gallery_events').select('id').eq('slug', 'academy').single();
    if (!academyEvent) return;
    const { data: photos } = await sb.from('gallery').select('*').eq('event_id', academyEvent.id).eq('is_active', true).order('sort_order');
    if (!photos || !photos.length) return;
    grid.innerHTML = photos.map((p) => `<a href="${esc(resolveAssetPath(p.image_url))}" target="_blank" rel="noopener" style="display:block;overflow:hidden;border-radius:12px;aspect-ratio:1;"><img src="${esc(resolveAssetPath(p.image_url))}" alt="${esc(p.caption||'')}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></a>`).join('');
  }

  // ── 8. Department/Ministry registration dropdown ───────────
  async function mergeDeptDropdown() {
    const select = document.getElementById('unifiedDept');
    if (!select) return;
    const existing = new Set(Array.from(select.options).map((o) => o.textContent.trim()));
    const [{ data: depts }, { data: mins }] = await Promise.all([
      sb.from('departments').select('name').eq('is_active', true),
      sb.from('ministries').select('name').eq('is_active', true),
    ]);
    [...(depts||[]), ...(mins||[])].forEach((r) => {
      if (r.name && !existing.has(r.name.trim())) {
        const opt = document.createElement('option'); opt.textContent = r.name; select.appendChild(opt); existing.add(r.name.trim());
      }
    });
  }

  function init() {
    applySettings();
    loadAnnouncement();
    applyHomePrograms();
    applyHomeEvents();
    applyHomeTestimonies();
    applyLeadershipGrid('elders', '#eldersGrid');
    applyLeadershipGrid('ministers', '#ministersGrid');
    applyLeadershipGrid('choir_leaders', '#choirGrid');
    applySermons();
    applyEventsPage();
    applyGalleryStrip();
    applyGalleryAccordion();
    applyAcademyGallery();
    mergeDeptDropdown();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
