import { Button } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Users</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage system access and roles.</p>
        </div>
        <Button>+ Add User</Button>
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Admin User</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">admin@fsa.gov.kh</td>
                <td className="px-6 py-4"><span className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 px-2.5 py-1 rounded-md text-xs font-medium">FSA Admin</span></td>
                <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Manage</td>
              </tr>
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">Lilly (Insurance)</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">lilly@insurance.gov.kh</td>
                <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50 px-2.5 py-1 rounded-md text-xs font-medium">Regulator Admin</span></td>
                <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Manage</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
