"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post("/api/auth/register", {
        email,
        password,
        nickname,
      });

      setSuccess("Te enviamos un código de verificación a tu correo.");

      router.push(`/confirm?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err?.message || "Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/70 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Crear cuenta
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Nickname
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            className="text-purple-400 hover:text-purple-300 underline"
            onClick={() => router.push("/login")}
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
