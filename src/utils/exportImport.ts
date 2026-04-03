import type { Diagram } from '@/types/diagram'
import { exportSvgString } from './exportSvg'
import { validateDiagram } from './persistence'

function sanitizeFilename(name: string): string {
    const sanitized = name
        .replace(/[^a-zA-Z0-9\-_.]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
    return sanitized || 'diagram'
}

function triggerDownload(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function exportSvg(diagram: Diagram, withBackground = true): void {
    const svgString = exportSvgString(diagram, withBackground)
    const suffix = withBackground ? '' : '-transparent'
    triggerDownload(`${sanitizeFilename(diagram.name)}${suffix}.svg`, svgString, 'image/svg+xml')
}

export function exportJson(diagram: Diagram): void {
    const json = JSON.stringify({ version: 1, ...diagram }, null, 2)
    triggerDownload(`${sanitizeFilename(diagram.name)}.json`, json, 'application/json')
}

export function importJson(): Promise<Diagram | null> {
    return new Promise(resolve => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'
        input.style.display = 'none'
        document.body.appendChild(input)

        let resolved = false

        function finish(result: Diagram | null) {
            if (resolved) return
            resolved = true
            if (document.body.contains(input)) document.body.removeChild(input)
            resolve(result)
        }

        function onWindowFocus() {
            window.removeEventListener('focus', onWindowFocus)
            setTimeout(() => finish(null), 300)
        }

        input.onchange = () => {
            window.removeEventListener('focus', onWindowFocus)
            const file = input.files?.[0]
            if (!file) { finish(null); return }

            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string)
                    finish(validateDiagram(data) ? data : null)
                } catch {
                    finish(null)
                }
            }
            reader.onerror = () => finish(null)
            reader.readAsText(file)
        }

        input.click()
        window.addEventListener('focus', onWindowFocus)
    })
}
