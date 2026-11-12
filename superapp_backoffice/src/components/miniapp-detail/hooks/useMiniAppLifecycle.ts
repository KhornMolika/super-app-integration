'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { miniappsApi } from '@/api';
import { toast } from '@/components/ui/Toast';
import { BuildProgressModalState } from '@/components/ui/BuildProgressModal';
import { LifecycleActionType, LifecycleReasonModalState, MiniAppDetailFormData } from '../types';
import type { MiniAppTabType } from '../MiniAppDetailTabs';

interface UseMiniAppLifecycleProps {
  id: string;
  formData: MiniAppDetailFormData;
  setFormData: React.Dispatch<React.SetStateAction<MiniAppDetailFormData>>;
  fetchApp: (isRetry?: boolean, isSilent?: boolean) => Promise<void>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setBuildModalState: React.Dispatch<React.SetStateAction<BuildProgressModalState>>;
  setActiveTab?: (tab: MiniAppTabType) => void;
  role?: string;
}

export function useMiniAppLifecycle({
  id,
  formData,
  setFormData,
  fetchApp,
  setIsSubmitting,
  setBuildModalState,
  setActiveTab,
  role,
}: UseMiniAppLifecycleProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [lifecycleReasonModal, setLifecycleReasonModal] = useState<LifecycleReasonModalState | null>(null);

  const handleLifecycleAction = async (
    action: LifecycleActionType,
    explicitReason?: string,
    extra?: Record<string, unknown>
  ) => {
    const isLiveWithRevision = formData.status === 'ACTIVE' && Boolean(formData.pendingRevision);
    const appLabel = formData.name || formData.appId || 'this mini app';

    if (action === 'suspend' && explicitReason === undefined) {
      const isSuperAdmin = role === 'SUPER_ADMIN';
      setLifecycleReasonModal({
        isOpen: true,
        action: 'suspend',
        title: 'Suspend MiniApp',
        description: `"${appLabel}" will be hidden from users at once and can no longer be opened. You can resume it later.`,
        confirmText: 'Suspend Now',
        confirmVariant: 'warning',
        placeholder: 'Why must this mini app be stopped now?',
        quickSuggestions: [
          'Security issue reported; stopped while it is investigated',
          'Partner breached the terms of service',
          'Mini app is broken for users',
          'Requested by the partner',
        ],
        checkboxLabel: isSuperAdmin ? undefined : 'Also ask a Super Admin to archive it',
        checkboxHint: 'A Super Admin decides. Archived mini apps stop for good but stay on record.',
        audienceNote: 'The reason is shown to the developer and in the activity log',
      });
      return;
    }

    if (action === 'request-archive' && explicitReason === undefined) {
      setLifecycleReasonModal({
        isOpen: true,
        action: 'request-archive',
        title: 'Ask to Archive',
        description: `A Super Admin will be asked to archive "${appLabel}". It stays suspended until they decide.`,
        confirmText: 'Send Request',
        confirmVariant: 'warning',
        placeholder: 'Why should this mini app be stopped for good?',
        quickSuggestions: [
          'Partner has ended the service',
          'Serious security issue that cannot be fixed',
          'Replaced by a newer mini app',
        ],
        audienceNote: 'Sent to Super Admins and kept in the activity log',
      });
      return;
    }

    if (action === 'archive' && explicitReason === undefined) {
      if (formData.archiveRequest) {
        const ok = await confirm({
          title: 'Archive MiniApp',
          message: `Archive "${appLabel}" as requested by ${formData.archiveRequest.requestedByName || 'an admin'}? It stops for good, its App ID stays taken, and a Super Admin can restore it as a draft later.`,
          confirmText: 'Archive',
          confirmVariant: 'danger',
          cancelText: 'Cancel',
        });
        if (!ok) return;
        return handleLifecycleAction('archive', '');
      }
      setLifecycleReasonModal({
        isOpen: true,
        action: 'archive',
        title: 'Archive MiniApp',
        description: `"${appLabel}" stops for good and is hidden from users. It stays on record with its App ID, and can be restored as a draft later.`,
        confirmText: 'Archive',
        confirmVariant: 'danger',
        placeholder: 'Why is this mini app being archived?',
        quickSuggestions: [
          'Partner has ended the service',
          'Serious security issue that cannot be fixed',
          'Replaced by a newer mini app',
          'Test registration, no longer needed',
        ],
        audienceNote: 'The reason is shown to the developer and in the activity log',
      });
      return;
    }

    if (action === 'decline-archive' && explicitReason === undefined) {
      setLifecycleReasonModal({
        isOpen: true,
        action: 'decline-archive',
        title: 'Decline Archive Request',
        description: 'The mini app stays as it is (still suspended if it was). The admin who asked will be told.',
        confirmText: 'Decline',
        confirmVariant: 'warning',
        placeholder: 'Optional note for the admin who asked',
        quickSuggestions: [],
        required: false,
        audienceNote: 'Sent to the admin who asked',
      });
      return;
    }

    if (action === 'discard-revision' && explicitReason === undefined) {
      setLifecycleReasonModal({
        isOpen: true,
        action: 'discard-revision',
        title: 'Reject & Discard Staged Revision',
        description: 'Are you sure you want to reject this revision? All proposed changes will be discarded while the live version remains active in the SuperApp catalog.',
        confirmText: 'Reject Revision',
        confirmVariant: 'danger',
        placeholder: 'Explain why this revision cannot be accepted...',
        quickSuggestions: [
          'Violates SuperApp platform capability and security policies',
          'High-risk capabilities requested without required partner certification',
          'Duplicate or conflicting capability with existing SuperApp core features',
          'Incompatible technical architecture or failed automated security baseline',
        ],
      });
      return;
    }

    if (action === 'reject' && explicitReason === undefined) {
      if (isLiveWithRevision) {
        setLifecycleReasonModal({
          isOpen: true,
          action: 'discard-revision',
          title: 'Reject & Discard Staged Revision',
          description: 'Are you sure you want to reject this staged revision? All proposed changes will be discarded while the live version remains active in the SuperApp.',
          confirmText: 'Reject Revision',
          confirmVariant: 'danger',
          placeholder: 'Explain why this revision is being rejected...',
          quickSuggestions: [
            'Violates SuperApp platform capability and security policies',
            'High-risk capabilities requested without required partner certification',
            'Duplicate or conflicting capability with existing SuperApp core features',
            'Security baseline checks failed on proposed endpoint or artifact',
          ],
        });
        return;
      }

      setLifecycleReasonModal({
        isOpen: true,
        action: 'reject',
        title: 'Reject MiniApp Submission',
        description: 'Specify the reason for rejecting this MiniApp. The developer will receive this feedback to remediate issues.',
        confirmText: 'Reject MiniApp',
        confirmVariant: 'danger',
        placeholder: 'Explain why this MiniApp is being rejected...',
        quickSuggestions: [
          'App description or assets violate SuperApp content guidelines',
          'Integration endpoint is unreachable or returning invalid responses',
          'High-risk capabilities requested without acceptable justification',
          'Security or domain verification requirements failed baseline',
        ],
      });
      return;
    }

    if (action === 'request-changes' && explicitReason === undefined) {
      if (isLiveWithRevision) {
        setLifecycleReasonModal({
          isOpen: true,
          action: 'request-changes',
          title: 'Request Changes on Staged Revision',
          description: 'Specify the required fixes. The staged revision will remain in draft for the developer while the live version remains active.',
          confirmText: 'Send Request',
          confirmVariant: 'warning',
          placeholder: 'Specify what updates are needed in this revision...',
          quickSuggestions: [
            'Capability purpose is too vague; provide explicit business context',
            'Domain whitelist includes unverified external domains',
            'Terms of Service / Privacy Policy URL is inaccessible or invalid',
            'Security scan flagged potential SSRF risk on target endpoint',
          ],
        });
        return;
      }

      setLifecycleReasonModal({
        isOpen: true,
        action: 'request-changes',
        title: 'Request Changes from Developer',
        description: 'Provide details on what needs to be updated before this MiniApp can proceed through the approval pipeline.',
        confirmText: 'Send Request',
        confirmVariant: 'warning',
        placeholder: 'Specify what updates are needed...',
        quickSuggestions: [
          'Please clarify and provide detailed purpose for requested capabilities',
          'Domain verification TXT / association record is missing or expired',
          'Update Terms of Service and Privacy Policy URLs to valid live documents',
          'Resolve reported security scan vulnerabilities before resubmission',
        ],
      });
      return;
    }

    let reason = explicitReason || '';
    if (!explicitReason) {
      const isTestBuild = action === 'start-testing';
      const isPublishRev = action === 'publish-revision';
      const isDiscardRev = action === 'discard-revision';
      const actionLabel = isTestBuild
        ? 'build test package and advance to testing'
        : isPublishRev
        ? 'publish the staged revision live to production'
        : isDiscardRev
        ? 'discard the pending revision'
        : action === 'pass-testing'
        ? 'mark the test build as passed for'
        : action === 'activate'
        ? 'activate (this starts the production release build)'
        : action === 'submit'
        ? 'submit for review'
        : action === 'restore'
        ? 'restore (it comes back as a DRAFT and must be submitted again)'
        : action;

      const isConfirmed = await confirm({
        title: isPublishRev
          ? 'Publish Staged Revision to Live'
          : isDiscardRev
          ? 'Discard Staged Revision'
          : isTestBuild
          ? 'Trigger SuperApp Test Build'
          : `Confirm ${actionLabel}`,
        message: isPublishRev
          ? 'Are you sure you want to publish the staged revision to production? This will update the live MiniApp in the SuperApp catalog immediately.'
          : isDiscardRev
          ? 'Are you sure you want to discard this pending draft revision? Any unmerged changes will be lost.'
          : isTestBuild
          ? 'Are you sure you want to trigger the Jenkins test build? It checks the scanned package in MinIO, publishes it to Nexus if needed, compiles a release-mode test APK, uploads it to Nexus and sends it to Telegram for manual testing.'
          : `Are you sure you want to ${actionLabel} this MiniApp?`,
        confirmText: isPublishRev
          ? 'Publish Live'
          : isDiscardRev
          ? 'Discard Changes'
          : isTestBuild
          ? 'Trigger Test Build'
          : `Yes, proceed`,
        confirmVariant: isDiscardRev ? 'danger' : 'primary',
        cancelText: 'Cancel',
      });
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      if (action === 'start-testing') {
        const cleanStages = {
          preflight: {
            id: 'preflight',
            name: '1. Pre-Flight & Manifest Verification',
            status: 'RUNNING',
            details: 'Verifying package checksums, dependencies, and manifest integrity...',
            updatedAt: new Date().toISOString(),
          },
          compile: {
            id: 'compile',
            name: '2. Fastlane APK Packaging',
            status: 'PENDING',
            details: 'Awaiting container assembly and Fastlane APK compilation...',
            updatedAt: new Date().toISOString(),
          },
          publish: {
            id: 'publish',
            name: '3. Publish to Nexus & Finalize',
            status: 'PENDING',
            details: 'Awaiting artifact upload to Sonatype Nexus...',
            updatedAt: new Date().toISOString(),
          },
        };

        setBuildModalState({
          isOpen: true,
          status: 'building',
          releaseVersion: formData.activeTestVersion || (formData.integrationConfig as any)?.superAppTestVersion || 'v1.0.0',
          stages: cleanStages,
          appId: formData.appId,
          appName: formData.name,
          errorMessage: undefined,
        });

        setFormData((prev: any) => ({
          ...prev,
          status: 'BUILDING',
          buildStatus: 'BUILDING',
          buildError: undefined,
          buildStages: cleanStages,
        }));
      }

      const res = await miniappsApi.triggerAction(id, action, reason || undefined, extra);
      const msg =
        action === 'start-testing'
          ? 'SuperApp test build pipeline triggered in Jenkins! Packaging test APK for Nexus store...'
          : action === 'publish-revision'
          ? 'Staged revision published live to SuperApp successfully!'
          : action === 'discard-revision'
          ? 'Pending draft revision has been discarded.'
          : action === 'approve'
          ? 'MiniApp approved successfully! Redirecting to Security & Compliance scan...'
          : action === 'suspend'
          ? extra?.requestArchive
            ? 'MiniApp suspended. A Super Admin was asked to archive it.'
            : 'MiniApp suspended and hidden from users.'
          : action === 'pass-testing'
          ? 'Testing marked as passed. The MiniApp can now be activated.'
          : action === 'resume'
          ? 'MiniApp resumed and available again.'
          : action === 'request-archive'
          ? 'A Super Admin was asked to archive this mini app.'
          : action === 'archive'
          ? 'MiniApp archived.'
          : action === 'decline-archive'
          ? 'Archive request declined.'
          : action === 'restore'
          ? 'MiniApp restored as a draft.'
          : res?.message || 'MiniApp status successfully updated!';
      toast.success(msg, 'Lifecycle Updated');
      fetchApp();
      if ((action === 'approve' || action === 'submit') && setActiveTab) {
        setActiveTab('report');
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to execute ${action}.`, 'Action Failed');
      if (action === 'start-testing') {
        setBuildModalState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err?.message || 'Failed to trigger Jenkins test build.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: 'Delete MiniApp',
      message: 'Are you sure you want to delete this mini app? This action cannot be undone.',
      confirmText: 'Delete App',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await miniappsApi.delete(id);
      toast.success('MiniApp deleted successfully.', 'Deleted');
      router.push('/miniapps');
    } catch (error: any) {
      toast.error(error?.message || 'Error deleting mini app.', 'Connection Error');
      setIsSubmitting(false);
    }
  };

  /** Step 1: ask for the App ID. Step 2 (typed): delete and report Nexus cleanup. */
  const handleDeletePermanently = async (typedAppId?: string) => {
    const appId = formData.appId || '';
    if (typedAppId === undefined) {
      setLifecycleReasonModal({
        isOpen: true,
        action: 'delete-permanently',
        title: 'Delete Permanently',
        description: `This removes "${formData.name || appId}" with its versions, builds and files, and its published packages in Nexus. It cannot be undone. Type the App ID ${appId} to confirm.`,
        confirmText: 'Delete Permanently',
        confirmVariant: 'danger',
        placeholder: appId,
        quickSuggestions: [],
        audienceNote: 'The App ID becomes free to register again',
      });
      return;
    }
    if (typedAppId.trim() !== appId) {
      toast.error('The App ID does not match. Nothing was deleted.', 'Not Deleted');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await miniappsApi.delete(id, appId);
      const nexus = res?.nexus;
      const removed = nexus?.removed?.length || 0;
      toast.success(
        removed ? `Deleted. Removed ${removed} file${removed === 1 ? '' : 's'} from Nexus.` : 'Deleted.',
        'MiniApp Deleted',
      );
      if (nexus?.failed?.length) {
        toast.warning(`Remove by hand in Nexus: ${nexus.failed.join('; ')}`, 'Nexus Cleanup Incomplete');
      }
      if (nexus?.kept?.length) {
        toast.info(`Kept in Nexus: ${nexus.kept.join('; ')}`, 'Shared Packages Kept');
      }
      router.push('/miniapps');
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete the mini app.', 'Delete Failed');
      setIsSubmitting(false);
    }
  };

  return {
    lifecycleReasonModal,
    setLifecycleReasonModal,
    handleLifecycleAction,
    handleDelete,
    handleDeletePermanently,
  };
}
