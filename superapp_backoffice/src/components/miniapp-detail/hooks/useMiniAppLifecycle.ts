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
}

export function useMiniAppLifecycle({
  id,
  formData,
  setFormData,
  fetchApp,
  setIsSubmitting,
  setBuildModalState,
  setActiveTab,
}: UseMiniAppLifecycleProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [lifecycleReasonModal, setLifecycleReasonModal] = useState<LifecycleReasonModalState | null>(null);

  const handleLifecycleAction = async (
    action: LifecycleActionType,
    explicitReason?: string
  ) => {
    const isLiveWithRevision = formData.status === 'ACTIVE' && Boolean(formData.pendingRevision);

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
        : action === 'activate'
        ? 'activate'
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
          ? 'Are you sure you want to trigger the Jenkins test build? This will compile the SuperApp container in debug mode and upload the test APK to Nexus for manual testing.'
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

      const res = await miniappsApi.triggerAction(id, action, reason);
      const msg =
        action === 'start-testing'
          ? 'SuperApp test build pipeline triggered in Jenkins! Packaging test APK for Nexus store...'
          : action === 'publish-revision'
          ? 'Staged revision published live to SuperApp successfully!'
          : action === 'discard-revision'
          ? 'Pending draft revision has been discarded.'
          : action === 'approve'
          ? 'MiniApp approved successfully! Redirecting to Security & Compliance scan...'
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

  return {
    lifecycleReasonModal,
    setLifecycleReasonModal,
    handleLifecycleAction,
    handleDelete,
  };
}
