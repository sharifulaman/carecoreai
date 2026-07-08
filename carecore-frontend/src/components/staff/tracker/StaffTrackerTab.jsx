import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { MapPin, Users, Clock, RefreshCw, Navigation, Signal, SignalZero, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import LocationConsentModal from "./LocationConsentModal";
import { toast } from "sonner";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TRACKER_ROLES_CAN_VIEW = ["admin", "admin_officer", "admin_manager", "rsm", "regional_manager", "team_manager", "team_leader", "hr_officer", "hr_manager", "finance_officer", "finance_manager"];

function createStaffIcon(name, isRecent) {
  const initials = name?.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "?";
  const color = isRecent ? "#3b82f6" : "#94a3b8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
    <circle cx="20" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="20" y="23" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">${initials}</text>
    <polygon points="12,32 28,32 20,46" fill="${color}" stroke="white" stroke-width="1.5"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [40, 50],
    iconAnchor: [20, 46],
    popupAnchor: [0, -46],
    className: "",
  });
}

function StaffMarker({ location, isCurrentUser }) {
  const isRecent = location.timestamp
    ? (Date.now() - new Date(location.timestamp).getTime()) < 3 * 60 * 1000 // within 3 mins
    : false;

  const icon = createStaffIcon(location.staff_name, isRecent || isCurrentUser);
  const lastSeen = location.timestamp
    ? formatDistanceToNow(new Date(location.timestamp), { addSuffix: true })
    : "Unknown";

  return (
    <Marker position={[location.latitude, location.longitude]} icon={icon}>
      {location.accuracy && location.accuracy > 0 && (
        <Circle
          center={[location.latitude, location.longitude]}
          radius={location.accuracy}
          pathOptions={{ color: isCurrentUser ? "#3b82f6" : "#94a3b8", fillOpacity: 0.1, weight: 1 }}
        />
      )}
      <Popup>
        <div className="min-w-[160px]">
          <p className="font-bold text-slate-800">{location.staff_name || "Unknown"}</p>
          <p className="text-xs text-slate-500 capitalize">{location.staff_role?.replace(/_/g, " ") || "Staff"}</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-slate-600">
              <span className="font-medium">Last seen:</span> {lastSeen}
            </p>
            {location.accuracy && (
              <p className="text-slate-600">
                <span className="font-medium">Accuracy:</span> ±{Math.round(location.accuracy)}m
              </p>
            )}
            <p className={`font-semibold ${isRecent ? "text-green-600" : "text-amber-500"}`}>
              {isRecent ? "● Live" : "● Last known position"}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function StaffTrackerTab({ staffProfile, staff = [], ownLocationOnly = false }) {
  const canViewMap = ownLocationOnly || TRACKER_ROLES_CAN_VIEW.includes(staffProfile?.role);
  const isFieldStaff = !canViewMap || true; // all staff can share location

  const [consent, setConsent] = useState(null); // null = loading, true/false
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showOffline, setShowOffline] = useState(false);
  const intervalRef = useRef(null);

  // Load consent status
  const { data: consentData, refetch: refetchConsent } = useQuery({
    queryKey: ["location-consent", staffProfile?.id],
    queryFn: () => base44.entities.LocationTrackingConsent.filter({ staff_id: staffProfile?.id }),
    enabled: !!staffProfile?.id,
    staleTime: 30000,
  });

  useEffect(() => {
    if (consentData !== undefined) {
      const hasConsent = consentData?.some(c => c.consented && !c.revoked_at);
      setConsent(hasConsent);
    }
  }, [consentData]);

  // Fetch all locations for the map
  const { data: locations = [], refetch: refetchLocations } = useQuery({
    queryKey: ["employee-locations"],
    queryFn: () => base44.entities.EmployeeLocation.filter({ org_id: ORG_ID }),
    enabled: canViewMap,
    refetchInterval: 30000, // auto-refresh map every 30s
    staleTime: 15000,
  });

  const sendLocation = useCallback(async (pos) => {
    const { latitude, longitude, accuracy, heading, speed } = pos.coords;
    setMyLocation({ latitude, longitude, accuracy });
    try {
      await base44.functions.invoke("recordEmployeeLocation", {
        org_id: ORG_ID,
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        staff_role: staffProfile.role,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
      });
      setLastUpdate(new Date());
      setGeoError(null);
    } catch (e) {
      // silently fail — will retry next minute
    }
  }, [staffProfile]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your device/browser.");
      return;
    }
    // Immediate first call
    navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
      setGeoError(err.message);
    }, { enableHighAccuracy: true, timeout: 10000 });

    // Then every 60 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
        setGeoError(err.message);
      }, { enableHighAccuracy: true, timeout: 10000 });
    }, 60000);

    setTrackingActive(true);
    toast.success("Location tracking started");
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTrackingActive(false);
    setMyLocation(null);
    toast.info("Location tracking paused");
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Start tracking automatically if consent is given
  useEffect(() => {
    if (consent === true && !trackingActive) {
      startTracking();
    }
    if (consent === false && trackingActive) {
      stopTracking();
    }
  }, [consent]);

  const handleConsentGiven = () => {
    setShowConsentModal(false);
    refetchConsent();
  };

  const handleRevokeConsent = async () => {
    if (!window.confirm("Are you sure you want to stop location sharing?")) return;
    const existing = consentData?.find(c => c.consented);
    if (existing) {
      await base44.entities.LocationTrackingConsent.update(existing.id, {
        consented: false,
        revoked_at: new Date().toISOString(),
      });
    }
    stopTracking();
    setConsent(false);
    refetchConsent();
    toast.info("Location tracking disabled");
  };

  // Filter: show only recent (last 2 hours) or toggle all
  const now = Date.now();
  const filteredLocations = locations.filter(loc => {
    if (!loc.latitude || !loc.longitude) return false;
    if (ownLocationOnly && loc.staff_id !== staffProfile?.id) return false;
    if (showOffline) return true;
    return loc.timestamp && (now - new Date(loc.timestamp).getTime()) < 2 * 60 * 60 * 1000;
  });

  const onlineCount = locations.filter(loc => loc.timestamp && (now - new Date(loc.timestamp).getTime()) < 3 * 60 * 1000).length;

  const mapCenter = filteredLocations.length > 0
    ? [filteredLocations[0].latitude, filteredLocations[0].longitude]
    : [51.505, -0.09]; // Default London

  return (
    <div className="space-y-4">
      {showConsentModal && (
        <LocationConsentModal
          staffProfile={staffProfile}
          onConsented={handleConsentGiven}
          onDecline={() => setShowConsentModal(false)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" /> Staff Tracker
          </h2>
          <p className="text-sm text-slate-500">Live GPS location of field staff — updates every 60 seconds</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewMap && !ownLocationOnly && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700">
                <Signal className="w-3.5 h-3.5" /> {onlineCount} Live
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
                <Users className="w-3.5 h-3.5" /> {filteredLocations.length} on map
              </div>
              <button
                onClick={() => setShowOffline(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${showOffline ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                {showOffline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showOffline ? "All staff" : "Live only"}
              </button>
              <button
                onClick={() => refetchLocations()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* My Tracking Status Card */}
      <div className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${trackingActive ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trackingActive ? "bg-blue-500" : "bg-slate-300"}`}>
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {trackingActive ? "Your location is being shared" : "Location sharing is off"}
            </p>
            {trackingActive && lastUpdate && (
              <p className="text-xs text-slate-500">Last update: {formatDistanceToNow(lastUpdate, { addSuffix: true })}</p>
            )}
            {!trackingActive && !consent && (
              <p className="text-xs text-slate-500">Enable to share your location with management</p>
            )}
            {geoError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" /> {geoError}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consent === false && (
            <button
              onClick={() => setShowConsentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <MapPin className="w-4 h-4" /> Enable Location Sharing
            </button>
          )}
          {consent === true && !trackingActive && (
            <button
              onClick={startTracking}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
            >
              <Signal className="w-4 h-4" /> Resume Tracking
            </button>
          )}
          {consent === true && trackingActive && (
            <button
              onClick={stopTracking}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <SignalZero className="w-4 h-4" /> Pause
            </button>
          )}
          {consent === true && (
            <button
              onClick={handleRevokeConsent}
              className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            >
              Revoke consent
            </button>
          )}
        </div>
      </div>

      {/* Map — only for authorized roles */}
      {canViewMap ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" /> Live Map
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Live (&lt;3 min)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Last known
              </span>
            </div>
          </div>
          <div style={{ height: "520px" }}>
            <MapContainer
              center={mapCenter}
              zoom={filteredLocations.length > 0 ? 13 : 11}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredLocations.map(loc => (
                <StaffMarker
                  key={loc.staff_id}
                  location={loc}
                  isCurrentUser={loc.staff_id === staffProfile?.id}
                />
              ))}
            </MapContainer>
          </div>

          {/* Staff list below map */}
          {filteredLocations.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Staff on Map</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {filteredLocations.map(loc => {
                  const isRecent = loc.timestamp && (now - new Date(loc.timestamp).getTime()) < 3 * 60 * 1000;
                  return (
                    <div key={loc.staff_id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${isRecent ? "bg-blue-500" : "bg-slate-400"}`}>
                        {loc.staff_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{loc.staff_name || "Unknown"}</p>
                        <p className="text-[10px] text-slate-500">
                          {loc.timestamp ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true }) : "No data"}
                        </p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${isRecent ? "bg-green-500" : "bg-amber-400"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLocations.length === 0 && (
            <div className="py-12 text-center">
              <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No staff locations available.</p>
              <p className="text-slate-400 text-xs mt-1">Locations appear here once staff enable tracking and share their position.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Map view not available for your role</p>
          <p className="text-slate-400 text-sm mt-1">The live map is visible to Admin, HR, Finance, and Management roles.</p>
          <p className="text-slate-400 text-sm mt-3">Your location sharing status is shown above.</p>
        </div>
      )}
    </div>
  );
}