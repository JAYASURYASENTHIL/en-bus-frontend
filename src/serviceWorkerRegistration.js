export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(() =>
          console.log("PWA enabled")
        )
        .catch((err) =>
          console.log(err)
        );
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(
      (reg) => reg.unregister()
    );
  }
}