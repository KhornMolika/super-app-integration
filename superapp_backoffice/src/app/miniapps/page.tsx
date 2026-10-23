'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import ClickableTableRow from '@/components/ui/ClickableTableRow';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';
import { TagIcon, SettingsIcon, ArrowRightIcon, BuildingIcon, DevicePhoneIcon } from '@/components/ui/Icons';
import DownloadApkModal from '@/components/ui/DownloadApkModal';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import { miniappsApi, isBackendUnreachableError, getOrganizationCode, getOrganizationFullName } from '@/api';
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import ActionMenu from '@/components/ui/ActionMenu';
import { Pagination, usePagination } from '@/components/ui/Pagination';

export default function MiniAppsPage() {
  const { role, user, hasRole } = useAuth();
  const isSuper = hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  const [scope, setScope] = useState<'all' | 'mine'>(isSuper ? 'all' : 'mine');

  const [miniApps, setMiniApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [apkModalVersion, setApkModalVersion] = useState<string>('v0.2.0');

  // Client-side pagination for MiniApps catalog
  const { paginatedItems: paginatedMiniApps, paginationProps: miniAppsPaginationProps } = usePagination(miniApps, 10);

  const fetchMiniApps = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await miniappsApi.getAll({
        mine: scope === 'mine' || !isSuper,
      });
      setMiniApps(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch mini apps', error);
      const msg = error.message || 'Error fetching mini apps';
      setFetchError(msg);
      toast.error(msg, 'Load Failed');
    } finally {
      setIsLoading(false);
    }
  }, [scope, isSuper]);

  useEffect(() => {
    fetchMiniApps();
  }, [fetchMiniApps, role]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">MiniApps</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isSuper && scope === 'all'
              ? 'Manage all platform registered applications and permissions.'
              : `Manage your registered applications (${user?.email || 'Logged-in User'}).`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuper && (
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                All Applications
              </button>
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  scope === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                My MiniApps
              </button>
            </div>
          )}
          <RegisterMiniAppButton />
        </div>
      </div>

      {fetchError && isBackendUnreachableError(fetchError) ? (
        <BackendServiceOfflineNotice
          mode="card"
          title="Backend Service Unreachable"
          message={fetchError}
          onRetry={fetchMiniApps}
          autoRetrySeconds={5}
          showDiagnosticsButton={true}
          showTroubleshooting={true}
        />
      ) : fetchError ? (
        <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-rose-900 dark:text-rose-100">Failed to load MiniApps catalog</h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchMiniApps()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            Retry Loading
          </button>
        </div>
      ) : null}

      {!fetchError && (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="w-[22%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">App Name</th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Organization</th>
                  <th className="w-[13%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Integration</th>
                  <th className="w-[9%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Version</th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Capabilities</th>
                  <th className="w-[18%] min-w-[150px] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="w-[14%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading mini apps...</span>
                      </div>
                    </td>
                  </tr>
                ) : miniApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No MiniApps Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm w-full max-w-sm mx-auto">Get started by registering a new mini app to join the ecosystem.</p>
                        <Link href="/miniapps/register" className="mt-4 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm underline underline-offset-2">Register your first app</Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                paginatedMiniApps.map((app) => {
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
                          <AppLogoAvatar
                            logo={app.logo}
                            name={app.name}
                            size="md"
                          />
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
                        {(() => {
                          const m = (app.integrationMethod || 'WEBVIEW').toUpperCase();
                          if (m === 'NATIVE_SDK') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-xs">
                                <SettingsIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span>Native SDK</span>
                              </span>
                            );
                          }
                          if (m === 'FLUTTER_PACKAGE') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-50 dark:bg-accent-950/40 text-accent-800 dark:text-accent-300 border border-accent-200 dark:border-accent-800/60 shadow-xs">
                                <SettingsIcon className="w-3.5 h-3.5 text-accent-500 shrink-0" />
                                <span>Flutter Package</span>
                              </span>
                            );
                          }
                          if (m === 'DEEP_LINK') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-xs">
                                <SettingsIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span>Deep Link</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                              <SettingsIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>WebView</span>
                            </span>
                          );
                        })()}
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
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border bg-accent-50 dark:bg-accent-950/40 text-accent-800 dark:text-accent-300 border-accent-200 dark:border-accent-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse mr-1.5"></span>
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
                        <ActionMenu
                          ariaLabel={`Actions for ${app.name}`}
                          items={[
                            {
                              label: 'Manage Details',
                              href: `/miniapps/${app.id}`,
                              icon: (
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              ),
                            },
                            {
                              label: 'Test APK & QR Code',
                              hidden: app.status !== 'TESTING' && app.status !== 'ACTIVE',
                              icon: <DevicePhoneIcon className="w-4 h-4 text-emerald-500" />,
                              onClick: () => {
                                const testVersion =
                                  (app as any).activeTestVersion ||
                                  app.integrationConfig?.superAppTestVersion ||
                                  'v0.2.0';
                                setApkModalVersion(testVersion);
                                setIsApkModalOpen(true);
                              },
                            },
                            {
                              label: 'Inspect Capabilities',
                              href: `/miniapps/${app.id}?tab=capabilities`,
                              icon: (
                                <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              ),
                            },
                            {
                              label: 'View Issues',
                              href: `/issues?appId=${app.id}`,
                              divider: true,
                              icon: (
                                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              ),
                            },
                          ]}
                        />
                      </td>
                    </ClickableTableRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        {!isLoading && miniApps.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination {...miniAppsPaginationProps} showPageSizeSelector />
          </div>
        )}
      </div>
      )}

      <DownloadApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        defaultVersion={apkModalVersion}
      />
    </div>
  );
}
