import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { Upload, FileVideo, AlertCircle, CheckCircle2, Loader2, Image, Clock, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface JobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: string
  error?: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ForensicResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [jobId, setJobId] = useState<string | null>(null)
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
  }, [])

  const finishProgress = useCallback(() => {
    stopPolling()
    setProgress(100)
    if (progressHideTimeout.current) clearTimeout(progressHideTimeout.current)
    progressHideTimeout.current = setTimeout(() => {
      setShowProgress(false)
      setProgress(0)
      setStatusMessage('')
    }, 800)
  }, [stopPolling])

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      // Check status
      const statusResponse = await axios.get<JobStatus>(`/api/jobs/${id}/status`)
      const status = statusResponse.data
      
      setStatusMessage(status.progress || 'Processando...')
      
      // Update progress based on status
      if (status.status === 'pending') {
        setProgress(prev => Math.max(prev, 35))
      } else if (status.status === 'processing') {
        setProgress(prev => Math.min(prev + 2, 85))
      }
      
      // If completed, fetch result
      if (status.status === 'completed') {
        stopPolling()
        setStatusMessage('Carregando resultado...')
        setProgress(95)
        
        const resultResponse = await axios.get(`/api/jobs/${id}`)
        const data = resultResponse.data
        
        if (data.result) {
          setResult(data.result)
        } else {
          setError('Resultado vazio retornado pela API.')
        }
        
        setLoading(false)
        finishProgress()
      }
      
      // If failed, show error
      if (status.status === 'failed') {
        stopPolling()
        setError(status.error || 'Erro desconhecido durante o processamento.')
        setLoading(false)
        finishProgress()
      }
      
    } catch (err) {
      console.error('Polling error:', err)
      // Don't stop polling on network errors, might be temporary
    }
  }, [stopPolling, finishProgress])

  useEffect(() => {
    return () => {
      stopPolling()
      if (progressHideTimeout.current) clearTimeout(progressHideTimeout.current)
    }
  }, [stopPolling])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setProgress(0)
    setShowProgress(true)
    setLoading(true)
    setError(null)
    setResult(null)
    setJobId(null)
    setStatusMessage('Enviando vídeo...')

    const formData = new FormData()
    formData.append('file', file)
    
    try {
      // Step 1: Upload file and get job_id
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for upload only
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(Math.min(percentCompleted * 0.3, 30))
            setStatusMessage(`Enviando vídeo... ${percentCompleted}%`)
          }
        },
      })
      
      const { job_id } = response.data
      setJobId(job_id)
      setProgress(35)
      setStatusMessage('Análise iniciada, aguardando processamento...')
      
      // Step 2: Start polling for status
      pollingInterval.current = setInterval(() => {
        pollJobStatus(job_id)
      }, 3000) // Poll every 3 seconds
      
      // Initial poll
      pollJobStatus(job_id)
      
    } catch (err: unknown) {
      console.error(err)
      const axiosError = err as { response?: { data?: { detail?: string } }; code?: string; message?: string }
      
      let errorMessage = 'Erro ao enviar o vídeo.'
      
      if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'Tempo limite excedido no upload. Tente um vídeo menor.'
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando.'
      } else if (axiosError.response?.data?.detail) {
        errorMessage = axiosError.response.data.detail
      } else if (axiosError.message) {
        errorMessage = axiosError.message
      }
      
      setError(errorMessage)
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
                  <span>{statusMessage || 'Processando...'}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {jobId && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs font-mono">
                      Job ID: {jobId}
                    </Badge>
                  </div>
                )}
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
