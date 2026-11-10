import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, userHasPermissions } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { CapabilityProposalsService } from './capability-proposals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CapabilityCodeGeneratorService } from '../capabilities/capability-code-generator.service';
import { ProposalDecision, ReviewProposalDto } from './dto/review-proposal.dto';
import { CreateCapabilityProposalDto } from './dto/create-capability-proposal.dto';
import { QueryCapabilityProposalsDto } from './dto/query-capability-proposals.dto';
import { CapabilityProposal } from './entities/capability-proposal.entity';
import { CapabilitiesService } from '../capabilities/capabilities.service';
import { suggestCapabilityKeys } from '../capabilities/capability-platform-map';
import { buildProposalProgress } from './helpers/proposal-progress.helper';
import { isPlatformAdmin } from '../access-control/helpers/platform-admin.helper';

function requesterId(req: any): string | undefined {
  return req?.user?.sub || req?.user?.id || undefined;
}

/** Outcome of the Super App code change, stored in proposal.metadata.codeChange. */
export interface StoredCodeChange {
  status: 'created' | 'needs_work' | 'not_needed' | 'failed';
  mrUrl?: string;
  /** GitLab issue tracking the manual work for the Super App team */
  issueUrl?: string;
  /** Manual steps listed in that issue */
  remainingSteps?: string[];
  branchName?: string;
  targetBranch: string;
  filesModified: string[];
  message: string;
  error?: string;
  /** ISO time of the attempt */
  at: string;
}

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller([
  'capability-proposals',
  'permission-proposals',
  'api/capability-proposals',
  'api/permission-proposals',
])
export class CapabilityProposalsController {
  private readonly logger = new Logger(CapabilityProposalsController.name);

  constructor(
    private readonly capabilityProposalsService: CapabilityProposalsService,
    private readonly notificationsService: NotificationsService,
    private readonly capabilityCodeGenerator: CapabilityCodeGeneratorService,
    private readonly capabilitiesService: CapabilitiesService,
  ) {}

  @Get()
  @RequirePermissions('permission_proposal:read')
  async getProposals(@Request() req: any, @Query() query: QueryCapabilityProposalsDto) {
    return this.capabilityProposalsService.findAll(query, req.user);
  }

  @Post()
  @RequirePermissions('permission_proposal:create')
  async createProposal(
    @Request() req: any,
    @Body() body: CreateCapabilityProposalDto,
  ) {
    const rawKey = body.capabilityKey || body.permissionKey;
    const rawName = body.capabilityName || body.permissionName;
    const { description, miniAppId, metadata } = body;

    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      throw new BadRequestException(
        'Capability key (capabilityKey/permissionKey) is required',
      );
    }

    const cleanKey = rawKey
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');

    const userId = requesterId(req);

    // Someone already asked for this capability: add this mini app to that
    // request and say so, instead of opening a second one.
    const existing =
      await this.capabilityProposalsService.findPendingByKey(cleanKey);
    if (existing.length > 0) {
      const pending = existing[0];
      const added = userId
        ? await this.capabilityProposalsService.addSupporter(pending, {
            userId,
            miniAppId: miniAppId || undefined,
          })
        : false;
      return {
        ...pending,
        duplicate: true,
        supporterAdded: added,
        message: added
          ? 'Someone already asked for this capability. We added your mini app to that request.'
          : 'You have already asked for this capability. It is waiting for review.',
      };
    }

    const proposal = await this.capabilityProposalsService.create({
      capabilityKey: cleanKey,
      capabilityName: rawName || cleanKey,
      description: description || `Capability proposal for ${cleanKey}`,
      status: 'PENDING_REVIEW',
      requestedBy: userId ? ({ id: userId } as any) : undefined,
      miniApp: miniAppId ? ({ id: miniAppId } as any) : undefined,
      metadata: metadata || {},
    });

    // Tell the people who decide (Super Admins), not the requester
    try {
      await this.notificationsService.notifyAdmins(
        'New capability request',
        `${req.user?.name || req.user?.email || 'A developer'} asked for the Super App capability "${cleanKey}". It is waiting for your review.`,
        'PROPOSAL_CREATED',
        miniAppId || undefined,
        { proposalId: proposal.id, capabilityKey: cleanKey },
        { roles: ['SUPER_ADMIN'] },
      );
    } catch (err) {
      this.logger.warn(`Could not notify reviewers of proposal ${proposal.id}: ${(err as Error)?.message}`);
    }

    return proposal;
  }

  /** "Did you mean" suggestions for a capability key someone is typing. */
  @Get('suggest-key')
  @RequirePermissions('permission_proposal:read')
  async suggestKey(@Query('q') q?: string) {
    const catalog = await this.capabilitiesService.listCatalogKeys();
    return { suggestions: suggestCapabilityKeys(q || '', catalog) };
  }

  /** Branches of the Super App repository for the approve form. */
  @Get('target-branches')
  @RequirePermissions('permission_proposal:approve')
  async targetBranches() {
    return this.capabilityCodeGenerator.listTargetBranches();
  }

  @Get(':id/preview')
  @RequirePermissions('permission_proposal:read')
  async previewProposalCode(@Request() req: any, @Param('id') id: string) {
    const proposal = await this.capabilityProposalsService.findOne(id, req.user);
    if (!proposal) throw new NotFoundException('Proposal not found');

    return this.capabilityCodeGenerator.preview(
      proposal.capabilityKey,
      proposal.metadata,
    );
  }

  /** Steps from request to release, with the live state of the code change. */
  @Get(':id/progress')
  @RequirePermissions('permission_proposal:read')
  async getProgress(@Request() req: any, @Param('id') id: string) {
    const proposal = await this.capabilityProposalsService.findOne(id, req.user);
    if (!proposal) throw new NotFoundException('Proposal not found');
    const mrUrl = proposal.metadata?.codeChange?.mrUrl as string | undefined;
    const mrState = mrUrl
      ? await this.capabilityCodeGenerator.getMergeRequestState(mrUrl)
      : null;
    const progress = buildProposalProgress(proposal, mrState);
    // Code change and task links point at the internal GitLab: platform staff only
    if (!isPlatformAdmin(req.user)) {
      progress.steps = progress.steps.map(({ links: _links, ...step }) => step);
    }
    return progress;
  }

  /** Runs the code generator and stores its outcome on the proposal. */
  private async runCodeChange(
    proposal: CapabilityProposal,
    targetVersion?: string,
    targetBranch?: string,
  ): Promise<StoredCodeChange> {
    const gen = await this.capabilityCodeGenerator.generateCapabilityMr(
      proposal,
      targetVersion,
      targetBranch,
    );
    return {
      status: gen.status,
      mrUrl: gen.mrUrl,
      issueUrl: gen.issueUrl,
      remainingSteps: gen.remainingSteps,
      branchName: gen.branchName,
      targetBranch: gen.targetBranch,
      filesModified: gen.filesModified,
      message: gen.message,
      error: gen.error,
      at: new Date().toISOString(),
    };
  }

  private withCodeChange(metadata: Record<string, any> | null | undefined, codeChange: StoredCodeChange) {
    return {
      ...(metadata || {}),
      codeChange,
      // Flat fields kept for older list views
      targetBranch: codeChange.targetBranch,
      ...(codeChange.mrUrl ? { mrUrl: codeChange.mrUrl } : {}),
      ...(codeChange.branchName ? { branchName: codeChange.branchName } : {}),
    };
  }

  @Post(':id/review')
  @RequirePermissions('permission_proposal:review')
  async reviewProposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: ReviewProposalDto,
  ) {
    const { decision, reason, targetVersion, targetBranch, createMr } = body;

    // Approving changes the Super App itself: it needs the approve permission
    // (Super Admin only), not just review.
    if (
      decision === ProposalDecision.APPROVED &&
      !userHasPermissions(req.user, ['permission_proposal:approve'])
    ) {
      throw new ForbiddenException('Only a Super Admin can approve a capability.');
    }

    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');

    // Approval is recorded even when the code step fails; the outcome is
    // returned and stored, so the reviewer sees it and can retry.
    let codeChange: StoredCodeChange | null = null;
    if (decision === 'APPROVED' && createMr !== false) {
      codeChange = await this.runCodeChange(proposal, targetVersion, targetBranch);
    }

    await this.capabilityProposalsService.update(id, {
      status: decision,
      adminDecisionReason: reason,
      targetSuperAppVersion: targetVersion,
      metadata: codeChange
        ? this.withCodeChange(proposal.metadata, codeChange)
        : proposal.metadata,
    });

    const recipients = new Set<string>();
    if (proposal.requestedBy?.id) recipients.add(proposal.requestedBy.id);
    for (const s of (proposal.metadata?.supporters || []) as Array<{ userId?: string }>) {
      if (s?.userId) recipients.add(s.userId);
    }

    if (recipients.size > 0) {
      let message = '';
      let type = 'proposal_reviewed';

      if (decision === 'APPROVED') {
        message = `Great news! Your proposal for '${proposal.capabilityKey}' has been approved and targeted for version ${targetVersion || 'a future release'}.${
          codeChange?.status === 'created' && codeChange.mrUrl
            ? ` The Super App code change is ready for review: ${codeChange.mrUrl}`
            : codeChange?.status === 'needs_work'
              ? ' The Super App team has been given a task to add it.'
              : ''
        }`;
        type = 'proposal_approved';
      } else if (decision === 'IN_DEVELOPMENT') {
        message = `Your proposal for '${proposal.capabilityKey}' is now under development for SuperApp support. You will be notified once ready for release.`;
        type = 'proposal_in_development';
      } else {
        message = `Your proposal for '${proposal.capabilityKey}' was rejected. Reason: ${reason || 'N/A'}`;
        type = 'proposal_rejected';
      }

      for (const userId of recipients) {
        try {
          await this.notificationsService.createNotification(
            userId,
            `Capability Proposal ${decision === 'IN_DEVELOPMENT' ? 'In Development' : decision}`,
            message,
            type,
          );
        } catch (err) {
          this.logger.warn(`Could not notify ${userId} about proposal ${id}: ${(err as Error)?.message}`);
        }
      }
    }

    return {
      success: true,
      codeChange,
      // Flat fields kept for older clients
      mrUrl: codeChange?.mrUrl,
      branchName: codeChange?.branchName,
      targetBranch: codeChange?.targetBranch,
      message: codeChange?.message || 'Proposal reviewed successfully.',
    };
  }

  /** Re-runs a failed code change for an approved proposal (same release and branch). */
  @Post(':id/retry-code-change')
  @RequirePermissions('permission_proposal:approve')
  async retryCodeChange(@Param('id') id: string) {
    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');
    const previous = proposal.metadata?.codeChange as StoredCodeChange | undefined;
    if (proposal.status !== 'APPROVED' || previous?.status !== 'failed') {
      throw new BadRequestException(
        'Only an approved proposal whose code change failed can be retried.',
      );
    }

    let codeChange: StoredCodeChange;
    if (previous.mrUrl) {
      // The code change itself succeeded; only the tracking issue failed
      const issue = await this.capabilityCodeGenerator.createTrackingIssue(proposal, previous.mrUrl);
      codeChange = issue.issueUrl
        ? {
            ...previous,
            status: 'created',
            issueUrl: issue.issueUrl,
            remainingSteps: issue.steps,
            error: undefined,
            message: 'Code change ready for review. The remaining work is tracked in an issue for the Super App team.',
            at: new Date().toISOString(),
          }
        : {
            ...previous,
            error: `The code change is ready, but the task for the Super App team could not be created: ${issue.error}`,
            at: new Date().toISOString(),
          };
    } else {
      codeChange = await this.runCodeChange(
        proposal,
        proposal.targetSuperAppVersion || undefined,
        previous.targetBranch || proposal.metadata?.targetBranch,
      );
    }
    await this.capabilityProposalsService.update(id, {
      metadata: this.withCodeChange(proposal.metadata, codeChange),
    });
    return { success: true, codeChange, message: codeChange.message };
  }
}

// Backwards-compatible alias
export { CapabilityProposalsController as PermissionProposalsController };
