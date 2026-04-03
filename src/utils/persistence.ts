import type { Diagram, Viewport } from '@/types/diagram'

export const STORAGE_KEY = 'dotjungle:diagram'

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveDiagram(diagram: Diagram): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram))
    } catch {
        // Storage quota exceeded or serialization error — fail silently
    }
}

// ── Load ──────────────────────────────────────────────────────────────────────

export function loadDiagram(): Diagram | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const data: unknown = JSON.parse(raw)
        if (!validateDiagram(data)) return null
        // Coerce missing groups field for diagrams saved before Phase 11
        if (!Array.isArray((data as { groups?: unknown }).groups)) {
            (data as unknown as { groups: unknown[] }).groups = []
        }
        return data as Diagram
    } catch {
        return null
    }
}

// ── Validation ────────────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isViewport(v: unknown): v is Viewport {
    if (!isObject(v)) return false
    return (
        typeof v.zoom === 'number' &&
        typeof v.offsetX === 'number' &&
        typeof v.offsetY === 'number'
    )
}

export function validateDiagram(data: unknown): data is Diagram {
    if (!isObject(data)) return false
    if (typeof data.id !== 'string') return false
    if (typeof data.name !== 'string') return false
    if (!Array.isArray(data.nodes)) return false
    if (!Array.isArray(data.edges)) return false
    if (!Array.isArray(data.texts)) return false
    if (!isViewport(data.viewport)) return false
    if (typeof data.defaultEdgeRouting !== 'string') return false
    return true
}
