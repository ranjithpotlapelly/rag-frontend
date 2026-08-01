import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QueryResponse, IngestResult, UsageStats, IngestionStatus, DocumentSummary } from '../models/models';

/**
 * RagService — calls the backend RAG endpoints.
 *   query()    → ask a question, get a cited answer
 *   ingest()   → upload a document
 *   getUsage() → dashboard stats
 */
@Injectable({ providedIn: 'root' })
export class RagService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  query(question: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.api}/query`, { question });
  }

  ingest(file: File, category: string): Observable<IngestResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    return this.http.post<IngestResult>(`${this.api}/ingest`, form);
  }

  /** Poll ingestion status until INDEXED or FAILED. */
  getIngestStatus(id: string): Observable<IngestionStatus> {
    return this.http.get<IngestionStatus>(`${this.api}/ingest/status/${id}`);
  }

  /** List documents already indexed for the caller's tenant. */
  listDocuments(): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(`${this.api}/ingest`);
  }

  /** Delete a document: removes it from the vector store, MinIO, and status tracking. */
  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/ingest/${id}`);
  }

  getUsage(tenantId: string): Observable<UsageStats> {
    return this.http.get<UsageStats>(`${this.api}/admin/dashboard/usage/${tenantId}`);
  }
}
