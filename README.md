# GRM IT Solutions — candidate portal (v1)

Static HTML/CSS/JS for **application + payment**. No React, no build step.

Host this folder on **GitHub Pages** (or any static host). Keep Apps Script as the API only.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Application form |
| `pay.html` | Resume retry + Razorpay Checkout |
| `status.html` | Continue with mobile + email |

Assessment is a disabled step in the UI.

## Change look

Edit `css/tokens.css` only:

- `--font-display` / `--font-body`
- `--color-accent`, `--color-bg`, `--color-text`

Add a logo by putting an image inside each `.logo-slot`:

```html
<div class="logo-slot"><img src="logo.svg" alt="GRM IT Solutions" /></div>
```

## Point at your API

`js/config.js` → `scriptUrl` must be the Web App **`/exec`** URL, not the Library URL.

Browser calls use `Content-Type: text/plain` so Apps Script CORS works.

## GitHub Pages

1. Create a GitHub repo and push this folder.
2. Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
3. QR code should use that HTTPS URL, e.g. `https://yourname.github.io/repo/`.

Do not print a localhost or preview URL on the QR.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Apps Script

Do not serve these HTML files from the same `doGet` as the JSON API. This site stays static; the script stays the backend.
