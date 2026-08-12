"use client";

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageMiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Insurance',
    description: '',
    url: '',
    logo: '',
    redirectUri: '',
    status: 'Draft',
    permissions: [] as string[]
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`http://localhost:3000/mini-apps/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || '',
            category: data.category || 'Insurance',
            description: data.description || '',
            url: data.url || '',
            logo: data.logo || '',
            redirectUri: data.redirectUri || '',
            status: data.status || 'Draft',
            permissions: data.permissions || []
          });
        } else {
          setMessage('Failed to fetch mini app details.');
        }
      } catch (error) {
        setMessage('Error connecting to backend.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchApp();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const { permissions } = formData;
    if (checked) {
      setFormData({ ...formData, permissions: [...permissions, value] });
    } else {
      setFormData({ ...formData, permissions: permissions.filter((p) => p !== value) });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`http://localhost:3000/mini-apps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage('Success: Changes saved successfully!');
      } else {
        setMessage('Failed to save changes.');
      }
    } catch (error) {
      setMessage('Error connecting to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this mini app? This action cannot be undone.')) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/mini-apps/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/miniapps');
      } else {
        setMessage('Failed to delete mini app.');
        setIsSubmitting(false);
      }
    } catch (error) {
      setMessage('Error connecting to backend.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 space-y-4">
        <svg className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="text-slate-500 dark:text-slate-400 font-medium">Loading app configuration...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/miniapps" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm group">
            <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Manage Mini App</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Update configuration and security settings</p>
          </div>
        </div>
        <button 
          onClick={handleDelete}
          disabled={isSubmitting}
          className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all text-sm font-semibold disabled:opacity-50 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span>Delete App</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-8 md:p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-50 dark:bg-indigo-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10">
          {message && (
            <div className={`p-4 mb-8 rounded-xl flex items-start space-x-3 ${message.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'}`}>
              {message.includes('Success') ? (
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <span className="font-medium text-sm">{message}</span>
            </div>
          )}
          
          <form className="space-y-8" onSubmit={handleSave}>
            {/* Section: Basic Info */}
            <div>
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-5 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">App Name</label>
                  <input required name="name" value={formData.name} onChange={handleChange} type="text" className="text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="e.g. Insurance Portal" />
                </div>
                
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Status</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleChange} className="appearance-none text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all cursor-pointer">
                      <option>Draft</option>
                      <option>Pending Review</option>
                      <option>Published</option>
                      <option>Rejected</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 dark:text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Category</label>
                  <div className="relative">
                    <select name="category" value={formData.category} onChange={handleChange} className="appearance-none text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all cursor-pointer">
                      <option>Insurance</option>
                      <option>Banking</option>
                      <option>Securities</option>
                      <option>Payment</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 dark:text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleChange} rows={3} className="text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" placeholder="Brief description of the service"></textarea>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700/50" />

            {/* Section: Technical Details */}
            <div>
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-5 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                Technical Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Web Application URL</label>
                  <input required name="url" value={formData.url} onChange={handleChange} type="url" className="text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-sm" placeholder="http://localhost:3001" />
                </div>

                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">App Logo URL</label>
                  <input name="logo" value={formData.logo} onChange={handleChange} type="url" className="text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-sm" placeholder="https://..." />
                </div>
                
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">OAuth Redirect URI</label>
                  <input name="redirectUri" value={formData.redirectUri} onChange={handleChange} type="url" className="text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-sm" placeholder="https://..." />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700/50" />

            {/* Section: Permissions */}
            <div>
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Required Device Permissions
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Select the native device features this Mini App requires access to.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="relative flex cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-all has-[:checked]:border-indigo-500 dark:has-[:checked]:border-indigo-400 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500 dark:has-[:checked]:ring-indigo-400">
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Location</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">GPS access</p>
                    </div>
                    <input type="checkbox" value="Location" checked={formData.permissions.includes('Location')} onChange={handlePermissionChange} className="w-5 h-5 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-600 dark:focus:ring-indigo-500 dark:bg-slate-700" />
                  </div>
                </label>

                <label className="relative flex cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-all has-[:checked]:border-indigo-500 dark:has-[:checked]:border-indigo-400 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500 dark:has-[:checked]:ring-indigo-400">
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Camera</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Photo Library</p>
                    </div>
                    <input type="checkbox" value="Camera" checked={formData.permissions.includes('Camera')} onChange={handlePermissionChange} className="w-5 h-5 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-600 dark:focus:ring-indigo-500 dark:bg-slate-700" />
                  </div>
                </label>

                <label className="relative flex cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-all has-[:checked]:border-indigo-500 dark:has-[:checked]:border-indigo-400 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500 dark:has-[:checked]:ring-indigo-400">
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Biometrics</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">FaceID / TouchID</p>
                    </div>
                    <input type="checkbox" value="Biometrics" checked={formData.permissions.includes('Biometrics')} onChange={handlePermissionChange} className="w-5 h-5 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-600 dark:focus:ring-indigo-500 dark:bg-slate-700" />
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all font-semibold disabled:opacity-50 flex items-center">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
