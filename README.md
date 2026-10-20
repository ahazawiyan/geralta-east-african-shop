# Geralta East African Shop — learning storefront

A clean, responsive starter website for an East African shop. It includes product filters for **Drinks, Spices, Clothing, Coffee, and Flour**, sample products with demo prices, and a front-end shopping cart.

## Run locally
1. Extract the project folder.
2. Open `index.html` in a browser.
3. Click a category, add products to the cart, and test the cart panel.

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

## Before a real business launch
This is a learning/demo storefront, not a complete production e-commerce system. The cart is browser-only. It does **not** process orders or payments, calculate real shipping, manage stock, or store customer information. Replace sample product details and prices, add the real business contact details, and connect a secure backend/checkout before accepting orders. Never put payment secrets or API keys in this repository.
