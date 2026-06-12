export let deferredPrompt = null;

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Notify UI that install is available
    window.dispatchEvent(new Event('pwa-install-ready'));
  });
}

export async function triggerAppInstall() {
  if (!deferredPrompt) {
    alert("Install prompt is not available. Please ensure you are accessing the app via HTTPS (Secure Context) or use your browser's 'Add to Home Screen' menu.");
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  // Notify UI to hide install button
  window.dispatchEvent(new Event('pwa-install-done'));
}
