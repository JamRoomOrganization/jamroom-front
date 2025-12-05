export function RoomsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 animate-pulse"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="h-4 w-2/3 bg-slate-700 rounded" />
            <div className="h-5 w-12 bg-slate-700 rounded-full" />
          </div>
          <div className="h-3 w-full bg-slate-700 rounded mb-2" />
          <div className="h-3 w-2/3 bg-slate-700 rounded mb-6" />
          <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full border-2 border-slate-800" />
              <div className="w-8 h-8 bg-slate-700 rounded-full border-2 border-slate-800" />
              <div className="w-8 h-8 bg-slate-700 rounded-full border-2 border-slate-800" />
            </div>
            <div className="h-9 w-20 bg-slate-700 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
