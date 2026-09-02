(function () {
  var form = document.getElementById("lookup-form");
  var banner = document.getElementById("banner");
  var btn = document.getElementById("lookup-btn");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    GRM.ui.hideBanner(banner);
    GRM.ui.setBusy(btn, true, "Looking up…");
    try {
      var result = await GRM.api.post({
        action: "lookupApplication",
        mobile: document.getElementById("mobile").value,
        email: document.getElementById("email").value
      });
      if (!result.ok) {
        GRM.ui.showBanner(banner, "error", result.message || "No application found for these details.");
        GRM.ui.setBusy(btn, false, "Continue");
        return;
      }
      GRM.session.save(result.accessToken, result.application && result.application.applicationId);
      window.location.href = "pay.html?t=" + encodeURIComponent(result.accessToken);
    } catch (err) {
      GRM.ui.showBanner(banner, "error", err.message || "Something went wrong. Please try again.");
      GRM.ui.setBusy(btn, false, "Continue");
    }
  });
})();
