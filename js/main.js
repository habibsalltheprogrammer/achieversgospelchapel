'use strict';
// No backend anymore — every form submits straight to Formspree from the browser.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykqdwow'; // set this to your own Formspree form ID
const SUBJECT_MAP = {
  '/contact': 'Contact Form', '/prayer': 'Prayer Request', '/department': 'Ministry Registration',
  '/visit': 'Plan Your Visit', '/event-registration': 'Event Registration',
  '/testimony': 'Testimony Submission (needs manual approval in Supabase)', '/newsletter': 'Newsletter Signup',
};

async function postToAPI(endpoint, formEl, extra={}) {
  const body={};
  new FormData(formEl).forEach((v,k)=>{ body[k]=v; });
  Object.assign(body,extra);
  body._subject = `${SUBJECT_MAP[endpoint]||'Website Submission'} — ${body.name||'Someone'} — Achievers Gospel Chapel`;
  const res = await fetch(FORMSPREE_ENDPOINT, {
    method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(body)
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw Object.assign(new Error((data.errors&&data.errors[0]?.message)||'Submission failed'),{fields:null});
  return data;
}

// ── Validation ────────────────────────────────────────────
(function(){
  const s=document.createElement('style');
  s.textContent=`.agc-field-error{border-color:#e53e3e!important;box-shadow:0 0 0 2px rgba(229,62,62,.18)!important;background:#fff8f8!important}.agc-error-msg{color:#e53e3e;font-size:.75rem;font-weight:600;margin-top:.25rem;display:flex;align-items:center;gap:.3rem;animation:agcErrIn .2s ease}@keyframes agcErrIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.agc-error-msg::before{content:'⚠';font-size:.7rem}`;
  document.head.appendChild(s);
})();

function setFErr(f,msg){f.classList.add('agc-field-error');let e=f.parentElement.querySelector('.agc-error-msg');if(!e){e=document.createElement('div');e.className='agc-error-msg';f.parentElement.appendChild(e);}e.textContent=msg;}
function clrFErr(f){f.classList.remove('agc-field-error');const e=f.parentElement.querySelector('.agc-error-msg');if(e)e.remove();}

function validateField(f){
  const type=(f.type||'').toLowerCase(),name=(f.name||'').toLowerCase(),val=f.value.trim(),req=f.hasAttribute('required');
  clrFErr(f);
  if(f.tagName.toLowerCase()==='select'&&req&&!val){setFErr(f,'Please select an option');return false;}
  if(req&&!val){setFErr(f,'This field is required');return false;}
  if(val&&(type==='email'||name.includes('email'))&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)){setFErr(f,'Please enter a valid email address');return false;}
  if(val&&(type==='tel'||name.includes('phone'))&&!/^[\d\s\+\-\(\)\.]{7,20}$/.test(val)){setFErr(f,'Please enter a valid phone number');return false;}
  return true;
}

function validateForm(form){
  const fields=Array.from(form.querySelectorAll('input,textarea,select')).filter(f=>!['hidden','submit','button'].includes(f.type));
  let ok=true;
  fields.forEach(f=>{if(!validateField(f))ok=false;});
  if(!ok){const first=form.querySelector('.agc-field-error');if(first){first.focus();first.scrollIntoView({behavior:'smooth',block:'center'});}}
  return ok;
}

function applyServerErrors(form,fields){
  if(!Array.isArray(fields))return;
  fields.forEach(({field,message})=>{const el=form.querySelector(`[name="${field}"]`);if(el)setFErr(el,message);});
}

document.addEventListener('input',e=>{if(e.target.matches('input,textarea'))validateField(e.target);});
document.addEventListener('change',e=>{if(e.target.matches('select,input'))validateField(e.target);});

// ── Navbar ────────────────────────────────────────────────
const navbar=document.getElementById('navbar');
if(navbar){const fn=()=>navbar.classList.toggle('scrolled',window.scrollY>60);window.addEventListener('scroll',fn,{passive:true});fn();}
const navToggle=document.querySelector('.nav-toggle'),navLinks=document.querySelector('.nav-links');
if(navToggle&&navLinks){
  navToggle.addEventListener('click',()=>{const o=navLinks.classList.toggle('open');navToggle.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';});
  document.addEventListener('click',e=>{if(navbar&&!navbar.contains(e.target)){navLinks.classList.remove('open');document.body.style.overflow='';}});
  navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navLinks.classList.remove('open');document.body.style.overflow='';}));
}

// ── Fade animations ───────────────────────────────────────
const fadeEls=document.querySelectorAll('.fade-up');
if(fadeEls.length){const io=new IntersectionObserver((es)=>{es.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('visible'),i*80);io.unobserve(e.target);}});},{threshold:.12});fadeEls.forEach(el=>io.observe(el));}

// ── Form helper ───────────────────────────────────────────
function handleForm({formEl,endpoint,successFn,errorFn,extra={}}){
  const btn=formEl.querySelector('[type=submit]'),orig=btn?.textContent||'Submit';
  formEl.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!validateForm(formEl))return;
    if(btn){btn.disabled=true;btn.textContent='Sending…';}
    try{
      await postToAPI(endpoint,formEl,extra);
      formEl.reset();
      formEl.querySelectorAll('.agc-field-error').forEach(f=>f.classList.remove('agc-field-error'));
      formEl.querySelectorAll('.agc-error-msg').forEach(m=>m.remove());
      if(successFn)successFn();
    }catch(err){
      const hadFieldErrors = Array.isArray(err.fields) && err.fields.length > 0;
      if(hadFieldErrors) applyServerErrors(formEl,err.fields);
      if(errorFn) errorFn(err.message);
      else if(!hadFieldErrors) alert(err.message||'Something went wrong. Please try again.');
    }finally{if(btn){btn.disabled=false;btn.textContent=orig;}}
  });
}

// ── Prayer form ───────────────────────────────────────────
const prayerForm=document.getElementById('prayerForm');
if(prayerForm){const msg=document.getElementById('prayerMsg');handleForm({formEl:prayerForm,endpoint:'/prayer',successFn:()=>{if(msg){msg.style.display='block';msg.textContent='🙏 Your prayer request has been received. We are praying with you!';}},errorFn:()=>{if(msg){msg.style.display='block';msg.style.background='#fce4ec';msg.textContent='Something went wrong. Please try again.';}}});}

// ── Newsletter form ───────────────────────────────────────
const newsletterForm=document.getElementById('newsletterForm');
if(newsletterForm){const btn=newsletterForm.querySelector('[type=submit]');handleForm({formEl:newsletterForm,endpoint:'/newsletter',successFn:()=>{if(btn)btn.textContent='✓ Subscribed!';}});}

// ── Contact form ──────────────────────────────────────────
const contactForm=document.getElementById('contactForm');
if(contactForm){const msg=document.getElementById('contactMsg');handleForm({formEl:contactForm,endpoint:'/contact',successFn:()=>{if(msg)msg.style.display='block';}});}

// ── Academy inquiry form (pages/academy.html) ─────────────
const academyForm=document.getElementById('academyContactForm');
if(academyForm){const msg=document.getElementById('academyMsg');handleForm({formEl:academyForm,endpoint:'/contact',successFn:()=>{if(msg)msg.style.display='block';}});}

// ── Testimony form ────────────────────────────────────────
const testimonyForm=document.getElementById('testimonyForm');
if(testimonyForm){const msg=testimonyForm.nextElementSibling;handleForm({formEl:testimonyForm,endpoint:'/testimony',successFn:()=>{if(msg&&msg.classList.contains('success-msg'))msg.style.display='block';else alert('Thank you! Your testimony has been submitted for review.');}});}

// ── Dept/reg forms ────────────────────────────────────────
document.querySelectorAll('.reg-form').forEach(form=>{
  if(form.id==='testimonyForm')return;
  const btn=form.querySelector('[type=submit]'),msg=form.nextElementSibling,dept=btn?.dataset?.label||form.id||'Registration';
  // If the form already collects its own department (e.g. the unified
  // dropdown registration form), don't overwrite it with the button label.
  const hasOwnDeptField = !!form.querySelector('[name="department"]');
  const extra = hasOwnDeptField ? {} : {department:dept};
  handleForm({formEl:form,endpoint:form.dataset.endpoint||'/department',extra,successFn:()=>{if(msg&&msg.classList.contains('success-msg'))msg.style.display='block';else alert('Registration submitted! We will be in touch.');}});
});

// ── Visit form ────────────────────────────────────────────
const visitForm=document.getElementById('visitForm')||document.querySelector('form[data-form="visit"]');
if(visitForm){const msg=visitForm.nextElementSibling;handleForm({formEl:visitForm,endpoint:'/visit',successFn:()=>{if(msg&&msg.classList.contains('success-msg'))msg.style.display='block';else alert('Thank you! We look forward to seeing you.');}});}

// ── Counter animation ─────────────────────────────────────
function animCounter(el,target,dur=1800){let s=0;const step=target/(dur/16);const t=setInterval(()=>{s+=step;if(s>=target){s=target;clearInterval(t);}el.textContent=Math.floor(s).toLocaleString();},16);}
const ss=document.querySelector('.stats-section');
if(ss){const sio=new IntersectionObserver(es=>{if(es[0].isIntersecting){document.querySelectorAll('[data-count]').forEach(el=>animCounter(el,+el.dataset.count));sio.disconnect();}},{threshold:.4});sio.observe(ss);}

// ── Active nav ────────────────────────────────────────────
const cp=window.location.pathname.split('/').pop()||'index.html';
document.querySelectorAll('.nav-links a').forEach(a=>{if(a.getAttribute('href')?.split('/').pop()===cp)a.style.color='var(--gold-light)';});

// ── Lightbox ──────────────────────────────────────────────
(function(){
  const ANIMS=['agc-anim-zoom','agc-anim-slide-left','agc-anim-slide-right','agc-anim-flip','agc-anim-bounce'];
  const s=document.createElement('style');
  s.textContent=`.agc-lb{position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:lbFade .25s ease}@keyframes lbFade{from{opacity:0}to{opacity:1}}.agc-lb-img{max-width:90vw;max-height:88vh;border-radius:12px;object-fit:contain;box-shadow:0 30px 80px rgba(0,0,0,.8)}.agc-lb-close{position:absolute;top:1.2rem;right:1.4rem;font-size:2rem;color:#fff;cursor:pointer;background:rgba(255,255,255,.15);border:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:.2s}.agc-lb-close:hover{background:rgba(255,255,255,.3);transform:scale(1.1) rotate(90deg)}.agc-lb-counter{position:absolute;bottom:1.2rem;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.15);color:#fff;border-radius:50px;padding:.4rem 1.2rem;font-size:.85rem}.agc-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);border:none;color:#fff;font-size:2rem;width:52px;height:52px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s}.agc-lb-nav:hover{background:rgba(255,255,255,.3);transform:translateY(-50%) scale(1.1)}.agc-lb-prev{left:1rem}.agc-lb-next{right:1rem}@keyframes agc-anim-zoom{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}@keyframes agc-anim-slide-left{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}@keyframes agc-anim-slide-right{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}@keyframes agc-anim-flip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:perspective(600px) rotateY(0)}}@keyframes agc-anim-bounce{0%{opacity:0;transform:scale(.3)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}.agc-anim-zoom{animation:agc-anim-zoom .4s ease forwards}.agc-anim-slide-left{animation:agc-anim-slide-left .4s ease forwards}.agc-anim-slide-right{animation:agc-anim-slide-right .4s ease forwards}.agc-anim-flip{animation:agc-anim-flip .4s ease forwards}.agc-anim-bounce{animation:agc-anim-bounce .5s ease forwards}`;
  document.head.appendChild(s);
  let items=[],idx=0,tx=0,lb=null,onKey;
  function close(){if(lb){lb.remove();lb=null;}document.body.style.overflow='';document.removeEventListener('keydown',onKey);}
  function show(i,dir){idx=((i%items.length)+items.length)%items.length;const img=lb.querySelector('.agc-lb-img');img.classList.remove(...ANIMS);void img.offsetWidth;img.classList.add(dir==='prev'?ANIMS[(idx+3)%ANIMS.length]:ANIMS[idx%ANIMS.length]);img.src=items[idx].querySelector('img').src;lb.querySelector('.agc-lb-counter').textContent=`${idx+1} / ${items.length}`;}
  document.addEventListener('click',e=>{
    const item=e.target.closest('.masonry-item,.gallery-item,.program-gallery-item,.photo-card');
    if(!item)return;const img=item.querySelector('img');if(!img||!img.src||img.style.display==='none')return;
    const con=item.closest('.masonry,.photo-grid,.program-gallery')||document;
    items=Array.from(con.querySelectorAll('.masonry-item,.gallery-item,.program-gallery-item,.photo-card')).filter(el=>el.querySelector('img')?.src);
    if(!items.length)items=[item];idx=items.indexOf(item);if(idx<0)idx=0;
    lb=document.createElement('div');lb.className='agc-lb';
    lb.innerHTML=`<button class="agc-lb-close">&times;</button><button class="agc-lb-nav agc-lb-prev">&#8249;</button><img class="agc-lb-img ${ANIMS[idx%ANIMS.length]}" src="${img.src}" alt=""><button class="agc-lb-nav agc-lb-next">&#8250;</button><div class="agc-lb-counter">${idx+1} / ${items.length}</div>`;
    lb.querySelector('.agc-lb-close').onclick=close;
    lb.querySelector('.agc-lb-prev').onclick=e=>{e.stopPropagation();show(idx-1,'prev');};
    lb.querySelector('.agc-lb-next').onclick=e=>{e.stopPropagation();show(idx+1,'next');};
    lb.addEventListener('click',e=>{if(e.target===lb)close();});
    lb.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
    lb.addEventListener('touchend',e=>{const d=tx-e.changedTouches[0].clientX;if(Math.abs(d)>50)show(idx+(d>0?1:-1),d>0?'next':'prev');},{passive:true});
    onKey=e=>{if(e.key==='ArrowRight')show(idx+1,'next');if(e.key==='ArrowLeft')show(idx-1,'prev');if(e.key==='Escape')close();};
    document.addEventListener('keydown',onKey);document.body.appendChild(lb);document.body.style.overflow='hidden';
  });
})();

// ── Sermon search ─────────────────────────────────────────
const ss2=document.getElementById('sermonSearch');
if(ss2)ss2.addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.sermon-card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(q)?'':'none';});});

// ── Back to top ───────────────────────────────────────────
const btt=document.getElementById('backToTop');
if(btt){window.addEventListener('scroll',()=>{btt.style.display=window.scrollY>400?'flex':'none';},{passive:true});btt.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));}

// ── Cookie banner ─────────────────────────────────────────
(function(){const b=document.getElementById('cookieBanner');if(!b||localStorage.getItem('agc_cookie_consent'))return;setTimeout(()=>{b.style.display='flex';},1500);})();
window.acceptCookies=()=>{localStorage.setItem('agc_cookie_consent','accepted');document.getElementById('cookieBanner').style.display='none';};
window.declineCookies=()=>{localStorage.setItem('agc_cookie_consent','declined');document.getElementById('cookieBanner').style.display='none';};
