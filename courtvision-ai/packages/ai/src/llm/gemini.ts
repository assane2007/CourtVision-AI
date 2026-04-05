/**
 * Google Gemini integration via REST API.
 *
 * Primary cloud provider for CourtVision chat/report generation.
 * Designed for broad public usage with free-tier friendly latency/quality.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export async function generateReportGemini(data: {
    systemPrompt?: string
    userPrompt?: string
    payload?: object
    responseFormat?: 'json' | 'text'
}): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured')
    }

    const systemContent = data.systemPrompt
        ?? 'Tu es un coach basket professionnel niveau NBA. Analyse les donnees et genere un rapport detaille en francais.'

    let userContent = data.userPrompt || ''
    if (data.payload) {
        userContent += `\n\nData Context: ${JSON.stringify(data.payload)}`
    }

    if (!userContent.trim()) {
        userContent = 'Analyse les donnees disponibles et propose un plan concret.'
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

    const body: Record<string, any> = {
        systemInstruction: {
            parts: [{ text: systemContent }],
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: userContent }],
            },
        ],
        generationConfig: {
            temperature: 0.6,
            topP: 0.9,
            maxOutputTokens: 2048,
        },
    }

    if (data.responseFormat === 'json') {
        body.generationConfig.responseMimeType = 'application/json'
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errText}`)
    }

    const result = await response.json() as any
    const content = (result?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => part?.text || '')
        .join('')
        .trim()

    if (!content) {
        throw new Error('Gemini returned empty response')
    }

    return content
}
