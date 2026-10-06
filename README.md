# Qaiser Group of Electronics – Salesman Rate Portal

A React/Vite rate portal for QGE salesmen. It shows **Cash** and **Installment** rates for each company / product / model, plus **Fix Rate** for Haier, with month/year, remarks, smart search, and Company / Product filters.

## Login

- **Username:** `QGE@1983`
- **Password:** the SHA-256 hash stored in `src/components/Login.tsx` is:
  `9033d010904f493397296c5cdb334b211e12868b17c83ac1fc198ce756289284`

The app verifies the entered password in the browser using Web Crypto SHA-256. The plaintext password is not stored in the source code.

> **Security note:** this is still a client-side login. A public GitHub repository cannot keep the rate data or authentication secret. Anyone who can inspect the site source can work around client-side access controls. Use a server-side authentication system for genuinely confidential rates.

## Rates file

Place a file named **`rates.xlsx`** in the repository root for live data. The portal also accepts `Rates.xlsx` or `rates.csv`.

### Excel columns

| Month | Year | Company | Product | Model | Cash Rate | Installment Rate | Fix Rate | Remarks |
|---|---:|---|---|---|---:|---:|---:|---|
| May | 2026 | Haier | Refrigerator | HRF-336 EBD | 128500 | 152000 | 139000 | Free delivery |
| May | 2026 | Dawlance | Microwave | DW-295 HP | 33500 | 40000 | | |

- **Month:** `May`, `5`, or an Excel date.
- **Year:** four-digit year (or two-digit year).
- **Fix Rate:** mainly for Haier; displayed on Haier cards.
- **Remarks:** optional.
- Rates can be numbers (`128500`) or text such as `Rs 128,500`, `Call`, or `N/A`.
- One sheet or multiple sheets are supported.
- Older months can remain in the workbook; the portal keeps the latest rate for each Company + Model.

Use `rates-template.csv` as the column template.

## Run locally

```bash
npm install
npm run dev
```

Build the deployable single-file site:

```bash
npm run build
```

The build output is placed in `dist/`.

## GitHub Pages

This repository is configured as a Vite project with `vite-plugin-singlefile`, so the production `dist/index.html` is self-contained.

For a simple Pages deployment:

1. Push the repository to GitHub.
2. Run `npm run build`.
3. In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the source.
4. Commit and push. The included workflow builds the app and, when present, copies `rates.xlsx`, `Rates.xlsx`, or `rates.csv` from the repository root into the Pages artifact.

When rates are updated, replace `rates.xlsx` in the repository root and commit the change. The workflow redeploys the portal automatically. Use the refresh button in the portal to fetch the newest file.
