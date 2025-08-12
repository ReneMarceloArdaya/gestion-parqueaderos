"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Car, LogIn, LogOut, User, Shield, MapPin } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { UserWithRole } from "@/lib/Supabase/supabaseClient";
import { useRouter } from "next/navigation";

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<
    "usuario" | "admin" | "operador" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);

        // Si hay usuario, obtener su rol de la base de datos
        if (currentUser) {
          await fetchUserRole(currentUser.id);
        }
      } catch (error) {
        console.error("Error getting user session:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          return;
        }

        if (data) {
          setUserRole(data.rol as "usuario" | "admin" | "operador" | null);
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
      }
    };

    getUser();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setLoading(false);

      // Si hay usuario, obtener su rol
      if (currentUser) {
        fetchUserRole(currentUser.id);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserRole(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  // Verificar roles
  const isAdmin = userRole === "admin";
  const isOperador = userRole === "operador";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo y nombre */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Car className="h-6 w-6 text-blue-600" />
            <span className="hidden sm:inline">ParkManager</span>
          </Link>
        </div>

        {/* Navegación desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1"
          >
            <MapPin className="h-4 w-4" />
            <span>Mapa</span>
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Acerca de
          </Link>
        </nav>

        {/* Autenticación y menú móvil */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url}
                      alt={user.email || "Usuario"}
                    />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.user_metadata?.full_name || "Usuario"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {userRole && (
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        Rol:{" "}
                        <span className="capitalize font-medium">
                          {userRole}
                        </span>
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                {(isAdmin || isOperador) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Panel Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={handleLogin}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </Button>
          )}

          {/* Menú móvil */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 py-4 border-b">
                  <Car className="h-6 w-6 text-blue-600" />
                  <span className="font-semibold">ParkManager</span>
                </div>

                <nav className="flex flex-col gap-2 py-4 flex-1">
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-sm font-medium"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Mapa</span>
                  </Link>
                  <Link
                    href="/about"
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-sm text-muted-foreground"
                  >
                    <span>Acerca de</span>
                  </Link>

                  {user && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-sm"
                        >
                          <User className="h-4 w-4" />
                          <span>Perfil</span>
                        </Link>
                        {(isAdmin || isOperador) && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-sm"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Panel Admin</span>
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </nav>

                <div className="border-t pt-4">
                  {user ? (
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </Button>
                  ) : (
                    <Button
                      onClick={handleLogin}
                      variant="default"
                      className="w-full justify-start gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Ingresar
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
