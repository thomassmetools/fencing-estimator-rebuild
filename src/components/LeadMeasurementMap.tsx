import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import { satelliteTilesAttribution, satelliteTilesUrl } from "../lib/map-config";
import type { LeadRecord } from "../types";

interface LeadMeasurementMapProps {
  lead: LeadRecord;
}

const FitLeadBounds = ({ lead }: LeadMeasurementMapProps) => {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    if (lead.measurementPoints.length === 0) {
      return;
    }

    if (lead.measurementPoints.length === 1) {
      const point = lead.measurementPoints[0];
      map.flyTo([point.lat, point.lng], 19, { duration: 0.6 });
      return;
    }

    map.fitBounds(
      lead.measurementPoints.map((point) => [point.lat, point.lng] as [number, number]),
      { padding: [18, 18] },
    );
  }, [lead, map]);

  return null;
};

export const LeadMeasurementMap = ({ lead }: LeadMeasurementMapProps) => {
  if (lead.measurementPoints.length === 0) {
    return <p className="helper-text">No saved map points for this lead.</p>;
  }

  const center = lead.measurementPoints[0];

  return (
    <div className="lead-map-frame">
      <MapContainer center={[center.lat, center.lng]} zoom={19} scrollWheelZoom={false} className="lead-map">
        <TileLayer
          attribution={satelliteTilesAttribution}
          url={satelliteTilesUrl}
        />
        <FitLeadBounds lead={lead} />
        {lead.measurementPoints.map((point, index) => (
          <CircleMarker
            key={`${lead.id}-${index}`}
            center={[point.lat, point.lng]}
            radius={5}
            pathOptions={{ color: "#fff", fillColor: "#c96f2d", fillOpacity: 1 }}
          />
        ))}
        {lead.measurementPoints.length > 1 ? <Polyline positions={lead.measurementPoints} pathOptions={{ color: "#173f35", weight: 4 }} /> : null}
      </MapContainer>
    </div>
  );
};
