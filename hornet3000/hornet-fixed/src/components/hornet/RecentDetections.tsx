import { useEffect, useState } from "react";

const API = "http://127.0.0.1:5000";
const POLL_MS = 5000;

interface Detection {
  id: string;
  species: string;
  confidence: number;   // đã là %, ví dụ 83.0
  camera: string;
  cameraName: string;
  location: string;
  timestamp: string;
  action: string;
  hasImage: boolean;
  imagePath: string;
}

// Chuyển từ /api/history response sang Detection
function mapHistoryItem(raw: any, idx: number): Detection {
  const conf = typeof raw.confidence === "number"
    ? raw.confidence
    : parseFloat(raw.confidence ?? raw.Confidence ?? "0") || 0;
  // API trả confidence đã nhân 100 (ví dụ 83.0), nhưng nếu <= 1 thì nhân lại
  const confPct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
  const camId = raw.camera ?? raw.Camera ?? "cam1";

  return {
    id:         raw.id ?? `det_${idx}`,
    species:    raw.species ?? raw.Class ?? raw.class ?? "unknown",
    confidence: confPct,
    camera:     camId.toUpperCase(),
    cameraName: raw.cameraName ?? camId,
    location:   raw.position ?? raw.cameraName ?? camId,
    timestamp:  raw.timestamp ?? raw.Timestamp ?? "",
    action:     confPct >= 75 ? "Alert Sent" : "Logged",
    hasImage:   raw.hasImage ?? false,
    imagePath:  raw.imagePath ?? raw.Image_Path ?? "",
  };
}

const handleExportCSV = (detections: Detection[]) => {
  const rows = [
    ["Species", "Confidence", "Camera", "Location", "Timestamp", "Action"],
    ...detections.map(d => [d.species, `${d.confidence}%`, d.camera, d.location, d.timestamp, d.action]),
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `detections_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

export default function RecentDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading]       = useState(true);
  const [apiOnline, setApiOnline]   = useState(false);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        // FIX: đúng endpoint /api/history (không phải /api/detections)
        const res = await fetch(`${API}/api/history?limit=20`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("not ok");

        const data = await res.json();

        // FIX: API trả { history: [...], total: N }
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.history)
          ? data.history
          : [];

        setDetections(rawList.map(mapHistoryItem));
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
    const id = setInterval(fetchDetections, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Detections
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {apiOnline
              ? `${detections.length} records từ log.csv · cập nhật mỗi ${POLL_MS / 1000}s`
              : "Đang kết nối API..."}
          </p>
        </div>
        <button
          onClick={() => handleExportCSV(detections)}
          disabled={detections.length === 0}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {["Species", "Confidence", "Camera", "Timestamp", "Action"].map((h) => (
                <th
                  key={h}
                  className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pr-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 pr-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : detections.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                  <div className="text-3xl mb-2">🐝</div>
                  {apiOnline ? "Chưa có detection nào trong log" : "API offline — kiểm tra Flask"}
                </td>
              </tr>
            ) : (
              detections.map((d) => {
                const isHornet = ["vcra", "vespsp", "hornet", "vespa"].includes(
                  d.species.toLowerCase()
                );

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Species */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {d.hasImage ? (
                          <img
                            src={`${API}/api/history/image?path=${encodeURIComponent(d.imagePath)}`}
                            alt=""
                            className="w-8 h-6 object-cover rounded border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-base">{isHornet ? "🐝" : "🍯"}</span>
                        )}
                        <span
                          className={`font-medium text-sm ${
                            isHornet
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {d.species}
                        </span>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.confidence >= 90
                                ? "bg-green-500"
                                : d.confidence >= 75
                                ? "bg-amber-500"
                                : "bg-red-400"
                            }`}
                            style={{ width: `${d.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {d.confidence}%
                        </span>
                      </div>
                    </td>

                    {/* Camera */}
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {d.camera}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-400">
                        {d.timestamp.split(" ")[1]?.slice(0, 8) || d.timestamp}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.action === "Alert Sent"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {d.action}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}