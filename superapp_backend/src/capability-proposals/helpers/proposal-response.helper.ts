import { CapabilityProposal } from '../entities/capability-proposal.entity';

export function formatCapabilityProposalResponse<
  T extends Partial<CapabilityProposal>,
>(proposal: T): T & { permissionKey: string; permissionName: string } {
  if (!proposal) return proposal;
  return {
    ...proposal,
    permissionKey: (proposal.capabilityKey ||
      (proposal as any).permissionKey ||
      '') as string,
    permissionName: (proposal.capabilityName ||
      (proposal as any).permissionName ||
      '') as string,
  };
}
