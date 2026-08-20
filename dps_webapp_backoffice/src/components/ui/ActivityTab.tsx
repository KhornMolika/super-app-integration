import React, { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

interface MiniAppActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  metadata?: any;
  actorId?: string;
  createdAt: string;
}

interface ActivityTabProps {
  miniAppId: string;
}

export default function ActivityTab({ miniAppId }: ActivityTabProps) {
  const [activities, setActivities] = useState<MiniAppActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch(`${API_URL}/mini-apps/${miniAppId}/activities`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (err) {
        console.error('Failed to fetch activities', err);
      } finally {
        setLoading(false);
      }
    }
    if (miniAppId) {
      fetchActivities();
    }
  }, [miniAppId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <svg className="animate-spin h-8 w-8 text-brand-600 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
        <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-slate-500 font-medium">No activity history yet.</p>
      </div>
    );
  }

  const groupActivitiesByDate = (acts: MiniAppActivity[]) => {
    const groups: { [date: string]: MiniAppActivity[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    acts.forEach(act => {
      const d = new Date(act.createdAt).toDateString();
      let groupName = d;
      if (d === today) groupName = 'Today';
      else if (d === yesterday) groupName = 'Yesterday';
      else groupName = new Date(act.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(act);
    });
    return groups;
  };

  const grouped = groupActivitiesByDate(activities);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'CREATE':
        return <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></div>;
      case 'SUBMIT':
        return <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div>;
      case 'UPDATE':
        return <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>;
      case 'VALIDATION':
        return <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
      case 'STATUS_CHANGE':
        return <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, acts]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">{date}</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
            {acts.map((act, index) => (
              <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-900 absolute left-0 md:left-1/2 -translate-x-1/2 shrink-0">
                  {getIconForType(act.type)}
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{act.title}</h4>
                    <span className="text-xs text-slate-400 font-medium">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {act.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{act.description}</p>}
                  
                  {act.actorId && (
                    <div className="flex items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 text-[10px] font-bold mr-2">
                        {act.actorId.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-500">{act.actorId}</span>
                    </div>
                  )}

                  {act.metadata && act.metadata.comment && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-brand-500">
                      "{act.metadata.comment}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
