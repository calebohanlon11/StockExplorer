import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import Colors from '../constants/colors';

interface MiniChartProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
  onPress?: () => void;
}

export default function MiniChart({ data, positive, width = 80, height = 32, onPress }: MiniChartProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padH = 4;
  const padV = 3;
  const plotW = width - padH * 2;
  const plotH = height - padV * 2;

  const coords = data.map((v, i) => ({
    x: padH + (i / (data.length - 1)) * plotW,
    y: padV + plotH - ((v - min) / range) * plotH,
  }));

  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];
  const color = positive ? Colors.gain : Colors.loss;

  const svg = (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );

  if (onPress) {
    return <Pressable onPress={onPress} hitSlop={8}>{svg}</Pressable>;
  }

  return svg;
}
