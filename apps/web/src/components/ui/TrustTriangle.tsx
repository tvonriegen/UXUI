"use client";
// ──────────────────────────────────────────────────────────
// TrustTriangle – SVG radar chart (3-axis: Académica / Profesional / Social)
//
// Used in the student dashboard and profile to visualise the
// three dimensions of trust that companies see in a student.
// Matches the design prototype's triangular radar chart.
// ──────────────────────────────────────────────────────────

interface TrustData {
  academica:   number; // 0–100
  profesional: number; // 0–100
  social:      number; // 0–100
}

interface TrustTriangleProps {
  data?:  TrustData;
  size?:  number;
  /** Show axis labels and score numbers */
  labels?: boolean;
}

const DEFAULT_DATA: TrustData = { academica: 80, profesional: 60, social: 70 };

export default function TrustTriangle({
  data    = DEFAULT_DATA,
  size    = 200,
  labels  = true,
}: TrustTriangleProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.38; // radius of the outer ring

  // Three axes at 120° apart, starting at top
  const axes = [
    { key: "academica"   as const, label: "Académica",   angle: -Math.PI / 2,                     color: "#06b6d4" },
    { key: "profesional" as const, label: "Profesional", angle: -Math.PI / 2 + (2 * Math.PI / 3), color: "#f59e0b" },
    { key: "social"      as const, label: "Social",      angle: -Math.PI / 2 + (4 * Math.PI / 3), color: "#8b5cf6" },
  ];

  /** XY coordinate at distance `ratio` along axis `a` */
  const pt = (a: typeof axes[0], ratio: number) => ({
    x: cx + Math.cos(a.angle) * r * ratio,
    y: cy + Math.sin(a.angle) * r * ratio,
  });

  /** Build a polygon points string for a given fill ratio */
  const ring = (ratio: number) =>
    axes.map((a) => `${cx + Math.cos(a.angle) * r * ratio},${cy + Math.sin(a.angle) * r * ratio}`).join(" ");

  /** Data polygon points */
  const dataPts = axes
    .map((a) => {
      const v = Math.max(0, Math.min(100, data[a.key] ?? 0)) / 100;
      return `${cx + Math.cos(a.angle) * r * v},${cy + Math.sin(a.angle) * r * v}`;
    })
    .join(" ");

  // Label positioning: push labels a bit further than the outer ring
  const labelOffset = r + (labels ? 22 : 0);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-label="Triángulo de Confianza"
      role="img"
    >
      {/* Background rings at 33%, 66%, 100% */}
      {[0.33, 0.66, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={ring(ratio)}
          fill="none"
          stroke="rgba(203,213,225,.7)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines from centre to outer ring */}
      {axes.map((a) => {
        const end = pt(a, 1);
        return (
          <line
            key={a.key}
            x1={cx} y1={cy}
            x2={end.x} y2={end.y}
            stroke="rgba(203,213,225,.7)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={dataPts}
        fill="rgba(6,182,212,.2)"
        stroke="#06b6d4"
        strokeWidth={2}
        style={{ transition: "all 800ms cubic-bezier(.2,.7,.2,1)" }}
      />

      {/* Dot on each data point */}
      {axes.map((a) => {
        const v = Math.max(0, Math.min(100, data[a.key] ?? 0)) / 100;
        const p = pt(a, v);
        return (
          <circle
            key={a.key}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={a.color}
            stroke="white"
            strokeWidth={2}
          />
        );
      })}

      {/* Labels */}
      {labels &&
        axes.map((a) => {
          const lx = cx + Math.cos(a.angle) * labelOffset;
          const ly = cy + Math.sin(a.angle) * labelOffset;
          const score = data[a.key] ?? 0;
          return (
            <g key={`label-${a.key}`}>
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight={700}
                fill="#1e293b"
                fontFamily="inherit"
              >
                {a.label}
              </text>
              <text
                x={lx}
                y={ly + 13}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight={800}
                fill={a.color}
                fontFamily="inherit"
              >
                {score}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
