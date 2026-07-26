import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QueryResponse, IngestResult, UsageStats, IngestionStatus } from '../models/models';

/**
 * RagService — calls the backend RAG endpoints.
 *   query()    → ask a question, get a cited answer
 *   ingest()   → upload a document
 *   getUsage() → dashboard stats
 *   checkout() → start a plan upgrade
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

  getUsage(tenantId: string): Observable<UsageStats> {
    return this.http.get<UsageStats>(`${this.api}/admin/dashboard/usage/${tenantId}`);
  }

  checkout(tenantId: string, plan: string): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(
      `${this.api}/billing/checkout`, { tenantId, plan });
  }
}
