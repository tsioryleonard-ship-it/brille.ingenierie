/* Étincelle · BRILLE
   La suite des ateliers, à la maison, parent et enfant ensemble.
   Application sans serveur : tout ce que la famille saisit reste dans son téléphone. */
(() => {
  'use strict';

  /* ---------- Outils ---------- */
  const $app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLE = 'brille-etincelle-v1';
  const jour = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const debutSemaine = (d = new Date()) => { const x = jour(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
  const dateCourte = s => { const [, m, d] = s.split('-').map(Number); return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`; };

  /* ---------- Stockage local (avec solution de repli si le téléphone le bloque) ---------- */
  let memoire = null;
  const vide = () => ({ v: 1, mode: 'parent', bilans: {}, enfant: {}, defisFaits: {}, ensembleFaits: {}, parcours: {}, famille: { parents: '', enfants: [] } });
  const charger = () => {
    if (memoire) return memoire;
    try { const brut = localStorage.getItem(CLE); memoire = brut ? Object.assign(vide(), JSON.parse(brut)) : vide(); }
    catch { memoire = vide(); }
    return memoire;
  };
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(memoire)); return true; } catch { return false; } };
  const cle = qui => (qui === 'enfant' ? 'enfant' : 'bilans');
  const bilansDe = (id, qui = 'parent') => ((charger()[cle(qui)] || {})[id] || []).slice().sort((a, b) => a.w.localeCompare(b.w));
  const dernierBilan = (id, qui = 'parent') => { const l = bilansDe(id, qui); return l.length ? l[l.length - 1] : null; };

  /* ---------- La famille : les prénoms des parents et de TOUS les enfants (aucune limite) ---------- */
  const famille = () => {
    const S = charger(), f = S.famille = (S.famille && typeof S.famille === 'object') ? S.famille : { parents: '', enfants: [] };
    if (!Array.isArray(f.enfants)) f.enfants = [];
    if (typeof f.parents !== 'string') f.parents = '';
    return f;
  };
  const jointNoms = l => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : (l[0] || ''));
  const nomsFamille = () => { const f = famille(), p = f.parents.trim(); return jointNoms([...(p ? [p] : []), ...f.enfants]); };
  const nomsCarte = pc => ((pc && pc.noms) || '').trim() || nomsFamille();       // un prénom saisi à la main sur une carte reste prioritaire
  let familleOuverte = false;

  /* ---------- Données ---------- */
  let D = { config: {}, petales: [], defis: [], formes: {} };
  const CLE_CODE = 'brille-etincelle-code';
  let ACCES = null;
  async function chargerDonnees() {
    const lire = async f => { const r = await fetch(`${f}.json`, { cache: 'no-cache' }); if (!r.ok) throw new Error(f); return r.json(); };
    const [config, formes, vitrine, acces, contenuEnc] = await Promise.all([lire('config'), lire('formes'), lire('vitrine'), lire('acces'), lire('contenu.enc')]);
    D = { config, petales: [], defis: [], formes, vitrine };
    ACCES = { acces, contenuEnc };
  }
  const codeMemorise = () => { try { return localStorage.getItem(CLE_CODE) || ''; } catch { return ''; } };
  function composer(ouverts) {                        // ouverts : liste d'identifiants de pétales ouverts
    D.petales = D.vitrine.map(v => Object.assign({}, v, D.details[v.id] || {}, { ouvert: ouverts.includes(v.id) && !!D.details[v.id] }));
    D.defis = D.petales.filter(p => p.ouvert).flatMap(p => p.defis || []).sort((a, b) => a.id.localeCompare(b.id));
  }
  /* Protection : filigrane au nom de la famille + freins au copier-coller / à l'impression (dissuasion : une capture d'écran reste possible) */
  const xmlesc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  function appliquerProtection() {
    const actif = !D.admin;
    document.body.classList.toggle('protege', actif);
    const ancien = document.getElementById('filigrane'); if (ancien) ancien.remove();
    if (!actif) return;
    const txt = `Accès : ${D.nom || 'famille accompagnée'} · BRILLE · usage personnel`;
    const f = document.createElement('div'); f.id = 'filigrane'; f.setAttribute('aria-hidden', 'true');
    const poser = police => {                          // la police Quicksand est embarquée dans l'image (une image SVG ne voit pas les polices de la page)
      const css = police ? `<style>@font-face{font-family:'QS';src:url(data:font/woff2;base64,${police}) format('woff2');font-weight:600}</style>` : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240">${css}<text x="30" y="130" transform="rotate(-24 210 120)" font-family="${police ? "'QS', " : ''}Quicksand, sans-serif" font-size="17" font-weight="600" fill="#000" fill-opacity="0.085">${xmlesc(txt)}</text></svg>`;
      f.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    };
    poser('');
    fetch('quicksand-latin-600-normal.woff2').then(r => r.arrayBuffer()).then(buf => {
      let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      poser(btoa(bin));
    }).catch(() => {});
    document.body.appendChild(f);
  }
  const champSaisie = t => t && /^(INPUT|TEXTAREA)$/.test(t.tagName);
  ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(ev => document.addEventListener(ev, e => {
    if (document.body.classList.contains('protege') && !champSaisie(e.target)) e.preventDefault();
  }));
  async function deverrouiller(code, exigerAdmin) {    // ouvre le contenu autorisé par ce code
    const r = await Acces.ouvrir(code, ACCES.acces, ACCES.contenuEnc);
    if (exigerAdmin && !r.admin) throw new Error('admin');
    if (r.fin && !r.admin && iso(new Date()) > r.fin) { const e = new Error('expire'); e.fin = r.fin; throw e; }
    D.details = r.details; D.admin = r.admin; D.nom = r.nom; D.fin = r.admin ? '' : r.fin; D.apercu = null;
    appliquerProtection();
    composer(Object.keys(r.details));
    try { localStorage.setItem(CLE_CODE, code); } catch { }
    return true;
  }
  const dateLongue = d => { const [a, m, j] = d.split('-').map(Number); return `${String(j).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`; };
  const messageAcces = x => x && x.message === 'expire'
    ? `Votre accès s'est terminé le ${dateLongue(x.fin)}. Pour le renouveler, écrivez à ${(D.config.contact || {}).email || 'BRILLE'}.`
    : '';
  function verrouiller() {
    try { localStorage.removeItem(CLE_CODE); } catch { }
    D.petales = []; D.defis = []; D.details = {}; D.admin = false; D.apercu = null;
    appliquerProtection();
    ecranCode();
  }
  function ecranCode(message, onglet) {
    document.body.classList.add('verrouille');
    const c = D.config.contact || {};
    const ing = onglet === 'ing';
    $app.innerHTML = `<section class="vue acces">
      ${motIngenieure()}
      <div class="onglets-acces" role="tablist" aria-label="Type d'accès">
        <button type="button" role="tab" id="t-fam" aria-selected="${!ing}">Accès famille</button>
        <button type="button" role="tab" id="t-ing" aria-selected="${ing}">Accès ingénieure</button>
      </div>
      <div class="carte" role="tabpanel">
        <span class="etiquette">${ing ? 'Espace conceptrice' : 'Accès famille'}</span>
        <h1>${ing ? 'Espace ingénieure' : 'Bienvenue dans Étincelle'}</h1>
        <p>${ing ? 'Réservé à la conceptrice d\'Étincelle : aperçu complet de tous les pétales et vue « comme une famille ». Entrez votre code personnel.' : (achatActif() ? 'Cette application prolonge les ateliers BRILLE. Elle est gratuite pour les familles accompagnées par un centre partenaire : entrez le code personnel remis à l\'atelier, ou reçu après votre achat.' : 'Cette application prolonge les ateliers BRILLE. Elle est réservée aux familles accompagnées : entrez le code personnel qui vous a été remis à l\'atelier.')}</p>
        <form id="form-code" autocomplete="off">
          <label for="champ-code">${ing ? 'Votre code ingénieure' : 'Votre code famille'}</label>
          <input id="champ-code" type="text" inputmode="text" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="${ing ? 'XXXX-XXXX-XXXX' : 'XXXX-XXXX'}" maxlength="16">
          <p class="erreur" id="erreur-code" role="alert">${esc(message || '')}</p>
          <button class="btn plein" type="submit" id="valider-code">Entrer</button>
        </form>
        ${!ing && D.config.codeDecouverte ? '<button type="button" class="btn plein gris" id="decouverte" style="margin-top:10px">Découvrir un extrait gratuit</button>' : ''}
        ${ing ? '' : (achatActif() ? `<p class="petit">Vous ne passez pas par un centre social ? <button type="button" class="lien" id="voir-offres">Obtenir un accès</button></p>` : `<p class="petit">Vous n'avez pas encore de code ? Écrivez à <a href="mailto:${esc(c.email || '')}">${esc(c.email || '')}</a>.</p>`)}
      </div></section>`;
    $app.querySelector('#t-fam').addEventListener('click', () => ecranCode('', 'fam'));
    $app.querySelector('#t-ing').addEventListener('click', () => ecranCode('', 'ing'));
    const voir = $app.querySelector('#voir-offres'); if (voir) voir.addEventListener('click', () => ecranAchat());
    const f = $app.querySelector('#form-code'), champ = $app.querySelector('#champ-code'), err = $app.querySelector('#erreur-code'), bt = $app.querySelector('#valider-code');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const code = champ.value.trim(); if (!code) { err.textContent = 'Saisissez votre code.'; return; }
      bt.disabled = true; bt.textContent = 'Vérification…'; err.textContent = '';
      try { await deverrouiller(code, ing); document.body.classList.remove('verrouille'); premiere = true; rendre(); }
      catch (x) { if (x.message !== 'admin' && x.message !== 'code' && x.message !== 'expire') console.error(x); err.textContent = x.message === 'expire' ? messageAcces(x) : x.message === 'admin' ? 'Ce code n\'ouvre pas l\'espace ingénieure.' : 'Ce code n\'est pas reconnu. Vérifiez-le, ou contactez BRILLE.'; bt.disabled = false; bt.textContent = 'Entrer'; }
    });
    const dec = $app.querySelector('#decouverte');
    if (dec) dec.addEventListener('click', async () => { try { await deverrouiller(D.config.codeDecouverte); document.body.classList.remove('verrouille'); premiere = true; rendre(); } catch { err.textContent = 'L\'extrait gratuit n\'est pas disponible pour le moment.'; } });
    champ.addEventListener('input', () => {
      const net = champ.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      champ.value = net.replace(/(.{4})(?=.)/g, '$1-');
    });
    champ.focus({ preventScroll: true });
  }

  /* ---------- Accès payant ---------- */
  const achatActif = () => !!(D.config.achat && D.config.achat.actif && (D.config.achat.offres || []).length);
  const liensLegaux = () => `<a href="legal.html#cgv" target="_blank" rel="noopener">Conditions générales</a> · <a href="legal.html#confidentialite" target="_blank" rel="noopener">Confidentialité</a> · <a href="legal.html#mentions" target="_blank" rel="noopener">Mentions légales</a>`;
  function htmlAchat(retour) {
    const offres = D.config.achat.offres || [];
    return `<section class="vue achat">
      <button type="button" class="retour lien" id="achat-retour">← ${retour === 'code' ? 'Retour' : 'La fleur'}</button>
      <div class="carte">
        <span class="etiquette">Obtenir un accès</span>
        <h1>Ouvrir Étincelle chez moi</h1>
        <p>Étincelle est <b>gratuite pour les familles accompagnées par un centre social partenaire</b> : leur code est remis à l'atelier. Si vous ne passez pas par un centre, vous pouvez acheter un accès.</p>
        <div class="consent">
          <label class="coche"><input type="checkbox" id="ok-cgv"> J'ai lu et j'accepte les conditions générales et la politique de confidentialité.</label>
          <label class="coche"><input type="checkbox" id="ok-retractation"> Je demande l'accès immédiat à Étincelle et je reconnais perdre mon droit de rétractation dès que mon code m'est fourni.</label>
        </div>
        <div class="offres">${offres.map(o => `<div class="offre">
          <h2>${esc(o.nom)}</h2>
          <p class="petit">${esc(o.detail || '')}</p>
          <div class="offre-prix">${esc(o.prix || '')}</div>
          ${o.id === 'solidaire' ? `<label class="coche"><input type="checkbox" class="decl-solidaire"> Je déclare sur l'honneur que le tarif standard représente une difficulté financière pour mon foyer.</label>` : ''}
          <button type="button" class="btn plein payer" data-id="${esc(o.id)}" disabled>Choisir cet accès</button>
        </div>`).join('')}</div>
        <p class="ok" id="achat-info" role="status"></p>
        <p class="petit">Votre code vous est envoyé par e-mail après le paiement. Un seul tarif solidaire par foyer.</p>
        <p class="petit liens-legaux">${liensLegaux()}</p>
      </div></section>`;
  }
  function lierAchat(retour) {
    const cgv = $app.querySelector('#ok-cgv'), ret = $app.querySelector('#ok-retractation'), decl = $app.querySelector('.decl-solidaire'), info = $app.querySelector('#achat-info');
    const maj = () => $app.querySelectorAll('.payer').forEach(b => { b.disabled = !(cgv.checked && ret.checked && (b.dataset.id !== 'solidaire' || (decl && decl.checked))); });
    $app.querySelectorAll('.achat input[type=checkbox]').forEach(x => x.addEventListener('change', maj)); maj();
    $app.querySelector('#achat-retour').addEventListener('click', () => { if (retour === 'code') ecranCode(); else location.hash = '#/'; });
    $app.querySelectorAll('.payer').forEach(b => b.addEventListener('click', () => {
      const o = (D.config.achat.offres || []).find(x => x.id === b.dataset.id); if (!o) return;
      const c = D.config.contact || {};
      if (o.lien) { window.open(o.lien, '_blank', 'noopener'); info.textContent = 'Le paiement s\'ouvre dans un nouvel onglet. Votre code vous sera envoyé par e-mail.'; }
      else {
        const corps = `Bonjour, je souhaite l'accès « ${o.nom} » (${o.prix}). J'ai lu les conditions générales et je reconnais perdre mon droit de rétractation dès que mon code m'est fourni.`;
        location.href = `mailto:${c.email || ''}?subject=${encodeURIComponent('Étincelle : ' + o.nom)}&body=${encodeURIComponent(corps)}`;
        info.textContent = 'Votre message est prêt : envoyez-le, nous vous répondons avec les moyens de paiement.';
      }
    }));
  }
  function ecranAchat() { document.body.classList.add('verrouille'); $app.innerHTML = htmlAchat('code'); lierAchat('code'); window.scrollTo(0, 0); }

  const petale = id => D.petales.find(p => p.id === id);

  /* ---------- Visages de l'échelle ---------- */
  const VISAGES = [
    { c: '#f5abaf', b: 'M12 29 Q20 21 28 29', t: 'Pas du tout' },
    { c: '#fdd5a5', b: 'M13 28 Q20 24 27 28', t: 'Un peu' },
    { c: '#f8f4b8', b: 'M13 27 L27 27', t: 'Moyen' },
    { c: '#cbe1b6', b: 'M12 25 Q20 32 28 25', t: 'Plutôt oui' },
    { c: '#a8dbeb', b: 'M11 24 Q20 36 29 24', t: 'Tout à fait' }
  ];
  const visage = i => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="${VISAGES[i].c}" stroke="#000" stroke-width="1.8"/><circle cx="14" cy="16" r="1.9" fill="#000"/><circle cx="26" cy="16" r="1.9" fill="#000"/><path d="${VISAGES[i].b}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>`;

  /* ---------- Fleur interactive (les vraies formes de la fleur QVE, tracées depuis l'image d'origine) ---------- */
  function fleurSVG(mode) {
    const qui = mode === 'enfant' ? 'enfant' : 'parent';
    const parts = D.petales.map(p => {
      const f = D.formes[p.id]; if (!f) return '';
      const b = p.ouvert ? dernierBilan(p.id, qui) : null;
      const s = b ? 0.9 + 0.03 * b.s : 0.97;
      const titre = qui === 'enfant' ? p.miroir : p.titre;
      const lab = p.ouvert ? `${titre}${b ? `, dernier bilan ${b.s} sur 5` : ', pas encore de bilan'}` : `${titre}, se découvre en atelier`;
      const t = f.trou, ic = f.icone;
      return `<a href="#/petale/${p.id}" class="petale${p.ouvert ? '' : ' ferme'}" aria-label="${esc(lab)}">
        <g class="forme" transform="translate(${f.cx} ${f.cy}) scale(${s}) translate(${-f.cx} ${-f.cy})">
          <path d="${f.d}" fill="${p.couleur}"/>
          <image href="p-${p.id}.png" x="${ic.x}" y="${ic.y}" width="${ic.w}" height="${ic.h}"${ic.rot ? ` transform="rotate(${ic.rot} ${ic.x + ic.w / 2} ${ic.y + ic.h / 2})"` : ''} style="pointer-events:none"/>
          <circle cx="${t.x}" cy="${t.y}" r="${t.r}" fill="#fff"/>
          ${!p.ouvert ? `<g transform="translate(${t.x} ${t.y}) scale(1.15)" style="pointer-events:none"><rect x="-9" y="-3" width="18" height="14" rx="3.5" fill="#8d8795"/><path d="M-5.2 -3 v-4.2 a5.2 5.2 0 0 1 10.4 0 v4.2" fill="none" stroke="#8d8795" stroke-width="3" stroke-linecap="round"/></g>` : b ? `<text x="${t.x}" y="${t.y}" text-anchor="middle" dominant-baseline="central" font-family="Quicksand, sans-serif" font-weight="600" font-size="46" fill="#000" style="pointer-events:none">${b.s}</text>` : ''}
        </g>
      </a>`;
    }).join('');
    return `<svg viewBox="30 238 1380 1392" role="group" aria-label="${qui === 'enfant' ? 'La fleur de l\'enfant' : 'La fleur du parent'} : sept pétales à explorer">
      ${parts}
      <image href="centre.png" x="546" y="734" width="352" height="352" style="pointer-events:none"/>
    </svg>`;
  }

  const etincelleDeco = '<svg class="etincelle-deco" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 4l7 24 24 7-24 7-7 24-7-24-24-7 24-7z" fill="#fff" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 50l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#cbe1b6" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>';

  const etoileDeco = (c, pos) => `<svg class="av-etoile av-${pos}" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 4l7 24 24 7-24 7-7 24-7-24-24-7 24-7z" fill="${c}" stroke="#2E2A2A" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const motIngenieure = () => `<figure class="mot">
      <figcaption>Le mot de l'ingénieure QVE</figcaption>
      <blockquote>Défendre l'épanouissement et l'harmonie familiale : redonner sa place au lien, à l'écoute et au bien-être de l'enfant, pour mieux vivre le quotidien.</blockquote>
      <p class="signature"><b>Rindra Tsiory</b><span>Fondatrice de BRILLE</span></p>
    </figure>`;

  /* ---------- Notre famille (page d'accueil) ---------- */
  function carteFamille() {
    const f = famille(), vide = !f.parents.trim() && !f.enfants.length;
    const puces = f.enfants.map((e, i) => `<li><span>${esc(e)}</span><button type="button" class="x" data-i="${i}" aria-label="Retirer ${esc(e)}">✕</button></li>`).join('');
    return `<details class="carte famille" id="carte-famille"${vide || familleOuverte ? ' open' : ''}>
      <summary>👨‍👩‍👧‍👦 Notre famille${vide ? '' : ' : ' + esc(nomsFamille())}</summary>
      <p class="petit">L'aventure se vit ensemble. Ajoutez les prénoms de toute la famille : ils seront tous sur vos cartes souvenirs, pour que personne ne soit oublié. Les prénoms restent sur ce téléphone.</p>
      <label for="fam-parents" class="aide">Prénom du ou des parents</label>
      <input type="text" id="fam-parents" maxlength="60" value="${esc(f.parents)}" placeholder="Ex. Sarah" autocomplete="off">
      <label for="fam-enfant" class="aide">Les enfants de 6 à 12 ans : autant que vous voulez</label>
      <ul class="puces-enfants" aria-label="Enfants de la famille">${puces}</ul>
      <div class="fam-ajout"><input type="text" id="fam-enfant" maxlength="24" placeholder="Prénom d'un enfant" autocomplete="off"><button type="button" class="btn plein" id="fam-ajouter">Ajouter</button></div>
      <p class="ok" id="fam-ok" role="status"></p>
    </details>`;
  }
  const txtBoutonEnfant = () => (famille().enfants.length > 1 ? 'La fleur des enfants' : 'Sa fleur d\'enfant');
  const txtLegende = mode => (mode === 'enfant'
    ? (famille().enfants.length > 1 ? 'Voici la fleur de vos enfants. Touchez un pétale pour le vivre avec eux.' : 'Voici la fleur de votre enfant. Touchez un pétale pour le vivre avec lui.')
    : 'Touchez un pétale pour l\'explorer. Plus il est grand, mieux vous vous y sentez.');
  function lierFamille() {
    const zone = $app.querySelector('#carte-famille'); if (!zone) return;
    const maj = () => {
      const be = $app.querySelector('.bascule [data-mode="enfant"]'); if (be) be.textContent = txtBoutonEnfant();
      const lg = $app.querySelector('.fleur-carte .legende'); if (lg) lg.textContent = txtLegende(charger().mode === 'enfant' ? 'enfant' : 'parent');
    };
    const redessiner = () => { familleOuverte = true; zone.outerHTML = carteFamille(); maj(); lierFamille(); };
    zone.querySelector('#fam-parents').addEventListener('input', e => { famille().parents = e.target.value.slice(0, 60); sauver(); });
    zone.querySelector('#fam-parents').addEventListener('change', () => { familleOuverte = true; const s = zone.querySelector('summary'); if (s) s.textContent = '👨‍👩‍👧‍👦 Notre famille' + (nomsFamille() ? ' : ' + nomsFamille() : ''); });
    const ajouter = () => {
      const champ = zone.querySelector('#fam-enfant'), nom = champ.value.trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!nom) return;
      famille().enfants.push(nom);
      const ok = sauver(); redessiner();
      const c = $app.querySelector('#fam-enfant'); if (c) c.focus({ preventScroll: true });
      const o = $app.querySelector('#fam-ok'); if (o) o.textContent = ok ? `${nom} est dans l'aventure !` : 'Impossible d\'enregistrer sur ce téléphone.';
    };
    zone.querySelector('#fam-ajouter').addEventListener('click', ajouter);
    zone.querySelector('#fam-enfant').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } });
    zone.querySelectorAll('.puces-enfants .x').forEach(b => b.addEventListener('click', () => { famille().enfants.splice(Number(b.dataset.i), 1); sauver(); redessiner(); }));
  }

  /* ---------- Vues ---------- */
  function vueAccueil() {
    const S = charger(), mode = S.mode === 'enfant' ? 'enfant' : 'parent';
    const defi = defiCourant();
    const lignes = D.petales.map(p => {
      const b = p.ouvert ? dernierBilan(p.id, mode) : null;
      const titre = mode === 'enfant' ? p.miroir : p.titre, ss = p.ouvert ? (mode === 'enfant' ? p.miroirSous : p.sousTitre) : '🔒 Se découvre en atelier';
      return `<li><a class="ligne-petale${p.ouvert ? '' : ' ferme'}" href="#/petale/${p.id}" style="background:${p.couleur}">
        <span class="pastille"><img src="p-${p.id}.png" alt="" width="42" height="42"></span>
        <span class="txt"><strong>${esc(titre)}</strong><small>${esc(ss)}</small></span>
        ${b ? `<span class="score" aria-label="Dernier bilan ${b.s} sur 5">${b.s}</span>` : ''}
      </a></li>`;
    }).join('');
    const pDefi = defi ? petale(defi.petale) : null;
    return `<section class="vue">
      ${motIngenieure()}
      <aside class="aventure-banniere" aria-label="L'aventure BRILLE commence maintenant">
        ${etoileDeco('#f49f4c', 'g')}${etoileDeco('#a8dbeb', 'd')}
        <h2 class="av-titre"><span class="av-mot">L'aventure</span><span class="av-brille" aria-label="BRILLE">${[...'BRILLE'].map((l, i) => `<b aria-hidden="true" style="--c:${['#f49f4c', '#a4c2e7', '#f5abaf', '#cbe1b6', '#b8aed7', '#a8dbeb'][i]};--i:${i}">${l}</b>`).join('')}</span><span class="av-mot">commence maintenant !</span></h2>
      </aside>
      <div class="hero-accueil">
        <img class="logo-etincelle" src="logo-etincelle.png" alt="" width="320" height="320">
        <span class="etiquette">La suite des ateliers</span>
        <h1>Étincelle</h1>
        <p>${esc(D.config.messageAccueil)}</p>
        ${D.config.messageHorsAtelier ? `<p class="hors-atelier">${esc(D.config.messageHorsAtelier)}</p>` : ''}
      </div>

      <div class="grille">
      <div class="col-gauche">
      ${carteFamille()}
      <div class="fleur-carte">
        <div class="bascule" role="group" aria-label="Choisir la fleur">
          <button type="button" data-mode="parent" aria-pressed="${mode === 'parent'}">Ma fleur de parent</button>
          <button type="button" data-mode="enfant" aria-pressed="${mode === 'enfant'}">${txtBoutonEnfant()}</button>
        </div>
        <div class="fleur-bloc">${fleurSVG(mode)}</div>
        <p class="legende">${txtLegende(mode)}</p>
        <p class="legende ensemble">🌸 Chacun peut remplir sa fleur, mais le plus beau, c'est de vivre l'aventure ensemble : c'est comme ça que le lien se crée.</p>
      </div>
      ${defi ? `<a class="carte teinte" href="#/semaine" style="display:block;text-decoration:none;background:${pDefi?.couleur || 'var(--jaune)'}">
        <span class="etiquette">Cette semaine</span>
        <h3 style="margin-bottom:.25em">${esc(defi.titre)}</h3>
        <p style="margin:0">${esc(defi.consigne.split('. ')[0])}.</p></a>` : ''}
      </div>

      <div class="col-droite">

      <h2 class="titre-section"><span class="surligne" style="--hl:var(--vert)">Les sept pétales</span></h2>
      <ul class="liste-petales">${lignes}</ul>
      <p class="petit">Les pétales en couleur sont ceux que vous avez vécus en atelier. Les autres s'ouvrent au fil des ateliers : chez BRILLE, le lien se crée d'abord ensemble, avant de se prolonger à la maison.</p>
      </div>
      </div>
    </section>`;
  }
  function lierAccueil() {
    $app.querySelectorAll('.bascule button').forEach(b => b.addEventListener('click', () => {
      charger().mode = b.dataset.mode; sauver(); rendre();
    }));
    lierFamille();
  }

  const nomEnfant = (i, k) => famille().enfants[i] || (k === 1 ? 'Mon enfant' : 'Enfant ' + (i + 1));
  function bilanBloc(qui, p, actuel) {
    const parent = qui === 'parent', k0 = (actuel && actuel.k) || Math.max(1, famille().enfants.length);
    const echelle = VISAGES.map((v, k) => `<button type="button" data-note="${k + 1}" aria-pressed="${actuel && actuel.s === k + 1}" aria-label="${k + 1} sur 5, ${v.t}">${visage(k)}<span>${v.t}</span></button>`).join('');
    return `<div class="bloc-bilan" data-qui="${qui}">
      <span class="etiquette">${parent ? 'Moi, parent' : (famille().enfants.length > 1 ? 'Mes enfants' : 'Mon enfant')}</span>
      ${parent ? '' : '<p class="petit" style="margin:0 0 6px">Chaque enfant choisit lui-même son visage, ou posez-lui la question : une ligne par enfant.</p>'}
      <p style="margin:0"><b>${esc(parent ? p.question : p.questionEnfant)}</b></p>
      ${parent ? `<div class="echelle" role="group" aria-label="Mon bilan sur 5">${echelle}</div>` : '<div class="rangs" id="rangs"></div>'}
      ${parent ? '' : `<div class="nb-enfants"><label for="nb-enfants">Combien d'enfants ont répondu ?</label>
        <div class="stepper"><button type="button" id="nb-moins" aria-label="Un enfant de moins">−</button><input id="nb-enfants" type="number" inputmode="numeric" min="1" max="99" value="${k0}"><button type="button" id="nb-plus" aria-label="Un enfant de plus">+</button></div>
        <p class="petit" style="margin:0">Vous avez plusieurs enfants ? C'est bien de le faire en groupe : c'est ça aussi, une famille épanouie ensemble.</p></div>`}
    </div>`;
  }
  function graphique(id, qui, titre) {
    const recents = bilansDe(id, qui).slice(-8);
    if (!recents.length) return '';
    return `<h3 style="margin-top:6px">${titre}</h3><div class="histo-wrap"><div class="historique" aria-label="${titre}">${recents.map(b => `<div class="barre" style="height:${b.s * 17}px" title="${dateCourte(b.d)} : ${b.s}/5"><span>${dateCourte(b.d)}</span></div>`).join('')}</div></div>`;
  }

  function vuePetaleFerme(p) {
    const c = D.config.contact || {};
    return `<section class="vue" style="--puce:${p.couleur}">
      <a class="retour" href="#/">← La fleur</a>
      <div class="hero-petale" style="background:${p.couleur}">
        <div class="icone"><img src="p-${p.id}.png" alt=""></div>
        <h1>${esc(p.titre)}</h1>
        <p class="ss">${esc(p.sousTitre)}</p>
      </div>
      <div class="carte">
        <span class="etiquette">🔒 À découvrir en atelier</span>
        <h2>Ce pétale se vit d'abord ensemble</h2>
        <p>Chez BRILLE, le lien passe avant tout. Ce pétale se découvre en atelier, avec d'autres parents et avec votre enfant : c'est là qu'il prend tout son sens. Étincelle vous aidera ensuite à le prolonger à la maison.</p>
        <p>Vous l'avez déjà vécu en atelier et il n'est pas encore ouvert ? Écrivez-nous, nous l'ajouterons à votre accès.</p>
        <a class="btn plein" href="mailto:${esc(c.email || '')}?subject=${encodeURIComponent('Étincelle : ouvrir un pétale')}">Écrire à BRILLE</a>
        ${achatActif() ? `<p style="margin-top:18px">Vous ne passez pas par un centre social ? Vous pouvez ouvrir ce pétale ou la fleur complète.</p><a class="btn discret plein" href="#/acces">Voir les accès</a>` : ''}
      </div>
    </section>`;
  }

  function vuePetale(id) {
    const p = petale(id);
    if (!p) return vueIntrouvable();
    if (!p.ouvert) return vuePetaleFerme(p);
    const ouverts = D.petales.filter(x => x.ouvert);
    const i = ouverts.indexOf(p), suivant = ouverts[(i + 1) % ouverts.length];
    const sem = debutSemaine();
    const actP = bilansDe(id, 'parent').find(b => b.w === sem), actE = bilansDe(id, 'enfant').find(b => b.w === sem);
    const e = p.ensemble;
    const fait = !!charger().ensembleFaits[id];
    const notes = bilansDe(id, 'parent').filter(b => b.n).slice(-3).reverse().map(b => `<li><time>${dateCourte(b.d)}</time>${esc(b.n)}</li>`).join('');
    return `<section class="vue" style="--puce:${p.couleur}">
      <a class="retour" href="#/">← La fleur</a>
      <div class="grille2"><div>
      <div class="hero-petale" style="background:${p.couleur}">
        <div class="icone"><img src="p-${p.id}.png" alt=""></div>
        <h1>${esc(p.titre)}</h1>
        <p class="ss">${esc(p.sousTitre)}</p>
        <p class="miroir">Côté enfant, ce pétale s'appelle : « ${esc(p.miroir)} » (${esc(p.miroirSous.toLowerCase())})</p>
      </div>

      ${e ? `<div class="carte ensemble teinte" style="background:${p.couleur}">
        <span class="etiquette">À faire ensemble</span>
        <h2>${esc(e.titre)}</h2>
        <div class="meta"><span>⏱ ${esc(e.duree)}</span><span>Il vous faut : ${esc(e.materiel)}</span></div>
        <ol class="etapes">${e.etapes.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="parler"><b>Pour en parler ensuite</b><ul>${e.enParler.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <label class="coche"><input type="checkbox" id="fait" ${fait ? 'checked' : ''}> Nous l'avons fait ensemble</label>
      </div>` : ''}

      ${p.parcours ? `<div class="carte parcours teinte" id="parcours" style="background:${p.couleur}">${parcoursHtml(p)}</div>` : ''}

      </div><div>
      <div class="carte" id="bilan">
        <h2>Notre bilan de la semaine</h2>
        ${bilanBloc('parent', p, actP)}
        ${bilanBloc('enfant', p, actE)}
        <label for="note" class="aide">Un mot pour nous, si vous en avez envie (facultatif, il reste sur votre téléphone)</label>
        <textarea id="note" maxlength="300" placeholder="Ce qui a aidé, ce qui a été difficile…">${esc(actP?.n || actE?.n || '')}</textarea>
        <button class="btn plein" id="enregistrer" type="button" style="margin-top:14px">Enregistrer notre bilan</button>
        <button class="btn" id="imprimer-bilan" type="button" style="margin-top:10px">🖨️ Imprimer le bilan de la semaine</button>
        <p class="petit" style="margin:8px 0 0">Un bilan par semaine, à garder : chaque semaine peut être différente. Imprimez-le ou enregistrez-le en PDF pour l'archiver.</p>
        <p class="ok" id="retour-ok" role="status"></p>
        ${graphique(id, 'parent', 'Mon évolution')}
        ${graphique(id, 'enfant', 'Son évolution')}
        ${notes ? `<ul class="liste-notes">${notes}</ul>` : ''}
      </div>

      <div class="carte"><h2>Pour y voir plus clair</h2><p style="margin:0">${esc(p.intro)}</p></div>
      <div class="carte"><h2>Petites pratiques à essayer</h2><ul class="pratiques">${p.pratiques.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="carte"><h3>Une phrase à essayer</h3><p class="phrase">${esc(p.phrase)}</p>${p.note ? `<div class="note-soutien">${esc(p.note)}</div>` : ''}</div>
      </div></div>
      ${suivant && suivant !== p ? `<a class="btn discret plein" href="#/petale/${suivant.id}">Pétale suivant : ${esc(suivant.titre)} →</a>` : ''}
    </section>`;
  }

  /* ---------- Parcours d'un mois (4 semaines, suivi dans le téléphone) ---------- */
  const JOUR = 86400000;
  const parcoursDe = id => { const S = charger(); S.parcours = S.parcours || {}; return S.parcours[id] || (S.parcours[id] = { debut: '', sem: {}, garde: '', fini: '', nb: 0 }); };
  /* L'aventure BRILLE : un pétale par mois, dans cet ordre. Pour changer l'ordre, modifiez cette liste. */
  const ORDRE = ['organisation', 'emotions', 'apprentissages', 'liens', 'droits', 'equilibre', 'briller'];
  const parcoursFini = id => { const pc = (charger().parcours || {})[id]; return !!(pc && (pc.nb > 0 || pc.fini || Object.keys(pc.sem || {}).length === 4)); };
  const petalesAventure = () => ORDRE.map(i => petale(i)).filter(q => q && q.ouvert && q.parcours);   // ceux que la famille peut vivre
  function precedentAVivre(id) {                         // le pétale à terminer avant celui-ci (jamais pour l'accès ingénieure)
    return null;                                       // pas de verrou entre pétales : chaque famille choisit son ordre
  }
  const semCourante = pc => { for (let n = 1; n <= 4; n++) if (!pc.sem[n]) return n; return 4; };
  function parcoursHtml(p) {
    const pr = p.parcours, pc = parcoursDe(p.id), faites = Object.keys(pc.sem).length, cur = semCourante(pc);
    const garde = pr.garde || {};
    const barre = `<div class="pc-barre" role="img" aria-label="${faites} semaine(s) sur 4 vécue(s)">${[1, 2, 3, 4].map(n => `<i class="${pc.sem[n] ? 'ok' : ''}"></i>`).join('')}</div>`;
    const entete = `<span class="etiquette">Parcours d'un mois</span><h2>${esc(pr.titre)}</h2><p class="pc-intro">${esc(pr.intro)}</p>`;
    const aventure = petalesAventure(), rang = aventure.findIndex(q => q.id === p.id) + 1, nbf = aventure.filter(q => parcoursFini(q.id)).length;
    const cadre = aventure.length > 1 ? `<p class="pc-aventure">🗺️ Aventure BRILLE · ${nbf} pétale${nbf > 1 ? 's' : ''} terminé${nbf > 1 ? 's' : ''} sur ${aventure.length}</p>` : '';
    if (!pc.debut) {
      const avant = precedentAVivre(p.id);
      if (avant) return `${entete}${cadre}<div class="pc-verrou-petale"><span class="pc-num" aria-hidden="true">🔒</span><p>Ce parcours s'ouvre quand vous aurez terminé le mois précédent de votre aventure : <b>« ${esc(avant.parcours.titre)} »</b> (pétale « ${esc(avant.titre)} »).</p></div><a class="btn plein" href="#/petale/${esc(avant.id)}">Aller au mois en cours</a>`;
      return `${entete}${cadre}<p class="petit">4 semaines à vivre à deux, une mission par semaine. Une semaine s'ouvre quand la précédente a été vécue : prenez le temps qu'il faut, sans pression.</p><button type="button" class="btn plein" id="pc-debut">Commencer notre mois</button>`;
    }
    const sem = pr.semaines.map((w, i) => {
      const n = i + 1, fait = pc.sem[n], ouverte = n === 1 || !!pc.sem[n - 1];
      if (!ouverte) return `<div class="pc-sem verrou"><div class="pc-lock"><span class="pc-num" aria-hidden="true">🔒</span><span><b>Semaine ${n}</b> · ${esc(w.titre)}<br><small>Se débloque quand la semaine ${n - 1} est vécue ensemble</small></span></div></div>`;
      return `<details class="pc-sem${fait ? ' fait' : ''}" data-n="${n}" ${n === cur && !fait ? 'open' : ''}>
        <summary><span class="pc-num">${fait ? '✓' : n}</span><span><b>Semaine ${n}</b> · ${esc(w.titre)}${n === cur && !fait ? ' <em>(cette semaine)</em>' : ''}</span></summary>
        <p class="pc-mission">${esc(w.mission)}</p>
        ${fait ? '' : `<button type="button" class="btn plein pc-lancer" data-n="${n}">🎮 Lancer la mission <small>(${w.etapes.length} étapes)</small></button><p class="jeu-aide">Ou lisez les étapes, vivez-les à votre rythme, puis cochez la case.</p>`}
        <ol class="etapes">${w.etapes.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="parler"><b>Pour en parler ensuite</b><ul>${w.enParler.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <label class="coche"><input type="checkbox" class="pc-fait" data-n="${n}" ${fait ? 'checked' : ''} ${pc.sem[n + 1] ? 'disabled' : ''}> Nous l'avons vécue ensemble</label>
      </details>`;
    }).join('');
    const fini = faites === 4;
    const souvenir = fini ? `<div class="pc-souvenir"><span class="etiquette">Notre carte souvenir 🏅</span>
      <div class="pc-med"><img src="p-${esc(p.id)}.png" alt=""><div><b>${esc(pr.titre)}</b><br>Vécu ensemble du ${dateCourte(pc.debut)} au ${dateCourte(pc.fini || pc.debut)}${pc.nb > 1 ? ` · parcours n°${pc.nb}` : ''}</div></div>
      ${nomsCarte(pc) ? `<p class="pc-noms">${esc(nomsCarte(pc))}</p>` : ''}
      <p>4 semaines pour vous retrouver, vous écouter et mieux vous comprendre. L'harmonie et l'épanouissement se vivent au quotidien : vous venez de le vivre ensemble.</p></div>
      <div class="pc-impr"><button type="button" class="btn plein" id="pc-carte">🖨️ Imprimer mon pétale à coller</button>
        <button type="button" class="btn" id="pc-affiche">🌸 Imprimer ma fleur d'aventure</button>
        ${parcoursTermines().length > 1 ? '<button type="button" class="btn" id="pc-tous">🖨️ Tous mes pétales gagnés (1 feuille)</button>' : ''}
        <p class="petit">La fleur d'aventure (A4) s'imprime une seule fois. À chaque parcours terminé, imprimez votre pétale : découpez-le et collez-le à sa place.</p></div>
      <button type="button" class="btn gris" id="pc-reprendre">Recommencer un nouveau mois</button>` : '';
    const rituel = fini || pc.garde ? `<div class="pc-garde"><span class="etiquette">Ce que nous gardons</span><h3>${esc(garde.titre || 'Notre rituel')}</h3>
      <p>${esc(garde.idee || '')}</p>
      <label for="pc-garde" class="aide">${esc(garde.invite || 'Notre rituel')}</label>
      <textarea id="pc-garde" maxlength="300" placeholder="Écrivez-le avec votre enfant…">${esc(pc.garde)}</textarea>
      ${fini ? `<label for="pc-noms" class="aide">Les prénoms de toute la famille, parents et tous les enfants, pour la carte souvenir</label><input type="text" id="pc-noms" maxlength="240" value="${esc(nomsCarte(pc))}" placeholder="Ex. Sarah, Léo et Inès">` : ''}
      <button type="button" class="btn" id="pc-enreg">Garder</button><p class="ok" id="pc-ok" role="status"></p></div>` : '';
    return `${entete}${cadre}${barre}<p class="petit">${faites} semaine${faites > 1 ? 's' : ''} sur 4 · commencé le ${dateCourte(pc.debut)}</p>${sem}${souvenir}${rituel}`;
  }
  function lierParcours(id) {
    const zone = $app.querySelector('#parcours'); if (!zone) return;
    const p = petale(id);
    const redessiner = () => { zone.innerHTML = parcoursHtml(p); lierParcours(id); };
    const b = zone.querySelector('#pc-debut');
    if (b) b.addEventListener('click', () => { if (precedentAVivre(id)) return; const pc = parcoursDe(id); pc.debut = iso(new Date()); sauver(); redessiner(); });
    zone.querySelectorAll('.pc-fait').forEach(c => c.addEventListener('change', () => {
      const pc = parcoursDe(id), n = c.dataset.n;
      if (c.checked) pc.sem[n] = iso(new Date()); else delete pc.sem[n];
      if (Object.keys(pc.sem).length === 4 && !pc.fini) { pc.fini = iso(new Date()); pc.nb = (pc.nb || 0) + 1; }
      else if (Object.keys(pc.sem).length < 4) pc.fini = '';
      sauver(); redessiner();
    }));
    const g = zone.querySelector('#pc-enreg');
    if (g) g.addEventListener('click', () => {
      const pc = parcoursDe(id);
      pc.garde = zone.querySelector('#pc-garde').value.trim().slice(0, 300);
      const nm = zone.querySelector('#pc-noms'); if (nm) { const v = nm.value.trim().slice(0, 240); pc.noms = v === nomsFamille() ? '' : v; }
      const ok = sauver();
      if (nm) { redessiner(); const o = zone.querySelector('#pc-ok'); if (o) o.textContent = ok ? 'Gardé sur votre téléphone.' : 'Impossible d\'enregistrer sur ce téléphone.'; }
      else zone.querySelector('#pc-ok').textContent = ok ? 'Rituel gardé sur votre téléphone.' : 'Impossible d\'enregistrer sur ce téléphone.';
    });
    const bc = zone.querySelector('#pc-carte'); if (bc) bc.addEventListener('click', () => ouvrirImpression('carte', id));
    const bt = zone.querySelector('#pc-tous'); if (bt) bt.addEventListener('click', () => ouvrirImpression('petales', id));
    const ba = zone.querySelector('#pc-affiche'); if (ba) ba.addEventListener('click', () => ouvrirImpression('affiche', id));
    const r = zone.querySelector('#pc-reprendre');
    if (r) r.addEventListener('click', () => {
      if (!confirm('Recommencer un nouveau mois ? Votre carte souvenir et votre rituel sont gardés.')) return;
      const pc = parcoursDe(id); pc.sem = {}; pc.fini = ''; pc.debut = iso(new Date()); sauver();
      document.dispatchEvent(new CustomEvent('brille:parcours-reset', { detail: { id } })); redessiner();
    });
  }

  /* ---------- Impression : carte souvenir et fleur à collectionner (A4) ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const MM = 190 / 1380;                                  // mm par unité de la fleur : sur l'affiche, la fleur fait 190 mm de large
  const _bb = {};
  function bboxPetale(id) {
    if (_bb[id]) return _bb[id];
    const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('style', 'position:absolute;left:-9999px;width:0;height:0');
    const pa = document.createElementNS(NS, 'path'); pa.setAttribute('d', D.formes[id].d); sv.appendChild(pa); document.body.appendChild(sv);
    const b = pa.getBBox(); sv.remove(); return (_bb[id] = { x: b.x, y: b.y, w: b.width, h: b.height });
  }
  const coupe = (t, max = 15, nl = 3) => { const m = String(t || '').split(/\s+/).filter(Boolean), l = []; let c = ''; m.forEach(w => { if ((c + ' ' + w).trim().length > max && c) { l.push(c); c = w; } else c = (c + ' ' + w).trim(); }); if (c) l.push(c); return l.slice(0, nl); };
  function lignesNoms(t) {                                // les prénoms de toute la famille, sans jamais en couper : la taille s'adapte
    t = String(t || '').trim() || 'Notre famille';
    const NIV = [{ fs: 32, max: 13, nl: 2 }, { fs: 27, max: 14, nl: 3 }, { fs: 22, max: 15, nl: 5 }, { fs: 19, max: 16, nl: 7 }, { fs: 16, max: 18, nl: 9 }, { fs: 14, max: 20, nl: 12 }];
    for (let i = 0; i < NIV.length; i++) { const n = NIV[i], l = coupe(t, n.max, 99); if (l.length <= n.nl) return { l, fs: n.fs, niv: i }; }
    const n = NIV[NIV.length - 1]; return { l: coupe(t, n.max, 99), fs: n.fs, niv: NIV.length - 1 };
  }
  function autocollant(p, pc) {                           // le pétale à découper, à l'échelle exacte de la fleur à collectionner
    const f = D.formes[p.id], b = bboxPetale(p.id), pad = 10, ic = f.icone;
    const { l: noms, fs, niv } = lignesNoms(nomsCarte(pc)), k = niv >= 2 ? 0.42 : 0.62, ny = niv >= 2 ? 26 : 78;
    const iw = ic.w * k, ih = ic.h * k;
    return `<svg class="impr-colle" xmlns="${NS}" viewBox="${b.x - pad} ${b.y - pad} ${b.w + 2 * pad} ${b.h + 2 * pad}" style="width:${((b.w + 2 * pad) * MM).toFixed(1)}mm;height:${((b.h + 2 * pad) * MM).toFixed(1)}mm" role="img" aria-label="Pétale à découper">
      <path d="${f.d}" fill="${p.couleur}" stroke="#2E2A2A" stroke-width="5" stroke-linejoin="round"/>
      <text x="${f.cx}" y="${f.cy - 92}" text-anchor="middle" font-family="Gruppo, Quicksand, sans-serif" font-size="46" font-weight="700" fill="#2E2A2A">BRAVO !</text>
      <image href="p-${esc(p.id)}.png" x="${f.cx - iw / 2}" y="${f.cy - 78}" width="${iw}" height="${ih}"/>
      ${noms.map((t, i) => `<text x="${f.cx + (niv >= 2 ? 14 : 0)}" y="${f.cy + ny + i * (fs + 4)}" text-anchor="middle" font-family="Quicksand, sans-serif" font-size="${fs}" font-weight="700" fill="#2E2A2A">${esc(t)}</text>`).join('')}
    </svg>`;
  }
  function htmlCarte(p, pc) {                             // carte légère : le pétale à découper et à coller sur la fleur d'aventure
    const pr = p.parcours, noms = nomsCarte(pc) || 'Notre famille';
    return `<section class="impr-feuille cert cl" style="--pc:${p.couleur}">
      <div class="cert-cadre">
        <div class="cert-bandeau">${D.petales.map(x => `<i style="background:${x.couleur}"></i>`).join('')}</div>
        <img class="cl-logo" src="logo-brille.png" alt="BRILLE">
        <h1>Bravo !</h1>
        <p class="cl-sous">Un pétale de plus sur votre fleur d'aventure BRILLE</p>
        <div class="cl-colle">${autocollant(p, pc)}</div>
        <p class="cl-ciseaux">✂ Découpez le long du trait et collez-le sur l'emplacement « ${esc(p.titre)} » de votre fleur.</p>
        <p class="cl-recap"><b>${esc(noms)}</b> ont vécu ensemble, du ${dateCourte(pc.debut)} au ${dateCourte(pc.fini || pc.debut)}, le parcours <b>« ${esc(pr.titre)} »</b>.<br>L'harmonie et l'épanouissement se vivent au quotidien.</p>
        <div class="cl-carnet"><b>Notre souvenir du mois</b>
          <span>Ce qui a changé chez nous : <i></i></span>
          <span>Ce que nous gardons${pc.garde ? ' : ' + esc(pc.garde) : ' : '} ${pc.garde ? '' : '<i></i>'}</span></div>
      </div></section>`;
  }
  const parcoursTermines = () => ORDRE.map(i => petale(i)).filter(q => q && q.parcours && Object.keys(parcoursDe(q.id).sem || {}).length === 4);
  function htmlPetales() {                                // tous les pétales gagnés, sur une seule feuille
    const l = parcoursTermines();
    return `<section class="impr-feuille pl"><h1>Mes pétales gagnés</h1>
      <p class="aff-sous">Découpez chaque pétale le long du trait et collez-le à sa place sur votre fleur d'aventure BRILLE.</p>
      <div class="pl-grille">${l.map(q => `<figure>${autocollant(q, parcoursDe(q.id))}<figcaption>${esc(q.titre)}</figcaption></figure>`).join('')}</div>
      <p class="aff-sous pl-pied">Un pétale à la fois, dans l'ordre que vous choisissez : la fleur se complète à votre rythme.</p></section>`;
  }
  function htmlAffiche() {
    const VB = '30 238 1380 1392';
    const places = D.petales.map(p => {
      const f = D.formes[p.id]; if (!f) return '';
      const l = coupe(p.titre, 18, 3);
      return `<g><path d="${f.d}" fill="${p.couleur}" fill-opacity=".22" stroke="#8d8795" stroke-width="5" stroke-dasharray="16 11" stroke-linejoin="round"/>
        ${l.map((t, i) => `<text x="${f.cx}" y="${f.cy - 10 + i * 38}" text-anchor="middle" font-family="Quicksand, sans-serif" font-size="30" font-weight="600" fill="#6f6767">${esc(t)}</text>`).join('')}</g>`;
    }).join('');
    const leg = ORDRE.map(i => D.petales.find(q => q.id === i)).filter(Boolean).map(p => `<li><i style="border-color:${p.couleur}"></i>${esc(p.titre)}</li>`).join('');
    return `<section class="impr-feuille aff">
      <h1>Notre aventure BRILLE</h1>
      <p class="aff-sous">7 pétales, un parcours d'un mois pour chacun, dans l'ordre que l'on choisit. À chaque mois terminé, on imprime son pétale et on le colle ici.</p>
      <svg viewBox="${VB}" style="width:190mm;height:${(1392 * MM).toFixed(1)}mm" role="img" aria-label="Fleur d'aventure à compléter">${places}<image href="centre.png" x="546" y="734" width="352" height="352"/></svg>
      <div class="aff-pied"><p class="aff-nom">Notre famille : <i>${esc(nomsFamille())}</i></p><p class="aff-sous">Quand la fleur est complète, elle brille ! Cochez chaque pétale collé :</p><ul class="aff-leg">${leg}</ul></div></section>`;
  }
  /* ---------- Bilan de la semaine, imprimable et archivable ---------- */
  const plusJours = (w, n) => { const [a, m, j] = w.split('-').map(Number), d = new Date(a, m - 1, j); d.setDate(d.getDate() + n); return iso(d); };
  function htmlBilan(p, data) {
    const noms = nomsFamille(), sem = data.sem, k = Math.max(1, data.k || 1);
    const gros = s => s ? `<div class="bil-visage">${visage(s - 1)}<b>${s} sur 5</b><span>${VISAGES[s - 1].t}</span></div>` : '<div class="bil-visage vide"><b>—</b><span>Pas de réponse cette semaine</span></div>';
    const vv = (data.v || []).slice(0, k);
    const rangsBil = vv.length > 1 ? `<div class="bil-rangs">${vv.map((x, i) => `<div class="bil-rang">${x ? visage(x - 1) : '<div class="bil-rien">—</div>'}<b>${esc(nomEnfant(i, k))}</b><span>${x ? VISAGES[x - 1].t : 'Pas de réponse'}</span></div>`).join('')}</div>` : gros(data.enfant);
    const avant = {};
    bilansDe(p.id, 'parent').forEach(b => { if (b.w !== sem) (avant[b.w] = avant[b.w] || {}).p = b; });
    bilansDe(p.id, 'enfant').forEach(b => { if (b.w !== sem) (avant[b.w] = avant[b.w] || {}).e = b; });
    const lignes = Object.keys(avant).sort().reverse().slice(0, 8).map(w => { const a = avant[w]; return `<tr><td>${dateLongue(w)}</td><td>${a.p ? a.p.s + ' sur 5' : '—'}</td><td>${a.e ? a.e.s + ' sur 5' + (a.e.k > 1 ? ' · ' + a.e.k + ' enfants' : '') : '—'}</td></tr>`; }).join('');
    return `<section class="impr-feuille bil" style="--pc:${p.couleur}">
      <div class="bil-cadre">
        <div class="cert-bandeau">${D.petales.map(x => `<i style="background:${x.couleur}"></i>`).join('')}</div>
        <div class="bil-tete"><img class="bil-logo" src="logo-brille.png" alt="BRILLE"><img class="bil-icone" src="p-${esc(p.id)}.png" alt=""></div>
        <p class="bil-sur">Notre bilan de la semaine</p>
        <h1>${esc(p.titre)}</h1>
        <p class="bil-date">Semaine du ${dateLongue(sem)} au ${dateLongue(plusJours(sem, 6))}</p>
        <p class="bil-famille"><b>Notre famille :</b> ${esc(noms)}</p>
        <div class="bil-duo">
          <div class="bil-bloc"><span class="bil-tag">Moi, parent</span><p class="bil-q">${esc(p.question)}</p>${gros(data.parent)}</div>
          <div class="bil-bloc"><span class="bil-tag">${k > 1 ? 'Mes enfants · ' + k + ' ont répondu' : 'Mon enfant'}</span><p class="bil-q">${esc(p.questionEnfant)}</p>${rangsBil}</div>
        </div>
        <div class="bil-note"><b>Un mot pour nous</b>${data.note ? `<p>${esc(data.note)}</p>` : ''}<i></i><i></i></div>
        <div class="bil-histo"><b>Les semaines précédentes</b>${lignes ? `<table><thead><tr><th>Semaine du</th><th>Parent</th><th>Enfant(s)</th></tr></thead><tbody>${lignes}</tbody></table>` : '<p>Premier bilan de ce pétale : bravo, c\'est le début de votre histoire !</p>'}</div>
        <p class="bil-pied">Un bilan par semaine, à garder : chaque semaine peut être différente.${k > 1 ? ' Plusieurs enfants : le faire en groupe, c\'est ça aussi, une famille épanouie ensemble.' : ''}<br>BRILLE · Étincelle · usage personnel</p>
      </div></section>`;
  }
  function ouvrirImpression(type, id, data) {
    if (document.querySelector('.impr-ov')) return;
    const p = petale(id), pc = parcoursDe(id);
    const pg = document.createElement('style'); pg.id = 'impr-page'; pg.textContent = '@page { size: A4; margin: 0 }'; document.head.appendChild(pg);
    const ov = document.createElement('div'); ov.className = 'impr-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="impr-bar">
        ${type === 'carte' ? `<label>Prénoms de la famille sur la carte <input type="text" id="impr-noms" maxlength="240" value="${esc(nomsCarte(pc))}" placeholder="Ex. Sarah, Léo et Inès"></label>` : '<span></span>'}
        <button type="button" class="btn plein" id="impr-go">🖨️ Imprimer</button><button type="button" class="btn gris" id="impr-x">Fermer</button></div>
      <p class="impr-aide">${type === 'bilan' ? 'Pour l\'archiver : dans la fenêtre d\'impression, choisissez « Enregistrer au format PDF », ou imprimez sur du papier A4 et rangez la feuille dans un classeur. ' : 'Imprimez sur du papier A4, de préférence épais. '}Dans la fenêtre d'impression, choisissez « Marges : aucune » et cochez « Graphiques d'arrière-plan » pour garder les couleurs.</p>
      <div class="impr-feuilles"></div>`;
    document.body.appendChild(ov); document.body.classList.add('impr-on');
    const zone = ov.querySelector('.impr-feuilles');
    const ajuster = () => {                               // réduit le milieu de la carte si les textes sont longs, pour que tout tienne sur la page
      const cad = zone.querySelector('.cert-cadre'), mid = zone.querySelector('.cert-mid'); if (!cad || !mid) return;
      let k = 1; mid.style.zoom = 1;
      while (cad.scrollHeight > cad.clientHeight + 1 && k > 0.55) { k -= 0.03; mid.style.zoom = k.toFixed(2); }
    };
    const dessiner = () => { zone.innerHTML = type === 'carte' ? htmlCarte(p, pc) : type === 'petales' ? htmlPetales() : type === 'bilan' ? htmlBilan(p, data) : htmlAffiche(); const z = Math.min(1, (innerWidth - 24) / 794); zone.style.setProperty('--z', z); ajuster(); };
    dessiner();
    const nm = ov.querySelector('#impr-noms');
    if (nm) nm.addEventListener('input', () => { const v = nm.value.trim().slice(0, 240); pc.noms = v === nomsFamille() ? '' : v; sauver(); dessiner(); });
    const fermer = () => { ov.remove(); pg.remove(); document.body.classList.remove('impr-on'); document.removeEventListener('keydown', cle); const t = $app.querySelector('#pc-noms'); if (t) t.value = nomsCarte(pc); };
    const cle = e => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', cle);
    ov.querySelector('#impr-x').addEventListener('click', fermer);
    ov.querySelector('#impr-go').addEventListener('click', () => window.print());
  }

  function lierPetale(id) {
    const sem = debutSemaine();
    const choix = { parent: bilansDe(id, 'parent').find(b => b.w === sem)?.s || null, enfant: bilansDe(id, 'enfant').find(b => b.w === sem)?.s || null };
    $app.querySelectorAll('.bloc-bilan').forEach(bloc => {
      const qui = bloc.dataset.qui, boutons = [...bloc.querySelectorAll('.echelle button')];
      boutons.forEach(b => b.addEventListener('click', () => {
        choix[qui] = Number(b.dataset.note);
        boutons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      }));
    });
    lierParcours(id);
    const c = $app.querySelector('#fait');
    if (c) c.addEventListener('change', () => { const S = charger(); if (c.checked) S.ensembleFaits[id] = iso(new Date()); else delete S.ensembleFaits[id]; sauver(); });
    if (!$app.querySelector('#enregistrer')) return;      // pétale fermé : rien à lier
    const nb = $app.querySelector('#nb-enfants');
    const lireNb = () => Math.min(99, Math.max(1, parseInt(nb && nb.value, 10) || 1));
    const actE0 = bilansDe(id, 'enfant').find(b => b.w === sem);
    let vE = actE0 ? (actE0.v && actE0.v.length ? actE0.v.map(x => x || null) : Array(actE0.k || 1).fill(actE0.s)) : [];
    const moy = () => { const f = vE.filter(Boolean); return f.length ? Math.round(f.reduce((a, b) => a + b, 0) / f.length) : null; };
    const rangs = $app.querySelector('#rangs');
    function dessinerRangs() {
      if (!rangs) return;
      const k = lireNb(), v = []; for (let i = 0; i < k; i++) v.push(vE[i] || null); vE = v;
      rangs.innerHTML = vE.map((x, i) => `<div class="rang"><span class="rang-nom">${esc(nomEnfant(i, k))}</span><div class="echelle mini" role="group" aria-label="Ressenti : ${esc(nomEnfant(i, k))}">${VISAGES.map((vi, j) => `<button type="button" data-i="${i}" data-note="${j + 1}" aria-pressed="${x === j + 1}" aria-label="${j + 1} sur 5, ${vi.t}" title="${vi.t}">${visage(j)}</button>`).join('')}</div></div>`).join('');
      rangs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        vE[+b.dataset.i] = Number(b.dataset.note);
        b.parentNode.querySelectorAll('button').forEach(y => y.setAttribute('aria-pressed', String(y === b)));
        choix.enfant = moy();
      }));
      choix.enfant = moy();
    }
    if (nb) {
      $app.querySelector('#nb-moins').addEventListener('click', () => { nb.value = Math.max(1, lireNb() - 1); dessinerRangs(); });
      $app.querySelector('#nb-plus').addEventListener('click', () => { nb.value = Math.min(99, lireNb() + 1); dessinerRangs(); });
      nb.addEventListener('change', () => { nb.value = lireNb(); dessinerRangs(); });
      dessinerRangs();
    }
    $app.querySelector('#imprimer-bilan').addEventListener('click', () => {
      const ok = $app.querySelector('#retour-ok');
      if (!choix.parent && !choix.enfant) { ok.style.color = '#a33'; ok.textContent = 'Choisissez au moins un visage, pour vous ou pour votre enfant, avant d\'imprimer.'; return; }
      ok.textContent = '';
      ouvrirImpression('bilan', id, { sem, parent: choix.parent, enfant: choix.enfant, k: lireNb(), v: vE.slice(0, lireNb()), note: $app.querySelector('#note').value.trim() });
    });
    $app.querySelector('#enregistrer').addEventListener('click', () => {
      const ok = $app.querySelector('#retour-ok');
      if (!choix.parent && !choix.enfant) { ok.style.color = '#a33'; ok.textContent = 'Choisissez au moins un visage, pour vous ou pour votre enfant.'; return; }
      const S = charger(), note = $app.querySelector('#note').value.trim(), d = iso(new Date());
      ['parent', 'enfant'].forEach(qui => {
        if (!choix[qui]) return;
        const k = cle(qui);
        const liste = ((S[k] || {})[id] || []).filter(b => b.w !== sem);
        const entree = { w: sem, d, s: choix[qui] };
        if (qui === 'enfant') { entree.k = lireNb(); entree.v = vE.slice(0, entree.k).map(x => x || 0); }
        if (note && (qui === 'parent' || !choix.parent)) entree.n = note;
        liste.push(entree);
        S[k] = S[k] || {}; S[k][id] = liste.slice(-52);
      });
      const stocke = sauver();
      ok.style.color = '';
      ok.textContent = stocke ? 'Bilan enregistré sur votre téléphone. Merci !' : 'Enregistré pour cette session seulement : votre navigateur bloque le stockage.';
      setTimeout(() => rendre(), 900);
    });
  }

  /* ----- Cette semaine ----- */
  function indexDefi() {
    const n = D.defis.length; if (!n) return 0;
    const debut = new Date(D.config.debutDefis + 'T00:00:00');
    const sem = Math.floor((jour(new Date()) - debut) / (7 * 864e5));
    return ((sem < 0 ? 0 : sem) % n);
  }
  const defiCourant = () => D.defis[indexDefi()];
  const indexDemande = param => { const n = D.defis.length, base = indexDefi(); return param === undefined || param === '' ? base : Math.min(Math.max(Number(param) || 0, 0), n - 1); };
  function vueSemaine(param) {
    const n = D.defis.length; if (!n) return vueIntrouvable();
    const base = indexDefi(), idx = indexDemande(param);
    const d = D.defis[idx], p = petale(d.petale);
    const fait = !!charger().defisFaits[d.id];
    return `<section class="vue">
      <h1><span class="surligne" style="--hl:var(--vert)">Cette semaine</span></h1>
      <div class="grille2"><div>
      <div class="defi" style="background:${p?.couleur || 'var(--jaune)'}">
        <span class="etiquette">${idx === base ? 'Le défi de la semaine' : `Défi ${idx + 1} sur ${n}`}${p ? ` · ${esc(p.titre)}` : ''}</span>
        <h2>${esc(d.titre)}</h2>
        <p class="duree">⏱ ${esc(d.duree)}</p>
        <p style="margin:0">${esc(d.consigne)}</p>
        ${d.plus ? `<p class="plus"><b>Pour aller plus loin :</b> ${esc(d.plus)}</p>` : ''}
        <label class="coche"><input type="checkbox" id="fait" ${fait ? 'checked' : ''}> J'ai essayé ce défi</label>
      </div>
      </div><div>
      <div class="nav-defis">
        <a class="btn discret" href="#/semaine/${(idx - 1 + n) % n}">← Précédent</a>
        ${idx !== base ? '<a class="btn discret" href="#/semaine">Cette semaine</a>' : ''}
        <a class="btn discret" href="#/semaine/${(idx + 1) % n}">Suivant →</a>
      </div>
      ${p && p.ensemble ? `<a class="carte teinte" href="#/petale/${p.id}" style="display:block;text-decoration:none;background:${p.couleur}">
        <span class="etiquette">À faire ensemble</span>
        <h3 style="margin-bottom:.2em">${esc(p.ensemble.titre)}</h3>
        <p style="margin:0">${esc(p.ensemble.duree)} · parent et enfant. Touchez pour voir les étapes.</p></a>` : ''}
      <p class="petit">Un seul défi à la fois suffit. Si ce n'est pas le bon moment, passez au suivant, sans culpabilité.</p>
      </div></div>
    </section>`;
  }
  function lierSemaine(param) {
    const c = $app.querySelector('#fait'); if (!c) return;
    const idx = indexDemande(param);
    c.addEventListener('change', () => { const S = charger(); if (c.checked) S.defisFaits[D.defis[idx].id] = iso(new Date()); else delete S.defisFaits[D.defis[idx].id]; sauver(); });
  }

  /* ----- Plus ----- */
  let invitationInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invitationInstall = e; const b = document.getElementById('btn-install'); if (b) b.hidden = false; });
  function vuePlus() {
    const c = D.config.contact || {};
    return `<section class="vue">
      <h1><span class="surligne" style="--hl:var(--vert)">Plus</span></h1>
      <div class="grille-cartes">
      ${D.admin ? vueIngenieure() : ''}
      ${!D.admin && D.fin ? `<div class="carte"><span class="etiquette">Mon accès</span><p style="margin:0">Votre accès est valable jusqu'au <b>${dateLongue(D.fin)}</b>. Pour le renouveler, écrivez à <a href="mailto:${esc((D.config.contact || {}).email || '')}">${esc((D.config.contact || {}).email || 'BRILLE')}</a>.</p></div>` : ''}
      ${achatActif() ? `<details class="carte"><summary>Ouvrir d'autres pétales</summary>
        <p>Vous voulez prolonger d'autres thèmes à la maison ? Découvrez les accès disponibles.</p>
        <a class="btn plein" href="#/acces">Voir les accès</a>
      </details>` : ''}
      <details class="carte" open><summary>Installer Étincelle sur mon téléphone</summary>
        <p>Pour la retrouver comme une application, sans passer par un magasin d'applications :</p>
        <button class="btn plein" id="btn-install" type="button" hidden>Installer Étincelle</button>
        <p class="petit"><b>iPhone</b> (Safari) : touchez le bouton Partager, puis « Sur l'écran d'accueil ».<br><b>Android</b> (Chrome) : touchez le menu ⋮, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».</p>
        <p class="petit">Si l'application vous redemande votre code après l'installation, saisissez-le simplement une fois de plus.</p>
      </details>

      <details class="carte"><summary>Besoin d'un soutien ?</summary>
        <p>Vous n'avez pas à tout porter seul·e. Votre référent famille du centre social peut vous écouter et vous orienter. En cas de besoin immédiat :</p>
        <ul class="numeros">
          <li><span>Enfant en danger ou inquiétude pour un enfant</span><b>119</b></li>
          <li><span>Prévention du suicide, écoute 24h/24</span><b>3114</b></li>
          <li><span>Urgence médicale / urgence en Europe</span><b>15 · 112</b></li>
        </ul>
      </details>

      <details class="carte"><summary>Mes données et ma vie privée</summary>
        <p>Vos bilans et vos notes sont enregistrés <b>uniquement sur ce téléphone</b>. Il n'y a ni compte, ni serveur : BRILLE ne les voit pas et ne peut pas les récupérer. Seuls des prénoms sont demandés (pas de nom de famille) : n'ajoutez pas d'informations sensibles.</p>
        <p class="petit">Si vous changez de téléphone ou videz les données du navigateur, vous perdez l'historique, sauf si vous l'enregistrez avant.</p>
        <button class="btn discret plein" id="exporter" type="button">Enregistrer une copie de mes données</button>
        <label class="btn discret plein" style="margin-top:12px">Récupérer une copie<input type="file" id="importer" accept="application/json,.json" hidden></label>
        <button class="btn alerte plein" id="effacer" type="button" style="margin-top:12px">Effacer toutes mes données</button>
        <button class="btn plein" id="verrouiller" type="button" style="margin-top:12px">Verrouiller l'application</button>
        <p class="petit">« Verrouiller » ne supprime pas vos bilans : il faudra simplement saisir de nouveau votre code famille.</p>
        <p class="ok" id="retour-donnees" role="status"></p>
      </details>

      <details class="carte"><summary>À propos d'Étincelle</summary>
        <p>Étincelle est la suite à la maison des ateliers proposés en centre social par <b>BRILLE</b>. La qualité de vie de l'enfant (QVE) a d'abord été pensée pour l'enfant : c'est elle qui guide tout.</p>
        <p>Quand vous revenez de l'atelier Main tendue, Étincelle vous aide à continuer à la maison : faire, avec votre enfant, quelque chose en lien avec sa QVE, un moment à deux ou en famille, à votre rythme.</p>
        <p>La fleur des parents répond en miroir à la fleur de l'enfant, car le parent joue un rôle essentiel dans la qualité de vie de son enfant. Mais le plus important, c'est de vivre l'aventure ensemble : c'est comme ça que le lien se crée.</p>
        <p class="petit">Étincelle accompagne le bien-être familial. Elle ne remplace pas l'avis d'un médecin ou d'un professionnel de la santé ou du soutien psychologique.</p>
      </details>

      <details class="carte"><summary>Contacter BRILLE</summary>
        <p>${esc(c.nom || '')}</p>
        ${c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}
        ${c.telephone ? `<p><a href="tel:${esc(String(c.telephone).replace(/\s/g, ''))}">${esc(c.telephone)}</a></p>` : ''}
      </details>
      </div>
      <details class="carte"><summary>Conditions d'utilisation</summary>
        <p>Étincelle et ses contenus (textes, activités, illustrations, méthode « QVE ») sont la propriété de BRILLE et protégés par le droit d'auteur.</p>
        <ul>
          <li>L'accès est <b>personnel</b> et réservé à la famille ou au groupe à qui le code a été remis.</li>
          <li>Il est interdit de partager son code, de copier, de capturer pour diffuser, de republier ou de revendre les contenus.</li>
          <li>L'accès peut être retiré en cas d'usage non conforme.</li>
        </ul>
        <p class="petit">Un filigrane au nom de votre accès apparaît sur les pages : il permet de retrouver l'origine d'un contenu diffusé sans autorisation.</p>
      </details>

      <p class="pied">Conçue et développée par ${esc(c.nom || 'BRILLE')}<br>© BRILLE · Étincelle · Tous droits réservés${achatActif() ? '<br>' + liensLegaux() : ''}</p>
    </section>`;
  }
  function vueIngenieure() {
    const sel = D.apercu || D.vitrine.map(v => v.id);
    return `<div class="carte teinte" style="background:var(--vert)" id="carte-ing">
      <span class="etiquette">Espace ingénieure</span>
      <h2>Aperçu « comme une famille »</h2>
      <p>Vous voyez tous les pétales. Cochez ceux qu'une famille a vécus en atelier pour voir exactement son application :</p>
      <div class="apercu">${D.vitrine.map(v => `<label class="coche"><input type="checkbox" data-id="${v.id}" ${sel.includes(v.id) ? 'checked' : ''}> ${esc(v.titre)}</label>`).join('')}</div>
      <a class="btn plein" href="#/gestion">Gérer les familles et les codes</a>
    </div>`;
  }
  function lierPlus() {
    const ci = $app.querySelector('#carte-ing');
    if (ci) ci.addEventListener('change', () => {
      const ids = [...ci.querySelectorAll('input:checked')].map(x => x.dataset.id);
      D.apercu = ids.length === D.vitrine.length ? null : ids; composer(ids.length ? ids : D.vitrine.map(v => v.id));
    });
    const bi = $app.querySelector('#btn-install');
    if (bi && invitationInstall) { bi.hidden = false; bi.addEventListener('click', async () => { invitationInstall.prompt(); await invitationInstall.userChoice; invitationInstall = null; bi.hidden = true; }); }
    const msg = t => { $app.querySelector('#retour-donnees').textContent = t; };
    $app.querySelector('#exporter').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(charger(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `etincelle-mes-donnees-${iso(new Date())}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      msg('Copie enregistrée dans les fichiers de votre téléphone.');
    });
    $app.querySelector('#importer').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d || typeof d !== 'object' || typeof d.bilans !== 'object') throw new Error('format');
        memoire = Object.assign(vide(), { bilans: d.bilans || {}, enfant: d.enfant || {}, defisFaits: d.defisFaits || {}, ensembleFaits: d.ensembleFaits || {}, parcours: d.parcours || {}, mode: d.mode === 'enfant' ? 'enfant' : 'parent', famille: (d.famille && typeof d.famille === 'object') ? d.famille : { parents: '', enfants: [] } }); sauver();
        msg('Vos données ont été récupérées.');
      } catch { msg('Ce fichier n\'est pas une copie valide d\'Étincelle.'); }
    });
    $app.querySelector('#verrouiller').addEventListener('click', verrouiller);
    $app.querySelector('#effacer').addEventListener('click', () => {
      if (!confirm('Effacer tous vos bilans, notes et défis ? Cette action est définitive.')) return;
      memoire = vide(); sauver(); msg('Toutes vos données ont été effacées.');
    });
  }


  /* ----- Gestion des familles (espace ingénieure) ----- */
  const CLE_CARNET = 'brille-carnet';
  const lireCarnet = () => { try { return JSON.parse(localStorage.getItem(CLE_CARNET) || 'null'); } catch { return null; } };
  const ecrireCarnet = c => { try { localStorage.setItem(CLE_CARNET, JSON.stringify(c)); } catch { } };
  const baseLien = () => location.origin + location.pathname;
  const lienFamille = f => `${baseLien()}#/c/${f.code}`;
  const telecharger = (nom, obj) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = nom; a.click(); };
  const chargerScript = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });

  function vueGestion() {
    if (!D.admin) return vueIntrouvable();
    const carnet = lireCarnet();
    const cases = (cls, sel, extra = '') => D.vitrine.map(v => `<label class="chip"><input type="checkbox" class="${cls}" ${extra} data-id="${v.id}" ${sel && sel.includes(v.id) ? 'checked' : ''}> ${esc(v.titre)}</label>`).join('');
    if (!carnet) return `<section class="vue"><a class="retour" href="#/plus">← Plus</a>
      <h1><span class="surligne" style="--hl:var(--vert)">Gérer les familles</span></h1>
      <div class="carte"><h2>Importer mon carnet</h2>
        <p>Le carnet est le fichier <b>carnet-familles.json</b> de votre dossier privé. Il contient les codes et les clés : il reste uniquement sur cet appareil, jamais en ligne.</p>
        <input type="file" id="f-carnet" accept=".json"><p class="erreur" id="st" role="status"></p></div></section>`;
    const actives = carnet.familles.filter(f => f.actif);
    const stock = carnet.familles.filter(f => f.actif && f.vente && f.publie && !f.envoye).length;
    const aPublier = carnet.familles.filter(f => f.actif && f.vente && !f.publie).length;
    const ligneFam = (f, i) => f.actif ? `<div class="carte fam${f.admin ? ' fam-admin' : ''}" data-i="${i}">
        ${f.admin ? '<span class="badge-admin">Mon accès ingénieure · protégé</span>' : ''}
        <input type="text" class="nomf" value="${esc(f.nom)}" aria-label="Nom de la famille ou du groupe"${f.admin ? ' disabled' : ''}>
        <p>Code : <code>${esc(f.code)}</code></p>
        ${f.admin ? '' : `<label class="petit" style="display:block">Fin d'accès ${f.fin && iso(new Date()) > f.fin ? '<b style="color:#a33">(terminée)</b>' : ''}
          <input type="date" class="finf" value="${esc(f.fin || '')}" style="padding:6px 10px;border:2px solid #e4dcec;border-radius:12px;font:inherit;margin-left:6px"></label>
        <p class="petit" style="margin:2px 0 10px">${f.fin ? '' : 'Sans limite de durée. '}Laissez vide pour un accès sans date de fin.</p>`}
        <p class="petit">Ajouté le ${esc(f.ajout || '')}${f.vente ? ' · ' + (f.envoye ? 'envoyé le ' + esc(f.envoye) + (f.acheteur ? ' à ' + esc(f.acheteur) : '') : (f.publie ? 'disponible pour la vente' : 'à publier')) : ''}</p>
        <div class="chips">${f.admin ? cases('pf', f.petales).replace(/<input/g, '<input disabled') : cases('pf', f.petales)}</div>
        <div class="actions-fam">
          <button type="button" class="btn petit-btn" data-a="msg">Copier le message</button>
          <button type="button" class="btn petit-btn" data-a="msgachat">Message d'achat</button>
          ${f.vente ? `<button type="button" class="btn petit-btn gris" data-a="envoye">${f.envoye ? 'Remettre en stock' : 'Marquer comme envoyé'}</button>` : ''}
          <button type="button" class="btn petit-btn gris" data-a="lien">Copier le lien</button>
          <button type="button" class="btn petit-btn gris" data-a="qr">QR code</button>
          ${f.admin ? '' : '<button type="button" class="btn petit-btn alerte" data-a="retirer">Retirer</button>'}
        </div></div>` : '';
    const lignes = carnet.familles.map((f, i) => f.admin ? ligneFam(f, i) : '').join('') + carnet.familles.map((f, i) => f.admin ? '' : ligneFam(f, i)).join('');
    return `<section class="vue"><a class="retour" href="#/plus">← Plus</a>
      <h1><span class="surligne" style="--hl:var(--vert)">Gérer les familles</span></h1>
      <div class="grille-cartes">
      ${actives.some(f => f.vente) ? `<div class="carte teinte" style="background:var(--vert)"><h2>Après un paiement</h2>
        <p class="petit">Codes disponibles pour la vente : <b>${stock}</b>${stock <= 3 ? '. Pensez à créer un nouveau lot.' : '.'}${aPublier ? ` ${aPublier} code(s) ne sont pas encore publiés : cliquez sur « Préparer les fichiers » puis déposez-les sur GitHub.` : ''}</p>
        <input type="text" id="acheteur" placeholder="Nom ou e-mail de l'acheteur (pour vos notes)">
        <button type="button" class="btn plein" id="prochain">Copier le message du prochain code</button>
        <p class="petit">Le code est marqué « envoyé ». Collez ensuite le message dans un e-mail adressé à l'acheteur.</p></div>` : ''}
      <div class="carte"><h2>Ajouter une famille ou un groupe</h2>
        <p class="petit">Un seul code pour tout un groupe d'atelier, c'est le plus simple. Cochez les pétales vécus en atelier. Pour la vente, créez un lot de codes « fleur complète » à l'avance : après chaque paiement, vous envoyez simplement un code du lot.</p>
        <input type="text" id="nouveau-nom" placeholder="Nom (ex. Atelier mars, famille Martin)">
        <label class="petit" for="nb-codes">Nombre de codes à créer (un lot de 20 est pratique pour les ventes)</label>
        <input type="number" id="nb-codes" min="1" max="50" value="1">
        <label for="duree" class="petit" style="display:block;margin-top:6px"><b>Durée de l'accès</b> (compte à partir d'aujourd'hui)</label>
        <select id="duree" style="width:100%;padding:10px 14px;border:2px solid #e4dcec;border-radius:16px;font:inherit;background:#fff;margin:4px 0 12px">
          <option value="">Sans limite (familles du centre social)</option>
          <option value="12m" selected>12 mois (fleur entière, un pétale)</option>
          <option value="5a">5 ans (accès longue durée)</option>
        </select>
        <label class="coche" style="margin:10px 0"><input type="checkbox" id="lot-vente"> Ces codes sont pour la vente (stock)</label>
        <div class="chips">${cases('ajout', [])}</div>
        <button type="button" class="btn plein" id="creer">Créer le code</button>
        <p class="erreur" id="st" role="status"></p></div>
      <div class="carte"><h2>Ajouter les parcours d'un mois</h2>
        <p class="petit">Choisissez le fichier <b>parcours-mensuels-PRIVE.json</b> (sur votre ordinateur, jamais sur GitHub). Les parcours sont ajoutés aux pétales, puis chiffrés avec les autres contenus. Vos codes ne changent pas.</p>
        <input type="file" id="f-parcours" accept=".json"><p class="erreur" id="st-parcours" role="status"></p></div>
      <div class="carte"><h2>Publier les changements</h2>
        <p>Après chaque ajout ou retrait, téléchargez les deux fichiers, puis déposez-les sur GitHub (Add file → Upload files → Commit changes). Les familles les prennent en compte dans les minutes qui suivent.</p>
        <button type="button" class="btn plein" id="fabriquer">Préparer les fichiers à publier</button>
        <button type="button" class="btn plein gris" id="sauver-carnet" style="margin-top:10px">Télécharger une copie de mon carnet</button>
        <p class="petit">${actives.length} accès actif(s). Gardez la copie du carnet en lieu sûr : sans elle, vous ne pouvez plus gérer les codes.</p></div>
      </div>
      <h2 class="titre-section">Mes familles et groupes</h2>
      <div class="grille-cartes">${lignes || '<p>Aucune famille pour le moment.</p>'}</div>
    </section>`;
  }
  function lierGestion() {
    const st = m => { const e = $app.querySelector('#st'); if (e) { e.style.color = ''; e.textContent = m; } };
    const imp = $app.querySelector('#f-carnet');
    if (imp) { imp.addEventListener('change', () => { const r = new FileReader(); r.onload = () => { try { const c = JSON.parse(r.result); if (c.v !== 2 || !c.cles || !c.familles) throw 0; ecrireCarnet(c); rendre(); } catch { st('Ce fichier n\'est pas un carnet valide.'); } }; r.readAsText(imp.files[0]); }); return; }
    const carnet = lireCarnet(); if (!carnet) return;
    const msgFamille = f => `Bonjour, voici votre accès personnel pour prolonger à la maison ce que nous avons vécu à l'atelier. Touchez ce lien, l'application s'ouvre toute seule : ${lienFamille(f)}\n(Si on vous demande le code, saisissez-le : ${f.code}). À bientôt, Tsiory (BRILLE)`;
    const msgAchat = f => `Bonjour, merci pour votre achat d'un accès à Étincelle ! Touchez ce lien, l'application s'ouvre toute seule : ${lienFamille(f)}\n(Si on vous demande le code, saisissez-le : ${f.code}). Bon moment en famille, Tsiory (BRILLE)`;
    const copier = async (t, ok) => { try { await navigator.clipboard.writeText(t); st(ok); } catch { prompt('Copiez ce texte :', t); } };
    $app.querySelector('#creer').addEventListener('click', () => {
      const sel = [...$app.querySelectorAll('.ajout:checked')].map(x => x.dataset.id);
      if (!sel.length) { st('Cochez au moins un pétale vécu en atelier.'); return; }
      const n = Math.max(1, Math.min(50, parseInt($app.querySelector('#nb-codes').value, 10) || 1));
      const base = $app.querySelector('#nouveau-nom').value.trim() || 'Famille';
      const crees = []; for (let i = 0; i < n; i++) crees.push(Acces.ajouterFamille(carnet, n > 1 ? `${base} ${String(i + 1).padStart(2, '0')}` : base, sel));
      const dr = $app.querySelector('#duree').value;
      if (dr) { const d = new Date(); d.setFullYear(d.getFullYear() + (dr === '5a' ? 5 : 1)); crees.forEach(f => { f.fin = iso(d); }); }
      if ($app.querySelector('#lot-vente').checked) crees.forEach(f => { f.vente = true; });
      ecrireCarnet(carnet); rendre(); const e = $app.querySelector('#st'); if (e) { e.style.color = '#2f6b2f'; e.textContent = (n === 1 ? 'Code créé : ' + crees[0].code : n + ' codes créés') + '. Pensez à publier (bouton « Préparer les fichiers »).'; }
    });
    const prochain = $app.querySelector('#prochain');
    if (prochain) prochain.addEventListener('click', async () => {
      const f = carnet.familles.find(x => x.actif && x.vente && x.publie && !x.envoye);
      if (!f) { st('Plus de code disponible : créez un nouveau lot (case « pour la vente »), puis publiez les fichiers.'); return; }
      const ach = ($app.querySelector('#acheteur').value || '').trim();
      f.envoye = iso(new Date()); if (ach) f.acheteur = ach; ecrireCarnet(carnet);
      await copier(msgAchat(f), '');
      rendre(); const e = $app.querySelector('#st'); if (e) { e.style.color = '#2f6b2f'; e.textContent = 'Message copié (code ' + f.code + '). Collez-le dans un e-mail à l\'acheteur.'; }
    });
    $app.querySelectorAll('.fam').forEach(bloc => {
      const f = carnet.familles[+bloc.dataset.i];
      const fi = bloc.querySelector('.finf');
      if (fi) fi.addEventListener('change', e => { f.fin = e.target.value || ''; ecrireCarnet(carnet); st('Date de fin modifiée. Pensez à publier (bouton « Préparer les fichiers »).'); });
      bloc.querySelector('.nomf').addEventListener('input', e => { if (f.admin) return; f.nom = e.target.value; ecrireCarnet(carnet); });
      bloc.querySelectorAll('.pf').forEach(c => c.addEventListener('change', () => {
        if (f.admin) { c.checked = true; return; }
        if (c.checked) { if (!f.petales.includes(c.dataset.id)) f.petales.push(c.dataset.id); }
        else { f.petales = f.petales.filter(x => x !== c.dataset.id); Acces.renouvelerCles(carnet, [c.dataset.id]); }
        ecrireCarnet(carnet); st('Modifié. Pensez à publier (bouton « Préparer les fichiers »).');
      }));
      bloc.addEventListener('click', async e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'msg') copier(msgFamille(f), 'Message copié, prêt à coller dans un SMS ou WhatsApp.');
        if (a === 'msgachat') copier(msgAchat(f), 'Message d\'achat copié, prêt à coller dans un e-mail.');
        if (a === 'envoye') { if (f.envoye) { delete f.envoye; delete f.acheteur; } else f.envoye = iso(new Date()); ecrireCarnet(carnet); rendre(); }
        if (a === 'lien') copier(lienFamille(f), 'Lien copié.');
        if (a === 'retirer') { if (f.admin) return; if (!confirm(`Retirer l'accès de « ${f.nom} » ? Les clés seront renouvelées : publiez ensuite les fichiers.`)) return; f.actif = false; Acces.renouvelerCles(carnet); ecrireCarnet(carnet); rendre(); }
        if (a === 'qr') {
          try { await chargerScript('qrcode.js'); } catch { st('Le QR code n\'a pas pu se charger (connexion ?).'); return; }
          const q = qrcode(0, 'M'); q.addData(lienFamille(f)); q.make();
          const fond = document.createElement('div'); fond.className = 'fenetre-qr';
          fond.innerHTML = `<div class="c"><h3>${esc(f.nom)}</h3>${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}<p>Scannez pour ouvrir Étincelle<br><code>${esc(f.code)}</code></p><button type="button" class="btn">Fermer</button></div>`;
          fond.addEventListener('click', ev => { if (ev.target === fond || ev.target.tagName === 'BUTTON') fond.remove(); });
          document.body.appendChild(fond);
        }
      });
    });
    $app.querySelector('#fabriquer').addEventListener('click', async () => {
      if (!actives_ok(carnet)) { st('Ajoutez au moins une famille avec un pétale.'); return; }
      const r = await Acces.fabriquer(carnet, { details: D.details });
      telecharger('acces.json', r.acces); setTimeout(() => telecharger('contenu.enc.json', r.contenuEnc), 500);
      carnet.familles.forEach(f => { if (f.actif && f.petales && f.petales.length) f.publie = true; }); ecrireCarnet(carnet);
      st('Deux fichiers téléchargés : déposez acces.json et contenu.enc.json sur GitHub (Add file, Upload files, Commit changes).');
    });
    const fp = $app.querySelector('#f-parcours');
    if (fp) fp.addEventListener('change', async e => {
      const f = e.target.files[0], m = $app.querySelector('#st-parcours'); if (!f) return;
      try {
        const d = JSON.parse(await f.text()); let n = 0;
        Object.keys(d).forEach(id => { if (D.details[id] && d[id] && Array.isArray(d[id].semaines) && d[id].semaines.length === 4) { D.details[id].parcours = d[id]; const x = D.petales.find(q => q.id === id); if (x) x.parcours = d[id]; n++; } });
        if (!n) throw new Error('vide');
        m.style.color = ''; m.textContent = n + ' parcours ajoutés. Cliquez maintenant sur « Préparer les fichiers à publier ».';
      } catch { m.style.color = '#a33'; m.textContent = 'Ce fichier n\'est pas valide.'; }
    });
    $app.querySelector('#sauver-carnet').addEventListener('click', () => telecharger('carnet-familles.json', carnet));
  }
  const actives_ok = c => c.familles.some(f => f.actif && f.petales.length);

  function vueIntrouvable() {
    return '<section class="vue"><h1>Page introuvable</h1><p>Cette page n\'existe pas.</p><a class="btn" href="#/">Retour à la fleur</a></section>';
  }

  /* ---------- Routeur ---------- */
  let premiere = true;
  function rendre() {
    if (!D.petales.length) { ecranCode(); return; }
    const [r, param] = location.hash.replace(/^#\/?/, '').split('/');
    let html, tab, titre = 'Étincelle · BRILLE', apres = () => { };
    if (!r) { html = vueAccueil(); tab = 'fleur'; apres = lierAccueil; }
    else if (r === 'petale') { html = vuePetale(param); tab = 'fleur'; apres = () => lierPetale(param); titre = `${petale(param)?.titre || 'Pétale'} · Étincelle`; }
    else if (r === 'semaine' || r === 'defi') { html = vueSemaine(param); tab = 'semaine'; apres = () => lierSemaine(param); titre = 'Cette semaine · Étincelle'; }
    else if (r === 'gestion') { html = vueGestion(); tab = 'plus'; apres = lierGestion; titre = 'Gérer les familles · Étincelle'; }
    else if (r === 'acces') { html = achatActif() ? htmlAchat('fleur') : vueIntrouvable(); tab = 'plus'; apres = () => { if (achatActif()) lierAchat('fleur'); }; titre = 'Obtenir un accès · Étincelle'; }
    else if (r === 'plus') { html = vuePlus(); tab = 'plus'; apres = lierPlus; titre = 'Plus · Étincelle'; }
    else { html = vueIntrouvable(); tab = ''; }
    $app.innerHTML = html;
    document.title = titre;
    document.querySelectorAll('.tabbar a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    apres();
    if (!premiere) { window.scrollTo(0, 0); $app.focus({ preventScroll: true }); }
    premiere = false;
  }
  window.addEventListener('hashchange', rendre);

  /* ---------- Démarrage ---------- */
  chargerDonnees().then(async () => {
    // Lien personnel : .../#/c/CODE ouvre l'application sans rien saisir (le code est ensuite retiré de l'adresse)
    const m = location.hash.match(/^#\/c\/([^/?]+)/i);
    if (m) {
      const lien = decodeURIComponent(m[1]);
      history.replaceState(null, '', location.pathname + location.search + '#/');
      try { await deverrouiller(lien); document.body.classList.remove('verrouille'); premiere = true; rendre(); return; }
      catch (x) { ecranCode(messageAcces(x) || 'Ce lien n\'est plus valide. Entrez votre code ou contactez BRILLE.'); return; }
    }
    const code = codeMemorise();
    let raison = null;
    if (code) { try { await deverrouiller(code); document.body.classList.remove('verrouille'); rendre(); return; } catch (x) { raison = x; /* code retiré, changé ou expiré */ } }
    ecranCode(code ? (messageAcces(raison) || 'Votre accès n\'est plus valide. Entrez un nouveau code ou contactez BRILLE.') : '');
  }).catch(() => {
    $app.innerHTML = '<section class="vue"><h1>Oups</h1><p>Impossible de charger le contenu. Vérifiez votre connexion et rechargez la page.</p></section>';
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})();
