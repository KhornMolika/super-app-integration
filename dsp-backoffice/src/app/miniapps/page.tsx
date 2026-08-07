import Link from 'next/link';

export default async function MiniAppsPage() {
  let miniApps: any[] = [];
  
  try {
    const res = await fetch('http://localhost:3000/mini-apps', { cache: 'no-store' });
    if (res.ok) {
      miniApps = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch mini apps", error);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Mini Apps</h2>
        <Link href="/miniapps/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">
          + Register New Mini App
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">App Name</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Category</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Description</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm">Status</th>
              <th className="px-6 py-3 font-medium text-gray-500 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {miniApps.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No mini apps found. Click the button above to register one.
                </td>
              </tr>
            ) : (
              miniApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-600 font-medium">{app.name}</td>
                  <td className="px-6 py-4 text-gray-600">{app.category}</td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{app.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      app.status === 'Published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-blue-600 hover:underline cursor-pointer">
                    Manage
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
