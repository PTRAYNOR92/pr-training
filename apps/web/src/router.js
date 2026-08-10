// FE-003 — simple hash router. Placeholder — extend as views are factored out of script.legacy.js.
const routes = new Map();

export function registerRoute(hash, renderer) {
  routes.set(hash, renderer);
}

export function mountRouter() {
  const render = () => {
    const hash = window.location.hash || '#/';
    const renderer = routes.get(hash);
    if (renderer) renderer();
  };
  window.addEventListener('hashchange', render);
  render();
}
