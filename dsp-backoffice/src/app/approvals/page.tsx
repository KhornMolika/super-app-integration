import Link from 'next/link';

export default function ApprovalsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Pending Approvals</h2>
        <p className="text-gray-500 mt-2">Review and approve new mini app registrations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Submission ID</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">App Name</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Organization</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Date Submitted</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Status</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 font-mono text-sm text-gray-600">SUB-2026-001</td>
              <td className="px-6 py-4 text-gray-600 font-medium">Banking Portal</td>
              <td className="px-6 py-4 text-gray-600">Banking Regulator</td>
              <td className="px-6 py-4 text-gray-600">Aug 5, 2026</td>
              <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">Pending Review</span></td>
              <td className="px-6 py-4 text-right">
                <Link href="/approvals/SUB-2026-001" className="text-blue-600 hover:underline font-medium">
                  Review &rarr;
                </Link>
              </td>
            </tr>
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 font-mono text-sm text-gray-600">SUB-2026-002</td>
              <td className="px-6 py-4 text-gray-600 font-medium">Securities Trading</td>
              <td className="px-6 py-4 text-gray-600">Securities Commission</td>
              <td className="px-6 py-4 text-gray-600">Aug 4, 2026</td>
              <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">Pending Review</span></td>
              <td className="px-6 py-4 text-right">
                <Link href="/approvals/SUB-2026-002" className="text-blue-600 hover:underline font-medium">
                  Review &rarr;
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
