'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import { telegramApi, miniappsApi } from '@/api';
import {
  PublisherContactsSection,
  CollaboratorsSection,
  TelegramAlertsSection,
  AddCollaboratorModal,
  DeleteCollaboratorModal,
} from './team';

export interface TeamFormProps {
  formData: any;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
}

export default function TeamForm({
  formData,
  setFormData,
  handleChange,
  allErrors = {},
  isEditable = true,
}: TeamFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);

  // Auto-Detect & User Profile Telegram states
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [detectingGroups, setDetectingGroups] = useState(false);
  const [detectedGroups, setDetectedGroups] = useState<Array<{ id: string; title: string; type?: string; [key: string]: any }>>([]);
  const [groupMode, setGroupMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Collaborators management state
  const [collaborators, setCollaborators] = useState<any[]>(formData.collaborators || []);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<any | null>(null);

  // Add Collaborator Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Prevent background scrolling when either modal is open
  useEffect(() => {
    if (isAddModalOpen || Boolean(collaboratorToDelete)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isAddModalOpen, collaboratorToDelete]);

  const resolvedOrgId =
    formData.organizationId ||
    formData.organization?.id ||
    telegramStatus?.user?.organizationId ||
    telegramStatus?.user?.organization?.id;

  const agencyName =
    (typeof formData.organization === 'string'
      ? formData.organization
      : formData.organization?.name) ||
    formData.teamName ||
    telegramStatus?.user?.organization?.name ||
    'Your Organization';

  const updateField = (name: string, value: string) => {
    if (setFormData) {
      setFormData((prev: any) => {
        const next = { ...prev, [name]: value };
        if (name === 'teamTelegramChatId') {
          next.alertTelegramChatId = value;
        } else if (name === 'alertTelegramChatId') {
          next.teamTelegramChatId = value;
        }
        return next;
      });
    } else if (handleChange) {
      handleChange({ target: { name, value } } as any);
      if (name === 'teamTelegramChatId') {
        handleChange({ target: { name: 'alertTelegramChatId', value } } as any);
      } else if (name === 'alertTelegramChatId') {
        handleChange({ target: { name: 'teamTelegramChatId', value } } as any);
      }
    }
  };

  // Load existing collaborators on mount
  useEffect(() => {
    if (!formData.id) return;
    const loadCollaborators = async () => {
      try {
        setLoadingCollaborators(true);
        const collabs = await miniappsApi.getCollaborators(formData.id);
        if (Array.isArray(collabs)) {
          setCollaborators(collabs);
        }
      } catch (err) {
        console.warn('Failed to load collaborators', err);
      } finally {
        setLoadingCollaborators(false);
      }
    };
    loadCollaborators();
  }, [formData.id]);

  // Fetch Telegram status & profile info on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoadingTelegram(true);
        const data = await telegramApi.getStatus();
        if (data) {
          setTelegramStatus(data);

          // Auto-populate if fields are empty
          if (!formData.ownerName && data.user?.name) {
            updateField('ownerName', data.user.name);
          }
          if (!formData.ownerEmail && data.user?.email) {
            updateField('ownerEmail', data.user.email);
          }
          if (!formData.supportEmail && data.user?.email) {
            updateField('supportEmail', data.user.email);
          }
          if (!formData.alertTelegramChatId && !formData.teamTelegramChatId) {
            const defaultChat =
              data.user?.alertTelegramChatId ||
              data.user?.teamTelegramChatId ||
              data.user?.telegramChatId;
            if (defaultChat) {
              updateField('alertTelegramChatId', defaultChat);
              updateField('teamTelegramChatId', defaultChat);
            }
          }
          if (data.user?.teamTelegramChatId || data.user?.alertTelegramChatId) {
            setGroupMode('EXISTING');
          } else {
            setGroupMode('NEW');
          }
        }
      } catch (err) {
        console.error('Failed to load telegram status in TeamForm', err);
      } finally {
        setLoadingTelegram(false);
      }
    };

    fetchStatus();
  }, []);

  const handleAutofillOwner = () => {
    if (telegramStatus?.user) {
      if (telegramStatus.user.name) updateField('ownerName', telegramStatus.user.name);
      if (telegramStatus.user.email) updateField('ownerEmail', telegramStatus.user.email);
      if (telegramStatus.user.email && !formData.supportEmail) {
        updateField('supportEmail', telegramStatus.user.email);
      }
      toast.info(
        `Owner details pre-filled from profile (${telegramStatus.user.name || telegramStatus.user.email}).`,
        'Auto-Filled',
      );
    }
  };

  const handleAutoDetectGroups = async () => {
    setDetectingGroups(true);
    try {
      const data = await telegramApi.getUserGroups();
      const liveUserGroups = Array.isArray(data.groups)
        ? data.groups.filter((g: any) => g.isLive !== false)
        : [];

      if (liveUserGroups.length > 0) {
        setDetectedGroups(liveUserGroups);
        toast.success(
          `Discovered ${liveUserGroups.length} verified active Telegram group(s). Click any group below to apply.`,
          'Telegram Groups Found',
        );
      } else {
        const fallbackData = await telegramApi.getRecentGroups();
        const liveFallback = Array.isArray(fallbackData.groups)
          ? fallbackData.groups.filter((g: any) => g.isLive !== false)
          : [];

        if (liveFallback.length > 0) {
          setDetectedGroups(liveFallback);
          toast.success(
            `Discovered ${liveFallback.length} active Telegram group(s). Click any group below to apply.`,
            'Telegram Groups Found',
          );
        } else {
          setDetectedGroups([]);
          const bot = telegramStatus?.botUsername || 'superapp_notification_bot';
          const msg = `No active groups detected. Ensure @${bot} is added as Administrator to your group and you typed "/start@${bot}". (Plain messages like "hi" are blocked by Telegram's default Group Privacy Mode).`;
          toast.warning(msg, 'No Groups Found');
        }
      }
    } catch (err: any) {
      toast.error('Failed to scan for recent Telegram groups.', 'Scan Failed');
    } finally {
      setDetectingGroups(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData.ownerEmail?.trim()) return;
    setIsTestingEmail(true);

    try {
      const data = await telegramApi.testEmail(formData.ownerEmail.trim());
      if (data && data.success) {
        toast.success(
          `Test email sent to ${formData.ownerEmail.trim()}! Check your inbox / spam.`,
          'Email Delivered',
        );
      } else {
        const msg = data?.message || data?.error || 'Failed to send test email.';
        toast.error(msg, 'Email Delivery Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error sending test email.', 'Network Error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!formData.teamTelegramChatId?.trim()) return;
    try {
      const res = await telegramApi.saveTeamChat({
        teamTelegramChatId: formData.teamTelegramChatId.trim(),
      });
      if (res?.success) {
        toast.success('Channel saved as your default profile team group!', 'Profile Updated');
        setTelegramStatus((prev: any) => ({
          ...prev,
          user: {
            ...prev?.user,
            teamTelegramChatId: formData.teamTelegramChatId.trim(),
          },
        }));
      }
    } catch (err: any) {
      toast.error('Failed to save group to profile.', 'Error');
    }
  };

  const handleTestTeamAlert = async () => {
    if (!formData.teamTelegramChatId?.trim()) return;
    setIsTesting(true);

    try {
      const data = await telegramApi.testTeamAlert(
        formData.teamTelegramChatId.trim(),
        formData.name || 'MiniApp',
      );
      if (data && data.success) {
        toast.success(
          'Test alert sent successfully to Telegram channel / group!',
          'Telegram Alert Sent',
        );
        if (saveAsDefault && formData.teamTelegramChatId?.trim()) {
          telegramApi
            .saveTeamChat({ teamTelegramChatId: formData.teamTelegramChatId.trim() })
            .then(() => {
              toast.info('Saved this group as your default team channel in profile.', 'Profile Updated');
              setTelegramStatus((prev: any) => ({
                ...prev,
                user: {
                  ...prev?.user,
                  teamTelegramChatId: formData.teamTelegramChatId.trim(),
                },
              }));
            })
            .catch(() => {});
        }
      } else {
        const msg =
          data?.message ||
          'Failed to send test alert. Make sure @superapp_notification_bot is added to the channel/group as Admin.';
        toast.error(msg, 'Telegram Delivery Failed');
      }
    } catch (err: any) {
      toast.error(
        err.message || 'Network error sending test Telegram notification.',
        'Telegram Error',
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleConfirmDeleteCollaborator = async () => {
    if (!formData.id || !collaboratorToDelete) return;
    const targetUserId =
      collaboratorToDelete.userId ||
      collaboratorToDelete.user?.id ||
      collaboratorToDelete.id;
    setRemovingUserId(targetUserId);

    try {
      await miniappsApi.removeCollaborator(formData.id, targetUserId);
      toast.success(
        `${
          collaboratorToDelete.user?.name ||
          collaboratorToDelete.user?.email ||
          'Collaborator'
        } removed.`,
        'Collaborator Removed',
      );

      setCollaborators((prev) =>
        prev.filter(
          (c) =>
            c.userId !== targetUserId &&
            c.user?.id !== targetUserId &&
            c.id !== targetUserId,
        ),
      );

      if (setFormData) {
        setFormData((prev: any) => ({
          ...prev,
          collaborators: (prev.collaborators || []).filter(
            (c: any) =>
              c.userId !== targetUserId &&
              c.user?.id !== targetUserId &&
              c.id !== targetUserId,
          ),
        }));
      }

      setCollaboratorToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove collaborator.', 'Error');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Section 1: Publisher & Support Contacts */}
        <PublisherContactsSection
          formData={formData}
          handleChange={handleChange}
          allErrors={allErrors}
          isEditable={isEditable}
          agencyName={agencyName}
          telegramStatus={telegramStatus}
          updateField={updateField}
          handleAutofillOwner={handleAutofillOwner}
          handleTestEmail={handleTestEmail}
          isTestingEmail={isTestingEmail}
          isEditingOwner={isEditingOwner}
          setIsEditingOwner={setIsEditingOwner}
        />

        {/* Section 2: MiniApp Collaborators & Roles */}
        <CollaboratorsSection
          formData={formData}
          collaborators={collaborators}
          loadingCollaborators={loadingCollaborators}
          removingUserId={removingUserId}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onSelectCollaboratorToDelete={(collab) => setCollaboratorToDelete(collab)}
        />

        {/* Section 3: Team Telegram Channel Alerts */}
        <TelegramAlertsSection
          formData={formData}
          handleChange={handleChange}
          isEditable={isEditable}
          telegramStatus={telegramStatus}
          updateField={updateField}
          isEditingTelegram={isEditingTelegram}
          setIsEditingTelegram={setIsEditingTelegram}
          showGuide={showGuide}
          setShowGuide={setShowGuide}
          isTesting={isTesting}
          handleTestTeamAlert={handleTestTeamAlert}
          handleAutoDetectGroups={handleAutoDetectGroups}
          detectingGroups={detectingGroups}
          detectedGroups={detectedGroups}
          saveAsDefault={saveAsDefault}
          setSaveAsDefault={setSaveAsDefault}
          handleSaveToProfile={handleSaveToProfile}
        />
      </div>

      {/* Modal 1: Add MiniApp Collaborator Direct Modal */}
      <AddCollaboratorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        formData={formData}
        resolvedOrgId={resolvedOrgId}
        agencyName={agencyName}
        collaborators={collaborators}
        setCollaborators={setCollaborators}
        setFormData={setFormData}
      />

      {/* Modal 2: Deletion Confirmation Modal */}
      <DeleteCollaboratorModal
        collaborator={collaboratorToDelete}
        onClose={() => setCollaboratorToDelete(null)}
        onConfirmDelete={handleConfirmDeleteCollaborator}
        isRemoving={Boolean(removingUserId)}
      />
    </>
  );
}
