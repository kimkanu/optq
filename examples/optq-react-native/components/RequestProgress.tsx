import type { OptqRequestStats } from "@optq/react";
import { animated as a, useSpring } from "@react-spring/native";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Circle, G, Svg } from "react-native-svg";

export default function RequestProgress({ stats }: { stats: OptqRequestStats }) {
  const SIZE = 36;
  const STROKE_WIDTH = 5;
  const RADIUS = SIZE / 2 - STROKE_WIDTH;

  const [spring, api] = useSpring(() => ({
    opacity: stats.completed === stats.total ? 0 : 1,
    ratio: stats.ratio,
    onlineRatio: stats.ratio + stats.pending / Math.max(stats.total, 1),
    config: {
      mass: 1,
      tension: 140,
      friction: 18,
      bounce: 0,
    },
    onChange({ value }: { value: { ratio: number; onlineRatio: number } }) {
      setRatios(value);
    },
  }));
  const [{ ratio, onlineRatio }, setRatios] = useState({ ratio: 0, onlineRatio: 0 });

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
    <a.View
      role="progressbar"
      style={{
        width: SIZE,
        height: SIZE,
        opacity: spring.opacity,
        position: "relative",
      }}
    >
      <Svg style={{ width: SIZE, height: SIZE }}>
        <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <Arc
            cx={SIZE / 2}
            cy={SIZE / 2}
            start={0}
            end={ratio}
            r={RADIUS}
            stroke="#0ea5e9"
            strokeWidth={STROKE_WIDTH}
          />
          <Arc
            cx={SIZE / 2}
            cy={SIZE / 2}
            start={ratio}
            end={onlineRatio}
            r={RADIUS}
            stroke="#e0f2fe"
            strokeWidth={STROKE_WIDTH}
          />
          <Arc
            cx={SIZE / 2}
            cy={SIZE / 2}
            start={onlineRatio}
            end={1}
            r={RADIUS}
            stroke="#d1d5db"
            strokeWidth={STROKE_WIDTH}
          />
        </G>
      </Svg>
      <Text
        style={{
          position: "absolute",
          top: SIZE / 2 - 5,
          width: "100%",
          textAlign: "center",
          fontSize: 10,
          lineHeight: 11,
          fontWeight: "bold",
        }}
      >
        {stats.completed}
        {"\u2009/\u2009"}
        {stats.total}
      </Text>
    </a.View>
  );
}

function Arc({
  cx,
  cy,
  start,
  end,
  r,
  stroke,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  start: number;
  end: number;
  r: number;
  stroke: string;
  strokeWidth: number;
}) {
  const length = Math.PI * 2 * r;

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      strokeDasharray={[0, start * length, (end - start) * length, (1 - end) * length]}
      strokeWidth={strokeWidth}
      stroke={stroke}
      fill="none"
    />
  );
}
