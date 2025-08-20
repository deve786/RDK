// Helper to register/unregister service worker in production builds
export function register() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          // Registration successful
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch((error) => {
          console.error('ServiceWorker registration failed: ', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
