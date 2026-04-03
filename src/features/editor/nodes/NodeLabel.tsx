import React from 'react';

interface NodeLabelProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    textColor?: string;
    fontSize?: number;
}

const NodeLabel: React.FC<NodeLabelProps> = ({
    x,
    y,
    width,
    height,
    label,
    textColor = '#e2e8f0',
    fontSize = 13,
}) => (
    <text
        x={x + width / 2}
        y={y + height / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={fontSize}
        fill={textColor}
        style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'Inter, sans-serif' }}
    >
        {label}
    </text>
);

export default NodeLabel;
