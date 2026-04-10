import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import { hasMapboxAccessToken, mapboxAccessToken, mapboxSatelliteTilesUrl, openStreetMapTilesUrl } from "../lib/map-config";
import type { MapPoint, MeasurementMode, MeasurementResult } from "../types";

interface MapMeasurePanelProps {
  onMeasurementChange: (measurement: MeasurementResult | null) => void;
}

interface SearchResult {
  id: string;
  label: string;
  center: MapPoint;
}

const defaultCenter: LatLngLiteral = { lat: -36.8485, lng: 174.7633 };

const calculatePolygonArea = (points: LatLngLiteral[]) => {
  if (points.length < 3) {
    return 0;
  }

  const averageLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLng = Math.cos((averageLat * Math.PI) / 180) * 111_320;

  const projected = points.map((point) => ({
    x: point.lng * metresPerDegreeLng,
    y: point.lat * metresPerDegreeLat,
  }));

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const next = (index + 1) % projected.length;
    area += projected[index].x * projected[next].y;
    area -= projected[next].x * projected[index].y;
  }

  return Math.abs(area) / 2;
};

const formatMeasurement = (mode: MeasurementMode, value: number) => {
  return mode === "distance" ? `${value.toFixed(1)} m` : `${value.toFixed(1)} m2`;
};

const MapViewController = ({
  mode,
  center,
  points,
  onPointAdded,
}: {
  mode: MeasurementMode | null;
  center: MapPoint | null;
  points: MapPoint[];
  onPointAdded: (point: MapPoint) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 19, { duration: 0.8 });
    }
  }, [center, map]);

  useEffect(() => {
    const handleClick = (event: { latlng: LatLngLiteral }) => {
      if (!mode) {
        return;
      }

      onPointAdded({ lat: event.latlng.lat, lng: event.latlng.lng });
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, mode, onPointAdded]);

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);
    if (bounds.length === 1) {
      map.flyTo(bounds[0], 19, { duration: 0.6 });
      return;
    }

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
};

export const MapMeasurePanel = ({ onMeasurementChange }: MapMeasurePanelProps) => {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<MapPoint | null>(null);

  const measurement = useMemo<MeasurementResult | null>(() => {
    if (points.length < 2) {
      return null;
    }

    if (mode === "distance") {
      let totalDistance = 0;
      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const latDelta = ((next.lat - current.lat) * Math.PI) / 180;
        const lngDelta = ((next.lng - current.lng) * Math.PI) / 180;
        const a =
          Math.sin(latDelta / 2) ** 2 +
          Math.cos((current.lat * Math.PI) / 180) *
            Math.cos((next.lat * Math.PI) / 180) *
            Math.sin(lngDelta / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += 6_371_000 * c;
      }

      return {
        mode,
        value: totalDistance,
        unitLabel: "m",
        pointCount: points.length,
        points,
      };
    }

    if (points.length < 3) {
      return null;
    }

    return {
      mode,
      value: calculatePolygonArea(points),
      unitLabel: "m2",
      pointCount: points.length,
      points,
    };
  }, [mode, points]);

  useEffect(() => {
    onMeasurementChange(null);
  }, [mode, onMeasurementChange]);

  const addPoint = (point: MapPoint) => {
    setPoints((current) => [...current, point]);
  };

  const clearPoints = () => {
    setPoints([]);
    onMeasurementChange(null);
  };

  const removeLastPoint = () => {
    setPoints((current) => current.slice(0, -1));
    onMeasurementChange(null);
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (!hasMapboxAccessToken) {
      setSearchError("Add a Mapbox access token to enable address search.");
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(searchQuery)}&limit=5&access_token=${mapboxAccessToken}`,
      );

      if (!response.ok) {
        throw new Error("Mapbox search request failed.");
      }

      const payload = (await response.json()) as {
        features?: Array<{ id: string; properties?: { full_address?: string; name?: string }; geometry?: { coordinates?: [number, number] } }>;
      };

      const nextResults =
        payload.features?.flatMap((feature) => {
          const coordinates = feature.geometry?.coordinates;
          if (!coordinates) {
            return [];
          }

          return [
            {
              id: feature.id,
              label: feature.properties?.full_address || feature.properties?.name || searchQuery,
              center: {
                lng: coordinates[0],
                lat: coordinates[1],
              },
            },
          ];
        }) ?? [];

      setSearchResults(nextResults);
      if (nextResults.length === 0) {
        setSearchError("No address matches found.");
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Unable to search addresses.");
      setSearchResults([]);
    } finally {
      setSearchStatus("idle");
    }
  };

  const activeTilesUrl =
    mapStyle === "satellite" && hasMapboxAccessToken ? mapboxSatelliteTilesUrl : openStreetMapTilesUrl;

  return (
    <section className="panel panel-map">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Customer view</p>
          <h2>Map measure</h2>
          <p>Search the address, switch to satellite if needed, then click around the property boundary.</p>
        </div>
        <div className="segmented-control">
          <button
            type="button"
            className={mode === "distance" ? "active" : ""}
            onClick={() => {
              setMode("distance");
              setPoints([]);
            }}
          >
            Distance
          </button>
          <button
            type="button"
            className={mode === "area" ? "active" : ""}
            onClick={() => {
              setMode("area");
              setPoints([]);
            }}
          >
            Area
          </button>
        </div>
      </div>

      <div className="map-search-bar">
        <label className="field-stack grow">
          <span>Address search</span>
          <input
            type="text"
            placeholder="Search with Mapbox"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchAddress();
              }
            }}
          />
        </label>
        <button type="button" className="primary" onClick={() => void searchAddress()} disabled={searchStatus === "loading"}>
          {searchStatus === "loading" ? "Searching..." : "Find address"}
        </button>
        <div className="segmented-control">
          <button type="button" className={mapStyle === "street" ? "active" : ""} onClick={() => setMapStyle("street")}>
            Street
          </button>
          <button
            type="button"
            className={mapStyle === "satellite" ? "active" : ""}
            onClick={() => setMapStyle("satellite")}
            disabled={!hasMapboxAccessToken}
            title={!hasMapboxAccessToken ? "Add a Mapbox token to enable satellite view." : undefined}
          >
            Satellite
          </button>
        </div>
      </div>

      {searchError ? <p className="error-text">{searchError}</p> : null}
      {searchResults.length > 0 ? (
        <div className="search-result-list">
          {searchResults.map((result) => (
            <button
              type="button"
              key={result.id}
              className="search-result-item"
              onClick={() => {
                setMapCenter(result.center);
                setSearchResults([]);
                setSearchQuery(result.label);
              }}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}

      {!hasMapboxAccessToken ? (
        <p className="helper-text">Mapbox token not configured yet, so the map falls back to OpenStreetMap and search is disabled.</p>
      ) : null}

      <div className="map-frame">
        <MapContainer center={defaultCenter} zoom={19} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution={
              mapStyle === "satellite" && hasMapboxAccessToken
                ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
            url={activeTilesUrl}
            tileSize={mapStyle === "satellite" && hasMapboxAccessToken ? 512 : 256}
            zoomOffset={mapStyle === "satellite" && hasMapboxAccessToken ? -1 : 0}
          />
          <MapViewController mode={mode} center={mapCenter} points={points} onPointAdded={addPoint} />
          {points.map((point, index) => (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${index}`}
              center={point}
              radius={6}
              pathOptions={{ color: "#fff", fillColor: "#c96f2d", fillOpacity: 1 }}
            />
          ))}
          {mode === "distance" && points.length > 1 ? (
            <Polyline positions={points} pathOptions={{ color: "#173f35", weight: 4 }} />
          ) : null}
          {mode === "area" && points.length > 2 ? (
            <Polygon positions={points} pathOptions={{ color: "#173f35", weight: 3, fillOpacity: 0.2 }} />
          ) : null}
        </MapContainer>
      </div>

      <div className="map-toolbar">
        <div>
          <strong>{measurement ? formatMeasurement(measurement.mode, measurement.value) : "No measurement yet"}</strong>
          <p>{points.length} points added. Click more points, then save the result into the quote box.</p>
        </div>
        <div className="action-row">
          <button type="button" onClick={removeLastPoint} disabled={points.length === 0}>
            Undo last point
          </button>
          <button type="button" onClick={clearPoints} disabled={points.length === 0}>
            Clear points
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onMeasurementChange(measurement)}
            disabled={!measurement}
          >
            Use this measurement
          </button>
        </div>
      </div>
    </section>
  );
};
