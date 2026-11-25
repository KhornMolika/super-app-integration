"use client";

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const DecisionNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl shadow-sm border-2 text-center min-w-[170px] ${data.colorClass}`}
    >
      {data.hasTop && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="!w-2 !h-2 !bg-slate-400 !border-0"
        />
      )}
      {data.hasLeft && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!w-2 !h-2 !bg-slate-400 !border-0"
        />
      )}
      <div className="text-xs font-bold">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs opacity-80 mt-0.5">{data.sublabel}</div>
      )}
      {data.hasBottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="!w-2 !h-2 !bg-slate-400 !border-0"
        />
      )}
      {data.hasRight && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-2 !h-2 !bg-slate-400 !border-0"
        />
      )}
    </div>
  );
};

const initialNodes = [
  {
    id: 'declare',
    type: 'decisionNode',
    position: { x: 160, y: 15 },
    data: {
      label: '1. MiniApp Requests N Scopes',
      sublabel: 'Marked Required or Optional',
      colorClass:
        'bg-white text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
      hasBottom: true,
    },
  },
  {
    id: 'check',
    type: 'decisionNode',
    position: { x: 150, y: 105 },
    data: {
      label: '2. Required Scope Unsupported?',
      sublabel: 'Checked against Host Allowlist',
      colorClass:
        'bg-amber-50 text-amber-900 border-amber-400 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-600',
      hasTop: true,
      hasBottom: true,
      hasRight: true,
    },
  },
  {
    id: 'reject',
    type: 'decisionNode',
    position: { x: 420, y: 105 },
    data: {
      label: 'REJECT MiniApp',
      sublabel: 'Missing required capability',
      colorClass:
        'bg-rose-50 text-rose-800 border-rose-400 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-600',
      hasLeft: true,
    },
  },
  {
    id: 'approve',
    type: 'decisionNode',
    position: { x: 145, y: 205 },
    data: {
      label: '3. Approved & JIT Consent',
      sublabel: 'Supported exposed • Unsupported disabled',
      colorClass:
        'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500',
      hasTop: true,
    },
  },
];

const initialEdges = [
  {
    id: 'e-declare-check',
    source: 'declare',
    sourceHandle: 'bottom',
    target: 'check',
    targetHandle: 'top',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e-check-reject',
    source: 'check',
    sourceHandle: 'right',
    target: 'reject',
    targetHandle: 'left',
    label: 'Yes',
    type: 'smoothstep',
    style: { stroke: '#f43f5e', strokeWidth: 2 },
  },
  {
    id: 'e-check-approve',
    source: 'check',
    sourceHandle: 'bottom',
    target: 'approve',
    targetHandle: 'top',
    label: 'No',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
];

export default function CapabilityDecisionFlow() {
  const nodeTypes = useMemo(() => ({ decisionNode: DecisionNode }), []);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div
      style={{ width: '100%', height: '285px' }}
      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/70 dark:bg-slate-950/70 shadow-inner"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.6}
        maxZoom={1.3}
        attributionPosition="bottom-right"
      >
        <Controls showInteractive={false} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#94a3b8"
          className="opacity-40"
        />
      </ReactFlow>
    </div>
  );
}
