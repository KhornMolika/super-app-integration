'use client';

import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  Check,
  Copy,
  Columns,
  List,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { ReviewDiffFile, DiffLine, SplitDiffRow } from './diffGenerator';

export interface ReviewDiffViewerProps {
  files: ReviewDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  viewMode: 'split' | 'unified';
  onChangeViewMode: (mode: 'split' | 'unified') => void;
}

export function ReviewDiffViewer({
  files,
  totalAdditions,
  totalDeletions,
  viewMode,
  onChangeViewMode,
}: ReviewDiffViewerProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const activeFile = files.find((f) => f.id === selectedFileId) || files[0];

  const handleCopy = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (files.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <FileCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Manifest or Code Changes</h3>
        <p className="text-xs text-slate-500 mt-1">Both versions have identical manifest and configuration declarations.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col">
      {/* Diff Toolbar */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: File Tree Toggle & Summary */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title={isSidebarOpen ? 'Hide file tree' : 'Show file tree'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Files Changed ({files.length})</span>
          </span>

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              +{totalAdditions}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              -{totalDeletions}
            </span>
          </div>
        </div>

        {/* Right: Split vs Unified Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-700/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => onChangeViewMode('unified')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'unified'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Unified</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* Main Container: Sidebar + Diff Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[550px] overflow-hidden">
        {/* File Tree Navigator Sidebar */}
        {isSidebarOpen && (
          <div className="w-full md:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
            {/* Search filter */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter changed files..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredFiles.map((file) => {
                const isSelected = file.id === activeFile?.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedFileId(file.id)}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 border border-brand-300 dark:border-brand-800/80 text-brand-900 dark:text-brand-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                          file.status === 'modified'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : file.status === 'added'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {file.status === 'modified' ? 'M' : file.status === 'added' ? 'A' : 'D'}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate leading-tight">
                          {file.filename}
                        </span>
                        <span className="text-xs text-slate-400 block truncate leading-tight font-mono">
                          {file.path}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-xs shrink-0 font-bold">
                      {file.additions > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Diff Content View Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-auto">
          {activeFile && (
            <>
              {/* Active File Header */}
              <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {activeFile.path}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      activeFile.status === 'modified'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : activeFile.status === 'added'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {activeFile.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    <span className="text-emerald-600 dark:text-emerald-400">+{activeFile.additions}</span> /{' '}
                    <span className="text-rose-600 dark:text-rose-400">-{activeFile.deletions}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeFile.path, activeFile.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Copy file path"
                  >
                    {copiedId === activeFile.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Diff Lines Table */}
              <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed bg-white dark:bg-slate-950">
                {viewMode === 'unified' ? (
                  // Unified View
                  <table className="w-full border-collapse">
                    <tbody>
                      {activeFile.unifiedLines.map((line, idx) => (
                        <tr
                          key={`u-${idx}`}
                          className={`hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors ${
                            line.type === 'add'
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200'
                              : line.type === 'del'
                              ? 'bg-rose-50/60 dark:bg-rose-950/25 text-rose-900 dark:text-rose-200'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {/* Old line number */}
                          <td className="w-10 px-2 py-0.5 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200/50 dark:border-slate-800/50">
                            {line.oldLineNumber ?? ''}
                          </td>
                          {/* New line number */}
                          <td className="w-10 px-2 py-0.5 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200/50 dark:border-slate-800/50">
                            {line.newLineNumber ?? ''}
                          </td>
                          {/* Sign */}
                          <td className="w-6 px-1.5 py-0.5 text-center font-bold select-none">
                            {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                          </td>
                          {/* Code content */}
                          <td className="px-3 py-0.5 whitespace-pre overflow-x-auto">
                            {line.content || ' '}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Split View
                  <table className="w-full border-collapse">
                    <tbody>
                      {activeFile.splitRows.map((row, idx) => (
                        <tr key={`s-${idx}`} className="border-b border-slate-100/40 dark:border-slate-900/60">
                          {/* Left (Old / Base) */}
                          <td
                            className={`w-10 px-2 py-0.5 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200/50 dark:border-slate-800/50 ${
                              row.left.type === 'del'
                                ? 'bg-rose-100/50 dark:bg-rose-950/40'
                                : row.left.type === 'empty'
                                ? 'bg-slate-50/50 dark:bg-slate-900/40'
                                : ''
                            }`}
                          >
                            {row.left.lineNumber ?? ''}
                          </td>
                          <td
                            className={`w-1/2 px-3 py-0.5 whitespace-pre overflow-x-auto border-r border-slate-200 dark:border-slate-800 ${
                              row.left.type === 'del'
                                ? 'bg-rose-50/60 dark:bg-rose-950/25 text-rose-900 dark:text-rose-200'
                                : row.left.type === 'empty'
                                ? 'bg-slate-50/40 dark:bg-slate-900/30'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {row.left.content || ' '}
                          </td>

                          {/* Right (New / Target) */}
                          <td
                            className={`w-10 px-2 py-0.5 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200/50 dark:border-slate-800/50 ${
                              row.right.type === 'add'
                                ? 'bg-emerald-100/50 dark:bg-emerald-950/40'
                                : row.right.type === 'empty'
                                ? 'bg-slate-50/50 dark:bg-slate-900/40'
                                : ''
                            }`}
                          >
                            {row.right.lineNumber ?? ''}
                          </td>
                          <td
                            className={`w-1/2 px-3 py-0.5 whitespace-pre overflow-x-auto ${
                              row.right.type === 'add'
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200'
                                : row.right.type === 'empty'
                                ? 'bg-slate-50/40 dark:bg-slate-900/30'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {row.right.content || ' '}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
