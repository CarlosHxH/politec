import { useEffect, useRef, useState } from 'react'
import { Upload, FileVideo, AlertCircle, CheckCircle2, Loader2, Image, Clock, Mic, Shield, AlertTriangle } from 'lucide-react'
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

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Erro ao processar o vídeo')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: unknown) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar o vídeo. Verifique se o backend está rodando.'
      setError(errorMessage)
    } finally {
      setLoading(false)
      finishProgress()
    }
  }

  const getResultBadgeVariant = (resultado: string) => {
    const lower = resultado.toLowerCase()
    if (lower.includes('positivo')) return 'destructive'
    if (lower.includes('negativo')) return 'default'
    return 'secondary'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header Institucional */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-lg shadow-lg">
                <Shield className="h-8 w-8 text-blue-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">POLITEC</h1>
                <p className="text-blue-200 text-sm font-medium">Perícia Oficial e Identificação Técnica</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-lg">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-blue-100 text-sm font-medium">Sistema Ativo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Título da Seção */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-800">Análise Forense Digital</h2>
          </div>
          <p className="text-slate-600 ml-16">
            Sistema automatizado de extração de evidências e auditoria de procedimentos laboratoriais
          </p>
        </div>

        {/* Upload Card */}
        <Card className="border-2 border-blue-100 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b-2 border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileVideo className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Novo Processamento Pericial</CardTitle>
                <CardDescription className="text-slate-600 font-medium">
                  Submeta o arquivo de vídeo para análise técnica automatizada
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8 space-y-6">
            <div className="flex flex-col lg:flex-row items-stretch gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Arquivo de Vídeo (.mp4, .mov)
                </label>
                <Input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                  className="cursor-pointer file:mr-4 file:py-2.5 file:px-5 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 h-14 border-2 border-slate-200 hover:border-blue-300 transition-colors"
                />
                {file && (
                  <p className="mt-2 text-sm text-slate-600 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>
              <div className="lg:w-auto">
                <label className="block text-sm font-semibold text-transparent mb-2">
                  Ação
                </label>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!file || loading} 
                  size="lg"
                  className="w-full lg:w-auto px-10 h-14 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all disabled:bg-slate-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Iniciar Análise
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {showProgress && (
              <div className="w-full space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Processamento em andamento...
                  </span>
                  <span className="text-blue-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3 bg-blue-50" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Erro no Processamento</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-blue-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Laudo Pericial</h2>
                  <p className="text-sm text-slate-600">Análise concluída com sucesso</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300 px-4 py-2 text-sm font-bold">
                PROCESSADO
              </Badge>
            </div>
             
            {result.map((item, index) => (
              <Card key={index} className="border-2 border-blue-100 shadow-lg overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b-2 border-blue-100">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-800">
                        <div className="bg-blue-600 p-1.5 rounded">
                          <Image className="h-5 w-5 text-white" />
                        </div>
                        {item.objeto}
                      </CardTitle>
                      <div className="flex items-center gap-3 ml-10">
                        <span className="text-sm font-semibold text-slate-600">Resultado da Análise:</span>
                        <Badge 
                          variant={getResultBadgeVariant(item.resultado_analise)}
                          className={`font-bold text-sm px-3 py-1 ${
                            item.resultado_analise.toLowerCase().includes('positivo') 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {item.resultado_analise.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-sm font-semibold border-2 border-blue-200 px-4 py-2">
                      <Clock className="h-4 w-4 mr-2 text-blue-600" />
                      {item.tempo_inicio} - {item.tempo_fim}
                    </Badge>
                  </div>
                </CardHeader>
                 
                <CardContent className="p-6">
                  <Tabs defaultValue="detalhes" className="w-full">
                    <TabsList className="mb-6 bg-blue-50 p-1 border-2 border-blue-100">
                      <TabsTrigger value="detalhes" className="font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        Detalhes da Análise
                      </TabsTrigger>
                      <TabsTrigger value="evidencias" className="font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        Evidências Coletadas ({item.caracteristicas.length})
                      </TabsTrigger>
                      {item.imagem && (
                        <TabsTrigger value="frame" className="font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                          Frame de Referência
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="detalhes" className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-5 rounded-lg bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-blue-600 p-1.5 rounded">
                              <Image className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-700">ANÁLISE VISUAL</h4>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{item.observacao_objeto}</p>
                        </div>
                        <div className="p-5 rounded-lg bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-slate-600 p-1.5 rounded">
                              <Mic className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-700">TRANSCRIÇÃO DE ÁUDIO</h4>
                          </div>
                          <p className="italic text-slate-600 text-sm leading-relaxed">"{item.observacao_narrada}"</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="evidencias" className="space-y-4">
                      {item.caracteristicas.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {item.caracteristicas.map((evidence, idx) => (
                            <div 
                              key={idx} 
                              className="p-4 rounded-lg border-2 border-blue-100 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-800 text-sm flex-1">{evidence.objeto}</h4>
                                <Badge variant="outline" className="text-[10px] font-mono font-bold border-blue-200">
                                  {evidence.tempo_inicio}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-700 mb-2 leading-relaxed">{evidence.observacao_objeto}</p>
                              {evidence.observacao_narrada && (
                                <p className="text-xs border-l-4 border-blue-200 pl-3 italic text-slate-500 mb-3">
                                  "{evidence.observacao_narrada}"
                                </p>
                              )}
                              {evidence.imagem && (
                                <div className="mt-3 rounded-md overflow-hidden border-2 border-blue-100">
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
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-slate-200">
                          <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-600">
                            Nenhuma evidência física detectada nesta análise
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {item.imagem && (
                      <TabsContent value="frame">
                        <div className="rounded-lg overflow-hidden border-2 border-blue-200 bg-slate-50">
                          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3">
                            <p className="text-white font-bold text-sm text-center">Frame de Referência Principal</p>
                          </div>
                          <img 
                            src={`data:image/jpeg;base64,${item.imagem}`} 
                            alt="Melhor frame do resultado"
                            className="w-full max-h-[500px] object-contain bg-slate-900"
                          />
                          <div className="p-4 border-t-2 border-blue-100 text-center bg-white">
                            <Badge className="font-mono text-sm font-bold bg-blue-100 text-blue-800 border-blue-300 px-4 py-2">
                              <Clock className="h-4 w-4 mr-2" />
                              Timestamp: {item.melhor_frame}
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

      {/* Footer */}
      <div className="bg-slate-800 border-t-4 border-blue-600 mt-auto fixed bottom-0 w-full">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-slate-400 text-sm text-center">
            © 2024 POLITEC - Perícia Oficial e Identificação Técnica | Sistema de Análise Forense Digital
          </p>
        </div>
      </div>
    </div>
  )
}

export default App