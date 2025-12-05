type FeaturePillProps = {
  title: string;
  body: string;
};

export function FeaturePill({ title, body }: FeaturePillProps) {
  return (
    <div className="flex gap-3 bg-slate-900/60 border border-slate-800/70 rounded-2xl px-4 py-3">
      <div className="mt-1 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white shadow-md">
        ♪
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{body}</p>
      </div>
    </div>
  );
}
