export default function PlayerMock({ track }: { track?: any }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-6">Reproduciendo Ahora</h3>
      
      <div className="flex items-center space-x-6">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h4 className="text-2xl font-bold text-white mb-2">
            {track?.title || "Selecciona una canción"}
          </h4>
          {track?.artist && (
            <p className="text-slate-400 text-lg">por {track.artist}</p>
          )}
          
          <div className="mt-6">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full w-1/3"></div>
            </div>
            <div className="flex justify-between text-slate-400 text-sm mt-2">
              <span>1:20</span>
              <span>4:05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
