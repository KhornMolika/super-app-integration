"use client";
import { useState } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';

export default function TeamForm({ formData, handleChange, allErrors = {}, isEditable = true }: any) {
  const [isTesting, setIsTesting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestTeamAlert = async () => {
    if (!formData.teamTelegramChatId?.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/test-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: formData.teamTelegramChatId.trim(),
          miniAppName: formData.name || 'Mini App',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Test alert sent successfully to Telegram channel / group!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Failed to send test alert. Make sure @superapp_notification_bot is added to the channel/group as Admin.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Network error sending test Telegram notification.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Team Name</Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
          </div>
          <Input
            name="teamName"
            value={formData.teamName || ''}
            onChange={handleChange}
            placeholder="e.g. Core Banking Team"
            disabled={!isEditable}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Owner Name</Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
          </div>
          <Input
            name="ownerName"
            value={formData.ownerName || ''}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Owner Email <span className="text-rose-500">*</span></Label>
          <Input 
            required 
            name="ownerEmail" 
            value={formData.ownerEmail || ''} 
            onChange={handleChange} 
            type="email" 
            placeholder="john.doe@fsa.gov" 
            disabled={!isEditable}
            className={allErrors.ownerEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {allErrors.ownerEmail && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.ownerEmail}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Support Email</Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
          </div>
          <Input 
            name="supportEmail" 
            value={formData.supportEmail || ''} 
            onChange={handleChange} 
            type="email" 
            placeholder="support@fsa.gov" 
            disabled={!isEditable}
            className={allErrors.supportEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {allErrors.supportEmail && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.supportEmail}</p>}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Team Telegram Channel / Group ID</span>
            </Label>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{showGuide ? 'Hide Guide' : 'How to get Group ID?'}</span>
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              name="teamTelegramChatId"
              value={formData.teamTelegramChatId || ''}
              onChange={handleChange}
              placeholder="e.g. -1001234567890 or @my_team_channel"
              disabled={!isEditable}
              className="font-mono text-sm flex-1"
            />
            {formData.teamTelegramChatId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestTeamAlert}
                disabled={isTesting}
                className="shrink-0 text-xs px-3"
              >
                {isTesting ? 'Testing...' : 'Test Channel Alert'}
              </Button>
            )}
          </div>
          {testResult && (
            <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {testResult.success ? (
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Collapsible Helper Guide */}
          {showGuide && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300 animate-in fade-in duration-200">
              <div className="font-bold text-slate-900 dark:text-slate-100">Quick Guide: Setup Team Group Alerts</div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                <li><strong>Add bot to group:</strong> Add <code>@superapp_notification_bot</code> into your Telegram team group or channel.</li>
                <li><strong>Find Group ID:</strong> Open <code>web.telegram.org</code> and copy the <code>-100...</code> ID from the browser URL, or use 1-Click Auto-Detect under <strong>Settings &amp; Profile</strong>.</li>
                <li><strong>Paste &amp; Test:</strong> Paste the ID above and click <strong>&quot;Test Channel Alert&quot;</strong> to confirm instant delivery!</li>
              </ol>
            </div>
          )}

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Automated security scan reports, CI/CD test builds, and release updates for this Mini App will be broadcast directly to your team channel. (Add <code>@superapp_notification_bot</code> to your group/channel first).
          </p>
        </div>
      </div>
    </>
  );
}
