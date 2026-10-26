/**
 * Shared utility functions for Team & Collaborators management
 */

export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-indigo-600 text-white',
    'bg-sky-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
