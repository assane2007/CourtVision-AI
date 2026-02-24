/**
 * Fallback LLM 100% local via Ollama.
 * Fonctionne sans connexion internet — gratuit et privé.
 * Nécessite Ollama installé localement avec un modèle (ex: llama3.2).
 *
 * @param data - Objet contenant systemPrompt, userPrompt, et le payload de données.
 */
export async function generateReportLocal(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
}): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = process.env.OLLAMA_MODEL || 'llama3.2'

    const systemContent = data.systemPrompt
        ?? 'Tu es un coach basket professionnel. Analyse les données et génère un rapport détaillé en français.'

    const userContent = data.userPrompt
        ?? `Analyse ces données de match :\n${JSON.stringify(data.payload ?? data, null, 2)}`

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: userContent }
            ],
            stream: false,
            options: {
                temperature: 0.7,
                num_predict: 2000
            }
        })
    })

    if (!response.ok) {
        throw new Error(`Ollama response error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.message?.content ?? result.response ?? ''

    if (!content || content.trim().length === 0) {
        throw new Error('Ollama returned empty response')
    }

    return content
}
