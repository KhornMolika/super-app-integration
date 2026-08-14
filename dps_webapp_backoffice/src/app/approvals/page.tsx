import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function ApprovalsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Pending Approvals</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Review and approve new mini app registrations.</p>
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Submission ID</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">App Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">SUB-2026-001</td>
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Banking Portal</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">Banking Regulator</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">Aug 5, 2026</td>
                <td className="px-6 py-4"><span className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-medium">Pending Review</span></td>
                <td className="px-6 py-4 text-right">
                  <Link href="/approvals/SUB-2026-001" className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-sm">
                    Review &rarr;
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">SUB-2026-002</td>
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Securities Trading</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">Securities Commission</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">Aug 4, 2026</td>
                <td className="px-6 py-4"><span className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-medium">Pending Review</span></td>
                <td className="px-6 py-4 text-right">
                  <Link href="/approvals/SUB-2026-002" className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-sm">
                    Review &rarr;
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
