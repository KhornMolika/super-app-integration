"use client";

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const StateNode = ({ data }: { data: any }) => {
  return (
    <div className={`px-3 py-2 rounded shadow-sm border-2 font-mono text-[11px] tracking-wider font-bold text-center ${data.colorClass} min-w-[150px]`}>
      {data.targetHandle && <Handle type="target" position={data.targetHandle} className="!w-1.5 !h-1.5 !bg-slate-400 !border-0" />}
      {data.label}
      {data.sourceHandle && <Handle type="source" position={data.sourceHandle} className="!w-1.5 !h-1.5 !bg-slate-400 !border-0" />}
    </div>
  );
};

const initialNodes = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: 'DRAFT', colorClass: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300', sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '2', position: { x: 280, y: 50 }, data: { label: 'SUBMITTED', colorClass: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300', targetHandle: Position.Left, sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '3', position: { x: 510, y: 50 }, data: { label: 'BACKEND_VALIDATION', colorClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', targetHandle: Position.Left, sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '4', position: { x: 740, y: 50 }, data: { label: 'METHOD_VALIDATION', colorClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', targetHandle: Position.Left, sourceHandle: Position.Bottom }, type: 'stateNode' },
  
  { id: '5', position: { x: 740, y: 150 }, data: { label: 'CAPABILITY_CHECK', colorClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', targetHandle: Position.Top, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '6', position: { x: 510, y: 150 }, data: { label: 'SECURITY_CHECK', colorClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', targetHandle: Position.Right, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '7', position: { x: 280, y: 150 }, data: { label: 'PENDING_REVIEW', colorClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400', targetHandle: Position.Right, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '8', position: { x: 50, y: 150 }, data: { label: 'BUILDING', colorClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400', targetHandle: Position.Right, sourceHandle: Position.Bottom }, type: 'stateNode' },
  
  { id: '9', position: { x: 50, y: 250 }, data: { label: 'TESTING', colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400', targetHandle: Position.Top, sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '10', position: { x: 280, y: 250 }, data: { label: 'ACTIVE', colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400', targetHandle: Position.Left }, type: 'stateNode' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } },
  
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } },
  
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } },
  { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  
  { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
  
  { id: 'e9-10', source: '9', target: '10', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
];

export default function LifecycleFlow() {
  const nodeTypes = useMemo(() => ({ stateNode: StateNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ width: '100%', height: '400px' }} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        attributionPosition="bottom-right"
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
      </ReactFlow>
    </div>
  );
}
