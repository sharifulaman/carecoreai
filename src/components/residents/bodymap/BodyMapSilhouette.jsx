import { useState } from "react";

const MARK_COLORS = {
  bruise: "#EF4444",
  cut: "#EF4444",
  scratch: "#EF4444",
  burn: "#EF4444",
  bite: "#EF4444",
  rash: "#EF4444",
  swelling: "#EF4444",
  self_harm: "#F97316",
  tattoo: "#9CA3AF",
  other: "#FCD34D",
};

export default function BodyMapSilhouette({ side = "front", marks = [], onClick, readOnly = false }) {
  const [hoveredMark, setHoveredMark] = useState(null);

  const sideMarks = marks.filter(m => m.body_side === side);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm font-medium capitalize">{side} View</div>

      <svg
        viewBox="0 0 150 350"
        className={`w-32 h-auto ${!readOnly ? "cursor-crosshair" : ""}`}
        onClick={e => {
          if (!readOnly) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            onClick?.({ x, y, side });
          }
        }}
      >
        {/* Body Outline */}
        {side === "front" ? (
          <>
            {/* Head */}
            <circle cx="75" cy="30" r="20" fill="none" stroke="#333" strokeWidth="2" />
            {/* Neck */}
            <line x1="70" y1="50" x2="80" y2="50" stroke="#333" strokeWidth="2" />
            {/* Torso */}
            <rect x="60" y="50" width="30" height="60" fill="none" stroke="#333" strokeWidth="2" />
            {/* Arms */}
            <line x1="60" y1="60" x2="30" y2="90" stroke="#333" strokeWidth="2" />
            <line x1="90" y1="60" x2="120" y2="90" stroke="#333" strokeWidth="2" />
            {/* Hands */}
            <circle cx="30" cy="90" r="5" fill="none" stroke="#333" strokeWidth="2" />
            <circle cx="120" cy="90" r="5" fill="none" stroke="#333" strokeWidth="2" />
            {/* Legs */}
            <line x1="65" y1="110" x2="60" y2="180" stroke="#333" strokeWidth="2" />
            <line x1="85" y1="110" x2="90" y2="180" stroke="#333" strokeWidth="2" />
            {/* Feet */}
            <circle cx="60" cy="180" r="4" fill="none" stroke="#333" strokeWidth="2" />
            <circle cx="90" cy="180" r="4" fill="none" stroke="#333" strokeWidth="2" />
          </>
        ) : (
          <>
            {/* Head */}
            <circle cx="75" cy="30" r="20" fill="none" stroke="#333" strokeWidth="2" />
            {/* Neck */}
            <line x1="70" y1="50" x2="80" y2="50" stroke="#333" strokeWidth="2" />
            {/* Torso */}
            <rect x="60" y="50" width="30" height="60" fill="none" stroke="#333" strokeWidth="2" />
            {/* Arms (Back) */}
            <line x1="60" y1="60" x2="30" y2="90" stroke="#333" strokeWidth="2" />
            <line x1="90" y1="60" x2="120" y2="90" stroke="#333" strokeWidth="2" />
            {/* Hands */}
            <circle cx="30" cy="90" r="5" fill="none" stroke="#333" strokeWidth="2" />
            <circle cx="120" cy="90" r="5" fill="none" stroke="#333" strokeWidth="2" />
            {/* Legs */}
            <line x1="65" y1="110" x2="60" y2="180" stroke="#333" strokeWidth="2" />
            <line x1="85" y1="110" x2="90" y2="180" stroke="#333" strokeWidth="2" />
            {/* Feet */}
            <circle cx="60" cy="180" r="4" fill="none" stroke="#333" strokeWidth="2" />
            <circle cx="90" cy="180" r="4" fill="none" stroke="#333" strokeWidth="2" />
          </>
        )}

        {/* Marks */}
        {sideMarks.map((mark, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoveredMark(i)}
            onMouseLeave={() => setHoveredMark(null)}
            onClick={e => { e.stopPropagation(); }}
          >
            <circle
              cx={(mark.x_position / 100) * 150}
              cy={(mark.y_position / 100) * 350}
              r={hoveredMark === i ? 10 : 7}
              fill={MARK_COLORS[mark.mark_type] || "#FCD34D"}
              opacity="0.8"
              className="transition-all cursor-pointer hover:opacity-100"
            />
            {hoveredMark === i && (
              <circle
                cx={(mark.x_position / 100) * 150}
                cy={(mark.y_position / 100) * 350}
                r="10"
                fill="none"
                stroke={MARK_COLORS[mark.mark_type] || "#FCD34D"}
                strokeWidth="2"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="text-xs space-y-1 mt-2">
        <p className="font-medium">Legend:</p>
        <p><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: "#EF4444" }} />Injury/Concern</p>
        <p><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: "#F97316" }} />Self-harm</p>
        <p><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: "#9CA3AF" }} />Tattoo/Birthmark</p>
      </div>
    </div>
  );
}