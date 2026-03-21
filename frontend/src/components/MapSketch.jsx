import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

const DEFAULT_CENTER = [20.2961, 85.8245];
const DEFAULT_ZOOM = 17;

function MapController({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 19, { duration: 1.5 });
  }, [flyTo, map]);
  return null;
}

export default function MapSketch({ onDone }) {
  const [area, setArea] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [flyTo, setFlyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const featureGroupRef = useRef(null);

  const handleCreated = (e) => {
    const latlngs = e.layer.getLatLngs()[0];
    const sqm = calculatePolygonArea(latlngs);
    const centroid = e.layer.getBounds().getCenter();
    setArea(Math.round(sqm));
    setCenter([centroid.lat, centroid.lng]);
  };

  const handleDeleted = () => setArea(null);

  const handleConfirm = () => {
    if (!area) return alert("Please draw your rooftop first.");
    onDone({ area, lat: center[0], lng: center[1] });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setSearchError("Geolocation not supported."); return; }
    setLocationLoading(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setFlyTo([pos.coords.latitude, pos.coords.longitude]); setLocationLoading(false); },
      err => {
        setLocationLoading(false);
        setSearchError(err.code === 1 ? "Location access denied." : "Could not get location. Try searching.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      // Add viewbox around Bhubaneswar + bounded=0 so it still searches outside if needed
      const params = new URLSearchParams({
        format: "json",
        q: searchQuery,
        limit: 1,
        countrycodes: "in",
        viewbox: "85.75,20.18,85.95,20.40",  // Bhubaneswar bounding box
        bounded: 0,
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!data.length) {
        setSearchError("Address not found. Try: 'KIIT University, Bhubaneswar'");
      } else {
        setFlyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setSearchQuery(data[0].display_name.split(",").slice(0, 3).join(","));
      }
    } catch {
      setSearchError("Search failed. Check your connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClear = () => { featureGroupRef.current?.clearLayers(); setArea(null); };

  return (
    <div>
      <div className="map-instructions">
        <p className="section-tag">Step 1 of 3</p>
        <h2 className="section-title">Find your rooftop</h2>
        <p className="section-sub">Search your address or use GPS, then draw your rooftop boundary on the satellite map.</p>

        <div className="map-search-row">
          <form onSubmit={handleAddressSearch} className="map-search-form">
            <input
              type="text"
              className="map-search-input"
              placeholder="e.g. Plot 42, Patia, Bhubaneswar, Odisha"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </button>
          </form>
          <button className="btn-secondary" onClick={handleUseMyLocation} disabled={locationLoading}>
            {locationLoading ? "Locating…" : "Use my location"}
          </button>
        </div>

        {searchError && <div className="search-error">{searchError}</div>}
        {area && (
          <div className="area-badge">
            <div className="info-chip-dot" />
            {area} m² drawn — ~{Math.round(area * 0.75)} m² usable for panels
          </div>
        )}
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: 420, width: "100%" }}>
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          attribution="Google Satellite"
          maxZoom={21}
        />
        <MapController flyTo={flyTo} />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            draw={{
              polygon: { allowIntersection: false, showArea: true },
              rectangle: true,
              polyline: false, circle: false, circlemarker: false, marker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>

      <div className="map-footer">
        <button className="btn-secondary" onClick={handleClear}>Clear drawing</button>
        <button className="btn-primary" onClick={handleConfirm} disabled={!area}>
          Confirm rooftop
        </button>
      </div>
    </div>
  );
}

function calculatePolygonArea(latlngs) {
  const R = 6371000;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = latlngs[i].lng * Math.PI / 180;
    const yi = latlngs[i].lat * Math.PI / 180;
    const xj = latlngs[j].lng * Math.PI / 180;
    const yj = latlngs[j].lat * Math.PI / 180;
    area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }
  return Math.abs(area * R * R / 2);
}
