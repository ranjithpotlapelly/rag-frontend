import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, switchMap, takeWhile } from 'rxjs';
import { RagService } from '../../core/services/rag.service';

type UiState = 'uploading' | 'queued' | 'processing' | 'indexed' | 'error';

interface UploadItem {
  id?: string;
  filename: string;
  state: UiState;
  chunks?: number;
  deleting?: boolean;
}

/**
 * Upload — drag-and-drop ingestion with LIVE status, plus the persisted
 * list of already-indexed documents.
 *
 * On load, fetches GET /api/ingest to show documents indexed in earlier
 * sessions. New uploads are blocked client-side (and by the backend's 409)
 * if the filename is already indexed. Each indexed row has a delete button
 * wired to DELETE /api/ingest/{id}, which removes the file from MinIO, the
 * vector store, and status tracking.
 */
@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="page-head">
        <div class="eyebrow">Documents</div>
        <h1>Add documents to your knowledge base</h1>
        <p class="muted">PDF, Word, Excel, HTML, or text. Status updates live as each file is indexed.</p>
      </header>

      <div class="field" style="max-width:320px">
        <label for="cat">Category</label>
        <select id="cat" class="input" [(ngModel)]="category">
          <option value="general">General</option>
          <option value="hr-policy">HR Policy</option>
          <option value="contract">Contract</option>
          <option value="technical">Technical</option>
          <option value="compliance">Compliance</option>
        </select>
      </div>

      <div class="dropzone" [class.over]="dragOver()"
           (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)"
           (drop)="onDrop($event)" (click)="picker.click()">
        <div class="drop-ico">📄</div>
        <div class="drop-title">Drop files here or click to browse</div>
        <div class="muted">They'll be filed under <strong>{{ category }}</strong></div>
        <input #picker type="file" multiple hidden (change)="onPick($event)" />
      </div>

      @if (duplicateWarning()) {
        <div class="warn-banner">{{ duplicateWarning() }}</div>
      }
      @if (actionError()) {
        <div class="err-banner">{{ actionError() }}</div>
      }

      <div class="list-head">
        <h2>Indexed documents</h2>
        <button class="btn-refresh" (click)="loadDocuments()" [disabled]="loading()">
          {{ loading() ? 'Refreshing…' : '↻ Refresh' }}
        </button>
      </div>

      @if (items().length) {
        <div class="list card">
          @for (it of items(); track trackItem(it)) {
            <div class="row">
              <span class="row-file">{{ it.filename }}</span>
              <span class="badge"
                    [class.ok]="it.state==='indexed'"
                    [class.warn]="it.state==='queued' || it.state==='processing'"
                    [class.err]="it.state==='error'">
                @switch (it.state) {
                  @case ('uploading')  { <span class="spin"></span> Uploading… }
                  @case ('queued')     { <span class="spin"></span> Queued }
                  @case ('processing') { <span class="spin"></span> Indexing… }
                  @case ('indexed')    { ✓ Indexed{{ it.chunks ? ' · ' + it.chunks + ' chunks' : '' }} }
                  @case ('error')      { ✕ Failed }
                }
              </span>
              @if (it.state === 'indexed' && it.id) {
                <button class="del-btn" (click)="remove(it)" [disabled]="it.deleting" title="Delete">
                  {{ it.deleting ? '…' : '🗑' }}
                </button>
              }
            </div>
          }
        </div>
      } @else if (!loading()) {
        <p class="muted">No documents indexed yet.</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; max-width: 820px; }
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 22px; margin: 2px 0 6px; }
    .dropzone {
      border: 2px dashed var(--line); border-radius: var(--radius);
      padding: 48px 24px; text-align: center; cursor: pointer;
      background: var(--surface); transition: all 0.15s; margin-bottom: 20px;
    }
    .dropzone:hover, .dropzone.over { border-color: var(--indigo); background: var(--indigo-lt); }
    .drop-ico { font-size: 36px; margin-bottom: 10px; }
    .drop-title { font-weight: 600; color: var(--ink); margin-bottom: 4px; }
    .warn-banner {
      background: var(--amber-lt); color: var(--amber); border-radius: var(--radius);
      padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px;
    }
    .err-banner {
      background: var(--red-lt); color: var(--red); border-radius: var(--radius);
      padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px;
    }
    .list-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
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
    .badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--paper); color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
    .badge.ok { background: var(--green-lt); color: var(--green); }
    .badge.warn { background: var(--amber-lt); color: var(--amber); }
    .badge.err { background: var(--red-lt); color: var(--red); }
    .spin { width: 10px; height: 10px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .del-btn {
      border: none; background: transparent; cursor: pointer; font-size: 14px;
      padding: 4px 8px; border-radius: 6px; line-height: 1;
    }
    .del-btn:hover:not(:disabled) { background: var(--red-lt); }
    .del-btn:disabled { opacity: 0.5; cursor: default; }
  `]
})
export class UploadComponent implements OnInit, OnDestroy {
  private rag = inject(RagService);

  category = 'general';
  dragOver = signal(false);
  loading = signal(false);
  items = signal<UploadItem[]>([]);
  duplicateWarning = signal<string | null>(null);
  actionError = signal<string | null>(null);
  private polls: Subscription[] = [];

  ngOnInit(): void {
    this.loadDocuments();
  }

  /** (Re)fetch the persisted document list from the backend, deduped by id. */
  loadDocuments(): void {
    this.loading.set(true);
    this.duplicateWarning.set(null);
    this.actionError.set(null);
    this.rag.listDocuments().subscribe({
      next: docs => {
        const deduped = Array.from(
          new Map(docs.map(d => [d.id, d])).values()
        );
        this.items.set(deduped
          .filter(d => d.state !== 'FAILED')
          .map(d => ({
            id: d.id,
            filename: d.filename,
            state: d.state.toLowerCase() as UiState,
            chunks: d.chunks
          })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  trackItem(it: UploadItem): string {
    return it.id ?? it.filename;
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragOver.set(true); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files) this.handle(Array.from(e.dataTransfer.files));
  }

  onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.handle(Array.from(input.files));
    input.value = '';
  }

  private handle(files: File[]): void {
    files.forEach(file => {
      const isDuplicate = this.items().some(it =>
        it.state !== 'error' && it.filename.toLowerCase() === file.name.toLowerCase());

      if (isDuplicate) {
        this.duplicateWarning.set(`"${file.name}" is already indexed. Delete it first if you want to replace it.`);
        return;
      }
      this.duplicateWarning.set(null);

      const item: UploadItem = { filename: file.name, state: 'uploading' };
      this.items.update(l => [item, ...l]);

      this.rag.ingest(file, this.category).subscribe({
        next: res => {
          this.patch(file.name, { id: res.statusId, state: 'queued' });
          this.startPolling(file.name, res.statusId);
        },
        error: err => {
          if (err.status === 409) {
            this.duplicateWarning.set(`"${file.name}" is already indexed.`);
            this.items.update(l => l.filter(it => !(it.filename === file.name && it.state === 'uploading')));
          } else {
            this.patch(file.name, { state: 'error' });
          }
        }
      });
    });
  }

  /** Poll the status endpoint every 2s until INDEXED or FAILED. */
  private startPolling(filename: string, statusId: string): void {
    const sub = timer(1500, 2000).pipe(
      switchMap(() => this.rag.getIngestStatus(statusId)),
      takeWhile(s => s.state === 'QUEUED' || s.state === 'PROCESSING', true)
    ).subscribe({
      next: s => {
        const map: Record<string, UiState> = {
          QUEUED: 'queued', PROCESSING: 'processing',
          INDEXED: 'indexed', FAILED: 'error'
        };
        this.patch(filename, { state: map[s.state], chunks: s.chunks });
      },
      error: () => this.patch(filename, { state: 'error' })
    });
    this.polls.push(sub);
  }

  remove(it: UploadItem): void {
    if (!it.id) return;
    const id = it.id;
    this.actionError.set(null);
    this.patchById(id, { deleting: true });
    this.rag.deleteDocument(id).subscribe({
      next: () => this.items.update(l => l.filter(x => x.id !== id)),
      error: () => {
        this.patchById(id, { deleting: false });
        this.actionError.set(`Failed to delete "${it.filename}". Please try again.`);
      }
    });
  }

  private patch(filename: string, p: Partial<UploadItem>): void {
    this.items.update(l => l.map(it =>
      it.filename === filename &&
      (it.state === 'uploading' || it.state === 'queued' || it.state === 'processing')
        ? { ...it, ...p } : it
    ));
  }

  private patchById(id: string, p: Partial<UploadItem>): void {
    this.items.update(l => l.map(it => it.id === id ? { ...it, ...p } : it));
  }

  ngOnDestroy(): void {
    this.polls.forEach(s => s.unsubscribe());
  }
}
