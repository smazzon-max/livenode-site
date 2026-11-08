/* LiveNode · schede dei piani (home e account). Prezzi e nomi arrivano da config.js */
const PLAN_GROUPS = {
  free: [
    ["Cameras", ["iPhone as a camera with a QR code", "Zoom, focus, torch and mic from the control room"]],
    ["Control", ["Zoom, OBS and ATEM from one console", "Audio mixer with per-channel levels"]],
    ["Network", ["Adaptive quality: video doesn't freeze"]],
    ["Recording", ["Recording on the Mac"]],
    ["Remote", ["Dock on iPad and iPhone"]],
  ],
  cloud_start: [
    ["Cloud", ["50 GB of online recordings"]],
    ["Sharing", ["Links with or without expiry", "Revoke a link anytime"]],
    ["Account", ["Up to 3 linked Macs", "Online invoices and cancellation"]],
  ],
  cloud_pro: [["Cloud", ["250 GB of online recordings"]]],
  cloud_studio: [["Cloud", ["1 TB of online recordings"]]],
};
const PLAN_INTRO = { free: "Included", cloud_start: "Everything in the app, plus:", cloud_pro: "Everything in Cloud Start, plus:", cloud_studio: "Everything in Cloud Pro, plus:" };
const PLAN_SIZE = gb => gb >= 1000 ? (gb / 1000) + " TB" : gb + " GB";
const PLAN_ESC = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* p: piano di CFG.plans oppure { key: "free" }. action: HTML del pulsante. hl: scheda in evidenza.
   Ogni scheda ha gli stessi blocchi (nome, prezzo, spazio, nota, pulsante): così i pulsanti restano allineati. */
function planCard(p, action, hl) {
  const free = p.key === "free";
  const groups = (PLAN_GROUPS[p.key] || []).map(([t, items]) =>
    `<li><b><i aria-hidden="true"></i>${PLAN_ESC(t)}</b>${items.map(x => `<span>${PLAN_ESC(x)}</span>`).join("")}</li>`).join("");
  const note = free ? "Download and go live"
    : CFG.trialDays ? `${CFG.trialDays} days free, then ${PLAN_ESC(p.price)} a month` : "Cancel anytime";
  return `<article class="pc${hl ? " hl" : ""}">
    <h3>${free ? "LiveNode App" : PLAN_ESC(p.name)}</h3>
    <p class="pc-price"><b>${free ? "0 €" : PLAN_ESC(p.price)}</b><small>${free ? "forever<br>no account" : "per month<br>excl. VAT"}</small></p>
    <p class="pc-gb"><b>${free ? "macOS 14.4+" : PLAN_SIZE(p.gb)}</b><span>${free ? "Apple silicon and Intel" : "of cloud recordings"}</span></p>
    <p class="pc-note"><i aria-hidden="true"></i>${note}</p>
    <div class="pc-go">${action}</div>
    <p class="pc-inc">${PLAN_INTRO[p.key] || ""}</p>
    <ul class="pc-list">${groups}</ul>
  </article>`;
}
