export const googleMapsApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export const mapboxAccessToken =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";

export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
export const isLocalTurnstileBypassEnabled =
  Boolean(import.meta.env.DEV) && import.meta.env.VITE_TURNSTILE_BYPASS === "true";

export const hasMapboxAccessToken = Boolean(mapboxAccessToken);
export const hasTurnstileSiteKey = Boolean(turnstileSiteKey);

// ArcGIS World Imagery — free, no token, reliable up to zoom 18
export const satelliteTilesUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const satelliteTilesAttribution =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export const openStreetMapTilesUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
