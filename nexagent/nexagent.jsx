import { useState, useEffect, useRef, useMemo } from 'react'

/* ============================================================
   NexAgent — Single-File Artifact-Version
   Komplette Website in EINER Datei. Läuft direkt als Claude-
   Artifact, ohne Backend:
   · NEXA-Chat antwortet aus lokalem Wissen (kein API-Key nötig)
   · Kontaktformular + Chat-Eskalation speichern in localStorage
   · Internes Dashboard (#intern) liest genau diese Anfragen
   Design v6 „Editorial Premium": Serif-Display + Twilight-Hero.
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');

.nx * { box-sizing: border-box; }
.nx {
  --paper:#FAF8F4; --paper-soft:#F3EFE8; --ink:#17191E; --ink-soft:#555D68;
  --ink-faint:#8A9099; --line:#E7E1D6; --card:#FFFFFF;
  --amber:#C7821F; --amber-bright:#F5A623; --navy:#10151F; --green:#3E9E68; --red:#C33C41;
  --fd:'Instrument Serif',Georgia,serif; --ft:'Instrument Sans',system-ui,sans-serif;
  --fm:'JetBrains Mono',ui-monospace,monospace;
  --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:72px;--s9:112px;
  --r:14px; --rl:22px; --pill:999px; --cont:1120px;
  --sh:0 2px 8px rgba(23,25,30,.05),0 16px 48px rgba(23,25,30,.07);
  --shl:0 4px 12px rgba(23,25,30,.08),0 24px 64px rgba(23,25,30,.12);
  --ez:cubic-bezier(.22,1,.36,1);
  margin:0; background:var(--paper); color:var(--ink);
  font-family:var(--ft); font-size:16px; line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
.nx ::selection { background:var(--amber-bright); color:var(--navy); }
.nx h1,.nx h2,.nx h3 { font-family:var(--fd); font-weight:400; line-height:1.08; margin:0; letter-spacing:.005em; }
.nx h4 { margin:0; }
.nx p { margin:0; }
.nx a { color:inherit; }
.nx button { font:inherit; cursor:pointer; }
.nx :focus-visible { outline:2px solid var(--amber); outline-offset:3px; border-radius:4px; }
.nx .container { max-width:var(--cont); margin:0 auto; padding:0 var(--s5); }
.nx .mono { font-family:var(--fm); font-size:.8125rem; }

.nx .btn { display:inline-flex; align-items:center; justify-content:center; gap:var(--s2);
  min-height:52px; padding:0 var(--s6); border-radius:var(--pill); border:1px solid transparent;
  font-weight:600; font-size:1rem; text-decoration:none;
  transition:transform .2s var(--ez),box-shadow .2s var(--ez),background .2s var(--ez),border-color .2s var(--ez); }
.nx .btn:hover { transform:translateY(-1px); }
.nx .btn:active { transform:scale(.985); }
.nx .btn-primary { background:var(--ink); color:var(--paper); box-shadow:var(--sh); }
.nx .btn-primary:hover { background:#000; box-shadow:var(--shl); }
.nx .btn-light { background:rgba(250,248,244,.96); color:var(--ink); box-shadow:0 8px 32px rgba(0,0,0,.35); }
.nx .btn-light:hover { background:#fff; }
.nx .btn-outline-light { background:rgba(255,255,255,.06); color:rgba(255,255,255,.94);
  border-color:rgba(255,255,255,.32); backdrop-filter:blur(8px); }
.nx .btn-outline-light:hover { border-color:rgba(255,255,255,.7); background:rgba(255,255,255,.1); }
.nx .btn-ghost { background:transparent; color:var(--ink); border-color:rgba(23,25,30,.22); }
.nx .btn-ghost:hover { border-color:var(--ink); }
.nx .btn-sm { min-height:42px; padding:0 var(--s5); font-size:.9375rem; }

.nx .section { padding:var(--s9) 0; scroll-margin-top:72px; }
.nx .section-head { max-width:620px; margin-bottom:var(--s8); }
.nx .kicker { font-size:.8125rem; text-transform:uppercase; letter-spacing:.18em;
  font-weight:600; color:var(--amber); margin-bottom:var(--s4); }
.nx .section-head h2 { font-size:clamp(2.1rem,4.5vw,3.1rem); margin-bottom:var(--s4); }
.nx .section-head h2 em { font-style:italic; }
.nx .section-head p { color:var(--ink-soft); font-size:1.0938rem; }
.nx .reveal { opacity:0; transform:translateY(24px); transition:opacity .7s var(--ez),transform .7s var(--ez); }
.nx .reveal.in { opacity:1; transform:none; }

.nx .nav { position:fixed; inset:0 0 auto 0; z-index:100; color:#fff; border-bottom:1px solid transparent;
  transition:background .3s var(--ez),border-color .3s var(--ez),color .3s var(--ez); }
.nx .nav.scrolled { background:rgba(250,248,244,.88); backdrop-filter:blur(16px);
  color:var(--ink); border-bottom-color:var(--line); }
.nx .nav-inner { display:flex; align-items:center; justify-content:space-between; height:72px; }
.nx .logo { display:flex; align-items:center; gap:var(--s3); font-family:var(--fd);
  font-size:1.375rem; text-decoration:none; letter-spacing:.01em; }
.nx .logo-mark { width:13px; height:13px; background:var(--amber-bright); transform:rotate(45deg);
  border-radius:2px; flex:none; }
.nx .nav.scrolled .logo-mark { background:var(--amber); }
.nx .nav-links { display:flex; align-items:center; gap:var(--s6); }
.nx .nav-links a:not(.btn-nav) { text-decoration:none; opacity:.82; font-size:.9375rem;
  font-weight:500; transition:opacity .15s var(--ez); }
.nx .nav-links a:not(.btn-nav):hover { opacity:1; }
.nx .btn-nav { min-height:42px; padding:0 var(--s5); font-size:.9375rem; border-radius:var(--pill);
  background:rgba(250,248,244,.95); color:var(--ink); text-decoration:none; display:inline-flex;
  align-items:center; font-weight:600; transition:background .2s var(--ez),color .2s var(--ez); }
.nx .nav.scrolled .btn-nav { background:var(--ink); color:var(--paper); }
@media (max-width:720px){ .nx .nav-links a:not(.btn-nav){ display:none; } }

.nx .hero { position:relative; min-height:100svh; display:flex; flex-direction:column;
  justify-content:center; align-items:center; text-align:center; padding:140px var(--s5) var(--s8);
  overflow:hidden; color:#fff; }
.nx .hero-sky { position:absolute; inset:0; z-index:0; background:
  radial-gradient(120% 85% at 50% 118%, rgba(245,166,35,.55) 0%, rgba(216,121,41,.32) 26%, rgba(120,82,60,.12) 46%, transparent 64%),
  radial-gradient(90% 60% at 78% 108%, rgba(255,196,110,.35) 0%, transparent 55%),
  radial-gradient(70% 50% at 18% 96%, rgba(196,116,46,.28) 0%, transparent 60%),
  linear-gradient(180deg,#070A12 0%,#0C1220 34%,#17202F 58%,#2C3245 76%,#4A4150 88%,#6E5344 100%); }
.nx .hero-sky::before,.nx .hero-sky::after { content:""; position:absolute; inset:-20%; background:
  radial-gradient(42% 30% at 30% 62%, rgba(245,166,35,.12), transparent 70%),
  radial-gradient(36% 26% at 72% 48%, rgba(140,160,220,.1), transparent 70%);
  animation:nxdrift 26s ease-in-out infinite alternate; }
.nx .hero-sky::after { animation-duration:34s; animation-direction:alternate-reverse; }
@keyframes nxdrift { from{transform:translate3d(-2.5%,-1.5%,0) scale(1);} to{transform:translate3d(2.5%,2%,0) scale(1.06);} }
.nx .hero-horizon { position:absolute; left:0; right:0; bottom:0; height:130px; z-index:1; opacity:.85; }
.nx .hero-horizon svg { width:100%; height:100%; display:block; }
.nx .hero .container { position:relative; z-index:2; }
.nx .hero-kicker { font-size:.8125rem; text-transform:uppercase; letter-spacing:.22em; font-weight:500;
  color:rgba(255,255,255,.72); margin-bottom:var(--s5); }
.nx .hero h1 { font-size:clamp(2.6rem,6vw,4.6rem); max-width:24ch; margin:0 auto var(--s5);
  text-shadow:0 2px 40px rgba(0,0,0,.35); }
.nx .hero h1 em { font-style:italic; color:#FFD9A0; }
.nx .hero-sub { color:rgba(255,255,255,.82); font-size:clamp(1.0625rem,1.6vw,1.25rem);
  max-width:560px; margin:0 auto var(--s7); }
.nx .hero-sub strong { color:#fff; font-weight:600; }
.nx .hero-actions { display:flex; gap:var(--s4); justify-content:center; flex-wrap:wrap; margin-bottom:var(--s6); }
.nx .hero-note { font-size:.875rem; color:rgba(255,255,255,.55); }

.nx .monitor { width:min(680px,100%); margin:var(--s7) auto 0; text-align:left;
  background:rgba(16,20,30,.5); border:1px solid rgba(255,255,255,.14); border-radius:var(--rl);
  backdrop-filter:blur(20px); box-shadow:0 32px 80px rgba(0,0,0,.4); overflow:hidden; }
.nx .monitor-bar { display:flex; align-items:center; justify-content:space-between;
  padding:var(--s3) var(--s5); border-bottom:1px solid rgba(255,255,255,.1); }
.nx .monitor-title { display:flex; align-items:center; gap:var(--s2); font-family:var(--fm);
  font-size:.71875rem; color:rgba(255,255,255,.66); text-transform:uppercase; letter-spacing:.12em; }
.nx .dot { width:7px; height:7px; border-radius:50%; background:#6FE09A; flex:none; }
.nx .dot.pulse { animation:nxpulse 2.4s ease-in-out infinite; }
@keyframes nxpulse { 0%,100%{box-shadow:0 0 0 0 rgba(111,224,154,.5);} 50%{box-shadow:0 0 0 5px rgba(111,224,154,0);} }
.nx .monitor-tag { font-family:var(--fm); font-size:.6875rem; color:rgba(255,255,255,.4); }
.nx .monitor-feed { padding:var(--s3) var(--s4) var(--s4); display:flex; flex-direction:column;
  gap:var(--s2); min-height:232px; }
.nx .feed-item { display:flex; align-items:flex-start; gap:var(--s3); padding:var(--s3) var(--s4);
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius:var(--r);
  animation:nxfeed .48s var(--ez); }
@keyframes nxfeed { from{opacity:0; transform:translateY(-8px);} to{opacity:1; transform:none;} }
.nx .feed-time { font-family:var(--fm); font-size:.6875rem; color:rgba(255,255,255,.42); padding-top:3px; flex:none; }
.nx .feed-text { font-size:.875rem; color:rgba(255,255,255,.75); }
.nx .feed-text b { color:#fff; font-weight:600; }
.nx .feed-status { margin-left:auto; flex:none; font-family:var(--fm); font-size:.65625rem;
  padding:3px 9px; border-radius:var(--pill); background:rgba(111,224,154,.14); color:#8CE9AE; }
.nx .feed-status.working { background:rgba(245,166,35,.16); color:#FFC96B; }

.nx .trustbar { border-bottom:1px solid var(--line); background:var(--paper); }
.nx .trustbar-inner { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--s5); padding:var(--s6) 0; }
@media (max-width:720px){ .nx .trustbar-inner{ grid-template-columns:1fr; gap:var(--s4); } }
.nx .trust-item { display:flex; align-items:center; justify-content:center; gap:var(--s3); }
.nx .trust-item svg { color:var(--amber); flex:none; }
.nx .trust-item span { font-size:.9375rem; color:var(--ink-soft); }
.nx .trust-item b { color:var(--ink); font-weight:600; }

.nx .systems-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--s5); }
@media (max-width:840px){ .nx .systems-grid{ grid-template-columns:1fr; } }
.nx .system-card { background:var(--card); border:1px solid var(--line); border-radius:var(--rl);
  padding:var(--s7) var(--s6); box-shadow:var(--sh); transition:box-shadow .25s var(--ez),transform .25s var(--ez); }
.nx .system-card:hover { box-shadow:var(--shl); transform:translateY(-3px); }
.nx .system-icon { width:46px; height:46px; display:flex; align-items:center; justify-content:center;
  border-radius:50%; background:var(--paper-soft); color:var(--amber); margin-bottom:var(--s5); }
.nx .system-card h3 { font-size:1.625rem; margin-bottom:var(--s3); }
.nx .system-card p { color:var(--ink-soft); font-size:.96875rem; margin-bottom:var(--s5); }
.nx .system-tag { display:inline-flex; font-family:var(--fm); font-size:.75rem; color:var(--amber);
  background:rgba(199,130,31,.08); border:1px solid rgba(199,130,31,.22); padding:5px 12px; border-radius:var(--pill); }

.nx .pipeline-section { background:var(--navy); color:#fff; }
.nx .pipeline-section .section-head p { color:rgba(255,255,255,.62); }
.nx .pipeline-section .kicker { color:var(--amber-bright); }
.nx .pipeline { background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.09);
  border-radius:var(--rl); padding:var(--s6); }
.nx .pipeline-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--s4); margin-bottom:var(--s5); }
@media (max-width:840px){ .nx .pipeline-steps{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:480px){ .nx .pipeline-steps{ grid-template-columns:1fr; } }
.nx .pstep { border:1px solid rgba(255,255,255,.09); border-radius:var(--r); padding:var(--s5) var(--s4);
  background:rgba(255,255,255,.02); transition:border-color .35s var(--ez),background .35s var(--ez); }
.nx .pstep-head { display:flex; align-items:baseline; gap:var(--s2); margin-bottom:var(--s2); }
.nx .pstep-num { font-family:var(--fm); font-size:.6875rem; color:rgba(255,255,255,.38); }
.nx .pstep h4 { font-size:1rem; font-weight:600; }
.nx .pstep p { font-size:.8125rem; color:rgba(255,255,255,.55); }
.nx .pstep-state { margin-top:var(--s3); font-family:var(--fm); font-size:.6875rem;
  color:rgba(255,255,255,.35); display:flex; align-items:center; gap:var(--s2); }
.nx .pstep.active { border-color:rgba(245,166,35,.55); background:rgba(245,166,35,.07); }
.nx .pstep.active .pstep-state { color:var(--amber-bright); }
.nx .pstep.done .pstep-state { color:#8CE9AE; }
.nx .pipeline-foot { display:flex; align-items:center; justify-content:space-between; gap:var(--s4); flex-wrap:wrap; }
.nx .pipeline-result { font-family:var(--fm); font-size:.875rem; color:rgba(255,255,255,.4); }
.nx .pipeline-result.done { color:#8CE9AE; }
.nx .pipeline-section .btn-ghost { color:#fff; border-color:rgba(255,255,255,.28); }
.nx .pipeline-section .btn-ghost:hover { border-color:#fff; }

.nx .roi { display:grid; grid-template-columns:1fr 1fr; gap:var(--s8); align-items:center; }
@media (max-width:840px){ .nx .roi{ grid-template-columns:1fr; gap:var(--s6); } }
.nx .roi-controls { display:flex; flex-direction:column; gap:var(--s6); }
.nx .roi-field label { display:flex; justify-content:space-between; align-items:baseline;
  font-weight:600; font-size:.9375rem; margin-bottom:var(--s3); }
.nx .roi-field label output { font-family:var(--fm); color:var(--amber); font-size:1.0625rem; }
.nx input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:4px;
  border-radius:var(--pill); background:var(--line); }
.nx input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:28px; height:28px;
  border-radius:50%; background:var(--ink); border:5px solid var(--paper); box-shadow:0 2px 10px rgba(0,0,0,.25); cursor:grab; }
.nx input[type=range]::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:var(--ink);
  border:5px solid var(--paper); box-shadow:0 2px 10px rgba(0,0,0,.25); cursor:grab; }
.nx .roi-note { font-size:.8125rem; color:var(--ink-faint); }
.nx .roi-result { background:var(--card); border:1px solid var(--line); border-radius:var(--rl);
  padding:var(--s7) var(--s6); box-shadow:var(--sh); text-align:center; }
.nx .roi-result-label { font-size:.8125rem; text-transform:uppercase; letter-spacing:.14em;
  color:var(--ink-faint); margin-bottom:var(--s3); }
.nx .roi-big { font-family:var(--fd); font-size:clamp(3rem,6vw,4.2rem); line-height:1; color:var(--ink);
  font-variant-numeric:tabular-nums; margin-bottom:var(--s5); }
.nx .roi-sub { display:flex; gap:var(--s6); justify-content:center; padding-top:var(--s5);
  border-top:1px solid var(--line); margin-bottom:var(--s6); }
.nx .roi-sub div b { display:block; font-family:var(--fd); font-size:1.625rem; color:var(--ink); font-variant-numeric:tabular-nums; }
.nx .roi-sub div span { font-size:.8125rem; color:var(--ink-faint); }

.nx .process-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--s6); }
@media (max-width:960px){ .nx .process-grid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:560px){ .nx .process-grid{ grid-template-columns:1fr; } }
.nx .process-step { border-top:2px solid var(--ink); padding-top:var(--s5); }
.nx .process-num { font-family:var(--fd); font-size:1.125rem; color:var(--amber); display:block; margin-bottom:var(--s3); }
.nx .process-step h3 { font-size:1.5rem; margin-bottom:var(--s2); }
.nx .process-step p { font-size:.9375rem; color:var(--ink-soft); }

.nx .pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--s5); align-items:stretch; }
@media (max-width:960px){ .nx .pricing-grid{ grid-template-columns:1fr; max-width:460px; margin:0 auto; } }
.nx .price-card { display:flex; flex-direction:column; background:var(--card); border:1px solid var(--line);
  border-radius:var(--rl); padding:var(--s7) var(--s6); position:relative; box-shadow:var(--sh); }
.nx .price-card.featured { background:var(--navy); color:#fff; border-color:var(--navy); box-shadow:var(--shl); }
.nx .price-badge { position:absolute; top:calc(-1*var(--s3)); left:50%; transform:translateX(-50%);
  font-size:.71875rem; text-transform:uppercase; letter-spacing:.12em; background:var(--amber-bright);
  color:var(--navy); padding:5px 14px; border-radius:var(--pill); font-weight:700; white-space:nowrap; }
.nx .price-card h3 { font-size:1.75rem; margin-bottom:var(--s4); }
.nx .price-value { font-family:var(--fd); font-size:2rem; line-height:1.1; font-variant-numeric:tabular-nums; }
.nx .price-value small { display:block; font-family:var(--ft); font-size:.875rem; font-weight:400;
  color:var(--ink-faint); margin-top:var(--s1); }
.nx .featured .price-value small { color:rgba(255,255,255,.55); }
.nx .price-desc { font-size:.9375rem; color:var(--ink-soft); margin:var(--s4) 0 var(--s5); }
.nx .featured .price-desc { color:rgba(255,255,255,.68); }
.nx .price-list { list-style:none; margin:0 0 var(--s6); padding:var(--s5) 0 0; border-top:1px solid var(--line);
  display:flex; flex-direction:column; gap:var(--s3); flex:1; }
.nx .featured .price-list { border-top-color:rgba(255,255,255,.14); }
.nx .price-list li { display:flex; gap:var(--s3); font-size:.9375rem; color:var(--ink-soft); }
.nx .featured .price-list li { color:rgba(255,255,255,.78); }
.nx .price-list li svg { color:var(--green); flex:none; margin-top:4px; }
.nx .featured .price-list li svg { color:#8CE9AE; }
.nx .featured .btn-primary { background:var(--amber-bright); color:var(--navy); }
.nx .featured .btn-primary:hover { background:#FFBE4A; }
.nx .pricing-foot { margin:var(--s6) auto 0; font-size:.8125rem; color:var(--ink-faint);
  text-align:center; max-width:720px; }

.nx .faq-list { max-width:720px; }
.nx .faq-item { border-bottom:1px solid var(--line); }
.nx .faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:var(--s4);
  padding:var(--s5) 0; background:none; border:none; color:var(--ink); font-family:var(--fd);
  font-size:1.375rem; text-align:left; line-height:1.3; }
.nx .faq-q svg { flex:none; color:var(--amber); transition:transform .25s var(--ez); }
.nx .faq-item.open .faq-q svg { transform:rotate(45deg); }
.nx .faq-a { padding:0 0 var(--s5); color:var(--ink-soft); font-size:.984375rem; max-width:62ch; }

.nx .contact-section { background:var(--navy); color:#fff; }
.nx .contact-section .kicker { color:var(--amber-bright); }
.nx .contact-section .section-head p { color:rgba(255,255,255,.62); }
.nx .contact-wrap { max-width:640px; margin:0 auto; text-align:center; }
.nx .contact-form { text-align:left; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1);
  border-radius:var(--rl); padding:var(--s6); display:grid; grid-template-columns:1fr 1fr; gap:var(--s4); }
@media (max-width:560px){ .nx .contact-form{ grid-template-columns:1fr; } }
.nx .field { display:flex; flex-direction:column; gap:var(--s2); }
.nx .field.full { grid-column:1/-1; }
.nx .field label { font-size:.875rem; font-weight:600; color:rgba(255,255,255,.85); }
.nx .field label .req { color:var(--amber-bright); }
.nx .field input,.nx .field textarea { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.16);
  border-radius:var(--r); color:#fff; padding:13px 15px; font:inherit; font-size:1rem; min-height:50px;
  transition:border-color .15s var(--ez); }
.nx .field textarea { resize:vertical; min-height:130px; }
.nx .field input:focus,.nx .field textarea:focus { outline:none; border-color:var(--amber-bright); background:rgba(255,255,255,.08); }
.nx .field input::placeholder,.nx .field textarea::placeholder { color:rgba(255,255,255,.35); }
.nx .field-error { font-size:.8125rem; color:#FF8A8E; }
.nx .contact-section .btn-primary { background:var(--paper); color:var(--ink); }
.nx .contact-section .btn-primary:hover { background:#fff; }
.nx .form-success { background:rgba(111,224,154,.08); border:1px solid rgba(111,224,154,.3);
  border-radius:var(--rl); padding:var(--s8) var(--s6); text-align:center; }
.nx .form-success h3 { color:#8CE9AE; font-size:1.75rem; margin-bottom:var(--s3); }
.nx .form-success p { color:rgba(255,255,255,.7); }

.nx .footer { background:var(--navy); color:#fff; border-top:1px solid rgba(255,255,255,.08); padding:var(--s7) 0; }
.nx .footer-inner { display:flex; align-items:center; justify-content:space-between; gap:var(--s5); flex-wrap:wrap; }
.nx .footer .logo { color:#fff; }
.nx .footer-claim { font-size:.875rem; color:rgba(255,255,255,.45); margin-top:var(--s2); }
.nx .footer-links { display:flex; gap:var(--s5); flex-wrap:wrap; }
.nx .footer-links a { font-size:.875rem; color:rgba(255,255,255,.6); text-decoration:none; background:none; border:none; }
.nx .footer-links a:hover { color:#fff; }
.nx .footer-links .intern { color:rgba(255,255,255,.3); }

.nx .chat-fab { position:fixed; right:var(--s5); bottom:var(--s5); z-index:200; width:58px; height:58px;
  border-radius:50%; background:var(--ink); color:var(--paper); border:none; display:flex;
  align-items:center; justify-content:center; box-shadow:var(--shl); transition:transform .2s var(--ez); }
.nx .chat-fab:hover { transform:scale(1.06); }
.nx .chat-panel { position:fixed; right:var(--s5); bottom:calc(var(--s5) + 70px); z-index:210;
  width:384px; max-width:calc(100vw - 32px); height:560px; max-height:calc(100dvh - 120px);
  background:var(--card); border:1px solid var(--line); border-radius:var(--rl);
  box-shadow:0 32px 88px rgba(23,25,30,.3); display:flex; flex-direction:column; overflow:hidden; }
@media (max-width:560px){ .nx .chat-panel{ inset:0; width:100%; height:100dvh; max-width:none; max-height:none; border-radius:0; border:none; } }
.nx .chat-head { display:flex; align-items:center; justify-content:space-between; padding:var(--s4) var(--s5);
  border-bottom:1px solid var(--line); background:var(--paper); }
.nx .chat-head-title { display:flex; align-items:center; gap:var(--s3); font-weight:600; }
.nx .chat-head-title .sub { display:block; font-size:.75rem; font-weight:400; color:var(--ink-faint); }
.nx .chat-close { background:none; border:none; color:var(--ink-soft); padding:var(--s2); display:flex; }
.nx .chat-body { flex:1; overflow-y:auto; padding:var(--s4); display:flex; flex-direction:column;
  gap:var(--s3); background:var(--paper); }
.nx .msg { max-width:85%; padding:var(--s3) var(--s4); border-radius:var(--rl); font-size:.9375rem; white-space:pre-wrap; }
.nx .msg.user { align-self:flex-end; background:var(--ink); color:var(--paper); border-bottom-right-radius:6px; }
.nx .msg.bot { align-self:flex-start; background:var(--card); border:1px solid var(--line); color:var(--ink); border-bottom-left-radius:6px; }
.nx .msg.typing { color:var(--ink-faint); font-family:var(--fm); font-size:.8125rem; }
.nx .chat-foot { display:flex; gap:var(--s2); padding:var(--s3); border-top:1px solid var(--line); background:var(--card); }
.nx .chat-foot input { flex:1; background:var(--paper); border:1px solid var(--line); border-radius:var(--pill);
  color:var(--ink); padding:10px 18px; font:inherit; min-height:46px; }
.nx .chat-foot input:focus { outline:none; border-color:var(--amber); }
.nx .chat-send { width:46px; height:46px; border-radius:50%; border:none; background:var(--ink);
  color:var(--paper); display:flex; align-items:center; justify-content:center; flex:none; }
.nx .chat-escalate { margin:0 var(--s4) var(--s3); padding:var(--s4); border:1px solid rgba(199,130,31,.35);
  background:rgba(199,130,31,.06); border-radius:var(--r); display:flex; flex-direction:column; gap:var(--s3); }
.nx .chat-escalate p { font-size:.875rem; color:var(--ink-soft); }
.nx .chat-escalate input { background:var(--card); border:1px solid var(--line); border-radius:var(--r);
  color:var(--ink); padding:10px 14px; font:inherit; min-height:46px; }

.nx .dash { min-height:100dvh; padding:var(--s8) 0; background:var(--paper); }
.nx .dash-login { max-width:400px; margin:14vh auto 0; background:var(--card); border:1px solid var(--line);
  border-radius:var(--rl); padding:var(--s7) var(--s6); box-shadow:var(--sh); display:flex; flex-direction:column; gap:var(--s4); }
.nx .dash-login h2 { font-size:1.75rem; }
.nx .dash-login input { background:var(--paper); border:1px solid var(--line); border-radius:var(--r);
  color:var(--ink); padding:12px 14px; font:inherit; min-height:50px; }
.nx .dash-login input:focus { outline:none; border-color:var(--amber); }
.nx .dash-head { display:flex; align-items:center; justify-content:space-between; gap:var(--s4); flex-wrap:wrap; margin-bottom:var(--s6); }
.nx .dash-head h1 { font-size:2rem; }
.nx .dash-filters { display:flex; gap:var(--s2); flex-wrap:wrap; }
.nx .chip { font-size:.8125rem; font-weight:500; padding:7px 16px; border-radius:var(--pill);
  border:1px solid var(--line); background:var(--card); color:var(--ink-soft); }
.nx .chip.active { background:var(--ink); color:var(--paper); border-color:var(--ink); }
.nx .inquiry { background:var(--card); border:1px solid var(--line); border-radius:var(--rl);
  padding:var(--s5) var(--s6); margin-bottom:var(--s4); box-shadow:var(--sh); }
.nx .inquiry-head { display:flex; align-items:baseline; justify-content:space-between; gap:var(--s4); flex-wrap:wrap; margin-bottom:var(--s2); }
.nx .inquiry-head b { font-size:1.0625rem; }
.nx .inquiry-meta { font-family:var(--fm); font-size:.75rem; color:var(--ink-faint); }
.nx .inquiry-msg { font-size:.9375rem; color:var(--ink-soft); white-space:pre-wrap; border-left:2px solid var(--line);
  padding-left:var(--s4); margin:var(--s3) 0; max-height:300px; overflow-y:auto; }
.nx .inquiry-actions { display:flex; gap:var(--s2); flex-wrap:wrap; }
.nx .status-pill { font-family:var(--fm); font-size:.6875rem; text-transform:uppercase; letter-spacing:.08em; padding:3px 10px; border-radius:var(--pill); }
.nx .status-neu { background:rgba(199,130,31,.12); color:var(--amber); }
.nx .status-offen { background:rgba(59,108,191,.1); color:#3B6CBF; }
.nx .status-erledigt { background:rgba(62,158,104,.12); color:var(--green); }

.nx .legal { max-width:720px; margin:0 auto; padding:var(--s9) var(--s5); }
.nx .legal h1 { font-size:2.6rem; margin-bottom:var(--s6); }
.nx .legal h2 { font-size:1.5rem; margin:var(--s6) 0 var(--s3); }
.nx .legal p { color:var(--ink-soft); font-size:.9375rem; margin-bottom:var(--s3); }
.nx .legal a { color:var(--amber); }
.nx .legal .ph { background:rgba(199,130,31,.08); border:1px dashed rgba(199,130,31,.4); border-radius:6px;
  padding:2px 8px; color:var(--amber); font-family:var(--fm); font-size:.8125rem; }
.nx .legal-back { display:inline-flex; margin-bottom:var(--s6); color:var(--ink-soft); text-decoration:none; font-size:.9375rem; }

@media (prefers-reduced-motion: reduce) {
  .nx .hero-sky::before,.nx .hero-sky::after,.nx .dot.pulse,.nx .feed-item { animation:none; }
  .nx .reveal { opacity:1; transform:none; transition:none; }
  .nx .btn:hover,.nx .system-card:hover,.nx .chat-fab:hover { transform:none; }
}
`

/* ---------------- Inhalte ---------------- */
const SYSTEMS = [
  { title:'Posteingang & Dokumente', icon:'inbox', tag:'Rechnung → Buchhaltung',
    desc:'Rechnungen, Lieferscheine und E-Mails werden automatisch erkannt, ausgelesen und dem richtigen Vorgang zugeordnet. Ihr Team bekommt fertige Ergebnisse statt Papierstapel.' },
  { title:'Angebote & Vertrieb', icon:'trend', tag:'Anfrage → Angebotsentwurf',
    desc:'Anfragen werden klassifiziert, Angebotsentwürfe vorbereitet und offene Angebote automatisch nachgefasst — bevor sie in Vergessenheit geraten.' },
  { title:'Wissensassistent', icon:'book', tag:'Frage → Antwort mit Quelle',
    desc:'Ein interner Assistent, der Ihre Dokumente, Prozesse und Preislisten kennt. Antwortet in Sekunden — immer mit Quellenangabe, damit Sie nachprüfen können.' },
  { title:'Berichte & Routine', icon:'chart', tag:'Freitag 17:00 → Wochenreport',
    desc:'Wochenreports, Auswertungen und Datenübertrag zwischen Programmen laufen im Hintergrund. Alles, was jede Woche gleich abläuft, läuft ab jetzt von selbst.' },
]
const FEED_ITEMS = [
  { text:'<b>Rechnung erkannt</b> → an Buchhaltung übergeben', status:'done' },
  { text:'<b>Angebot #2041</b> seit 6 Tagen offen → Nachfass-Entwurf erstellt', status:'done' },
  { text:'<b>Lieferschein</b> ausgelesen → Auftrag 5512 zugeordnet', status:'done' },
  { text:'<b>E-Mail-Anfrage</b> klassifiziert → Vertrieb, Priorität hoch', status:'done' },
  { text:'<b>Wochenreport</b> wird erstellt …', status:'working' },
  { text:'<b>Preisanfrage</b> beantwortet → Quelle: Preisliste 2026', status:'done' },
  { text:'<b>Zahlungseingang</b> abgeglichen → Rechnung 1893 geschlossen', status:'done' },
  { text:'<b>Reklamation erkannt</b> → zur menschlichen Freigabe vorgelegt', status:'working' },
]
const PIPELINE_STEPS = [
  { title:'Erkennen', desc:'Eingehende Rechnung wird im Postfach identifiziert.' },
  { title:'Auslesen', desc:'Betrag, Lieferant und Positionen werden extrahiert.' },
  { title:'Prüfen', desc:'Abgleich mit Bestellung — Unstimmigkeiten gehen an einen Menschen.' },
  { title:'Übergeben', desc:'Sauber verbucht an Ihre Buchhaltungssoftware.' },
]
const PROCESS = [
  { title:'Analyse', desc:'Kostenloses Gespräch: Wir finden die Aufgabe mit dem größten Hebel in Ihrem Betrieb.' },
  { title:'Demo & Festpreis', desc:'Sie sehen eine Demo mit Ihren echten Beispieldaten — und bekommen einen Festpreis.' },
  { title:'Pilot in 2–3 Wochen', desc:'Eine Automatisierung geht produktiv. Sie zahlen erst nach erfolgreicher Abnahme.' },
  { title:'Betrieb & Ausbau', desc:'Wir überwachen das System, halten es am Laufen und bauen es Schritt für Schritt aus.' },
]
const PRICING = [
  { name:'Pilot', price:'ab 1.490 €', period:'einmalig', cta:'Pilot anfragen', featured:false,
    desc:'Der risikofreie Einstieg: eine Automatisierung, produktiv in 2–3 Wochen.',
    features:['Eine Automatisierung Ihrer Wahl','Produktiv in 2–3 Wochen','Zahlung erst nach Abnahme','Persönliche Einweisung Ihres Teams'] },
  { name:'KI-System', price:'ab 4.900 € Setup', period:'+ 490 €/Monat', cta:'Gespräch vereinbaren', featured:true,
    desc:'Das laufende System: mehrere Automatisierungen plus Wissensassistent.',
    features:['Mehrere Automatisierungen + Wissensassistent','Monitoring & Support (Reaktion < 24 h)','30 Tage Geld-zurück auf das Setup','Laufende Verbesserungen inklusive'] },
  { name:'Partner', price:'ab 9.500 € Setup', period:'+ ab 990 €/Monat', cta:'Partner werden', featured:false,
    desc:'KI-Ausbau über mehrere Abteilungen — mit Roadmap und Schulungen.',
    features:['KI-Ausbau über mehrere Abteilungen','Gemeinsame Roadmap & Priorisierung','Schulungen für Ihre Mitarbeiter','Priorisierter Support'] },
]
const FAQ = [
  { q:'Muss ich meine Software wechseln?', a:'Nein. NexAgent-Systeme werden an Ihre bestehenden Programme angebunden — E-Mail, Buchhaltung, Warenwirtschaft, Excel. Ihr Team arbeitet weiter wie gewohnt, nur ohne die Routinearbeit.' },
  { q:'Warum nicht einfach selbst ein KI-Tool nutzen?', a:'Können Sie — nur liefert ein Tool kein Ergebnis, sondern eine weitere Aufgabe: einrichten, anbinden, pflegen, prüfen. NexAgent liefert das fertige System inklusive Betrieb und Verantwortung. Wenn etwas nicht läuft, ist das unser Problem, nicht Ihres.' },
  { q:'Wie sicher sind meine Daten?', a:'Alle Daten liegen auf Servern in der EU (Region Frankfurt), verarbeitet nach DSGVO. Auf Wunsch schließen wir einen Auftragsverarbeitungsvertrag (AVV) ab. Ihre Daten werden nicht zum Training von KI-Modellen verwendet.' },
  { q:'Was passiert, wenn die KI einen Fehler macht?', a:'Kritische Schritte laufen nie vollautomatisch: Bevor etwas verbucht, versendet oder gelöscht wird, prüft ein Mensch die Freigabe. Zusätzlich wird jedes System überwacht — Unstimmigkeiten werden gemeldet statt still durchgewunken.' },
  { q:'Ab welcher Unternehmensgröße lohnt sich das?', a:'Ab etwa 10 Mitarbeitern gibt es fast immer genug wiederkehrende Büroarbeit, damit sich ein Pilot innerhalb weniger Monate rechnet. Der ROI-Rechner oben gibt Ihnen eine ehrliche erste Schätzung.' },
]
const NAV_LINKS = [ {label:'Systeme',href:'#systeme'},{label:'Ablauf',href:'#ablauf'},{label:'Preise',href:'#preise'} ]
const TRUST_ITEMS = [
  { icon:'shield', text:'<b>0 € Risiko</b> im Piloten — Zahlung erst nach Abnahme' },
  { icon:'eu', text:'<b>EU-Hosting</b> · DSGVO-konform · AVV auf Wunsch' },
  { icon:'clock', text:'<b>Reaktion &lt; 24 h</b> im laufenden Betrieb' },
]

/* ---------------- Icons ---------------- */
function Icon({ name, size }) {
  const p = { width:size||22, height:size||22, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor',
    strokeWidth:1.75, strokeLinecap:'round', strokeLinejoin:'round' }
  const paths = {
    inbox:<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    trend:<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    book:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    chart:<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    shield:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    eu:<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    clock:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    check:<polyline points="20 6 9 17 4 12"/>,
    plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chat:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    close:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    replay:<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
  }
  return <svg {...p} aria-hidden="true">{paths[name]}</svg>
}

/* ---------------- Hooks ---------------- */
function useInView(threshold=0.2){
  const ref=useRef(null); const [inView,setInView]=useState(false)
  useEffect(()=>{
    const el=ref.current; if(!el||inView) return
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setInView(true); obs.disconnect() } },{threshold})
    obs.observe(el); return ()=>obs.disconnect()
  },[inView,threshold])
  return [ref,inView]
}
function useReduced(){
  const [r,setR]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{ const mq=window.matchMedia('(prefers-reduced-motion: reduce)'); const f=()=>setR(mq.matches)
    mq.addEventListener('change',f); return ()=>mq.removeEventListener('change',f) },[])
  return r
}
function useHashRoute(){
  const [route,setRoute]=useState(()=>window.location.hash.replace('#',''))
  useEffect(()=>{ const f=()=>setRoute(window.location.hash.replace('#','')); window.addEventListener('hashchange',f)
    return ()=>window.removeEventListener('hashchange',f) },[])
  return route
}

/* ---------------- localStorage-Anfragen ---------------- */
const STORE='nx_inquiries'
function loadInquiries(){ try{ return JSON.parse(localStorage.getItem(STORE)||'[]') }catch{ return [] } }
function saveInquiry(inq){
  const all=loadInquiries()
  all.unshift({ id:'id-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), status:'neu', created_at:new Date().toISOString(), ...inq })
  localStorage.setItem(STORE,JSON.stringify(all)); return all
}

/* ---------------- Nav ---------------- */
function Nav(){
  const [scrolled,setScrolled]=useState(false)
  useEffect(()=>{ const f=()=>setScrolled(window.scrollY>40); f()
    window.addEventListener('scroll',f,{passive:true}); return ()=>window.removeEventListener('scroll',f) },[])
  return (
    <header className={'nav'+(scrolled?' scrolled':'')}>
      <div className="container nav-inner">
        <a href="#" className="logo"><span className="logo-mark"/>NexAgent</a>
        <nav className="nav-links">
          {NAV_LINKS.map(l=><a key={l.href} href={l.href}>{l.label}</a>)}
          <a href="#kontakt" className="btn-nav">Kostenlose Demo</a>
        </nav>
      </div>
    </header>
  )
}

/* ---------------- Hero ---------------- */
function nowTime(off=0){ return new Date(Date.now()-off*1000).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }
function LiveMonitor(){
  const reduced=useReduced()
  const [items,setItems]=useState(()=>FEED_ITEMS.slice(0,4).map((it,i)=>({...it,time:nowTime((4-i)*7),key:i})))
  const idx=useRef(4)
  useEffect(()=>{ if(reduced) return
    const t=setInterval(()=>{ setItems(prev=>{ const src=FEED_ITEMS[idx.current%FEED_ITEMS.length]; idx.current++
      return [{...src,time:nowTime(),key:Date.now()},...prev].slice(0,5) }) },4200)
    return ()=>clearInterval(t) },[reduced])
  return (
    <div className="monitor">
      <div className="monitor-bar">
        <span className="monitor-title"><span className="dot pulse"/> Betriebsmonitor</span>
        <span className="monitor-tag">Beispielansicht</span>
      </div>
      <div className="monitor-feed">
        {items.map(it=>(
          <div className="feed-item" key={it.key}>
            <span className="feed-time">{it.time}</span>
            <span className="feed-text" dangerouslySetInnerHTML={{__html:it.text}}/>
            <span className={'feed-status'+(it.status==='working'?' working':'')}>{it.status==='working'?'läuft':'erledigt'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function Hero(){
  return (
    <section className="hero">
      <div className="hero-sky"/>
      <div className="hero-horizon">
        <svg viewBox="0 0 1440 130" preserveAspectRatio="none">
          <path fill="#0A0D14" d="M0 130 L0 96 L90 96 L90 74 L150 74 L150 92 L260 92 L260 58 L288 58 L288 44 L316 44 L316 58 L344 58 L344 92 L470 92 L470 70 L555 70 L555 84 L640 84 L640 52 L668 52 L668 38 L700 38 L700 52 L730 52 L730 84 L860 84 L860 96 L960 96 L960 66 L1050 66 L1050 88 L1150 88 L1150 74 L1240 74 L1240 92 L1320 92 L1320 80 L1440 80 L1440 130 Z"/>
        </svg>
      </div>
      <div className="container">
        <p className="hero-kicker">Interne KI-Systeme für den Mittelstand</p>
        <h1>Bringen Sie Ihre Büroarbeit <em>zum Laufen</em> — ohne eine Hand zu rühren.</h1>
        <p className="hero-sub">NexAgent baut Systeme, die Rechnungen, Angebote und Berichte im Hintergrund erledigen. Angebunden an Ihre Programme, DSGVO-konform. <strong>Sie zahlen erst, wenn es läuft.</strong></p>
        <div className="hero-actions">
          <a href="#kontakt" className="btn btn-light">Demo anfragen</a>
          <a href="#ablauf" className="btn btn-outline-light">So läuft ein System</a>
        </div>
        <p className="hero-note">Kostenlose Machbarkeits-Demo · Region Nürnberg &amp; Ansbach · deutschlandweit</p>
        <LiveMonitor/>
      </div>
    </section>
  )
}

function TrustBar(){
  return (
    <div className="trustbar"><div className="container trustbar-inner">
      {TRUST_ITEMS.map(t=>(
        <div className="trust-item" key={t.icon}><Icon name={t.icon}/><span dangerouslySetInnerHTML={{__html:t.text}}/></div>
      ))}
    </div></div>
  )
}

function Systems(){
  const [ref,inView]=useInView()
  return (
    <section className="section" id="systeme" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Systeme</p>
          <h2>Vier Systeme. Ein <em>ruhigerer</em> Betrieb.</h2>
          <p>Jedes System übernimmt einen klar umrissenen Teil Ihrer wiederkehrenden Arbeit — einzeln startbar, beliebig kombinierbar.</p>
        </div>
        <div className="systems-grid">
          {SYSTEMS.map((s,i)=>(
            <article className={'system-card reveal'+(inView?' in':'')} style={{transitionDelay:i*80+'ms'}} key={s.title}>
              <div className="system-icon"><Icon name={s.icon}/></div>
              <h3>{s.title}</h3><p>{s.desc}</p>
              <span className="system-tag">{s.tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pipeline(){
  const [ref,inView]=useInView(0.35)
  const reduced=useReduced()
  const [progress,setProgress]=useState(-1)
  const timers=useRef([])
  const play=()=>{ timers.current.forEach(clearTimeout); timers.current=[]
    if(reduced){ setProgress(4); return }
    setProgress(0); for(let i=1;i<=PIPELINE_STEPS.length;i++){ timers.current.push(setTimeout(()=>setProgress(i),i*1200)) } }
  useEffect(()=>{ if(inView&&progress===-1) play(); return ()=>timers.current.forEach(clearTimeout) },[inView])
  const done=progress>=PIPELINE_STEPS.length
  return (
    <section className="section pipeline-section" id="demo" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Live-Demo</p>
          <h2>So verbucht sich eine Rechnung <em>selbst</em>.</h2>
          <p>Beispielhafter Durchlauf einer eingehenden Rechnung — genau so arbeitet ein NexAgent-System in Ihrem Betrieb.</p>
        </div>
        <div className="pipeline">
          <div className="pipeline-steps">
            {PIPELINE_STEPS.map((s,i)=>{
              const st=progress>i?'done':progress===i?'active':''
              return (
                <div className={'pstep '+st} key={s.title}>
                  <div className="pstep-head"><span className="pstep-num">0{i+1}</span><h4>{s.title}</h4></div>
                  <p>{s.desc}</p>
                  <span className="pstep-state">{st==='done'?'✓ abgeschlossen':st==='active'?'● in Arbeit …':'○ wartet'}</span>
                </div>
              )
            })}
          </div>
          <div className="pipeline-foot">
            <span className={'pipeline-result'+(done?' done':'')}>{done?'✓ Erledigt in 3,6 s — ohne einen Handgriff.':'Durchlauf läuft …'}</span>
            <button className="btn btn-ghost btn-sm" onClick={play}><Icon name="replay" size={16}/> Nochmal abspielen</button>
          </div>
        </div>
      </div>
    </section>
  )
}

const fmtEur=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0})
function RoiCalc(){
  const [ref,inView]=useInView()
  const [hours,setHours]=useState(12); const [rate,setRate]=useState(45)
  const { savedHours, savedEur }=useMemo(()=>{ const y=hours*0.7*46; return { savedHours:Math.round(y), savedEur:Math.round(y*rate) } },[hours,rate])
  return (
    <section className="section" id="rechner" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Rechner</p>
          <h2>Was kostet Sie die Routine <em>wirklich</em>?</h2>
          <p>Zwei Regler, eine ehrliche Zahl: Ihr jährliches Einsparpotenzial, konservativ gerechnet.</p>
        </div>
        <div className="roi">
          <div className="roi-controls">
            <div className="roi-field">
              <label htmlFor="rh">Routine-Stunden pro Woche <output>{hours} h</output></label>
              <input id="rh" type="range" min="2" max="40" value={hours} onChange={e=>setHours(+e.target.value)}/>
            </div>
            <div className="roi-field">
              <label htmlFor="rr">Stundensatz (Vollkosten) <output>{rate} €</output></label>
              <input id="rr" type="range" min="20" max="120" step="5" value={rate} onChange={e=>setRate(+e.target.value)}/>
            </div>
            <p className="roi-note">Konservative Schätzung: 70 % automatisierbarer Anteil, 46 Arbeitswochen pro Jahr — keine Schönrechnerei.</p>
          </div>
          <div className="roi-result">
            <p className="roi-result-label">Einsparpotenzial pro Jahr</p>
            <p className="roi-big">{fmtEur.format(savedEur)}</p>
            <div className="roi-sub">
              <div><b>{savedHours} h</b><span>gewonnene Arbeitszeit</span></div>
              <div><b>{Math.round(hours*0.7)} h</b><span>pro Woche zurück</span></div>
            </div>
            <a href="#kontakt" className="btn btn-primary">Potenzial prüfen lassen</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Process(){
  const [ref,inView]=useInView()
  return (
    <section className="section" id="ablauf" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Ablauf</p>
          <h2>Vom Gespräch zum laufenden System.</h2>
          <p>Vier Schritte, klare Zusagen — und das Risiko liegt dabei sichtbar bei uns.</p>
        </div>
        <div className="process-grid">
          {PROCESS.map((p,i)=>(
            <div className={'process-step reveal'+(inView?' in':'')} style={{transitionDelay:i*80+'ms'}} key={p.title}>
              <span className="process-num">Schritt {i+1}</span><h3>{p.title}</h3><p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing(){
  const [ref,inView]=useInView()
  return (
    <section className="section" id="preise" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Preise</p>
          <h2>Festpreise. Keine <em>Überraschungen</em>.</h2>
          <p>Alle Preise netto. Der Pilot ist der risikofreie Einstieg — die Systeme sind der laufende Betrieb.</p>
        </div>
        <div className="pricing-grid">
          {PRICING.map(p=>(
            <article className={'price-card'+(p.featured?' featured':'')} key={p.name}>
              {p.featured&&<span className="price-badge">Meistgewählt</span>}
              <h3>{p.name}</h3>
              <p className="price-value">{p.price}<small>{p.period}</small></p>
              <p className="price-desc">{p.desc}</p>
              <ul className="price-list">{p.features.map(f=><li key={f}><Icon name="check" size={16}/> {f}</li>)}</ul>
              <a href="#kontakt" className={'btn '+(p.featured?'btn-primary':'btn-ghost')}>{p.cta}</a>
            </article>
          ))}
        </div>
        <p className="pricing-foot">Alle Preise zzgl. USt. · Monatspakete: 3 Monate Mindestlaufzeit, danach monatlich kündbar · Pilot: Zahlung erst nach erfolgreicher Abnahme · KI-System: 30 Tage Geld-zurück auf das Setup.</p>
      </div>
    </section>
  )
}

function Faq(){
  const [ref,inView]=useInView()
  const [open,setOpen]=useState(0)
  return (
    <section className="section" id="faq" ref={ref}>
      <div className="container">
        <div className={'section-head reveal'+(inView?' in':'')}>
          <p className="kicker">Fragen</p><h2>Häufige Fragen — ehrlich beantwortet.</h2>
        </div>
        <div className="faq-list">
          {FAQ.map((f,i)=>{
            const o=open===i
            return (
              <div className={'faq-item'+(o?' open':'')} key={f.q}>
                <button className="faq-q" aria-expanded={o} onClick={()=>setOpen(o?-1:i)}>{f.q}<Icon name="plus" size={18}/></button>
                {o&&<div className="faq-a">{f.a}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Contact(){
  const [ref,inView]=useInView()
  const [done,setDone]=useState(false)
  const [error,setError]=useState('')
  function submit(e){
    e.preventDefault()
    const d=Object.fromEntries(new FormData(e.currentTarget))
    if(d.website){ setDone(true); return } // Honeypot
    if(!d.name?.trim()||!d.email?.trim()||!d.message?.trim()){ setError('Bitte Name, E-Mail und Nachricht ausfüllen.'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){ setError('Bitte gültige E-Mail-Adresse angeben.'); return }
    setError(''); saveInquiry({ type:'kontakt', name:d.name, firma:d.firma||'', email:d.email, tel:d.tel||'', message:d.message }); setDone(true)
  }
  return (
    <section className="section contact-section" id="kontakt" ref={ref}>
      <div className="container contact-wrap">
        <div className={'section-head reveal'+(inView?' in':'')} style={{margin:'0 auto 48px'}}>
          <p className="kicker" style={{textAlign:'center'}}>Kontakt</p>
          <h2>Kostenlose Machbarkeits-Demo anfragen.</h2>
          <p>Wir melden uns innerhalb eines Werktags — mit einer ehrlichen Einschätzung, ob und wo sich Automatisierung bei Ihnen lohnt.</p>
        </div>
        {done ? (
          <div className="form-success"><h3>Anfrage eingegangen.</h3><p>Danke für Ihr Vertrauen — Sie hören innerhalb eines Werktags von uns. (In dieser Demo lokal gespeichert — sichtbar im Betriebszugang unten.)</p></div>
        ) : (
          <form className="contact-form" onSubmit={submit} noValidate>
            <div className="field"><label>Name <span className="req">*</span></label><input name="name" autoComplete="name"/></div>
            <div className="field"><label>Firma</label><input name="firma" autoComplete="organization"/></div>
            <div className="field"><label>E-Mail <span className="req">*</span></label><input name="email" type="email" autoComplete="email"/></div>
            <div className="field"><label>Telefon</label><input name="tel" type="tel" autoComplete="tel"/></div>
            <div className="field full"><label>Nachricht <span className="req">*</span></label><textarea name="message" placeholder="Welche Aufgabe frisst bei Ihnen jede Woche die meiste Zeit?"/></div>
            <input name="website" style={{position:'absolute',left:'-9999px',width:1,height:1}} tabIndex={-1} autoComplete="off" aria-hidden="true"/>
            {error&&<p className="field-error full">{error}</p>}
            <div className="field full"><button type="submit" className="btn btn-primary">Demo anfragen</button></div>
          </form>
        )}
      </div>
    </section>
  )
}

function Footer(){
  return (
    <footer className="footer"><div className="container footer-inner">
      <div>
        <a href="#" className="logo"><span className="logo-mark"/>NexAgent</a>
        <p className="footer-claim">Interne KI-Systeme für den Mittelstand · Region Nürnberg / Ansbach · deutschlandweit remote</p>
      </div>
      <nav className="footer-links">
        <a href="#impressum">Impressum</a><a href="#datenschutz">Datenschutz</a><a href="#intern" className="intern">Betriebszugang</a>
      </nav>
    </div></footer>
  )
}

/* ---------------- NEXA-Chat (lokales Wissen) ---------------- */
const KB=[
  { k:['preis','kostet','kosten','teuer','€','euro'], a:'Unsere Pakete (netto): Pilot ab 1.490 € einmalig (Zahlung erst nach Abnahme), KI-System ab 4.900 € Setup + 490 €/Monat, Partner ab 9.500 € Setup + ab 990 €/Monat. Die Machbarkeits-Demo ist kostenlos.' },
  { k:['dsgvo','datenschutz','daten','sicher','server','hosting'], a:'Alle Daten liegen in der EU (Frankfurt), DSGVO-konform. Auf Wunsch schließen wir einen AVV ab. Ihre Daten werden nicht zum KI-Training verwendet, und kritische Schritte laufen nur mit menschlicher Freigabe.' },
  { k:['ablauf','wie läuft','prozess','schritte','start','anfang'], a:'In vier Schritten: 1. kostenloses Analyse-Gespräch, 2. Demo mit Ihren Daten + Festpreis, 3. Pilot produktiv in 2–3 Wochen (Zahlung erst nach Abnahme), 4. Betrieb & Ausbau.' },
  { k:['system','was macht','leistung','automatisier','angebot','rechnung','dokument','bericht','wissen'], a:'Wir bauen vier Systemtypen: Posteingang & Dokumente, Angebote & Vertrieb, Wissensassistent und Berichte & Routine. Jedes übernimmt einen klar umrissenen Teil Ihrer wiederkehrenden Büroarbeit.' },
  { k:['software','wechseln','anbindung','programm','integration'], a:'Nein, Sie müssen nichts wechseln. Wir binden die Systeme an Ihre bestehenden Programme an — E-Mail, Buchhaltung, Warenwirtschaft, Excel. Ihr Team arbeitet weiter wie gewohnt.' },
  { k:['fehler','falsch','kontrolle','freigabe'], a:'Kritische Schritte laufen nie vollautomatisch: Bevor etwas verbucht, versendet oder gelöscht wird, prüft ein Mensch die Freigabe. Zusätzlich wird jedes System laufend überwacht.' },
  { k:['größe','mitarbeiter','klein','lohnt','ab wann'], a:'Ab etwa 10 Mitarbeitern lohnt es sich fast immer. Probieren Sie den ROI-Rechner auf der Seite — er gibt Ihnen eine ehrliche erste Schätzung.' },
  { k:['region','wo','nürnberg','ansbach','standort','vor ort'], a:'NexAgent sitzt in der Region Nürnberg / Ansbach (Mittelfranken) — vor Ort und deutschlandweit remote, auch AT/CH.' },
]
const ESCALATE_WORDS=['termin','anruf','rückruf','telefon','sprechen','beschwerde','problem','ärger','verhandeln','rabatt','individuell','angebot machen','buchen']
function nexaReply(text){
  const t=text.toLowerCase()
  if(ESCALATE_WORDS.some(w=>t.includes(w))) return { reply:'Das klärt am besten Janis persönlich mit Ihnen.', escalate:true }
  const hit=KB.find(e=>e.k.some(w=>t.includes(w)))
  if(hit) return { reply:hit.a, escalate:false }
  return { reply:'Gute Frage! Ich beantworte gern alles zu unseren KI-Systemen, Preisen, dem Ablauf und zum Datenschutz. Wenn Sie ein konkretes Anliegen haben — z. B. einen Termin — sagen Sie einfach Bescheid.', escalate:false }
}
function Chat(){
  const GREET={ role:'bot', content:'Guten Tag! Ich bin NEXA, der Assistent von NexAgent. Fragen Sie mich gern zu Leistungen, Preisen, Ablauf oder Datenschutz.' }
  const [open,setOpen]=useState(false)
  const [messages,setMessages]=useState([GREET])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const [escalate,setEscalate]=useState(false)
  const bodyRef=useRef(null)
  useEffect(()=>{ if(bodyRef.current) bodyRef.current.scrollTop=bodyRef.current.scrollHeight },[messages,open,escalate])
  function send(){
    const text=input.trim(); if(!text||busy) return
    setInput(''); setMessages(m=>[...m,{role:'user',content:text}]); setBusy(true)
    setTimeout(()=>{ const { reply, escalate:esc }=nexaReply(text)
      setMessages(m=>[...m,{role:'bot',content:reply}]); if(esc) setEscalate(true); setBusy(false) }, 650)
  }
  function sendEscalation(e){
    e.preventDefault()
    const d=Object.fromEntries(new FormData(e.currentTarget))
    if(!d.name?.trim()||!d.email?.trim()) return
    const transcript=messages.map(m=>(m.role==='user'?'Besucher':'NEXA')+': '+m.content).join('\n')
    saveInquiry({ type:'chat', name:d.name, firma:d.firma||'', email:d.email, tel:'', message:'— Eskalation aus dem NEXA-Chat —\n\n'+transcript })
    setEscalate(false)
    setMessages(m=>[...m,{role:'bot',content:'Vielen Dank! Ihre Anfrage ist samt Chatverlauf eingegangen (in dieser Demo lokal gespeichert, sichtbar im Betriebszugang). Sie hören innerhalb eines Werktags von uns.'}])
  }
  return (
    <>
      {open&&(
        <div className="chat-panel" role="dialog" aria-label="NEXA Chat">
          <div className="chat-head">
            <div className="chat-head-title"><span className="dot pulse"/><span>NEXA<span className="sub">KI-Assistent von NexAgent</span></span></div>
            <button className="chat-close" onClick={()=>setOpen(false)} aria-label="Schließen"><Icon name="close"/></button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m,i)=><div className={'msg '+(m.role==='user'?'user':'bot')} key={i}>{m.content}</div>)}
            {busy&&<div className="msg bot typing">NEXA tippt …</div>}
          </div>
          {escalate&&(
            <form className="chat-escalate" onSubmit={sendEscalation}>
              <p><b>Kontaktdaten hinterlassen</b> — die Anfrage geht samt Chatverlauf direkt an Janis.</p>
              <input name="name" placeholder="Ihr Name *" required/>
              <input name="email" type="email" placeholder="Ihre E-Mail *" required/>
              <input name="firma" placeholder="Firma (optional)"/>
              <button type="submit" className="btn btn-primary btn-sm">Anfrage senden</button>
            </form>
          )}
          <div className="chat-foot">
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); send() } }}
              placeholder="Ihre Frage an NEXA …" aria-label="Nachricht" disabled={busy}/>
            <button className="chat-send" onClick={send} aria-label="Senden" disabled={busy}><Icon name="send" size={18}/></button>
          </div>
        </div>
      )}
      <button className="chat-fab" onClick={()=>setOpen(o=>!o)} aria-label={open?'Chat schließen':'Chat öffnen'}>
        <Icon name={open?'close':'chat'} size={26}/>
      </button>
    </>
  )
}

/* ---------------- Dashboard ---------------- */
const FILTERS=['alle','neu','offen','erledigt']
const fmtDate=iso=>new Date(iso).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})
function Dashboard(){
  const [authed,setAuthed]=useState(false)
  const [code,setCode]=useState('')
  const [err,setErr]=useState('')
  const [items,setItems]=useState([])
  const [filter,setFilter]=useState('alle')
  function login(e){ e.preventDefault()
    // Hinweis: Client-seitiger Gate NUR für diese Demo. Die echte Vercel-Version prüft serverseitig.
    if(code.trim()==='nexagent'){ setAuthed(true); setItems(loadInquiries()); setErr('') }
    else setErr('Zugangscode falsch. (Demo-Code: nexagent)') }
  function setStatus(id,status){ const all=loadInquiries().map(i=>i.id===id?{...i,status}:i); localStorage.setItem(STORE,JSON.stringify(all)); setItems(all) }
  function remove(id){ if(!confirm('Diese Anfrage löschen?')) return; const all=loadInquiries().filter(i=>i.id!==id); localStorage.setItem(STORE,JSON.stringify(all)); setItems(all) }
  if(!authed) return (
    <div className="dash"><div className="container">
      <form className="dash-login" onSubmit={login}>
        <h2>Betriebszugang</h2>
        <p style={{color:'var(--ink-soft)',fontSize:'.9375rem'}}>Interner Bereich — Zugangscode eingeben. <br/><span className="mono" style={{color:'var(--ink-faint)'}}>Demo-Code: nexagent</span></p>
        <input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Zugangscode" autoFocus/>
        {err&&<p className="field-error">{err}</p>}
        <button type="submit" className="btn btn-primary">Anmelden</button>
        <a href="#" style={{color:'var(--ink-faint)',fontSize:'.875rem'}}>← Zurück zur Website</a>
      </form>
    </div></div>
  )
  const shown=filter==='alle'?items:items.filter(i=>i.status===filter)
  return (
    <div className="dash"><div className="container">
      <div className="dash-head">
        <div><h1>Anfragen</h1><p className="mono" style={{color:'var(--ink-faint)'}}>{items.length} gesamt · {items.filter(i=>i.status==='neu').length} neu</p></div>
        <div className="dash-filters">
          {FILTERS.map(f=><button key={f} className={'chip'+(filter===f?' active':'')} onClick={()=>setFilter(f)}>{f}</button>)}
          <button className="chip" onClick={()=>setItems(loadInquiries())}>↻ aktualisieren</button>
          <a href="#" className="chip" style={{textDecoration:'none',lineHeight:1.6}}>← Website</a>
        </div>
      </div>
      {shown.length===0&&<p style={{color:'var(--ink-soft)'}}>Noch keine Anfragen{filter!=='alle'?` mit Status „${filter}"`:''}. Sende eine über das Kontaktformular oder den Chat — sie erscheint hier.</p>}
      {shown.map(i=>(
        <article className="inquiry" key={i.id}>
          <div className="inquiry-head">
            <div><b>{i.name}</b>{i.firma?<span style={{color:'var(--ink-soft)'}}> · {i.firma}</span>:null}
              <span className={'status-pill status-'+i.status} style={{marginLeft:12}}>{i.status}</span></div>
            <span className="inquiry-meta">{i.type==='chat'?'NEXA-Chat':'Kontaktformular'} · {fmtDate(i.created_at)}</span>
          </div>
          <p className="mono" style={{color:'var(--ink-soft)',fontSize:'.8125rem'}}>{i.email}{i.tel?' · '+i.tel:''}</p>
          <div className="inquiry-msg">{i.message}</div>
          <div className="inquiry-actions">
            {['neu','offen','erledigt'].filter(s=>s!==i.status).map(s=><button key={s} className="chip" onClick={()=>setStatus(i.id,s)}>→ {s}</button>)}
            <button className="chip" style={{color:'var(--red)',borderColor:'var(--red)'}} onClick={()=>remove(i.id)}>löschen</button>
          </div>
        </article>
      ))}
    </div></div>
  )
}

/* ---------------- Rechtliches ---------------- */
function Ph({children}){ return <span className="ph">[{children}]</span> }
function Impressum(){
  return (
    <div className="legal">
      <a className="legal-back" href="#">← Zurück zur Website</a>
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>NexAgent<br/>Inhaber: <Ph>Vollständiger Name</Ph><br/><Ph>Straße & Hausnummer</Ph><br/><Ph>PLZ Ort</Ph></p>
      <h2>Kontakt</h2><p>Telefon: <Ph>Telefonnummer</Ph><br/>E-Mail: <Ph>E-Mail-Adresse</Ph></p>
      <h2>Verantwortlich nach § 18 Abs. 2 MStV</h2><p><Ph>Vollständiger Name</Ph>, Anschrift wie oben.</p>
      <p style={{marginTop:32,color:'var(--ink-faint)'}}>Die markierten Felder müssen vor dem Livegang mit echten Angaben gefüllt werden — ein vollständiges Impressum ist in Deutschland Pflicht.</p>
    </div>
  )
}
function Datenschutz(){
  return (
    <div className="legal">
      <a className="legal-back" href="#">← Zurück zur Website</a>
      <h1>Datenschutzerklärung</h1>
      <h2>Verantwortlicher</h2><p><Ph>Name</Ph>, <Ph>Anschrift</Ph>, E-Mail: <Ph>E-Mail</Ph></p>
      <h2>Kontaktformular & Chat</h2><p>Anfragen (Name, Firma, E-Mail, Telefon, Nachricht) werden zur Bearbeitung gespeichert (in der Live-Version in einer EU-Datenbank bei Supabase/Frankfurt). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
      <h2>Schriftarten</h2><p>In der Live-Version werden Schriften lokal gehostet — keine Verbindung zu externen Font-Diensten.</p>
      <h2>Ihre Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch nach DSGVO. Aufsichtsbehörde für Bayern: BayLDA, Ansbach.</p>
      <p style={{marginTop:32,color:'var(--ink-faint)'}}>Platzhalter vor dem Livegang mit echten Angaben füllen.</p>
    </div>
  )
}

/* ---------------- App ---------------- */
export default function App(){
  const route=useHashRoute()
  useEffect(()=>{ // Style einmalig injizieren
    if(document.getElementById('nx-style')) return
    const el=document.createElement('style'); el.id='nx-style'; el.textContent=CSS; document.head.appendChild(el)
  },[])
  if(route==='intern') return <div className="nx"><Dashboard/></div>
  if(route==='impressum') return <div className="nx"><Impressum/></div>
  if(route==='datenschutz') return <div className="nx"><Datenschutz/></div>
  return (
    <div className="nx">
      <Nav/>
      <main>
        <Hero/><TrustBar/><Systems/><Pipeline/><RoiCalc/><Process/><Pricing/><Faq/><Contact/>
      </main>
      <Footer/>
      <Chat/>
    </div>
  )
}
