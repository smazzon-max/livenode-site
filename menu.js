/* LiveNode · menu (come piemme.srl), lista d'attesa e comparsa delle sezioni.
   Serve config.js caricato prima (per l'indirizzo di Supabase). */
(function () {
  var hd = document.getElementById("hd");
  if (hd) {
    var pop = document.getElementById("wl-pop"), mnav = document.getElementById("mnav"), burger = hd.querySelector(".burger");
    var dds = [].slice.call(hd.querySelectorAll(".dd"));
    var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

    // «Product» e «For teams»: si aprono passando sopra (mouse) o premendo (tocco / tastiera)
    function setDd(dd, on) {
      dd.classList.toggle("open", on);
      dd.querySelector(".dd-btn").setAttribute("aria-expanded", on ? "true" : "false");
    }
    function closeDds(except) { dds.forEach(function (d) { if (d !== except) setDd(d, false); }); }
    dds.forEach(function (dd) {
      var t = null;
      var hoverAt = 0;
      dd.querySelector(".dd-btn").addEventListener("click", function () {
        // se si è appena aperto passando col mouse, il clic lo lascia aperto
        var on = !dd.classList.contains("open") || Date.now() - hoverAt < 500;
        closeDds(dd); setDd(dd, on); if (on) setWl(false);
      });
      if (fine) {
        dd.addEventListener("mouseenter", function () { clearTimeout(t); if (!dd.classList.contains("open")) hoverAt = Date.now(); closeDds(dd); setDd(dd, true); });
        dd.addEventListener("mouseleave", function () { t = setTimeout(function () { setDd(dd, false); }, 160); });
      }
    });

    // pannello del telefono (☰)
    function setM(on) {
      hd.classList.toggle("m-open", on);
      if (burger) { burger.setAttribute("aria-expanded", on ? "true" : "false"); burger.setAttribute("aria-label", on ? "Close the menu" : "Open the menu"); }
      if (mnav) { if (on) mnav.removeAttribute("inert"); else mnav.setAttribute("inert", ""); }
      document.documentElement.style.overflow = on ? "hidden" : "";
      if (on) setWl(false);
    }
    if (burger) burger.addEventListener("click", function () { setM(!hd.classList.contains("m-open")); });
    hd.querySelector(".hd-veil").addEventListener("click", function () { setM(false); });
    if (mnav) mnav.addEventListener("click", function (e) { if (e.target.closest("a")) setM(false); });

    // ombra sotto la barra quando si scorre
    function onScroll() { hd.classList.toggle("scrolled", window.scrollY > 8); }
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

    // «Join the waitlist»: apre la finestrella sotto il pulsante
    function setWl(on) {
      if (!pop) return;
      hd.classList.toggle("wl-open", on);
      if (on) { pop.removeAttribute("inert"); var i = pop.querySelector("input[type=email]"); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 60); }
      else pop.setAttribute("inert", "");
    }
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var o = e.target.closest("[data-wl-open]");
      if (o) { e.preventDefault(); setM(false); closeDds(); setWl(!hd.classList.contains("wl-open")); return; }
      if (e.target.closest("[data-wl-close]")) { setWl(false); return; }
      if (pop && hd.classList.contains("wl-open") && !pop.contains(e.target)) setWl(false);
      if (!e.target.closest(".dd")) closeDds();
      var bp = e.target.closest("[data-plans]");
      if (bp) {
        // vale anche se il link ricarica la home: la scheda giusta si apre all'arrivo
        try { sessionStorage.setItem("ln-plans", bp.getAttribute("data-plans") + "|" + Date.now()); } catch (x) {}
        if (typeof window.showPlans === "function") window.showPlans(bp.getAttribute("data-plans"));
        closeDds();
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDds(); setM(false); setWl(false); } });
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
