"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterMiniAppPage() {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Insurance',
    description: '',
    url: '',
    logo: '',
    redirectUri: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent, status: string) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/mini-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status })
      });

      if (response.ok) {
        setMessage('Successfully registered! You can now check the mobile app (if published).');
        setFormData({ name: '', category: 'Insurance', description: '', url: '', logo: '', redirectUri: '' });
      } else {
        setMessage('Failed to register mini app. Make sure NestJS backend is running.');
      }
    } catch (error) {
      setMessage('Error connecting to backend. Is it running on port 3000?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center space-x-4">
        <Link href="/miniapps" className="text-gray-500 hover:text-gray-900 transition">
          &larr; Back
        </Link>
        <h2 className="text-3xl font-bold">Register Mini App</h2>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        {message && (
          <div className={`p-4 mb-6 rounded ${message.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
        <form className="space-y-6" onSubmit={(e) => handleSubmit(e, 'Published')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
              <input required name="name" value={formData.name} onChange={handleChange} type="text" className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" placeholder="e.g. Insurance Portal" />
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white">
                <option>Insurance</option>
                <option>Banking</option>
                <option>Securities</option>
                <option>Payment</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={3} className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" placeholder="Brief description of the service"></textarea>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Web Application URL</label>
              <input required name="url" value={formData.url} onChange={handleChange} type="url" className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" placeholder="http://localhost:3001" />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">App Logo URL</label>
              <input name="logo" value={formData.logo} onChange={handleChange} type="url" className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" placeholder="https://" />
            </div>

            <div className="col-span-2">
              <h3 className="text-gray-700 text-lg font-semibold border-b pb-2 mb-4 mt-2">Authentication</h3>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">OAuth Redirect URI</label>
              <input name="redirectUri" value={formData.redirectUri} onChange={handleChange} type="url" className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" placeholder="https://" />
            </div>
            
            <div className="col-span-2">
              <label className="flex items-center space-x-3 mt-4">
                <input required type="checkbox" className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
                <span className="text-gray-700 font-medium">I confirm that this application follows the FSA security guidelines.</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end space-x-4">
            <button type="button" onClick={(e) => handleSubmit(e, 'Draft')} disabled={isSubmitting} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
              Save Draft
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit & Publish (Test)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
