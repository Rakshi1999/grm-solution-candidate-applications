(function () {
  var form = document.getElementById("apply-form");
  var banner = document.getElementById("banner");
  var submitBtn = document.getElementById("submit-btn");
  var feeNote = document.getElementById("fee-note");
  var existing = document.getElementById("existing");
  var existingCopy = document.getElementById("existing-copy");
  var resumeInput = document.getElementById("resume");

  var token = GRM.session.token();
  if (token) {
    existing.classList.remove("hidden");
    existingCopy.textContent =
      "Application " +
      (GRM.session.applicationId() || "") +
      " is saved on this phone. Continue to payment, or submit again only if you are applying for a different role.";
  }

  GRM.api
    .post({ action: "getPublicConfig" })
    .then(function (cfg) {
      if (cfg && cfg.ok) {
        feeNote.textContent =
          "Registration fee after submit: " +
          (cfg.paymentAmountLabel || "") +
          ". Resume " +
          (cfg.resumeRequired ? "is required before payment" : "is optional") +
          ".";
      }
    })
    .catch(function () {});

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function allowedResume(file) {
    if (!file) return { ok: true };
    var max = (GRM.config.resumeMaxMb || 2) * 1024 * 1024;
    if (file.size > max) {
      return { ok: false, message: "Resume must be 2 MB or smaller." };
    }
    var name = (file.name || "").toLowerCase();
    var okType =
      name.endsWith(".pdf") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx") ||
      file.type === "application/pdf" ||
      file.type === "application/msword" ||
      (file.type && file.type.indexOf("wordprocessingml") !== -1);
    if (!okType) return { ok: false, message: "Upload a PDF, DOC, or DOCX file." };
    return { ok: true };
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    GRM.ui.hideBanner(banner);

    if (!form.reportValidity()) {
      GRM.ui.showBanner(banner, "error", "Please fill the required fields.");
      return;
    }

    var file = resumeInput.files && resumeInput.files[0];
    var fileCheck = allowedResume(file);
    if (!fileCheck.ok) {
      GRM.ui.showBanner(banner, "error", fileCheck.message);
      return;
    }

    GRM.ui.setBusy(submitBtn, true, "Saving…");

    try {
      var created = await GRM.api.post({
        action: "createApplication",
        fullName: val("fullName"),
        mobile: val("mobile"),
        email: val("email"),
        dob: val("dob"),
        gender: val("gender"),
        currentLocation: val("currentLocation"),
        address: val("address"),
        highestQualification: val("highestQualification"),
        specialization: val("specialization"),
        college: val("college"),
        graduationYear: val("graduationYear"),
        percentageCgpa: val("percentageCgpa"),
        totalExperience: val("totalExperience"),
        relevantExperience: val("relevantExperience"),
        currentCompany: val("currentCompany"),
        skills: val("skills"),
        positionCourse: val("positionCourse")
      });

      if (!created.ok) {
        GRM.ui.showBanner(banner, "error", created.message || "We couldn't save your application. Please try again.");
        GRM.ui.setBusy(submitBtn, false, "Submit application");
        return;
      }

      var accessToken = created.accessToken;
      var applicationId =
        (created.application && created.application.applicationId) || created.applicationId || "";
      GRM.session.save(accessToken, applicationId);

      if (file && accessToken) {
        GRM.ui.setBusy(submitBtn, true, "Uploading resume…");
        var base64 = await GRM.api.fileToBase64(file);
        var uploaded = await GRM.api.post({
          action: "uploadResume",
          token: accessToken,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileBase64: base64
        });
        if (!uploaded.ok) {
          GRM.ui.showBanner(
            banner,
            "warn",
            (uploaded.message || "Resume could not be uploaded.") + " You can retry on the next screen."
          );
        }
      }

      window.location.href = "pay.html?t=" + encodeURIComponent(accessToken);
    } catch (err) {
      GRM.ui.showBanner(
        banner,
        "error",
        err.message || "We couldn't save your application. Please try again."
      );
      GRM.ui.setBusy(submitBtn, false, "Submit application");
    }
  });
})();
