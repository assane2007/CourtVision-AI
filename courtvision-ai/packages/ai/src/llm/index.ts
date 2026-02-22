import { generateReportGroq } from './groq'
import { generateReportLocal } from './ollama'

export async function generateReport(data: object): Promise<string> {
    try {
        // Essaie d'utiliser l'API Groq LLama-3.3 ultra-rapide
        return await generateReportGroq(data)
    } catch (err: any) {
        console.warn('Groq failed, fallback to Ollama local', err.message)
        // Fallback vers le LLM Ollama tournant en local 
        // Garanti 100% hors ligne et gratuit pour la fiabilité en prod/dev
        return await generateReportLocal(data)
    }
}
