'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import ClickableTableRow from '@/components/ui/ClickableTableRow';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';
import { TagIcon, SettingsIcon, ArrowRightIcon, BuildingIcon } from '@/components/ui/Icons';
import { miniappsApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { getOrganizationCode, getOrganizationFullName } from '@/lib/constants/fsa-organizations';

export default function MiniAppsPage() {
  const { role } = useAuth();
  const [miniApps, setMiniApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMiniApps = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await miniappsApi.getAll();
      setMiniApps(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch mini apps', error);
      setFetchError(error.message || 'Error fetching mini apps');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMiniApps();
  }, [fetchMiniApps, role]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {fetchError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-bold">Error loading data:</h3>
          <p>{fetchError}</p>
        </div>
      )}
  
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Mini Apps</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage registered applications and permissions.</p>
        </div>
        <RegisterMiniAppButton />
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="w-[22%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">App Name</th>
                <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Organization</th>
                <th className="w-[13%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Integration</th>
                <th className="w-[9%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Version</th>
                <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Permissions</th>
                <th className="w-[18%] min-w-[150px] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="w-[14%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {miniApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Mini Apps Found</h3>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm w-full max-w-sm mx-auto">Get started by registering a new mini app to join the ecosystem.</p>
                      <Link href="/miniapps/register" className="mt-4 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm underline underline-offset-2">Register your first app</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                miniApps.map((app) => {
                  const isLiveProduction = app.status === 'ACTIVE' || app.status === 'Published';
                  const hasProductionHistory = Boolean(
                    app.versionHistory?.some((v: any) => v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'PREVIOUS'))
                  );
                  // An app has a pending update ONLY if it is already live/released AND has a staged revision or is undergoing update review
                  const hasPendingUpdate = Boolean(
                    (isLiveProduction || hasProductionHistory) &&
                    (app.pendingRevision || app.status === 'IN_REVIEW')
                  );
                  // An initial registration in review is when the app is IN_REVIEW and has NEVER been live in production
                  const isNewAppInReview = (app.status === 'IN_REVIEW' || app.status === 'PROCESSING' || app.status === 'SUBMITTED') && !isLiveProduction && !hasPendingUpdate;

                  return (
                    <ClickableTableRow key={app.id} href={`/miniapps/${app.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 group">
                      <td className="px-6 py-4 border-l-4 border-transparent group-hover:border-brand-500 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                            {app.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold block">{app.name || '-'}</span>
                            {app.appId && (
                              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">{app.appId}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const orgCode = app.organizationCode || getOrganizationCode(app.organization || app.category);
                          const orgFullName = getOrganizationFullName(app.organization || app.category);
                          return (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-xs hover:border-sky-300 cursor-default"
                              title={orgFullName}
                            >
                              <BuildingIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span>{orgCode}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50 font-mono">
                          <SettingsIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{app.integrationMethod || 'WEBVIEW'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-900 dark:text-slate-100 text-xs font-mono font-bold">
                            v{app.currentReleaseVersion || app.version || '1.0.0'}
                          </span>
                          {app.pendingRevision?.version && (
                            <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <ArrowRightIcon className="w-3 h-3" />
                              <span>v{app.pendingRevision.version} (Draft)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>
                            {app.permissionRequests?.length
                              ? `${app.permissionRequests.filter((p: any) => p.status === 'SUPPORTED').length}/${app.permissionRequests.length}`
                              : '0/0'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Live Production Badge */}
                          {(app.status === 'ACTIVE' || app.status === 'Published') && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              <span>Active</span>
                            </span>
                          )}

                          {/* Pending Revision / Update Proposal Badge */}
                          {hasPendingUpdate && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                              <span>Update (In Review)</span>
                            </span>
                          )}

                          {/* Brand-new App Initial Submission Badge */}
                          {isNewAppInReview && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5"></span>
                              <span>{app.status === 'PROCESSING' ? 'Validating...' : 'New App (In Review)'}</span>
                            </span>
                          )}

                          {/* Approved */}
                          {app.status === 'APPROVED' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5"></span>
                              <span>Approved</span>
                            </span>
                          )}

                          {/* Testing / Building */}
                          {(app.status === 'TESTING' || app.status === 'BUILDING') && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse mr-1.5"></span>
                              <span>{app.status === 'BUILDING' ? 'Building' : 'Testing'}</span>
                            </span>
                          )}

                          {/* Rejected / Suspended */}
                          {(app.status === 'REJECTED' || app.status === 'SUSPENDED') && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                              <span>{app.status === 'REJECTED' ? 'Rejected' : 'Suspended'}</span>
                            </span>
                          )}

                          {/* Draft / Issues */}
                          {(app.status === 'DRAFT' || app.status === 'Draft') && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                              app.validationErrors
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.validationErrors ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                              <span>{app.validationErrors ? 'Issues' : 'Draft'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {(app.status === 'TESTING' || app.status === 'ACTIVE') && (() => {
                            const testVersion = (app as any).activeTestVersion || app.integrationConfig?.superAppTestVersion || 'v0.3.7';
                            return (
                              <a
                                href={`/api/download-apk?type=test&version=${encodeURIComponent(testVersion)}`}
                                download={`superapp-test-${testVersion}.apk`}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm transition-all flex items-center justify-center"
                                title={`Download Super App Test APK (${testVersion})`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </a>
                            );
                          })()}
                          <Link href={`/miniapps/${app.id}`} className="inline-flex items-center space-x-1 text-slate-500 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm transition-all px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:border-brand-200 dark:hover:border-brand-800 shadow-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:border-brand-200 dark:group-hover:border-brand-800">
                            <span>Manage</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        </div>
                      </td>
                    </ClickableTableRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
