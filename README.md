# Geralta East African Shop — learning storefront

A clean, responsive starter website for an East African shop. It includes product filters for **Drinks, Spices, Clothing, Coffee, and Flour**, sample products with demo prices, and a front-end shopping cart.

## Run the storefront locally
Serve the files over HTTP (for example, `py -m http.server 8000`) and open `http://127.0.0.1:8000`. Opening `index.html` directly with `file://` will not support the checkout API request.

## Checkout and Mollie test setup
The production storefront and PHP API are intended to run on Hostinger at `https://gheralta-brussels.be`. `shop-config.js` uses that same origin on the production domain; GitHub Pages is a static preview with checkout disabled. The front-end sends only product IDs and quantities; the API recalculates prices, Belgian postcode/municipality matching, delivery, VAT, and the Mollie amount.

For Hostinger production, create a persistent MySQL database in hPanel and enable/check PHP 8.1+, PDO MySQL, and cURL. Create a `private` folder beside `public_html`. Copy `api/hostinger-private-config.example.php` to `private/gheralta-private-config.php` (outside `public_html`), then fill in the Mollie **test** key, database credentials, and site URLs. The PHP API reads that file outside the web root; keep the real file out of Git. The API deliberately rejects live Mollie keys. Set the Hostinger Git deployment root to `public_html` so `index.html` and `api/` are in the served document root.

For local development, set `GHERALTA_ENVIRONMENT=development`, `GHERALTA_MOLLIE_API_KEY` to a Mollie test key, `GHERALTA_FRONTEND_ORIGIN` to `http://127.0.0.1:8000`, `GHERALTA_PUBLIC_API_BASE_URL` to an HTTPS tunnel URL, and `GHERALTA_DB_PATH` to a disposable SQLite path. Run the front end with `py -m http.server 8000` and the API with `php -S 127.0.0.1:8080 -t .`. Mollie must be able to reach the webhook over HTTPS; for local tests, point an HTTPS tunnel such as ngrok at port 8080. The API stores orders as pending and updates their payment status only after retrieving the payment from Mollie’s webhook. The return page alone never marks an order paid.

VAT is currently calculated at 6% for coffee, flour, and spices, and 21% for standard beer variants over 0.5% ABV. This follows the Belgian rate table for the listed food categories and its beer exception. Confirm each beer's ABV from the product label and have an accountant confirm the product and delivery VAT classification before enabling live payments. Shipping is allocated across the basket's VAT rates in proportion to net item value; confirm this treatment for the shop's exact arrangement. The catalogue prices are VAT-exclusive, and the cart shows net products, net delivery, VAT by rate, and the total including VAT.

Rate references: [Belgian FPS Finance VAT rates](https://financien.belgium.be/nl/node/12036) and [Royal Decree No. 20, Table A](https://wetwetwet.be/nl/kbbtw20) (flour in section VIII; coffee and spices in section X; beer above 0.5% ABV excluded from the reduced food category).

The database stores customer contact and delivery details so orders can be fulfilled. Use a private persistent database location with restricted host access, backups, and a retention policy. Do not put API keys or production database files in this repository.

## Publish with GitHub Pages
1. Create a GitHub repository named `geralta-east-african-shop`.
2. Add these project files to the repository and push them to the `main` branch.
3. In GitHub, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
4. Open the **Actions** tab. The workflow checks the required files and JavaScript syntax, then deploys the site.
5. After a successful deployment, GitHub will show the published Pages URL in the workflow run or Pages settings.

## CI/CD learning path
- **CI (Continuous Integration):** Every push and pull request runs file checks and `node --check app.js`.
- **CD (Continuous Deployment):** A push to `main` that passes validation deploys the site to GitHub Pages.
- **Practice:** Create a branch, change a product name or price in `app.js`, commit, push, open a pull request, and watch the validation job. Merge into `main` to trigger deployment.

## Deployment notes
GitHub Pages deploys only the static storefront files; the workflow intentionally excludes PHP API files. Hostinger’s Git integration deploys the PHP API and static site from its selected repository branch and root directory. Confirm the Hostinger deployment branch before pushing: production should stay on `main`, while this feature branch is reviewed and merged separately. This branch uses Mollie test mode only; it is not ready to accept real payments. Order emails, stock management, refunds, VAT invoice generation, and live-mode controls still need to be designed before launch.

Delivery estimates use Alpha Express's standard car-delivery rates: Brussels €13, Flanders €15, and Wallonia €19, with a €4 supplement above 20 kg. Orders placed today are dispatched from the shop the next day; this is the dispatch time, not a promise of next-day arrival. Current displayed amounts exclude monthly fuel surcharges, tolls, and extra-parcel charges. Belgian postcode and locality choices come from the ODWB `postal-codes-belgium` dataset, sourced from bpost (2021); confirm current postal and carrier data before accepting orders.
