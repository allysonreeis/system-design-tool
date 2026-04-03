import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import NodeLabel from './NodeLabel';

interface DatabaseNodeProps {
    node: DiagramNode;
    isSelected: boolean;
    onSelect: () => void;
}

const FILL = '#1e2535';
const STROKE = '#3d4f6e';
const STROKE_WIDTH = 1.5;
const SEL_STROKE = '#6366f1';
const SEL_PAD = 4;
const ELLIPSE_RY_RATIO = 0.12; // ry as fraction of height

const DatabaseNode: React.FC<DatabaseNodeProps> = ({ node, isSelected, onSelect }) => {
    const { x, y, width, height, label, style } = node;
    const fill = style?.fillColor ?? FILL;
    const stroke = style?.strokeColor ?? STROKE;
    const strokeWidth = style?.strokeWidth ?? STROKE_WIDTH;
    const ry = Math.max(6, height * ELLIPSE_RY_RATIO);
    const cx = x + width / 2;

    return (
        <g onClick={onSelect} style={{ cursor: 'pointer' }}>
            {/* Body */}
            <rect
                x={x}
                y={y + ry}
                width={width}
                height={height - ry * 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
            {/* Bottom ellipse — outline only to close the cylinder */}
            <ellipse
                cx={cx}
                cy={y + height - ry}
                rx={width / 2}
                ry={ry}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
            {/* Top ellipse — filled lighter to show the cap */}
            <ellipse
                cx={cx}
                cy={y + ry}
                rx={width / 2}
                ry={ry}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
            <NodeLabel
                x={x}
                y={y + ry}
                width={width}
                height={height - ry * 2}
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
                    rx={4}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

export default DatabaseNode;
