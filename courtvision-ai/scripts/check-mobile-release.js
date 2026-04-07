const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const mobileRoot = path.join(repoRoot, 'apps', 'mobile')

const errors = []

function addError(message) {
    errors.push(message)
}

function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        addError(`Missing file: ${path.relative(repoRoot, filePath)}`)
        return null
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
        addError(`Invalid JSON: ${path.relative(repoRoot, filePath)} (${error.message})`)
        return null
    }
}

function toRepoRelative(filePath) {
    return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function validateDependency() {
    const mobilePackagePath = path.join(mobileRoot, 'package.json')
    const mobilePackage = readJson(mobilePackagePath)
    if (!mobilePackage) return

    const dependencyVersion = mobilePackage.dependencies?.['react-native-fast-tflite']
    if (!dependencyVersion) {
        addError('apps/mobile/package.json is missing dependency react-native-fast-tflite')
    }

    const lockfilePath = path.join(repoRoot, 'package-lock.json')
    if (!fs.existsSync(lockfilePath)) {
        addError('package-lock.json is missing at repository root')
        return
    }

    const lockContent = fs.readFileSync(lockfilePath, 'utf8')
    if (!lockContent.includes('"react-native-fast-tflite"')) {
        addError('package-lock.json does not contain react-native-fast-tflite; run npm install in courtvision-ai')
    }
}

function validateTfliteModelConfig() {
    const easPath = path.join(mobileRoot, 'eas.json')
    const eas = readJson(easPath)
    if (!eas) return

    const appConfigPath = path.join(mobileRoot, 'app.json')
    const appConfig = readJson(appConfigPath)
    const assetBundlePatterns = appConfig?.expo?.assetBundlePatterns ?? []
    const bundlesAllAssets = assetBundlePatterns.includes('**/*')

    const requiredProfiles = ['preview', 'production']

    for (const profile of requiredProfiles) {
        const rawSource = eas?.build?.[profile]?.env?.EXPO_PUBLIC_TFLITE_POSE_MODEL
        const source = typeof rawSource === 'string' ? rawSource.trim() : ''

        if (!source) {
            addError(`apps/mobile/eas.json build.${profile}.env.EXPO_PUBLIC_TFLITE_POSE_MODEL is required`)
            continue
        }

        if (source.startsWith('assets/')) {
            const modelPath = path.join(mobileRoot, source.replaceAll('/', path.sep))
            if (!fs.existsSync(modelPath)) {
                addError(`Configured model for ${profile} profile does not exist: ${toRepoRelative(modelPath)}`)
            }

            if (path.extname(source).toLowerCase() !== '.tflite') {
                addError(`Configured model for ${profile} must point to a .tflite file`)
            }

            if (!bundlesAllAssets) {
                const modelDirPattern = `${path.posix.dirname(source)}/**/*`
                if (!assetBundlePatterns.includes(modelDirPattern)) {
                    addError(
                        `app.json assetBundlePatterns must include '**/*' or '${modelDirPattern}' to bundle the ${profile} model`
                    )
                }
            }
        }
    }
}

function main() {
    validateDependency()
    validateTfliteModelConfig()

    if (errors.length > 0) {
        console.error('Mobile release checks failed:')
        for (const error of errors) {
            console.error(`- ${error}`)
        }
        process.exit(1)
    }

    console.log('Mobile release checks passed: TFLite dependency and model configuration are valid.')
}

main()
