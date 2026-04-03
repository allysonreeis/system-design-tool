import CanvasArea from '@/layout/CanvasArea'
import Header from '@/layout/Header'
import PropertiesPanel from '@/layout/PropertiesPanel'
import Sidebar from '@/layout/Sidebar'
import { useEditorState } from '@/hooks/useEditorState'
import { createBlankDiagram } from '@/hooks/useEditorState'
import { createDefaultNode, createDefaultText, createDefaultGroup } from '@/utils/createElement'
import { saveDiagram, loadDiagram } from '@/utils/persistence'
import { exportSvg, exportJson, importJson } from '@/utils/exportImport'
import { useEffect, useRef, useState } from 'react'
import type { NodeType, DiagramElementStyle, SelectableElementType, EdgeRouting, GroupStyle } from '@/types/diagram'
import type { MarqueeBox } from '@/features/editor/SvgCanvas'

export default function App() {
    const { diagram, selection, setDiagram, setSelection } = useEditorState()
    const [multiSelectionIds, setMultiSelectionIds] = useState<string[]>([])

    function handleSelect(s: typeof selection) {
        setSelection(s)
        setMultiSelectionIds([])
    }

    function handleToggleMultiSelect(id: string, _type: SelectableElementType) {
        setMultiSelectionIds(prev => {
            // Absorb current single selection into the multi-set
            const base = selection && !prev.includes(selection.id)
                ? [...prev, selection.id]
                : prev
            return base.includes(id) ? base.filter(x => x !== id) : [...base, id]
        })
        setSelection(null)
    }

    function handleMarqueeComplete(box: MarqueeBox) {
        const minX = Math.min(box.x1, box.x2)
        const minY = Math.min(box.y1, box.y2)
        const maxX = Math.max(box.x1, box.x2)
        const maxY = Math.max(box.y1, box.y2)
        const ids: string[] = []
        for (const n of diagram.nodes) {
            if (n.x >= minX && n.y >= minY && n.x + n.width <= maxX && n.y + n.height <= maxY)
                ids.push(n.id)
        }
        for (const t of diagram.texts) {
            if (t.x >= minX && t.y >= minY && t.x <= maxX && t.y <= maxY)
                ids.push(t.id)
        }
        for (const g of diagram.groups) {
            if (g.x >= minX && g.y >= minY && g.x + g.width <= maxX && g.y + g.height <= maxY)
                ids.push(g.id)
        }
        setMultiSelectionIds(ids)
        setSelection(null)
    }

    // ── Toast ───────────────────────────────────────────────────────────

    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function showToast(msg: string) {
        if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current)
        setToastMessage(msg)
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000)
    }

    // ── Persistence handlers ──────────────────────────────────────────────

    function handleSave() {
        saveDiagram(diagram)
        showToast('Diagram saved')
    }

    function handleLoad() {
        const loaded = loadDiagram()
        if (loaded) {
            setDiagram(loaded)
            handleSelect(null)
            showToast('Diagram loaded')
        } else {
            showToast('No saved diagram found')
        }
    }

    function handleNew() {
        setDiagram(createBlankDiagram())
        handleSelect(null)
    }

    // ── Export / Import handlers ──────────────────────────────────────────

    function handleExportSvg() {
        exportSvg(diagram)
        showToast('SVG exported')
    }

    function handleExportSvgTransparent() {
        exportSvg(diagram, false)
        showToast('SVG exported (transparent)')
    }

    function handleExportJson() {
        exportJson(diagram)
        showToast('JSON exported')
    }

    async function handleImportJson() {
        const imported = await importJson()
        if (imported) {
            setDiagram(imported)
            handleSelect(null)
            showToast('Diagram imported')
        } else {
            showToast('Import cancelled or invalid file')
        }
    }

    // ── Add elements ──────────────────────────────────────────────────────

    function handleAddNode(type: NodeType, labelOverride?: string) {
        const node = createDefaultNode(type, diagram.nodes.length + diagram.texts.length, labelOverride)
        setDiagram(d => ({ ...d, nodes: [...d.nodes, node] }))
        handleSelect({ id: node.id, type: 'node' })
    }

    function handleAddText() {
        const text = createDefaultText(diagram.nodes.length + diagram.texts.length)
        setDiagram(d => ({ ...d, texts: [...d.texts, text] }))
        handleSelect({ id: text.id, type: 'text' })
    }

    function handleAddGroup() {
        const group = createDefaultGroup(diagram.nodes.length + diagram.texts.length + diagram.groups.length)
        setDiagram(d => ({ ...d, groups: [...d.groups, group] }))
        handleSelect({ id: group.id, type: 'group' })
    }

    // ── Update elements ───────────────────────────────────────────────────

    function handleUpdateNode(id: string, label: string, style: DiagramElementStyle) {
        setDiagram(d => ({
            ...d,
            nodes: d.nodes.map(n =>
                n.id === id ? { ...n, label, style: { ...n.style, ...style } } : n
            ),
        }))
    }

    function handleUpdateText(id: string, content: string, style: DiagramElementStyle) {
        setDiagram(d => ({
            ...d,
            texts: d.texts.map(t =>
                t.id === id ? { ...t, content, style: { ...t.style, ...style } } : t
            ),
        }))
    }

    function handleUpdateGroup(id: string, title: string, style: GroupStyle) {
        setDiagram(d => ({
            ...d,
            groups: d.groups.map(g =>
                g.id === id ? { ...g, title, style: { ...g.style, ...style } } : g
            ),
        }))
    }

    // ── Edge handlers ─────────────────────────────────────────────────────

    function handleAddEdge(sourceId: string, targetId: string, waypoints?: { x: number; y: number }[]) {
        const edge = { id: crypto.randomUUID(), sourceId, targetId, ...(waypoints ? { waypoints } : {}) }
        setDiagram(d => ({ ...d, edges: [...d.edges, edge] }))
        handleSelect({ id: edge.id, type: 'edge' })
    }

    function handleUpdateEdge(id: string, label: string, style: DiagramElementStyle) {
        setDiagram(d => ({
            ...d,
            edges: d.edges.map(e =>
                e.id === id ? { ...e, label, style: { ...e.style, ...style } } : e
            ),
        }))
    }

    function handleUpdateDiagramSettings(defaultEdgeRouting: EdgeRouting) {
        setDiagram(d => ({ ...d, defaultEdgeRouting }))
    }

    // ── Move elements ─────────────────────────────────────────────────────

    function handleMoveElement(id: string, type: SelectableElementType, dx: number, dy: number) {
        if (type === 'node') {
            setDiagram(d => ({
                ...d,
                nodes: d.nodes.map(n =>
                    n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n
                ),
            }))
        } else if (type === 'text') {
            setDiagram(d => ({
                ...d,
                texts: d.texts.map(t =>
                    t.id === id ? { ...t, x: t.x + dx, y: t.y + dy } : t
                ),
            }))
        } else if (type === 'group') {
            setDiagram(d => ({
                ...d,
                groups: d.groups.map(g =>
                    g.id === id ? { ...g, x: g.x + dx, y: g.y + dy } : g
                ),
            }))
        }
    }

    // ── Keyboard delete ───────────────────────────────────────────────────────

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
            const idsToDelete = multiSelectionIds.length > 0
                ? multiSelectionIds
                : selection ? [selection.id] : []
            if (idsToDelete.length === 0) return
            e.preventDefault()
            const deleteSet = new Set(idsToDelete)
            setDiagram(d => ({
                ...d,
                nodes: d.nodes.filter(n => !deleteSet.has(n.id)),
                texts: d.texts.filter(t => !deleteSet.has(t.id)),
                groups: d.groups.filter(g => !deleteSet.has(g.id)),
                edges: d.edges.filter(edge => !deleteSet.has(edge.id) && !deleteSet.has(edge.sourceId) && !deleteSet.has(edge.targetId)),
            }))
            handleSelect(null)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selection, multiSelectionIds])

    function handleResizeGroup(id: string, handle: string, dx: number, dy: number) {
        const MIN_W = 80
        const MIN_H = 60
        setDiagram(d => ({
            ...d,
            groups: d.groups.map(g => {
                if (g.id !== id) return g
                let { x, y, width, height } = g
                if (handle.includes('w')) {
                    const nw = Math.max(MIN_W, width - dx)
                    x = x + (width - nw)
                    width = nw
                }
                if (handle.includes('e')) {
                    width = Math.max(MIN_W, width + dx)
                }
                if (handle.includes('n')) {
                    const nh = Math.max(MIN_H, height - dy)
                    y = y + (height - nh)
                    height = nh
                }
                if (handle.includes('s')) {
                    height = Math.max(MIN_H, height + dy)
                }
                return { ...g, x, y, width, height }
            }),
        }))
    }

    return (
        <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 relative">
            <Header
                diagramName={diagram.name}
                onNew={handleNew}
                onSave={handleSave}
                onLoad={handleLoad}
                onExportSvg={handleExportSvg}
                onExportSvgTransparent={handleExportSvgTransparent}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    onAddNode={handleAddNode}
                    onAddText={handleAddText}
                    onAddGroup={handleAddGroup}
                />
                <CanvasArea
                    diagram={diagram}
                    selection={selection}
                    multiSelectionIds={multiSelectionIds}
                    onSelect={handleSelect}
                    onMove={handleMoveElement}
                    onResizeGroup={handleResizeGroup}
                    onToggleMultiSelect={handleToggleMultiSelect}
                    onMarqueeComplete={handleMarqueeComplete}
                    onAddEdge={handleAddEdge}
                />
                <PropertiesPanel
                    diagram={diagram}
                    selection={selection}
                    multiSelectionCount={multiSelectionIds.length}
                    onUpdateNode={handleUpdateNode}
                    onUpdateText={handleUpdateText}
                    onUpdateEdge={handleUpdateEdge}
                    onUpdateGroup={handleUpdateGroup}
                    onUpdateDiagramSettings={handleUpdateDiagramSettings}
                />
            </div>
            {/* Toast notification */}
            {toastMessage && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
                    <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] font-medium px-4 py-2 rounded-full shadow-lg">
                        {toastMessage}
                    </div>
                </div>
            )}
        </div>
    )
}
