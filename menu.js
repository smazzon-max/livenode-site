/* LiveNode · menu (come piemme.srl), lista d'attesa e comparsa delle sezioni.
   Serve config.js caricato prima (per l'indirizzo di Supabase). */
(function () {
  var hd = document.getElementById("hd");
  if (hd) {
    var btn = hd.querySelector(".chip-toggle"), panel = hd.querySelector(".chip-panel");
    var pop = document.getElementById("wl-pop");

    // lettere che ruotano al passaggio del mouse
    hd.querySelectorAll("[data-roll]").forEach(function (a) {
      var t = a.textContent; a.setAttribute("aria-label", t); a.textContent = "";
      var r = document.createElement("span"); r.className = "roll"; r.setAttribute("aria-hidden", "true");
      [].forEach.call(t, function (c, i) {
        var ch = document.createElement("span"); ch.className = "rl-c"; ch.style.setProperty("--i", i);
        var x = c === " " ? " " : c;
        ch.innerHTML = "<span></span><span></span>"; ch.children[0].textContent = x; ch.children[1].textContent = x;
        r.appendChild(ch);
      });
      a.appendChild(r);
    });

    // esteso a inizio pagina, chiuso scorrendo
    function onScroll() {
      var wide = window.scrollY < Math.max(80, window.innerHeight * 0.45) && !hd.classList.contains("is-open");
      hd.classList.toggle("is-wide", wide);
    }
    function setWl(on) {
      if (!pop) return;
      hd.classList.toggle("wl-open", on);
      if (on) { pop.removeAttribute("inert"); var i = pop.querySelector("input[type=email]"); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 60); }
      else pop.setAttribute("inert", "");
    }
    function setOpen(on) {
      hd.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Close the menu" : "Open the menu");
      if (on) { panel.removeAttribute("inert"); setWl(false); } else panel.setAttribute("inert", "");
      document.documentElement.style.overflow = on ? "hidden" : "";
      onScroll();
    }
    btn.addEventListener("click", function () { setOpen(!hd.classList.contains("is-open")); });
    hd.querySelector(".hd-veil").addEventListener("click", function () { setOpen(false); setWl(false); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // «Join the waitlist»: apre la finestrella sotto il pulsante
    document.addEventListener("click", function (e) {
      var o = e.target.closest && e.target.closest("[data-wl-open]");
      if (o) { e.preventDefault(); if (hd.classList.contains("is-open")) setOpen(false); setWl(!hd.classList.contains("wl-open")); return; }
      if (e.target.closest && e.target.closest("[data-wl-close]")) { setWl(false); return; }
      if (pop && hd.classList.contains("wl-open") && !pop.contains(e.target)) setWl(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { setOpen(false); setWl(false); } });
  }

  // lista d'attesa: l'email va nella tabella «waitlist» di Supabase (dal sito si può solo aggiungere)
  document.querySelectorAll("form[data-wl]").forEach(function (f) {
    var msg = f.querySelector(".wlf-msg"), go = f.querySelector("button[type=submit]");
    function say(t, ok) { msg.textContent = t; msg.className = "wlf-msg " + (ok ? "ok" : "err"); }
    f.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (f.website && f.website.value) return;
      var email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("Check your email address.", false);
      if (f.privacy && !f.privacy.checked) return say("Please accept the privacy policy.", false);
      if (typeof CFG === "undefined") return say("Couldn’t sign you up. Try again later.", false);
      go.disabled = true;
      try {
        var r = await fetch(CFG.supabaseUrl + "/rest/v1/waitlist", {
          method: "POST",
          headers: { apikey: CFG.anonKey, Authorization: "Bearer " + CFG.anonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ app: f.getAttribute("data-wl") || "livenode", email: email.toLowerCase(), lang: "en" })
        });
        if (r.ok || r.status === 409) { f.classList.add("done"); say("Thanks, you’re on the list. We’ll email you when it’s ready.", true); return; }
        say("Couldn’t sign you up. Try again or write to contact@livenode-software.com.", false);
      } catch (x) { say("Couldn’t sign you up. Try again or write to contact@livenode-software.com.", false); }
      go.disabled = false;
    });
  });

  // le sezioni compaiono scorrendo
  var els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && els.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });
})();
