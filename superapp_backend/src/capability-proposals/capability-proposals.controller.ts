import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller(['capability-proposals', 'permission-proposals'])
export class CapabilityProposalsController {
  private readonly logger = new Logger(CapabilityProposalsController.name);

  constructor(
    private readonly capabilityProposalsService: CapabilityProposalsService,
    private readonly notificationsService: NotificationsService,
    private readonly capabilityCodeGenerator: CapabilityCodeGeneratorService,
  ) {}

  @Get()
  @RequirePermissions('permission_proposal:read')
  async getProposals() {
    return this.capabilityProposalsService.findAll();
  }

  @Post()
  @RequirePermissions('permission_proposal:read')
  async createProposal(@Request() req: any, @Body() body: any) {
    const rawKey = body.capabilityKey || body.permissionKey;
    const rawName = body.capabilityName || body.permissionName;
    const { description, miniAppId, metadata } = body;
    
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      throw new BadRequestException('Capability key (capabilityKey/permissionKey) is required');
    }

    const cleanKey = rawKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    // Check if there is already a pending proposal for this key
    const existing = await this.capabilityProposalsService.findPendingByKey(cleanKey);
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

  @Post(':id/review')
  @RequirePermissions('permission_proposal:review')
  async reviewProposal(
    @Param('id') id: string,
    @Body() body: ReviewProposalDto,
  ) {
    const proposal = await this.capabilityProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');

    const { decision, reason, targetVersion, targetBranch, createMr } = body;

    let mrResult: { mrUrl?: string; branchName?: string; targetBranch?: string; message?: string } | null = null;

    if (decision === 'APPROVED' && createMr !== false) {
      try {
        const gen = await this.capabilityCodeGenerator.generateCapabilityMr(
          proposal,
          targetVersion,
          targetBranch,
        );
        mrResult = {
          mrUrl: gen.mrUrl,
          branchName: gen.branchName,
          targetBranch: gen.targetBranch,
          message: gen.message,
        };
      } catch (err: any) {
        this.logger.error(`Automated MR generation failed: ${err.message}`);
        // If git branch fails, we still record approval but inform the admin
        mrResult = {
          message: `Proposal approved, but automated MR creation failed: ${err.message}`,
        };
      }
    }

    const updatedMetadata = {
      ...(proposal.metadata || {}),
      ...(mrResult?.mrUrl ? { mrUrl: mrResult.mrUrl } : {}),
      ...(mrResult?.branchName ? { branchName: mrResult.branchName } : {}),
      ...(mrResult?.targetBranch ? { targetBranch: mrResult.targetBranch } : {}),
    };

    await this.capabilityProposalsService.update(id, {
      status: decision,
      adminDecisionReason: reason,
      targetSuperAppVersion: targetVersion,
      metadata: updatedMetadata,
    });

    if (proposal.requestedBy) {
      let message = '';
      let type = 'proposal_reviewed';

      if (decision === 'APPROVED') {
        message = `Great news! Your proposal for '${proposal.capabilityKey}' has been approved and targeted for version ${targetVersion || 'a future release'}. ${
          mrResult?.mrUrl ? `Merge Request created: ${mrResult.mrUrl}` : ''
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
      mrUrl: mrResult?.mrUrl,
      branchName: mrResult?.branchName,
      message: mrResult?.message || 'Proposal reviewed successfully.',
    };
  }
}

// Backwards-compatible alias
export { CapabilityProposalsController as PermissionProposalsController };
