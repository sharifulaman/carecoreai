export default function AssignedYPFilter({ residents, highlightedId, onHighlight }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-sm font-bold text-slate-700">Assigned YP</span>
      <select
        value={highlightedId === "ALL" ? "" : (highlightedId || "")}
        onChange={(e) => onHighlight(e.target.value || "ALL")}
        className="rounded-xl px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="">All</option>
        {residents.map((resident) => (
          <option key={resident.id} value={resident.id}>
            {resident.name}
          </option>
        ))}
      </select>
    </div>
  );
}