// ── Primitives ────────────────────────────────────────────────────────────────

export type NodeType = 'rectangle' | 'rounded-rectangle' | 'circle' | 'database' | 'diamond' | 'queue' | 'client' | 'cache'

export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted'

export type ArrowType = 'none' | 'arrow' | 'open-arrow' | 'double' | 'diamond'

export type EdgeRouting = 'straight' | 'curved' | 'orthogonal'

export type SelectableElementType = 'node' | 'edge' | 'text' | 'group'

export type GroupBorderStyle = 'solid' | 'dashed' | 'dotted'

// ── Style ─────────────────────────────────────────────────────────────────────

export interface DiagramElementStyle {
    fillColor?: string
    strokeColor?: string
    strokeWidth?: number
    textColor?: string
    fontSize?: number
    /** Used by edges */
    lineStyle?: EdgeLineStyle
    /** Used by edges */
    arrowType?: ArrowType
    /** Used by edges */
    routing?: EdgeRouting
}

// ── Viewport ──────────────────────────────────────────────────────────────────

export interface Viewport {
    zoom: number
    offsetX: number
    offsetY: number
}

// ── Elements ──────────────────────────────────────────────────────────────────

export interface DiagramNode {
    id: string
    type: NodeType
    x: number
    y: number
    width: number
    height: number
    label: string
    style?: DiagramElementStyle
}

export interface DiagramEdge {
    id: string
    sourceId: string
    targetId: string
    label?: string
    style?: DiagramElementStyle
    waypoints?: { x: number; y: number }[]
}

export interface TextElement {
    id: string
    x: number
    y: number
    content: string
    style?: DiagramElementStyle
}

// ── Group ─────────────────────────────────────────────────────────────────────

export interface GroupStyle {
    fillColor?: string
    fillOpacity?: number
    strokeColor?: string
    strokeWidth?: number
    strokeBorderStyle?: GroupBorderStyle
    borderRadius?: number
    titleColor?: string
    titleFontSize?: number
}

export interface DiagramGroup {
    id: string
    x: number
    y: number
    width: number
    height: number
    title?: string
    style?: GroupStyle
}

// ── Diagram ───────────────────────────────────────────────────────────────────

export interface Diagram {
    id: string
    name: string
    nodes: DiagramNode[]
    edges: DiagramEdge[]
    texts: TextElement[]
    groups: DiagramGroup[]
    viewport: Viewport
    defaultEdgeRouting: EdgeRouting
    createdAt: string
    updatedAt: string
}
