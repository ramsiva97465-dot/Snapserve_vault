export type DocumentStatus =
  | "DRAFT"
  | "PREPARING"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_SIGNED"
  | "COMPLETED"
  | "EXPIRED"
  | "DECLINED"
  | "CANCELLED";

export type SignerStatus =
  | "PENDING"
  | "SENT"
  | "VIEWED"
  | "COMPLETED"
  | "DECLINED";

export type FieldType =
  | "SIGNATURE"
  | "INITIALS"
  | "SEAL"
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "CHECKBOX"
  | "EMAIL"
  | "COMPANY"
  | "ADDRESS"
  | "PHONE"
  | "DROPDOWN"
  | "RADIO"
  | "ATTACHMENT"
  | "NOTE";

export type SignatureType = "TYPED" | "DRAWN" | "UPLOADED";
export type SigningOrder = "SEQUENTIAL" | "PARALLEL";
export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
}

export interface Document {
  id: string;
  title: string;
  status: DocumentStatus;
  originalFileUrl?: string;
  signedFileUrl?: string;
  signingOrder: SigningOrder;
  expiresAt?: string;
  pageCount?: number;
  fileSize?: number;
  fileName?: string;
  ownerId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; email: string };
  signers?: Signer[];
  fields?: DocumentField[];
  signingTokens?: SigningToken[];
  _count?: { signatures: number };
}

export interface Signer {
  id: string;
  documentId: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  orderIndex: number;
  status: SignerStatus;
  signedAt?: string;
  viewedAt?: string;
  color?: string;
  createdAt: string;
}

export interface DocumentField {
  id: string;
  documentId: string;
  signerId?: string;
  fieldType: FieldType;
  fieldName: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isRequired: boolean;
  defaultValue?: string;
  placeholder?: string;
  properties?: Record<string, any>;
  createdAt: string;
  signer?: Signer;
  value?: string;
  imageData?: string;
}

export interface SigningToken {
  id: string;
  documentId: string;
  signerId: string;
  token: string;
  expiresAt?: string;
  usedAt?: string;
  revokedAt?: string;
}

export interface Signature {
  id: string;
  documentId: string;
  signerId: string;
  fieldId?: string;
  signatureType: SignatureType;
  value?: string;
  imageUrl?: string;
  imageData?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorName?: string;
  actorEmail?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  documentId?: string;
  userId?: string;
  createdAt: string;
  document?: { title: string };
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  userId: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fieldsConfig?: any;
  usageCount: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  organizationId: string;
  createdAt: string;
  lastSignedAt?: string;
}

export interface AnalyticsStats {
  total: number;
  sent: number;
  completed: number;
  drafts: number;
  awaitingSignature: number;
  expired: number;
  completionRate: number;
}

// Editor types
export interface EditorField extends Omit<DocumentField, "id" | "createdAt"> {
  id: string;
  tempId?: string;
}

export const SIGNER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export const FIELD_LABELS: Record<FieldType, string> = {
  SIGNATURE: "Signature",
  INITIALS: "Initials",
  SEAL: "Seal",
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  CHECKBOX: "Checkbox",
  EMAIL: "Email",
  COMPANY: "Company",
  ADDRESS: "Address",
  PHONE: "Phone",
  DROPDOWN: "Dropdown",
  RADIO: "Radio",
  ATTACHMENT: "Attachment",
  NOTE: "Note",
};

export const FIELD_SIZES: Record<FieldType, { width: number; height: number }> = {
  SIGNATURE: { width: 180, height: 56 },
  INITIALS: { width: 100, height: 56 },
  SEAL: { width: 100, height: 100 },
  TEXT: { width: 160, height: 36 },
  NUMBER: { width: 120, height: 36 },
  DATE: { width: 140, height: 36 },
  CHECKBOX: { width: 36, height: 36 },
  EMAIL: { width: 180, height: 36 },
  COMPANY: { width: 160, height: 36 },
  ADDRESS: { width: 200, height: 36 },
  PHONE: { width: 140, height: 36 },
  DROPDOWN: { width: 160, height: 36 },
  RADIO: { width: 36, height: 36 },
  ATTACHMENT: { width: 140, height: 40 },
  NOTE: { width: 180, height: 60 },
};
