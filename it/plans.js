/* LiveNode · schede dei piani (home e account). Prezzi e nomi arrivano da config.js */
const PLAN_GROUPS = {
  free: [
    ["Camere", ["Fino a 2 iPhone collegati insieme", "Zoom, fuoco e torcia dalla regia"]],
    ["Controlli", ["Zoom, OBS e ATEM dalla stessa console", "Mixer audio con livelli per canale"]],
    ["Rete", ["Qualità adattiva: il video non si blocca"]],
    ["Registrazione", ["Registrazione sul Mac"]],
    ["Telecomando", ["Dock su iPad e iPhone"]],
  ],
  cloud_start: [
    ["Camere", ["Fino a 4 iPhone collegati insieme"]],
    ["Cloud", ["50 GB di registrazioni online"]],
    ["Condivisione", ["Link con o senza scadenza", "Revochi un link quando vuoi"]],
    ["Account", ["Fino a 3 Mac collegati", "Fatture e disdetta online"]],
  ],
  cloud_pro: [
    ["Camere", ["iPhone senza limite di numero*"]],
    ["Cloud", ["250 GB di registrazioni online"]],
  ],
  cloud_studio: [
    ["Team", ["Fino a 5 persone, un solo abbonamento", "Spazio e registrazioni condivisi"]],
    ["Cloud", ["1 TB di registrazioni online"]],
  ],
};
const PLAN_INTRO = { free: "Incluso", cloud_start: "Tutto dell'app, più:", cloud_pro: "Tutto di Cloud Start, più:", cloud_studio: "Tutto di Cloud Pro, più:" };
const PLAN_SIZE = gb => gb >= 1000 ? (gb / 1000) + " TB" : gb + " GB";
const PLAN_ESC = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* mensile o annuale. L'annuale costa 10 mesi (2 gratis), salvo priceYear in config.js */
let PLAN_YEAR = false;
const PLAN_YEAR_MONTHS = 10;
function planPrice(p, year = PLAN_YEAR) {
  if (!year) return p.price;
  if (p.priceYear) return p.priceYear;
  return String(p.price).replace(/\d+(?:[.,]\d+)?/, n => String(Math.round(parseFloat(n.replace(",", ".")) * PLAN_YEAR_MONTHS)));
}
/* interruttore Mensile / Annuale. onChange viene chiamata dopo ogni cambio */
function planToggle(host, onChange) {
  host.innerHTML = `<div class="ptog" role="group" aria-label="Fatturazione">
    <button type="button" data-int="month" aria-pressed="true">Mensile</button>
    <button type="button" data-int="year" aria-pressed="false">Annuale <em>2 mesi gratis</em></button></div>`;
  const set = y => { PLAN_YEAR = y; host.querySelectorAll("[data-int]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.int === "year") === y))); };
  host.addEventListener("click", e => { const b = e.target.closest("[data-int]"); if (!b) return; set(b.dataset.int === "year"); onChange(); });
  return set;
}

/* p: piano di CFG.plans oppure { key: "free" }. action: HTML del pulsante. hl: scheda in evidenza.
   Ogni scheda ha gli stessi blocchi (nome, prezzo, spazio, nota, pulsante): così i pulsanti restano allineati. */
function planCard(p, action, hl) {
  const free = p.key === "free";
  const groups = (PLAN_GROUPS[p.key] || []).map(([t, items]) =>
    `<li><b><i aria-hidden="true"></i>${PLAN_ESC(t)}</b>${items.map(x => `<span>${PLAN_ESC(x)}</span>`).join("")}</li>`).join("");
  const price = free ? "0 €" : PLAN_ESC(planPrice(p));
  const per = PLAN_YEAR ? "all'anno" : "al mese";
  const note = free ? "Scarica e vai in onda"
    : CFG.trialDays ? `${CFG.trialDays} giorni gratis, poi ${price} ${per}`
    : PLAN_YEAR ? "2 mesi gratis rispetto al mensile" : "Disdici quando vuoi";
  return `<article class="pc${hl ? " hl" : ""}">
    <h3>${free ? "LiveNode App" : PLAN_ESC(p.name)}</h3>
    <p class="pc-price"><b>${price}</b><small>${free ? "per sempre<br>senza account" : PLAN_YEAR ? "all'anno<br>IVA esclusa" : "al mese<br>IVA esclusa"}</small></p>
    <p class="pc-gb"><b>${free ? "macOS 14.4+" : PLAN_SIZE(p.gb)}</b><span>${free ? "Apple silicon e Intel" : "di registrazioni nel cloud"}</span></p>
    <p class="pc-note"><i aria-hidden="true"></i>${note}</p>
    <div class="pc-go">${action}</div>
    <p class="pc-inc">${PLAN_INTRO[p.key] || ""}</p>
    <ul class="pc-list">${groups}</ul>
  </article>`;
}
