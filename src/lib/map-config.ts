export const mapboxAccessToken =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoidGhvbWFzMTNob3dpZSIsImEiOiJjbW50NzdqdngwazlkMnBwcGRvdW1qbTUxIn0.OhVhBMFaoQ09UHuEukj8CA";

export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAC6NdHns6MZVXgFh";
export const isLocalTurnstileBypassEnabled =
  Boolean(import.meta.env.DEV) && import.meta.env.VITE_TURNSTILE_BYPASS === "true";

export const hasMapboxAccessToken = Boolean(mapboxAccessToken);
export const hasTurnstileSiteKey = Boolean(turnstileSiteKey);

// Mapbox satellite — supports zoom up to 22 (vs ArcGIS max 18)
export const satelliteTilesUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxAccessToken}`;

export const satelliteTilesAttribution =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const openStreetMapTilesUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
