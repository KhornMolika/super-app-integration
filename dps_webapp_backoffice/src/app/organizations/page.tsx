import { Button } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';

export default function OrganizationsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Organizations</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage registered agencies and partners.</p>
        </div>
        <Button>+ Add Organization</Button>
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="w-[35%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Name</th>
                <th className="w-[35%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Domain</th>
                <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Insurance Authority</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">insurance.gov.kh</td>
                <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-medium">Active</span></td>
                <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Edit</td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Banking Regulator</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">nbc.org.kh</td>
                <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-medium">Active</span></td>
                <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Edit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
