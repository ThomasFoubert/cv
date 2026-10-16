/* ------------------------------------------------------------------
   Configuration
   DATA_URL : fichier local par défaut. Pour lire le Google Sheets,
   remplace par l'URL de la WebApp Apps Script (qui renvoie le même JSON).
------------------------------------------------------------------- */
const DATA_URL = "data/content.json";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const root = document.documentElement;

let DATA = null;
let cible = "tous";
let typeFilter = "all";
let skill = null;
let DESIGN = {};
let DEFAULT_DESIGN = {};

const SCHEMA = [
  ["accent", "Couleur principale", "color"], ["ink", "Texte", "color"], ["paper", "Cartes", "color"], ["bg", "Fond du site", "color"],
  ["yellow", "Jaune", "color"], ["green", "Vert", "color"], ["blue", "Bleu", "color"], ["coral", "Corail", "color"],
  ["ft", "Police des titres", "sel", ["Fredoka", "Baloo 2", "Poppins", "DM Serif Display", "Nunito"]],
  ["fb", "Police du texte", "sel", ["Nunito", "Poppins", "Fredoka", "Baloo 2"]],
  ["fs", "Taille du texte (px)", "rng", [14, 19, 1]], ["r", "Arrondi (px)", "rng", [0, 30, 1]],
  ["tilt", "Inclinaison des pastilles (°)", "rng", [0, 14, 1]], ["decor", "Décors (traits)", "sel", ["plein", "discret", "aucun"]],
];

/* ---------- utilitaires ---------- */
const matches = (tags) => {
  if (cible === "tous") return true;
  const t = String(tags || "tous").split(",").map((x) => x.trim());
  return t.includes("tous") || t.includes(cible);
};
const visible = (arr) => (arr || []).filter((x) => x.visible !== false && matches(x.tags));
const compName = (id) => (DATA.competences.find((c) => c.id === id) || {}).nom;

/* ---------- design ---------- */
function applyDesign() {
  const d = DESIGN;
  ["accent", "ink", "paper", "bg", "yellow", "green", "blue", "coral"].forEach((k) => d[k] && root.style.setProperty("--" + k, d[k]));
  if (d.ft) root.style.setProperty("--ft", `'${d.ft}',sans-serif`);
  if (d.fb) root.style.setProperty("--fb", `'${d.fb}',sans-serif`);
  if (d.fs) root.style.setProperty("--fs", d.fs + "px");
  if (d.r != null) root.style.setProperty("--r", d.r + "px");
  if (d.tilt != null) root.style.setProperty("--tilt", d.tilt + "deg");
  root.dataset.decor = d.decor || "plein";
  const out = $("out");
  if (out) out.value = JSON.stringify(d, null, 2);
  try { localStorage.setItem("da", JSON.stringify(d)); } catch (e) {}
}

function buildPanel() {
  const ctl = $("ctl");
  ctl.innerHTML = "";
  SCHEMA.forEach(([k, label, type, opts]) => {
    const l = document.createElement("label");
    l.append(label);
    let i;
    if (type === "color") { i = document.createElement("input"); i.type = "color"; }
    else if (type === "rng") { i = document.createElement("input"); i.type = "range"; [i.min, i.max, i.step] = opts; }
    else { i = document.createElement("select"); opts.forEach((v) => i.add(new Option(v, v))); }
    i.value = DESIGN[k];
    i.oninput = () => { DESIGN[k] = type === "rng" ? +i.value : i.value; applyDesign(); };
    l.append(i);
    ctl.append(l);
  });
}

/* ---------- rendu ---------- */
function renderHero() {
  const c = DATA.cibles[cible] || DATA.cibles.tous;
  $("nom").textContent = DATA.profil.nom;
  $("initiales").textContent = DATA.profil.initiales || "";
  $("ville").textContent = DATA.profil.ville || "";
  $("titre").textContent = c.titre;
  $("accroche").textContent = c.accroche;
  document.title = `${DATA.profil.nom} — ${c.titre}`;
  const probe = new Image();
  probe.onload = () => { $("photo").style.backgroundImage = "url(img/profil.jpg)"; $("initiales").hidden = true; };
  probe.src = "img/profil.jpg";
  const pills = visible(DATA.competences).filter((x) => x.cat === "Savoir-faire").slice(0, 3);
  $("pills").innerHTML = pills.map((p) => `<span class="pill">${esc(p.nom)}</span>`).join("");
}

function renderTargets() {
  $("targets").innerHTML = Object.entries(DATA.cibles)
    .map(([k, v]) => `<button type="button" role="tab" data-k="${esc(k)}" aria-selected="${k === cible}">${esc(v.libelle)}</button>`)
    .join("");
}

const cls = (x) => (skill && !(x.comp || []).includes(skill) ? "dim" : skill ? "hit" : "");

function renderTimeline() {
  const list = visible(DATA.experiences).filter((e) => typeFilter === "all" || e.type === typeFilter);
  $("timeline").innerHTML = list.map((e) => `
    <button type="button" class="card rv ${cls(e)}" data-open="experiences:${esc(e.id)}">
      <div class="yr">${esc(e.periode)}</div>
      <div>
        <span class="tag ${e.type === "asso" ? "asso" : ""}">${e.type === "asso" ? "Engagement" : "Professionnel"}</span>
        <b>${esc(e.titre)}</b><span class="st">${esc(e.structure)}</span>
        <p>${esc(e.resume)}</p>
        ${(e.chiffres || []).map((c) => `<span class="chiffre">${esc(c)}</span>`).join("")}
        <span class="more">Voir le détail →</span>
      </div>
    </button>`).join("") || "<p>Aucun élément pour cette orientation.</p>";
}

function renderGrid() {
  $("grid").innerHTML = visible(DATA.realisations).map((r) => {
    const img = (r.photos || [])[0];
    return `
    <button type="button" class="tile rv ${cls(r)}" data-open="realisations:${esc(r.id)}">
      <div class="cover">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>
      <div class="tb"><b>${esc(r.titre)}</b><span class="st">${esc(r.structure)}</span>
      <div>${(r.chiffres || []).map((c) => `<span class="chiffre">${esc(c)}</span>`).join("")}</div></div>
    </button>`;
  }).join("");
}

function renderSkills() {
  const cats = {};
  visible(DATA.competences).forEach((c) => (cats[c.cat] = cats[c.cat] || []).push(c));
  $("skills").innerHTML = Object.entries(cats).map(([cat, items]) =>
    `<div class="cat"><h3>${esc(cat)}</h3><div class="chips">${items.map((c) =>
      `<button type="button" class="chip ${skill === c.id ? "on" : ""}" data-skill="${esc(c.id)}">${esc(c.nom)}</button>`).join("")}</div></div>`).join("");
  $("resetSkill").hidden = !skill;
}

function renderForms() {
  $("forms").innerHTML = visible(DATA.formations).map((f) => `
    <div class="form rv"><b>${esc(f.titre)}</b> <span class="st">· ${esc(f.structure)} · ${esc(f.periode)}</span>
    ${f.resume ? `<p>${esc(f.resume)}</p>` : ""}</div>`).join("");
}

function renderLinks() {
  const ls = (DATA.profil.liens || []).map((l) => {
    if (!l.u) return `<span>${esc(l.l)} : à compléter</span>`;
    const href = l.l.toLowerCase().includes("mail") && !l.u.startsWith("mailto:") ? "mailto:" + l.u : l.u;
    return `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(l.l)}</a>`;
  });
  $("links").innerHTML = ls.join("");
}

function renderAll() {
  renderHero(); renderTargets(); renderTimeline(); renderGrid(); renderSkills(); renderForms(); renderLinks();
  observe();
}

/* ---------- apparition au défilement ---------- */
let io;
function observe() {
  if (!("IntersectionObserver" in window)) { document.querySelectorAll(".rv").forEach((e) => e.classList.add("in")); return; }
  io = io || new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.08 });
  document.querySelectorAll(".rv:not(.in)").forEach((e) => io.observe(e));
}

/* ---------- fenêtre de détail ---------- */
function openItem(key) {
  const [coll, id] = key.split(":");
  const it = (DATA[coll] || []).find((x) => x.id === id);
  if (!it) return;
  const photos = (it.photos || []).map((p) => `<img src="${esc(p)}" alt="" loading="lazy" onerror="this.remove()">`).join("");
  const comps = (it.comp || []).map(compName).filter(Boolean);
  $("mBody").innerHTML = `
    <h3 id="mTitle">${esc(it.titre)}</h3>
    <div class="st">${esc(it.structure)}${it.periode ? " · " + esc(it.periode) : ""}</div>
    <div>${(it.chiffres || []).map((c) => `<span class="chiffre">${esc(c)}</span>`).join("")}</div>
    <p>${esc(it.resume)}</p>
    ${it.detail ? `<p>${esc(it.detail)}</p>` : ""}
    ${photos ? `<div class="gal">${photos}</div>` : ""}
    ${comps.length ? `<div class="chips">${comps.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
    ${(it.liens || []).filter((l) => l.u).length ? `<p class="mlinks">${it.liens.filter((l) => l.u).map((l) => `<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.l)}</a>`).join("")}</p>` : ""}`;
  $("modal").showModal();
}

/* ---------- événements ---------- */
function bind() {
  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("[data-k],[data-open],[data-skill],[data-t]");
    if (!t) return;
    if (t.dataset.k) { setCible(t.dataset.k); }
    else if (t.dataset.open) { openItem(t.dataset.open); }
    else if (t.dataset.skill) { skill = skill === t.dataset.skill ? null : t.dataset.skill; renderTimeline(); renderGrid(); renderSkills(); observe(); }
    else if (t.dataset.t) {
      typeFilter = t.dataset.t;
      document.querySelectorAll("#seg button").forEach((b) => b.classList.toggle("on", b === t));
      renderTimeline(); observe();
    }
  });
  $("resetSkill").onclick = () => { skill = null; renderTimeline(); renderGrid(); renderSkills(); observe(); };
  $("mClose").onclick = () => $("modal").close();
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) $("modal").close(); });
  $("pdf").onclick = () => window.print();
  $("brand").onclick = (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $("cl").onclick = () => ($("panel").hidden = true);
  $("rs").onclick = () => { DESIGN = { ...DEFAULT_DESIGN }; buildPanel(); applyDesign(); };
  $("cp").onclick = () => { try { navigator.clipboard.writeText($("out").value); } catch (e) { $("out").select(); document.execCommand("copy"); } };
}

function setCible(k) {
  if (!DATA.cibles[k]) k = "tous";
  cible = k;
  skill = null;
  const u = new URL(location.href);
  k === "tous" ? u.searchParams.delete("cible") : u.searchParams.set("cible", k);
  history.replaceState(null, "", u);
  renderAll();
}

/* ---------- démarrage ---------- */
async function init() {
  $("year").textContent = new Date().getFullYear();
  try {
    const r = await fetch(DATA_URL, { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
  } catch (err) {
    document.body.insertAdjacentHTML("afterbegin", `<p style="padding:20px;font-family:sans-serif">Impossible de charger les données (${esc(err.message)}). Vérifie que <code>data/content.json</code> est bien dans le dépôt.</p>`);
    return;
  }
  DEFAULT_DESIGN = { ...DATA.design };
  DESIGN = { ...DATA.design };
  const params = new URLSearchParams(location.search);
  if (params.get("design") === "1") {
    try { Object.assign(DESIGN, JSON.parse(localStorage.getItem("da") || "{}")); } catch (e) {}
    $("panel").hidden = false;
    buildPanel();
  }
  applyDesign();
  const c = params.get("cible");
  cible = c && DATA.cibles[c] ? c : "tous";
  bind();
  renderAll();
}
init();
