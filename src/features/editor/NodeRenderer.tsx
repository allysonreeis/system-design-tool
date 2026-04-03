import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import RectangleNode from './nodes/RectangleNode';
import RoundedRectangleNode from './nodes/RoundedRectangleNode';
import CircleNode from './nodes/CircleNode';
import DatabaseNode from './nodes/DatabaseNode';
import DiamondNode from './nodes/DiamondNode';
import QueueNode from './nodes/QueueNode';
import ClientNode from './nodes/ClientNode';
import CacheNode from './nodes/CacheNode';

interface NodeRendererProps {
    node: DiagramNode;
    isSelected: boolean;
    onSelect: () => void;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ node, isSelected, onSelect }) => {
    switch (node.type) {
        case 'rectangle':
            return <RectangleNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'rounded-rectangle':
            return <RoundedRectangleNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'circle':
            return <CircleNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'database':
            return <DatabaseNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'diamond':
            return <DiamondNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'queue':
            return <QueueNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'client':
            return <ClientNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        case 'cache':
            return <CacheNode node={node} isSelected={isSelected} onSelect={onSelect} />;
        default:
            return null;
    }
};

export default NodeRenderer;
