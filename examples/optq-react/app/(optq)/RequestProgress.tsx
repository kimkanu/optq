import { animated as a, to, useSpring } from "@react-spring/web";
import { useEffect } from "react";
import type { OptqRequestStats } from "@optq/react";

export default function RequestProgress({ stats }: { stats: OptqRequestStats }) {
  const [spring, api] = useSpring(() => ({
    opacity: stats.completed === stats.total ? 0 : 1,
    ratio: stats.ratio,
    onlineRatio: stats.pending / Math.max(stats.total, 1),
    offlineRatio: stats.offline / Math.max(stats.total, 1),
    config: {
      mass: 1,
      tension: 140,
      friction: 18,
      bounce: 0,
    },
  }));

  useEffect(() => {
    api.start({
      ratio: stats.ratio,
      onlineRatio: stats.ratio + stats.pending / Math.max(stats.total, 1),
      opacity: stats.completed === stats.total ? 0 : 1,
      immediate(key) {
        return key !== "opacity" && stats.ratio === 0;
      },
      delay(key) {
        return key === "opacity" && stats.completed === stats.total ? 500 : 0;
      },
    });
  }, [api, stats]);

  return (
    <a.div
      role="progressbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 4,
        opacity: spring.opacity,
      }}
    >
      <a.div
        style={{
          position: "absolute",
          width: spring.ratio.to((ratio) => `${ratio * 100}%`),
          height: "100%",
          backgroundColor: "#0ea5e9",
        }}
      />
      <a.div
        style={{
          position: "absolute",
          left: spring.ratio.to((ratio) => `${ratio * 100}%`),
          width: spring.onlineRatio.to((ratio) => `${ratio * 100}%`),
          height: "100%",
          backgroundColor: "#e0f2fe",
        }}
      />
      <a.div
        style={{
          position: "absolute",
          left: to([spring.ratio, spring.onlineRatio], (r1, r2) => `${(r1 + r2) * 100}%`),
          width: spring.offlineRatio.to((ratio) => `${ratio * 100}%`),
          height: "100%",
          backgroundColor: "#d1d5db",
        }}
      />
    </a.div>
  );
}
