/* LiveNode · schede dei piani (home e account). Prezzi e nomi arrivano da config.js */
const PLAN_GROUPS = {
  free: [
    ["Camere", ["iPhone come camera con un codice QR", "Zoom, fuoco, torcia e microfono dalla regia"]],
    ["Controlli", ["Zoom, OBS e ATEM dalla stessa console", "Mixer audio con livelli per canale"]],
    ["Rete", ["Qualità adattiva: il video non si blocca"]],
    ["Registrazione", ["Registrazione sul Mac"]],
    ["Telecomando", ["Dock su iPad e iPhone"]],
  ],
  cloud_start: [
    ["Cloud", ["50 GB di registrazioni online"]],
    ["Condivisione", ["Link con o senza scadenza", "Revochi un link quando vuoi"]],
    ["Account", ["Fino a 3 Mac collegati", "Fatture e disdetta online"]],
  ],
  cloud_pro: [["Cloud", ["250 GB di registrazioni online"]]],
  cloud_studio: [["Cloud", ["1 TB di registrazioni online"]]],
};
const PLAN_INTRO = { free: "Incluso", cloud_start: "Tutto dell'app, più:", cloud_pro: "Tutto di Cloud Start, più:", cloud_studio: "Tutto di Cloud Pro, più:" };
const PLAN_SIZE = gb => gb >= 1000 ? (gb / 1000) + " TB" : gb + " GB";
const PLAN_ESC = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* p: piano di CFG.plans oppure { key: "free" }. action: HTML del pulsante. hl: scheda in evidenza */
function planCard(p, action, hl) {
  const free = p.key === "free";
  const groups = (PLAN_GROUPS[p.key] || []).map(([t, items]) =>
    `<li><b><i aria-hidden="true"></i>${PLAN_ESC(t)}</b>${items.map(x => `<span>${PLAN_ESC(x)}</span>`).join("")}</li>`).join("");
  return `<article class="pc${hl ? " hl" : ""}">
    <header><h3>${free ? "LiveNode<br>App" : PLAN_ESC(p.name).replace(" ", "<br>")}</h3><span class="pc-badge">${free ? "macOS 14.4+" : PLAN_SIZE(p.gb)}</span></header>
    <p class="pc-price">${free ? "Gratis" : PLAN_ESC(p.price)}</p>
    <p class="pc-per">${free ? "per sempre · nessun account" : "al mese · IVA esclusa"}</p>
    ${!free && CFG.trialDays ? `<span class="trial">${CFG.trialDays} giorni gratis</span>` : ""}
    <div class="pc-go">${action}</div>
    <p class="pc-inc">${PLAN_INTRO[p.key] || ""}</p>
    <ul class="pc-list">${groups}</ul>
  </article>`;
}
