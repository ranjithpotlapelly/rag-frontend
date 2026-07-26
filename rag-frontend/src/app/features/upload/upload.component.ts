import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, switchMap, takeWhile } from 'rxjs';
import { RagService } from '../../core/services/rag.service';

type UiState = 'uploading' | 'queued' | 'processing' | 'indexed' | 'error';

interface UploadItem {
  statusId?: string;
  filename: string;
  state: UiState;
  chunks?: number;
}

/**
 * Upload — drag-and-drop ingestion with LIVE status.
 *
 * After upload the backend returns a statusId. We poll
 * GET /api/ingest/status/{id} every 2s and flip the badge:
 *   Uploading → Queued → Processing → Indexed (searchable)
 * Polling stops automatically once INDEXED or FAILED.
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

      @if (items().length) {
        <div class="list card">
          @for (it of items(); track it.filename + ($index)) {
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
            </div>
          }
        </div>
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
    .list { padding: 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); }
    .row:last-child { border-bottom: none; }
    .row-file { font-weight: 550; color: var(--ink); }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--paper); color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
    .badge.ok { background: var(--green-lt); color: var(--green); }
    .badge.warn { background: var(--amber-lt); color: var(--amber); }
    .badge.err { background: var(--red-lt); color: var(--red); }
    .spin { width: 10px; height: 10px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UploadComponent implements OnDestroy {
  private rag = inject(RagService);

  category = 'general';
  dragOver = signal(false);
  items = signal<UploadItem[]>([]);
  private polls: Subscription[] = [];

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragOver.set(true); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files) this.handle(Array.from(e.dataTransfer.files));
  }

  onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.handle(Array.from(input.files));
  }

  private handle(files: File[]): void {
    files.forEach(file => {
      const item: UploadItem = { filename: file.name, state: 'uploading' };
      this.items.update(l => [item, ...l]);

      this.rag.ingest(file, this.category).subscribe({
        next: res => {
          this.patch(file.name, { statusId: res.statusId, state: 'queued' });
          this.startPolling(file.name, res.statusId);
        },
        error: () => this.patch(file.name, { state: 'error' })
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

  private patch(filename: string, p: Partial<UploadItem>): void {
    this.items.update(l => l.map(it =>
      it.filename === filename &&
      (it.state === 'uploading' || it.state === 'queued' || it.state === 'processing')
        ? { ...it, ...p } : it
    ));
  }

  ngOnDestroy(): void {
    this.polls.forEach(s => s.unsubscribe());
  }
}
