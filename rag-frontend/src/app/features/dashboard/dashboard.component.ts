import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription, timer, switchMap } from 'rxjs';
import { RagService } from '../../core/services/rag.service';
import { AuthService } from '../../core/services/auth.service';
import { UsageStats } from '../../core/models/models';

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
              <p class="muted" style="margin-top:2px">Upgrade to keep asking without interruption.</p>
            </div>
            <a href="/billing" class="btn btn-amber">View plans</a>
          </div>
        }
      } @else {
        <p class="error-text">Could not load usage stats.</p>
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
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }
}
