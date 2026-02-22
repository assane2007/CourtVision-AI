export async function generateReportLocal(analysisData: object): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = process.env.OLLAMA_MODEL || 'llama3.2'

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: `Coach basket:\nTu es un coach NBA. Fais un rapport sur ces donnees en 500 mots, clair, professionnel: ${JSON.stringify(analysisData)}`,
            stream: false
        })
    })

    if (!response.ok) {
        throw new Error(`Ollama response error : ${response.status}`)
    }

    const data = await response.json()
    return data.response
}
