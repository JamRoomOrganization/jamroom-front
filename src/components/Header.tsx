import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              JamRoom
            </span>
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link href="#" className="text-slate-300 hover:text-white transition-colors duration-200 font-medium hover:scale-105">
              Docs
            </Link>
            {user ? (
              <>
                <span className="text-slate-300">Hola, {user.name || user.email}</span>
                <button onClick={signOut} className="text-slate-300 hover:text-white transition-colors duration-200 font-medium hover:scale-105">
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors duration-200 font-medium hover:scale-105">
                Iniciar sesión
              </Link>
            )}
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg">
              Crear Sala
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
