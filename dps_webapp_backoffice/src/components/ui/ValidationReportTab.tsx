'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import { API_URL } from '@/lib/config';

export interface ValidationReportProps {
  miniApp: any;
  onRefresh?: () => void;
}

export default function ValidationReportTab({ miniApp, onRefresh }: ValidationReportProps) {
  const [isReScanning, setIsReScanning] = useState(false);
  const [reScanMessage, setReScanMessage] = useState<string | null>(null);

  const report = miniApp.validationReport || null;
  const stages = miniApp.validationStages || {};
  const issues = miniApp.issues || [];
  const findings = report?.findings || [];
  const score = report?.score ?? (miniApp.validationStatus === 'PASSED' ? 100 : miniApp.validationStatus === 'FAILED' ? 45 : null);
  const valStatus = (miniApp.validationStatus || 'PENDING').toUpperCase();

  // Combine findings from report & database issues
  const allFindings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    recommendation?: string;
  }> = [...findings];

  issues.forEach((iss: any) => {
    if (!allFindings.some(f => f.id === iss.metadata?.findingId || f.description === iss.description)) {
      allFindings.push({
        id: iss.metadata?.findingId || iss.type || 'ISSUE',
        severity: iss.severity || 'HIGH',
        title: iss.classification || iss.type || 'Platform Issue',
        description: iss.description || '',
        recommendation: iss.metadata?.recommendation || 'Remediate this finding in accordance with Super App security policies.'
      });
    }
  });

  const defaultStages = [
    {
      id: 'ssrf',
      name: '1. Pre-Flight & SSRF Defense',
      defaultTitle: 'DNS & IP Routing Audit',
      icon: '🌐'
    },
    {
      id: 'tls',
      name: '2. TLS & HTTPS Security',
      defaultTitle: 'SSL/TLS Cipher Suite Audit',
      icon: '🔒'
    },
    {
      id: 'zap',
      name: '3. OWASP ZAP DAST Scan',
      defaultTitle: 'DAST, XSS & CSP Audit',
      icon: '⚡'
    },
    {
      id: 'nuclei',
      name: '4. Exposure & Vulnerability Audit',
      defaultTitle: 'Secret & CVE Exposure Check',
      icon: '🔍'
    }
  ];

  const handleReScan = async () => {
    setIsReScanning(true);
    setReScanMessage('Initiating Jenkins security scan...');
    try {
      let res = await fetch(`/api/mini-apps/${miniApp.id}/rescan`, {
        method: 'POST',
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/mini-apps/${miniApp.id}/rescan`, {
          method: 'POST',
        });
      }

      if (res.ok) {
        setReScanMessage('Security scan initiated in Jenkins!');
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        setReScanMessage(data.message || 'Failed to trigger scan.');
        setIsReScanning(false);
      }
    } catch (err: any) {
      setReScanMessage('Error contacting server.');
      setIsReScanning(false);
    }
  };

  // Real-time WebSocket connection for instantaneous stage updates
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('miniapp.stage_updated', (data: any) => {
      if (data && data.miniAppId === miniApp.id) {
        if (onRefresh) onRefresh();
      }
    });

    socket.on('notification.created', (data: any) => {
      if (data && (data.miniAppId === miniApp.id || data.data?.miniAppId === miniApp.id)) {
        if (onRefresh) onRefresh();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [miniApp.id, onRefresh]);

  // Live polling while scan is running
  useEffect(() => {
    if (valStatus === 'RUNNING' || isReScanning) {
      const interval = setInterval(() => {
        if (onRefresh) onRefresh();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [valStatus, isReScanning, onRefresh]);

  useEffect(() => {
    if (valStatus !== 'RUNNING' && isReScanning) {
      setIsReScanning(false);
    }
  }, [valStatus, isReScanning]);

  const scoreColor = score === null
    ? 'text-slate-500'
    : score >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';

  const scoreBg = score === null
    ? 'bg-slate-50 dark:bg-slate-800'
    : score >= 80
    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
    : score >= 50
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Security Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center p-2 flex-shrink-0 ${scoreBg}`}>
              <span className={`text-2xl font-black ${scoreColor}`}>
                {score !== null ? score : '--'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Automated Security & Compliance Report
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  valStatus === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : valStatus === 'RUNNING'
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                    : valStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {valStatus === 'RUNNING' ? 'SCANNING IN PROGRESS' : valStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Scanned Target: <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {miniApp.integrationConfig?.productionUrl || miniApp.integrationConfigWebView?.productionUrl || 'N/A'}
                </code>
              </p>
              {report?.completedAt && (
                <p className="text-xs text-slate-400 mt-1">
                  Report generated: {new Date(report.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            {reScanMessage && (
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400 animate-fade-in">
                {reScanMessage}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleReScan}
              disabled={isReScanning || valStatus === 'RUNNING'}
              className="flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${isReScanning || valStatus === 'RUNNING' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isReScanning ? 'Triggering Jenkins...' : valStatus === 'RUNNING' ? 'Scan in Progress' : 'Re-Run Security Scan'}</span>
            </Button>
          </div>
        </div>

        {/* Security Controls Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Network & SSRF</span>
              {report?.checks?.ssrf?.passed ? (
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">PASSED</span>
              ) : valStatus === 'RUNNING' ? (
                <span className="text-brand-600 text-xs animate-pulse">CHECKING...</span>
              ) : (
                <span className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">FAILED</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {report?.checks?.ssrf?.details || 'Private RFC 1918 & metadata protection verified.'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">TLS Encryption</span>
              {report?.checks?.tls?.passed ? (
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">PASSED</span>
              ) : valStatus === 'RUNNING' ? (
                <span className="text-brand-600 text-xs animate-pulse">CHECKING...</span>
              ) : (
                <span className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">FAILED</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {report?.checks?.tls?.details || 'TLS 1.2+ & secure cipher suites enforced.'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">DAST & CSP (ZAP)</span>
              {report?.checks?.dast?.passed ? (
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">PASSED</span>
              ) : valStatus === 'RUNNING' ? (
                <span className="text-brand-600 text-xs animate-pulse">CHECKING...</span>
              ) : (
                <span className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">FAILED</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {report?.checks?.dast?.details || 'No high severity cross-site scripting or missing CSP.'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exposure (Nuclei)</span>
              {report?.checks?.exposure?.passed ? (
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">PASSED</span>
              ) : valStatus === 'RUNNING' ? (
                <span className="text-brand-600 text-xs animate-pulse">CHECKING...</span>
              ) : (
                <span className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">FAILED</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {report?.checks?.exposure?.details || 'No sensitive .env, .git, or CVE endpoints exposed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Execution Timeline */}
      <Card>
        <CardHeader
          title="Jenkins Automated Validation Pipeline"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <p className="text-sm text-slate-500 mb-5">
          Real-time execution log of the security stages orchestrated by Jenkins:
        </p>

        <div className="space-y-3">
          {defaultStages.map((st) => {
            const recorded = stages[st.id] || null;
            const stageStatus = recorded ? recorded.status : (valStatus === 'PASSED' ? 'COMPLETED' : 'PENDING');
            const isCompleted = stageStatus === 'COMPLETED';
            const isRunning = stageStatus === 'RUNNING';
            const isFailed = stageStatus === 'FAILED';

            return (
              <div
                key={st.id}
                className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                  isRunning
                    ? 'bg-brand-50/70 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800'
                    : isCompleted
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                    : isFailed
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-lg">{st.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {recorded?.details || st.defaultTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded font-mono font-semibold uppercase ${
                    isRunning
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : isFailed
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {stageStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Security Findings & Remediation */}
      <Card>
        <CardHeader
          title={`Identified Security Findings (${allFindings.length})`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <p className="text-sm text-slate-500 mb-5">
          Detailed vulnerability discoveries and remediation guidelines:
        </p>

        {allFindings.length === 0 ? (
          <div className="flex items-center p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Zero Critical or High Vulnerabilities Found</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                The target endpoint complies with Super App transport encryption, SSRF protection, and DAST security standards.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 w-[12%]">Severity</th>
                  <th className="px-4 py-3 w-[25%]">Vulnerability / ID</th>
                  <th className="px-4 py-3 w-[35%]">Description</th>
                  <th className="px-4 py-3 w-[28%]">Recommended Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {allFindings.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full uppercase ${
                        f.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : f.severity === 'HIGH'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          : f.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-semibold text-slate-900 dark:text-white">{f.title}</div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">{f.id}</div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-slate-600 dark:text-slate-300 text-xs">
                      {f.description}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-800/20">
                      {f.recommendation || 'Follow Super App integration security checklist.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
