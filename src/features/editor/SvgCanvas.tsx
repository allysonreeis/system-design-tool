import React, { useEffect, useRef, useState } from 'react';
import type { Diagram, SelectableElementType, Viewport } from '@/types/diagram';
import type { Selection } from '@/hooks/useEditorState';
import NodeRenderer from './NodeRenderer';
import TextElementRenderer from './TextElementRenderer';
import EdgeRenderer, { getNodeEdgePoint, buildWaypointPath } from './EdgeRenderer';
import GroupRenderer from './GroupRenderer';

export interface MarqueeBox { x1: number; y1: number; x2: number; y2: number }

interface SvgCanvasProps {
    diagram: Diagram;
    selection: Selection | null;
    multiSelectionIds: string[];
    onSelect: (s: Selection | null) => void;
    onMove: (id: string, type: SelectableElementType, dx: number, dy: number) => void;
    onResizeGroup: (id: string, handle: string, dx: number, dy: number) => void;
    onToggleMultiSelect: (id: string, type: SelectableElementType) => void;
    onMarqueeComplete: (box: MarqueeBox) => void;
    viewRef: React.RefObject<Viewport>;
    viewport: Viewport;
    onAddEdge: (sourceId: string, targetId: string, waypoints?: { x: number; y: number }[]) => void;
    onPan: (dx: number, dy: number) => void;
}

interface DragState {
    id: string;
    type: SelectableElementType;
    moved: boolean;
}

interface ResizeDragState {
    id: string;
    handle: string;
}

const SvgCanvas: React.FC<SvgCanvasProps> = ({ diagram, selection, multiSelectionIds, onSelect, onMove, onResizeGroup, onToggleMultiSelect, onMarqueeComplete, viewRef, viewport, onAddEdge, onPan }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const resizeDragRef = useRef<ResizeDragState | null>(null);
    // true when the last pointerDown landed on the background (not on an element)
    const bgDownRef = useRef(false);
    // true once background drag has moved — prevents deselect on pointer-up
    const bgMovedRef = useRef(false);
    // true when panning via middle-mouse or space+drag
    const panRef = useRef(false);
    // Marquee start position (canvas-space)
    const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
    const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [spaceDown, setSpaceDown] = useState(false);
    // ID of the node awaiting a second click to complete edge creation
    const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
    // true when Alt was held on handle click — enables pen-tool waypoint mode
    const [pendingWaypointMode, setPendingWaypointMode] = useState(false);
    // Intermediate canvas-clicked waypoints; source boundary is computed dynamically, NOT stored here
    const [pendingWaypoints, setPendingWaypoints] = useState<{ x: number; y: number }[]>([]);
    // SVG-space cursor position while a connection is in progress
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    // true while Alt is held — switches connection handles to + markers
    const [altDown, setAltDown] = useState(false);

    // ── Space key tracking ────────────────────────────────────────────────────

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                setSpaceDown(true)
            }
            if (e.key === 'Alt') setAltDown(true)
            if (e.code === 'Escape') {
                setPendingSourceId(null)
                setPendingWaypointMode(false)
                setPendingWaypoints([])
                setCursorPos(null)
            }
        }
        const onUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setSpaceDown(false)
            if (e.key === 'Alt') setAltDown(false)
        }
        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        return () => {
            window.removeEventListener('keydown', onDown)
            window.removeEventListener('keyup', onUp)
        }
    }, [])

    // ── Pointer events ────────────────────────────────────────────────────

    function handleResizeHandlePointerDown(groupId: string, handle: string, e: React.PointerEvent) {
        e.stopPropagation();
        onSelect({ id: groupId, type: 'group' });
        resizeDragRef.current = { id: groupId, handle };
        svgRef.current?.setPointerCapture(e.pointerId);
        setIsDragging(true);
    }

    // ── Connect handles ──────────────────────────────────────────────────

    function handleConnectHandlePointerDown(nodeId: string, e: React.PointerEvent) {
        e.stopPropagation();
        setPendingSourceId(nodeId);
        setPendingWaypointMode(e.altKey);
        setPendingWaypoints([]);
        setCursorPos(null);
        onSelect({ id: nodeId, type: 'node' });
    }

    function handleElementPointerDown(
        e: React.PointerEvent,
        id: string,
        type: SelectableElementType,
    ) {
        // Middle-mouse — let it bubble to SVG capture handler for panning
        if (e.button === 1) return;
        // Space held — treat as pan, not element drag
        if (spaceDown) {
            e.stopPropagation();
            panRef.current = true;
            setIsPanning(true);
            svgRef.current?.setPointerCapture(e.pointerId);
            return;
        }
        e.stopPropagation();

        // If a connection is pending, complete or cancel it
        if (pendingSourceId) {
            if (type === 'node' && pendingSourceId !== id) {
                onAddEdge(pendingSourceId, id, pendingWaypointMode && pendingWaypoints.length > 0 ? pendingWaypoints : undefined);
                setPendingSourceId(null);
                setPendingWaypointMode(false);
                setPendingWaypoints([]);
                setCursorPos(null);
                onSelect({ id, type });
                return;
            }
            // In waypoint mode, non-node elements (groups, texts) add a waypoint instead of cancelling
            if (pendingWaypointMode && type !== 'node' && svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                const zoom = viewRef.current?.zoom ?? 1;
                const offsetX = viewRef.current?.offsetX ?? 0;
                const offsetY = viewRef.current?.offsetY ?? 0;
                const rawX = (e.clientX - rect.left - offsetX) / zoom;
                const rawY = (e.clientY - rect.top - offsetY) / zoom;
                const sn = diagram.nodes.find(n => n.id === pendingSourceId);
                const snapSrc = pendingWaypoints.length > 0
                    ? pendingWaypoints[pendingWaypoints.length - 1]
                    : sn ? { x: sn.x + sn.width / 2, y: sn.y + sn.height / 2 } : { x: rawX, y: rawY };
                const adx = Math.abs(rawX - snapSrc.x);
                const ady = Math.abs(rawY - snapSrc.y);
                setPendingWaypoints(prev => [...prev, adx >= ady ? { x: rawX, y: snapSrc.y } : { x: snapSrc.x, y: rawY }]);
                return;
            }
            // Cancel pending edge
            setPendingSourceId(null);
            setPendingWaypointMode(false);
            setPendingWaypoints([]);
            setCursorPos(null);
            onSelect({ id, type });
            return;
        }

        // Ctrl+click → toggle multi-select, no drag
        if (e.ctrlKey || e.metaKey) {
            onToggleMultiSelect(id, type);
            return;
        }

        onSelect({ id, type });
        dragRef.current = { id, type, moved: false };
        svgRef.current?.setPointerCapture(e.pointerId);
        setIsDragging(true);
    }

    // Capture phase: fires before element handlers — used for middle-mouse pan
    function handleSvgPointerDownCapture(e: React.PointerEvent<SVGSVGElement>) {
        if (e.button === 1) {
            e.preventDefault();
            panRef.current = true;
            setIsPanning(true);
            svgRef.current?.setPointerCapture(e.pointerId);
        }
    }

    // Only fires for clicks directly on the SVG background because element
    // pointerDown calls stopPropagation
    function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
        if (e.button === 1) return; // handled in capture phase
        if (pendingSourceId) {
            if (pendingWaypointMode && svgRef.current) {
                // Waypoint mode: snap click to H or V and append
                const rect = svgRef.current.getBoundingClientRect();
                const zoom = viewRef.current?.zoom ?? 1;
                const offsetX = viewRef.current?.offsetX ?? 0;
                const offsetY = viewRef.current?.offsetY ?? 0;
                const rawX = (e.clientX - rect.left - offsetX) / zoom;
                const rawY = (e.clientY - rect.top - offsetY) / zoom;
                const sn = diagram.nodes.find(n => n.id === pendingSourceId);
                const snapSrc = pendingWaypoints.length > 0
                    ? pendingWaypoints[pendingWaypoints.length - 1]
                    : sn ? { x: sn.x + sn.width / 2, y: sn.y + sn.height / 2 } : { x: rawX, y: rawY };
                const adx = Math.abs(rawX - snapSrc.x);
                const ady = Math.abs(rawY - snapSrc.y);
                setPendingWaypoints(prev => [...prev, adx >= ady ? { x: rawX, y: snapSrc.y } : { x: snapSrc.x, y: rawY }]);
                return;
            }
            // Normal mode or waypoint mode click on background: cancel pending edge
            setPendingSourceId(null);
            setPendingWaypointMode(false);
            setPendingWaypoints([]);
            setCursorPos(null);
            return;
        }
        // Space+drag on background — pan instead of marquee
        if (spaceDown) {
            panRef.current = true;
            setIsPanning(true);
            svgRef.current?.setPointerCapture(e.pointerId);
            return;
        }
        // Record canvas-space start for marquee
        if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const zoom = viewRef.current?.zoom ?? 1;
            const offsetX = viewRef.current?.offsetX ?? 0;
            const offsetY = viewRef.current?.offsetY ?? 0;
            marqueeStartRef.current = {
                x: (e.clientX - rect.left - offsetX) / zoom,
                y: (e.clientY - rect.top - offsetY) / zoom,
            };
        }
        bgDownRef.current = true;
        bgMovedRef.current = false;
        svgRef.current?.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
        // Pan via middle-mouse or space+drag
        if (panRef.current) {
            onPan(e.movementX, e.movementY);
            return;
        }
        if (pendingSourceId && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const zoom = viewRef.current?.zoom ?? 1;
            const offsetX = viewRef.current?.offsetX ?? 0;
            const offsetY = viewRef.current?.offsetY ?? 0;
            setCursorPos({
                x: (e.clientX - rect.left - offsetX) / zoom,
                y: (e.clientY - rect.top - offsetY) / zoom,
            });
        }
        const resize = resizeDragRef.current;
        if (resize) {
            const zoom = viewRef.current?.zoom ?? 1;
            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;
            onResizeGroup(resize.id, resize.handle, dx, dy);
            return;
        }
        const drag = dragRef.current;
        if (drag) {
            const zoom = viewRef.current?.zoom ?? 1;
            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                drag.moved = true;
            }
            onMove(drag.id, drag.type, dx, dy);
            return;
        }
        // Background left-drag — draw marquee
        if (bgDownRef.current && marqueeStartRef.current && svgRef.current) {
            bgMovedRef.current = true;
            const rect = svgRef.current.getBoundingClientRect();
            const zoom = viewRef.current?.zoom ?? 1;
            const offsetX = viewRef.current?.offsetX ?? 0;
            const offsetY = viewRef.current?.offsetY ?? 0;
            const ex = (e.clientX - rect.left - offsetX) / zoom;
            const ey = (e.clientY - rect.top - offsetY) / zoom;
            setMarqueeBox({
                x1: marqueeStartRef.current.x,
                y1: marqueeStartRef.current.y,
                x2: ex,
                y2: ey,
            });
        }
    }

    function handlePointerUp() {
        // End pan mode
        if (panRef.current) {
            panRef.current = false;
            setIsPanning(false);
            return;
        }
        const wasBackground = bgDownRef.current;
        const wasMoved = bgMovedRef.current;
        bgDownRef.current = false;
        bgMovedRef.current = false;
        marqueeStartRef.current = null;
        resizeDragRef.current = null;
        dragRef.current = null;
        setIsDragging(false);
        // Commit or clear marquee
        if (marqueeBox) {
            onMarqueeComplete(marqueeBox);
            setMarqueeBox(null);
            return;
        }
        // Deselect only when clicking the background without dragging
        if (wasBackground && !wasMoved) {
            onSelect(null);
        }
    }

    const pendingSourceNode = pendingSourceId
        ? diagram.nodes.find(n => n.id === pendingSourceId) ?? null
        : null;

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'visible',
                cursor: isDragging || isPanning ? 'grabbing' : pendingSourceId ? 'crosshair' : spaceDown ? 'grab' : 'default',
                userSelect: 'none',
            }}
            onPointerDownCapture={handleSvgPointerDownCapture}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <g transform={`translate(${viewport.offsetX},${viewport.offsetY}) scale(${viewport.zoom})`}>
                {/* Groups render first (behind everything) */}
                {diagram.groups.map((group) => (
                    <GroupRenderer
                        key={group.id}
                        group={group}
                        isSelected={(selection?.type === 'group' && selection.id === group.id) || multiSelectionIds.includes(group.id)}
                        onSelect={() => onSelect({ id: group.id, type: 'group' })}
                        onPointerDown={e => handleElementPointerDown(e, group.id, 'group')}
                        onResizeStart={(handle, e) => handleResizeHandlePointerDown(group.id, handle, e)}
                    />
                ))}
                {/* Rubber band preview while connecting */}
                {pendingSourceNode && cursorPos && (() => {
                    if (pendingWaypointMode) {
                        const srcCx = pendingSourceNode.x + pendingSourceNode.width / 2;
                        const srcCy = pendingSourceNode.y + pendingSourceNode.height / 2;
                        const snapSrc = pendingWaypoints.length > 0
                            ? pendingWaypoints[pendingWaypoints.length - 1]
                            : { x: srcCx, y: srcCy };
                        const adx = Math.abs(cursorPos.x - snapSrc.x);
                        const ady = Math.abs(cursorPos.y - snapSrc.y);
                        const snapped = adx >= ady ? { x: cursorPos.x, y: snapSrc.y } : { x: snapSrc.x, y: cursorPos.y };
                        const firstTarget = pendingWaypoints.length > 0 ? pendingWaypoints[0] : snapped;
                        const pSrc = getNodeEdgePoint(pendingSourceNode, firstTarget.x, firstTarget.y);
                        return (
                            <path
                                d={buildWaypointPath([pSrc, ...pendingWaypoints, snapped])}
                                stroke="#6366f1"
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                                fill="none"
                                style={{ pointerEvents: 'none' }}
                            />
                        );
                    }
                    const sp = getNodeEdgePoint(pendingSourceNode, cursorPos.x, cursorPos.y);
                    return (
                        <line
                            x1={sp.x} y1={sp.y} x2={cursorPos.x} y2={cursorPos.y}
                            stroke="#6366f1"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })()}
                {/* Edges render behind nodes */}
                {diagram.edges.map((edge) => (
                    <EdgeRenderer
                        key={edge.id}
                        edge={edge}
                        sourceNode={diagram.nodes.find(n => n.id === edge.sourceId)}
                        targetNode={diagram.nodes.find(n => n.id === edge.targetId)}
                        isSelected={(selection?.type === 'edge' && selection.id === edge.id) || multiSelectionIds.includes(edge.id)}
                        onSelect={() => onSelect({ id: edge.id, type: 'edge' })}
                        defaultRouting={diagram.defaultEdgeRouting}
                    />
                ))}
                {diagram.nodes.map((node) => {
                    const isNodeSelected = (selection?.type === 'node' && selection.id === node.id) || multiSelectionIds.includes(node.id)
                    const isPendingSource = pendingSourceId === node.id
                    const cx = node.x + node.width / 2
                    const cy = node.y + node.height / 2
                    // Show handles only when selected and not currently a pending source
                    const showHandles = isNodeSelected && !pendingSourceId
                    return (
                        <g
                            key={node.id}
                            style={{ cursor: isDragging || isPanning ? 'grabbing' : pendingSourceId ? 'crosshair' : 'grab' }}
                            onPointerDown={e => handleElementPointerDown(e, node.id, 'node')}
                        >
                            <NodeRenderer
                                node={node}
                                isSelected={isNodeSelected}
                                onSelect={() => onSelect({ id: node.id, type: 'node' })}
                            />

                            {/* Pending source ring */}
                            {isPendingSource && (
                                <rect
                                    x={node.x - 4}
                                    y={node.y - 4}
                                    width={node.width + 8}
                                    height={node.height + 8}
                                    rx={4}
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="5 3"
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}

                            {/* NESW connection handles — visible when node is selected */}
                            {showHandles && [
                                { x: cx, y: node.y, label: 'n' },
                                { x: node.x + node.width, y: cy, label: 'e' },
                                { x: cx, y: node.y + node.height, label: 's' },
                                { x: node.x, y: cy, label: 'w' },
                            ].map(h => (
                                altDown ? (
                                    <g
                                        key={h.label}
                                        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                                        onPointerDown={e => handleConnectHandlePointerDown(node.id, e)}
                                    >
                                        <circle cx={h.x} cy={h.y} r={8} fill="#1e2535" stroke="#6366f1" strokeWidth={1.5} />
                                        <line x1={h.x - 4} y1={h.y} x2={h.x + 4} y2={h.y} stroke="#6366f1" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                                        <line x1={h.x} y1={h.y - 4} x2={h.x} y2={h.y + 4} stroke="#6366f1" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                                    </g>
                                ) : (
                                    <circle
                                        key={h.label}
                                        cx={h.x}
                                        cy={h.y}
                                        r={5}
                                        fill="#6366f1"
                                        stroke="white"
                                        strokeWidth={1.5}
                                        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                                        onPointerDown={e => handleConnectHandlePointerDown(node.id, e)}
                                    />
                                )
                            ))}
                        </g>
                    )
                })}
                {diagram.texts.map((text) => (
                    <g
                        key={text.id}
                        style={{ cursor: isDragging || isPanning ? 'grabbing' : 'grab' }}
                        onPointerDown={e => handleElementPointerDown(e, text.id, 'text')}
                    >
                        <TextElementRenderer
                            element={text}
                            isSelected={(selection?.type === 'text' && selection.id === text.id) || multiSelectionIds.includes(text.id)}
                            onSelect={() => onSelect({ id: text.id, type: 'text' })}
                        />
                    </g>
                ))}
                {/* Marquee selection rectangle */}
                {marqueeBox && (() => {
                    const x = Math.min(marqueeBox.x1, marqueeBox.x2);
                    const y = Math.min(marqueeBox.y1, marqueeBox.y2);
                    const w = Math.abs(marqueeBox.x2 - marqueeBox.x1);
                    const h = Math.abs(marqueeBox.y2 - marqueeBox.y1);
                    return (
                        <rect
                            x={x} y={y} width={w} height={h}
                            fill="rgba(99,102,241,0.07)"
                            stroke="#6366f1"
                            strokeWidth={1 / viewport.zoom}
                            strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })()}
            </g>
        </svg>
    );
};

export default SvgCanvas;
