// Deprecated: Activities have been unified into audit_logs.
// This class is preserved as a lightweight interface for backwards compatibility.
export class MiniAppActivity {
  id!: string;
  miniAppId!: string;
  actorId!: string;
  type!: string;
  title!: string;
  description!: string;
  createdAt!: Date;
}
