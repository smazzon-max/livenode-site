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
          <div class="f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="nome@esempio.it" required></div>
          <div class="f" id="a-pwf"><label for="a-pw">Password <button type="button" id="a-eye">mostra</button></label><input id="a-pw" type="password" minlength="8" placeholder="almeno 8 caratteri" required></div>
          <div class="str hidden" id="a-str"><i></i><i></i><i></i><i></i><span id="a-strl"></span></div>
          <label class="chk hidden" id="a-cons"><input type="checkbox" id="a-ok"><span>Ho letto e accetto i <a href="terms.html" target="_blank" rel="noopener">Termini di servizio</a> e l'<a href="privacy.html" target="_blank" rel="noopener">Informativa privacy</a>.</span></label>
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
      show(q("#a-form"), form); show(q("#a-sent"), v === "sent"); show(q("#a-new"), v === "new");
      show(q("#a-tabs"), form);
      q("#a-tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.m === (v === "reset" ? "in" : v)));
      show(q("#a-pwf"), v !== "reset"); show(q("#a-str"), v === "up"); show(q("#a-cons"), v === "up");
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
          onDone();
        } else {
          if (password.length < 8) throw Object.assign(new Error("La password deve avere almeno 8 caratteri."), { client: true });
          if (!q("#a-ok").checked) throw Object.assign(new Error("Per creare l'account devi accettare Termini e Privacy."), { client: true });
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: backHere() } });
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

  return { mount, get recovering() { return recovering; }, human };
})();
