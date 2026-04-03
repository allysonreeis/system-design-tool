import React from 'react'
import type { Diagram, Viewport } from '@/types/diagram'

// ── Minimap configuration ─────────────────────────────────────────────────────
const MM_W = 180      // minimap SVG width  (px)
const MM_H = 120      // minimap SVG height (px)
const PADDING = 48    // canvas-space padding around diagram bounds

interface MinimapProps {
    diagram: Diagram
    viewport: Viewport
    containerSize: { width: number; height: number }
    onNavigate?: (offsetX: number, offsetY: number) => void
}

// ── Bounds helpers ────────────────────────────────────────────────────────────

interface Bounds {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

function computeBounds(diagram: Diagram): Bounds {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const node of diagram.nodes) {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + node.width)
        maxY = Math.max(maxY, node.y + node.height)
    }

    // Text elements: treat as a point (unreliable size)
    for (const text of diagram.texts) {
        minX = Math.min(minX, text.x)
        minY = Math.min(minY, text.y)
        maxX = Math.max(maxX, text.x)
        maxY = Math.max(maxY, text.y)
    }

    if (!isFinite(minX)) {
        // Empty diagram — use a sensible default canvas area
        return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
    }

    return {
        minX: minX - PADDING,
        minY: minY - PADDING,
        maxX: maxX + PADDING,
        maxY: maxY + PADDING,
    }
}

// ── Component ─────────────────────────────────────────────────────────────────

const Minimap: React.FC<MinimapProps> = ({ diagram, viewport, containerSize, onNavigate }) => {
    // Don't render before the container has been measured
    if (containerSize.width === 0) return null

    const bounds = computeBounds(diagram)
    const boundsW = bounds.maxX - bounds.minX
    const boundsH = bounds.maxY - bounds.minY

    // Uniform scale that fits the full bounds into the minimap box
    const scale = Math.min(MM_W / boundsW, MM_H / boundsH)

    // Scaled dimensions of the diagram content inside the minimap SVG
    const contentW = boundsW * scale
    const contentH = boundsH * scale

    // Center the content within the fixed SVG box
    const originX = (MM_W - contentW) / 2
    const originY = (MM_H - contentH) / 2

    // Map canvas-space → minimap SVG space
    const toMM = (cx: number, cy: number) => ({
        x: originX + (cx - bounds.minX) * scale,
        y: originY + (cy - bounds.minY) * scale,
    })

    // ── Viewport indicator ────────────────────────────────────────────────────
    // Visible canvas rect in canvas-space, then mapped to minimap SVG space
    const { zoom, offsetX, offsetY } = viewport
    const cw = containerSize.width
    const ch = containerSize.height

    const vpLeft = -offsetX / zoom
    const vpTop = -offsetY / zoom
    const vpRight = (cw - offsetX) / zoom
    const vpBottom = (ch - offsetY) / zoom

    const vpMM = {
        x: originX + (vpLeft - bounds.minX) * scale,
        y: originY + (vpTop - bounds.minY) * scale,
        w: (vpRight - vpLeft) * scale,
        h: (vpBottom - vpTop) * scale,
    }

    // ── Click-to-navigate ─────────────────────────────────────────────────────
    function handleClick(e: React.MouseEvent<SVGSVGElement>) {
        if (!onNavigate) return
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top

        // Convert minimap click position → canvas-space
        const canvasX = bounds.minX + (clickX - originX) / scale
        const canvasY = bounds.minY + (clickY - originY) / scale

        // Center the main viewport on the clicked canvas point
        const newOffsetX = cw / 2 - canvasX * zoom
        const newOffsetY = ch / 2 - canvasY * zoom
        onNavigate(newOffsetX, newOffsetY)
    }

    return (
        <div
            className="absolute bottom-14 right-4 rounded-md overflow-hidden pointer-events-auto"
            style={{
                width: MM_W,
                height: MM_H,
                background: 'rgba(15,17,23,0.85)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <svg
                width={MM_W}
                height={MM_H}
                viewBox={`0 0 ${MM_W} ${MM_H}`}
                onClick={handleClick}
                style={{ display: 'block', cursor: onNavigate ? 'crosshair' : 'default' }}
            >
                {/* Edges — bare straight lines, no routing */}
                {diagram.edges.map(edge => {
                    const src = diagram.nodes.find(n => n.id === edge.sourceId)
                    const tgt = diagram.nodes.find(n => n.id === edge.targetId)
                    if (!src || !tgt) return null
                    const s = toMM(src.x + src.width / 2, src.y + src.height / 2)
                    const t = toMM(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2)
                    return (
                        <line
                            key={edge.id}
                            x1={s.x} y1={s.y}
                            x2={t.x} y2={t.y}
                            stroke="#3d4f6e"
                            strokeWidth={0.75}
                            strokeOpacity={0.5}
                        />
                    )
                })}

                {/* Nodes — simplified bounding-box rectangles */}
                {diagram.nodes.map(node => {
                    const tl = toMM(node.x, node.y)
                    const br = toMM(node.x + node.width, node.y + node.height)
                    return (
                        <rect
                            key={node.id}
                            x={tl.x}
                            y={tl.y}
                            width={br.x - tl.x}
                            height={br.y - tl.y}
                            fill="#1e2535"
                            stroke="#3d4f6e"
                            strokeWidth={0.75}
                            fillOpacity={0.7}
                            strokeOpacity={0.6}
                        />
                    )
                })}

                {/* Viewport indicator */}
                <rect
                    x={vpMM.x}
                    y={vpMM.y}
                    width={vpMM.w}
                    height={vpMM.h}
                    fill="rgba(99,102,241,0.07)"
                    stroke="#6366f1"
                    strokeWidth={1}
                />
            </svg>
        </div>
    )
}

export default Minimap
