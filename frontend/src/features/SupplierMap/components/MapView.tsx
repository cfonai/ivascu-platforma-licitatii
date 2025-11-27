import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Supplier } from '../types/supplier.types';

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  suppliers: Supplier[];
  onSupplierClick?: (supplier: Supplier) => void;
}

// Component to update map center when suppliers change
function MapUpdater({ suppliers }: { suppliers: Supplier[] }) {
  const map = useMap();

  useEffect(() => {
    if (suppliers.length > 0) {
      // Calculate bounds to fit all markers
      const bounds = L.latLngBounds(
        suppliers.map(s => [s.lat, s.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } else {
      // Default to Romania center
      map.setView([45.9432, 24.9668], 7);
    }
  }, [suppliers, map]);

  return null;
}

export default function MapView({ suppliers, onSupplierClick }: MapViewProps) {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg">
      <MapContainer
        center={[45.9432, 24.9668]} // Center of Romania
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Update map when suppliers change */}
        <MapUpdater suppliers={suppliers} />

        {/* Supplier markers */}
        {suppliers.map((supplier) => (
          <Marker
            key={supplier.id}
            position={[supplier.lat, supplier.lng]}
            eventHandlers={{
              click: () => onSupplierClick?.(supplier),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{supplier.name}</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Oraș:</span> {supplier.city}
                  </p>
                  <p>
                    <span className="font-medium">Rating:</span>{' '}
                    <span className="text-yellow-600">★</span> {supplier.reputationScore}
                  </p>
                  <p>
                    <span className="font-medium">Comenzi câștigate:</span> {supplier.ordersWon}
                  </p>
                  <p>
                    <span className="font-medium">Rata succes:</span> {supplier.successRate}%
                  </p>
                  <div className="mt-2">
                    <span className="font-medium">Specializări:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {supplier.specialties.slice(0, 3).map((specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      📧 {supplier.email}
                    </p>
                    <p className="text-xs text-gray-600">
                      📞 {supplier.phone}
                    </p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
