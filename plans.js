/* LiveNode · schede dei piani (home e account). Prezzi e nomi arrivano da config.js */
const PLAN_GROUPS = {
  free: [
    ["Cameras", ["Up to 2 iPhones connected at once", "Zoom, focus and torch from the control room"]],
    ["Control", ["Zoom, OBS and ATEM from one console", "Audio mixer with per-channel levels"]],
    ["Network", ["Adaptive quality: video doesn't freeze"]],
    ["Recording", ["Recording on the Mac"]],
    ["Remote", ["Dock on iPad and iPhone"]],
  ],
  cloud_start: [
    ["Cameras", ["Up to 4 iPhones connected at once"]],
    ["Cloud", ["50 GB of online recordings"]],
    ["Sharing", ["Links with or without expiry", "Revoke a link anytime"]],
    ["Account", ["Up to 3 linked Macs", "Online invoices and cancellation"]],
  ],
  cloud_pro: [
    ["Cameras", ["No limit on the number of iPhones*"]],
    ["Cloud", ["250 GB of online recordings"]],
  ],
  cloud_studio: [
    ["Team", ["Up to 5 people, one subscription", "Shared storage and recordings"]],
    ["Cloud", ["1 TB of online recordings"]],
  ],
};
const PLAN_INTRO = { free: "Included", cloud_start: "Everything in the app, plus:", cloud_pro: "Everything in Cloud Start, plus:", cloud_studio: "Everything in Cloud Pro, plus:" };
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
  host.innerHTML = `<div class="ptog" role="group" aria-label="Billing">
    <button type="button" data-int="month" aria-pressed="true">Monthly</button>
    <button type="button" data-int="year" aria-pressed="false">Yearly <em>2 months free</em></button></div>`;
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
  const per = PLAN_YEAR ? "a year" : "a month";
  const note = free ? "Download and go live"
    : CFG.trialDays ? `${CFG.trialDays} days free, then ${price} ${per}`
    : PLAN_YEAR ? "2 months free compared to monthly" : "Cancel anytime";
  return `<article class="pc${hl ? " hl" : ""}">
    <h3>${free ? "LiveNode App" : PLAN_ESC(p.name)}</h3>
    <p class="pc-price"><b>${price}</b><small>${free ? "forever<br>no account" : PLAN_YEAR ? "per year<br>excl. VAT" : "per month<br>excl. VAT"}</small></p>
    <p class="pc-gb"><b>${free ? "macOS 14.4+" : PLAN_SIZE(p.gb)}</b><span>${free ? "Apple silicon and Intel" : "of cloud recordings"}</span></p>
    <p class="pc-note"><i aria-hidden="true"></i>${note}</p>
    <div class="pc-go">${action}</div>
    <p class="pc-inc">${PLAN_INTRO[p.key] || ""}</p>
    <ul class="pc-list">${groups}</ul>
  </article>`;
}
