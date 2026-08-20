"use client";
import { API_URL } from '@/lib/config';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';



type User = {
  id: string;
  name: string;
  email: string;
  roles: { id: string; name: string }[];
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_URL}/users`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (
    <ProtectedRoute permission="user:read">
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Users & Roles</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage system access and roles.</p>
        </div>
        <Button disabled>+ Add User</Button>
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
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.roles?.map(role => (
                        <span key={role.id} className="inline-block bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 px-2.5 py-1 rounded-md text-xs font-medium mr-2">
                          {role.name}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Manage</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    </ProtectedRoute>
  );
}
