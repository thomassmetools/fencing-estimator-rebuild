import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngLiteral } from "leaflet";
import {
  hasMapboxAccessToken,
  mapboxAccessToken,
  satelliteTilesAttribution,
  satelliteTilesUrl,
} from "../lib/map-config";
import type { MapPoint, MeasurementResult, MeasurementSystem } from "../types";

interface MapMeasurePanelProps {
  onMeasurementChange: (measurement: MeasurementResult | null) => void;
  onAddressChange: (address: string) => void;
  measurementSystem: MeasurementSystem;
  savedMeasurementLabel: string | null;
}

interface SearchResult {
  id: string;
  label: string;
  center: MapPoint;
}

const defaultCenter: LatLngLiteral = { lat: -36.8485, lng: 174.7633 };

const metresToFeet = (value: number) => value * 3.28084;

const formatMeasurement = (value: number, unitLabel: string) => {
  return `${value.toFixed(1)} ${unitLabel}`;
};

// Branded draggable pin with point number
const createPinIcon = (index: number) =>
  L.divIcon({
    className: "",
    html: `<div class="map-pin">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Draggable marker — updates point position on drag end
const DraggableMarker = ({
  point,
  index,
  onMove,
}: {
  point: MapPoint;
  index: number;
  onMove: (index: number, newPoint: MapPoint) => void;
}) => {
  const icon = useMemo(() => createPinIcon(index), [index]);

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const pos = (e.target as L.Marker).getLatLng();
          onMove(index, { lat: pos.lat, lng: pos.lng });
        },
      }}
    />
  );
};

const MapViewController = ({
  center,
  onPointAdded,
}: {
  center: MapPoint | null;
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
      onPointAdded({ lat: event.latlng.lat, lng: event.latlng.lng });
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onPointAdded]);

  return null;
};

export const MapMeasurePanel = ({ onMeasurementChange, onAddressChange, measurementSystem, savedMeasurementLabel }: MapMeasurePanelProps) => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<MapPoint | null>(null);

  const measurement = useMemo<MeasurementResult | null>(() => {
    if (points.length < 2) {
      return null;
    }

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

    const displayValue = measurementSystem === "imperial" ? metresToFeet(totalDistance) : totalDistance;

    return {
      mode: "distance",
      value: displayValue,
      baseValue: totalDistance,
      unitLabel: measurementSystem === "imperial" ? "ft" : "m",
      pointCount: points.length,
      points,
    };
  }, [measurementSystem, points]);

  const addPoint = useCallback((point: MapPoint) => {
    setPoints((current) => [...current, point]);
  }, []);

  const movePoint = useCallback((index: number, newPoint: MapPoint) => {
    setPoints((current) => current.map((p, i) => (i === index ? newPoint : p)));
  }, []);

  const clearPoints = () => {
    setPoints([]);
    onMeasurementChange(null);
  };

  const removeLastPoint = () => {
    setPoints((current) => current.slice(0, -1));
    onMeasurementChange(null);
  };

  const searchWithMapbox = async (query: string): Promise<SearchResult[]> => {
    if (!hasMapboxAccessToken) {
      return [];
    }

    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=5&access_token=${mapboxAccessToken}`,
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      features?: Array<{ id: string; properties?: { full_address?: string; name?: string }; geometry?: { coordinates?: [number, number] } }>;
    };

    return (
      payload.features?.flatMap((feature) => {
        const coordinates = feature.geometry?.coordinates;
        if (!coordinates) {
          return [];
        }

        return [
          {
            id: feature.id,
            label: feature.properties?.full_address || feature.properties?.name || query,
            center: {
              lng: coordinates[0],
              lat: coordinates[1],
            },
          },
        ];
      }) ?? []
    );
  };

  const searchWithOpenStreetMap = async (query: string): Promise<SearchResult[]> => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error("Address search request failed.");
    }

    const payload = (await response.json()) as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;

    return payload.map((result) => ({
      id: `osm-${result.place_id}`,
      label: result.display_name,
      center: {
        lat: Number(result.lat),
        lng: Number(result.lon),
      },
    }));
  };

  const searchAddress = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);

    try {
      const mapboxResults = await searchWithMapbox(query);
      const nextResults = mapboxResults.length > 0 ? mapboxResults : await searchWithOpenStreetMap(query);

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

  return (
    <section className="panel panel-map">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2>Measure your fence line</h2>
          <p>Search the address, zoom in, then click each corner of the fence. Drag pins to adjust.</p>
        </div>
        {savedMeasurementLabel ? (
          <span className="saved-measurement-chip">
            Saved: {savedMeasurementLabel}
          </span>
        ) : null}
      </div>

      <div className="map-search-bar">
        <label className="field-stack grow">
          <span>Address search</span>
          <input
            type="text"
            placeholder="Search address"
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
                onAddressChange(result.label);
              }}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="map-frame">
        <MapContainer
          center={defaultCenter}
          zoom={18}
          maxZoom={22}
          scrollWheelZoom
          className="leaflet-map"
        >
          <TileLayer
            attribution={satelliteTilesAttribution}
            url={satelliteTilesUrl}
            maxNativeZoom={18}
            maxZoom={22}
          />
          <MapViewController center={mapCenter} onPointAdded={addPoint} />
          {points.map((point, index) => (
            <DraggableMarker
              key={`${point.lat}-${point.lng}-${index}`}
              point={point}
              index={index}
              onMove={movePoint}
            />
          ))}
          {points.length > 1 ? (
            <Polyline positions={points} pathOptions={{ color: "#1d4f41", weight: 4, opacity: 0.9 }} />
          ) : null}
        </MapContainer>
      </div>

      <div className="map-toolbar">
        <div>
          <strong>{measurement ? formatMeasurement(measurement.value, measurement.unitLabel) : "No measurement yet"}</strong>
          <p>
            {points.length === 0
              ? "Click on the map to place your first point along the fence line."
              : points.length === 1
                ? "1 point placed — keep clicking to trace the fence line. Drag any pin to adjust."
                : `${points.length} points — drag pins to fine-tune, then save when ready.`}
          </p>
        </div>
        <div className="action-row">
          <button type="button" onClick={removeLastPoint} disabled={points.length === 0}>
            Undo last point
          </button>
          <button type="button" onClick={clearPoints} disabled={points.length === 0}>
            Clear all
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onMeasurementChange(measurement)}
            disabled={!measurement}
          >
            Save & continue →
          </button>
        </div>
      </div>
    </section>
  );
};
