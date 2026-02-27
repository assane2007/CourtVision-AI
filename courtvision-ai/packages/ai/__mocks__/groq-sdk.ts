/**
 * Mock du module groq-sdk pour les tests.
 * Évite les problèmes de compatibilité du runtime groq-sdk avec Jest.
 */

class Groq {
    chat: any

    constructor(_config?: any) {
        this.chat = {
            completions: {
                create: async (_params: any) => ({
                    choices: [
                        {
                            message: {
                                content: 'Mock LLM response for testing',
                            },
                        },
                    ],
                }),
            },
        }
    }
}

export default Groq
