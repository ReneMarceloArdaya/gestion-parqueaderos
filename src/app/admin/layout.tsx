// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; full_name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        });
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white p-6 flex-shrink-0 fixed h-screen overflow-y-auto flex flex-col">
        {/* Info del admin */}
        <div className="flex flex-col items-center mb-8">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Avatar Admin"
              className="w-20 h-20 rounded-full mb-2"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
          )}
          <h3 className="text-lg font-semibold">{user?.full_name || user?.email || "Admin"}</h3>
          <p className="text-sm text-gray-400">Administrador</p>
        </div>

        <nav className="flex flex-col space-y-2 mb-4">
          <Link href="/admin" className="hover:bg-gray-800 p-2 rounded">
            Dashboard
          </Link>
            <Link href="/admin/operadores" className="hover:bg-gray-800 p-2 rounded">
            Operadores
          </Link>
          <Link href="/admin/parqueadores" className="hover:bg-gray-800 p-2 rounded">
            Parqueos
          </Link>
          <Link href="/admin/tipos-vehiculo" className="hover:bg-gray-800 p-2 rounded">
            Tipos de Vehiculo
          </Link>
           <Link href="/admin/usuarios" className="hover:bg-gray-800 p-2 rounded">
            Gestión de Usuarios
          </Link>
           <Link href="/admin/Reservas" className="hover:bg-gray-800 p-2 rounded">
            Reservas
          </Link>
          <Link href="/admin/transaccion" className="hover:bg-gray-800 p-2 rounded">
            Transacciones
          </Link>
          
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto bg-red-600 hover:bg-red-500 p-2 rounded"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 ml-64 p-6">{children}</main>
    </div>
  );
}
