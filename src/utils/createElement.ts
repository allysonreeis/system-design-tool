import type { DiagramNode, TextElement, NodeType, DiagramGroup } from '@/types/diagram'

// ── Default sizes per node type ────────────────────────────────────────────

const NODE_SIZES: Record<NodeType, { width: number; height: number }> = {
    rectangle: { width: 160, height: 60 },
    'rounded-rectangle': { width: 160, height: 60 },
    circle: { width: 80, height: 80 },
    database: { width: 100, height: 120 },
    diamond: { width: 120, height: 80 },
    queue: { width: 160, height: 60 },
    client: { width: 80, height: 80 },
    cache: { width: 100, height: 120 },
}

const NODE_LABELS: Record<NodeType, string> = {
    rectangle: 'Service',
    'rounded-rectangle': 'API',
    circle: 'Event',
    database: 'Database',
    diamond: 'Decision',
    queue: 'Queue',
    client: 'Client',
    cache: 'Cache',
}

// ── Placement — staggered so consecutive elements don't stack exactly ──────

function nextPosition(count: number): { x: number; y: number } {
    const offset = (count % 8) * 32
    return { x: 120 + offset, y: 120 + offset }
}

// ── Factories ──────────────────────────────────────────────────────────────

export function createDefaultNode(
    type: NodeType,
    existingCount: number,
    labelOverride?: string,
): DiagramNode {
    const { width, height } = NODE_SIZES[type]
    const { x, y } = nextPosition(existingCount)
    return {
        id: crypto.randomUUID(),
        type,
        x,
        y,
        width,
        height,
        label: labelOverride ?? NODE_LABELS[type],
    }
}

export function createDefaultText(existingCount: number): TextElement {
    const { x, y } = nextPosition(existingCount)
    return {
        id: crypto.randomUUID(),
        x,
        y: y + 20,
        content: 'Text',
    }
}

export function createDefaultGroup(existingCount: number): DiagramGroup {
    const { x, y } = nextPosition(existingCount)
    return {
        id: crypto.randomUUID(),
        x,
        y,
        width: 320,
        height: 200,
        title: 'Group',
    }
}
