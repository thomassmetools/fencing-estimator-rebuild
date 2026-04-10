export const mapboxAccessToken =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export const hasMapboxAccessToken = Boolean(mapboxAccessToken);
export const hasTurnstileSiteKey = Boolean(turnstileSiteKey);

export const mapboxSatelliteTilesUrl = hasMapboxAccessToken
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`
  : "";

export const openStreetMapTilesUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
