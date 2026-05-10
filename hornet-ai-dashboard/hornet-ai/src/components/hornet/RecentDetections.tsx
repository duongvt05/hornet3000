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

const mockData: Detection[] = [
  { id: 1, species: "Asian Hornet", confidence: 98.2, camera: "Camera 1", location: "North Hive", timestamp: "2025-05-10 14:32:01", action: "Alert Sent" },
  { id: 2, species: "Honey Bee", confidence: 95.7, camera: "Camera 2", location: "East Field", timestamp: "2025-05-10 14:28:45", action: "Logged" },
  { id: 3, species: "Asian Hornet", confidence: 91.3, camera: "Camera 3", location: "South Entrance", timestamp: "2025-05-10 14:15:22", action: "Alert Sent" },
  { id: 4, species: "Bumble Bee", confidence: 88.9, camera: "Camera 1", location: "North Hive", timestamp: "2025-05-10 14:02:10", action: "Logged" },
  { id: 5, species: "Asian Hornet", confidence: 97.1, camera: "Camera 2", location: "East Field", timestamp: "2025-05-10 13:55:33", action: "Alert Sent" },
  { id: 6, species: "Honey Bee", confidence: 92.4, camera: "Camera 3", location: "South Entrance", timestamp: "2025-05-10 13:44:18", action: "Logged" },
];

export default function RecentDetections() {
  const [detections, setDetections] = useState<Detection[]>(mockData);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/detections?limit=20");
        if (res.ok) {
          const data = await res.json();
          setDetections(data);
        }
      } catch {}
    };
    fetchDetections();
    const interval = setInterval(fetchDetections, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Detections</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Latest AI detection events</p>
        </div>
        <button className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Camera</th>
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {detections.map((d) => {
              const isHornet = d.species.includes("Hornet");
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
                          className={`h-full rounded-full ${d.confidence >= 95 ? "bg-green-500" : d.confidence >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${d.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{d.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{d.camera}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{d.location}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-400">{d.timestamp.split(" ")[1]}</span>
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
