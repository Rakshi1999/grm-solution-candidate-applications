(function (global) {
  var cfg = global.GRM.config;

  function saveSession(token, applicationId) {
    if (token) localStorage.setItem(cfg.tokenKey, token);
    if (applicationId) localStorage.setItem(cfg.applicationKey, applicationId);
  }

  function readToken() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get("t");
    if (fromUrl) {
      localStorage.setItem(cfg.tokenKey, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(cfg.tokenKey) || "";
  }

  function readApplicationId() {
    return localStorage.getItem(cfg.applicationKey) || "";
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var bytes = new Uint8Array(reader.result);
        var binary = "";
        var chunk = 0x8000;
        for (var i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        resolve(btoa(binary));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function post(payload) {
    var res = await fetch(cfg.scriptUrl, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    var text = await res.text();
    var trimmed = String(text || "").trim();
    if (!trimmed) {
      throw new Error("Empty response from server. Redeploy the Web App as Anyone, even anonymous.");
    }
    if (trimmed.charAt(0) === "<") {
      throw new Error(
        "Google returned a web page instead of JSON (often a redirect/auth issue). Use the /exec Web App URL and Deploy → Anyone, even anonymous."
      );
    }
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      throw new Error("The server did not return a valid response. Check the Web App URL and access setting.");
    }
  }

  function showBanner(el, type, message) {
    if (!el) return;
    el.className = "banner is-on is-" + type;
    el.textContent = message;
  }

  function hideBanner(el) {
    if (!el) return;
    el.className = "banner";
    el.textContent = "";
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = !!busy;
    if (label) button.textContent = label;
  }

  global.GRM.api = { post: post, fileToBase64: fileToBase64 };
  global.GRM.session = { save: saveSession, token: readToken, applicationId: readApplicationId };
  global.GRM.ui = { showBanner: showBanner, hideBanner: hideBanner, setBusy: setBusy };
})(window);
