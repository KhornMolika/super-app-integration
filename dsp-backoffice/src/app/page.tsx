export default function Dashboard() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Total Organizations</h3>
          <p className="text-3xl font-bold text-gray-600 mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Registered Mini Apps</h3>
          <p className="text-3xl font-bold text-gray-600 mt-2">5</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Pending Approvals</h3>
          <p className="text-3xl font-bold mt-2 text-amber-600">2</p>
        </div>
      </div>
    </div>
  );
}
