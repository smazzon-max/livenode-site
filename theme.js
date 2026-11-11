/* LiveNode · tema chiaro / scuro. Parte dal sistema; la scelta fatta col pulsante resta salvata nel browser */
(function () {
  var d = document.documentElement, KEY = "ln-theme", saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function set(t) {
    d.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#0b0b0b" : "#ffffff");
  }
  set(saved === "light" || saved === "dark" ? saved : (mq && mq.matches ? "dark" : "light"));
  if (mq && mq.addEventListener) mq.addEventListener("change", function (e) { if (!saved) set(e.matches ? "dark" : "light"); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]"); if (!b) return;
    saved = d.getAttribute("data-theme") === "dark" ? "light" : "dark";
    set(saved);
    try { localStorage.setItem(KEY, saved); } catch (x) {}
  });
  document.addEventListener("DOMContentLoaded", function () { set(d.getAttribute("data-theme")); });
})();
