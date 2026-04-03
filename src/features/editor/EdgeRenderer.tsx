import React from 'react'
import type { DiagramEdge, DiagramNode, EdgeRouting } from '@/types/diagram'

/**
 * Builds an SVG path through an ordered list of points with rounded corners (r=8 by default).
 * Each interior point (bend) is rounded using an SVG arc. Sweep direction is derived from
 * the cross product of the incoming and outgoing unit vectors so it is correct for all turn
 * directions in the SVG coordinate system (Y points down).
 */
export function buildWaypointPath(points: { x: number; y: number }[], r = 8): string {
    if (points.length < 2) return ''
    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
        const p = points[i]
        const q = points[i + 1]
        const next = points[i + 2]
        const dx = q.x - p.x
        const dy = q.y - p.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.01) continue
        const ux = dx / len
        const uy = dy / len
        if (next !== undefined) {
            const ndx = next.x - q.x
            const ndy = next.y - q.y
            const nlen = Math.sqrt(ndx * ndx + ndy * ndy)
            if (nlen < 0.01) { d += ` L ${q.x},${q.y}`; continue }
            const vx = ndx / nlen
            const vy = ndy / nlen
            const cr = Math.min(r, len / 2, nlen / 2)
            // cross product (incoming × outgoing): in SVG Y-down, positive → CW turn (sweep=1), negative → CCW (sweep=0)
            const cross = ux * vy - uy * vx
            if (Math.abs(cross) < 0.01 || cr < 0.5) { d += ` L ${q.x},${q.y}`; continue }
            const sweep = cross > 0 ? 1 : 0
            d += ` L ${q.x - ux * cr},${q.y - uy * cr}`
            d += ` a ${cr},${cr} 0 0,${sweep} ${cr * (ux + vx)},${cr * (uy + vy)}`
        } else {
            d += ` L ${q.x},${q.y}`
        }
    }
    return d
}

/** Builds an SVG path for a 3-segment orthogonal route with rounded corners (delegates to buildWaypointPath). */
export function buildOrthogonalRoundedPath(
    x1: number, y1: number, x2: number, y2: number, r = 8
): string {
    const dx = x2 - x1
    const dy = y2 - y1
    if (Math.abs(dx) >= Math.abs(dy)) {
        const midX = (x1 + x2) / 2
        return buildWaypointPath([{ x: x1, y: y1 }, { x: midX, y: y1 }, { x: midX, y: y2 }, { x: x2, y: y2 }], r)
    } else {
        const midY = (y1 + y2) / 2
        return buildWaypointPath([{ x: x1, y: y1 }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 }], r)
    }
}

/** Returns the point on the node's boundary in the direction of (toX, toY) from its center. */
export function getNodeEdgePoint(node: DiagramNode, toX: number, toY: number): { x: number; y: number } {
    const cx = node.x + node.width / 2
    const cy = node.y + node.height / 2
    const dx = toX - cx
    const dy = toY - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return { x: cx, y: cy }

    if (node.type === 'circle') {
        const r = Math.min(node.width, node.height) / 2
        return { x: cx + (dx / len) * r, y: cy + (dy / len) * r }
    }

    // Axis-aligned rectangle clip (rect, rounded-rect, database, etc.)
    const hw = node.width / 2
    const hh = node.height / 2
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    let scale: number
    if (absDx === 0) {
        scale = hh / absDy
    } else if (absDy === 0) {
        scale = hw / absDx
    } else {
        scale = Math.min(hw / absDx, hh / absDy)
    }
    return { x: cx + dx * scale, y: cy + dy * scale }
}

interface EdgeRendererProps {
    edge: DiagramEdge
    sourceNode: DiagramNode | undefined
    targetNode: DiagramNode | undefined
    isSelected: boolean
    onSelect: () => void
    defaultRouting?: EdgeRouting
}

const D_STROKE = '#5b6899'

const EdgeRenderer: React.FC<EdgeRendererProps> = ({
    edge,
    sourceNode,
    targetNode,
    isSelected,
    onSelect,
    defaultRouting,
}) => {
    if (!sourceNode || !targetNode) return null

    // Centers (direction only)
    const sx = sourceNode.x + sourceNode.width / 2
    const sy = sourceNode.y + sourceNode.height / 2
    const tx = targetNode.x + targetNode.width / 2
    const ty = targetNode.y + targetNode.height / 2

    // Boundary-clipped endpoints — arrowhead lands on the node edge, not inside it
    const p1 = getNodeEdgePoint(sourceNode, tx, ty)
    const p2 = getNodeEdgePoint(targetNode, sx, sy)
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y

    const stroke = isSelected ? '#6366f1' : (edge.style?.strokeColor ?? D_STROKE)
    const strokeWidth = edge.style?.strokeWidth ?? 1.5
    const lineStyle = edge.style?.lineStyle ?? 'solid'
    const arrowType = edge.style?.arrowType ?? 'arrow'

    // Build path data — waypoints take priority over routing style
    let pathD: string
    if (edge.waypoints && edge.waypoints.length > 0) {
        const firstWpt = edge.waypoints[0]
        const lastWpt = edge.waypoints[edge.waypoints.length - 1]
        const pSrc = getNodeEdgePoint(sourceNode, firstWpt.x, firstWpt.y)
        const pTarget = getNodeEdgePoint(targetNode, lastWpt.x, lastWpt.y)
        pathD = buildWaypointPath([pSrc, ...edge.waypoints, pTarget])
    } else {
        const routing = edge.style?.routing ?? defaultRouting ?? 'straight'
        const dx = x2 - x1
        const dy = y2 - y1
        if (routing === 'curved') {
            // Cubic bezier: control points offset horizontally from each endpoint
            const tension = Math.max(50, Math.abs(dx) * 0.45 + Math.abs(dy) * 0.1)
            const sign = dx >= 0 ? 1 : -1
            const cp1x = x1 + sign * tension
            const cp2x = x2 - sign * tension
            pathD = `M ${x1},${y1} C ${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}`
        } else if (routing === 'orthogonal') {
            pathD = buildOrthogonalRoundedPath(x1, y1, x2, y2)
        } else {
            // straight
            pathD = `M ${x1},${y1} L ${x2},${y2}`
        }
    }

    // Clear, readable dash patterns
    let strokeDasharray: string | undefined
    let strokeLinecap: 'round' | undefined
    if (lineStyle === 'dashed') {
        strokeDasharray = '12 6'
    } else if (lineStyle === 'dotted') {
        strokeDasharray = `${strokeWidth} 5`
        strokeLinecap = 'round'
    }

    const idEnd = `arrow-end-${edge.id}`
    const idStart = `arrow-start-${edge.id}`

    const hasEnd = arrowType === 'arrow' || arrowType === 'open-arrow' || arrowType === 'double'
    const hasStart = arrowType === 'double' || arrowType === 'diamond'

    function ArrowMarker({ id, flip }: { id: string; flip?: boolean }) {
        // Normal: tip at x=9, refX=9 → tip sits exactly at the line endpoint
        // Flipped (start): tip at x=0, refX=0 → tip sits at the line start
        const pts = flip ? '9 0, 0 3, 9 6' : '0 0, 9 3, 0 6'
        if (arrowType === 'open-arrow') {
            return (
                <marker id={id} markerWidth="10" markerHeight="7" refX={flip ? '0' : '9'} refY="3" orient="auto">
                    <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
                </marker>
            )
        }
        return (
            <marker id={id} markerWidth="10" markerHeight="7" refX={flip ? '0' : '9'} refY="3" orient="auto">
                <polygon points={pts} fill={stroke} />
            </marker>
        )
    }

    function DiamondMarker({ id }: { id: string }) {
        // Left tip at x=0 (refX=0) sits at the line start on the source boundary
        return (
            <marker id={id} markerWidth="12" markerHeight="7" refX="0" refY="3" orient="auto">
                <polygon points="0 3, 6 0, 12 3, 6 6" fill={stroke} />
            </marker>
        )
    }

    return (
        <g>
            <defs>
                {hasEnd && <ArrowMarker id={idEnd} />}
                {arrowType === 'double' && <ArrowMarker id={idStart} flip />}
                {arrowType === 'diamond' && <DiamondMarker id={idStart} />}
            </defs>

            {/* Wide transparent hit area */}
            <path
                d={pathD}
                stroke="transparent"
                strokeWidth={12}
                fill="none"
                style={{ cursor: 'pointer' }}
                onPointerDown={e => { e.stopPropagation(); onSelect() }}
            />

            {/* Visible line */}
            <path
                d={pathD}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeLinecap={strokeLinecap}
                fill="none"
                markerEnd={hasEnd ? `url(#${idEnd})` : undefined}
                markerStart={hasStart ? `url(#${idStart})` : undefined}
                style={{ pointerEvents: 'none' }}
            />
        </g>
    )
}

export default EdgeRenderer
