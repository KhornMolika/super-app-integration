"use client";
import { useState } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';

export default function TeamForm({ formData, handleChange, allErrors = {}, isEditable = true }: any) {
  const [isTesting, setIsTesting] = useState(false);
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
          message: '✓ Test alert sent successfully to Telegram channel / group!',
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
              <span>✈️</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Team Telegram Channel / Group ID</span>
            </Label>
            <span className="text-xs text-slate-400 font-medium">Optional</span>
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
            <p className={`mt-1.5 text-xs font-medium ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {testResult.message}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Automated security scan reports, CI/CD test builds, and release updates for this Mini App will be broadcast directly to your team channel. (Add <code>@superapp_notification_bot</code> to your group/channel first).
          </p>
        </div>
      </div>
    </>
  );
}
