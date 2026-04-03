import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import NodeLabel from './NodeLabel';

interface CircleNodeProps {
    node: DiagramNode;
    isSelected: boolean;
    onSelect: () => void;
}

const FILL = '#1e2535';
const STROKE = '#3d4f6e';
const STROKE_WIDTH = 1.5;
const SEL_STROKE = '#6366f1';
const SEL_PAD = 4;

const CircleNode: React.FC<CircleNodeProps> = ({ node, isSelected, onSelect }) => {
    const { x, y, width, height, label, style } = node;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = Math.min(width, height) / 2;
    const fill = style?.fillColor ?? FILL;
    const stroke = style?.strokeColor ?? STROKE;
    const strokeWidth = style?.strokeWidth ?? STROKE_WIDTH;

    return (
        <g onClick={onSelect} style={{ cursor: 'pointer' }}>
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
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
                <circle
                    cx={cx}
                    cy={cy}
                    r={r + SEL_PAD}
                    fill="none"
                    stroke={SEL_STROKE}
                    strokeWidth={1.5}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

export default CircleNode;
