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
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { CapabilityProposalsService } from './capability-proposals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CapabilityCodeGeneratorService } from '../capabilities/capability-code-generator.service';
import { ReviewProposalDto } from './dto/review-proposal.dto';
import { CreateCapabilityProposalDto } from './dto/create-capability-proposal.dto';
import { QueryCapabilityProposalsDto } from './dto/query-capability-proposals.dto';
import { CapabilityProposal } from './entities/capability-proposal.entity';
import { CapabilitiesService } from '../capabilities/capabilities.service';
import { suggestCapabilityKeys } from '../capabilities/capability-platform-map';

/** Outcome of the Super App code change, stored in proposal.metadata.codeChange. */
export interface StoredCodeChange {
  status: 'created' | 'not_needed' | 'failed';
  mrUrl?: string;
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
  async getProposals(@Query() query: QueryCapabilityProposalsDto) {
    return this.capabilityProposalsService.findAll(query);
  }

  @Post()
  @RequirePermissions('permission_proposal:read')
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

    // Check if there is already a pending proposal for this key
    const existing =
      await this.capabilityProposalsService.findPendingByKey(cleanKey);
    if (existing.length > 0) {
      return existing[0];
    }

    const proposal = await this.capabilityProposalsService.create({
      capabilityKey: cleanKey,
      capabilityName: rawName || cleanKey,
      description: description || `Capability proposal for ${cleanKey}`,
      status: 'PENDING_REVIEW',
      requestedBy: req.user,
      miniApp: miniAppId ? ({ id: miniAppId } as any) : undefined,
      metadata: metadata || {},
    });

    try {
      await this.notificationsService.createNotification(
        req.user?.id || 'system',
        'New Capability Proposed',
        `Proposal submitted for capability: "${cleanKey}". Ready for review & injection.`,
        'PROPOSAL_CREATED',
      );
    } catch (_) {}

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
  @RequirePermissions('permission_proposal:review')
  async targetBranches() {
    return this.capabilityCodeGenerator.listTargetBranches();
  }

  @Get(':id/preview')
  @RequirePermissions('permission_proposal:read')
  async previewProposalCode(@Param('id') id: string) {
    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');

    return this.capabilityCodeGenerator.preview(
      proposal.capabilityKey,
      proposal.metadata,
    );
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
    @Param('id') id: string,
    @Body() body: ReviewProposalDto,
  ) {
    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');

    const { decision, reason, targetVersion, targetBranch, createMr } = body;

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

    if (proposal.requestedBy) {
      let message = '';
      let type = 'proposal_reviewed';

      if (decision === 'APPROVED') {
        message = `Great news! Your proposal for '${proposal.capabilityKey}' has been approved and targeted for version ${targetVersion || 'a future release'}.${
          codeChange?.status === 'created' && codeChange.mrUrl
            ? ` The Super App code change is ready for review: ${codeChange.mrUrl}`
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

      await this.notificationsService.createNotification(
        proposal.requestedBy.id,
        `Capability Proposal ${decision === 'IN_DEVELOPMENT' ? 'In Development' : decision}`,
        message,
        type,
      );
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
  @RequirePermissions('permission_proposal:review')
  async retryCodeChange(@Param('id') id: string) {
    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');
    const previous = proposal.metadata?.codeChange as StoredCodeChange | undefined;
    if (proposal.status !== 'APPROVED' || previous?.status !== 'failed') {
      throw new BadRequestException(
        'Only an approved proposal whose code change failed can be retried.',
      );
    }

    const codeChange = await this.runCodeChange(
      proposal,
      proposal.targetSuperAppVersion || undefined,
      previous.targetBranch || proposal.metadata?.targetBranch,
    );
    await this.capabilityProposalsService.update(id, {
      metadata: this.withCodeChange(proposal.metadata, codeChange),
    });
    return { success: true, codeChange, message: codeChange.message };
  }
}

// Backwards-compatible alias
export { CapabilityProposalsController as PermissionProposalsController };
