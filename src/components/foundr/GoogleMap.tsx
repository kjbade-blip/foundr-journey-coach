import { useEffect, useRef } from "react";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loaderPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }
    const cbName = "__foundrInitMap";
    (window as any)[cbName] = () => resolve();
    const s = document.createElement("script");
    const channel = CHANNEL ? `&channel=${encodeURIComponent(CHANNEL)}` : "";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=${cbName}${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export type MapMarker = {
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  primary?: boolean;
};

type Props = {
  center: { lat: number; lng: number } | null;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
};

export function GoogleMap({ center, zoom = 14, markers = [], className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!center || !ref.current) return;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(ref.current, {
            center,
            zoom,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
            ],
          });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(zoom);
        }
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = markers.map(
          (m) =>
            new g.maps.Marker({
              position: { lat: m.lat, lng: m.lng },
              map: mapRef.current,
              title: m.title,
              label: m.label
                ? { text: m.label, color: "#fff", fontWeight: "700", fontSize: "12px" }
                : undefined,
              icon: m.primary
                ? {
                    path: g.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: "#A7D957",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 3,
                  }
                : {
                    path: g.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#1f4d2b",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                  },
            }),
        );
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lng, zoom, JSON.stringify(markers)]);

  if (!BROWSER_KEY) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">
          Google Maps not configured
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={ref} className="h-full w-full" />
      {!center && (
        <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
          Enter a location to load the map
        </div>
      )}
    </div>
  );
}
