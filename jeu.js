/* Étincelle · BRILLE — couche de jeu
   Sons, étincelles, niveaux, badges et missions pas à pas.
   Ce fichier ne touche ni aux codes d'accès ni aux contenus : il lit ce que l'application affiche
   et ajoute le jeu par-dessus. Tout reste dans le téléphone de la famille. */
(() => {
  'use strict';
  const CLE = 'brille-etincelle-jeu', CLE_SON = 'brille-etincelle-son';
  const app = document.getElementById('app');
  if (!app) return;
  const calme = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const jour = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const lundi = () => { const x = jour(new Date()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
  const COULEURS = ['#f49f4c', '#f5abaf', '#cbe1b6', '#b8aed7', '#fdd5a5', '#a8dbeb', '#ebc6e0', '#f8f4b8', '#a4c2e7'];

  /* ---------- Mémoire du jeu (séparée de celle de l'application) ---------- */
  const neuf = () => ({ pts: 0, missionsJour: {}, nMissions: 0, missions: {}, defis: {}, nDefis: 0, bilans: {}, nBilans: 0, badges: [], ouverts: [], parcoursSem: {}, parcoursFin: {}, medailles: {}, nSemaines: 0, nParcours: 0 });
  let S;
  try { S = Object.assign(neuf(), JSON.parse(localStorage.getItem(CLE) || '{}')); } catch { S = neuf(); }
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(S)); } catch { } };

  const NIVEAUX = [
    { p: 0, n: 'Graine', e: '🌱' }, { p: 20, n: 'Pousse', e: '🌿' }, { p: 50, n: 'Bourgeon', e: '🌷' },
    { p: 100, n: 'Fleur', e: '🌸' }, { p: 180, n: 'Jardin', e: '🌻' }, { p: 300, n: 'Étincelle', e: '✨' }
  ];
  const niveauDe = pts => { let k = 0; NIVEAUX.forEach((x, i) => { if (pts >= x.p) k = i; }); return k; };

  const BADGES = [
    { id: 'bilan', e: '💧', n: 'Premier bilan', ok: () => S.nBilans >= 1 },
    { id: 'mission', e: '🚀', n: 'Première mission', ok: () => S.nMissions >= 1 },
    { id: 'defi', e: '🎯', n: 'Défi relevé', ok: () => S.nDefis >= 1 },
    { id: 'trois', e: '🏅', n: '3 missions', ok: () => S.nMissions >= 3 },
    { id: 'cinq', e: '🔥', n: '5 défis', ok: () => S.nDefis >= 5 },
    { id: 'semaine', e: '🗓️', n: 'Une semaine du parcours', ok: () => S.nSemaines >= 1 },
    { id: 'mois', e: '🏆', n: 'Un mois ensemble', ok: () => S.nParcours >= 1 },
    { id: 'fleur', e: '🌸', n: 'Tous mes pétales', ok: () => S.ouverts.length > 0 && S.ouverts.every(id => S.missions[id]) }
  ];

  /* ---------- Sons (Web Audio : aucun fichier à télécharger) ---------- */
  let AC = null, SON = true;
  try { SON = localStorage.getItem(CLE_SON) !== 'off'; } catch { }
  const ac = () => {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  };
  function tone(f, t0, d, type, vol, f2) {
    if (!SON) return; const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
  }
  const GAMME = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175];   // gamme pentatonique : tout sonne juste
  const SFX = {
    petale: i => { const f = GAMME[(i * 2) % GAMME.length]; tone(f, 0, .5, 'sine', .2); tone(f * 2, 0, .3, 'sine', .05); },
    ferme: () => { tone(220, 0, .18, 'triangle', .12, 180); },
    pop: () => { tone(520, 0, .09, 'sine', .1, 760); },
    visage: k => { [[300, 140], [330, 250], [440, 440], [523, 660], [784, 1040]].forEach(([a, b], i) => { if (i === k - 1) { tone(a, 0, .25, 'triangle', .16, b); if (k >= 4) tone(b * 1.5, .1, .25, 'sine', .08); } }); },
    etape: k => { tone(GAMME[Math.min(k, 7)], 0, .22, 'triangle', .17); tone(GAMME[Math.min(k, 7)] * 1.5, .09, .25, 'sine', .08); },
    debut: () => { [GAMME[2], GAMME[4], GAMME[6]].forEach((f, i) => tone(f, i * .09, .3, 'triangle', .16)); },
    carte: () => { tone(700, 0, .08, 'square', .05, 1100); tone(1000, .07, .12, 'sine', .08); },
    goutte: () => { tone(900, 0, .35, 'sine', .14, 380); tone(1350, .06, .25, 'sine', .05, 600); },
    etincelle: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * .06, .3, 'sine', .08)); },
    fanfare: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .08, .38, 'sine', .16)); tone(1047, .45, .6, 'triangle', .1); tone(784, .45, .6, 'triangle', .08); },
    niveau: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .09, .35, 'triangle', .15)); tone(1568, .6, .7, 'sine', .1); }
  };
  const sfx = (n, a) => { try { if (SFX[n]) SFX[n](a); } catch { } };
  const debloquer = () => { ac(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, debloquer, { once: true, passive: true }));

  /* ---------- Voix : lecture à voix haute des étapes ---------- */
  const VOIX_OK = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let VOIX = [], GARDE = [], AUTO = false;
  try { AUTO = localStorage.getItem('brille-etincelle-voix') === 'on'; } catch { }
  const chargerVoix = () => { try { VOIX = speechSynthesis.getVoices() || []; } catch { } };
  if (VOIX_OK) { chargerVoix(); try { speechSynthesis.onvoiceschanged = chargerVoix; } catch { } }
  const voixFr = () => { if (!VOIX.length) chargerVoix(); return VOIX.find(v => /^fr[-_]FR$/i.test(v.lang) && /(google|thomas|amelie|audrey|hortense|julie|denise|eloise)/i.test(v.name)) || VOIX.find(v => /^fr/i.test(v.lang)) || null; };
  const nettoyer = t => String(t).replace(/[\u{1F300}-\u{1FAFF}☀-➿️✓✕]/gu, '').replace(/\s+/g, ' ').trim();
  function arreter() { try { if (VOIX_OK && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch { } GARDE = []; }
  function lire(texte) {
    if (!VOIX_OK) { bandeau('Lecture à voix haute indisponible', 'Essayez avec Chrome ou Safari.'); return false; }
    arreter();
    setTimeout(() => {
      try {
        const u = new SpeechSynthesisUtterance(nettoyer(texte)); u.lang = 'fr-FR';
        const v = voixFr(); if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = .92; GARDE.push(u); u.onend = u.onerror = () => { GARDE = GARDE.filter(x => x !== u); };
        speechSynthesis.speak(u);
      } catch { }
    }, 120);
    return true;
  }

  /* ---------- Effets : pétales qui s'envolent, +étincelles, goutte ---------- */
  function petalesVolants(x, y, n, couleurs) {
    if (calme) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div'); p.className = 'jeu-p';
      const c = (couleurs || COULEURS)[i % (couleurs || COULEURS).length];
      p.style.cssText = `left:${x}px;top:${y}px;background:${c}`;
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 130, rot = (Math.random() - .5) * 720;
      const an = p.animate([
        { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r - 40}px)) scale(1) rotate(${rot / 2}deg)`, opacity: 1, offset: .55 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.1}px), calc(-50% + ${Math.sin(a) * r + 120}px)) scale(.8) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' });
      an.onfinish = () => p.remove();
    }
  }
  function pluie(couleurs, n) {
    if (calme) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'jeu-goutte'; d.textContent = '💧';
      d.style.left = (8 + Math.random() * 84) + 'vw';
      document.body.appendChild(d);
      const an = d.animate([{ transform: 'translateY(-10vh)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'translateY(75vh)', opacity: .9 }],
        { duration: 900 + Math.random() * 600, delay: i * 70, easing: 'ease-in', fill: 'both' });
      an.onfinish = () => d.remove();
    }
  }
  function flotte(txt, x, y) {
    const t = document.createElement('div'); t.className = 'jeu-plus'; t.textContent = txt;
    t.style.left = x + 'px'; t.style.top = y + 'px'; document.body.appendChild(t);
    if (calme) { setTimeout(() => t.remove(), 1400); return; }
    const an = t.animate([{ transform: 'translate(-50%,0)', opacity: 0 }, { transform: 'translate(-50%,-14px)', opacity: 1, offset: .2 }, { transform: 'translate(-50%,-70px)', opacity: 0 }], { duration: 1500, easing: 'ease-out' });
    an.onfinish = () => t.remove();
  }
  function bandeau(txt, sous) {
    const b = document.createElement('div'); b.className = 'jeu-bandeau'; b.setAttribute('role', 'status');
    b.innerHTML = `<b>${esc(txt)}</b>${sous ? `<span>${esc(sous)}</span>` : ''}`;
    document.body.appendChild(b); setTimeout(() => b.remove(), 3200);
  }
  const centre = el => { const r = el ? el.getBoundingClientRect() : null; return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; };

  /* ---------- Gains, niveaux, badges ---------- */
  function gagner(n, el, raison) {
    const avant = niveauDe(S.pts); S.pts += n;
    const { x, y } = centre(el); if (raison !== 'fin') flotte(`+${n} ✨`, x, y);
    if (!calme && raison !== 'mute' && raison !== 'fin') petalesVolants(x, y, 8);
    const apres = niveauDe(S.pts);
    const nouveaux = BADGES.filter(b => !S.badges.includes(b.id) && b.ok());
    nouveaux.forEach(b => S.badges.push(b.id));
    sauver();
    if (apres > avant) { setTimeout(() => { sfx('niveau'); bandeau(`Niveau « ${NIVEAUX[apres].n} » ${NIVEAUX[apres].e}`, 'Votre fleur grandit !'); petalesVolants(innerWidth / 2, innerHeight / 3, 24); }, 600); }
    else if (nouveaux.length) { setTimeout(() => { sfx('etincelle'); bandeau(`Badge : ${nouveaux[0].n} ${nouveaux[0].e}`); }, 600); }
    majHud();
    return nouveaux;
  }

  /* ---------- Bouton son ---------- */
  function boutonSon() {
    const bar = document.querySelector('.topbar'); if (!bar || bar.querySelector('.jeu-son')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'jeu-son';
    const maj = () => { b.textContent = SON ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(SON)); b.setAttribute('aria-label', SON ? 'Sons activés. Toucher pour couper' : 'Sons coupés. Toucher pour activer'); };
    b.addEventListener('click', () => { SON = !SON; try { localStorage.setItem(CLE_SON, SON ? 'on' : 'off'); } catch { } maj(); if (SON) { ac(); sfx('pop'); } });
    maj(); bar.appendChild(b);
  }

  /* ---------- Accueil : tableau de jeu ---------- */
  function htmlHud() {
    const k = niveauDe(S.pts), nv = NIVEAUX[k], suiv = NIVEAUX[k + 1];
    const pct = suiv ? Math.round((S.pts - nv.p) / (suiv.p - nv.p) * 100) : 100;
    const reste = suiv ? suiv.p - S.pts : 0;
    return `<div class="jeu-niv"><span class="jeu-emo" aria-hidden="true">${nv.e}</span>
        <div><b>Niveau « ${nv.n} »</b><small>${S.pts} étincelle${S.pts > 1 ? 's' : ''} ✨</small></div></div>
      <div class="jeu-barre" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      <p class="jeu-aide">${suiv ? `Encore ${reste} ✨ pour devenir « ${suiv.n} » ${suiv.e}. Chaque mission vécue ensemble en rapporte !` : 'Votre fleur brille de mille feux !'}</p>
      <div class="jeu-badges" aria-label="Badges">${BADGES.map(b => { const a = S.badges.includes(b.id); return `<span class="jeu-badge${a ? ' on' : ''}" title="${esc(b.n)}"><i aria-hidden="true">${a ? b.e : '🔒'}</i><small>${esc(b.n)}</small></span>`; }).join('')}</div>`;
  }
  function majHud() { const h = app.querySelector('.jeu-hud'); if (h) h.innerHTML = htmlHud(); }
  /* Médaille sur les pétales dont le parcours d'un mois est terminé (fleur et liste) */
  function medailles() {
    app.querySelectorAll('a.petale').forEach(a => {
      const id = (a.getAttribute('href') || '').split('/').pop();
      if (!S.medailles[id] || a.querySelector('.jeu-med-svg')) return;
      const path = a.querySelector('path'); if (!path || !path.getBBox) return;
      const bb = path.getBBox();
      path.setAttribute('stroke', '#f4b400'); path.setAttribute('stroke-width', '16'); path.setAttribute('stroke-linejoin', 'round');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('class', 'jeu-med-svg'); t.setAttribute('x', bb.x + bb.width * 0.84); t.setAttribute('y', bb.y + bb.height * 0.2);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '100'); t.setAttribute('aria-hidden', 'true'); t.textContent = '🏅';
      (path.parentNode || a).appendChild(t);
    });
    app.querySelectorAll('a.ligne-petale:not(.ferme)').forEach(a => {
      const id = (a.getAttribute('href') || '').split('/').pop();
      if (S.medailles[id] && !a.querySelector('.jeu-med')) { const s = document.createElement('span'); s.className = 'jeu-med'; s.textContent = '🏅'; s.setAttribute('aria-label', 'Un mois vécu ensemble'); a.appendChild(s); }
    });
  }
  function ameliorerAccueil() {
    medailles();
    const ouverts = [...app.querySelectorAll('a.ligne-petale:not(.ferme)')].map(a => (a.getAttribute('href') || '').split('/').pop());
    if (ouverts.length) { S.ouverts = ouverts; sauver(); }
    if (app.querySelector('.jeu-hud')) return;
    const place = app.querySelector('.fleur-carte') || app.querySelector('.hero-accueil'); if (!place) return;
    const d = document.createElement('div'); d.className = 'jeu-hud carte'; d.innerHTML = htmlHud();
    place.insertAdjacentElement('afterend', d);
    // pétales déjà « vécus » : une petite pastille ✨ sur la liste
    app.querySelectorAll('a.ligne-petale:not(.ferme)').forEach(a => {
      const id = (a.getAttribute('href') || '').split('/').pop();
      if (S.missions[id] && !a.querySelector('.jeu-ok')) { const s = document.createElement('span'); s.className = 'jeu-ok'; s.textContent = '✨'; s.setAttribute('aria-label', 'Mission vécue'); a.appendChild(s); }
    });
  }

  /* ---------- Page pétale : la mission pas à pas ---------- */
  function ameliorerPetale() {
    const carte = app.querySelector('.carte.ensemble'); if (!carte || carte.querySelector('.jeu-lancer')) return;
    const etapes = [...carte.querySelectorAll('.etapes li')].map(li => li.textContent.trim()).filter(Boolean);
    if (!etapes.length) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn plein jeu-lancer';
    b.innerHTML = `🎮 Lancer la mission <small>(${etapes.length} étapes)</small>`;
    b.addEventListener('click', () => { sfx('debut'); lancerMission(carte, etapes); });
    const liste = carte.querySelector('.etapes'); liste.parentNode.insertBefore(b, liste);
    const l = document.createElement('p'); l.className = 'jeu-aide'; l.textContent = 'Ou lisez toutes les étapes ci-dessous, à votre rythme.';
    liste.parentNode.insertBefore(l, liste);
  }
  const idPetale = () => (location.hash.match(/#\/petale\/([^/?]+)/) || [])[1] || '';

  function lancerMission(carte, etapes, opts) {
    opts = opts || {};
    const id = idPetale();
    const titre = opts.titre || (carte.querySelector('h2') || {}).textContent || 'Mission';
    const meta = opts.meta || [...carte.querySelectorAll('.meta span')].map(s => s.textContent.trim());
    const questions = opts.questions || [...carte.querySelectorAll('.parler li')].map(li => li.textContent.trim()).filter(Boolean);
    const couleur = opts.couleur || getComputedStyle(carte).backgroundColor;
    const total = etapes.length;
    let pos = 0, qi = -1, fini = false;
    const ov = document.createElement('div'); ov.className = 'jeu-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Mission : ' + titre);
    ov.innerHTML = '<div class="jeu-ov-in"><button type="button" class="jeu-x" aria-label="Fermer la mission">✕</button><div class="jeu-pts" aria-hidden="true"></div>' + (VOIX_OK ? '<button type="button" class="jeu-auto" aria-pressed="' + AUTO + '">🗣️ Lecture automatique : <b>' + (AUTO ? 'oui' : 'non') + '</b></button>' : '') + '<div class="jeu-ecran"></div></div>';
    ov.style.setProperty('--c', couleur);
    document.body.appendChild(ov); document.body.classList.add('jeu-fige');
    const ecran = ov.querySelector('.jeu-ecran'), pts = ov.querySelector('.jeu-pts');
    const fermer = () => { arreter(); ov.remove(); document.body.classList.remove('jeu-fige'); document.removeEventListener('keydown', cle); };
    const cle = e => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', cle);
    ov.querySelector('.jeu-x').addEventListener('click', () => { sfx('pop'); fermer(); });

    function points() {
      const n = total + (questions.length ? 2 : 1);   // intro + étapes (+ discussion)
      const cur = fini ? n : pos;
      pts.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < cur ? 'jeu-fait' : i === cur ? 'now' : ''}"></i>`).join('');
    }
    const bAuto = ov.querySelector('.jeu-auto');
    if (bAuto) bAuto.addEventListener('click', () => {
      AUTO = !AUTO; try { localStorage.setItem('brille-etincelle-voix', AUTO ? 'on' : 'off'); } catch { }
      bAuto.setAttribute('aria-pressed', String(AUTO)); bAuto.querySelector('b').textContent = AUTO ? 'oui' : 'non';
      if (AUTO && texteCourant) lire(texteCourant); else arreter();
    });
    let texteCourant = '';
    function montrer(html, focus, lecture) {
      ecran.innerHTML = html; ecran.classList.remove('entre'); void ecran.offsetWidth; ecran.classList.add('entre');
      points(); const f = ecran.querySelector(focus || '.btn.plein');
      texteCourant = lecture || '';
      if (lecture && VOIX_OK && f) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn discret plein jeu-ecoute'; b.textContent = '🔊 Écouter';
        b.addEventListener('click', () => lire(lecture)); f.parentNode.insertBefore(b, f);
      }
      if (f) f.focus({ preventScroll: true });
      if (lecture && AUTO && SON) lire(lecture); else arreter();
    }
    function intro() {
      pos = 0;
      montrer(`<div class="jeu-gros" aria-hidden="true">🎮</div><h2>Mission : ${esc(titre)}</h2>
        <p class="jeu-meta">${meta.map(esc).join('<br>')}</p>
        <p>${total} petites étapes, une à la fois. Prenez votre temps, il n'y a ni note ni chrono. Prêts ?</p>
        <button type="button" class="btn plein" id="j-go">C'est parti ! 🚀</button>`, null, `Mission : ${titre}. ${total} petites étapes, une à la fois. Prenez votre temps. Prêts ?`);
      ecran.querySelector('#j-go').addEventListener('click', () => { sfx('etape', 0); etape(0); });
    }
    function etape(i) {
      pos = i + 1;
      montrer(`<span class="etiquette">Étape ${i + 1} sur ${total}</span>
        <p class="jeu-etape">${esc(etapes[i])}</p>
        <button type="button" class="btn plein" id="j-ok">C'est fait ✓</button>
        ${i > 0 ? '<button type="button" class="btn discret plein" id="j-av">← Étape précédente</button>' : ''}`, '#j-ok', `Étape ${i + 1}. ${etapes[i]}`);
      ecran.querySelector('#j-ok').addEventListener('click', e => {
        const c = centre(e.currentTarget); sfx('etape', i + 1); petalesVolants(c.x, c.y, 6, [couleur]);
        if (i + 1 < total) etape(i + 1); else (questions.length ? discussion() : fin());
      });
      const av = ecran.querySelector('#j-av'); if (av) av.addEventListener('click', () => { sfx('pop'); etape(i - 1); });
    }
    function discussion() {
      pos = total + 1;
      let dernier = -1;
      const tirer = () => { let k; do { k = Math.floor(Math.random() * questions.length); } while (questions.length > 1 && k === dernier); dernier = k; return k; };
      const rend = () => {
        const k = tirer();
        montrer(`<span class="etiquette">Pour en parler ensemble</span><div class="jeu-carte-q" aria-live="polite">${esc(questions[k])}</div>
          ${questions.length > 1 ? '<button type="button" class="btn discret plein" id="j-de">🎲 Une autre question</button>' : ''}
          <button type="button" class="btn plein" id="j-fin">Terminer la mission 🎉</button>`, '#j-fin', `Pour en parler ensemble. ${questions[k]}`);
        sfx('carte');
        const de = ecran.querySelector('#j-de'); if (de) de.addEventListener('click', rend);
        ecran.querySelector('#j-fin').addEventListener('click', fin);
      };
      rend();
    }
    function finSemaine() {
      fini = true;
      const nouveau = !S.parcoursSem[id + '-' + opts.n];
      opts.valider();                       // coche la case de la semaine : l'application et le jeu l'enregistrent
      if (opts.dernier) { fermer(); return; }          // dernière semaine : la grande fête prend le relais
      montrer(`<div class="jeu-gros" aria-hidden="true">🏆</div><h2>Semaine vécue !</h2>
        <p>Bravo : vous avez avancé ensemble. La semaine suivante vient de s'ouvrir.</p>
        ${nouveau ? '<p class="jeu-gain">+6 ✨</p>' : ''}
        <button type="button" class="btn plein" id="j-fermer">Retour au parcours 🌸</button>`, '#j-fermer', 'Semaine vécue ! Bravo, vous avez avancé ensemble. La semaine suivante vient de s\'ouvrir.');
      sfx('fanfare'); petalesVolants(innerWidth / 2, innerHeight / 3, 34);
      ecran.querySelector('#j-fermer').addEventListener('click', () => { sfx('pop'); fermer(); });
    }
    function fin() {
      if (opts.valider) return finSemaine();
      fini = true;
      const aujourd = iso(new Date()), deja = S.missionsJour[id] === aujourd;
      S.missionsJour[id] = aujourd; S.missions[id] = aujourd; S.nMissions += deja ? 0 : 1; sauver();
      // coche « Nous l'avons fait ensemble » dans l'application (elle garde sa propre mémoire)
      const cb = document.getElementById('fait'); if (cb && !cb.checked) { cb._jeuMuet = true; cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      const gain = deja ? 2 : 10;
      montrer(`<div class="jeu-gros" aria-hidden="true">🏆</div><h2>Mission accomplie !</h2>
        <p>Bravo : vous avez vécu ce moment ensemble. C'est ça, la qualité de vie de l'enfant qui grandit.</p>
        <p class="jeu-gain">+${gain} ✨</p>
        <button type="button" class="btn plein" id="j-fermer">Retour à la fleur 🌸</button>`, '#j-fermer', 'Mission accomplie ! Bravo, vous avez vécu ce moment ensemble.');
      sfx('fanfare'); petalesVolants(innerWidth / 2, innerHeight / 3, 34);
      gagner(gain, ecran.querySelector('.jeu-gain'), 'fin');
      ecran.querySelector('#j-fermer').addEventListener('click', () => { sfx('pop'); fermer(); location.hash = '#/'; });
    }
    intro();
  }

  /* ---------- Page « Cette semaine » : défi ---------- */
  function ameliorerSemaine() {
    const defi = app.querySelector('.defi'), cb = document.getElementById('fait'); if (!defi || !cb || defi.querySelector('.jeu-defi')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn plein jeu-defi';
    const maj = () => { b.innerHTML = cb.checked ? '✅ Défi relevé, bravo !' : '🎯 J\'ai relevé le défi !'; b.classList.toggle('fait', cb.checked); };
    b.addEventListener('click', () => { cb.click(); });
    cb.addEventListener('change', maj); maj();
    defi.insertBefore(b, defi.querySelector('.coche'));
  }

  /* ---------- Évènements : cases, visages, bilans, pétales ---------- */
  document.addEventListener('change', e => {
    const cb = e.target; if (!cb || cb.id !== 'fait') return;
    if (cb._jeuMuet) { cb._jeuMuet = false; return; }
    if (!cb.checked) return;
    const c = centre(cb);
    if (app.querySelector('.defi')) {
      const cle = (app.querySelector('.defi h2') || {}).textContent || 'defi';
      sfx('fanfare'); petalesVolants(c.x, c.y, 18);
      if (!S.defis[cle]) { S.defis[cle] = iso(new Date()); S.nDefis++; gagner(5, cb, 'mute'); } else { bandeau('Défi déjà relevé 👏', 'Chaque essai compte !'); }
    } else {
      const id = idPetale(), aujourd = iso(new Date());
      sfx('fanfare'); petalesVolants(c.x, c.y, 18);
      if (id && S.missionsJour[id] !== aujourd) { S.missionsJour[id] = aujourd; S.missions[id] = aujourd; S.nMissions++; gagner(8, cb, 'mute'); }
    }
  });

  /* Lancer la mission d'une semaine du parcours (pas à pas, comme « À faire ensemble ») */
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('.pc-lancer'); if (!b) return;
    const det = b.closest('details'), zone = b.closest('#parcours'); if (!det || !zone) return;
    const n = Number(det.dataset.n);
    const etapes = [...det.querySelectorAll('.etapes li')].map(li => li.textContent.trim()).filter(Boolean); if (!etapes.length) return;
    const questions = [...det.querySelectorAll('.parler li')].map(li => li.textContent.trim()).filter(Boolean);
    const titre = ((zone.querySelector('h2') || {}).textContent || 'Parcours') + ' · semaine ' + n;
    const dernier = zone.querySelectorAll('.pc-fait:checked').length === 3;
    sfx('debut');
    lancerMission(det, etapes, {
      titre, questions, n, dernier, meta: ['Semaine ' + n + ' sur 4'], couleur: getComputedStyle(zone).backgroundColor,
      valider() { const cb = zone.querySelector('.pc-fait[data-n="' + n + '"]'); if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } }
    });
  });
  document.addEventListener('brille:parcours-reset', e => {
    const id = e.detail && e.detail.id; if (!id) return;
    Object.keys(S.parcoursSem).forEach(k => { if (k.indexOf(id + '-') === 0) delete S.parcoursSem[k]; });
    delete S.parcoursFin[id]; sauver();
  });

  /* La grande fête de fin de mois */
  function feteMois(id) {
    if (document.querySelector('.jeu-fete')) return;
    const zone = app.querySelector('#parcours');
    const titre = zone ? (zone.querySelector('h2') || {}).textContent : '';
    const couleur = zone ? getComputedStyle(zone).backgroundColor : '#fdd5a5';
    const ov = document.createElement('div'); ov.className = 'jeu-ov jeu-fete'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Un mois ensemble');
    ov.style.setProperty('--c', couleur);
    ov.innerHTML = `<div class="jeu-ov-in"><div class="jeu-ecran entre">
      <div class="jeu-gros" aria-hidden="true">🏆</div>
      <h2>Un mois ensemble !</h2>
      <p class="jeu-fete-txt">Pendant 4 semaines, vous avez été là, l'un pour l'autre. Semaine après semaine, vous avez fait l'effort d'avancer ensemble, de créer du lien et d'apprendre à mieux vous comprendre.</p>
      <div class="jeu-medaille"><img src="p-${esc(id)}.png" alt=""><div><b>${esc(titre)}</b><span>4 semaines · parent et enfant</span></div></div>
      <p class="jeu-fete-txt"><b>L'harmonie et l'épanouissement se vivent au quotidien.</b> Vous venez de le prouver.</p>
      <p class="jeu-gain">+15 ✨</p>
      <p class="jeu-fete-txt">Badge « Un mois ensemble » 🏆 gagné.</p>
      <button type="button" class="btn plein" id="j-souvenir">Voir notre carte souvenir 🌸</button>
    </div></div>`;
    document.body.appendChild(ov); document.body.classList.add('jeu-fige');
    const fermer = () => { ov.remove(); document.body.classList.remove('jeu-fige'); const g = app.querySelector('.pc-souvenir') || app.querySelector('#parcours'); if (g) g.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'center' }); };
    ov.querySelector('#j-souvenir').addEventListener('click', () => { sfx('pop'); fermer(); });
    ov.querySelector('#j-souvenir').focus({ preventScroll: true });
    sfx('niveau'); setTimeout(() => sfx('fanfare'), 700);
    petalesVolants(innerWidth / 2, innerHeight / 3, 40);
    [0, 1, 2, 3, 4, 5].forEach(k => setTimeout(() => petalesVolants(innerWidth * (0.12 + 0.15 * k), innerHeight / 3, 16), 400 + k * 450));
  }

  /* Parcours d'un mois : chaque semaine vécue rapporte des étincelles, le mois complet un badge.
     (écouté en phase de capture : la carte est redessinée juste après par l'application) */
  document.addEventListener('change', e => {
    const cb = e.target; if (!cb || !cb.classList || !cb.classList.contains('pc-fait') || !cb.checked) return;
    const id = idPetale(), n = cb.dataset.n, aujourd = iso(new Date()), c = centre(cb);
    const zone = cb.closest('#parcours'), toutes = zone ? zone.querySelectorAll('.pc-fait:checked').length : 0;
    sfx('fanfare'); petalesVolants(c.x, c.y, 18);
    if (id && !S.parcoursSem[id + '-' + n]) { S.parcoursSem[id + '-' + n] = aujourd; S.nSemaines++; gagner(6, cb, 'mute'); }
    if (id && toutes === 4 && !S.parcoursFin[id]) { S.parcoursFin[id] = aujourd; S.medailles[id] = aujourd; S.nParcours++; gagner(15, cb, 'mute'); setTimeout(() => feteMois(id), 500); }
  }, true);

  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const p = t.closest('a.petale');
    if (p) {
      const tous = [...app.querySelectorAll('a.petale')], i = tous.indexOf(p);
      if (p.classList.contains('ferme')) sfx('ferme'); else sfx('petale', Math.max(i, 0));
      p.classList.add('pop'); setTimeout(() => p.classList.remove('pop'), 700);
      return;
    }
    const l = t.closest('a.ligne-petale');
    if (l) { const tous = [...app.querySelectorAll('a.ligne-petale')], i = tous.indexOf(l); if (l.classList.contains('ferme')) sfx('ferme'); else sfx('petale', Math.max(i, 0)); return; }
    const v = t.closest('.echelle button');
    if (v) { sfx('visage', Number(v.dataset.note) || 3); v.classList.add('jeu-saute'); setTimeout(() => v.classList.remove('jeu-saute'), 500); return; }
    if (t.closest('.tabbar a') || t.closest('.bascule button') || t.closest('.nav-defis .btn')) { sfx('pop'); return; }
    const en = t.closest('#enregistrer');
    if (en) {
      setTimeout(() => {
        const ok = document.getElementById('retour-ok'), txt = ok ? ok.textContent : '';
        if (/enregistr/i.test(txt) && !/Choisissez/.test(txt)) {
          const id = idPetale(), k = id + '|' + lundi();
          sfx('goutte'); pluie(null, 9); setTimeout(() => sfx('etincelle'), 500);
          if (!S.bilans[k]) { S.bilans[k] = 1; S.nBilans++; gagner(3, en, 'mute'); }
        } else if (txt) { sfx('ferme'); }
      }, 60);
    }
  });

  /* ---------- Branchement sur l'application ---------- */
  function ameliorer() {
    boutonSon();
    const h = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (app.querySelector('.acces')) return;
    if (!h) ameliorerAccueil();
    else if (h === 'petale') ameliorerPetale();
    else if (h === 'semaine' || h === 'defi') ameliorerSemaine();
  }
  new MutationObserver(ameliorer).observe(app, { childList: true });
  window.addEventListener('hashchange', () => setTimeout(ameliorer, 0));
  ameliorer();
})();
