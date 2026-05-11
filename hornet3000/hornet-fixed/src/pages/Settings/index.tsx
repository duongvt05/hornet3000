import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";

interface SettingsState {
  apiUrl: string;
  alertThreshold: number;
  alertEmail: string;
  emailAlerts: boolean;
  soundAlerts: boolean;
  autoAcknowledge: boolean;
  refreshInterval: number;
  cameras: { id: number; name: string; location: string; enabled: boolean }[];
}

type BooleanKeys = "emailAlerts" | "soundAlerts" | "autoAcknowledge";

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    apiUrl: "http://localhost:5000",
    alertThreshold: 90,
    alertEmail: "beekeeper@example.com",
    emailAlerts: true,
    soundAlerts: true,
    autoAcknowledge: false,
    refreshInterval: 10,
    cameras: [
      { id: 1, name: "Camera 1", location: "North Hive", enabled: true },
      { id: 2, name: "Camera 2", location: "East Field", enabled: true },
      { id: 3, name: "Camera 3", location: "South Entrance", enabled: true },
      { id: 4, name: "Camera 4", location: "West Gate", enabled: false },
    ],
  });

  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  const handleSave = () => {
    setSaved(true);
    // Persist settings to localStorage
    localStorage.setItem("hornet_settings", JSON.stringify(settings));
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${settings.apiUrl}/api/stats`, {
        signal: AbortSignal.timeout(4000),
      });
      setTestResult(res.ok ? "success" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  // FIX: correctly typed toggle function — no more TypeScript error
  const toggleBool = (key: BooleanKeys) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const BOOL_OPTIONS: { key: BooleanKeys; label: string; desc: string }[] = [
    { key: "emailAlerts", label: "Email Notifications", desc: "Send email on hornet detection" },
    { key: "soundAlerts", label: "Sound Alerts", desc: "Play alert sound in browser" },
    { key: "autoAcknowledge", label: "Auto-acknowledge Bees", desc: "Auto-resolve bee (non-hornet) alerts" },
  ];

  return (
    <>
      <PageMeta title="Settings - Hornet AI" description="System settings" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure your Hornet AI monitoring system</p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* API Connection */}
        <div className="col-span-12 xl:col-span-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">🔌 API Connection</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Flask API URL</label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">Base URL for your api_server.py</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Refresh Interval (seconds)</label>
              <input
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => setSettings((prev) => ({ ...prev, refreshInterval: Number(e.target.value) }))}
                min={5} max={60}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className={`p-3 rounded-xl ${
              testResult === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : testResult === "fail"
                ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  testResult === "success" ? "bg-green-500" : testResult === "fail" ? "bg-red-500" : "bg-gray-400"
                }`} />
                <span className={`text-xs font-medium ${
                  testResult === "success" ? "text-green-700 dark:text-green-400" :
                  testResult === "fail" ? "text-red-700 dark:text-red-400" :
                  "text-gray-600 dark:text-gray-400"
                }`}>
                  {testResult === "success" ? "Connected ✓" : testResult === "fail" ? "Connection failed" : "Connection Status"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {testResult === null ? "Click \"Test Connection\" to verify your Flask API" : ""}
              </p>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {testing && <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="col-span-12 xl:col-span-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">🔔 Alert Settings</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                Alert Threshold (confidence %) — current: <strong>{settings.alertThreshold}%</strong>
              </label>
              <input
                type="range"
                value={settings.alertThreshold}
                onChange={(e) => setSettings((prev) => ({ ...prev, alertThreshold: Number(e.target.value) }))}
                min={50} max={99} step={1}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50% (sensitive)</span>
                <span>99% (strict)</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Alert Email</label>
              <input
                type="email"
                value={settings.alertEmail}
                onChange={(e) => setSettings((prev) => ({ ...prev, alertEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {/* FIX: typed toggle, no TypeScript error */}
            {BOOL_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
                <button
                  onClick={() => toggleBool(opt.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[opt.key] ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-pressed={settings[opt.key]}
                  aria-label={opt.label}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    settings[opt.key] ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Config */}
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">📷 Camera Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {settings.cameras.map((cam) => (
              <div
                key={cam.id}
                className={`p-4 rounded-xl border ${
                  cam.enabled
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-800 dark:text-white">{cam.name}</span>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        cameras: prev.cameras.map((c) =>
                          c.id === cam.id ? { ...c, enabled: !c.enabled } : c
                        ),
                      }))
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      cam.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    aria-label={`Toggle ${cam.name}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cam.enabled ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">{cam.location}</p>
                <p className="text-xs mt-2">
                  <span className={cam.enabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                    {cam.enabled ? "● Active" : "○ Disabled"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* API Endpoints Reference */}
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">⚙️ Flask API Endpoints (api_server.py)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { method: "GET", path: "/latest_frame", desc: "Latest camera frame (JPEG)" },
              { method: "GET", path: "/api/stats", desc: "Detection statistics" },
              { method: "GET", path: "/api/detections", desc: "Detection log (JSON)" },
              { method: "GET", path: "/api/alerts", desc: "Active alerts list" },
              { method: "GET", path: "/api/cameras", desc: "Camera list & status" },
              { method: "POST", path: "/api/iot/control", desc: "IoT device control" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-mono font-bold rounded">
                  {ep.method}
                </span>
                <div>
                  <code className="text-xs text-gray-700 dark:text-gray-300">{settings.apiUrl}{ep.path}</code>
                  <p className="text-xs text-gray-400">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="col-span-12 flex justify-end">
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
              saved ? "bg-green-500 text-white" : "bg-brand-500 text-white hover:bg-brand-600"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
