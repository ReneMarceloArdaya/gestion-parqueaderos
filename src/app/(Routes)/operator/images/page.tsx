'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Upload, 
  Star, 
  Trash2, 
  Eye, 
  Image as ImageIcon,
  Plus,
  Download,
  RotateCcw
} from 'lucide-react'

// Crear cliente sin tipado estricto
const supabase: any = createClient()

interface Parqueadero {
  id: number
  nombre: string
  direccion: string
  imagen_principal?: string
}

interface ImagenParqueadero {
  id: number
  parqueadero_id: number
  url: string
  public_id_cloudinary: string
  principal: boolean
  orden: number
  titulo?: string
  descripcion?: string
  creado_at: string
}

interface UploadingImage {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  preview: string
}

export default function ImagesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([])
  const [selectedParqueadero, setSelectedParqueadero] = useState<Parqueadero | null>(null)
  const [imagenes, setImagenes] = useState<ImagenParqueadero[]>([])
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingImages, setLoadingImages] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ImagenParqueadero | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<ImagenParqueadero | null>(null)

  // Cargar parqueaderos del operador
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true)
        
        // Obtener sesión del usuario
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        // Obtener ID del operador
        const { data: operatorData, error: operatorError } = await supabase
          .from('operadores')
          .select('id')
          .eq('usuario_id', session.user.id)
          .single()

        if (operatorError || !operatorData) {
          console.error('No se encontró el operador asociado a tu cuenta')
          return
        }

        // Obtener parqueaderos usando la función RPC
        const { data: parqueaderosData, error } = await supabase.rpc('get_operator_parkings_with_coordinates', {
          operator_id_param: operatorData.id
        })

        if (error) {
          console.error('Error fetching parqueaderos:', error)
          return
        }

        // Obtener imagen principal para cada parqueadero
        const parqueaderosConImagenes = await Promise.all(
          (parqueaderosData || []).map(async (parqueadero: any) => {
            try {
              const { data: imagenPrincipal } = await supabase
                .from('parqueadero_imagenes')
                .select('url')
                .eq('parqueadero_id', parqueadero.id)
                .eq('principal', true)
                .eq('activo', true)
                .single()

              return {
                ...parqueadero,
                imagen_principal: imagenPrincipal?.url || undefined
              }
            } catch (error) {
              // Si no hay imagen principal, continuar sin ella
              return {
                ...parqueadero,
                imagen_principal: undefined
              }
            }
          })
        )

        setParqueaderos(parqueaderosConImagenes)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [router])

  // Cargar imágenes de un parqueadero
  const fetchImagenes = async (parqueaderoId: number) => {
    try {
      setLoadingImages(true)
      
      const { data, error } = await supabase
        .from('parqueadero_imagenes')
        .select('*')
        .eq('parqueadero_id', parqueaderoId)
        .order('orden', { ascending: true })

      if (error) {
        console.error('Error fetching images:', error)
        setImagenes([])
        return
      }

      setImagenes(data || [])
    } catch (error) {
      console.error('Error:', error)
      setImagenes([])
    } finally {
      setLoadingImages(false)
    }
  }

  // Manejar selección de parqueadero
  const handleParqueaderoSelect = async (parqueadero: Parqueadero) => {
    setSelectedParqueadero(parqueadero)
    setIsModalOpen(true)
    await fetchImagenes(parqueadero.id)
  }

  // Manejar selección de archivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!selectedParqueadero) return

    // Verificar límite de imágenes
    const totalImages = imagenes.length + uploadingImages.length + files.length
    if (totalImages > 4) {
      alert(`Solo puedes tener máximo 4 imágenes por parqueadero. Actualmente tienes ${imagenes.length + uploadingImages.length} imágenes.`)
      return
    }

    // Validar archivos
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} no es un archivo de imagen válido`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        alert(`${file.name} es muy grande. Máximo 5MB por imagen`)
        return false
      }
      return true
    })

    // Crear previews y comenzar upload
    const newUploads: UploadingImage[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading',
      preview: URL.createObjectURL(file)
    }))

    setUploadingImages(prev => [...prev, ...newUploads])

    // Subir archivos
    newUploads.forEach(upload => uploadImage(upload))

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Subir imagen a Cloudinary
  const uploadImage = async (upload: UploadingImage) => {
    try {
      const formData = new FormData()
      formData.append('file', upload.file)

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadingImages(prev => 
          prev.map(img => 
            img.id === upload.id 
              ? { ...img, progress: Math.min(img.progress + 10, 90) }
              : img
          )
        )
      }, 200)

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('Error uploading image')
      }

      const { url } = await response.json()
      
      // Obtener public_id de la URL de Cloudinary
      const publicId = url.split('/').pop()?.split('.')[0] || ''

      // Guardar en base de datos
      const { data, error } = await supabase
        .from('parqueadero_imagenes')
        .insert({
          parqueadero_id: selectedParqueadero!.id,
          url: url,
          public_id_cloudinary: publicId,
          principal: imagenes.length === 0, // Primera imagen es principal
          orden: imagenes.length + 1,
          descripcion: upload.file.name
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar estado
      setUploadingImages(prev => prev.filter(img => img.id !== upload.id))
      setImagenes(prev => [...prev, data])

    } catch (error) {
      console.error('Error uploading image:', error)
      setUploadingImages(prev => 
        prev.map(img => 
          img.id === upload.id 
            ? { ...img, status: 'error', progress: 100 }
            : img
        )
      )
    }
  }

  // Eliminar imagen
  const handleDeleteImage = async () => {
    if (!imageToDelete) return

    try {
      // Eliminar de Cloudinary
      await fetch('/api/upload/cloudinary/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_id: imageToDelete.public_id_cloudinary }),
      })

      // Eliminar de base de datos
      const { error } = await supabase
        .from('parqueadero_imagenes')
        .delete()
        .eq('id', imageToDelete.id)

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar lista de imágenes
      const nuevasImagenes = imagenes.filter(img => img.id !== imageToDelete.id)
      setImagenes(nuevasImagenes)

      // Si era la imagen principal, actualizar
      if (imageToDelete.principal && nuevasImagenes.length > 0) {
        const nuevaPrincipal = nuevasImagenes[0]
        await supabase
          .from('parqueadero_imagenes')
          .update({ principal: true })
          .eq('id', nuevaPrincipal.id)

        setImagenes(prev => 
          prev.map(img => 
            img.id === nuevaPrincipal.id 
              ? { ...img, principal: true }
              : img
          )
        )

        // Actualizar estado de parqueaderos con la nueva imagen principal
        setParqueaderos(prevParqueaderos => 
          prevParqueaderos.map(p => 
            p.id === selectedParqueadero!.id 
              ? { ...p, imagen_principal: nuevaPrincipal.url }
              : p
          )
        )
      } else if (imageToDelete.principal && nuevasImagenes.length === 0) {
        // No hay más imágenes, remover imagen principal del parqueadero
        setParqueaderos(prevParqueaderos => 
          prevParqueaderos.map(p => 
            p.id === selectedParqueadero!.id 
              ? { ...p, imagen_principal: undefined }
              : p
          )
        )
      }

      setDeleteDialogOpen(false)
      setImageToDelete(null)
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Error al eliminar la imagen')
    }
  }

  // Establecer como imagen principal
  const setImagenPrincipal = async (imagen: ImagenParqueadero) => {
    try {
      // Actualizar base de datos
      await supabase
        .from('parqueadero_imagenes')
        .update({ principal: false })
        .eq('parqueadero_id', selectedParqueadero!.id)

      await supabase
        .from('parqueadero_imagenes')
        .update({ principal: true })
        .eq('id', imagen.id)

      // Actualizar estado local de imágenes
      setImagenes(prev => 
        prev.map(img => ({
          ...img,
          principal: img.id === imagen.id
        }))
      )

      // Actualizar estado local de parqueaderos con la nueva imagen principal
      setParqueaderos(prevParqueaderos => 
        prevParqueaderos.map(p => 
          p.id === selectedParqueadero!.id 
            ? { ...p, imagen_principal: imagen.url }
            : p
        )
      )
    } catch (error) {
      console.error('Error setting main image:', error)
      alert('Error al establecer imagen principal')
    }
  }

  // Reordenar imágenes
  const reorderImages = async (dragIndex: number, hoverIndex: number) => {
    const newImagenes = [...imagenes]
    const draggedImage = newImagenes[dragIndex]
    
    newImagenes.splice(dragIndex, 1)
    newImagenes.splice(hoverIndex, 0, draggedImage)
    
    // Actualizar orden en base de datos
    const updates = newImagenes.map((img, index) => 
      supabase
        .from('parqueadero_imagenes')
        .update({ orden: index + 1 })
        .eq('id', img.id)
    )
    
    await Promise.all(updates)
    setImagenes(newImagenes)
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gestión de Imágenes</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📸 Gestión de Imágenes</h1>
          <p className="text-gray-600">Administra las imágenes de tus parqueaderos</p>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{parqueaderos.length}</span> parqueaderos
        </div>
      </div>

      {/* Grid de parqueaderos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {parqueaderos.map((parqueadero) => (
          <Card 
            key={parqueadero.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden"
            onClick={() => handleParqueaderoSelect(parqueadero)}
          >
            {/* Imagen de preview */}
            <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50">
              {parqueadero.imagen_principal ? (
                <img 
                  src={parqueadero.imagen_principal} 
                  alt={parqueadero.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Sin imagen principal</p>
                  </div>
                </div>
              )}
              
              {/* Badge de estado */}
              <div className="absolute top-3 right-3">
                <Badge className="bg-white/90 text-gray-700 border">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {/* Aquí podríamos mostrar el conteo de imágenes si lo tenemos */}
                </Badge>
              </div>

              {/* Overlay de hover */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                <Button variant="secondary" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Gestionar Imágenes
                </Button>
              </div>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-gray-900">
                🏢 {parqueadero.nombre}
              </CardTitle>
              <p className="text-sm text-gray-600">
                📍 {parqueadero.direccion}
              </p>
            </CardHeader>

            <CardContent className="pt-0">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  handleParqueaderoSelect(parqueadero)
                }}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Gestionar Imágenes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {!loading && parqueaderos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay parqueaderos disponibles
          </h3>
          <p className="text-gray-600 mb-6">
            Primero crea parqueaderos para poder gestionar sus imágenes
          </p>
        </div>
      )}

      {/* Modal de gestión de imágenes */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              📸 Imágenes - {selectedParqueadero?.nombre}
            </DialogTitle>
            <DialogDescription>
              Gestiona las imágenes de este parqueadero (máximo 4 imágenes)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Botón de subir imágenes */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Imágenes del Parqueadero</h3>
                <p className="text-sm text-gray-600">
                  {imagenes.length + uploadingImages.length}/4 imágenes
                </p>
              </div>
              
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imagenes.length + uploadingImages.length >= 4}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Imágenes
                </Button>
              </div>
            </div>

            {/* Grid de imágenes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Imágenes cargando */}
              {uploadingImages.map((upload) => (
                <div key={upload.id} className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img 
                      src={upload.preview} 
                      alt="Subiendo..."
                      className="w-full h-full object-cover opacity-50"
                    />
                    
                    {/* Overlay de progreso */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs">{upload.progress}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Imágenes existentes */}
              {imagenes.map((imagen, index) => (
                <div key={imagen.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-transparent hover:border-blue-300 transition-all">
                    <img 
                      src={imagen.url} 
                      alt={imagen.descripcion || `Imagen ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => {
                        setPreviewImage(imagen)
                        setPreviewDialogOpen(true)
                      }}
                    />
                    
                    {/* Badge de imagen principal */}
                    {imagen.principal && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500 text-white text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Principal
                        </Badge>
                      </div>
                    )}

                    {/* Overlay de acciones */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(imagen)
                            setPreviewDialogOpen(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {!imagen.principal && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              setImagenPrincipal(imagen)
                            }}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageToDelete(imagen)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Número de orden */}
                    <div className="absolute bottom-2 right-2">
                      <div className="w-6 h-6 bg-black/70 text-white text-xs rounded-full flex items-center justify-center">
                        {imagen.orden}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Placeholder para agregar más imágenes */}
              {imagenes.length + uploadingImages.length < 4 && (
                <div 
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center text-gray-500">
                    <Plus className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Agregar imagen</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información de ayuda */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Consejos:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• La primera imagen se establece automáticamente como principal</li>
                <li>• Puedes cambiar la imagen principal haciendo clic en ⭐</li>
                <li>• Formatos soportados: JPG, PNG, WebP (máximo 5MB)</li>
                <li>• Las imágenes se muestran en el carrusel según su orden</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de preview de imagen */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewImage?.principal && <Star className="w-5 h-5 text-yellow-500" />}
              {previewImage?.titulo || previewImage?.descripcion || 'Imagen del parqueadero'}
            </DialogTitle>
          </DialogHeader>
          
          {previewImage && (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={previewImage.url} 
                  alt={previewImage.descripcion || 'Preview'}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p>Orden: {previewImage.orden}</p>
                  <p>Subida: {new Date(previewImage.creado_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(previewImage.url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                  
                                    {!previewImage.principal && (
                    <Button
                      onClick={() => {
                        setImagenPrincipal(previewImage)
                        setPreviewDialogOpen(false)
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Hacer Principal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la imagen. Esta acción no se puede deshacer.
              {imageToDelete?.principal && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  ⚠️ Esta es la imagen principal. Si la eliminas, otra imagen será establecida como principal automáticamente.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteImage}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
