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
const fmtDate = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const gbLabel = gb => gb >= 1000 ? (gb / 1000) + " TB" : gb + " GB";
function say(el, text, kind = "") { el.className = "msg " + kind; el.textContent = text; show(el, !!text); }

/* pagina a cui tornare dopo la conferma email / il recupero password (conserva ?plan=… e ?code=…) */
const backHere = () => location.origin + location.pathname + location.search;

/* ------------------------------------------------------------------
   Accesso e registrazione. Auth.mount(elemento, { onDone, context })
   ------------------------------------------------------------------ */
const Auth = (() => {
  // se si arriva da un link «recupera password», la pagina non deve mostrare l'area riservata
  let recovering = /type=(recovery|invite)/.test(location.hash);   // anche chi arriva da un invito sceglie la password

  function human(error) {
    const t = String((error && error.message) || error || "");
    console.warn("[LiveNode auth]", error);
    const code = error && (error.status || error.code);
    if (/Invalid login credentials/i.test(t)) return "Incorrect email or password.";
    if (/not confirmed/i.test(t)) return "NOT_CONFIRMED";
    if (/already (registered|been registered)|already exists/i.test(t)) return "An account with this email already exists. Sign in.";
    if (/at least (\d+) char/i.test(t)) return "The password is too short (at least 8 characters).";
    if (/same password|different from the old/i.test(t)) return "Choose a password different from the previous one.";
    if (/weak|pwned|easy to guess/i.test(t)) return "This password is too weak or appears in lists of stolen passwords. Choose another one.";
    if (code === 429 || /rate limit|too many|seconds/i.test(t)) return "Too many attempts. Try again in a few minutes.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(t)) return "No connection, or the service can't be reached.";
    if (/invalid.*email|unable to validate email/i.test(t)) return "Check the email address.";
    if (/sending .*email|smtp|mail/i.test(t)) return "We couldn't send the confirmation email. Try again later or write to contact@livenode-software.com.";
    if (/totp|mfa|factor|invalid.*code|code.*invalid|expired/i.test(t)) return "Invalid or expired code. Check your phone's time and try again.";
    if (/database error/i.test(t)) return "Service error while creating the account. Write to contact@livenode-software.com.";
    return "Something went wrong (" + (code || t.slice(0, 60) || "error") + "). Try again.";
  }

  /* true se l'utente ha la verifica in due passaggi e deve ancora inserire il codice */
  async function needsMfa() {
    try {
      const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      return !error && data && data.nextLevel === "aal2" && data.currentLevel !== "aal2";
    } catch (_) { return false; }
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
      <div class="tabs" id="a-tabs" role="tablist"><button type="button" data-m="in" role="tab">Sign in</button><button type="button" data-m="up" role="tab">Create account</button></div>
      <div class="bb">
        ${opts.context ? `<div class="ctxbar">${opts.context}</div>` : ""}
        <div class="msg hidden" id="a-msg" role="status"></div>

        <form id="a-form" novalidate>
          <input class="hp" type="text" name="website" id="a-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="name@example.com" required></div>
          <div class="f" id="a-pwf"><label for="a-pw">Password <button type="button" id="a-eye">show</button></label><input id="a-pw" type="password" minlength="8" placeholder="at least 8 characters" required></div>
          <div class="str hidden" id="a-str"><i></i><i></i><i></i><i></i><span id="a-strl"></span></div>
          <label class="chk hidden" id="a-cons"><input type="checkbox" id="a-ok"><span>I have read and accept the <a href="terms.html" target="_blank" rel="noopener">Terms of Service</a> and the <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
          <button class="key pri full" id="a-go" type="submit">Sign in</button>
          <div class="links"><a href="#" id="a-forgot">Forgot your password?</a><span class="note" id="a-hint"></span></div>
        </form>

        <div class="sent hidden" id="a-sent">
          <h3 style="margin-bottom:6px">Check your inbox</h3>
          <p>We've emailed you to confirm the address:</p>
          <span class="mail" id="a-mail"></span>
          <p class="note">Open the link in the email and come back here. If you can't find it, check your spam folder.</p>
          <div class="row"><button class="key" id="a-resend" type="button">Resend email</button><button class="key" id="a-back" type="button">Change address</button></div>
        </div>

        <form id="a-mfa" class="hidden" novalidate>
          <h3 style="margin-bottom:6px">Verifica in due passaggi</h3>
          <p class="note">Open the authenticator app on your phone and enter the 6-digit LiveNode code.</p>
          <div class="f"><label for="a-code">Code</label><input id="a-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></div>
          <button class="key pri full" id="a-cgo" type="submit">Verify</button>
          <div class="links"><a href="#" id="a-out">Use another account</a></div>
        </form>

        <form id="a-new" class="hidden" novalidate>
          <h3 style="margin-bottom:14px">New password</h3>
          <div class="f"><label for="a-np">New password</label><input id="a-np" type="password" minlength="8" autocomplete="new-password" placeholder="at least 8 characters" required></div>
          <div class="str" id="a-nstr"><i></i><i></i><i></i><i></i><span></span></div>
          <button class="key pri full" id="a-ngo" type="submit">Save password</button>
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
      show(q("#a-tabs"), form);
      q("#a-tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.m === (v === "reset" ? "in" : v)));
      show(q("#a-pwf"), v !== "reset"); show(q("#a-str"), v === "up"); show(q("#a-cons"), v === "up");
      q("#a-go").textContent = v === "in" ? "Sign in" : v === "up" ? "Create account" : "Send link";
      q("#a-pw").autocomplete = v === "up" ? "new-password" : "current-password";
      q("#a-forgot").textContent = v === "reset" ? "← Back to sign in" : "Forgot your password?";
      show(q("#a-forgot"), v !== "up");
      q("#a-hint").textContent = v === "up" ? "No card required." : "";
      say(msg, "");
    }

    function meter(el, label, pw) {
      const s = score(pw);
      el.className = "str " + (pw ? "s" + Math.max(s, 1) : "");
      if (label) label.textContent = pw ? ["", "weak", "fair", "good", "strong"][Math.max(s, 1)] : "";
    }
    q("#a-pw").addEventListener("input", e => meter(q("#a-str"), q("#a-strl"), e.target.value));
    q("#a-np").addEventListener("input", e => meter(q("#a-nstr"), q("#a-nstr span"), e.target.value));
    q("#a-eye").addEventListener("click", () => {
      const p = q("#a-pw"), on = p.type === "password"; p.type = on ? "text" : "password"; q("#a-eye").textContent = on ? "hide" : "show";
    });
    q("#a-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) view(b.dataset.m); });
    q("#a-forgot").addEventListener("click", e => { e.preventDefault(); view(mode === "reset" ? "in" : "reset"); });

    function sentView(email, note) {
      pendingEmail = email; q("#a-mail").textContent = email; view("sent"); if (note) say(msg, note, "warn"); cool(60);
    }
    function cool(sec) {
      cooling = sec; clearInterval(timer);
      const b = q("#a-resend");
      const tick = () => { b.disabled = cooling > 0; b.textContent = cooling > 0 ? `Resend email (${cooling})` : "Resend email"; if (cooling-- <= 0) clearInterval(timer); };
      tick(); timer = setInterval(tick, 1000);
    }
    q("#a-back").addEventListener("click", () => view("up"));
    q("#a-resend").addEventListener("click", async () => {
      const { error } = await sb.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: backHere() } });
      if (error) say(msg, human(error), "err"); else { say(msg, "Email sent again.", "ok"); cool(60); }
    });

    q("#a-form").addEventListener("submit", async e => {
      e.preventDefault();
      if (q("#a-hp").value) return;                       // trappola per i bot
      const email = q("#a-email").value.trim(), password = q("#a-pw").value, go = q("#a-go");
      if (!/^\S+@\S+\.\S+$/.test(email)) return say(msg, "Check the email address.", "err");
      go.disabled = true; say(msg, "");
      try {
        if (mode === "reset") {
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: backHere() });
          if (error) throw error;
          say(msg, "If an account exists for this email, we've sent you a link to choose a new password.", "ok");
        } else if (mode === "in") {
          if (!password) throw Object.assign(new Error("Enter your password."), { client: true });
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (await needsMfa()) { view("mfa"); q("#a-code").focus(); return; }
          onDone();
        } else {
          if (password.length < 8) throw Object.assign(new Error("The password must be at least 8 characters long."), { client: true });
          if (!q("#a-ok").checked) throw Object.assign(new Error("To create an account you need to accept the Terms and Privacy Policy."), { client: true });
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: backHere() } });
          if (error) throw error;
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            view("in"); q("#a-email").value = email; say(msg, "An account with this email already exists. Sign in, or reset your password.", "warn");
          } else if (data.session) onDone();
          else sentView(email);
        }
      } catch (err) {
        const t = human(err);
        if (t === "NOT_CONFIRMED") sentView(email, "You need to confirm your email before signing in. Need a new link?");
        else say(msg, err.client ? err.message : t, "err");
      } finally { go.disabled = false; }
    });

    q("#a-mfa").addEventListener("submit", async e => {
      e.preventDefault();
      const code = q("#a-code").value.replace(/\D/g, "");
      if (code.length !== 6) return say(msg, "The code has 6 digits.", "err");
      q("#a-cgo").disabled = true;
      try {
        const { data, error } = await sb.auth.mfa.listFactors();
        if (error) throw error;
        const f = (data.totp || []).find(x => x.status === "verified");
        if (!f) return onDone();
        const r = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code });
        if (r.error) throw r.error;
        q("#a-code").value = ""; onDone();
      } catch (err) { say(msg, human(err), "err"); }
      finally { q("#a-cgo").disabled = false; }
    });
    q("#a-out").addEventListener("click", async e => { e.preventDefault(); await sb.auth.signOut(); view("in"); });

    q("#a-new").addEventListener("submit", async e => {
      e.preventDefault();
      const p = q("#a-np").value; if (p.length < 8) return say(msg, "The password must be at least 8 characters long.", "err");
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

  return { mount, needsMfa, get recovering() { return recovering; }, human };
})();
