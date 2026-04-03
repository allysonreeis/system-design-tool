import React from 'react';
import type { DiagramGroup } from '@/types/diagram';

interface GroupRendererProps {
    group: DiagramGroup;
    isSelected: boolean;
    onSelect: () => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onResizeStart: (handle: string, e: React.PointerEvent) => void;
}

const D_FILL = '#6366f1';
const D_FILL_OPACITY = 0.06;
const D_STROKE = '#6366f1';
const D_STROKE_WIDTH = 1.5;
const D_BORDER_STYLE = 'dashed';
const D_RADIUS = 8;
const D_TITLE_COLOR = '#a5b4fc';
const D_TITLE_FONT_SIZE = 11;
const SEL_STROKE = '#6366f1';
const SEL_PAD = 4;
const HANDLE_SIZE = 7;

const RESIZE_CURSORS: Record<string, string> = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
    e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
    sw: 'nesw-resize', w: 'ew-resize',
};

const GroupRenderer: React.FC<GroupRendererProps> = ({ group, isSelected, onSelect, onPointerDown, onResizeStart }) => {
    const { x, y, width, height, title, style } = group;
    const fillColor = style?.fillColor ?? D_FILL;
    const fillOpacity = style?.fillOpacity ?? D_FILL_OPACITY;
    const strokeColor = style?.strokeColor ?? D_STROKE;
    const strokeWidth = style?.strokeWidth ?? D_STROKE_WIDTH;
    const borderStyle = style?.strokeBorderStyle ?? D_BORDER_STYLE;
    const radius = style?.borderRadius ?? D_RADIUS;
    const titleColor = style?.titleColor ?? D_TITLE_COLOR;
    const titleFontSize = style?.titleFontSize ?? D_TITLE_FONT_SIZE;

    let strokeDasharray: string | undefined;
    if (borderStyle === 'dashed') strokeDasharray = '8 5';
    else if (borderStyle === 'dotted') strokeDasharray = `${strokeWidth} 5`;

    const cx = x + width / 2;
    const cy = y + height / 2;
    const resizeHandles = [
        { id: 'nw', hx: x, hy: y },
        { id: 'n', hx: cx, hy: y },
        { id: 'ne', hx: x + width, hy: y },
        { id: 'e', hx: x + width, hy: cy },
        { id: 'se', hx: x + width, hy: y + height },
        { id: 's', hx: cx, hy: y + height },
        { id: 'sw', hx: x, hy: y + height },
        { id: 'w', hx: x, hy: cy },
    ];

    return (
        <g>
            {/* Fill layer — interactive so the group interior can be dragged */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={radius}
                fill={fillColor}
                fillOpacity={fillOpacity}
                stroke="none"
                style={{ cursor: 'grab' }}
                onClick={onSelect}
                onPointerDown={onPointerDown}
            />
            {/* Stroke layer */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                style={{ pointerEvents: 'none' }}
            />
            {/* Title */}
            {title && (
                <text
                    x={x + radius + 4}
                    y={y + titleFontSize + 4}
                    fontSize={titleFontSize}
                    fill={titleColor}
                    fontFamily="Inter, sans-serif"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                    {title}
                </text>
            )}
            {/* Selection ring */}
            {isSelected && (
                <rect
                    x={x - SEL_PAD}
                    y={y - SEL_PAD}
                    width={width + SEL_PAD * 2}
                    height={height + SEL_PAD * 2}
                    rx={radius + SEL_PAD}
                    fill="none"
                    stroke={SEL_STROKE}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    style={{ pointerEvents: 'none' }}
                />
            )}
            {/* Resize handles — only when selected */}
            {isSelected && resizeHandles.map(h => (
                <rect
                    key={h.id}
                    x={h.hx - HANDLE_SIZE / 2}
                    y={h.hy - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    rx={1.5}
                    fill="#0f1117"
                    stroke={SEL_STROKE}
                    strokeWidth={1.5}
                    style={{ cursor: RESIZE_CURSORS[h.id] }}
                    onPointerDown={e => { e.stopPropagation(); onResizeStart(h.id, e); }}
                />
            ))}
        </g>
    );
};

export default GroupRenderer;
