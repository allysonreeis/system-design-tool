import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import NodeLabel from './NodeLabel';

interface RectangleNodeProps {
    node: DiagramNode;
    isSelected: boolean;
    onSelect: () => void;
}

const FILL = '#1e2535';
const STROKE = '#3d4f6e';
const STROKE_WIDTH = 1.5;
const SEL_STROKE = '#6366f1';
const SEL_PAD = 4;

const RectangleNode: React.FC<RectangleNodeProps> = ({ node, isSelected, onSelect }) => {
    const { x, y, width, height, label, style } = node;
    const fill = style?.fillColor ?? FILL;
    const stroke = style?.strokeColor ?? STROKE;
    const strokeWidth = style?.strokeWidth ?? STROKE_WIDTH;

    return (
        <g onClick={onSelect} style={{ cursor: 'pointer' }}>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                rx={0}
            />
            <NodeLabel
                x={x}
                y={y}
                width={width}
                height={height}
                label={label}
                textColor={style?.textColor}
                fontSize={style?.fontSize}
            />
            {isSelected && (
                <rect
                    x={x - SEL_PAD}
                    y={y - SEL_PAD}
                    width={width + SEL_PAD * 2}
                    height={height + SEL_PAD * 2}
                    fill="none"
                    stroke={SEL_STROKE}
                    strokeWidth={1.5}
                    rx={2}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

export default RectangleNode;
