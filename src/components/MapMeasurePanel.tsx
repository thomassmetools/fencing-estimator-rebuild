import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  googleMapsApiKey,
  hasMapboxAccessToken,
  mapboxAccessToken,
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

const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 };
const DEFAULT_ZOOM = 18;

const metresToFeet = (value: number) => value * 3.28084;

const formatMeasurement = (value: number, unitLabel: string) =>
  `${value.toFixed(1)} ${unitLabel}`;

// ── Polyline drawn with the maps library ──────────────────────────────────────
const FencePolyline = ({ points }: { points: MapPoint[] }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib || points.length < 2) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }

    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (polylineRef.current) {
      polylineRef.current.setPath(path);
    } else {
      polylineRef.current = new mapsLib.Polyline({
        path,
        strokeColor: "#1d4f41",
        strokeWeight: 4,
        strokeOpacity: 0.9,
        map,
      });
    }

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, mapsLib, points]);

  return null;
};

// ── Map click handler + camera controller ────────────────────────────────────
const MapController = ({
  flyTo,
  onPointAdded,
}: {
  flyTo: MapPoint | null;
  onPointAdded: (point: MapPoint) => void;
}) => {
  const map = useMap();

  // Fly to searched address
  useEffect(() => {
    if (!map || !flyTo) return;
    map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    map.setZoom(19);
  }, [map, flyTo]);

  // Click to place points
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener(
      "click",
      (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onPointAdded({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        }
      },
    );
    return () => google.maps.event.removeListener(listener);
  }, [map, onPointAdded]);

  return null;
};

// ── Numbered draggable pin ────────────────────────────────────────────────────
const DraggablePin = ({
  point,
  index,
  onMove,
}: {
  point: MapPoint;
  index: number;
  onMove: (index: number, newPoint: MapPoint) => void;
}) => {
  return (
    <AdvancedMarker
      position={{ lat: point.lat, lng: point.lng }}
      draggable
      onDragEnd={(event) => {
        if (event.latLng) {
          onMove(index, { lat: event.latLng.lat(), lng: event.latLng.lng() });
        }
      }}
    >
      <div className="map-pin">{index + 1}</div>
    </AdvancedMarker>
  );
};

// ── Midpoint bend handle ──────────────────────────────────────────────────────
const BendHandle = ({
  segmentIndex,
  midPoint,
  onBend,
}: {
  segmentIndex: number;
  midPoint: MapPoint;
  onBend: (segmentIndex: number, newPoint: MapPoint) => void;
}) => {
  return (
    <AdvancedMarker
      position={{ lat: midPoint.lat, lng: midPoint.lng }}
      draggable
      onDragEnd={(event) => {
        if (event.latLng) {
          onBend(segmentIndex, {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      }}
    >
      <div className="map-pin-bend" />
    </AdvancedMarker>
  );
};

// ── Address search helpers ────────────────────────────────────────────────────
const searchWithMapbox = async (query: string): Promise<SearchResult[]> => {
  if (!hasMapboxAccessToken) return [];

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=5&types=address&access_token=${mapboxAccessToken}`,
  );
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    features?: Array<{
      id: string;
      properties?: { full_address?: string; name?: string };
      geometry?: { coordinates?: [number, number] };
    }>;
  };

  return (
    payload.features?.flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates) return [];
      return [
        {
          id: feature.id,
          label:
            feature.properties?.full_address ||
            feature.properties?.name ||
            query,
          center: { lng: coordinates[0], lat: coordinates[1] },
        },
      ];
    }) ?? []
  );
};

const searchWithOpenStreetMap = async (
  query: string,
): Promise<SearchResult[]> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) throw new Error("Address search request failed.");

  const payload = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return payload.map((result) => ({
    id: `osm-${result.place_id}`,
    label: result.display_name,
    center: { lat: Number(result.lat), lng: Number(result.lon) },
  }));
};

// ── Main panel ────────────────────────────────────────────────────────────────
export const MapMeasurePanel = ({
  onMeasurementChange,
  onAddressChange,
  measurementSystem,
  savedMeasurementLabel,
}: MapMeasurePanelProps) => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<MapPoint | null>(null);

  const measurement = useMemo<MeasurementResult | null>(() => {
    if (points.length < 2) return null;

    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const cur = points[i];
      const nxt = points[i + 1];
      const latDelta = ((nxt.lat - cur.lat) * Math.PI) / 180;
      const lngDelta = ((nxt.lng - cur.lng) * Math.PI) / 180;
      const a =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos((cur.lat * Math.PI) / 180) *
          Math.cos((nxt.lat * Math.PI) / 180) *
          Math.sin(lngDelta / 2) ** 2;
      totalDistance += 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const displayValue =
      measurementSystem === "imperial"
        ? metresToFeet(totalDistance)
        : totalDistance;

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
    setPoints((prev) => [...prev, point]);
  }, []);

  const movePoint = useCallback((index: number, newPoint: MapPoint) => {
    setPoints((prev) => prev.map((p, i) => (i === index ? newPoint : p)));
  }, []);

  const bendSegment = useCallback((segmentIndex: number, newPoint: MapPoint) => {
    setPoints((prev) => [
      ...prev.slice(0, segmentIndex + 1),
      newPoint,
      ...prev.slice(segmentIndex + 1),
    ]);
  }, []);

  const segmentMidpoints = useMemo<MapPoint[]>(() => {
    if (points.length < 2) return [];
    return points.slice(0, -1).map((p, i) => {
      const next = points[i + 1];
      return { lat: (p.lat + next.lat) / 2, lng: (p.lng + next.lng) / 2 };
    });
  }, [points]);

  const clearPoints = () => {
    setPoints([]);
    onMeasurementChange(null);
  };

  const removeLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
    onMeasurementChange(null);
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
      const results =
        mapboxResults.length > 0
          ? mapboxResults
          : await searchWithOpenStreetMap(query);

      setSearchResults(results);
      if (results.length === 0) setSearchError("No address matches found.");
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unable to search addresses.",
      );
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
          <p>
            Search the address, zoom in, then click each corner of the fence.
            Drag pins to adjust.
          </p>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchAddress();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => void searchAddress()}
          disabled={searchStatus === "loading"}
        >
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
                setFlyTo(result.center);
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
        <APIProvider apiKey={googleMapsApiKey}>
          <Map
            mapId="fencing-estimator-map"
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            mapTypeId="satellite"
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            tilt={0}
            gestureHandling="greedy"
            className="leaflet-map"
            style={{ width: "100%", height: "100%" }}
          >
            <MapController flyTo={flyTo} onPointAdded={addPoint} />
            <FencePolyline points={points} />
            {segmentMidpoints.map((midPoint, index) => (
              <BendHandle
                key={`bend-${index}`}
                segmentIndex={index}
                midPoint={midPoint}
                onBend={bendSegment}
              />
            ))}
            {points.map((point, index) => (
              <DraggablePin
                key={`${index}-${point.lat}-${point.lng}`}
                point={point}
                index={index}
                onMove={movePoint}
              />
            ))}
          </Map>
        </APIProvider>
      </div>

      <div className="map-toolbar">
        <div>
          <strong>
            {measurement
              ? formatMeasurement(measurement.value, measurement.unitLabel)
              : "No measurement yet"}
          </strong>
          <p>
            {points.length === 0
              ? "Click on the map to place your first point along the fence line."
              : points.length === 1
                ? "1 point placed — keep clicking to trace the fence line. Drag any pin to adjust."
                : `${points.length} points — drag pins to adjust, or drag the diamond handles to bend a segment.`}
          </p>
        </div>
        <div className="action-row">
          <button
            type="button"
            onClick={removeLastPoint}
            disabled={points.length === 0}
          >
            Undo last point
          </button>
          <button
            type="button"
            onClick={clearPoints}
            disabled={points.length === 0}
          >
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
