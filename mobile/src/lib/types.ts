export type Ecl = 'L' | 'M' | 'Q' | 'H';

/** Design settings stored in the backend `settings` JSONB column. */
export type QRSettings = {
  fgColor: string;
  bgColor: string;
  ecl: Ecl;
  quietZone: number;
  gradient?: { colors: [string, string] } | null;
  /** Optional logo as a data URI or file URI. */
  logo?: string | null;
};

export const DEFAULT_QR_SETTINGS: QRSettings = {
  fgColor: '#000000',
  bgColor: '#FFFFFF',
  ecl: 'M',
  quietZone: 8,
  gradient: null,
  logo: null,
};

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QRCode = {
  id: string;
  label?: string | null;
  url: string;
  settings: QRSettings;
  format: string;
  batchId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Batch = {
  id: string;
  name?: string | null;
  count: number;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type CreateQRCodeInput = {
  label?: string | null;
  url: string;
  settings: QRSettings;
  format?: string;
  batchId?: string | null;
};

export type UpdateQRCodeInput = {
  label?: string | null;
  url?: string;
  settings?: QRSettings;
  format?: string;
};

export type CreateBatchInput = {
  name?: string | null;
  qrcodes: CreateQRCodeInput[];
};

export type CreateBatchResponse = {
  batch: Batch;
  qrcodes: QRCode[];
};
