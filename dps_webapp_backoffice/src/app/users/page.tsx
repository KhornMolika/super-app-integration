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
  telegramChatId?: string | null;
  telegramUsername?: string | null;
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
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage system access, roles, and Telegram alert channels.</p>
          </div>
          <Button disabled>+ Add User</Button>
        </div>

        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Name</th>
                  <th className="w-[30%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Email</th>
                  <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Role</th>
                  <th className="w-[15%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Telegram Alerts</th>
                  <th className="w-[10%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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
                      <td className="px-6 py-4">
                        {user.telegramChatId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                            <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                            </svg>
                            <span>{user.telegramUsername ? `@${user.telegramUsername}` : 'Active'}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            — Not linked
                          </span>
                        )}
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
