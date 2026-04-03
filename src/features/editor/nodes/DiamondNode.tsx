import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import NodeLabel from './NodeLabel';

interface DiamondNodeProps {
    node: DiagramNode;
    isSelected: boolean;
    onSelect: () => void;
}

const FILL = '#1e2535';
const STROKE = '#3d4f6e';
const STROKE_WIDTH = 1.5;
const SEL_STROKE = '#6366f1';
const SEL_PAD = 4;

const DiamondNode: React.FC<DiamondNodeProps> = ({ node, isSelected, onSelect }) => {
    const { x, y, width, height, label, style } = node;
    const fill = style?.fillColor ?? FILL;
    const stroke = style?.strokeColor ?? STROKE;
    const strokeWidth = style?.strokeWidth ?? STROKE_WIDTH;

    const cx = x + width / 2;
    const cy = y + height / 2;
    const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`;

    return (
        <g onClick={onSelect} style={{ cursor: 'pointer' }}>
            <polygon
                points={points}
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
                <polygon
                    points={`${cx},${y - SEL_PAD} ${x + width + SEL_PAD},${cy} ${cx},${y + height + SEL_PAD} ${x - SEL_PAD},${cy}`}
                    fill="none"
                    stroke={SEL_STROKE}
                    strokeWidth={1.5}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

export default DiamondNode;
