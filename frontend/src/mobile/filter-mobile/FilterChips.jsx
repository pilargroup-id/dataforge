import { useState } from "react";

const filterChips = [
  {
    id: "all",
    label: "All",
    count: 1,
    color: "#9CA3AF",
  },
  {
    id: "resolved",
    label: "Resolved",
    count: 0,
    color: "#22C55E",
  },
  {
    id: "waiting",
    label: "Waiting",
    count: 0,
    color: "#F59E0B",
  },
  {
    id: "progress",
    label: "In Progress",
    count: 0,
    color: "#3B82F6",
  },
];

export default function StatusFilter() {
  const [active, setActive] = useState("resolved");

  return (
    <>
      <style>{`
        .status-filter{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .status-chip{
          display:flex;
          align-items:center;
          gap:8px;

          height:40px;
          padding:0 14px;

          border:1px solid #E5E7EB;
          border-radius:999px;

          background:#fff;

          cursor:pointer;

          font-size:14px;
          font-weight:500;

          color:#374151;

          transition:all .2s ease;
        }

        .status-chip:hover{
          background:#F9FAFB;
          border-color:#D1D5DB;
        }

        .status-chip.active{
          background:#ECFDF5;
          border-color:#34D399;
          color:#059669;
        }

        .status-dot{
          width:8px;
          height:8px;
          border-radius:50%;
          flex-shrink:0;
        }

        .status-label{
          white-space:nowrap;
        }

        .status-count{
          display:flex;
          justify-content:center;
          align-items:center;

          min-width:22px;
          height:22px;

          padding:0 6px;

          border-radius:999px;

          background:#F3F4F6;

          font-size:12px;
          font-weight:600;

          color:#6B7280;
        }

        .status-chip.active .status-count{
          background:#D1FAE5;
          color:#059669;
        }
      `}</style>

      <div className="status-filter">
        {filterChips.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`status-chip ${
              active === item.id ? "active" : ""
            }`}
            onClick={() => setActive(item.id)}
          >
            <span
              className="status-dot"
              style={{ background: item.color }}
            />

            <span className="status-label">
              {item.label}
            </span>

            <span className="status-count">
              {item.count}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}