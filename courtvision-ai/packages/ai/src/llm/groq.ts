import Groq from 'groq-sdk'

const groqApiKey = process.env.GROQ_API_KEY || ''
const groq = new Groq({ apiKey: groqApiKey })

/**
 * Génère un rapport de coaching basket via Groq (Llama 3.3 70B).
 * Ultra rapide (~0.5s de latence) et gratuit (14 400 requêtes/jour).
 *
 * @param data - Objet contenant systemPrompt, userPrompt, et le payload de données.
 */
export async function generateReportGroq(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
}): Promise<string> {
    if (!groqApiKey) {
        throw new Error('GROQ_API_KEY is not configured')
    }

    const systemContent = data.systemPrompt
        ?? 'Tu es un coach basket professionnel niveau NBA. Analyse les données et génère un rapport détaillé en français.'

    const userContent = data.userPrompt
        ?? `Analyse ces données et génère un rapport de coaching complet :\n${JSON.stringify(data.payload ?? data, null, 2)}`

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userContent }
        ],
        max_tokens: 2000,
        temperature: 0.7, // Un peu de créativité pour le style coach
        top_p: 0.9
    })

    const content = completion.choices[0]?.message?.content
    if (!content || content.trim().length === 0) {
        throw new Error('Groq returned empty response')
    }

    return content
}
