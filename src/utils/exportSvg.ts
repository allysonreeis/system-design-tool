import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup } from '@/types/diagram'
import { getNodeEdgePoint, buildWaypointPath, buildOrthogonalRoundedPath } from '@/features/editor/EdgeRenderer'

const D_STROKE = '#5b6899'
const FILL_TOP_DB = '#253047'
const FONT_FAMILY = 'Inter, sans-serif'

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function colorId(hex: string): string {
    return hex.replace(/[^a-zA-Z0-9]/g, '')
}

// ── Deduplicated marker defs ───────────────────────────────────────────────────

interface MarkerSet {
    defsHtml: string
    markerRefs: Map<string, string>
}

function buildMarkerDefs(edges: DiagramEdge[]): MarkerSet {
    const markerRefs = new Map<string, string>()
    const markerDefs: string[] = []

    for (const edge of edges) {
        const stroke = edge.style?.strokeColor ?? D_STROKE
        const arrowType = edge.style?.arrowType ?? 'arrow'
        const cid = colorId(stroke)
        const s = escapeXml(stroke)

        const hasEnd = arrowType === 'arrow' || arrowType === 'open-arrow' || arrowType === 'double'
        const hasStart = arrowType === 'double' || arrowType === 'diamond'

        if (hasEnd) {
            if (arrowType === 'open-arrow') {
                const key = `end:open-arrow:${stroke}`
                if (!markerRefs.has(key)) {
                    const id = `m-open-arrow-end-${cid}`
                    markerRefs.set(key, id)
                    markerDefs.push(
                        `<marker id="${id}" markerWidth="10" markerHeight="7" refX="9" refY="3" orient="auto">` +
                        `<polyline points="0 0, 9 3, 0 6" fill="none" stroke="${s}" stroke-width="1.3" stroke-linejoin="round"/>` +
                        `</marker>`
                    )
                }
            } else {
                const key = `end:arrow:${stroke}`
                if (!markerRefs.has(key)) {
                    const id = `m-arrow-end-${cid}`
                    markerRefs.set(key, id)
                    markerDefs.push(
                        `<marker id="${id}" markerWidth="10" markerHeight="7" refX="9" refY="3" orient="auto">` +
                        `<polygon points="0 0, 9 3, 0 6" fill="${s}"/>` +
                        `</marker>`
                    )
                }
            }
        }

        if (hasStart) {
            if (arrowType === 'double') {
                const key = `start:double:${stroke}`
                if (!markerRefs.has(key)) {
                    const id = `m-arrow-start-${cid}`
                    markerRefs.set(key, id)
                    markerDefs.push(
                        `<marker id="${id}" markerWidth="10" markerHeight="7" refX="0" refY="3" orient="auto">` +
                        `<polygon points="9 0, 0 3, 9 6" fill="${s}"/>` +
                        `</marker>`
                    )
                }
            } else if (arrowType === 'diamond') {
                const key = `start:diamond:${stroke}`
                if (!markerRefs.has(key)) {
                    const id = `m-diamond-start-${cid}`
                    markerRefs.set(key, id)
                    markerDefs.push(
                        `<marker id="${id}" markerWidth="12" markerHeight="7" refX="0" refY="3" orient="auto">` +
                        `<polygon points="0 3, 6 0, 12 3, 6 6" fill="${s}"/>` +
                        `</marker>`
                    )
                }
            }
        }
    }

    return {
        defsHtml: markerDefs.length > 0 ? `<defs>${markerDefs.join('')}</defs>` : '',
        markerRefs,
    }
}

// ── Node ───────────────────────────────────────────────────────────────────────

function buildNodeSvg(node: DiagramNode): string {
    const { type, x, y, width, height, label, style } = node
    const fill = style?.fillColor ?? '#1e2535'
    const stroke = style?.strokeColor ?? '#3d4f6e'
    const strokeWidth = style?.strokeWidth ?? 1.5
    const textColor = style?.textColor ?? '#e2e8f0'
    const fontSize = style?.fontSize ?? 13

    const labelSvg =
        `<text x="${x + width / 2}" y="${y + height / 2}" ` +
        `dominant-baseline="middle" text-anchor="middle" ` +
        `font-size="${fontSize}" fill="${escapeXml(textColor)}" ` +
        `font-family="${escapeXml(FONT_FAMILY)}" ` +
        `pointer-events="none">${escapeXml(label)}</text>`

    switch (type) {
        case 'rectangle':
            return (
                `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" rx="0"/>` +
                labelSvg
            )
        case 'rounded-rectangle':
            return (
                `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" rx="8"/>` +
                labelSvg
            )
        case 'circle': {
            const cx = x + width / 2
            const cy = y + height / 2
            const r = Math.min(width, height) / 2
            return (
                `<circle cx="${cx}" cy="${cy}" r="${r}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>` +
                labelSvg
            )
        }
        case 'diamond': {
            const cx = x + width / 2
            const cy = y + height / 2
            const pts = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`
            return (
                `<polygon points="${pts}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>` +
                labelSvg
            )
        }
        case 'queue': {
            const rx = Math.max(6, width * 0.12)
            const cy = y + height / 2
            const body = `<rect x="${x + rx}" y="${y}" width="${width - rx * 2}" height="${height}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const frontEllipse = `<ellipse cx="${x + width - rx}" cy="${cy}" rx="${rx}" ry="${height / 2}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const backEllipse = `<ellipse cx="${x + rx}" cy="${cy}" rx="${rx}" ry="${height / 2}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const qLabel = `<text x="${x + rx + (width - rx * 2) / 2}" y="${cy}" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" fill="${escapeXml(textColor)}" font-family="${escapeXml(FONT_FAMILY)}" pointer-events="none">${escapeXml(label)}</text>`
            return body + frontEllipse + backEllipse + qLabel
        }
        case 'client': {
            const screenH = height * 0.72
            const standH = height * 0.18
            const baseW = width * 0.5
            const cx = x + width / 2
            const screen = `<rect x="${x}" y="${y}" width="${width}" height="${screenH}" rx="3" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const stand = `<line x1="${cx}" y1="${y + screenH}" x2="${cx}" y2="${y + screenH + standH}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const base = `<line x1="${cx - baseW / 2}" y1="${y + screenH + standH}" x2="${cx + baseW / 2}" y2="${y + screenH + standH}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const cLabel = `<text x="${cx}" y="${y + screenH / 2}" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" fill="${escapeXml(textColor)}" font-family="${escapeXml(FONT_FAMILY)}" pointer-events="none">${escapeXml(label)}</text>`
            return screen + stand + base + cLabel
        }
        case 'database':
        case 'cache': {
            const ry = Math.max(6, height * 0.12)
            const cx = x + width / 2
            const bodyRect =
                `<rect x="${x}" y="${y + ry}" width="${width}" height="${height - ry * 2}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const bottomEllipse =
                `<ellipse cx="${cx}" cy="${y + height - ry}" rx="${width / 2}" ry="${ry}" ` +
                `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const topEllipse =
                `<ellipse cx="${cx}" cy="${y + ry}" rx="${width / 2}" ry="${ry}" ` +
                `fill="${FILL_TOP_DB}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"/>`
            const dbLabel =
                `<text x="${cx}" y="${y + ry + (height - ry * 2) / 2}" ` +
                `dominant-baseline="middle" text-anchor="middle" ` +
                `font-size="${fontSize}" fill="${escapeXml(textColor)}" ` +
                `font-family="${escapeXml(FONT_FAMILY)}" ` +
                `pointer-events="none">${escapeXml(label)}</text>`
            if (type === 'cache') {
                const bw = Math.min(width * 0.25, 14)
                const bh = Math.min(height * 0.4, 20)
                const bx = cx; const by = y + ry + (height - ry * 2) / 2
                const bolt = `M ${bx + bw * 0.3},${by - bh / 2} L ${bx - bw * 0.2},${by} L ${bx + bw * 0.1},${by} L ${bx - bw * 0.3},${by + bh / 2} L ${bx + bw * 0.2},${by} L ${bx - bw * 0.1},${by} Z`
                const boltSvg = `<path d="${bolt}" fill="${escapeXml(textColor)}" fill-opacity="0.35" stroke="${escapeXml(stroke)}" stroke-width="0.8"/>`
                return bodyRect + bottomEllipse + topEllipse + boltSvg + dbLabel
            }
            return bodyRect + bottomEllipse + topEllipse + dbLabel
        }
        default:
            return ''
    }
}

// ── Group ──────────────────────────────────────────────────────────────────────

function buildGroupSvg(group: DiagramGroup): string {
    const { x, y, width, height, title, style } = group
    const fillColor = style?.fillColor ?? '#6366f1'
    const fillOpacity = style?.fillOpacity ?? 0.06
    const strokeColor = style?.strokeColor ?? '#6366f1'
    const strokeWidth = style?.strokeWidth ?? 1.5
    const borderStyle = style?.strokeBorderStyle ?? 'dashed'
    const radius = style?.borderRadius ?? 8
    const titleColor = style?.titleColor ?? '#a5b4fc'
    const titleFontSize = style?.titleFontSize ?? 11

    let dashAttr = ''
    if (borderStyle === 'dashed') dashAttr = ` stroke-dasharray="8 5"`
    else if (borderStyle === 'dotted') dashAttr = ` stroke-dasharray="${strokeWidth} 5"`

    const fillRect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ` +
        `fill="${escapeXml(fillColor)}" fill-opacity="${fillOpacity}" stroke="none"/>`
    const strokeRect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ` +
        `fill="none" stroke="${escapeXml(strokeColor)}" stroke-width="${strokeWidth}"${dashAttr}/>`
    const titleSvg = title
        ? `<text x="${x + radius + 4}" y="${y + titleFontSize + 4}" font-size="${titleFontSize}" ` +
        `fill="${escapeXml(titleColor)}" font-family="${escapeXml(FONT_FAMILY)}">${escapeXml(title)}</text>`
        : ''

    return fillRect + strokeRect + titleSvg
}

// ── Edge ───────────────────────────────────────────────────────────────────────

function buildEdgeSvg(
    edge: DiagramEdge,
    sourceNode: DiagramNode | undefined,
    targetNode: DiagramNode | undefined,
    defaultRouting: string,
    markerRefs: Map<string, string>,
): string {
    if (!sourceNode || !targetNode) return ''

    const sx = sourceNode.x + sourceNode.width / 2
    const sy = sourceNode.y + sourceNode.height / 2
    const tx = targetNode.x + targetNode.width / 2
    const ty = targetNode.y + targetNode.height / 2

    const p1 = getNodeEdgePoint(sourceNode, tx, ty)
    const p2 = getNodeEdgePoint(targetNode, sx, sy)
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y

    const stroke = edge.style?.strokeColor ?? D_STROKE
    const strokeWidth = edge.style?.strokeWidth ?? 1.5
    const lineStyle = edge.style?.lineStyle ?? 'solid'
    const arrowType = edge.style?.arrowType ?? 'arrow'
    const routing = edge.style?.routing ?? defaultRouting ?? 'straight'

    const dx = x2 - x1
    const dy = y2 - y1
    let pathD: string
    if (edge.waypoints && edge.waypoints.length > 0) {
        const firstWpt = edge.waypoints[0]
        const lastWpt = edge.waypoints[edge.waypoints.length - 1]
        const pSrc = getNodeEdgePoint(sourceNode, firstWpt.x, firstWpt.y)
        const pTarget = getNodeEdgePoint(targetNode, lastWpt.x, lastWpt.y)
        pathD = buildWaypointPath([pSrc, ...edge.waypoints, pTarget])
    } else if (routing === 'curved') {
        const tension = Math.max(50, Math.abs(dx) * 0.45 + Math.abs(dy) * 0.1)
        const sign = dx >= 0 ? 1 : -1
        const cp1x = x1 + sign * tension
        const cp2x = x2 - sign * tension
        pathD = `M ${x1},${y1} C ${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}`
    } else if (routing === 'orthogonal') {
        pathD = buildOrthogonalRoundedPath(x1, y1, x2, y2)
    } else {
        pathD = `M ${x1},${y1} L ${x2},${y2}`
    }

    let strokeDasharray = ''
    let strokeLinecap = ''
    if (lineStyle === 'dashed') {
        strokeDasharray = ` stroke-dasharray="12 6"`
    } else if (lineStyle === 'dotted') {
        strokeDasharray = ` stroke-dasharray="${strokeWidth} 5"`
        strokeLinecap = ` stroke-linecap="round"`
    }

    const hasEnd = arrowType === 'arrow' || arrowType === 'open-arrow' || arrowType === 'double'
    const hasStart = arrowType === 'double' || arrowType === 'diamond'

    let markerEndAttr = ''
    let markerStartAttr = ''
    if (hasEnd) {
        const markerKey = arrowType === 'open-arrow' ? `end:open-arrow:${stroke}` : `end:arrow:${stroke}`
        const markerId = markerRefs.get(markerKey)
        if (markerId) markerEndAttr = ` marker-end="url(#${markerId})"`
    }
    if (hasStart) {
        const markerKey = arrowType === 'diamond' ? `start:diamond:${stroke}` : `start:double:${stroke}`
        const markerId = markerRefs.get(markerKey)
        if (markerId) markerStartAttr = ` marker-start="url(#${markerId})"`
    }

    const pathEl =
        `<path d="${pathD}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"` +
        `${strokeDasharray}${strokeLinecap}${markerEndAttr}${markerStartAttr} fill="none"/>`

    let labelSvg = ''
    if (edge.label) {
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        labelSvg =
            `<text x="${midX}" y="${midY - 6}" text-anchor="middle" ` +
            `font-size="11" fill="${escapeXml(D_STROKE)}" font-family="${escapeXml(FONT_FAMILY)}"` +
            `>${escapeXml(edge.label)}</text>`
    }

    return pathEl + labelSvg
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function exportSvgString(diagram: Diagram, withBackground = true): string {
    const PAD = 48

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const node of diagram.nodes) {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + node.width)
        maxY = Math.max(maxY, node.y + node.height)
    }
    for (const group of diagram.groups) {
        minX = Math.min(minX, group.x)
        minY = Math.min(minY, group.y)
        maxX = Math.max(maxX, group.x + group.width)
        maxY = Math.max(maxY, group.y + group.height)
    }
    for (const text of diagram.texts) {
        const fs = text.style?.fontSize ?? 14
        const approxW = text.content.length * fs * 0.6
        minX = Math.min(minX, text.x)
        minY = Math.min(minY, text.y - fs * 1.4)
        maxX = Math.max(maxX, text.x + approxW)
        maxY = Math.max(maxY, text.y)
    }

    if (!isFinite(minX)) {
        minX = 0; minY = 0; maxX = 800; maxY = 600
    }

    const vx = minX - PAD
    const vy = minY - PAD
    const vw = maxX - minX + PAD * 2
    const vh = maxY - minY + PAD * 2

    const { defsHtml, markerRefs } = buildMarkerDefs(diagram.edges)

    const background = withBackground ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#0f1117"/>` : ''

    const groupSvgs = diagram.groups.map(g => buildGroupSvg(g)).join('')

    const nodeMap = new Map(diagram.nodes.map(n => [n.id, n]))
    const edgeSvgs = diagram.edges
        .map(e => buildEdgeSvg(e, nodeMap.get(e.sourceId), nodeMap.get(e.targetId), diagram.defaultEdgeRouting, markerRefs))
        .join('')

    const nodeSvgs = diagram.nodes.map(n => `<g>${buildNodeSvg(n)}</g>`).join('')

    const textSvgs = diagram.texts.map(t => {
        const color = t.style?.textColor ?? '#e2e8f0'
        const fontSize = t.style?.fontSize ?? 14
        return (
            `<text x="${t.x}" y="${t.y}" fill="${escapeXml(color)}" ` +
            `font-size="${fontSize}" font-family="${escapeXml(FONT_FAMILY)}">${escapeXml(t.content)}</text>`
        )
    }).join('')

    return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}">` +
        defsHtml + background + groupSvgs + edgeSvgs + nodeSvgs + textSvgs +
        `</svg>`
    )
}
