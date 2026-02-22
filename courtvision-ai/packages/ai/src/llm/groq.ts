import Groq from 'groq-sdk'

// Utilise la globale Node pour eviter des erreurs au build (ou process.env.GROQ_API_KEY)
const groqApiKey = process.env.GROQ_API_KEY || ''
const groq = new Groq({ apiKey: groqApiKey })

export async function generateReportGroq(analysisData: object): Promise<string> {
    if (!groqApiKey) {
        throw new Error('GROQ_API_KEY is not configured')
    }

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: 'Tu es un coach basket professionnel niveau NBA.'
            },
            {
                role: 'user',
                content: `Analyse ces données et génère un rapport: ${JSON.stringify(analysisData)}`
            }
        ],
        max_tokens: 1000
    })

    return completion.choices[0]?.message?.content ?? ''
}
