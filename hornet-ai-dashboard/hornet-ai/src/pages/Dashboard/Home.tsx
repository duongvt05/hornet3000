import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import HornetMetrics from "../../components/hornet/HornetMetrics";
import DetectionChart from "../../components/hornet/DetectionChart";
import RecentDetections from "../../components/hornet/RecentDetections";
import AlertPanel from "../../components/hornet/AlertPanel";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Hornet AI - Bee Monitoring Dashboard"
        description="Real-time AI monitoring dashboard for bee and hornet detection"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Stats Cards */}
        <div className="col-span-12">
          <HornetMetrics />
        </div>

        {/* Detection Chart */}
        <div className="col-span-12 xl:col-span-8">
          <DetectionChart />
        </div>

        {/* Alert Panel */}
        <div className="col-span-12 xl:col-span-4">
          <AlertPanel />
        </div>

        {/* Recent Detections Table */}
        <div className="col-span-12">
          <RecentDetections />
        </div>
      </div>
    </>
  );
}
