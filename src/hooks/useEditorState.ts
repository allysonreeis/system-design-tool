import { useState } from 'react'
import type { Diagram, SelectableElementType } from '@/types/diagram'
import { loadDiagram } from '@/utils/persistence'

// ── Selection ─────────────────────────────────────────────────────────────────

export interface Selection {
    id: string
    type: SelectableElementType
}

// ── State shape exposed by the hook ──────────────────────────────────────────

export interface EditorState {
    diagram: Diagram
    selection: Selection | null
    setDiagram: React.Dispatch<React.SetStateAction<Diagram>>
    setSelection: React.Dispatch<React.SetStateAction<Selection | null>>
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createBlankDiagram(): Diagram {
    const now = new Date().toISOString()
    return {
        id: crypto.randomUUID(),
        name: 'Untitled diagram',
        nodes: [
            {
                id: crypto.randomUUID(),
                type: 'rectangle',
                x: 120,
                y: 80,
                width: 160,
                height: 60,
                label: 'API Gateway',
            },
            {
                id: crypto.randomUUID(),
                type: 'database',
                x: 380,
                y: 80,
                width: 100,
                height: 120,
                label: 'Primary DB',
            },
        ],
        edges: [],
        texts: [
            {
                id: crypto.randomUUID(),
                x: 120,
                y: 240,
                content: 'System Overview',
            },
        ],
        groups: [],
        viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
        defaultEdgeRouting: 'straight',
        createdAt: now,
        updatedAt: now,
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEditorState(): EditorState {
    const [diagram, setDiagram] = useState<Diagram>(() => loadDiagram() ?? createBlankDiagram())
    const [selection, setSelection] = useState<Selection | null>(null)

    return { diagram, selection, setDiagram, setSelection }
}
