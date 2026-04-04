import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { MeasurementMode, MeasurementResult } from "../types";

interface MapMeasurePanelProps {
  onMeasurementChange: (measurement: MeasurementResult | null) => void;
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

const MapClickCollector = ({
  mode,
  onPointAdded,
}: {
  mode: MeasurementMode | null;
  onPointAdded: (point: LatLngLiteral) => void;
}) => {
  useMapEvents({
    click(event) {
      if (!mode) {
        return;
      }

      onPointAdded(event.latlng);
    },
  });

  return null;
};

export const MapMeasurePanel = ({ onMeasurementChange }: MapMeasurePanelProps) => {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [points, setPoints] = useState<LatLngLiteral[]>([]);

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
    };
  }, [mode, points]);

  useEffect(() => {
    onMeasurementChange(null);
  }, [mode, onMeasurementChange]);

  const addPoint = (point: LatLngLiteral) => {
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

  return (
    <section className="panel panel-map">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Customer view</p>
          <h2>Map measure</h2>
          <p>Click around the property boundary to measure a fence run or enclosed area.</p>
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

      <div className="map-frame">
        <MapContainer center={defaultCenter} zoom={19} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickCollector mode={mode} onPointAdded={addPoint} />
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
