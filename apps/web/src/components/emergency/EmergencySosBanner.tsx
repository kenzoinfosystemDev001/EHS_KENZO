"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { emergencySiren } from "@/lib/emergency-siren";
import { Volume2, VolumeX, ShieldAlert, CheckCircle } from "lucide-react";

export interface ActiveSosAlert {
  id: string;
  emergencyType: string;
  plantName: string;
  location: string;
  message: string;
  triggeredByName: string;
  createdAt: string;
  active: boolean;
}

export function EmergencySosBanner() {
  const [activeAlerts, setActiveAlerts] = useState<ActiveSosAlert[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [silencing, setSilencing] = useState<string | null>(null);
  const mutedRef = useRef(false);

  mutedRef.current = isMuted;

  useEffect(() => {
    let isMounted = true;

    const checkSos = async () => {
      try {
        const res = await apiClient<ActiveSosAlert[]>("/api/v1/emergency/sos/active");
        if (res.success && isMounted) {
          const alerts = res.data || [];
          setActiveAlerts(alerts);

          if (alerts.length > 0 && !mutedRef.current) {
            emergencySiren.start();
          } else if (alerts.length === 0) {
            emergencySiren.stop();
          }
        }
      } catch (err) {
        // Non-intrusive polling
      }
    };

    checkSos();
    const interval = setInterval(checkSos, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      emergencySiren.stop();
    };
  }, []);

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (activeAlerts.length > 0) {
        emergencySiren.start();
      }
    } else {
      setIsMuted(true);
      emergencySiren.stop();
    }
  };

  const handleSilenceAlert = async (id: string) => {
    try {
      setSilencing(id);
      await apiClient(`/api/v1/emergency/sos/${id}/silence`, { method: "POST" });
      emergencySiren.stop();
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert("Failed to silence SOS alert");
    } finally {
      setSilencing(null);
    }
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  const latest = activeAlerts[0];

  return (
    <div className="bg-red-600 text-white shadow-xl sticky top-0 z-50 animate-pulse border-b-4 border-red-900">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-red-800 rounded-full animate-bounce shrink-0">
            <ShieldAlert className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm bg-red-900 px-2.5 py-0.5 rounded text-amber-300">
                🚨 EMERGENCY SOS: {latest.emergencyType.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-semibold text-red-200">
                Facility: {latest.plantName} • {latest.location}
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">
              {latest.message}
            </p>
            <p className="text-xs text-red-200">
              Reported by: <span className="font-semibold text-white">{latest.triggeredByName}</span> • {new Date(latest.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={handleToggleMute}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800/80 hover:bg-red-800 text-xs font-semibold rounded-lg transition border border-red-700 text-white"
            title={isMuted ? "Unmute Alarm Sound" : "Mute Siren Audio"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-300" /> Unmute Siren
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-300 animate-pulse" /> Mute Siren
              </>
            )}
          </button>

          <button
            onClick={() => handleSilenceAlert(latest.id)}
            disabled={silencing === latest.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow transition"
          >
            <CheckCircle className="w-4 h-4" />
            {silencing === latest.id ? "Silencing..." : "Acknowledge / Clear Alarm"}
          </button>
        </div>
      </div>
    </div>
  );
}
