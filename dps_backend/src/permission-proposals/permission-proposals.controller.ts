import { Controller, Get, Post, Param, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../access-control/guards/rbac.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionProposalsService } from './permission-proposals.service';
import { NotificationsService } from '../notifications/notifications.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('permission-proposals')
export class PermissionProposalsController {
  constructor(
    private readonly permissionProposalsService: PermissionProposalsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @RequirePermissions('permission_proposal:read')
  async getProposals() {
    return this.permissionProposalsService.findAll();
  }

  @Post(':id/review')
  @RequirePermissions('permission_proposal:review')
  async reviewProposal(@Param('id') id: string, @Body() body: any) {
    const proposal = await this.permissionProposalsService.findOne(id);
    if (!proposal) throw new NotFoundException('Proposal not found');

    const { decision, reason, targetVersion } = body;
    
    await this.permissionProposalsService.update(id, {
      status: decision,
      adminDecisionReason: reason,
      targetSuperAppVersion: targetVersion,
    });

    if (proposal.requestedBy) {
      const message = decision === 'APPROVED' 
        ? `Great news! Your proposal for '${proposal.permissionKey}' has been approved and targeted for version ${targetVersion || 'a future release'}.`
        : `Your proposal for '${proposal.permissionKey}' was rejected. Reason: ${reason || 'N/A'}`;
        
      await this.notificationsService.createNotification(
        proposal.requestedBy.id,
        `Permission Proposal ${decision}`,
        message,
        decision === 'APPROVED' ? 'proposal_approved' : 'proposal_rejected'
      );
    }
    
    return { success: true };
  }
}
