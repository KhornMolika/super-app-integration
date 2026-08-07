export default function OrganizationsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Organizations</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">
          + Add Organization
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Name</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Domain</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Status</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 text-gray-600 font-medium">Insurance Authority</td>
              <td className="px-6 py-4 text-gray-600">insurance.gov.kh</td>
              <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Active</span></td>
              <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">Edit</td>
            </tr>
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 text-gray-600 font-medium">Banking Regulator</td>
              <td className="px-6 py-4 text-gray-600">nbc.org.kh</td>
              <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Active</span></td>
              <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
