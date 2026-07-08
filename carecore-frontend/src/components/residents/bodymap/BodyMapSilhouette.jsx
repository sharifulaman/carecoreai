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

export default function BodyMapSilhouette({ side = "front", marks = [], pendingMark = null, onClick, readOnly = false }) {
  const [hoveredMark, setHoveredMark] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

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
            onClick?.({ x, y, side }); // Fallback if they click exactly on the 1px border between regions
          }
        }}
      >
        {/* Body Outline */}
        <g stroke="#64748b" strokeWidth="1.5" fill="#f8fafc" strokeLinejoin="round" strokeLinecap="round">
          <path d="
            M 75 20
            C 60 20, 55 45, 65 60
            L 65 70
            C 50 75, 35 85, 25 105
            L 10 190
            C 5 210, 20 215, 28 195
            L 45 120
            L 50 180
            C 55 200, 45 320, 45 330
            C 40 345, 65 350, 72 335
            L 75 200
            L 78 335
            C 85 350, 110 345, 105 330
            C 105 320, 95 200, 100 180
            L 105 120
            L 122 195
            C 130 215, 145 210, 140 190
            L 125 105
            C 115 85, 100 75, 85 70
            L 85 60
            C 95 45, 90 20, 75 20
            Z
          " />
          {side === "front" ? (
            <>
              {/* Chest lines */}
              <path d="M 55 105 C 65 115, 85 115, 95 105" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
              {/* Belly button */}
              <circle cx="75" cy="165" r="1.5" fill="#9ca3af" stroke="none" />
              {/* Face basic outline */}
              <circle cx="68" cy="40" r="1" fill="#9ca3af" stroke="none" />
              <circle cx="82" cy="40" r="1" fill="#9ca3af" stroke="none" />
              <path d="M 70 50 Q 75 55 80 50" fill="none" stroke="#9ca3af" strokeWidth="1" />
            </>
          ) : (
            <>
              {/* Spine */}
              <path d="M 75 75 L 75 165" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
              {/* Shoulder blades */}
              <path d="M 58 85 C 65 95, 70 95, 72 85" fill="none" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 92 85 C 85 95, 80 95, 78 85" fill="none" stroke="#94a3b8" strokeWidth="1" />
              {/* Glutes */}
              <path d="M 52 175 C 60 185, 75 180, 75 180" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
              <path d="M 98 175 C 90 185, 75 180, 75 180" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
            </>
          )}
        </g>

        {/* Interactive Highlight Regions */}
        <g>
          {[
            { id: "Head", d: "M 65 70 C 55 45, 60 20, 75 20 C 90 20, 95 45, 85 70 Z" },
            { id: side === "front" ? "Chest" : "Back", d: "M 65 70 C 50 75, 35 85, 25 105 L 45 120 L 105 120 L 125 105 C 115 85, 100 75, 85 70 Z" },
            { id: side === "front" ? "Abdomen" : "Back", d: "M 45 120 L 48 160 L 102 160 L 105 120 Z" },
            { id: side === "front" ? "Right hip" : "Left hip", d: "M 48 160 L 50 180 L 75 200 L 75 160 Z" },
            { id: side === "front" ? "Left hip" : "Right hip", d: "M 75 160 L 75 200 L 100 180 L 102 160 Z" },
            { id: side === "front" ? "Right arm" : "Left arm", d: "M 25 105 L 17 150 L 37 150 L 45 120 Z" },
            { id: side === "front" ? "Right forearm" : "Left forearm", d: "M 17 150 L 12 185 L 29 185 L 37 150 Z" },
            { id: "Hands", d: "M 12 185 L 10 190 C 5 210, 20 215, 28 195 L 29 185 Z" },
            { id: side === "front" ? "Left arm" : "Right arm", d: "M 125 105 L 133 150 L 113 150 L 105 120 Z" },
            { id: side === "front" ? "Left forearm" : "Right forearm", d: "M 133 150 L 138 185 L 121 185 L 113 150 Z" },
            { id: "Hands", d: "M 138 185 L 140 190 C 145 210, 130 215, 122 195 L 121 185 Z" },
            { id: side === "front" ? "Right leg" : "Left leg", d: "M 50 180 L 47.5 255 L 73.5 255 L 75 200 Z" },
            { id: side === "front" ? "Right knee" : "Left knee", d: "M 47.5 255 L 47 275 L 73 275 L 73.5 255 Z" },
            { id: side === "front" ? "Right ankle" : "Left ankle", d: "M 47 275 L 45 320 L 72 320 L 73 275 Z" },
            { id: "Feet", d: "M 45 320 L 45 330 C 40 345, 65 350, 72 335 L 72 320 Z" },
            { id: side === "front" ? "Left leg" : "Right leg", d: "M 100 180 L 102.5 255 L 76.5 255 L 75 200 Z" },
            { id: side === "front" ? "Left knee" : "Right knee", d: "M 102.5 255 L 103 275 L 77 275 L 76.5 255 Z" },
            { id: side === "front" ? "Left ankle" : "Right ankle", d: "M 103 275 L 105 320 L 78 320 L 77 275 Z" },
            { id: "Feet", d: "M 105 320 L 105 330 C 110 345, 85 350, 78 335 L 78 320 Z" },
          ].map((r, i) => (
            <path
              key={i}
              d={r.d}
              fill={hoveredRegion === i ? "rgba(59, 130, 246, 0.25)" : "transparent"}
              stroke="none"
              className="cursor-crosshair transition-colors duration-150"
              onMouseEnter={() => setHoveredRegion(i)}
              onMouseLeave={() => setHoveredRegion(null)}
              onClick={(e) => {
                if (!readOnly) {
                  e.stopPropagation();
                  const rect = e.currentTarget.closest("svg").getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  onClick?.({ x, y, side, location: r.id });
                }
              }}
            />
          ))}
        </g>

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

        {/* Pending Mark */}
        {pendingMark && pendingMark.body_side === side && pendingMark.x_position > 0 && (
          <circle
            cx={(pendingMark.x_position / 100) * 150}
            cy={(pendingMark.y_position / 100) * 350}
            r="8"
            fill="#3B82F6"
            className="animate-pulse"
          />
        )}
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