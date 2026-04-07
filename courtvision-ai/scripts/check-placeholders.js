const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const TARGET_DIRS = [
    path.join(ROOT, 'apps', 'mobile'),
    path.join(ROOT, 'apps', 'web', 'src'),
    path.join(ROOT, 'packages', 'api', 'src'),
    path.join(ROOT, 'packages', 'ai', 'src'),
    path.join(ROOT, 'packages', 'shared', 'src'),
]

const IGNORE_SEGMENTS = new Set([
    'node_modules',
    '.next',
    'dist',
    'build',
    '.expo',
    '.git',
])

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const BLOCKLIST = [/\bTODO\b/i, /\bFIXME\b/i, /\bWIP\b/i, /coming\s+soon/i]

function shouldSkip(filePath) {
    const segments = filePath.split(path.sep)
    return segments.some((segment) => IGNORE_SEGMENTS.has(segment))
}

function walk(dirPath, result = []) {
    if (!fs.existsSync(dirPath)) return result
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (shouldSkip(fullPath)) continue

        if (entry.isDirectory()) {
            walk(fullPath, result)
            continue
        }

        if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
            result.push(fullPath)
        }
    }

    return result
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split(/\r?\n/)
    const findings = []

    lines.forEach((line, index) => {
        if (BLOCKLIST.some((pattern) => pattern.test(line))) {
            findings.push({
                line: index + 1,
                text: line.trim(),
            })
        }
    })

    return findings
}

function main() {
    const files = TARGET_DIRS.flatMap((dirPath) => walk(dirPath))
    const allFindings = []

    files.forEach((filePath) => {
        const findings = scanFile(filePath)
        if (findings.length === 0) return

        findings.forEach((item) => {
            allFindings.push({
                filePath,
                line: item.line,
                text: item.text,
            })
        })
    })

    if (allFindings.length === 0) {
        console.log('Placeholder check passed: no TODO/FIXME/WIP/coming soon markers found in source.')
        process.exit(0)
    }

    console.error('Placeholder check failed. Please resolve these markers:')
    allFindings.forEach((item) => {
        const relative = path.relative(ROOT, item.filePath)
        console.error(`- ${relative}:${item.line} -> ${item.text}`)
    })
    process.exit(1)
}

main()
