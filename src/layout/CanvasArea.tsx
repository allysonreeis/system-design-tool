import { useEffect, useRef, useState } from 'react'
import type { Diagram, SelectableElementType, Viewport } from '@/types/diagram'
import type { Selection } from '@/hooks/useEditorState'
import SvgCanvas from '@/features/editor/SvgCanvas'
import type { MarqueeBox } from '@/features/editor/SvgCanvas'
import Minimap from '@/features/editor/Minimap'

// ── Grid configuration ────────────────────────────────────────────────────────
const SPACING = 24          // px between dots (canvas-space)
const PHASE = 12          // grid phase offset — first dot at (12, 12)
const DOT_R = 1           // dot radius in CSS px at zoom=1
const BASE = [37, 45, 64] as const  // #252d40 — resting dot colour
const BRIGHT = [91, 104, 153] as const  // #5b6899 — highlighted dot colour
const INFLUENCE = 200       // cursor influence radius in viewport px
const BG = '#0f1117'

/** Smooth cubic Hermite, clamped 0→1 */
function smoothstep(x: number): number {
    const t = Math.max(0, Math.min(1, x))
    return t * t * (3 - 2 * t)
}

export default function CanvasArea({
    diagram,
    selection,
    multiSelectionIds,
    onSelect,
    onMove,
    onResizeGroup,
    onToggleMultiSelect,
    onMarqueeComplete,
    onAddEdge,
}: {
    diagram: Diagram
    selection: Selection | null
    multiSelectionIds: string[]
    onSelect: (s: Selection | null) => void
    onMove: (id: string, type: SelectableElementType, dx: number, dy: number) => void
    onResizeGroup: (id: string, handle: string, dx: number, dy: number) => void
    onToggleMultiSelect: (id: string, type: SelectableElementType) => void
    onMarqueeComplete: (box: MarqueeBox) => void
    onAddEdge: (sourceId: string, targetId: string, waypoints?: { x: number; y: number }[]) => void
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Cursor position in viewport-space (no React state — direct ref mutation)
    const cursorRef = useRef<{ x: number; y: number } | null>(null)

    const [viewport, setViewport] = useState<Viewport>({ zoom: 1, offsetX: 0, offsetY: 0 })
    const viewRef = useRef<Viewport>(viewport)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

    const rafRef = useRef<number | null>(null)
    // Keep viewRef in sync so event handlers always see the latest viewport
    useEffect(() => { viewRef.current = viewport }, [viewport])

    // ── Draw ─────────────────────────────────────────────────────────────────

    function draw() {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const w = canvas.width / dpr   // logical CSS-pixel width
        const h = canvas.height / dpr   // logical CSS-pixel height
        if (w <= 0 || h <= 0) return

        const { zoom, offsetX, offsetY } = viewRef.current

        // Scale context so all coordinates are in logical CSS pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = BG
        ctx.fillRect(0, 0, w, h)

        // Below this zoom dots are sub-pixel noise — skip grid entirely
        if (zoom < 0.15) return

        // Thin the grid at low zoom to keep dot count bounded (~O(1) instead of O(1/zoom²)).
        // Coarser steps are always subsets of the fine grid — no dot positions shift at transitions.
        const step = zoom < 0.3 ? 4 : zoom < 0.5 ? 2 : 1

        // Cursor in canvas-space (zoom/pan-corrected)
        let cx: number | null = null
        let cy: number | null = null
        if (cursorRef.current) {
            cx = (cursorRef.current.x - offsetX) / zoom
            cy = (cursorRef.current.y - offsetY) / zoom
        }

        // Keep visual influence size constant in viewport space
        const influenceCS = INFLUENCE / zoom

        // Fine-grid range, rounded to step multiples to keep subset alignment
        const colMinFine = Math.floor((-offsetX / zoom - PHASE) / SPACING) - 1
        const colMaxFine = Math.ceil((w / zoom - offsetX / zoom - PHASE) / SPACING) + 1
        const rowMinFine = Math.floor((-offsetY / zoom - PHASE) / SPACING) - 1
        const rowMaxFine = Math.ceil((h / zoom - offsetY / zoom - PHASE) / SPACING) + 1
        const colMin = Math.floor(colMinFine / step) * step
        const colMax = Math.ceil(colMaxFine / step) * step
        const rowMin = Math.floor(rowMinFine / step) * step
        const rowMax = Math.ceil(rowMaxFine / step) * step

        const dotRadius = Math.max(0.5, DOT_R * zoom)

        // ── Pass 1: all dots in base colour — single beginPath/fill call ──────
        ctx.beginPath()
        for (let row = rowMin; row <= rowMax; row += step) {
            for (let col = colMin; col <= colMax; col += step) {
                const dotX = PHASE + col * SPACING
                const dotY = PHASE + row * SPACING
                const sx = dotX * zoom + offsetX
                const sy = dotY * zoom + offsetY
                if (sx < -dotRadius || sx > w + dotRadius || sy < -dotRadius || sy > h + dotRadius) continue
                // moveTo prevents implicit lineTo connecting arcs within the same path
                ctx.moveTo(sx + dotRadius, sy)
                ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2)
            }
        }
        ctx.fillStyle = `rgb(${BASE[0]},${BASE[1]},${BASE[2]})`
        ctx.fill()

        // ── Pass 2: overpaint only the ~50–200 dots inside the cursor halo ────
        if (cx !== null && cy !== null) {
            for (let row = rowMin; row <= rowMax; row += step) {
                for (let col = colMin; col <= colMax; col += step) {
                    const dotX = PHASE + col * SPACING
                    const dotY = PHASE + row * SPACING
                    const dist = Math.sqrt((dotX - cx) ** 2 + (dotY - cy) ** 2)
                    if (dist >= influenceCS) continue
                    const t = smoothstep(1 - dist / influenceCS)
                    if (t < 0.01) continue
                    const sx = dotX * zoom + offsetX
                    const sy = dotY * zoom + offsetY
                    if (sx < -dotRadius || sx > w + dotRadius || sy < -dotRadius || sy > h + dotRadius) continue
                    const r = Math.round(BASE[0] + (BRIGHT[0] - BASE[0]) * t)
                    const g = Math.round(BASE[1] + (BRIGHT[1] - BASE[1]) * t)
                    const b = Math.round(BASE[2] + (BRIGHT[2] - BASE[2]) * t)
                    ctx.beginPath()
                    ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2)
                    ctx.fillStyle = `rgb(${r},${g},${b})`
                    ctx.fill()
                }
            }
        }
    }

    function scheduleRedraw() {
        if (rafRef.current !== null) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            draw()
        })
    }

    // ── Resize observer ───────────────────────────────────────────────────────

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const dpr = window.devicePixelRatio || 1

        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            canvas.style.width = width + 'px'
            canvas.style.height = height + 'px'
            setContainerSize({ width, height })
            draw()
        })
        ro.observe(container)

        return () => {
            ro.disconnect()
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    // ── Wheel zoom ────────────────────────────────────────────────────────────

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            const rect = container.getBoundingClientRect()
            const { zoom, offsetX, offsetY } = viewRef.current
            const cx = e.clientX - rect.left
            const cy = e.clientY - rect.top
            if (e.ctrlKey) {
                // Ctrl+scroll or pinch-zoom → zoom around cursor
                const newZoom = Math.max(0.1, Math.min(5, zoom * (1 - e.deltaY * 0.01)))
                const canvasX = (cx - offsetX) / zoom
                const canvasY = (cy - offsetY) / zoom
                setViewport({ zoom: newZoom, offsetX: cx - canvasX * newZoom, offsetY: cy - canvasY * newZoom })
            } else {
                // Plain scroll → pan (handles both axes for trackpad)
                setViewport(v => ({ ...v, offsetX: v.offsetX - e.deltaX, offsetY: v.offsetY - e.deltaY }))
            }
        }
        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [])

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                setViewport({ zoom: 1, offsetX: 0, offsetY: 0 })
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // ── Pan + reset helpers ───────────────────────────────────────────────────

    function handlePan(dx: number, dy: number) {
        setViewport(v => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }))
    }

    function handleResetViewport() {
        setViewport({ zoom: 1, offsetX: 0, offsetY: 0 })
    }

    function handleNavigate(offsetX: number, offsetY: number) {
        setViewport(v => ({ ...v, offsetX, offsetY }))
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        scheduleRedraw()
    }

    const handleMouseLeave = () => {
        cursorRef.current = null
        scheduleRedraw()
    }

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative flex-1 overflow-hidden"
            style={{ cursor: 'default', backgroundColor: BG }}
        >
            {/* Background canvas — dot grid with proximity highlight */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ display: 'block' }}
            />

            {/* Edge vignette — softens the canvas boundary */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: 'inset 0 0 80px 20px rgba(15,17,23,0.6)',
                }}
            />

            {/* SVG diagram layer */}
            <SvgCanvas
                diagram={diagram}
                selection={selection}
                multiSelectionIds={multiSelectionIds}
                onSelect={onSelect}
                onMove={onMove}
                onResizeGroup={onResizeGroup}
                onToggleMultiSelect={onToggleMultiSelect}
                onMarqueeComplete={onMarqueeComplete}
                viewRef={viewRef}
                viewport={viewport}
                onAddEdge={onAddEdge}
                onPan={handlePan}
            />

            {/* Minimap — bottom-right corner, above stats row */}
            <Minimap
                diagram={diagram}
                viewport={viewport}
                containerSize={containerSize}
                onNavigate={handleNavigate}
            />

            {/* Diagram stats + zoom — bottom-right */}
            <div className="absolute bottom-4 right-5 select-none flex items-center gap-3">
                <button
                    className="text-[11px] text-zinc-600 tabular-nums cursor-pointer hover:text-zinc-400 transition-colors bg-transparent border-0 p-0"
                    onClick={handleResetViewport}
                    title="Click or Ctrl+0 to reset view"
                >
                    {Math.round(viewport.zoom * 100)}%
                </button>
                <span className="text-zinc-800 text-[11px]">·</span>
                <StatPill value={diagram.nodes.length} label="nodes" />
                <StatPill value={diagram.edges.length} label="edges" />
                <StatPill value={diagram.texts.length} label="texts" />
            </div>

            {/* Empty state message — hidden when diagram has elements */}
            {diagram.nodes.length === 0 && diagram.texts.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-3">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                        <svg
                            width="36"
                            height="36"
                            viewBox="0 0 36 36"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-zinc-600"
                        >
                            <rect x="2" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="20" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="11" y="24" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M9 12v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M18 18v6" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <p className="text-[13px] text-zinc-500 font-medium">
                            Start from a blank canvas or choose a preset
                        </p>
                        <p className="text-[12px] text-zinc-700">
                            Drag elements from the left panel to begin
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatPill({ value, label }: { value: number; label: string }) {
    return (
        <span className="text-[11px] text-zinc-600 tabular-nums">
            <span className="text-zinc-500 font-medium">{value}</span>
            {' '}{label}
        </span>
    )
}
