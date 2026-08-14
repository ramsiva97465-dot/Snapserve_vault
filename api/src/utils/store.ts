export interface InMemoryDocument {
  id: string;
  title: string;
  status: string;
  originalFileUrl?: string;
  signedFileUrl?: string;
  signingOrder: string;
  expiresAt?: string;
  fileName?: string;
  fileSize?: number;
  ownerId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; email: string };
  signers?: any[];
  fields?: any[];
  signingTokens?: any[];
}

export const inMemoryStore = {
  documents: [] as InMemoryDocument[],
};
