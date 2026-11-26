# property-portfolio

Personal property portfolio dashboard. It's a static site hosted on GitHub Pages, with the look and feel inspired by WealthStacker. All portfolio data lives in one JSON file. That file is encrypted, and only the encrypted copy is committed and published.

- **Overview**: net equity, capital growth, debt, LVR, usable equity, rental income, net cash flow, portfolio value chart, equity split, goals.
- **Properties**: a card for each property, and a detail page with valuation history, loans, cash flow breakdown, tenancy and notes.
- **Cash flow**: income, expenses, interest and repayments for each property, annual, monthly and weekly.
- **Data**: edit the JSON in the browser and download a new encrypted file. No tooling needed.

No frameworks, no build step, no runtime dependencies. Charts are hand-rolled SVG.

## How the "auth" works

GitHub Pages has no login. Pages sites are public even from a private repo, unless you have GitHub Enterprise Cloud. Instead:

1. Your real data is kept in `data.json` on your machine. It's gitignored.
2. `npm run encrypt` encrypts it with your password into `site/data.enc.json`, using AES-256-GCM with a PBKDF2-SHA256 key (600k iterations). Only that file is committed.
3. The site asks for the password and decrypts the data in the browser (Web Crypto). The password never leaves the browser. The derived key is kept in `sessionStorage`, or in `localStorage` if you tick "Remember on this device". **Lock** clears it.

Anyone can download the encrypted file, so pick a long, unique password. The HTML, CSS and JS are not secret.

> The committed `site/data.enc.json` holds the **sample data**, encrypted with the password `demo-password`. Replace it with your own before you rely on it.

## Getting started

Requires Node 20+ (`.nvmrc` pins 24) for the scripts. The site itself needs nothing.

```bash
cp site/data.sample.json data.json   # then edit data.json with your properties
npm run encrypt                      # prompts for a password, writes site/data.enc.json
npm run serve                        # http://localhost:8080
git add site/data.enc.json && git commit -m "Update portfolio data" && git push
```

On another machine, `npm run decrypt` recovers `data.json` from the encrypted file. You can also skip Node: open the **Data** page, edit the JSON, enter a password, click **Download data.enc.json**, and upload it to `site/` on GitHub.

For non-interactive use, set `PORTFOLIO_PASSWORD` in the environment.

## Deploying to GitHub Pages

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` runs the tests, then publishes the `site/` folder.

Pages for a **private** repo needs a paid plan (GitHub Pro, Team or Enterprise). On the free plan, either make the repo public or host `site/` elsewhere (Cloudflare Pages, Netlify). The data stays encrypted either way.

## Data format

```jsonc
{
  "owner": "Your name",
  "settings": { "maxLvr": 0.8 },                       // used for "usable equity"
  "goals": [{ "name": "A$1.5M equity", "targetEquity": 1500000, "targetDate": "2032-06-30" }],
  "properties": [
    {
      "id": "unique-slug",                             // required, used in URLs
      "name": "Newstead Apartment",                    // required
      "address": "804/55 Sample Rd", "suburb": "Newstead", "state": "QLD", "postcode": "4006",
      "type": "Apartment", "bedrooms": 2, "bathrooms": 2, "parking": 1, "landSizeSqm": 0,
      "status": "investment",                          // or "owner-occupied"
      "purchase": { "date": "2020-09-01", "price": 560000, "costs": 21000 },   // required
      "valuations": [{ "date": "2026-09-01", "value": 760000, "source": "Bank valuation" }],
      "loans": [{
        "lender": "Bank", "balance": 448000, "rate": 6.19, "type": "IO",      // or "P&I"
        "offset": 0,
        "repayment": 2310, "repaymentFrequency": "monthly",                  // optional
        "termYearsRemaining": 30,                                            // used if no repayment (P&I)
        "fixedUntil": "2027-01-01", "interestOnlyUntil": "2027-09-01"        // optional, display only
      }],
      "rent": { "amount": 720, "frequency": "weekly", "tenant": "J. Citizen",
                "leaseStart": "2026-02-01", "leaseEnd": "2027-01-31",
                "vacancyWeeks": 2, "managementFeePct": 6.6 },
      "expenses": [{ "name": "Council rates", "amount": 1800, "frequency": "annual" }],
      "sold": { "date": "2030-01-01", "price": 900000 },                     // optional, excludes from totals
      "notes": "Free text"
    }
  ]
}
```

- Dates are `YYYY-MM-DD`. Frequencies are `weekly`, `fortnightly`, `monthly`, `quarterly` or `annual`.
- The current value is the latest valuation, or the purchase price if there are no valuations.
- Net cash flow = rent after vacancy − expenses (including management fee) − loan repayments. It's pre-tax, with no depreciation or negative gearing.
- Loan repayments use `repayment` if set. Otherwise IO loans use interest on (balance − offset), and P&I loans are amortised over `termYearsRemaining`.

## Development

```bash
npm test    # node:test unit tests for calculations, validation and crypto
```

Layout: `site/` is the published static site (`index.html`, `css/`, `js/`, `data.enc.json`, `data.sample.json`). `scripts/` holds the Node encrypt, decrypt and serve helpers. `test/` holds the unit tests.
