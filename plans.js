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
  enterprise: [
    ["Team", ["More than 5 people", "Storage sized to your productions"]],
    ["Billing", ["One invoice for the whole company"]],
    ["Support", ["Direct help from the LiveNode team to set up your control rooms"]],
  ],
};
const PLAN_INTRO = { free: "Included", cloud_start: "Everything in the app, plus:", cloud_pro: "Everything in Cloud Start, plus:", cloud_studio: "Everything in Cloud Pro, plus:", enterprise: "Everything in Cloud Studio, plus:" };
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
  if (p.key === "enterprise") return planCardEnterprise(action, hl);
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

/* piano su misura per aziende: niente prezzo fisso, si scrive al team */
function planCardEnterprise(action, hl) {
  const groups = PLAN_GROUPS.enterprise.map(([t, items]) =>
    `<li><b><i aria-hidden="true"></i>${PLAN_ESC(t)}</b>${items.map(x => `<span>${PLAN_ESC(x)}</span>`).join("")}</li>`).join("");
  return `<article class="pc pc-ent${hl ? " hl" : ""}">
    <h3>Enterprise</h3>
    <p class="pc-price"><b>Custom</b><small>for larger<br>teams</small></p>
    <p class="pc-gb"><b>1 TB +</b><span>of cloud recordings</span></p>
    <p class="pc-note"><i aria-hidden="true"></i>A plan built around your productions</p>
    <div class="pc-go">${action}</div>
    <p class="pc-inc">${PLAN_INTRO.enterprise}</p>
    <ul class="pc-list">${groups}</ul>
  </article>`;
}

/* sezione prezzi completa: Personal / Business + Mensile / Annuale (home e pagina Cloud).
   host: contenitore vuoto. Le schede Business si aprono anche da «For teams › Business plans» */
function planSection(host) {
  const PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  const BUILD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>';
  host.innerHTML = `<div class="ptabs" role="tablist" aria-label="Plans">
      <button type="button" role="tab" data-g="personal" aria-selected="true">${PERSON}Personal</button>
      <button type="button" role="tab" data-g="business" aria-selected="false">${BUILD}Business</button></div>
    <div class="pband"><div class="ptog-host"></div><div class="pcs"></div>
      <p class="pfine">Prices exclude VAT. Payments are handled by Stripe: LiveNode never sees or stores your card details. * How many iPhones you can actually run depends on your Mac and network.</p></div>`;
  let group = "personal";
  try { const s = (sessionStorage.getItem("ln-plans") || "").split("|"); sessionStorage.removeItem("ln-plans"); if (s[0] && Date.now() - Number(s[1]) < 10000) group = s[0]; } catch (e) {}
  const cards = host.querySelector(".pcs"), band = host.querySelector(".pband");
  const go = p => `<a class="key" href="account.html?plan=${p.key}${PLAN_YEAR ? "&interval=year" : ""}">${CFG.trialDays ? "Start free trial" : "Choose " + PLAN_ESC(p.name)}</a>`;
  const plan = k => CFG.plans.find(p => p.key === k);
  function render() {
    host.querySelectorAll("[data-g]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.g === group)));
    band.setAttribute("data-g", group);
    if (group === "business") {
      const st = plan("cloud_studio");
      cards.innerHTML = (st ? planCard(st, go(st), true) : "")
        + planCard({ key: "enterprise" }, `<a class="key" href="mailto:${CFG.supportEmail}?subject=LiveNode%20for%20teams">Contact us</a>`);
    } else {
      cards.innerHTML = planCard({ key: "free" }, `<a class="key" href="#waitlist" data-wl-open>Join the waitlist</a>`)
        + CFG.plans.filter(p => p.key !== "cloud_studio").map(p => planCard(p, go(p), p.key === "cloud_pro")).join("");
    }
  }
  host.querySelector(".ptabs").addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (!b) return; group = b.dataset.g; render(); });
  planToggle(host.querySelector(".ptog-host"), render);
  window.showPlans = g => { group = g === "business" ? "business" : "personal"; render(); };
  render();
}
