/* LiveNode · funzioni comuni (account, collegamento Mac) */

const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

async function fn(name, body) {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${CFG.functions}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": CFG.anonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) { const e = new Error(data.error || "errore"); e.data = data; e.status = res.status; throw e; }
  return data;
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const show = (el, on = true) => el && el.classList.toggle("hidden", !on);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = d => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
const gbLabel = gb => gb >= 1000 ? (gb / 1000) + " TB" : gb + " GB";
function say(el, text, kind = "") { el.className = "msg " + kind; el.textContent = text; show(el, !!text); }

/* pagina a cui tornare dopo la conferma email / il recupero password (conserva ?plan=… e ?code=…) */
const backHere = () => location.origin + location.pathname + location.search;

/* Campi del profilo, usati da registrazione e pagina Account */
const Prof = {
  employees: [["", "Seleziona"], ["1", "Solo io"], ["2-10", "2–10"], ["11-50", "11–50"], ["51-200", "51–200"], ["201+", "Oltre 200"]],
  countryCodes: ["IT","SM","VA","CH","AT","DE","FR","ES","PT","BE","NL","LU","IE","GB","DK","SE","NO","FI","PL","CZ","SK","SI","HR","HU","RO","BG","GR","MT","CY","US","CA","AU","AE","BR","MX","ZZ"],
  countryOptions(sel) {
    let dn = null; try { dn = new Intl.DisplayNames(["it"], { type: "region" }); } catch (_) {}
    const name = c => c === "ZZ" ? "Altro paese" : (dn ? dn.of(c) : c);
    const list = this.countryCodes.filter(c => c !== "ZZ").map(c => [c, name(c)]).sort((a, b) => a[1].localeCompare(b[1], "it"));
    list.unshift(["", "Seleziona"]); list.push(["ZZ", "Altro paese"]);
    return list.map(([v, t]) => `<option value="${v}" ${v === (sel || "") ? "selected" : ""}>${t}</option>`).join("");
  },
  employeeOptions(sel) { return this.employees.map(([v, t]) => `<option value="${v}" ${v === (sel || "") ? "selected" : ""}>${t}</option>`).join(""); },
  /* HTML dei campi: prefisso p = id univoco */
  fields(p, v = {}) {
    return `
      <div class="f2"><div class="f"><label for="${p}-fn">Nome</label><input id="${p}-fn" type="text" autocomplete="given-name" maxlength="80" value="${esc(v.first_name || "")}"></div>
      <div class="f"><label for="${p}-ln">Cognome</label><input id="${p}-ln" type="text" autocomplete="family-name" maxlength="80" value="${esc(v.last_name || "")}"></div></div>
      <div class="f"><label>Come usi LiveNode?</label>
        <div class="seg" id="${p}-use"><button type="button" data-v="personal" class="${v.usage === "business" ? "" : "on"}">Uso personale</button><button type="button" data-v="business" class="${v.usage === "business" ? "on" : ""}">Uso professionale</button></div></div>
      <div id="${p}-biz" class="${v.usage === "business" ? "" : "hidden"}">
        <div class="f"><label for="${p}-co">Azienda o ente</label><input id="${p}-co" type="text" autocomplete="organization" maxlength="120" value="${esc(v.company || "")}"></div>
        <div class="f2"><div class="f"><label for="${p}-em">Dipendenti</label><select id="${p}-em">${this.employeeOptions(v.employees)}</select></div>
        <div class="f"><label for="${p}-vat">P.IVA <span style="text-transform:none;letter-spacing:0">(facoltativa)</span></label><input id="${p}-vat" type="text" maxlength="40" value="${esc(v.vat || "")}"></div></div>
      </div>
      <div class="f"><label for="${p}-cc">Paese</label><select id="${p}-cc">${this.countryOptions(v.country)}</select></div>`;
  },
  /* collega il selettore personale/professionale */
  wire(root, p) {
    const seg = root.querySelector(`#${p}-use`);
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      show(root.querySelector(`#${p}-biz`), b.dataset.v === "business");
    });
  },
  /* legge i campi; restituisce { data } oppure { error } */
  read(root, p) {
    const g = id => (root.querySelector(`#${p}-${id}`) || {}).value || "";
    const usage = (root.querySelector(`#${p}-use button.on`) || {}).dataset?.v || "personal";
    const d = { first_name: g("fn").trim(), last_name: g("ln").trim(), usage, country: g("cc"),
      company: usage === "business" ? g("co").trim() : "", employees: usage === "business" ? g("em") : "", vat: usage === "business" ? g("vat").trim() : "" };
    if (!d.first_name || !d.last_name) return { error: "Inserisci nome e cognome." };
    if (usage === "business" && !d.company) return { error: "Indica il nome dell'azienda o dell'ente." };
    if (usage === "business" && !d.employees) return { error: "Indica quanti dipendenti ha l'azienda." };
    if (!d.country) return { error: "Seleziona il paese." };
    return { data: d };
  },
};

/* ------------------------------------------------------------------
   Accesso e registrazione. Auth.mount(elemento, { onDone, context })
   ------------------------------------------------------------------ */
const Auth = (() => {
  // se si arriva da un link «recupera password», la pagina non deve mostrare l'area riservata
  let recovering = /type=recovery/.test(location.hash);

  function human(error) {
    const t = String((error && error.message) || error || "");
    console.warn("[LiveNode auth]", error);
    const code = error && (error.status || error.code);
    if (/Invalid login credentials/i.test(t)) return "Email o password non corrette.";
    if (/invalid.*(totp|code)|mfa.*(verif|code)|code.*(invalid|expired)/i.test(t)) return "Codice non corretto o scaduto. Riprova con il codice attuale.";
    if (/not confirmed/i.test(t)) return "NOT_CONFIRMED";
    if (/already (registered|been registered)|already exists/i.test(t)) return "Esiste già un account con questa email. Accedi.";
    if (/at least (\d+) char/i.test(t)) return "La password è troppo corta (minimo 8 caratteri).";
    if (/same password|different from the old/i.test(t)) return "Scegli una password diversa dalla precedente.";
    if (/weak|pwned|easy to guess/i.test(t)) return "Questa password è troppo debole o compare in elenchi di password rubate. Scegline un'altra.";
    if (code === 429 || /rate limit|too many|seconds/i.test(t)) return "Troppi tentativi. Riprova tra qualche minuto.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(t)) return "Connessione assente o servizio non raggiungibile.";
    if (/invalid.*email|unable to validate email/i.test(t)) return "Controlla l'indirizzo email.";
    if (/sending .*email|smtp|mail/i.test(t)) return "Non riesco a inviare l'email di conferma. Riprova più tardi o scrivici a marco@piol.it.";
    if (/database error/i.test(t)) return "Errore del servizio durante la creazione dell'account. Scrivici a marco@piol.it.";
    return "Qualcosa non ha funzionato (" + (code || t.slice(0, 60) || "errore") + "). Riprova.";
  }

  function score(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    return p.length < 8 ? Math.min(s, 1) : s;
  }

  function mount(host, opts = {}) {
    const onDone = opts.onDone || (() => {});
    host.innerHTML = `
    <div class="box" id="a-box">
      <div class="tabs" id="a-tabs" role="tablist"><button type="button" data-m="in" role="tab">Accedi</button><button type="button" data-m="up" role="tab">Crea account</button></div>
      <div class="bb">
        ${opts.context ? `<div class="ctxbar">${opts.context}</div>` : ""}
        <div class="msg hidden" id="a-msg" role="status"></div>

        <form id="a-form" novalidate>
          <input class="hp" type="text" name="website" id="a-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div id="a-prof" class="hidden">${Prof.fields("ap")}</div>
          <div class="f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="nome@esempio.it" required></div>
          <div class="f" id="a-pwf"><label for="a-pw">Password <button type="button" id="a-eye">mostra</button></label><input id="a-pw" type="password" minlength="8" placeholder="almeno 8 caratteri" required></div>
          <div class="str hidden" id="a-str"><i></i><i></i><i></i><i></i><span id="a-strl"></span></div>
          <label class="chk hidden" id="a-cons"><input type="checkbox" id="a-ok"><span>Ho letto e accetto i <a href="terms.html" target="_blank" rel="noopener">Termini di servizio</a> e l'<a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a>.</span></label>
          <label class="chk hidden" id="a-mkw"><input type="checkbox" id="a-mk"><span>Voglio ricevere novità e aggiornamenti su LiveNode (facoltativo).</span></label>
          <button class="key pri full" id="a-go" type="submit">Accedi</button>
          <div class="links"><a href="#" id="a-forgot">Password dimenticata?</a><span class="note" id="a-hint"></span></div>
        </form>

        <div class="sent hidden" id="a-sent">
          <h3 style="margin-bottom:6px">Controlla la posta</h3>
          <p>Ti abbiamo scritto per confermare l'indirizzo:</p>
          <span class="mail" id="a-mail"></span>
          <p class="note">Apri il link nell'email e torna qui. Se non la trovi, guarda in spam.</p>
          <div class="row"><button class="key" id="a-resend" type="button">Reinvia email</button><button class="key" id="a-back" type="button">Cambia indirizzo</button></div>
        </div>

        <form id="a-mfa" class="hidden" novalidate>
          <h3 style="margin-bottom:6px">Verifica in due passaggi</h3>
          <p>Apri l'app di autenticazione sul telefono e inserisci il codice a 6 cifre di LiveNode.</p>
          <div class="f"><label for="a-code">Codice</label><input id="a-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000" style="letter-spacing:.4em;text-align:center;font-size:20px"></div>
          <button class="key pri full" id="a-mgo" type="submit">Verifica</button>
          <div class="links"><a href="#" id="a-mout">Esci e usa un altro account</a></div>
        </form>

        <form id="a-new" class="hidden" novalidate>
          <h3 style="margin-bottom:14px">Nuova password</h3>
          <div class="f"><label for="a-np">Nuova password</label><input id="a-np" type="password" minlength="8" autocomplete="new-password" placeholder="almeno 8 caratteri" required></div>
          <div class="str" id="a-nstr"><i></i><i></i><i></i><i></i><span></span></div>
          <button class="key pri full" id="a-ngo" type="submit">Salva password</button>
        </form>
      </div>
    </div>`;

    const q = s => host.querySelector(s);
    const msg = q("#a-msg");
    let mode = "in", pendingEmail = "", cooling = 0, timer = null;

    function view(v) {
      mode = v;
      const form = v === "in" || v === "up" || v === "reset";
      show(q("#a-form"), form); show(q("#a-sent"), v === "sent"); show(q("#a-new"), v === "new"); show(q("#a-mfa"), v === "mfa");
      show(q("#a-prof"), v === "up"); show(q("#a-mkw"), v === "up");
      show(q("#a-tabs"), form);
      q("#a-tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.m === (v === "reset" ? "in" : v)));
      show(q("#a-pwf"), v !== "reset"); show(q("#a-str"), v === "up"); show(q("#a-cons"), v === "up");
      if (v === "mfa") setTimeout(() => q("#a-code") && q("#a-code").focus(), 50);
      q("#a-go").textContent = v === "in" ? "Accedi" : v === "up" ? "Crea account" : "Invia link";
      q("#a-pw").autocomplete = v === "up" ? "new-password" : "current-password";
      q("#a-forgot").textContent = v === "reset" ? "← Torna all'accesso" : "Password dimenticata?";
      show(q("#a-forgot"), v !== "up");
      q("#a-hint").textContent = v === "up" ? "Nessuna carta richiesta." : "";
      say(msg, "");
    }

    function meter(el, label, pw) {
      const s = score(pw);
      el.className = "str " + (pw ? "s" + Math.max(s, 1) : "");
      if (label) label.textContent = pw ? ["", "debole", "discreta", "buona", "ottima"][Math.max(s, 1)] : "";
    }
    q("#a-pw").addEventListener("input", e => meter(q("#a-str"), q("#a-strl"), e.target.value));
    q("#a-np").addEventListener("input", e => meter(q("#a-nstr"), q("#a-nstr span"), e.target.value));
    q("#a-eye").addEventListener("click", () => {
      const p = q("#a-pw"), on = p.type === "password"; p.type = on ? "text" : "password"; q("#a-eye").textContent = on ? "nascondi" : "mostra";
    });
    Prof.wire(host, "ap");
    q("#a-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) view(b.dataset.m); });
    q("#a-forgot").addEventListener("click", e => { e.preventDefault(); view(mode === "reset" ? "in" : "reset"); });

    function sentView(email, note) {
      pendingEmail = email; q("#a-mail").textContent = email; view("sent"); if (note) say(msg, note, "warn"); cool(60);
    }
    function cool(sec) {
      cooling = sec; clearInterval(timer);
      const b = q("#a-resend");
      const tick = () => { b.disabled = cooling > 0; b.textContent = cooling > 0 ? `Reinvia email (${cooling})` : "Reinvia email"; if (cooling-- <= 0) clearInterval(timer); };
      tick(); timer = setInterval(tick, 1000);
    }
    q("#a-back").addEventListener("click", () => view("up"));
    q("#a-resend").addEventListener("click", async () => {
      const { error } = await sb.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: backHere() } });
      if (error) say(msg, human(error), "err"); else { say(msg, "Email inviata di nuovo.", "ok"); cool(60); }
    });

    q("#a-form").addEventListener("submit", async e => {
      e.preventDefault();
      if (q("#a-hp").value) return;                       // trappola per i bot
      const email = q("#a-email").value.trim(), password = q("#a-pw").value, go = q("#a-go");
      if (!/^\S+@\S+\.\S+$/.test(email)) return say(msg, "Controlla l'indirizzo email.", "err");
      go.disabled = true; say(msg, "");
      try {
        if (mode === "reset") {
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: backHere() });
          if (error) throw error;
          say(msg, "Se esiste un account con questa email, ti abbiamo inviato il link per scegliere una nuova password.", "ok");
        } else if (mode === "in") {
          if (!password) throw Object.assign(new Error("Inserisci la password."), { client: true });
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (await needsMfa()) view("mfa"); else onDone();
        } else {
          if (password.length < 8) throw Object.assign(new Error("La password deve avere almeno 8 caratteri."), { client: true });
          const pr = Prof.read(host, "ap");
          if (pr.error) throw Object.assign(new Error(pr.error), { client: true });
          if (!q("#a-ok").checked) throw Object.assign(new Error("Per creare l'account devi accettare Termini e Privacy."), { client: true });
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: backHere(), data: { ...pr.data, marketing: q("#a-mk").checked, terms: true } } });
          if (error) throw error;
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            view("in"); q("#a-email").value = email; say(msg, "Esiste già un account con questa email. Accedi, oppure recupera la password.", "warn");
          } else if (data.session) onDone();
          else sentView(email);
        }
      } catch (err) {
        const t = human(err);
        if (t === "NOT_CONFIRMED") sentView(email, "Prima di accedere devi confermare l'email. Ti serve un nuovo link?");
        else say(msg, err.client ? err.message : t, "err");
      } finally { go.disabled = false; }
    });

    q("#a-mfa").addEventListener("submit", async e => {
      e.preventDefault();
      const code = q("#a-code").value.replace(/\s/g, "");
      if (!/^\d{6}$/.test(code)) return say(msg, "Inserisci il codice a 6 cifre.", "err");
      q("#a-mgo").disabled = true;
      try {
        const { data: fs, error: e1 } = await sb.auth.mfa.listFactors(); if (e1) throw e1;
        const f = (fs.totp || []).find(x => x.status === "verified"); if (!f) throw new Error("no factor");
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code });
        if (error) throw error;
        onDone();
      } catch (err) { say(msg, human(err), "err"); q("#a-code").value = ""; q("#a-code").focus(); }
      finally { q("#a-mgo").disabled = false; }
    });
    q("#a-mout").addEventListener("click", async e => { e.preventDefault(); await sb.auth.signOut(); view("in"); onDone(); });

    q("#a-new").addEventListener("submit", async e => {
      e.preventDefault();
      const p = q("#a-np").value; if (p.length < 8) return say(msg, "La password deve avere almeno 8 caratteri.", "err");
      q("#a-ngo").disabled = true;
      const { error } = await sb.auth.updateUser({ password: p });
      q("#a-ngo").disabled = false;
      if (error) return say(msg, human(error), "err");
      recovering = false; history.replaceState(null, "", location.pathname + location.search);
      onDone();
    });

    sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") { recovering = true; view("new"); } });
    if (recovering) view("new"); else view(opts.start === "up" ? "up" : "in");
    return { view };
  }

  /* true se l'utente ha la verifica in due passaggi e la sessione non l'ha ancora superata */
  async function needsMfa() {
    try {
      const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      return !!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2";
    } catch (_) { return false; }
  }

  return { mount, needsMfa, get recovering() { return recovering; }, human };
})();
