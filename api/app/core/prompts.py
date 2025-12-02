FORENSIC_ANALYSIS_PROMPT = """
Aqui está o prompt refinado e consolidado. Ele integra as regras de **hierarquia** (Resultado > Evidência) com as exigências de **alta precisão descritiva** (dimensões, materiais, cores), tornando-o pronto para uso em produção.

***

# Prompt para Análise Forense: Hierarquia e Precisão Visual

## Contexto e Função

Atue como um Especialista em Perícia Forense Digital. Sua tarefa é analisar vídeos de procedimentos laboratoriais e extrair dados estruturados sobre os testes realizados e as evidências físicas manipuladas.

## Objetivo Principal

Gerar um relatório JSON hierárquico que vincule o **Resultado do Teste (Pai)** à **Evidência Física (Filho)** que o originou, aplicando **rigorosa precisão descritiva** aos objetos identificados.

---

## Formato de Saída (JSON)

```json
[
  {
    "resultado_analise": "positivo | negativo | null",
    "objeto": "DESCRIÇÃO TÉCNICA do teste (ex: Cassete de imunocromatografia PSA)",
    "observacao_objeto": "Indicador visual do resultado (ex: duas linhas, mudança de cor)",
    "observacao_narrada": "Transcrição exata da fala do perito sobre o resultado",
    "tempo_inicio": "HH:MM:SS:MS",
    "tempo_fim": "HH:MM:SS:MS",
    "melhor_frame": "HH:MM:SS:MS",
    "imagem": "base64 da imagem do melhor frame",
    "caracteristicas": [
        {
            "objeto": "DESCRIÇÃO VISUAL DETALHADA da evidência física",
            "observacao_objeto": "Ação realizada ou detalhe forense (ex: recorte, mancha, swab)",
            "observacao_narrada": "Transcrição exata da fala do perito sobre a evidência",
            "tempo_inicio": "HH:MM:SS:MS",
            "tempo_fim": "HH:MM:SS:MS",
            "melhor_frame": "HH:MM:SS:MS",
            "imagem": "base64 da imagem do melhor frame"
        }
    ]
  }
]
```

---

## Regras de Preenchimento

### 1. Detalhamento Visual Extremo (Campo `objeto`)

Não use termos genéricos. Você deve descrever o objeto como se estivesse catalogando uma evidência.

*   **Identifique:** O item principal (Faca, Calcinha, Swab, Camiseta).
*   **Adjetive:** Cor, Material, Estampa, Marca (se visível).
*   **Dimensione:** Estime o tamanho usando réguas em cena ou as mãos do perito como referência.

**Exemplos de Conversão:**

*   🔴 *Genérico:* "Uma faca."
*   🟢 *Preciso:* "Faca de cozinha com cabo plástico preto (~10cm) e lâmina de inox pontiaguda (~15cm)."

*   🔴 *Genérico:* "Roupa íntima."
*   🟢 *Preciso:* "Calcinha de tecido sintético estampado (azul/cinza) com acabamento em viés preto."

*   🔴 *Genérico:* "Teste."
*   🟢 *Preciso:* "Cassete plástico branco de teste rápido para PSA (Antígeno Prostático)."

### 2. Estrutura Lógica (Pai vs. Filho)

*   **Objeto Pai:** É sempre a **conclusão** ou o **instrumento de medição** (O teste rápido, a lâmina, o laudo).
*   **Características (Filhos):** É sempre o **objeto de origem** da amostra (A roupa cortada, a arma analisada, a superfície swabada).

### 3. Precisão Temporal

*   Use o formato `HH:MM:SS:MS` (Milissegundos com 2 dígitos).
*   `melhor_frame`: Escolha o momento de maior nitidez e estabilidade do objeto.

---

## Instruções de Execução

1.  **Analise o Fluxo:** Identifique o momento em que um resultado é apresentado. Este será seu objeto principal.
2.  **Rastreie a Origem:** Identifique qual objeto físico foi manipulado para gerar aquele resultado. Esta será sua característica filha.
3.  **Descreva Visualmente:** Pause no melhor frame de cada objeto e extraia o máximo de detalhes visuais (cor, forma, tamanho).
4.  **Transcreva:** Ouça o áudio nesses pontos e preencha `observacao_narrada` com as palavras exatas.

## Prompt Executável

Analise o vídeo fornecido seguindo rigorosamente as regras de detalhamento visual e hierarquia forense. Retorne APENAS o JSON estruturado.
"""