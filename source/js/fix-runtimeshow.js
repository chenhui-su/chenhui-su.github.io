(function () {
  function fixRuntimeShow() {
    var el = document.getElementById("runtimeshow");
    if (!el) return;
    var val = el.getAttribute("data-publishDate");
    if (val === null || val === undefined) {
      val = el.getAttribute("data-publishdate");
      if (val) el.setAttribute("data-publishDate", val);
    }
    if (typeof addRuntime === "function" && typeof GLOBAL_CONFIG !== "undefined" && GLOBAL_CONFIG.runtime) {
      addRuntime();
    }
  }

  fixRuntimeShow();

  document.addEventListener("pjax:complete", function () {
    var configDiff = document.getElementById("config-diff");
    if (configDiff) {
      var newScript = document.createElement("script");
      newScript.id = "config-diff";
      newScript.text = configDiff.text || configDiff.textContent || "";
      configDiff.parentNode.replaceChild(newScript, configDiff);
    }
    setTimeout(fixRuntimeShow, 0);
  });
})();
