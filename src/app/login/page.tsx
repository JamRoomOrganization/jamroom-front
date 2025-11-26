"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl shadow-purple-500/10 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">J</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white">Inicia sesión</h1>
            <p className="text-slate-300 mt-2">Bienvenido a JamRoom</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60"
                placeholder="tucorreo@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-900/20 border border-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>

            <div className="text-center text-sm text-slate-400">
              ¿No tienes cuenta? {" "}
              <Link href="/register" className="text-slate-200 hover:text-white underline underline-offset-4">
                Crea una aquí!
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


