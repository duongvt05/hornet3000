import { useEffect, useState } from "react";

interface Detection {
  id: number;
  species: string;
  confidence: number;
  camera: string;
  location: string;
  timestamp: string;
  action: string;
  imageUrl?: string;
}

// Mock dùng khi API chưa chạy (dữ liệu thật từ log.csv của bạn)
const mockData: Detection[] = [
  { id: 1, species: "vcra", confidence: 83, camera: "CAM1", location: "Hive Entrance", timestamp: "2026-05-10 16:52:16", action: "Logged" },
  { id: 2, species: "vcra", confidence: 86, camera: "CAM1", location: "Hive Entrance", timestamp: "2026-05-10 16:52:28", action: "Logged" },
];

export default function RecentDetections() {
  const [detections, setDetections] = useState<Detection[]>(mockData);
  const [usingMock, setUsingMock] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/detections?limit=20", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDetections(data);
            setUsingMock(false);
          }
        }
      } catch {
        // Giữ mock
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
    const interval = setInterval(fetchDetections, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    const rows = [
      ["Species", "Confidence", "Camera", "Location", "Timestamp", "Action"],
      ...detections.map(d => [d.species, d.confidence, d.camera, d.location, d.timestamp, d.action]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `detections_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Detections</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {usingMock ? "Demo data — Flask API chưa chạy" : "Dữ liệu từ log.csv thật"}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {["Species / Class", "Confidence", "Camera", "Location", "Time", "Action"].map((h) => (
                <th key={h} className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 pr-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : detections.map((d) => {
              const isHornet = d.species?.toLowerCase().includes("hornet");
              const conf = typeof d.confidence === "number" ? d.confidence : parseFloat(String(d.confidence)) || 0;
              const confPct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);

              return (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isHornet ? "🐝" : "🍯"}</span>
                      <span className={`font-medium text-sm ${isHornet ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {d.species}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${confPct >= 90 ? "bg-green-500" : confPct >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${confPct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{confPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{d.camera}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{d.location}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-400">
                      {String(d.timestamp).split(" ")[1]?.slice(0, 8) || d.timestamp}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.action === "Alert Sent"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>
                      {d.action}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
