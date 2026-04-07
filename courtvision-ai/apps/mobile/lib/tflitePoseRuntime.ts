import { Platform } from 'react-native'

export interface TFLitePoseRuntimeConfig {
    modelSource?: string | number
    delegate?: 'gpu' | 'core-ml' | 'nnapi' | 'cpu'
    numThreads?: number
    inputResolution?: { width: number; height: number }
}

export interface TFLitePoseLandmark {
    x: number
    y: number
    z: number
    visibility: number
}

export interface TFLitePoseInferenceResult {
    landmarks: TFLitePoseLandmark[]
    inferenceMs: number
}

export class TFLitePoseRuntime {
    private model: any = null
    private config: TFLitePoseRuntimeConfig
    private inferenceQueue: Promise<void> = Promise.resolve()

    constructor(config: TFLitePoseRuntimeConfig = {}) {
        this.config = {
            delegate: Platform.OS === 'ios' ? 'core-ml' : 'gpu',
            numThreads: 2,
            inputResolution: { width: 256, height: 256 },
            ...config,
        }
    }

    async initialize(): Promise<boolean> {
        const tflite = this.loadModule()
        const loadModel = tflite?.loadTensorFlowModel ?? tflite?.default?.loadTensorFlowModel

        if (typeof loadModel !== 'function') {
            return false
        }

        if (!this.config.modelSource) {
            return false
        }

        const preferredDelegate = this.mapDelegate(this.config.delegate ?? 'gpu')
        const numThreads = Math.max(1, this.config.numThreads ?? 2)

        try {
            this.model = await loadModel(this.config.modelSource, preferredDelegate, numThreads)
        } catch {
            if (preferredDelegate === 'default') {
                this.model = null
                return false
            }

            try {
                this.model = await loadModel(this.config.modelSource, 'default', numThreads)
            } catch {
                this.model = null
                return false
            }
        }

        return !!this.model
    }

    isReady(): boolean {
        return !!this.model
    }

    async infer(frameData: string | Uint8Array): Promise<TFLitePoseInferenceResult | null> {
        if (!this.model) return null
        return this.enqueueInference(() => this.inferInternal(frameData))
    }

    async dispose(): Promise<void> {
        try {
            if (this.model?.close) {
                await this.model.close()
            }
        } finally {
            this.model = null
            this.inferenceQueue = Promise.resolve()
        }
    }

    private enqueueInference<T>(task: () => Promise<T>): Promise<T> {
        const next = this.inferenceQueue.then(task, task)
        this.inferenceQueue = next.then(() => undefined, () => undefined)
        return next
    }

    private async inferInternal(frameData: string | Uint8Array): Promise<TFLitePoseInferenceResult | null> {
        const bytes = this.toBytes(frameData)
        if (!bytes) return null

        const input = this.toInputTensor(
            bytes,
            this.config.inputResolution?.width ?? 256,
            this.config.inputResolution?.height ?? 256,
        )

        const start = performance.now()

        const output = typeof this.model.run === 'function'
            ? await this.model.run(input)
            : typeof this.model.runSync === 'function'
                ? this.model.runSync(input)
                : null

        if (!output) return null

        const landmarks = this.decodeOutput(output)
        if (!landmarks || landmarks.length !== 33) return null

        return {
            landmarks,
            inferenceMs: Math.round((performance.now() - start) * 100) / 100,
        }
    }

    private loadModule(): any {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('react-native-fast-tflite')
        } catch {
            return null
        }
    }

    private mapDelegate(delegate: TFLitePoseRuntimeConfig['delegate']): string {
        switch (delegate) {
            case 'core-ml':
                return 'core-ml'
            case 'nnapi':
                return 'nnapi'
            case 'cpu':
                return 'default'
            case 'gpu':
            default:
                return 'gpu'
        }
    }

    private toBytes(frameData: string | Uint8Array): Uint8Array | null {
        if (frameData instanceof Uint8Array) return frameData

        if (typeof frameData !== 'string') return null
        if (frameData.startsWith('file://')) return null

        const base64 = frameData.includes(',')
            ? frameData.slice(frameData.indexOf(',') + 1)
            : frameData

        if (!base64) return null

        const atobFn = (globalThis as any).atob as ((value: string) => string) | undefined
        if (!atobFn) return null

        try {
            const binary = atobFn(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i)
            }
            return bytes
        } catch {
            return null
        }
    }

    private toInputTensor(source: Uint8Array, width: number, height: number): Float32Array {
        const expected = width * height * 3
        const tensor = new Float32Array(expected)

        if (source.length === 0) return tensor

        for (let i = 0; i < expected; i++) {
            const srcIndex = Math.min(source.length - 1, Math.floor((i * source.length) / expected))
            tensor[i] = source[srcIndex] / 255
        }

        return tensor
    }

    private decodeOutput(output: any): TFLitePoseLandmark[] | null {
        const values: number[] = []
        this.collectNumericValues(output, values)

        if (values.length < 33 * 3) return null

        const stride = values.length >= 33 * 5
            ? 5
            : values.length >= 33 * 4
                ? 4
                : 3

        const landmarks: TFLitePoseLandmark[] = []
        for (let i = 0; i < 33; i++) {
            const base = i * stride
            if (base + 2 >= values.length) return null

            landmarks.push({
                x: Math.min(1, Math.max(0, values[base])),
                y: Math.min(1, Math.max(0, values[base + 1])),
                z: values[base + 2] ?? 0,
                visibility: Math.min(1, Math.max(0, stride >= 4 ? values[base + 3] : 1)),
            })
        }

        return landmarks
    }

    private collectNumericValues(source: any, out: number[]): void {
        if (source == null) return

        if (typeof source === 'number') {
            if (Number.isFinite(source)) out.push(source)
            return
        }

        if (ArrayBuffer.isView(source)) {
            const view = source as unknown as { length?: number; byteLength?: number; [index: number]: number }
            const length = typeof view.length === 'number' ? view.length : (view.byteLength ?? 0)
            for (let i = 0; i < length; i++) {
                const value = view[i]
                if (Number.isFinite(value)) out.push(value)
            }
            return
        }

        if (Array.isArray(source)) {
            for (const item of source) {
                this.collectNumericValues(item, out)
            }
            return
        }

        if (typeof source === 'object') {
            for (const value of Object.values(source)) {
                this.collectNumericValues(value, out)
            }
        }
    }
}
