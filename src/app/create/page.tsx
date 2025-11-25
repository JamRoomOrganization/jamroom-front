"use client";

import React from "react";
import Header from "../../components/Header";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { CreateRoomForm, CreateRoomFormValues } from "../../components/create-room/CreateRoomForm";
import { CreateRoomSidebarInfo } from "../../components/create-room/CreateRoomSidebarInfo";

export type Visibility = "public" | "link";

type CreateRoomResponse = {
  id: string;
  name: string;
};

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (!user && !authLoading) return null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando…</p>
        </div>
      </div>
    );
  }

  const handleCreateRoom = async (values: CreateRoomFormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        visibility: values.visibility,
      };

      if (values.initialTrackId.trim()) {
        payload.initialTrackId = values.initialTrackId.trim();
      }

      console.log("[create-room] Enviando payload:", payload);

      const created = await api.post<CreateRoomResponse>(
        "/api/rooms",
        payload,
        true // auth = true, manda Bearer
      );

      console.log("[create-room] Sala creada:", created);

      if (!created || !created.id) {
        throw new Error("El servidor no devolvió un ID de sala válido");
      }

      router.push(`/room/${created.id}`);
    } catch (err: any) {
      console.error("[create-room] error completo:", err);
      console.error("[create-room] error.message:", err?.message);
      console.error("[create-room] error.stack:", err?.stack);

      let errorMessage = "No se pudo crear la sala. Intenta de nuevo.";

      if (err?.message) {
        errorMessage = err.message;
      }

      // Si es un error de red
      if (err?.message?.includes("No se pudo conectar al servidor")) {
        errorMessage = "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.";
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Crear nueva sala
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl">
            Configura un espacio para escuchar música en sincronía con tus amigos.
            Puedes elegir el nombre, privacidad y una canción inicial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-8">
          <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-white mb-4">
              Detalles de la sala
            </h2>

            <CreateRoomForm
              submitting={submitting}
              error={error}
              onSubmit={handleCreateRoom}
            />
          </section>

          <aside className="space-y-4">
            <CreateRoomSidebarInfo />
          </aside>
        </div>
      </main>
    </div>
  );
}

