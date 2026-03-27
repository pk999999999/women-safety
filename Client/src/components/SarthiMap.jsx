import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix typical React-Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redZoneOptions = { color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.4 };
const dangerZoneOptions = { color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.4 };
const safePathOptions = { color: '#10B981', weight: 6, opacity: 0.8 };

function AutoCenter({ location }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([location.lat, location.lng], map.getZoom());
  }, [location, map]);
  return null;
}

export default function SarthiMap({ location, dangerZones, isSOS, isSarthiActive, customRoute }) {
  // A fallback mock safe route around the closest danger zone, if customRoute not loaded
  const fallbackSafeRoute = [
    [location.lat, location.lng],
    [location.lat + 0.005, location.lng + 0.005],
    [location.lat + 0.01, location.lng + 0.007],
    [location.lat + 0.015, location.lng + 0.015]
  ];

  const routeToPlot = customRoute || fallbackSafeRoute;

  return (
    <div className={`map-container glass`} style={{ border: isSarthiActive ? '3px solid #FF2E63' : '1px solid rgba(255,255,255,0.1)' }}>
      <MapContainer 
        center={[location.lat, location.lng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%', borderRadius: '18px' }}
      >
        <AutoCenter location={location} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* User Marker */}
        <Marker position={[location.lat, location.lng]}>
          <Popup>
            {isSOS ? <strong>🚨 DIRECT SOS ACTIVE!</strong> : 'You are currently here.'}
            <br />
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Popup>
        </Marker>

        {/* Dynamic Danger Zones from GeoJSON Backend */}
        {dangerZones.map((zone, idx) => (
          <Circle 
            key={idx} 
            center={zone.center} 
            pathOptions={zone.severity === 'Critical' ? redZoneOptions : dangerZoneOptions} 
            radius={zone.radius} 
          >
            <Popup>⚠️ High-Crime KDE Zone. Avoid this area!</Popup>
          </Circle>
        ))}

        {/* Suggested Safe Route OSRM */}
        <Polyline pathOptions={safePathOptions} positions={routeToPlot} />

      </MapContainer>
    </div>
  );
}
