export * from './permissions.api';
import { permissionsApi, PermissionProposal } from './permissions.api';

export const capabilitiesApi = permissionsApi;
export type CapabilityProposal = PermissionProposal;
