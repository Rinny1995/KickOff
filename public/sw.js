// Minimaler Service Worker – erfüllt nur die technische Voraussetzung,
// damit Browser (v.a. Android/Chrome) KickOff von sich aus als
// installierbare App erkennen. Kein Caching, keine Offline-Funktion.
self.addEventListener("fetch", () => {});
