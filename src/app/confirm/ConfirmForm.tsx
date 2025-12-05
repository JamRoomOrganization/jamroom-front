"use client"; 

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmForm() { 
  const router = useRouter();
  const searchParams = useSearchParams(); 

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post("/api/auth/confirm", {
        email,
        code,
      });

      setSuccess("Cuenta confirmada. Ya puedes iniciar sesión.");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Error al confirmar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/70 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Confirmar cuenta
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
              Código de verificación
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
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
            {loading ? "Confirmando..." : "Confirmar cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}