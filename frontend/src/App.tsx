import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Upload, FileVideo, AlertCircle, CheckCircle2, Loader2, Image, Clock, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// cn utility available if needed
// import { cn } from '@/lib/utils'

interface ForensicResult {
  resultado_analise: string
  objeto: string
  observacao_objeto: string
  observacao_narrada: string
  tempo_inicio: string
  tempo_fim: string
  melhor_frame: string
  imagem?: string
  caracteristicas: Array<{
    objeto: string
    observacao_objeto: string
    observacao_narrada: string
    tempo_inicio: string
    tempo_fim: string
    melhor_frame: string
    imagem?: string
  }>
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ForensicResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startProgress = () => {
    setProgress(0)
    setShowProgress(true)
    if (progressInterval.current) clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return Math.min(prev + Math.random() * 8, 90)
      })
    }, 500)
  }

  const finishProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    setProgress(100)
    if (progressHideTimeout.current) clearTimeout(progressHideTimeout.current)
    progressHideTimeout.current = setTimeout(() => {
      setShowProgress(false)
      setProgress(0)
    }, 800)
  }

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
      if (progressHideTimeout.current) clearTimeout(progressHideTimeout.current)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    startProgress()
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    
    // Use environment variable or fallback to relative path
    // Production: /api (proxied by nginx to api:5000)
    // Development: http://localhost:5000 (direct connection)
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    
    try {
      const response = await axios.post(`${apiUrl}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes timeout for large videos
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(Math.min(percentCompleted * 0.3, 30)) // First 30% is upload
          }
        },
      })
      setResult(response.data)
    } catch (err: unknown) {
      console.error(err)
      const axiosError = err as { response?: { data?: { detail?: string } }; code?: string; message?: string }
      
      let errorMessage = 'Erro ao processar o vídeo.'
      
      if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'Tempo limite excedido. O vídeo pode ser muito grande.'
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando.'
      } else if (axiosError.response?.data?.detail) {
        errorMessage = axiosError.response.data.detail
      } else if (axiosError.message) {
        errorMessage = axiosError.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      finishProgress()
    }
  }

  const getResultBadgeVariant = (resultado: string) => {
    const lower = resultado.toLowerCase()
    if (lower.includes('positivo')) return 'destructive'
    if (lower.includes('negativo')) return 'success'
    return 'secondary'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-100 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <header className="text-center space-y-4 py-6">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <FileVideo className="h-10 w-10 text-slate-700" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Análise Forense Digital
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Plataforma de IA para extração de evidências e auditoria de procedimentos laboratoriais em vídeo.
          </p>
        </header>

        {/* Upload Card */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="text-center pb-6 border-b border-slate-100">
            <CardTitle className="text-xl font-semibold text-slate-800">Novo Processamento</CardTitle>
            <CardDescription className="text-slate-400">
              Carregue o arquivo de vídeo (.mp4, .mov) para análise automatizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-6 md:px-12 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
              <div className="w-full max-w-md">
                <Input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 h-12 border-slate-200"
                />
              </div>
              <Button 
                onClick={handleAnalyze} 
                disabled={!file || loading} 
                size="lg"
                className="w-full md:w-auto px-8 h-12 font-medium bg-slate-900 hover:bg-slate-800 text-white"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {loading ? 'Processando...' : 'Iniciar Análise'}
              </Button>
            </div>

            {/* Progress Bar */}
            {showProgress && (
              <div className="w-full max-w-lg mx-auto space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Analisando vídeo...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-center justify-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Relatório de Análise</h2>
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Concluído
              </Badge>
            </div>
             
            {result.map((item, index) => (
              <Card key={index} className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        {item.objeto}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Resultado:</span>
                        <Badge variant={getResultBadgeVariant(item.resultado_analise)}>
                          {item.resultado_analise.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.tempo_inicio} - {item.tempo_fim}
                    </Badge>
                  </div>
                </CardHeader>
                 
                <CardContent className="p-6">
                  <Tabs defaultValue="detalhes" className="w-full">
                    <TabsList className="mb-6">
                      <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                      <TabsTrigger value="evidencias">
                        Evidências ({item.caracteristicas.length})
                      </TabsTrigger>
                      {item.imagem && <TabsTrigger value="frame">Melhor Frame</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="detalhes" className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Image className="h-4 w-4 text-slate-400" />
                            <h4 className="font-medium text-sm text-slate-600">Análise Visual</h4>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{item.observacao_objeto}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Mic className="h-4 w-4 text-slate-400" />
                            <h4 className="font-medium text-sm text-slate-600">Transcrição de Áudio</h4>
                          </div>
                          <p className="italic text-slate-600 text-sm leading-relaxed">"{item.observacao_narrada}"</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="evidencias" className="space-y-4">
                      {item.caracteristicas.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {item.caracteristicas.map((evidence, idx) => (
                            <div 
                              key={idx} 
                              className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-slate-800 text-sm">{evidence.objeto}</h4>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {evidence.tempo_inicio}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 mb-2">{evidence.observacao_objeto}</p>
                              {evidence.observacao_narrada && (
                                <p className="text-xs border-l-2 border-slate-200 pl-2 italic text-slate-400">
                                  "{evidence.observacao_narrada}"
                                </p>
                              )}
                              {evidence.imagem && (
                                <div className="mt-3 rounded-md overflow-hidden border border-slate-100">
                                  <img 
                                    src={`data:image/jpeg;base64,${evidence.imagem}`} 
                                    alt={evidence.objeto}
                                    className="w-full h-32 object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-8">
                          Nenhuma evidência física detectada.
                        </p>
                      )}
                    </TabsContent>

                    {item.imagem && (
                      <TabsContent value="frame">
                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img 
                            src={`data:image/jpeg;base64,${item.imagem}`} 
                            alt="Melhor frame do resultado"
                            className="w-full max-h-96 object-contain"
                          />
                          <div className="p-3 border-t border-slate-100 text-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.melhor_frame}
                            </Badge>
                          </div>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
