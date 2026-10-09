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
    <div className={`px-3.5 py-2.5 rounded-lg shadow-sm border-2 font-mono text-xs tracking-wider font-bold text-center ${data.colorClass} min-w-[150px]`}>
      {data.targetHandle && <Handle type="target" position={data.targetHandle} className="!w-2 !h-2 !bg-slate-400 !border-0" />}
      <div>{data.label}</div>
      {data.sublabel && <div className="text-[10px] font-sans font-normal opacity-80 mt-0.5">{data.sublabel}</div>}
      {data.sourceHandle && <Handle type="source" position={data.sourceHandle} className="!w-2 !h-2 !bg-slate-400 !border-0" />}
    </div>
  );
};

const initialNodes = [
  // Top Row: Registration -> Submission -> Automated Audit -> Admin Review Queue
  { id: '1', position: { x: 30, y: 40 }, data: { label: '1. DRAFT', sublabel: 'Local changes / Editing', colorClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200', sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '2', position: { x: 260, y: 40 }, data: { label: '2. SUBMITTED', sublabel: 'Queued for Security Audit', colorClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300', targetHandle: Position.Left, sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '3', position: { x: 490, y: 40 }, data: { label: 'CI SECURITY AUDIT', sublabel: 'SSRF, TLS, SAST, DAST, SBOM', colorClass: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300', targetHandle: Position.Left, sourceHandle: Position.Right }, type: 'stateNode' },
  { id: '4', position: { x: 740, y: 40 }, data: { label: '3. IN_REVIEW', sublabel: 'SA Admin Review Queue', colorClass: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300', targetHandle: Position.Left, sourceHandle: Position.Bottom }, type: 'stateNode' },
  
  // Bottom Row: Approval -> Packaging -> Sandbox Testing -> Production Active
  { id: '5', position: { x: 740, y: 170 }, data: { label: '4. APPROVED', sublabel: 'Administrative Sign-off', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-300', targetHandle: Position.Top, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '6', position: { x: 490, y: 170 }, data: { label: '5. BUILDING', sublabel: 'Jenkins compiling test APK', colorClass: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:border-purple-700 dark:text-purple-300', targetHandle: Position.Right, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '7', position: { x: 260, y: 170 }, data: { label: '6. TESTING', sublabel: 'Sandbox device verification', colorClass: 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:border-teal-700 dark:text-teal-300', targetHandle: Position.Right, sourceHandle: Position.Left }, type: 'stateNode' },
  { id: '8', position: { x: 30, y: 170 }, data: { label: '7. ACTIVE', sublabel: 'Live in SuperApp Store', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-500 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-300', targetHandle: Position.Right }, type: 'stateNode' },

  // Exceptions / Remediation Row
  { id: '9', position: { x: 615, y: 280 }, data: { label: 'REJECTED', sublabel: 'Returned to DRAFT for fixes', colorClass: 'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950/60 dark:border-rose-600 dark:text-rose-300', targetHandle: Position.Top }, type: 'stateNode' },
  { id: '10', position: { x: 30, y: 280 }, data: { label: 'SUSPENDED', sublabel: 'Emergency platform takedown', colorClass: 'bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-950/60 dark:border-orange-600 dark:text-orange-300', targetHandle: Position.Top }, type: 'stateNode' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
  { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
  { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },

  // Reject branches from In-Review and Audit
  { id: 'e4-9', source: '4', target: '9', type: 'smoothstep', style: { stroke: '#f43f5e', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  // Suspend branch from Active
  { id: 'e8-10', source: '8', target: '10', type: 'smoothstep', style: { stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '4 4' } },
];

export default function LifecycleFlow() {
  const nodeTypes = useMemo(() => ({ stateNode: StateNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ width: '100%', height: '390px' }} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/70 dark:bg-slate-900/70 shadow-inner">
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
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#94a3b8" className="opacity-40" />
      </ReactFlow>
    </div>
  );
}
