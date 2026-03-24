import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

interface DetailChartModalProps {
  visible: boolean;
  onClose: () => void;
  ticker: string;
  label?: string;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  current: number;
  changePct: number;
}

const CHART_W = 320;
const CHART_H = 200;
const PADDING_L = 60;
const PADDING_R = 16;
const PADDING_T = 20;
const PADDING_B = 40;
const PLOT_W = CHART_W - PADDING_L - PADDING_R;
const PLOT_H = CHART_H - PADDING_T - PADDING_B;

export default function DetailChartModal({
  visible, onClose, ticker, label, prevClose, open, high, low, current, changePct,
}: DetailChartModalProps) {
  const positive = changePct >= 0;
  const lineColor = positive ? Colors.gain : Colors.loss;

  const dataPoints = [
    { label: 'Prev Close', value: prevClose, x: 0 },
    { label: 'Open', value: open, x: 0.2 },
    { label: 'Low', value: low, x: 0.4 },
    { label: 'High', value: high, x: 0.7 },
    { label: 'Current', value: current, x: 1.0 },
  ];

  const allValues = [prevClose, open, high, low, current].filter((v) => v > 0);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const valRange = maxVal - minVal || 1;
  const yPad = valRange * 0.1;
  const yMin = minVal - yPad;
  const yMax = maxVal + yPad;
  const yRange = yMax - yMin;

  function toX(fraction: number): number {
    return PADDING_L + fraction * PLOT_W;
  }

  function toY(val: number): number {
    return PADDING_T + PLOT_H - ((val - yMin) / yRange) * PLOT_H;
  }

  const polyPoints = dataPoints.map((p) => `${toX(p.x)},${toY(p.value)}`).join(' ');

  const yTicks = 5;
  const yTickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(yMin + (yRange / yTicks) * i);
  }

  const dollarChange = current - prevClose;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.ticker}>{ticker}</Text>
              {label && <Text style={styles.label}>{label}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Price summary */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>${current.toFixed(2)}</Text>
            <View style={[styles.changePill, { backgroundColor: positive ? Colors.gainBg : Colors.lossBg }]}>
              <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={12} color={positive ? Colors.gain : Colors.loss} />
              <Text style={[styles.changeText, { color: positive ? Colors.gain : Colors.loss }]}>
                {dollarChange >= 0 ? '+' : ''}{dollarChange.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* SVG Chart */}
          <View style={styles.chartWrap}>
            <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
              {/* Plot background */}
              <Rect x={PADDING_L} y={PADDING_T} width={PLOT_W} height={PLOT_H} fill={Colors.secondary} rx={4} opacity={0.5} />

              {/* Y-axis grid lines + labels */}
              {yTickValues.map((val, i) => {
                const y = toY(val);
                return (
                  <React.Fragment key={i}>
                    <Line x1={PADDING_L} y1={y} x2={PADDING_L + PLOT_W} y2={y} stroke={Colors.border} strokeWidth={1} strokeDasharray="4,3" />
                    <SvgText x={PADDING_L - 6} y={y + 4} textAnchor="end" fill={Colors.mutedForeground} fontSize={10} fontWeight="500">
                      ${val.toFixed(2)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Previous close reference line */}
              <Line
                x1={PADDING_L} y1={toY(prevClose)}
                x2={PADDING_L + PLOT_W} y2={toY(prevClose)}
                stroke={Colors.mutedForeground} strokeWidth={1} strokeDasharray="6,4" opacity={0.6}
              />

              {/* Price line */}
              <Polyline
                points={polyPoints}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data point circles + x-axis labels */}
              {dataPoints.map((p, i) => {
                const cx = toX(p.x);
                const cy = toY(p.value);
                const isCurrent = i === dataPoints.length - 1;
                return (
                  <React.Fragment key={i}>
                    <Circle cx={cx} cy={cy} r={isCurrent ? 5 : 3.5} fill={isCurrent ? lineColor : Colors.card} stroke={lineColor} strokeWidth={2} />
                    <SvgText x={cx} y={CHART_H - 8} textAnchor="middle" fill={Colors.mutedForeground} fontSize={9} fontWeight="500">
                      {p.label}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>

          {/* Key prices grid */}
          <View style={styles.pricesGrid}>
            <PriceCell label="Prev Close" value={prevClose} />
            <PriceCell label="Open" value={open} />
            <PriceCell label="High" value={high} highlight="gain" />
            <PriceCell label="Low" value={low} highlight="loss" />
          </View>

          <Text style={styles.footnote}>
            Prices reflect the latest available market data from Finnhub.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PriceCell({ label, value, highlight }: { label: string; value: number; highlight?: 'gain' | 'loss' }) {
  const color = highlight === 'gain' ? Colors.gain : highlight === 'loss' ? Colors.loss : Colors.foreground;
  return (
    <View style={styles.priceCell}>
      <Text style={styles.priceCellLabel}>{label}</Text>
      <Text style={[styles.priceCellValue, { color }]}>${value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticker: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  label: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentPrice: { fontSize: 24, fontWeight: '700', color: Colors.foreground },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  changeText: { fontSize: 13, fontWeight: '700' },

  chartWrap: { alignItems: 'center' },

  pricesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  priceCell: { width: '50%', paddingVertical: 8 },
  priceCellLabel: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  priceCellValue: { fontSize: 15, fontWeight: '700', color: Colors.foreground, marginTop: 2 },

  footnote: { fontSize: 10, color: Colors.mutedForeground, textAlign: 'center' },
});
