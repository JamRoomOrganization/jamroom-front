import React from "react";
import type { Visibility } from "@/app/create/page";

type Props = {
  value: Visibility;
  onChange: (value: Visibility) => void;
};

export const RoomVisibilitySelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        onClick={() => onChange("public")}
        className={
          "flex-1 px-4 py-3 rounded-xl border text-left text-sm transition " +
          (value === "public"
            ? "border-purple-500 bg-purple-500/10 text-white"
            : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500")
        }
      >
        <div className="font-semibold mb-0.5">Pública</div>
        <div className="text-xs text-slate-400">
          Cualquiera dentro de JamRoom puede encontrarla.
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("link")}
        className={
          "flex-1 px-4 py-3 rounded-xl border text-left text-sm transition " +
          (value === "link"
            ? "border-purple-500 bg-purple-500/10 text-white"
            : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500")
        }
      >
        <div className="font-semibold mb-0.5">Solo con enlace</div>
        <div className="text-xs text-slate-400">
          Solo quienes tengan el link podrán entrar.
        </div>
      </button>
    </div>
  );
};
