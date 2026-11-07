/* LiveNode · lingua. Ricorda la scelta (EN/IT) e, sulle pagine inglesi,
   porta alla versione italiana chi l'ha scelta. Le pagine di servizio
   (account, collegamento, video) seguono anche la lingua del browser. */
(function () {
  var K = "ln-lang", d = document.documentElement, p = null;
  try { p = localStorage.getItem(K); } catch (e) {}
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-setlang]");
    if (a) try { localStorage.setItem(K, a.getAttribute("data-setlang")); } catch (x) {}
  });
  var it = d.getAttribute("data-it");
  if (!it || p === "en") return;
  var auto = d.getAttribute("data-auto");
  var wantsIt = p === "it" || (auto === "always" && !p && /^it\b/i.test(navigator.language || ""));
  if (wantsIt) location.replace(it + location.search + location.hash);
})();
