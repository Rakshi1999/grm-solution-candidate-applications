(function () {
  var banner = document.getElementById("banner");
  var token = GRM.session.token();
  var pollTimer = null;

  function show(id) {
    ["panel-loading", "panel-resume", "panel-pay", "panel-paid", "panel-missing"].forEach(function (panelId) {
      document.getElementById(panelId).classList.toggle("hidden", panelId !== id);
    });
  }

  function render(app) {
    if (!app) {
      show("panel-missing");
      return;
    }
    GRM.session.save(token, app.applicationId);

    if (app.next === "uploadResume") {
      show("panel-resume");
      return;
    }

    if (app.paymentStatus === "Paid" || app.next === "paid") {
      show("panel-paid");
      document.getElementById("paid-copy").textContent =
        "Application ID: " +
        (app.applicationId || "—") +
        ". Your assessment will be available in the next version.";
      return;
    }

    show("panel-pay");
    document.getElementById("pay-hello").textContent = "Hello, " + (app.fullName || "candidate");
    document.getElementById("app-id").textContent = app.applicationId || "—";
    document.getElementById("app-role").textContent = app.positionCourse || "—";
    var rupees = typeof app.amountPaise === "number" ? "₹" + (app.amountPaise / 100).toFixed(0) : "—";
    document.getElementById("app-amount").textContent = rupees;
  }

  async function refresh() {
    if (!token) {
      show("panel-missing");
      return;
    }
    try {
      var state = await GRM.api.post({ action: "getState", token: token });
      if (!state.ok) {
        show("panel-missing");
        GRM.ui.showBanner(banner, "error", state.message || "This link is invalid or has expired.");
        return;
      }
      render(state.application);
    } catch (err) {
      GRM.ui.showBanner(banner, "error", err.message || "Something went wrong. Please try again.");
      show("panel-missing");
    }
  }

  function startPoll() {
    var started = Date.now();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async function () {
      if (Date.now() - started > 60000) {
        clearInterval(pollTimer);
        return;
      }
      var state = await GRM.api.post({ action: "getState", token: token }).catch(function () {
        return null;
      });
      if (state && state.ok && state.application && state.application.paymentStatus === "Paid") {
        clearInterval(pollTimer);
        render(state.application);
      }
    }, 2500);
  }

  document.getElementById("resume-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var input = document.getElementById("resume");
    var file = input.files && input.files[0];
    var btn = document.getElementById("resume-btn");
    if (!file) {
      GRM.ui.showBanner(banner, "error", "Please choose a resume file.");
      return;
    }
    if (file.size > (GRM.config.resumeMaxMb || 2) * 1024 * 1024) {
      GRM.ui.showBanner(banner, "error", "Resume must be 2 MB or smaller.");
      return;
    }
    GRM.ui.setBusy(btn, true, "Uploading…");
    try {
      var base64 = await GRM.api.fileToBase64(file);
      var uploaded = await GRM.api.post({
        action: "uploadResume",
        token: token,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        fileBase64: base64
      });
      if (!uploaded.ok) {
        GRM.ui.showBanner(banner, "error", uploaded.message || "Upload failed. Please try again.");
        GRM.ui.setBusy(btn, false, "Upload and continue");
        return;
      }
      GRM.ui.hideBanner(banner);
      render(uploaded.application);
    } catch (err) {
      GRM.ui.showBanner(banner, "error", err.message || "Upload failed. Please try again.");
    }
    GRM.ui.setBusy(btn, false, "Upload and continue");
  });

  document.getElementById("pay-btn").addEventListener("click", async function () {
    var btn = document.getElementById("pay-btn");
    GRM.ui.hideBanner(banner);
    GRM.ui.setBusy(btn, true, "Creating order…");

    if (typeof Razorpay === "undefined") {
      document.getElementById("inapp-note").textContent =
        "Checkout could not load. If you opened this from Instagram or WhatsApp, tap ··· and Open in Chrome or Safari.";
      GRM.ui.setBusy(btn, false, "Pay now");
      return;
    }

    try {
      var order = await GRM.api.post({ action: "createOrder", token: token });
      if (!order.ok) {
        if (order.error === "ALREADY_PAID" && order.application) {
          render(order.application);
          return;
        }
        var payMsg = order.message || "Payment was not completed. You can try again.";
        if (order.details) payMsg += " (" + order.details + ")";
        if (order.error) payMsg += " [" + order.error + "]";
        GRM.ui.showBanner(banner, "error", payMsg);
        GRM.ui.setBusy(btn, false, "Pay now");
        return;
      }
      if (!order.keyId || !order.orderId) {
        GRM.ui.showBanner(
          banner,
          "error",
          "Razorpay order was not created. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Script properties."
        );
        GRM.ui.setBusy(btn, false, "Pay now");
        return;
      }

      var checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: GRM.config.company,
        description: "Application " + (order.applicationId || ""),
        order_id: order.orderId,
        prefill: {
          name: order.name || "",
          email: order.email || "",
          contact: order.contact || ""
        },
        theme: { color: "#125e56" },
        handler: async function (response) {
          GRM.ui.setBusy(btn, true, "Verifying…");
          var verified = await GRM.api.post({
            action: "verifyPayment",
            token: token,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          if (verified.ok) {
            render(verified.application);
          } else {
            GRM.ui.showBanner(banner, "warn", verified.message || "Payment is still processing. Refresh in a moment.");
            startPoll();
          }
          GRM.ui.setBusy(btn, false, "Pay now");
        }
      });

      checkout.on("payment.failed", function () {
        GRM.ui.showBanner(banner, "error", "Payment was not completed. You can try again.");
        GRM.ui.setBusy(btn, false, "Pay now");
      });

      checkout.open();
      startPoll();
      GRM.ui.setBusy(btn, false, "Pay now");
    } catch (err) {
      GRM.ui.showBanner(banner, "error", err.message || "Payment was not completed. You can try again.");
      GRM.ui.setBusy(btn, false, "Pay now");
    }
  });

  refresh();
})();
