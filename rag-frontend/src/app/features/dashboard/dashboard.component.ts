import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription, timer, switchMap } from 'rxjs';
import { RagService } from '../../core/services/rag.service';
import { AuthService } from '../../core/services/auth.service';
import { UsageStats, DocumentSummary } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="page">
      <header class="page-head">
        <div class="eyebrow">Dashboard</div>
        <h1>Usage this month</h1>
        <p class="muted">Workspace: <strong>{{ tenantId }}</strong> · {{ stats()?.month }}</p>
      </header>

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (stats()) {
        <div class="grid">
          <div class="stat card">
            <div class="stat-label">Questions asked</div>
            <div class="stat-value">{{ stats()!.queriesUsed }}</div>
            <div class="stat-sub muted">of {{ queryLimit }} this month</div>
            <div class="bar"><div class="bar-fill" [style.width.%]="queryPct"></div></div>
          </div>

          <div class="stat card">
            <div class="stat-label">Documents indexed</div>
            <div class="stat-value">{{ stats()!.documentsIndexed }}</div>
            <div class="stat-sub muted">of {{ docLimit }} allowed</div>
            <div class="bar"><div class="bar-fill amber" [style.width.%]="docPct"></div></div>
          </div>

          <div class="stat card">
            <div class="stat-label">Current plan</div>
            <div class="stat-value plan">{{ plan }}</div>
            <div class="stat-sub muted">Renews monthly</div>
          </div>
        </div>

        @if (queryPct > 80 || docPct > 80) {
          <div class="nudge card">
            <div>
              <strong>You’re close to your limit.</strong>
              <p class="muted" style="margin-top:2px">You're nearing your monthly usage limit.</p>
            </div>
          </div>
        }
      } @else {
        <p class="error-text">Could not load usage stats.</p>
      }

      <div class="list-head">
        <h2>Indexed documents</h2>
        <button class="btn-refresh" (click)="loadDocuments()" [disabled]="docsLoading()">
          {{ docsLoading() ? 'Refreshing…' : '↻ Refresh' }}
        </button>
      </div>

      @if (documents().length) {
        <div class="list card">
          @for (doc of documents(); track doc.id) {
            <div class="row">
              <span class="row-file">{{ doc.filename }}</span>
              <span class="row-meta muted">{{ doc.category }} · {{ doc.chunks }} chunks</span>
              <button class="del-btn" (click)="deleteDocument(doc)" [disabled]="deletingId() === doc.id" title="Delete permanently">
                {{ deletingId() === doc.id ? '…' : '🗑 Delete' }}
              </button>
            </div>
          }
        </div>
      } @else if (!docsLoading()) {
        <p class="muted">No documents indexed yet.</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; max-width: 900px; }
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 22px; margin: 2px 0 6px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .stat { padding: 22px; }
    .stat-label { font-size: 13px; font-weight: 600; color: var(--muted); }
    .stat-value { font-family: var(--font-display); font-size: 38px; font-weight: 700; color: var(--ink); margin: 6px 0 2px; }
    .stat-value.plan { font-size: 26px; color: var(--indigo); }
    .stat-sub { font-size: 13px; }
    .bar { height: 6px; background: var(--paper); border-radius: 999px; margin-top: 14px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--indigo); border-radius: 999px; transition: width 0.4s; }
    .bar-fill.amber { background: var(--amber); }
    .nudge { margin-top: 20px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; background: var(--amber-lt); border-color: #f6d9a8; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

    .list-head { display: flex; justify-content: space-between; align-items: center; margin: 28px 0 10px; }
    .list-head h2 { font-size: 15px; margin: 0; color: var(--ink); }
    .btn-refresh {
      border: 1px solid var(--line); background: var(--surface); color: var(--ink);
      border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .btn-refresh:hover:not(:disabled) { border-color: var(--indigo); color: var(--indigo); }
    .btn-refresh:disabled { opacity: 0.6; cursor: default; }
    .list { padding: 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
    .row:last-child { border-bottom: none; }
    .row-file { font-weight: 550; color: var(--ink); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-meta { font-size: 12px; white-space: nowrap; }
    .del-btn {
      border: 1px solid var(--line); background: transparent; cursor: pointer; font-size: 12px;
      font-weight: 600; padding: 5px 10px; border-radius: 999px; color: var(--red); white-space: nowrap;
    }
    .del-btn:hover:not(:disabled) { background: var(--red-lt); border-color: var(--red); }
    .del-btn:disabled { opacity: 0.5; cursor: default; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private rag = inject(RagService);
  private auth = inject(AuthService);

  tenantId = this.auth.getTenantId();
  plan = 'Free Trial';
  queryLimit = 50;
  docLimit = 10;

  stats = signal<UsageStats | null>(null);
  loading = signal(true);
  private poll?: Subscription;

  documents = signal<DocumentSummary[]>([]);
  docsLoading = signal(false);
  deletingId = signal<string | null>(null);

  get queryPct(): number {
    const s = this.stats();
    return s ? Math.min(100, (s.queriesUsed / this.queryLimit) * 100) : 0;
  }
  get docPct(): number {
    const s = this.stats();
    return s ? Math.min(100, (s.documentsIndexed / this.docLimit) * 100) : 0;
  }

  ngOnInit(): void {
    // Load immediately, then refresh every 10s so the dashboard
    // reflects new queries and freshly-indexed documents live.
    this.poll = timer(0, 10000).pipe(
      switchMap(() => this.rag.getUsage(this.tenantId))
    ).subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });

    this.loadDocuments();
  }

  loadDocuments(): void {
    this.docsLoading.set(true);
    this.rag.listDocuments().subscribe({
      next: docs => {
        this.documents.set(docs.filter(d => d.state !== 'FAILED'));
        this.docsLoading.set(false);
      },
      error: () => this.docsLoading.set(false)
    });
  }

  /** Permanently deletes the document: vector store chunks, MinIO file, and status row. */
  deleteDocument(doc: DocumentSummary): void {
    this.deletingId.set(doc.id);
    this.rag.deleteDocument(doc.id).subscribe({
      next: () => {
        this.documents.update(l => l.filter(d => d.id !== doc.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null)
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }
}
