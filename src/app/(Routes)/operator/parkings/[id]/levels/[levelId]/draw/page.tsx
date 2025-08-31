'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/Supabase/supabaseClient'

// Crear cliente sin tipado estricto
const supabase: any = createClient()

interface Plaza {
  id: number
  x: number
  y: number
  width: number
  height: number
  tipo: number | string | null
  codigo?: string
  estado?: string
}

interface PlazaFormData {
  codigo: string
  tipo_vehiculo_id: string
  estado: "libre" | "ocupada" | "reservada" | "fuera_servicio"
}

interface HoveredPlazaInfo {
  id: number
  codigo: string
  tipo: string
  estado: string
  x: number
  y: number
}

export default function DrawPlazasPageKonva() {
  const { levelId } = useParams<{ levelId: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const imageLayerRef = useRef<any>(null)
  const [planoUrl, setPlanoUrl] = useState<string | null>(null)
  const [plazas, setPlazas] = useState<Plaza[]>([])
  const [vehicleType, setVehicleType] = useState('1')
  const [isDrawing, setIsDrawing] = useState(false)
  const [konvaLoaded, setKonvaLoaded] = useState(false)
  const [Konva, setKonva] = useState<any>(null)
  
  // Estados para crear rectángulos con clics de 4 puntos
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle'>('select')
  const [transformer, setTransformer] = useState<any>(null)
  const [selectedShape, setSelectedShape] = useState<any>(null)
  const [clickPoints, setClickPoints] = useState<{ x: number; y: number }[]>([])
  const [tempLines, setTempLines] = useState<any[]>([])
  const [drawnRect, setDrawnRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showCreateButton, setShowCreateButton] = useState(false)
  
  // Estados para el modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPlazaId, setEditingPlazaId] = useState<number | null>(null)
  const [formData, setFormData] = useState<PlazaFormData>({
    codigo: '',
    tipo_vehiculo_id: '1',
    estado: 'libre'
  })

  // Funciones para manejar clics de puntos
  const clearDrawing = useCallback(() => {
    setClickPoints([])
    setTempLines([])
    setDrawnRect(null)
    setShowCreateButton(false)
    
    // Limpiar elementos temporales del canvas
    if (layerRef.current) {
      const elementsToRemove: any[] = []
      
      layerRef.current.getChildren().forEach((child: any) => {
        if (child.isTemp || child.isPreviewLine || child.isDrawnRect) {
          elementsToRemove.push(child)
        }
      })
      
      elementsToRemove.forEach(element => {
        element.destroy()
      })
      
      layerRef.current.batchDraw()
    }
  }, [])

  const addPoint = useCallback((x: number, y: number) => {
    const newPoints = [...clickPoints, { x, y }]
    setClickPoints(newPoints)
    
    // Si tenemos 2 puntos, crear rectángulo
    if (newPoints.length === 2) {
      const [point1, point2] = newPoints
      const rectData = {
        x: Math.min(point1.x, point2.x),
        y: Math.min(point1.y, point2.y),
        width: Math.abs(point2.x - point1.x),
        height: Math.abs(point2.y - point1.y)
      }
      
      // Validar tamaño mínimo
      if (rectData.width >= 1 && rectData.height >= 1) {
        setDrawnRect(rectData)
        setShowCreateButton(true)
      } else {
        alert('El rectángulo debe tener al menos 1x1 píxeles')
        clearDrawing()
      }
    }
  }, [clickPoints, clearDrawing])

  const handleCanvasClick = useCallback((e: any) => {
    if (!stageRef.current || selectedTool !== 'select') return

    const stage = stageRef.current
    
    // Modo selección
    if (e.target === stage) {
      // Clic en área vacía - deseleccionar
      if (transformer) {
        transformer.nodes([])
      }
      setSelectedShape(null)
    } else {
      // Clic en una forma
      const target = e.target
      if (target.plazaId) {
        // Seleccionar plaza para redimensionar
        e.cancelBubble = true
        if (transformer) {
          transformer.nodes([target])
          setSelectedShape(target)
        }
      }
    }
  }, [selectedTool, transformer])
  
  // Estado para guardar las dimensiones del nuevo rectángulo
  const [newRectData, setNewRectData] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  
  // Estado para mostrar información al hacer hover
  const [hoveredPlaza, setHoveredPlaza] = useState<HoveredPlazaInfo | null>(null)

  // Mapeo de tipos de vehículo para mostrar
  const vehicleTypeNames: { [key: string]: string } = {
    '1': 'Auto',
    '2': 'Moto', 
    '3': 'Camión'
  }

  const [isClient, setIsClient] = useState(false)

  // Verificar que estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Cargar Konva dinámicamente solo en el cliente
  useEffect(() => {
    if (typeof window === 'undefined' || !isClient) return
    
    const loadKonva = async () => {
      try {
        const KonvaModule = await import('konva')
        setKonva(KonvaModule.default)
        setKonvaLoaded(true)
      } catch (error) {
        console.error('Error cargando Konva:', error)
      }
    }
    
    loadKonva()
  }, [isClient])

  const reloadPlazas = useCallback(async () => {
    if (!levelId) return
    const { data, error } = await supabase
      .from('plazas')
      .select('id, coordenada, tipo_vehiculo_id, codigo, estado')
      .eq('nivel_id', parseInt(levelId, 10))

    if (error) {
      console.error('Error fetching plazas:', error)
      return
    }

    if (data) {
      const parsedPlazas = data.map((plaza: { 
        id: number; 
        coordenada: any;
        tipo_vehiculo_id: number | null;
        codigo: string;
        estado: string;
      }) => {
        try {
          let coordenadaStr: string = ''
          
          // Verificar el tipo de coordenada y convertir a string si es necesario
          if (typeof plaza.coordenada === 'string') {
            coordenadaStr = plaza.coordenada
          } else if (typeof plaza.coordenada === 'object' && plaza.coordenada !== null) {
            // Si es un objeto GeoJSON o similar, intentar extraer coordenadas
            if (plaza.coordenada.type === 'Polygon' && plaza.coordenada.coordinates) {
              const coords = plaza.coordenada.coordinates[0]
              coordenadaStr = `POLYGON((${coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ')}))`
            } else {
              console.warn('Formato de coordenada no reconocido:', plaza.coordenada)
              return null
            }
          } else {
            console.warn('Coordenada en formato inesperado:', typeof plaza.coordenada, plaza.coordenada)
            return null
          }

          // Verificar que tenemos una cadena válida antes de procesarla
          if (!coordenadaStr || coordenadaStr.trim() === '') {
            console.warn('Coordenada vacía para plaza:', plaza.id)
            return null
          }

          // Extraer coordenadas del POLYGON
          const coords = coordenadaStr
            .replace('POLYGON((', '')
            .replace('))', '')
            .split(',')
            .map((p) => {
              const [x, y] = p.trim().split(' ').map(Number)
              return { x, y }
            })

          // Convertir polígono a rectángulo (tomar min/max x,y)
          const xCoords = coords.map(c => c.x)
          const yCoords = coords.map(c => c.y)
          const minX = Math.min(...xCoords)
          const minY = Math.min(...yCoords)
          const maxX = Math.max(...xCoords)
          const maxY = Math.max(...yCoords)
        
          return {
            id: plaza.id,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            tipo: plaza.tipo_vehiculo_id || null,
            codigo: plaza.codigo,
            estado: plaza.estado,
          }
        } catch (error) {
          console.error('Error procesando plaza:', plaza, error)
          return null
        }
      }).filter(Boolean) // Filtrar elementos null
      setPlazas(parsedPlazas)
    }
  }, [levelId])

  // Cargar el plano
  useEffect(() => {
    const fetchPlano = async () => {
      if (!levelId) return
      
      const { data, error } = await supabase
        .from('planos')
        .select('url')
        .eq('nivel_id', parseInt(levelId, 10))
        .eq('principal', true)
        .single()

      if (error) {
        console.error('Error fetching plano:', error)
      } else if (data?.url) {
        setPlanoUrl(data.url)
      }
    }

    fetchPlano()
    reloadPlazas()
  }, [levelId, reloadPlazas])

  // Inicializar Konva Stage y Layer
  useEffect(() => {
    if (!containerRef.current || !konvaLoaded || !Konva) return

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: 1500,
      height: 600,
    })

    const imageLayer = new Konva.Layer()
    const layer = new Konva.Layer()

    // Crear transformer para redimensionar
    const tr = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      borderStroke: '#4285f4',
      borderStrokeWidth: 2,
      anchorFill: '#4285f4',
      anchorStroke: '#ffffff',
      anchorStrokeWidth: 1,
      anchorSize: 8,
    })

    stage.add(imageLayer)
    stage.add(layer)
    layer.add(tr)

    stageRef.current = stage
    layerRef.current = layer
    imageLayerRef.current = imageLayer
    setTransformer(tr)

    // Zoom con rueda del mouse
    stage.on('wheel', (e: any) => {
      e.evt.preventDefault()
      
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()!
      
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      
      const direction = e.evt.deltaY > 0 ? -1 : 1
      const factor = 0.05
      const newScale = direction > 0 ? oldScale * (1 + factor) : oldScale * (1 - factor)
      
      // Limitar zoom
      const clampedScale = Math.max(0.1, Math.min(5, newScale))
      
      stage.scale({ x: clampedScale, y: clampedScale })
      
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }
      stage.position(newPos)
    })

    return () => {
      stage.destroy()
      stageRef.current = null
      layerRef.current = null
      imageLayerRef.current = null
      setTransformer(null)
    }
  }, [konvaLoaded, Konva])

  // Configurar eventos del mouse por separado
  useEffect(() => {
    if (!stageRef.current) return

    const stage = stageRef.current

    // Pan con arrastrar y creación de rectángulos por clics
    let isPanning = false

    const handleMouseDown = (e: any) => {
      if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) { // Middle click o Ctrl+Click
        isPanning = true
        stage.draggable(true)
        return
      }

      stage.draggable(false)

      // Manejar clics para crear rectángulos
      if (selectedTool === 'rectangle') {
        const target = e.target as any

        // Solo permitir crear en stage o imagen, no sobre plazas existentes
        if (target.plazaId) {
          return
        }

        const isValidTarget = e.target === stage || target.className === 'Image'

        if (isValidTarget) {
          e.cancelBubble = true // Prevenir propagación
          const pointer = stage.getPointerPosition()!
          // Obtener coordenadas relativas al stage
          const relativeX = (pointer.x - stage.x()) / stage.scaleX()
          const relativeY = (pointer.y - stage.y()) / stage.scaleY()
          
          addPoint(Math.round(relativeX), Math.round(relativeY))
          return // No continuar con handleCanvasClick
        }
      }
      
      // Solo llamar handleCanvasClick si no estamos en modo rectangle o si no se procesó el clic
      if (selectedTool === 'select') {
        handleCanvasClick(e)
      }
    }

    const handleMouseUp = (e: any) => {
      if (isPanning) {
        isPanning = false
        stage.draggable(false)
      }
    }

    // Agregar movimiento del mouse para vista previa
    const handleMouseMove = (e: any) => {
      if (selectedTool === 'rectangle' && clickPoints.length === 1 && layerRef.current) {
        // Mostrar línea de vista previa desde el primer punto hasta el cursor
        const pointer = stage.getPointerPosition()!
        const relativeX = (pointer.x - stage.x()) / stage.scaleX()
        const relativeY = (pointer.y - stage.y()) / stage.scaleY()
        
        // Limpiar líneas temporales anteriores
        layerRef.current.getChildren().forEach((child: any) => {
          if (child.isPreviewLine) {
            child.destroy()
          }
        })

        // Crear línea de vista previa
        const previewLine = new Konva.Line({
          points: [clickPoints[0].x, clickPoints[0].y, relativeX, relativeY],
          stroke: 'red',
          strokeWidth: 2,
          dash: [5, 5],
        })
        ;(previewLine as any).isPreviewLine = true
        ;(previewLine as any).isTemp = true
        
        layerRef.current.add(previewLine)
        layerRef.current.batchDraw()
      }
    }

    stage.on('mousedown', handleMouseDown)
    stage.on('mouseup', handleMouseUp)
    stage.on('mousemove', handleMouseMove)

    return () => {
      stage.off('mousedown', handleMouseDown)
      stage.off('mouseup', handleMouseUp)
      stage.off('mousemove', handleMouseMove)
    }
  }, [selectedTool, clickPoints, addPoint, handleCanvasClick])

  // Cargar imagen cuando planoUrl esté disponible
  useEffect(() => {
    if (!imageLayerRef.current || !planoUrl || !Konva) return

    const imageObj = new Image()
    imageObj.crossOrigin = 'anonymous'
    imageObj.onload = () => {
      const konvaImage = new Konva.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: 900,
        height: 600,
      })
      
      // Ajustar escala para mantener proporción
      const scaleX = 900 / imageObj.width
      const scaleY = 600 / imageObj.height
      const scale = Math.min(scaleX, scaleY)
      
      konvaImage.scale({ x: scale, y: scale })
      
      imageLayerRef.current!.removeChildren()
      imageLayerRef.current!.add(konvaImage)
    }
    
    imageObj.onerror = (error) => {
      console.error('Error cargando imagen:', error)
    }
    
    imageObj.src = planoUrl
  }, [planoUrl, Konva])

  // Dibujar plazas existentes como rectángulos
  useEffect(() => {
    if (!layerRef.current || !Konva || !transformer) return

    // Limpiar selección del transformer antes de limpiar formas
    transformer.nodes([])
    setSelectedShape(null)

    // Limpiar plazas anteriores (mantener solo rectángulos temporales y transformer)
    layerRef.current.getChildren().forEach((child: any) => {
      if (!child.isTemp && child !== transformer && !child.isDrawnRect) {
        child.destroy()
      }
    })

    // Agregar plazas como rectángulos con interactividad
    plazas.forEach((plaza) => {
      let fillColor = 'rgba(0, 100, 255, 0.3)' // libre (azul)
      let strokeColor = 'blue'
      
      if (plaza.estado === 'ocupada') {
        fillColor = 'rgba(255, 0, 0, 0.3)' // ocupada (rojo)
        strokeColor = 'red'
      } else if (plaza.estado === 'reservada') {
        fillColor = 'rgba(255, 165, 0, 0.3)' // reservada (naranja)
        strokeColor = 'orange'
      } else if (plaza.estado === 'fuera_servicio') {
        fillColor = 'rgba(128, 128, 128, 0.3)' // fuera de servicio (gris)
        strokeColor = 'gray'
      }

      const rect = new Konva.Rect({
        x: plaza.x,
        y: plaza.y,
        width: plaza.width,
        height: plaza.height,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        perfectDrawEnabled: false,
        draggable: selectedTool === 'select', // Solo draggable en modo selección
      })

      // Agregar datos de la plaza al objeto
      ;(rect as any).plazaId = plaza.id
      ;(rect as any).plazaData = plaza

      // Eventos para mostrar información al hacer hover
      rect.on('mouseenter', () => {
        if (selectedTool === 'select') {
          const stage = stageRef.current!
          const pointer = stage.getPointerPosition()!
          setHoveredPlaza({
            id: plaza.id,
            codigo: plaza.codigo || `Plaza ${plaza.id}`,
            tipo: vehicleTypeNames[plaza.tipo?.toString() || '1'] || 'Auto',
            estado: plaza.estado || 'libre',
            x: pointer.x,
            y: pointer.y
          })
          document.body.style.cursor = 'pointer'
        }
      })

      rect.on('mouseleave', () => {
        if (selectedTool === 'select') {
          setHoveredPlaza(null)
          document.body.style.cursor = 'default'
        }
      })

      // Evento para editar plaza (doble clic)
      rect.on('dblclick', () => {
        if (selectedTool === 'select') {
          handleEditPlaza(plaza)
        }
      })

      // Eventos para selección y transformación
      rect.on('click', (e: any) => {
        if (selectedTool === 'select') {
          e.cancelBubble = true
          
          if (e.evt.ctrlKey) {
            // Ctrl+click para múltiple selección (futuro)
            return
          }
          
          // Seleccionar este rectángulo
          transformer.nodes([rect])
          setSelectedShape(rect)
        }
      })

      // Eventos para actualizar la posición tras arrastrar
      rect.on('dragend', () => {
        updatePlazaPosition(plaza.id, Math.round(rect.x()), Math.round(rect.y()))
      })

      // Eventos para actualizar el tamaño tras redimensionar
      rect.on('transformend', () => {
        // Resetear transformaciones y aplicar nuevas dimensiones
        const scaleX = rect.scaleX()
        const scaleY = rect.scaleY()
        
        const newWidth = Math.round(rect.width() * scaleX)
        const newHeight = Math.round(rect.height() * scaleY)
        const newX = Math.round(rect.x())
        const newY = Math.round(rect.y())
        
        rect.scaleX(1)
        rect.scaleY(1)
        rect.width(newWidth)
        rect.height(newHeight)
        
        updatePlazaSize(plaza.id, newX, newY, newWidth, newHeight)
      })

      layerRef.current!.add(rect)
    })
    
    layerRef.current!.batchDraw()
  }, [plazas, selectedTool, Konva, transformer])

  // Dibujar rectángulo confirmado (listo para crear)
  useEffect(() => {
    if (!layerRef.current || !Konva || !drawnRect) return

    // Limpiar rectángulo anterior
    layerRef.current.getChildren().forEach((child: any) => {
      if (child.isDrawnRect) {
        child.destroy()
      }
    })

    // Crear rectángulo confirmado
    const drawnRectShape = new Konva.Rect({
      x: drawnRect.x,
      y: drawnRect.y,
      width: drawnRect.width,
      height: drawnRect.height,
      fill: 'rgba(0, 255, 0, 0.3)', // Verde para indicar que está listo para crear
      stroke: 'green',
      strokeWidth: 3,
      perfectDrawEnabled: false,
    })

    // Marcar como rectángulo dibujado y temporal
    ;(drawnRectShape as any).isDrawnRect = true
    ;(drawnRectShape as any).isTemp = true // También marcarlo como temporal para que se limpie

    layerRef.current.add(drawnRectShape)
    layerRef.current.batchDraw()
  }, [drawnRect, Konva])

  // Dibujar puntos y líneas temporales
  useEffect(() => {
    if (!layerRef.current || !Konva) return

    // Limpiar elementos temporales anteriores
    layerRef.current.getChildren().forEach((child: any) => {
      if (child.isTemp) {
        child.destroy()
      }
    })

    // Dibujar puntos clickeados
    clickPoints.forEach((point, index) => {
      const circle = new Konva.Circle({
        x: point.x,
        y: point.y,
        radius: 5,
        fill: 'red',
        stroke: 'darkred',
        strokeWidth: 2,
      })
      ;(circle as any).isTemp = true
      layerRef.current.add(circle)

      // Agregar texto con número del punto
      const text = new Konva.Text({
        x: point.x + 10,
        y: point.y - 10,
        text: `${index + 1}`,
        fontSize: 12,
        fill: 'red',
        fontStyle: 'bold'
      })
      ;(text as any).isTemp = true
      layerRef.current.add(text)
    })

    layerRef.current.batchDraw()
  }, [clickPoints, Konva])

  // Limpiar estados cuando se cambie de herramienta
  useEffect(() => {
    if (selectedTool !== 'rectangle') {
      clearDrawing()
    }
  }, [selectedTool, clearDrawing])

  // Función para confirmar y crear la plaza
  const handleCreatePlaza = async () => {
    if (!drawnRect) return

    try {
      // Generar código único usando timestamp y random
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      const codigo = `P-${timestamp}-${random}`
      
      // Convertir rectángulo a coordenadas POLYGON
      const { x, y, width, height } = drawnRect
      const coordsWKT = `POLYGON((${x} ${y}, ${x + width} ${y}, ${x + width} ${y + height}, ${x} ${y + height}, ${x} ${y}))`

      const { error } = await supabase.from('plazas').insert({
        nivel_id: parseInt(levelId!, 10),
        codigo: codigo,
        tipo_vehiculo_id: parseInt(vehicleType, 10),
        coordenada: coordsWKT,
        estado: 'libre',
      } as any)

      if (error) {
        console.error('Error guardando plaza:', error)
        alert('Error guardando plaza: ' + error.message)
      } else {
        alert(`Plaza ${codigo} creada exitosamente 🚗`)
        // Limpiar rectángulo dibujado y recargar plazas
        clearDrawing()
        reloadPlazas()
        // Volver al modo selección después de crear
        setSelectedTool('select')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error procesando la plaza')
    }
  }

  const handleCancelDrawing = () => {
    clearDrawing()
    setSelectedTool('select')
  }

  // Limpiar selección cuando cambie de herramienta
  useEffect(() => {
    if (transformer) {
      transformer.nodes([])
      setSelectedShape(null)
    }
  }, [selectedTool, transformer])

  // Agregar eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedShape && selectedTool === 'select') {
        e.preventDefault()
        handleDeletePlaza((selectedShape as any).plazaId)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedTool === 'select' && transformer) {
          transformer.nodes([])
          setSelectedShape(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShape, selectedTool, transformer])

  // Función para actualizar posición de plaza en la base de datos
  const updatePlazaPosition = async (plazaId: number, newX: number, newY: number) => {
    const plaza = plazas.find(p => p.id === plazaId)
    if (!plaza) return

    const coordsWKT = `POLYGON((${newX} ${newY}, ${newX + plaza.width} ${newY}, ${newX + plaza.width} ${newY + plaza.height}, ${newX} ${newY + plaza.height}, ${newX} ${newY}))`

    const { error } = await supabase
      .from('plazas')
      .update({ coordenada: coordsWKT })
      .eq('id', plazaId)

    if (error) {
      console.error('Error actualizando posición:', error)
      alert('Error al actualizar la posición de la plaza')
    } else {
      // Actualizar estado local
      setPlazas(prev => prev.map(p => 
        p.id === plazaId ? { ...p, x: newX, y: newY } : p
      ))
    }
  }

  // Función para eliminar plaza
  const handleDeletePlaza = async (plazaId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plaza?')) {
      return
    }

    const { error } = await supabase
      .from('plazas')
      .delete()
      .eq('id', plazaId)

    if (error) {
      console.error('Error eliminando plaza:', error)
      alert('Error al eliminar la plaza')
    } else {
      alert('Plaza eliminada correctamente')
      // Limpiar selección
      if (transformer) {
        transformer.nodes([])
      }
      setSelectedShape(null)
      reloadPlazas()
    }
  }

  // Función para actualizar tamaño de plaza en la base de datos
  const updatePlazaSize = async (plazaId: number, newX: number, newY: number, newWidth: number, newHeight: number) => {
    const coordsWKT = `POLYGON((${newX} ${newY}, ${newX + newWidth} ${newY}, ${newX + newWidth} ${newY + newHeight}, ${newX} ${newY + newHeight}, ${newX} ${newY}))`

    const { error } = await supabase
      .from('plazas')
      .update({ coordenada: coordsWKT })
      .eq('id', plazaId)

    if (error) {
      console.error('Error actualizando tamaño:', error)
      alert('Error al actualizar el tamaño de la plaza')
    } else {
      // Actualizar estado local
      setPlazas(prev => prev.map(p => 
        p.id === plazaId ? { ...p, x: newX, y: newY, width: newWidth, height: newHeight } : p
      ))
    }
  }

  // Función para crear plaza directamente sin modal
  const createPlazaDirectly = async (x: number, y: number, width: number, height: number) => {
    try {
      // Generar código único usando timestamp y random
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      const codigo = `P-${timestamp}-${random}`
      
      // Convertir rectángulo a coordenadas POLYGON
      const coordsWKT = `POLYGON((${x} ${y}, ${x + width} ${y}, ${x + width} ${y + height}, ${x} ${y + height}, ${x} ${y}))`

      const { error } = await supabase.from('plazas').insert({
        nivel_id: parseInt(levelId!, 10),
        codigo: codigo,
        tipo_vehiculo_id: parseInt(vehicleType, 10), // Usar tipo de vehículo seleccionado
        coordenada: coordsWKT,
        estado: 'libre', // Estado por defecto
      } as any)

      if (error) {
        console.error('Error guardando plaza:', error)
        alert('Error guardando plaza: ' + error.message)
      } else {
        // Recargar plazas para mostrar la nueva
        reloadPlazas()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error procesando la plaza')
    }
  }

  // Funciones para manejar el modal
  const openPlazaModal = (editMode: boolean, rectData?: { x: number; y: number; width: number; height: number } | Plaza) => {
    setIsEditMode(editMode)
    if (editMode && rectData && 'id' in rectData) {
      // Modo edición - rectData es una Plaza completa
      const plaza = rectData as Plaza
      setEditingPlazaId(plaza.id)
      setFormData({
        codigo: plaza.codigo || '',
        tipo_vehiculo_id: plaza.tipo?.toString() || '1',
        estado: (plaza.estado as "libre" | "ocupada" | "reservada" | "fuera_servicio") || 'libre'
      })
    } else {
      // Modo creación - rectData tiene las dimensiones del rectángulo
      setEditingPlazaId(null)
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      setFormData({
        codigo: `P-${timestamp}-${random}`,
        tipo_vehiculo_id: vehicleType,
        estado: 'libre'
      })
      
      // Guardar las dimensiones del rectángulo para usar al guardar
      if (rectData && !('id' in rectData)) {
        setNewRectData(rectData)
      }
    }
    setIsModalOpen(true)
  }

  const handleEditPlaza = (plaza: Plaza) => {
    openPlazaModal(true, plaza)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsEditMode(false)
    setEditingPlazaId(null)
    setNewRectData(null)
    // Volver al modo selección después de crear/editar
    setSelectedTool('select')
  }

  const handleStartDrawing = () => {
    clearDrawing() // Limpiar cualquier dibujo anterior primero
    setSelectedTool('rectangle')
    setHoveredPlaza(null)
    // Deseleccionar cualquier forma seleccionada
    if (transformer) {
      transformer.nodes([])
    }
    setSelectedShape(null)
  }

  const handleSelectTool = () => {
    setSelectedTool('select')
    setHoveredPlaza(null)
    clearDrawing() // Limpiar cualquier dibujo en progreso
  }

  const handleFormChange = (field: keyof PlazaFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSavePlaza = async () => {
    try {
      if (isEditMode && editingPlazaId) {
        // Actualizar plaza existente
        const { error }: any = await supabase
          .from('plazas')
          .update({
            codigo: formData.codigo,
            tipo_vehiculo_id: parseInt(formData.tipo_vehiculo_id, 10),
            estado: formData.estado,
          })
          .eq('id', editingPlazaId)

        if (error) {
          console.error(error)
          alert('Error actualizando plaza')
        } else {
          alert('Plaza actualizada 🚗')
          handleCloseModal()
          reloadPlazas()
        }
      } else {
        // Crear nueva plaza desde rectángulo
        if (!newRectData) {
          alert('Error: No se encontraron las dimensiones del rectángulo.')
          return
        }

        // Convertir rectángulo a coordenadas POLYGON
        const { x, y, width, height } = newRectData
        const coordsWKT = `POLYGON((${x} ${y}, ${x + width} ${y}, ${x + width} ${y + height}, ${x} ${y + height}, ${x} ${y}))`;

        const { error } = await supabase.from('plazas').insert({
          nivel_id: parseInt(levelId!, 10),
          codigo: formData.codigo,
          tipo_vehiculo_id: parseInt(formData.tipo_vehiculo_id, 10),
          coordenada: coordsWKT,
          estado: formData.estado,
        } as any);

        if (error) {
          console.error(error)
          alert('Error guardando plaza')
        } else {
          alert('Plaza guardada 🚗')
          handleCloseModal()
          reloadPlazas()
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error procesando la plaza')
    }
  }

  // Mostrar loading mientras no estemos en el cliente
  if (!isClient) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Dibujar plazas en el nivel {levelId}</h1>
        <div className="flex justify-center items-center h-64">
          <p>Inicializando...</p>
        </div>
      </div>
    )
  }

  // Mostrar loading mientras Konva se carga
  if (!konvaLoaded) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Dibujar plazas en el nivel {levelId}</h1>
        <div className="flex justify-center items-center h-64">
          <p>Cargando editor de planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 relative">
      <h1 className="text-xl font-bold">Crear plazas rectangulares en el nivel {levelId}</h1>

      {/* Barra de herramientas */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-sm font-medium mb-3">Herramientas</h3>
        <div className="flex gap-3">
          <Button 
            variant={selectedTool === 'select' ? "default" : "outline"}
            onClick={handleSelectTool}
            className="flex items-center gap-2"
          >
            <span>🖱️</span>
            Seleccionar
          </Button>
          
          <Button 
            variant={selectedTool === 'rectangle' ? "default" : "outline"}
            onClick={handleStartDrawing}
            className="flex items-center gap-2"
          >
            <span>🟦</span>
            Crear Plaza
          </Button>

          {/* Botón para limpiar dibujo actual */}
          {selectedTool === 'rectangle' && clickPoints.length > 0 && (
            <Button 
              variant="outline"
              onClick={clearDrawing}
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <span>🧹</span>
              Limpiar
            </Button>
          )}

          {/* Selector de tipo de vehículo para nuevas plazas */}
          <div className="flex items-center gap-2">
            <Label htmlFor="vehicleType" className="text-sm">Tipo:</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Auto</SelectItem>
                <SelectItem value="2">Moto</SelectItem>
                <SelectItem value="3">Camión</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Indicador de estado actual */}
        {selectedTool === 'rectangle' && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm font-medium text-blue-800">
              🎯 Modo Crear Plaza Activo
            </p>
            <p className="text-xs text-blue-600">
              Puntos marcados: {clickPoints.length}/2
              {clickPoints.length === 0 && " - Haz clic en la primera esquina"}
              {clickPoints.length === 1 && " - Haz clic en la esquina opuesta"}
            </p>
          </div>
        )}
        
        <div className="mt-3 text-xs text-gray-600">
          {selectedTool === 'select' && (
            <div>
              <p>• Haz clic para seleccionar plazas</p>
              <p>• Arrastra para mover plazas</p>
              <p>• Usa los controladores para redimensionar</p>
              <p>• Doble clic para editar propiedades</p>
            </div>
          )}
          {selectedTool === 'rectangle' && (
            <div>
              <p>• Haz clic en 2 puntos para definir las esquinas del rectángulo</p>
              <p>• Punto 1: Esquina superior izquierda</p>
              <p>• Punto 2: Esquina inferior derecha</p>
              <p>• Tamaño mínimo: 1x1 píxeles</p>
              <p>• Aparecerá un botón "Crear" para confirmar la plaza</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel de confirmación para plaza dibujada */}
      {showCreateButton && drawnRect && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium mb-3 text-green-800">
            Plaza dibujada - ¿Deseas crearla?
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Dimensiones: {drawnRect.width} x {drawnRect.height} píxeles en posición ({drawnRect.x}, {drawnRect.y})
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={handleCreatePlaza}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <span>✅</span>
              Crear Plaza
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleCancelDrawing}
              className="flex items-center gap-2"
            >
              <span>❌</span>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Panel de acciones para plaza seleccionada */}
      {selectedShape && selectedTool === 'select' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium mb-3 text-blue-800">
            Plaza seleccionada: {(selectedShape as any).plazaData?.codigo || 'Sin código'}
          </h3>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditPlaza((selectedShape as any).plazaData)}
              className="flex items-center gap-2"
            >
              <span>✏️</span>
              Editar Propiedades
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => handleDeletePlaza((selectedShape as any).plazaId)}
              className="flex items-center gap-2"
            >
              <span>🗑️</span>
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg shadow overflow-hidden">
        <div ref={containerRef} className="w-full h-[650px]" />
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>Controles del canvas:</strong> Rueda del mouse = Zoom | Ctrl+Click = Pan</p>
        <p><strong>Atajos de teclado:</strong> Delete = Eliminar plaza seleccionada | Escape = Cancelar/Deseleccionar</p>
        {selectedShape && (
          <p className="text-blue-600">
            <strong>Plaza seleccionada:</strong> {(selectedShape as any).plazaData?.codigo || 'Sin código'} 
            - Usa los controladores azules para redimensionar o arrastra para mover
          </p>
        )}
      </div>

      {/* Tooltip para plazas existentes */}
      {hoveredPlaza && (
        <div 
          className="absolute bg-black text-white p-2 rounded text-xs z-10 pointer-events-none"
          style={{
            left: hoveredPlaza.x + 10,
            top: hoveredPlaza.y - 10,
          }}
        >
          <p><strong>{hoveredPlaza.codigo}</strong></p>
          <p>Tipo: {hoveredPlaza.tipo}</p>
          <p>Estado: {hoveredPlaza.estado}</p>
        </div>
      )}

      {/* Modal para crear/editar plaza */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar Plaza' : 'Nueva Plaza'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Modifica los datos de la plaza seleccionada.'
                : 'Complete los datos de la nueva plaza.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código de la plaza</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleFormChange('codigo', e.target.value)}
                placeholder="Ej: A-01"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo de vehículo</Label>
              <Select 
                value={formData.tipo_vehiculo_id} 
                onValueChange={(value) => handleFormChange('tipo_vehiculo_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Auto</SelectItem>
                  <SelectItem value="2">Moto</SelectItem>
                  <SelectItem value="3">Camión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value: "libre" | "ocupada" | "reservada" | "fuera_servicio") => handleFormChange('estado', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libre">Libre</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="reservada">Reservada</SelectItem>
                  <SelectItem value="fuera_servicio">Fuera de servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlaza}>
              {isEditMode ? 'Actualizar Plaza' : 'Guardar Plaza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
