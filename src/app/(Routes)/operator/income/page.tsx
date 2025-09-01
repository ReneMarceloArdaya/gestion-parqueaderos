'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { 
  TrendingUp, DollarSign, Calendar, Download, FileText, FileSpreadsheet, 
  Eye, Printer, Loader2, Filter, RefreshCw
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'

interface IncomeData {
  fecha: string
  ingresos: number
  transacciones: number
  parqueadero: string
}

interface ParkingStats {
  id: number
  nombre: string
  total_ingresos: number
  total_transacciones: number
  promedio_diario: number
}

interface MonthlyData {
  mes: string
  ingresos: number
  transacciones: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function IncomePage() {
  const [incomeData, setIncomeData] = useState<IncomeData[]>([])
  const [parkingStats, setParkingStats] = useState<ParkingStats[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [dateRange, setDateRange] = useState({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  })
  const [selectedParking, setSelectedParking] = useState<string>('all')
  const [parkingOptions, setParkingOptions] = useState<{id: number, nombre: string}[]>([])
  const [totalStats, setTotalStats] = useState({
    totalIngresos: 0,
    totalTransacciones: 0,
    promedioSemanal: 0,
    ingresosMes: 0
  })

  const chartRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadIncomeData = async () => {
    try {
      setLoading(true)
      
      // Obtener el usuario actual y sus parqueaderos
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('No se pudo obtener el usuario autenticado')
      }

      // Obtener operador
      const { data: operatorData, error: operatorError } = await supabase
        .from('operadores')
        .select('id')
        .eq('usuario_id', user.id)
        .single()

      if (operatorError || !operatorData) {
        throw new Error('No se pudo obtener el operador')
      }

      // Obtener parqueaderos del operador
      const { data: parkings, error: parkingsError } = await supabase
        .from('parqueaderos')
        .select('id, nombre')
        .eq('operador_id', (operatorData as any).id)

      if (parkingsError) {
        throw new Error('Error al cargar parqueaderos')
      }

      setParkingOptions((parkings as any) || [])

      // Construir filtro de parqueaderos
      const parkingIds = selectedParking === 'all' 
        ? (parkings as any)?.map((p: any) => p.id) || []
        : [parseInt(selectedParking)]

      if (parkingIds.length === 0) {
        setIncomeData([])
        setParkingStats([])
        setMonthlyData([])
        setTotalStats({ totalIngresos: 0, totalTransacciones: 0, promedioSemanal: 0, ingresosMes: 0 })
        return
      }

      // Obtener datos de ingresos con joins
      const { data: transacciones, error: transaccionesError } = await supabase
        .from('transacciones')
        .select(`
          *,
          reservas!inner (
            id,
            parqueadero_id,
            creado_at,
            parqueaderos!inner (
              id,
              nombre
            )
          )
        `)
        .in('reservas.parqueadero_id', parkingIds)
        .gte('creado_at', dateRange.inicio)
        .lte('creado_at', dateRange.fin + 'T23:59:59')
        .eq('estado', 'confirmado')

      if (transaccionesError) {
        console.error('Error loading transactions:', transaccionesError)
        throw new Error('Error al cargar las transacciones')
      }

      // Procesar datos para gráficos
      const processedData = processIncomeData((transacciones as any) || [])
      const parkingStatsData = processParkingStats((transacciones as any) || [])
      const monthlyStatsData = processMonthlyData((transacciones as any) || [])
      const totalStatsData = calculateTotalStats((transacciones as any) || [])

      setIncomeData(processedData)
      setParkingStats(parkingStatsData)
      setMonthlyData(monthlyStatsData)
      setTotalStats(totalStatsData)

    } catch (error) {
      console.error('Error loading income data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processIncomeData = (transacciones: any[]): IncomeData[] => {
    const grouped: { [key: string]: { ingresos: number, transacciones: number, parqueadero: string } } = {}
    
    transacciones.forEach(trans => {
      const fecha = new Date(trans.creado_at).toISOString().split('T')[0]
      const parqueadero = trans.reservas?.parqueaderos?.nombre || 'Desconocido'
      const key = `${fecha}-${parqueadero}`
      
      if (!grouped[key]) {
        grouped[key] = { ingresos: 0, transacciones: 0, parqueadero }
      }
      
      grouped[key].ingresos += trans.importe || 0
      grouped[key].transacciones += 1
    })

    return Object.entries(grouped).map(([key, data]) => ({
      fecha: key.split('-').slice(0, 3).join('-'),
      ingresos: data.ingresos,
      transacciones: data.transacciones,
      parqueadero: data.parqueadero
    })).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  const processParkingStats = (transacciones: any[]): ParkingStats[] => {
    const grouped: { [key: string]: { ingresos: number, transacciones: number, nombre: string, id: number } } = {}
    
    transacciones.forEach(trans => {
      const parkingId = trans.reservas?.parqueadero_id
      const nombre = trans.reservas?.parqueaderos?.nombre || 'Desconocido'
      
      if (!grouped[parkingId]) {
        grouped[parkingId] = { ingresos: 0, transacciones: 0, nombre, id: parkingId }
      }
      
      grouped[parkingId].ingresos += trans.importe || 0
      grouped[parkingId].transacciones += 1
    })

    const dias = Math.max(1, Math.ceil((new Date(dateRange.fin).getTime() - new Date(dateRange.inicio).getTime()) / (1000 * 60 * 60 * 24)))

    return Object.values(grouped).map(data => ({
      id: data.id,
      nombre: data.nombre,
      total_ingresos: data.ingresos,
      total_transacciones: data.transacciones,
      promedio_diario: data.ingresos / dias
    }))
  }

  const processMonthlyData = (transacciones: any[]): MonthlyData[] => {
    const grouped: { [key: string]: { ingresos: number, transacciones: number } } = {}
    
    transacciones.forEach(trans => {
      const fecha = new Date(trans.creado_at)
      const mes = fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      
      if (!grouped[mes]) {
        grouped[mes] = { ingresos: 0, transacciones: 0 }
      }
      
      grouped[mes].ingresos += trans.importe || 0
      grouped[mes].transacciones += 1
    })

    return Object.entries(grouped).map(([mes, data]) => ({
      mes,
      ingresos: data.ingresos,
      transacciones: data.transacciones
    }))
  }

  const calculateTotalStats = (transacciones: any[]) => {
    const totalIngresos = transacciones.reduce((sum, trans) => sum + (trans.importe || 0), 0)
    const totalTransacciones = transacciones.length
    const dias = Math.max(1, Math.ceil((new Date(dateRange.fin).getTime() - new Date(dateRange.inicio).getTime()) / (1000 * 60 * 60 * 24)))
    const promedioSemanal = (totalIngresos / dias) * 7
    
    // Ingresos del mes actual
    const mesActual = new Date().getMonth()
    const anoActual = new Date().getFullYear()
    const ingresosMes = transacciones
      .filter(trans => {
        const fecha = new Date(trans.creado_at)
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anoActual
      })
      .reduce((sum, trans) => sum + (trans.importe || 0), 0)

    return {
      totalIngresos,
      totalTransacciones,
      promedioSemanal,
      ingresosMes
    }
  }

  const exportToPDF = async () => {
    try {
      setExporting(true)
      
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Título del reporte
      pdf.setFontSize(20)
      pdf.text('Reporte de Ingresos', pageWidth / 2, 20, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.text(`Período: ${dateRange.inicio} - ${dateRange.fin}`, pageWidth / 2, 30, { align: 'center' })
      pdf.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, 40, { align: 'center' })

      // Línea separadora
      pdf.setLineWidth(0.5)
      pdf.line(20, 45, pageWidth - 20, 45)

      // Estadísticas generales
      pdf.setFontSize(16)
      pdf.text('Resumen Ejecutivo', 20, 60)
      
      pdf.setFontSize(12)
      pdf.text(`Total de Ingresos: $${totalStats.totalIngresos.toLocaleString()}`, 20, 75)
      pdf.text(`Total de Transacciones: ${totalStats.totalTransacciones}`, 20, 85)
      pdf.text(`Promedio Semanal: $${totalStats.promedioSemanal.toFixed(2)}`, 20, 95)
      pdf.text(`Ingresos del Mes: $${totalStats.ingresosMes.toLocaleString()}`, 20, 105)

      // Tabla manual de datos por parqueadero
      let yPosition = 130
      
      // Encabezados de tabla
      pdf.setFontSize(14)
      pdf.text('Datos por Parqueadero', 20, yPosition)
      yPosition += 15
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      
      // Encabezados
      pdf.text('Parqueadero', 20, yPosition)
      pdf.text('Ingresos', 80, yPosition)
      pdf.text('Transacciones', 120, yPosition)
      pdf.text('Promedio Diario', 160, yPosition)
      
      // Línea bajo encabezados
      pdf.setLineWidth(0.3)
      pdf.line(20, yPosition + 2, pageWidth - 20, yPosition + 2)
      
      yPosition += 10
      pdf.setFont('helvetica', 'normal')

      if (parkingStats.length > 0) {
        parkingStats.forEach((parking, index) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage()
            yPosition = 30
          }
          
          pdf.text(parking.nombre.substring(0, 25), 20, yPosition)
          pdf.text(`$${parking.total_ingresos.toLocaleString()}`, 80, yPosition)
          pdf.text(parking.total_transacciones.toString(), 120, yPosition)
          pdf.text(`$${parking.promedio_diario.toFixed(2)}`, 160, yPosition)
          
          yPosition += 10
        })
        
        // Línea de totales
        pdf.setLineWidth(0.3)
        pdf.line(20, yPosition, pageWidth - 20, yPosition)
        yPosition += 10
        
        pdf.setFont('helvetica', 'bold')
        pdf.text('TOTAL', 20, yPosition)
        pdf.text(`$${totalStats.totalIngresos.toLocaleString()}`, 80, yPosition)
        pdf.text(totalStats.totalTransacciones.toString(), 120, yPosition)
        pdf.text(`$${totalStats.promedioSemanal.toFixed(2)}`, 160, yPosition)
      } else {
        pdf.setFont('helvetica', 'italic')
        pdf.text('No hay datos disponibles para el período seleccionado', 20, yPosition)
      }

      // Usar autoTable si está disponible, sino usar tabla manual
      try {
        const tableData = parkingStats.length > 0 
          ? parkingStats.map(parking => [
              parking.nombre,
              `$${parking.total_ingresos.toLocaleString()}`,
              parking.total_transacciones.toString(),
              `$${parking.promedio_diario.toFixed(2)}`
            ])
          : [['Sin datos disponibles', '-', '-', '-']]

        autoTable(pdf, {
          head: [['Parqueadero', 'Ingresos Totales', 'Transacciones', 'Promedio Diario']],
          body: tableData,
          startY: 200,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] }
        })
      } catch (autoTableError) {
        console.log('AutoTable no disponible, usando tabla manual')
      }

      // Capturar gráfico si existe
      if (chartRef.current && parkingStats.length > 0) {
        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2
          })
          const imgData = canvas.toDataURL('image/png')
          
          pdf.addPage()
          pdf.setFontSize(16)
          pdf.text('Gráficos de Rendimiento', 20, 20)
          
          const imgWidth = pageWidth - 40
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          
          pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight)
        } catch (error) {
          console.error('Error capturing chart:', error)
        }
      }

      // Pie de página
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 10)
        pdf.text('Sistema de Gestión de Parqueaderos', 20, pageHeight - 10)
      }

      pdf.save(`reporte-ingresos-${dateRange.inicio}-${dateRange.fin}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF. Por favor, intenta nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = () => {
    try {
      setExporting(true)

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new()

      // Hoja 1: Resumen ejecutivo
      const summaryData = [
        ['REPORTE DE INGRESOS'],
        [''],
        ['Período:', `${dateRange.inicio} - ${dateRange.fin}`],
        ['Generado:', new Date().toLocaleString('es-ES')],
        [''],
        ['RESUMEN EJECUTIVO'],
        ['Total de Ingresos:', `$${totalStats.totalIngresos.toLocaleString()}`],
        ['Total de Transacciones:', totalStats.totalTransacciones],
        ['Promedio Semanal:', `$${totalStats.promedioSemanal.toFixed(2)}`],
        ['Ingresos del Mes:', `$${totalStats.ingresosMes.toLocaleString()}`]
      ]
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

      // Hoja 2: Datos por parqueadero
      const parkingData = parkingStats.length > 0
        ? [
            ['Parqueadero', 'Ingresos Totales', 'Transacciones', 'Promedio Diario'],
            ...parkingStats.map(parking => [
              parking.nombre,
              parking.total_ingresos,
              parking.total_transacciones,
              parking.promedio_diario
            ])
          ]
        : [
            ['Parqueadero', 'Ingresos Totales', 'Transacciones', 'Promedio Diario'],
            ['Sin datos disponibles', 0, 0, 0]
          ]
      
      const parkingSheet = XLSX.utils.aoa_to_sheet(parkingData)
      XLSX.utils.book_append_sheet(workbook, parkingSheet, 'Por Parqueadero')

      // Hoja 3: Datos diarios
      const dailyData = incomeData.length > 0
        ? [
            ['Fecha', 'Ingresos', 'Transacciones', 'Parqueadero'],
            ...incomeData.map(day => [
              day.fecha,
              day.ingresos,
              day.transacciones,
              day.parqueadero
            ])
          ]
        : [
            ['Fecha', 'Ingresos', 'Transacciones', 'Parqueadero'],
            ['Sin datos', 0, 0, 'N/A']
          ]
      
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData)
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Datos Diarios')

      // Hoja 4: Datos mensuales
      const monthlyExcelData = monthlyData.length > 0
        ? [
            ['Mes', 'Ingresos', 'Transacciones'],
            ...monthlyData.map(month => [
              month.mes,
              month.ingresos,
              month.transacciones
            ])
          ]
        : [
            ['Mes', 'Ingresos', 'Transacciones'],
            ['Sin datos', 0, 0]
          ]
      
      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyExcelData)
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Datos Mensuales')

      // Guardar archivo
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(data, `reporte-ingresos-${dateRange.inicio}-${dateRange.fin}.xlsx`)

    } catch (error) {
      console.error('Error generating Excel:', error)
      alert('Error al generar el archivo Excel. Por favor, intenta nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  const printReport = () => {
    if (reportRef.current) {
      const printContent = reportRef.current
      const originalContents = document.body.innerHTML
      
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload()
    }
  }

  const handleFilterChange = () => {
    loadIncomeData()
  }

  useEffect(() => {
    loadIncomeData()
  }, [selectedParking, dateRange])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de ingresos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Ingresos
        </h1>
        <p className="text-gray-600">
          Analiza y exporta reportes de ingresos de tus parqueaderos
        </p>
      </div>

      {/* Filtros y Controles */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtros y Exportación</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={dateRange.inicio}
                onChange={(e) => setDateRange(prev => ({ ...prev, inicio: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={dateRange.fin}
                onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="parqueadero">Parqueadero</Label>
              <Select value={selectedParking} onValueChange={setSelectedParking}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar parqueadero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los parqueaderos</SelectItem>
                  {parkingOptions.map(parking => (
                    <SelectItem key={parking.id} value={parking.id.toString()}>
                      {parking.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleFilterChange}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Vista Previa del Reporte</DialogTitle>
                </DialogHeader>
                <div className="bg-white p-6 border rounded">
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">Reporte de Ingresos</h1>
                    <p className="text-gray-600">Período: {dateRange.inicio} - {dateRange.fin}</p>
                    <p className="text-gray-500 text-sm">Generado: {new Date().toLocaleString('es-ES')}</p>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">Resumen Ejecutivo</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <p><strong>Total de Ingresos:</strong> ${totalStats.totalIngresos.toLocaleString()}</p>
                      <p><strong>Total de Transacciones:</strong> {totalStats.totalTransacciones}</p>
                      <p><strong>Promedio Semanal:</strong> ${totalStats.promedioSemanal.toFixed(2)}</p>
                      <p><strong>Ingresos del Mes:</strong> ${totalStats.ingresosMes.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">Datos por Parqueadero</h2>
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="border px-4 py-2 text-left">Parqueadero</th>
                          <th className="border px-4 py-2 text-right">Ingresos</th>
                          <th className="border px-4 py-2 text-right">Transacciones</th>
                          <th className="border px-4 py-2 text-right">Promedio Diario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parkingStats.length > 0 ? parkingStats.map((parking, index) => (
                          <tr key={index}>
                            <td className="border px-4 py-2">{parking.nombre}</td>
                            <td className="border px-4 py-2 text-right">${parking.total_ingresos.toLocaleString()}</td>
                            <td className="border px-4 py-2 text-right">{parking.total_transacciones}</td>
                            <td className="border px-4 py-2 text-right">${parking.promedio_diario.toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="border px-4 py-2 text-center text-gray-500">
                              No hay datos disponibles
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-center space-x-4 mt-6">
                    <Button onClick={exportToPDF} disabled={exporting}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar PDF
                    </Button>
                    <Button onClick={printReport} variant="outline">
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={exportToPDF}
              disabled={exporting}
              className="bg-red-600 hover:bg-red-700"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>

            <Button 
              onClick={exportToExcel}
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Exportar Excel
            </Button>

            <Button 
              onClick={printReport}
              variant="outline"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas Generales */}
      <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalStats.totalIngresos.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Transacciones</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalStats.totalTransacciones}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Promedio Semanal</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${totalStats.promedioSemanal.toFixed(0)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Este Mes</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${totalStats.ingresosMes.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido de Gráficos y Reportes */}
      <div ref={reportRef}>
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Ingresos Diarios</TabsTrigger>
            <TabsTrigger value="parking">Por Parqueadero</TabsTrigger>
            <TabsTrigger value="monthly">Tendencias Mensuales</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          {/* Tab: Ingresos Diarios */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos Diarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={chartRef} className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'ingresos' ? `$${value}` : value,
                          name === 'ingresos' ? 'Ingresos' : 'Transacciones'
                        ]}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
                      <Bar dataKey="transacciones" fill="#3b82f6" name="Transacciones" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Por Parqueadero */}
          <TabsContent value="parking">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Ingresos por Parqueadero</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={parkingStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ nombre, percent }: any) => `${nombre} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total_ingresos"
                        >
                          {parkingStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, 'Ingresos']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento por Parqueadero</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={parkingStats} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip formatter={(value) => [`$${value}`, 'Ingresos Totales']} />
                        <Bar dataKey="total_ingresos" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Tendencias Mensuales */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Tendencias Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'ingresos' ? `$${value}` : value,
                          name === 'ingresos' ? 'Ingresos' : 'Transacciones'
                        ]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="ingresos" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name="Ingresos ($)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="transacciones" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Transacciones"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Detalles */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Tabla Detallada de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Parqueadero</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Ingresos Totales</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Transacciones</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Promedio Diario</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Promedio por Transacción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parkingStats.map((parking, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 font-medium">
                            {parking.nombre}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-green-600 font-semibold">
                            ${parking.total_ingresos.toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {parking.total_transacciones}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            ${parking.promedio_diario.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            ${parking.total_transacciones > 0 
                              ? (parking.total_ingresos / parking.total_transacciones).toFixed(2)
                              : '0.00'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">TOTAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-700">
                          ${totalStats.totalIngresos.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {totalStats.totalTransacciones}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ${totalStats.promedioSemanal.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ${totalStats.totalTransacciones > 0 
                            ? (totalStats.totalIngresos / totalStats.totalTransacciones).toFixed(2)
                            : '0.00'
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Información de ayuda */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Información sobre reportes de ingresos
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Los datos se actualizan en tiempo real desde las transacciones confirmadas</li>
                <li>• El PDF incluye gráficos y tablas para presentaciones</li>
                <li>• El Excel contiene hojas separadas para análisis detallado</li>
                <li>• Puedes filtrar por fecha y parqueadero específico</li>
                <li>• La función de imprimir genera una vista optimizada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
