import Link from 'next/link';

export default function ReviewApprovalPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch the submission details using params.id
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/approvals" className="text-gray-500 hover:text-gray-900 transition">
            &larr; Back
          </Link>
          <h2 className="text-3xl font-bold">Review Submission</h2>
        </div>
        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold border border-amber-200">
          Pending Review
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-lg text-gray-800">Application Details</h3>
        </div>
        <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8">
          <div>
            <p className="text-sm text-gray-500 font-medium">App Name</p>
            <p className="mt-1 font-semibold text-gray-900">Banking Portal</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Organization</p>
            <p className="mt-1 font-semibold text-gray-900">Banking Regulator</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Category</p>
            <p className="mt-1 font-semibold text-gray-900">Banking</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">App URL</p>
            <a href="#" className="mt-1 font-semibold text-blue-600 hover:underline">https://banking.nbc.org.kh</a>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500 font-medium">Description</p>
            <p className="mt-1 text-gray-700">
              The official banking portal for consumers to check unified banking records and file complaints securely.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-lg text-gray-800">FSA Verification Checklist</h3>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-start space-x-3">
            <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Security Compliance</p>
              <p className="text-sm text-gray-500">The application uses HTTPS and follows data privacy guidelines.</p>
            </div>
          </label>
          <label className="flex items-start space-x-3">
            <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Authentication Compatibility</p>
              <p className="text-sm text-gray-500">OAuth2/OIDC settings and redirect URIs are correct.</p>
            </div>
          </label>
          <label className="flex items-start space-x-3">
            <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
            <div>
              <p className="font-medium text-gray-900">UI Guidelines</p>
              <p className="text-sm text-gray-500">The app adheres to the shared DSP Design System.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button className="px-6 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg shadow-sm hover:bg-red-50 transition">
          Reject
        </button>
        <button className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg shadow hover:bg-green-700 transition">
          Approve & Publish
        </button>
      </div>
    </div>
  );
}
