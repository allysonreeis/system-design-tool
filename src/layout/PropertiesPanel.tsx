import { useEffect, useState } from 'react'
import type { Diagram, DiagramNode, DiagramEdge, TextElement, DiagramElementStyle, EdgeLineStyle, ArrowType, EdgeRouting, DiagramGroup, GroupStyle, GroupBorderStyle } from '@/types/diagram'
import type { Selection } from '@/hooks/useEditorState'

// ── Default style values (must match renderer defaults) ──────────────────────

const D_FILL = '#1e2535'
const D_STROKE = '#3d4f6e'
const D_TEXT = '#e2e8f0'
const D_FONT_SIZE = 14
const D_EDGE_STROKE = '#5b6899'

interface PanelProps {
    diagram: Diagram
    selection: Selection | null
    multiSelectionCount: number
    onUpdateNode: (id: string, label: string, style: DiagramElementStyle) => void
    onUpdateText: (id: string, content: string, style: DiagramElementStyle) => void
    onUpdateEdge: (id: string, label: string, style: DiagramElementStyle) => void
    onUpdateGroup: (id: string, title: string, style: GroupStyle) => void
    onUpdateDiagramSettings: (defaultEdgeRouting: EdgeRouting) => void
}

export default function PropertiesPanel({ diagram, selection, multiSelectionCount, onUpdateNode, onUpdateText, onUpdateEdge, onUpdateGroup, onUpdateDiagramSettings }: PanelProps) {
    const node = selection?.type === 'node'
        ? diagram.nodes.find(n => n.id === selection.id) ?? null
        : null
    const text = selection?.type === 'text'
        ? diagram.texts.find(t => t.id === selection.id) ?? null
        : null
    const edge = selection?.type === 'edge'
        ? diagram.edges.find(e => e.id === selection.id) ?? null
        : null
    const group = selection?.type === 'group'
        ? diagram.groups.find(g => g.id === selection.id) ?? null
        : null

    return (
        <aside className="w-56 flex flex-col bg-zinc-950 border-l border-zinc-800 shrink-0 select-none">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    Properties
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {multiSelectionCount > 1 && (
                    <div className="px-4 py-3 text-zinc-400 text-[12px]">
                        {multiSelectionCount} elements selected
                    </div>
                )}
                {multiSelectionCount <= 1 && selection === null && (
                    <DiagramSettingsPanel
                        defaultEdgeRouting={diagram.defaultEdgeRouting}
                        onUpdateDiagramSettings={onUpdateDiagramSettings}
                    />
                )}
                {node && (
                    <NodeEditor key={node.id} node={node} onUpdate={onUpdateNode} />
                )}
                {text && (
                    <TextEditor key={text.id} text={text} onUpdate={onUpdateText} />
                )}
                {edge && (
                    <EdgeEditor key={edge.id} edge={edge} onUpdate={onUpdateEdge} />
                )}
                {group && (
                    <GroupEditor key={group.id} group={group} onUpdate={onUpdateGroup} />
                )}
            </div>
        </aside>
    )
}

// ── Node editor ───────────────────────────────────────────────────────────────

function NodeEditor({
    node,
    onUpdate,
}: {
    node: DiagramNode
    onUpdate: (id: string, label: string, style: DiagramElementStyle) => void
}) {
    const [label, setLabel] = useState(node.label)
    const [fill, setFill] = useState(node.style?.fillColor ?? D_FILL)
    const [stroke, setStroke] = useState(node.style?.strokeColor ?? D_STROKE)
    const [textColor, setTextColor] = useState(node.style?.textColor ?? D_TEXT)

    // Sync if selection changes to a different node
    useEffect(() => {
        setLabel(node.label)
        setFill(node.style?.fillColor ?? D_FILL)
        setStroke(node.style?.strokeColor ?? D_STROKE)
        setTextColor(node.style?.textColor ?? D_TEXT)
    }, [node.id])

    function commit(overrides?: Partial<{ label: string; fill: string; stroke: string; textColor: string }>) {
        const l = overrides?.label ?? label
        const f = overrides?.fill ?? fill
        const s = overrides?.stroke ?? stroke
        const tc = overrides?.textColor ?? textColor
        onUpdate(node.id, l, { fillColor: f, strokeColor: s, textColor: tc })
    }

    return (
        <div className="flex flex-col gap-5 px-4 py-4">
            <TypeBadge type={node.type} />

            <Section label="Label">
                <PanelInput
                    value={label}
                    onChange={v => { setLabel(v); commit({ label: v }) }}
                />
            </Section>

            <Section label="Colors">
                <ColorField
                    label="Fill"
                    value={fill}
                    onChange={v => { setFill(v); commit({ fill: v }) }}
                />
                <ColorField
                    label="Stroke"
                    value={stroke}
                    onChange={v => { setStroke(v); commit({ stroke: v }) }}
                />
                <ColorField
                    label="Text"
                    value={textColor}
                    onChange={v => { setTextColor(v); commit({ textColor: v }) }}
                />
            </Section>

            <InfoRow label="Position" value={`${node.x}, ${node.y}`} />
            <InfoRow label="Size" value={`${node.width} × ${node.height}`} />

            <div className="pt-1 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-700 font-mono break-all">{node.id}</p>
            </div>
        </div>
    )
}

// ── Text editor ───────────────────────────────────────────────────────────────

function TextEditor({
    text,
    onUpdate,
}: {
    text: TextElement
    onUpdate: (id: string, content: string, style: DiagramElementStyle) => void
}) {
    const [content, setContent] = useState(text.content)
    const [textColor, setTextColor] = useState(text.style?.textColor ?? D_TEXT)
    const [fontSize, setFontSize] = useState(text.style?.fontSize ?? D_FONT_SIZE)

    useEffect(() => {
        setContent(text.content)
        setTextColor(text.style?.textColor ?? D_TEXT)
        setFontSize(text.style?.fontSize ?? D_FONT_SIZE)
    }, [text.id])

    function commit(overrides?: Partial<{ content: string; textColor: string; fontSize: number }>) {
        const c = overrides?.content ?? content
        const tc = overrides?.textColor ?? textColor
        const fs = overrides?.fontSize ?? fontSize
        onUpdate(text.id, c, { textColor: tc, fontSize: fs })
    }

    return (
        <div className="flex flex-col gap-5 px-4 py-4">
            <TypeBadge type="text" />

            <Section label="Content">
                <PanelInput
                    value={content}
                    onChange={v => { setContent(v); commit({ content: v }) }}
                />
            </Section>

            <Section label="Style">
                <ColorField
                    label="Color"
                    value={textColor}
                    onChange={v => { setTextColor(v); commit({ textColor: v }) }}
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-zinc-500">Font size</span>
                    <input
                        type="number"
                        min={8}
                        max={72}
                        value={fontSize}
                        onChange={e => {
                            const v = Math.max(8, Math.min(72, Number(e.target.value)))
                            setFontSize(v)
                            commit({ fontSize: v })
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </Section>

            <InfoRow label="Position" value={`${text.x}, ${text.y}`} />

            <div className="pt-1 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-700 font-mono break-all">{text.id}</p>
            </div>
        </div>
    )
}

// ── Edge editor ───────────────────────────────────────────────────────────────

function EdgeEditor({
    edge,
    onUpdate,
}: {
    edge: DiagramEdge
    onUpdate: (id: string, label: string, style: DiagramElementStyle) => void
}) {
    const [label, setLabel] = useState(edge.label ?? '')
    const [strokeColor, setStrokeColor] = useState(edge.style?.strokeColor ?? D_EDGE_STROKE)
    const [lineStyle, setLineStyle] = useState<EdgeLineStyle>(edge.style?.lineStyle ?? 'solid')
    const [arrowType, setArrowType] = useState<ArrowType>(edge.style?.arrowType ?? 'arrow')
    const [routing, setRouting] = useState<EdgeRouting>(edge.style?.routing ?? 'straight')

    useEffect(() => {
        setLabel(edge.label ?? '')
        setStrokeColor(edge.style?.strokeColor ?? D_EDGE_STROKE)
        setLineStyle(edge.style?.lineStyle ?? 'solid')
        setArrowType(edge.style?.arrowType ?? 'arrow')
        setRouting(edge.style?.routing ?? 'straight')
    }, [edge.id])

    function commit(overrides?: Partial<{ label: string; strokeColor: string; lineStyle: EdgeLineStyle; arrowType: ArrowType; routing: EdgeRouting }>) {
        const l = overrides?.label ?? label
        const sc = overrides?.strokeColor ?? strokeColor
        const ls = overrides?.lineStyle ?? lineStyle
        const at = overrides?.arrowType ?? arrowType
        const rt = overrides?.routing ?? routing
        onUpdate(edge.id, l, { strokeColor: sc, lineStyle: ls, arrowType: at, routing: rt })
    }

    return (
        <div className="flex flex-col gap-5 px-4 py-4">
            <TypeBadge type="edge" />

            <Section label="Label">
                <PanelInput
                    value={label}
                    onChange={v => { setLabel(v); commit({ label: v }) }}
                />
            </Section>

            <Section label="Style">
                <ColorField
                    label="Color"
                    value={strokeColor}
                    onChange={v => { setStrokeColor(v); commit({ strokeColor: v }) }}
                />
                <SelectField
                    label="Line"
                    value={lineStyle}
                    options={[
                        { value: 'solid', label: 'Solid' },
                        { value: 'dashed', label: 'Dashed' },
                        { value: 'dotted', label: 'Dotted' },
                    ]}
                    onChange={v => { const val = v as EdgeLineStyle; setLineStyle(val); commit({ lineStyle: val }) }}
                />
                <SelectField
                    label="Arrow"
                    value={arrowType}
                    options={[
                        { value: 'arrow', label: 'Filled' },
                        { value: 'open-arrow', label: 'Open' },
                        { value: 'double', label: 'Double' },
                        { value: 'diamond', label: 'Diamond' },
                        { value: 'none', label: 'None' },
                    ]}
                    onChange={v => { const val = v as ArrowType; setArrowType(val); commit({ arrowType: val }) }}
                />
                <SelectField
                    label="Route"
                    value={routing}
                    options={[
                        { value: 'straight', label: 'Straight' },
                        { value: 'curved', label: 'Curved' },
                        { value: 'orthogonal', label: 'Orthogonal' },
                    ]}
                    onChange={v => { const val = v as EdgeRouting; setRouting(val); commit({ routing: val }) }}
                />
            </Section>

            <div className="pt-1 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-700 font-mono break-all">{edge.id}</p>
            </div>
        </div>
    )
}

// ── Group editor ──────────────────────────────────────────────────────────────

const D_GROUP_FILL = '#6366f1'
const D_GROUP_FILL_OPACITY = 0.06
const D_GROUP_STROKE = '#6366f1'
const D_GROUP_STROKE_WIDTH = 1.5
const D_GROUP_BORDER_STYLE: GroupBorderStyle = 'dashed'
const D_GROUP_RADIUS = 8
const D_GROUP_TITLE_COLOR = '#a5b4fc'
const D_GROUP_TITLE_FONT_SIZE = 11

function GroupEditor({
    group,
    onUpdate,
}: {
    group: DiagramGroup
    onUpdate: (id: string, title: string, style: GroupStyle) => void
}) {
    const [title, setTitle] = useState(group.title ?? '')
    const [fillColor, setFillColor] = useState(group.style?.fillColor ?? D_GROUP_FILL)
    const [fillOpacity, setFillOpacity] = useState(group.style?.fillOpacity ?? D_GROUP_FILL_OPACITY)
    const [strokeColor, setStrokeColor] = useState(group.style?.strokeColor ?? D_GROUP_STROKE)
    const [strokeWidth, setStrokeWidth] = useState(group.style?.strokeWidth ?? D_GROUP_STROKE_WIDTH)
    const [borderStyle, setBorderStyle] = useState<GroupBorderStyle>(group.style?.strokeBorderStyle ?? D_GROUP_BORDER_STYLE)
    const [borderRadius, setBorderRadius] = useState(group.style?.borderRadius ?? D_GROUP_RADIUS)
    const [titleColor, setTitleColor] = useState(group.style?.titleColor ?? D_GROUP_TITLE_COLOR)
    const [titleFontSize, setTitleFontSize] = useState(group.style?.titleFontSize ?? D_GROUP_TITLE_FONT_SIZE)

    useEffect(() => {
        setTitle(group.title ?? '')
        setFillColor(group.style?.fillColor ?? D_GROUP_FILL)
        setFillOpacity(group.style?.fillOpacity ?? D_GROUP_FILL_OPACITY)
        setStrokeColor(group.style?.strokeColor ?? D_GROUP_STROKE)
        setStrokeWidth(group.style?.strokeWidth ?? D_GROUP_STROKE_WIDTH)
        setBorderStyle(group.style?.strokeBorderStyle ?? D_GROUP_BORDER_STYLE)
        setBorderRadius(group.style?.borderRadius ?? D_GROUP_RADIUS)
        setTitleColor(group.style?.titleColor ?? D_GROUP_TITLE_COLOR)
        setTitleFontSize(group.style?.titleFontSize ?? D_GROUP_TITLE_FONT_SIZE)
    }, [group.id])

    function commit(overrides?: Partial<{
        title: string; fillColor: string; fillOpacity: number
        strokeColor: string; strokeWidth: number; borderStyle: GroupBorderStyle
        borderRadius: number; titleColor: string; titleFontSize: number
    }>) {
        const t = overrides?.title ?? title
        const fc = overrides?.fillColor ?? fillColor
        const fo = overrides?.fillOpacity ?? fillOpacity
        const sc = overrides?.strokeColor ?? strokeColor
        const sw = overrides?.strokeWidth ?? strokeWidth
        const bs = overrides?.borderStyle ?? borderStyle
        const br = overrides?.borderRadius ?? borderRadius
        const tc = overrides?.titleColor ?? titleColor
        const tfs = overrides?.titleFontSize ?? titleFontSize
        onUpdate(group.id, t, {
            fillColor: fc, fillOpacity: fo,
            strokeColor: sc, strokeWidth: sw, strokeBorderStyle: bs,
            borderRadius: br, titleColor: tc, titleFontSize: tfs,
        })
    }

    return (
        <div className="flex flex-col gap-5 px-4 py-4">
            <TypeBadge type="group" />

            <Section label="Title">
                <PanelInput
                    value={title}
                    onChange={v => { setTitle(v); commit({ title: v }) }}
                />
            </Section>

            <Section label="Fill">
                <ColorField
                    label="Color"
                    value={fillColor}
                    onChange={v => { setFillColor(v); commit({ fillColor: v }) }}
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-zinc-500">Opacity</span>
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={fillOpacity}
                        onChange={e => {
                            const v = Math.max(0, Math.min(1, Number(e.target.value)))
                            setFillOpacity(v)
                            commit({ fillOpacity: v })
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </Section>

            <Section label="Border">
                <ColorField
                    label="Color"
                    value={strokeColor}
                    onChange={v => { setStrokeColor(v); commit({ strokeColor: v }) }}
                />
                <SelectField
                    label="Style"
                    value={borderStyle}
                    options={[
                        { value: 'solid', label: 'Solid' },
                        { value: 'dashed', label: 'Dashed' },
                        { value: 'dotted', label: 'Dotted' },
                    ]}
                    onChange={v => { const val = v as GroupBorderStyle; setBorderStyle(val); commit({ borderStyle: val }) }}
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-zinc-500">Width</span>
                    <input
                        type="number"
                        min={0.5}
                        max={6}
                        step={0.5}
                        value={strokeWidth}
                        onChange={e => {
                            const v = Number(e.target.value)
                            setStrokeWidth(v)
                            commit({ strokeWidth: v })
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-zinc-500">Radius</span>
                    <input
                        type="number"
                        min={0}
                        max={40}
                        step={1}
                        value={borderRadius}
                        onChange={e => {
                            const v = Number(e.target.value)
                            setBorderRadius(v)
                            commit({ borderRadius: v })
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </Section>

            <Section label="Label">
                <ColorField
                    label="Color"
                    value={titleColor}
                    onChange={v => { setTitleColor(v); commit({ titleColor: v }) }}
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-zinc-500">Font size</span>
                    <input
                        type="number"
                        min={8}
                        max={24}
                        step={1}
                        value={titleFontSize}
                        onChange={e => {
                            const v = Number(e.target.value)
                            setTitleFontSize(v)
                            commit({ titleFontSize: v })
                        }}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </Section>

            <InfoRow label="Position" value={`${group.x}, ${group.y}`} />
            <InfoRow label="Size" value={`${group.width} × ${group.height}`} />

            <div className="pt-1 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-700 font-mono break-all">{group.id}</p>
            </div>
        </div>
    )
}

// ── Diagram settings panel ────────────────────────────────────────────────────

function DiagramSettingsPanel({
    defaultEdgeRouting,
    onUpdateDiagramSettings,
}: {
    defaultEdgeRouting: EdgeRouting
    onUpdateDiagramSettings: (defaultEdgeRouting: EdgeRouting) => void
}) {
    return (
        <div className="flex flex-col gap-5 px-4 py-4">
            <span className="self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Diagram
            </span>

            <Section label="Connection defaults">
                <SelectField
                    label="Route"
                    value={defaultEdgeRouting}
                    options={[
                        { value: 'straight', label: 'Straight' },
                        { value: 'curved', label: 'Curved' },
                        { value: 'orthogonal', label: 'Orthogonal' },
                    ]}
                    onChange={v => onUpdateDiagramSettings(v as EdgeRouting)}
                />
            </Section>

            <p className="text-[11px] text-zinc-600 leading-relaxed">
                Select an element to edit its properties.
            </p>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
    return (
        <span className="self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {type}
        </span>
    )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</span>
            {children}
        </div>
    )
}

function PanelInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-[12px] text-zinc-100 focus:outline-none focus:border-indigo-500 select-text"
        />
    )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-mono">{value}</span>
                <label className="relative cursor-pointer">
                    <div
                        className="w-5 h-5 rounded-sm border border-zinc-600 shrink-0"
                        style={{ backgroundColor: value }}
                    />
                    <input
                        type="color"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </label>
            </div>
        </div>
    )
}

function SelectField({ label, value, options, onChange }: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{label}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[12px] text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</span>
            <span className="text-[12px] text-zinc-500">{value}</span>
        </div>
    )
}

