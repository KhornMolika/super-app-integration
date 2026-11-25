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

const ArchNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-sm border-2 text-center min-w-[210px] ${data.colorClass}`}
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
      <div className="text-xs font-bold uppercase tracking-wider opacity-80">
        {data.badge}
      </div>
      <div className="text-sm font-bold mt-0.5">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs font-normal opacity-85 mt-1">{data.sublabel}</div>
      )}
      {data.hasBottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="!w-2 !h-2 !bg-brand-500 !border-0"
        />
      )}
      {data.hasRight && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-2 !h-2 !bg-brand-500 !border-0"
        />
      )}
    </div>
  );
};

const initialNodes = [
  {
    id: 'host',
    type: 'archNode',
    position: { x: 250, y: 20 },
    data: {
      badge: 'Host Shell',
      label: 'FSA SuperApp Container',
      sublabel: 'Navigation Bar • Capsule [•••|⊙] • Auth Gateway',
      colorClass:
        'bg-slate-900 text-white border-slate-700 dark:bg-slate-800 dark:border-slate-600',
      hasBottom: true,
      hasRight: true,
    },
  },
  {
    id: 'bridge',
    type: 'archNode',
    position: { x: 250, y: 145 },
    data: {
      badge: 'IPC Layer',
      label: 'Bidirectional Bridge',
      sublabel: 'JS postMessage • Flutter MethodChannel • Native',
      colorClass:
        'bg-brand-50 text-brand-900 border-brand-500 dark:bg-brand-950/60 dark:text-brand-200 dark:border-brand-500',
      hasTop: true,
      hasBottom: true,
    },
  },
  {
    id: 'sandbox',
    type: 'archNode',
    position: { x: 250, y: 270 },
    data: {
      badge: 'Isolated Runtime',
      label: 'Your MiniApp Viewport Sandbox',
      sublabel: 'Web (React/Vue) • Flutter • Native SDK • Deep Link',
      colorClass:
        'bg-sky-50 text-sky-900 border-sky-400 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-600',
      hasTop: true,
    },
  },
  {
    id: 'identity',
    type: 'archNode',
    position: { x: 560, y: 20 },
    data: {
      badge: 'Security',
      label: 'Identity & Capabilities',
      sublabel: 'JWT Staff Auth • Camera • Location • Biometrics',
      colorClass:
        'bg-emerald-50 text-emerald-900 border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-600',
      hasLeft: true,
    },
  },
];

const initialEdges = [
  {
    id: 'e-host-bridge',
    source: 'host',
    sourceHandle: 'bottom',
    target: 'bridge',
    targetHandle: 'top',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6D8B2C', strokeWidth: 2 },
  },
  {
    id: 'e-bridge-sandbox',
    source: 'bridge',
    sourceHandle: 'bottom',
    target: 'sandbox',
    targetHandle: 'top',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#0ea5e9', strokeWidth: 2 },
  },
  {
    id: 'e-host-identity',
    source: 'host',
    sourceHandle: 'right',
    target: 'identity',
    targetHandle: 'left',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' },
  },
];

export default function RuntimeMentalModelFlow() {
  const nodeTypes = useMemo(() => ({ archNode: ArchNode }), []);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div
      style={{ width: '100%', height: '360px' }}
      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-950/70 shadow-inner"
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
