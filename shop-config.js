// The production storefront and PHP API share the Hostinger domain.
// GitHub Pages remains a static preview and intentionally has no payment API.
(() => {
  const hostname = window.location.hostname.toLowerCase();
  window.GHERALTA_API_BASE_URL = hostname === "gheralta-brussels.be"
    ? window.location.origin
    : hostname === "127.0.0.1"
      ? "http://127.0.0.1:8080"
      : hostname === "localhost"
        ? "http://localhost:8080"
        : "";
})();
