import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Shell — the authenticated app frame: sidebar nav + content outlet.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">R</div>
          <div>
            <div class="brand-name">RAG Platform</div>
            <div class="brand-sub">{{ tenantId }}</div>
          </div>
        </div>

        <nav class="nav">
          <a routerLink="/chat" routerLinkActive="active" class="nav-item">
            <span class="nav-ico">💬</span> Ask
          </a>
          <a routerLink="/upload" routerLinkActive="active" class="nav-item">
            <span class="nav-ico">📄</span> Documents
          </a>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-ico">📊</span> Dashboard
          </a>
        </nav>

        <div class="sidebar-foot">
          <div class="user">
            <div class="user-name">{{ username }}</div>
            <div class="user-role">{{ role }}</div>
          </div>
          <div class="sidebar-actions">
            <button class="btn btn-ghost" (click)="logout()">Sign out</button>
            <button class="btn btn-icon" title="Toggle dark mode">🌓</button>
          </div>
        </div>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 256px;
      background: var(--surface);
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .brand { display: flex; align-items: center; gap: 12px; padding: 0 8px 28px; }
    .brand-mark {
      width: 38px; height: 38px;
      background: var(--indigo);
      color: #fff;
      border-radius: 10px;
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-weight: 700; font-size: 20px;
    }
    .brand-name { font-family: var(--font-display); font-weight: 650; color: var(--ink); font-size: 15px; }
    .brand-sub { font-size: 12px; color: var(--muted); }
    .nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radius-sm);
      color: var(--slate);
      font-weight: 550;
      font-size: 14px;
      text-decoration: none;
      transition: background 0.12s, color 0.12s;
    }
    .nav-item:hover { background: var(--paper); text-decoration: none; }
    .nav-item.active { background: var(--indigo-lt); color: var(--indigo-dk); font-weight: 650; }
    .nav-ico { font-size: 16px; }
    .sidebar-foot { border-top: 1px solid var(--line); padding-top: 16px; }
    .user { padding: 0 8px 12px; }
    .user-name { font-weight: 600; color: var(--ink); font-size: 14px; }
    .user-role { font-size: 12px; color: var(--muted); }
    .content { flex: 1; min-width: 0; }
    .sidebar-actions { display: flex; align-items: center; gap: 8px; padding: 0 8px; }
    .btn { cursor: pointer; border: none; background: transparent; font-size: 14px; }
    .btn-icon { font-size: 18px; padding: 4px; border-radius: 4px; }
    .btn-icon:hover { background: var(--paper); }

    @media (max-width: 760px) {
      .shell { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: relative; flex-direction: row; flex-wrap: wrap; }
      .nav { flex-direction: row; flex-wrap: wrap; }
      .sidebar-actions { margin-left: auto; }
    }
  `]
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  tenantId = this.auth.getTenantId();
  username = this.auth.getUsername();
  role = this.auth.getRole();

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
