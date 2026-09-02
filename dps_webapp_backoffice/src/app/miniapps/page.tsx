import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/inputs';
import ClickableTableRow from '@/components/ui/ClickableTableRow';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';

export default async function MiniAppsPage() {
  let miniApps: any[] = [];
  let fetchError = null;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000'}/mini-apps`, { 
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      miniApps = await res.json();
    } else {
      const errText = await res.text();
      console.error('API ERROR:', res.status, errText);
      fetchError = `API Error: ${res.status} ${errText}`;
    }
  } catch (error) {
    console.error("Failed to fetch mini apps", error);
    fetchError = `Network Error: ${(error as Error).message || String(error)}`;
  }

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
                <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Category</th>
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
                miniApps.map((app) => (
                  <ClickableTableRow key={app.id} href={`/miniapps/${app.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 group">
                    <td className="px-6 py-4 border-l-4 border-transparent group-hover:border-brand-500 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                          {app.name?.charAt(0) || 'A'}
                        </div>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{app.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">
                        {app.category || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">
                        {app.integrationMethod || 'WEBVIEW'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-sm font-medium">
                      {app.version || '1.0.0'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        {app.permissionRequests?.length ? `${app.permissionRequests.filter((p: any) => p.status === 'SUPPORTED').length}/${app.permissionRequests.length}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                        (app.status === 'ACTIVE' || app.status === 'Published') 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                          : app.status === 'APPROVED'
                          ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20'
                          : (app.status === 'IN_REVIEW' || app.status === 'PENDING_REVIEW' || app.status === 'Pending Review')
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                          : (app.status === 'TESTING' || app.status === 'BUILDING')
                          ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                          : (app.status === 'REJECTED' || app.status === 'SUSPENDED')
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                          : ((app.status === 'DRAFT' || app.status === 'Draft') && app.validationErrors)
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600/50'
                      }`}>
                        {(app.status === 'ACTIVE' || app.status === 'Published') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                        {(app.status === 'IN_REVIEW' || app.status === 'PENDING_REVIEW' || app.status === 'Pending Review') && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5"></span>}
                        {(app.status === 'TESTING' || app.status === 'BUILDING') && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse mr-1.5"></span>}
                        {app.status === 'APPROVED' && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5"></span>}
                        {
                          (app.status === 'IN_REVIEW' || app.status === 'PENDING_REVIEW' || app.status === 'Pending Review') ? 'In Review' :
                          app.status === 'APPROVED' ? 'Approved' :
                          app.status === 'TESTING' ? 'Testing' :
                          app.status === 'BUILDING' ? 'Building' :
                          app.status === 'REJECTED' ? 'Rejected' :
                          app.status === 'SUSPENDED' ? 'Suspended' :
                          (app.status === 'ACTIVE' || app.status === 'Published') ? 'Active' :
                          ((app.status === 'DRAFT' || app.status === 'Draft') && app.validationErrors) ? 'Issues' :
                          'Draft'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/miniapps/${app.id}`} className="inline-flex items-center space-x-1 text-slate-500 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm transition-all px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:border-brand-200 dark:hover:border-brand-800 shadow-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:border-brand-200 dark:group-hover:border-brand-800">
                        <span>Manage</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
