import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-panel">
        <div class="auth-aside">
          <div class="eyebrow" style="color:#c7d2fe">Enterprise RAG</div>
          <h1 class="aside-title">Ask your documents anything.</h1>
          <p class="aside-copy">
            Upload policies, contracts, and technical docs. Get cited answers
            in plain language — across languages, fully on your own infrastructure.
          </p>
          <ul class="aside-points">
            <li>Answers grounded in your documents, with sources</li>
            <li>Ask in English, search French or Dutch files</li>
            <li>Runs locally — your data never leaves your servers</li>
          </ul>
        </div>

        <div class="auth-form card">
          <h2>Sign in</h2>
          <p class="muted" style="margin-bottom:24px">Welcome back. Enter your details.</p>

          <div class="field">
            <label for="u">Username</label>
            <input id="u" class="input" [(ngModel)]="username" placeholder="admin" />
          </div>
          <div class="field">
            <label for="p">Password</label>
            <input id="p" type="password" class="input" [(ngModel)]="password"
                   placeholder="••••••••" (keyup.enter)="submit()" />
          </div>

          @if (error()) { <div class="error-text">{{ error() }}</div> }

          <button class="btn btn-primary btn-block" style="margin-top:8px"
                  [disabled]="loading()" (click)="submit()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>

          <p class="muted" style="text-align:center; margin-top:20px; font-size:13px">
            New company? <a routerLink="/signup">Create a workspace</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .auth-panel {
      display: grid; grid-template-columns: 1fr 1fr;
      max-width: 920px; width: 100%;
      border-radius: 20px; overflow: hidden;
      box-shadow: var(--shadow-lg);
    }
    .auth-aside {
      background: linear-gradient(160deg, var(--indigo) 0%, var(--indigo-dk) 100%);
      color: #fff; padding: 48px 40px;
      display: flex; flex-direction: column; justify-content: center;
    }
    .aside-title { color: #fff; font-size: 30px; margin: 16px 0 14px; line-height: 1.15; }
    .aside-copy { color: #d4d8ff; font-size: 15px; margin-bottom: 28px; }
    .aside-points { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .aside-points li {
      color: #e8eaff; font-size: 14px; padding-left: 26px; position: relative;
    }
    .aside-points li::before {
      content: '✓'; position: absolute; left: 0;
      color: #a5b4fc; font-weight: 700;
    }
    .auth-form { padding: 48px 40px; border-radius: 0; border: none; box-shadow: none; }
    .auth-form h2 { font-size: 24px; }
    @media (max-width: 760px) {
      .auth-panel { grid-template-columns: 1fr; }
      .auth-aside { display: none; }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = 'admin';
  password = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set('Enter both username and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/chat']),
      error: () => {
        this.loading.set(false);
        this.error.set('Sign in failed. Check your details and try again.');
      }
    });
  }
}
