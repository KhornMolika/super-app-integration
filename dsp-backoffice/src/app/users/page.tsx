export default function UsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Users</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">
          + Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Name</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Email</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Role</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 text-gray-600 py-4 font-medium">Admin User</td>
              <td className="px-6 py-4 text-gray-600">admin@fsa.gov.kh</td>
              <td className="px-6 py-4"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">FSA Admin</span></td>
              <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">Manage</td>
            </tr>
            <tr className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 text-gray-600 font-medium">Lilly (Insurance)</td>
              <td className="px-6 py-4 text-gray-600">lilly@insurance.gov.kh</td>
              <td className="px-6 py-4"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">Regulator Admin</span></td>
              <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">Manage</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
