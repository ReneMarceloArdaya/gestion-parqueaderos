export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      operadores: {
        Row: {
          id: number
          nombre: string
          contacto_email: string | null
          contacto_telefono: string | null
          website: string | null
          creado_at: string
          actualizado_at: string
          usuario_id: string | null 
        }
        Insert: {
          id?: number
          nombre: string
          contacto_email?: string | null
          contacto_telefono?: string | null
          website?: string | null
          creado_at?: string
          actualizado_at?: string
          usuario_id?: string | null 
        }
        Update: {
          id?: number
          nombre?: string
          contacto_email?: string | null
          contacto_telefono?: string | null
          website?: string | null
          creado_at?: string
          actualizado_at?: string
          usuario_id?: string | null 
        }
        Relationships: [
          {
            foreignKeyName: "operadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      parqueaderos: {
        Row: {
          id: number
          operador_id: number | null
          nombre: string
          descripcion: string | null
          tipo: "publico" | "privado"
          capacidad_total: number
          geom: string
          direccion: string | null
          ciudad: string | null
          pais: string | null
          zona: string | null
          activo: boolean
          creado_at: string
          actualizado_at: string
        }
        Insert: {
          id?: number
          operador_id?: number | null
          nombre: string
          descripcion?: string | null
          tipo?: "publico" | "privado"
          capacidad_total?: number
          geom: string
          direccion?: string | null
          ciudad?: string | null
          pais?: string | null
          zona?: string | null
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
        }
        Update: {
          id?: number
          operador_id?: number | null
          nombre?: string
          descripcion?: string | null
          tipo?: "publico" | "privado"
          capacidad_total?: number
          geom?: string
          direccion?: string | null
          ciudad?: string | null
          pais?: string | null
          zona?: string | null
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parqueaderos_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          }
        ]
      }
      parqueadero_imagenes: {
        Row: {
          id: number
          parqueadero_id: number
          url: string
          orden: number
          titulo: string | null
          descripcion: string | null
          principal: boolean
          activo: boolean
          creado_at: string
          actualizado_at: string
          public_id_cloudinary: string
        }
        Insert: {
          id?: number
          parqueadero_id: number
          url: string
          orden?: number
          titulo?: string | null
          descripcion?: string | null
          principal?: boolean
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
          public_id_cloudinary?: string
        }
        Update: {
          id?: number
          parqueadero_id?: number
          url?: string
          orden?: number
          titulo?: string | null
          descripcion?: string | null
          principal?: boolean
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
          public_id_cloudinary?: string
        }
        Relationships: [
          {
            foreignKeyName: "parqueadero_imagenes_parqueadero_id_fkey"
            columns: ["parqueadero_id"]
            isOneToOne: false
            referencedRelation: "parqueaderos"
            referencedColumns: ["id"]
          }
        ]
      }
      niveles: {
        Row: {
          id: number
          parqueadero_id: number
          nombre: string | null
          orden: number | null
          capacidad: number | null
          creado_at: string
        }
        Insert: {
          id?: number
          parqueadero_id: number
          nombre?: string | null
          orden?: number | null
          capacidad?: number | null
          creado_at?: string
        }
        Update: {
          id?: number
          parqueadero_id?: number
          nombre?: string | null
          orden?: number | null
          capacidad?: number | null
          creado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveles_parqueadero_id_fkey"
            columns: ["parqueadero_id"]
            isOneToOne: false
            referencedRelation: "parqueaderos"
            referencedColumns: ["id"]
          }
        ]
      }
      planos: {
        Row: {
          id: number
          nivel_id: number
          nombre: string | null
          url: string
          tipo: "imagen" | "pdf" | "dwg" | "svg"
          principal: boolean
          metadata: Json | null
          orden: number | null
          activo: boolean
          creado_at: string
          actualizado_at: string
          public_id: string
        }
        Insert: {
          id?: number
          nivel_id: number
          nombre?: string | null
          url: string
          tipo?: "imagen" | "pdf" | "dwg" | "svg"
          principal?: boolean
          metadata?: Json | null
          orden?: number | null
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
          public_id: string
        }
        Update: {
          id?: number
          nivel_id?: number
          nombre?: string | null
          url?: string
          tipo?: "imagen" | "pdf" | "dwg" | "svg"
          principal?: boolean
          metadata?: Json | null
          orden?: number | null
          activo?: boolean
          creado_at?: string
          actualizado_at?: string
          public_id: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveles"
            referencedColumns: ["id"]
          }
        ]
      }
      plazas: {
        Row: {
          id: number
          nivel_id: number
          codigo: string | null
          tipo_vehiculo_id: number | null
          coordenada: string | null
          estado: "libre" | "ocupada" | "reservada" | "fuera_servicio"
          ultimo_actualizado: string
        }
        Insert: {
          id?: number
          nivel_id: number
          codigo?: string | null
          tipo_vehiculo_id?: number | null
          coordenada?: string | null
          estado?: "libre" | "ocupada" | "reservada" | "fuera_servicio"
          ultimo_actualizado?: string
        }
        Update: {
          id?: number
          nivel_id?: number
          codigo?: string | null
          tipo_vehiculo_id?: number | null
          coordenada?: string | null
          estado?: "libre" | "ocupada" | "reservada" | "fuera_servicio"
          ultimo_actualizado?: string
        }
        Relationships: [
          {
            foreignKeyName: "plazas_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plazas_tipo_vehiculo_id_fkey"
            columns: ["tipo_vehiculo_id"]
            isOneToOne: false
            referencedRelation: "tipos_vehiculo"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios: {
        Row: {
          id: string
          nombre: string | null
          email: string | null
          telefono: string | null
          rol: "usuario" | "admin" | "operador"
          creado_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          email?: string | null
          telefono?: string | null
          rol?: "usuario" | "admin" | "operador"
          creado_at?: string
        }
        Update: {
          id?: string
          nombre?: string | null
          email?: string | null
          telefono?: string | null
          rol?: "usuario" | "admin" | "operador"
          creado_at?: string
        }
        Relationships: []
      }
      tipos_vehiculo: {
        Row: {
          id: number
          codigo: string
          nombre: string
          descripcion: string | null
          creado_at: string
        }
        Insert: {
          id?: number
          codigo: string
          nombre: string
          descripcion?: string | null
          creado_at?: string
        }
        Update: {
          id?: number
          codigo?: string
          nombre?: string
          descripcion?: string | null
          creado_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          id: number
          usuario_id: string | null
          tipo_vehiculo_id: number | null
          parqueadero_id: number
          plaza_id: number | null
          hora_inicio: string
          hora_fin: string
          duracion_minutos: number | null
          estado: "activa" | "confirmada" | "completada" | "cancelada" | "expirada"
          codigo_reserva: string | null
          creado_at: string
          actualizado_at: string
        }
        Insert: {
          id?: number
          usuario_id?: string | null
          tipo_vehiculo_id?: number | null
          parqueadero_id: number
          plaza_id?: number | null
          hora_inicio: string
          hora_fin: string
          duracion_minutos?: number | null
          estado?: "activa" | "confirmada" | "completada" | "cancelada" | "expirada"
          codigo_reserva?: string | null
          creado_at?: string
          actualizado_at?: string
        }
        Update: {
          id?: number
          usuario_id?: string | null
          tipo_vehiculo_id?: number | null
          parqueadero_id?: number
          plaza_id?: number | null
          hora_inicio?: string
          hora_fin?: string
          duracion_minutos?: number | null
          estado?: "activa" | "confirmada" | "completada" | "cancelada" | "expirada"
          codigo_reserva?: string | null
          creado_at?: string
          actualizado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_parqueadero_id_fkey"
            columns: ["parqueadero_id"]
            isOneToOne: false
            referencedRelation: "parqueaderos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_plaza_id_fkey"
            columns: ["plaza_id"]
            isOneToOne: false
            referencedRelation: "plazas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_tipo_vehiculo_id_fkey"
            columns: ["tipo_vehiculo_id"]
            isOneToOne: false
            referencedRelation: "tipos_vehiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      tarifas: {
        Row: {
          id: number
          parqueadero_id: number
          tipo_vehiculo_id: number
          nombre: string | null
          tipo_tarifa: "por_hora" | "por_tramo" | "tarifa_fija"
          precio_por_hora: number | null
          precio_fijo: number | null
          tramos: Json | null
          valido_desde: string
          valido_hasta: string | null
          creado_at: string
        }
        Insert: {
          id?: number
          parqueadero_id: number
          tipo_vehiculo_id: number
          nombre?: string | null
          tipo_tarifa?: "por_hora" | "por_tramo" | "tarifa_fija"
          precio_por_hora?: number | null
          precio_fijo?: number | null
          tramos?: Json | null
          valido_desde?: string
          valido_hasta?: string | null
          creado_at?: string
        }
        Update: {
          id?: number
          parqueadero_id?: number
          tipo_vehiculo_id?: number
          nombre?: string | null
          tipo_tarifa?: "por_hora" | "por_tramo" | "tarifa_fija"
          precio_por_hora?: number | null
          precio_fijo?: number | null
          tramos?: Json | null
          valido_desde?: string
          valido_hasta?: string | null
          creado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_parqueadero_id_fkey"
            columns: ["parqueadero_id"]
            isOneToOne: false
            referencedRelation: "parqueaderos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifas_tipo_vehiculo_id_fkey"
            columns: ["tipo_vehiculo_id"]
            isOneToOne: false
            referencedRelation: "tipos_vehiculo"
            referencedColumns: ["id"]
          }
        ]
      }
      transacciones: {
        Row: {
          id: number
          reserva_id: number | null
          usuario_id: string | null
          importe: number | null
          moneda: string
          proveedor_pago: string | null
          estado: "pendiente" | "confirmado" | "fallido" | "reembolsado"
          referencia: string | null
          creado_at: string
        }
        Insert: {
          id?: number
          reserva_id?: number | null
          usuario_id?: string | null
          importe?: number | null
          moneda?: string
          proveedor_pago?: string | null
          estado?: "pendiente" | "confirmado" | "fallido" | "reembolsado"
          referencia?: string | null
          creado_at?: string
        }
        Update: {
          id?: number
          reserva_id?: number | null
          usuario_id?: string | null
          importe?: number | null
          moneda?: string
          proveedor_pago?: string | null
          estado?: "pendiente" | "confirmado" | "fallido" | "reembolsado"
          referencia?: string | null
          creado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}