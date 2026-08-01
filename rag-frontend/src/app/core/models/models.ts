// Models mirroring the Spring Boot backend DTOs

export interface QueryRequest {
  question: string;
}

export interface SourceRef {
  filename: string;
  page: string;
  category: string;
  rerankScore: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceRef[];
}

export interface IngestResult {
  statusId: string;
  filename: string;
  chunks: number;
  status: string;
}

export interface IngestionStatus {
  id: string;
  filename: string;
  state: 'QUEUED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  chunks: number;
  error: string;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  category: string;
  state: 'QUEUED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  chunks: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  type: string;
}

export interface UsageStats {
  tenantId: string;
  queriesUsed: number;
  documentsIndexed: number;
  month: string;
}

export interface SignupRequest {
  companyName: string;
  contactEmail: string;
  adminUsername: string;
}

// A chat message in the UI
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: SourceRef[];
  pending?: boolean;
}
