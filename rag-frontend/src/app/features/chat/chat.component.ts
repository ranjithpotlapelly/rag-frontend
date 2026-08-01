import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RagService } from '../../core/services/rag.service';
import { ChatMessage } from '../../core/models/models';

/**
 * Chat — the core Q&A experience.
 * User asks a question; backend runs the RAG pipeline; answer shows
 * with the source documents it was drawn from.
 *
 * Chat history lives only in this component's signal (nothing is
 * persisted server-side), so deleting a question or clearing the
 * whole conversation is a purely client-side operation.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <div class="eyebrow">Ask</div>
          <h1>Question your documents</h1>
        </div>
        @if (messages().length) {
          <button class="btn-clear" (click)="clearChat()" title="Clear entire conversation">🗑 Clear chat</button>
        }
      </header>

      <div class="chat" #scroll>
        @if (messages().length === 0) {
          <div class="empty">
            <div class="empty-ico">💬</div>
            <h3>Ask anything about your documents</h3>
            <p class="muted">Try “What is our remote work expense policy?” or “Which contracts renew in Q3?”</p>
            <div class="suggestions">
              <button class="chip" (click)="ask('What is our remote work expense policy?')">Remote work policy</button>
              <button class="chip" (click)="ask('Summarise our data retention rules')">Data retention</button>
              <button class="chip" (click)="ask('How many leave days carry over?')">Leave carry-over</button>
            </div>
          </div>
        }

        @for (m of messages(); track $index) {
          <div class="msg" [class.user]="m.role === 'user'">
            <div class="bubble">
              @if (m.pending) {
                <span class="typing"><i></i><i></i><i></i></span>
              } @else {
                <div class="bubble-text">{{ m.text }}</div>
                @if (m.sources && m.sources.length) {
                  <div class="sources">
                    <div class="sources-label">Sources</div>
                    @for (s of m.sources; track $index) {
                      <div class="source">
                        <span class="source-file">{{ s.filename }}</span>
                        <span class="source-meta">p.{{ s.page }} · {{ s.category }}</span>
                      </div>
                    }
                  </div>
                }
              }
            </div>
            @if (m.role === 'user' && !m.pending) {
              <button class="msg-del" (click)="deleteQuestion($index)" title="Delete this question">✕</button>
            }
          </div>
        }
      </div>

      <div class="composer">
        <div class="input-wrap">
          <input class="input" [(ngModel)]="draft" placeholder="Ask a question…"
                 [disabled]="busy()" (keyup.enter)="send()" />
          @if (draft.trim()) {
            <button class="clear-btn" type="button" [disabled]="busy()"
                    (click)="draft = ''" title="Clear question">✕</button>
          }
        </div>
        <button class="btn btn-primary" [disabled]="busy() || !draft.trim()" (click)="send()">
          {{ busy() ? '…' : 'Ask' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; height: 100vh; padding: 28px 32px; }
    .page-head { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .page-head h1 { font-size: 22px; margin-top: 2px; }
    .btn-clear {
      border: 1px solid var(--line); background: var(--surface); color: var(--red);
      border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .btn-clear:hover { background: var(--red-lt); border-color: var(--red); }
    .chat { flex: 1; overflow-y: auto; padding: 8px 0; display: flex; flex-direction: column; gap: 16px; }
    .empty { text-align: center; margin: auto; max-width: 440px; }
    .empty-ico { font-size: 40px; margin-bottom: 12px; }
    .suggestions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 18px; }
    .chip {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 999px; padding: 7px 14px; font-size: 13px;
      color: var(--slate); cursor: pointer; transition: all 0.12s;
    }
    .chip:hover { border-color: var(--indigo); color: var(--indigo); }
    .msg { display: flex; align-items: flex-start; gap: 8px; }
    .msg.user { justify-content: flex-end; }
    .msg.user .msg-del { order: -1; }
    .bubble {
      max-width: 680px; padding: 14px 18px;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 14px; box-shadow: var(--shadow);
    }
    .msg.user .bubble { background: var(--indigo); color: #fff; border-color: var(--indigo); }
    .bubble-text { white-space: pre-wrap; line-height: 1.6; }
    .msg-del {
      flex-shrink: 0; margin-top: 10px; border: none; background: transparent; color: var(--muted);
      cursor: pointer; font-size: 12px; width: 20px; height: 20px; border-radius: 50%; line-height: 1;
      opacity: 0; transition: opacity 0.12s;
    }
    .msg:hover .msg-del { opacity: 1; }
    .msg-del:hover { background: var(--red-lt); color: var(--red); }
    .sources { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
    .sources-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
    .source { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px; }
    .source-file { color: var(--ink); font-weight: 550; }
    .source-meta { color: var(--muted); font-family: var(--font-mono); font-size: 12px; }
    .composer { display: flex; gap: 10px; padding-top: 16px; border-top: 1px solid var(--line); }
    .input-wrap { flex: 1; position: relative; display: flex; }
    .input-wrap .input { flex: 1; padding-right: 34px; }
    .clear-btn {
      position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; color: var(--muted); cursor: pointer;
      font-size: 13px; width: 22px; height: 22px; border-radius: 50%; line-height: 1;
    }
    .clear-btn:hover:not(:disabled) { background: var(--paper); color: var(--ink); }
    .clear-btn:disabled { opacity: 0.5; cursor: default; }
    .typing { display: inline-flex; gap: 4px; align-items: center; height: 20px; }
    .typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: blink 1.2s infinite; }
    .typing i:nth-child(2) { animation-delay: 0.2s; }
    .typing i:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
  `]
})
export class ChatComponent implements AfterViewChecked {
  private rag = inject(RagService);
  @ViewChild('scroll') scroll!: ElementRef<HTMLDivElement>;

  messages = signal<ChatMessage[]>([]);
  draft = '';
  busy = signal(false);

  ask(q: string): void { this.draft = q; this.send(); }

  send(): void {
    const q = this.draft.trim();
    if (!q || this.busy()) return;

    this.messages.update(m => [...m, { role: 'user', text: q }]);
    this.messages.update(m => [...m, { role: 'assistant', text: '', pending: true }]);
    this.draft = '';
    this.busy.set(true);

    this.rag.query(q).subscribe({
      next: res => {
        this.messages.update(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', text: res.answer, sources: res.sources };
          return copy;
        });
        this.busy.set(false);
      },
      error: () => {
        this.messages.update(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            text: 'Something went wrong reaching the knowledge base. Please try again.'
          };
          return copy;
        });
        this.busy.set(false);
      }
    });
  }

  /** Removes a user question and its paired assistant answer (if any) from the conversation. */
  deleteQuestion(index: number): void {
    this.messages.update(m => {
      const copy = [...m];
      const deleteCount = copy[index + 1]?.role === 'assistant' ? 2 : 1;
      copy.splice(index, deleteCount);
      return copy;
    });
  }

  /** Clears the entire conversation. Nothing is persisted server-side, so this is instant. */
  clearChat(): void {
    this.messages.set([]);
  }

  ngAfterViewChecked(): void {
    if (this.scroll) {
      this.scroll.nativeElement.scrollTop = this.scroll.nativeElement.scrollHeight;
    }
  }
}
