import * as crypto from 'crypto';

export const sha256Hex = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');
