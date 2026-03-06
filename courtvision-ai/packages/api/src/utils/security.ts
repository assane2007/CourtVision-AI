import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Field-Level Encryption utility for sensitive biometric data.
 * Ensures data is unreadable even if the database is compromised.
 */
export class SecurityUtils {
    private static getKey(): Buffer {
        const secret = process.env.ENCRYPTION_KEY
        if (!secret) {
            throw new Error('ENCRYPTION_KEY environment variable is required for biometric data protection')
        }
        return crypto.createHash('sha256').update(secret).digest()
    }

    /**
     * Encrypts a string or number using AES-256-GCM.
     */
    static encrypt(data: string | number): string {
        const key = this.getKey()
        const iv = crypto.randomBytes(IV_LENGTH)
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

        let encrypted = cipher.update(data.toString(), 'utf8', 'hex')
        encrypted += cipher.final('hex')

        const authTag = cipher.getAuthTag().toString('hex')

        // Return format: iv:authTag:encryptedData
        return `${iv.toString('hex')}:${authTag}:${encrypted}`
    }

    /**
     * Decrypts an AES-256-GCM encrypted string.
     */
    static decrypt(encryptedData: string): string {
        const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':')
        if (!ivHex || !authTagHex || !encryptedHex) {
            throw new Error('Invalid encrypted data format')
        }

        const key = this.getKey()
        const iv = Buffer.from(ivHex, 'hex')
        const authTag = Buffer.from(authTagHex, 'hex')
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    }
}
