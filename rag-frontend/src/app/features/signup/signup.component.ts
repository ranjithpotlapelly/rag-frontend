import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card signup-card">
        <div class="eyebrow">Get started</div>
        <h2 style="margin:8px 0 6px">Create your workspace</h2>
        <p class="muted" style="margin-bottom:26px">
          Set up an isolated workspace for your company. 14-day free trial, no card needed.
        </p>

        @if (done()) {
          <div class="success">
            <div class="success-ico">✓</div>
            <h3>Workspace ready</h3>
            <p class="muted">{{ message() }}</p>
            <a routerLink="/login" class="btn btn-primary" style="margin-top:16px">Go to sign in</a>
          </div>
        } @else {
          <div class="field">
            <label for="c">Company name</label>
            <input id="c" class="input" [(ngModel)]="companyName" placeholder="Acme Corp" />
          </div>
          <div class="field">
            <label for="e">Work email</label>
            <input id="e" type="email" class="input" [(ngModel)]="contactEmail"
                   placeholder="you@acme.com" />
          </div>
          <div class="field">
            <label for="a">Admin username</label>
            <input id="a" class="input" [(ngModel)]="adminUsername" placeholder="admin" />
          </div>

          @if (error()) { <div class="error-text">{{ error() }}</div> }

          <button class="btn btn-primary btn-block" style="margin-top:8px"
                  [disabled]="loading()" (click)="submit()">
            {{ loading() ? 'Creating…' : 'Create workspace' }}
          </button>

          <p class="muted" style="text-align:center; margin-top:20px; font-size:13px">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .signup-card { max-width: 440px; width: 100%; padding: 40px; }
    .success { text-align: center; padding: 12px 0; }
    .success-ico {
      width: 54px; height: 54px; margin: 0 auto 16px;
      background: var(--green-lt); color: var(--green);
      border-radius: 50%; display: grid; place-items: center;
      font-size: 26px; font-weight: 700;
    }
  `]
})
export class SignupComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  companyName = '';
  contactEmail = '';
  adminUsername = '';
  loading = signal(false);
  error = signal('');
  done = signal(false);
  message = signal('');

  submit(): void {
    if (!this.companyName || !this.contactEmail || !this.adminUsername) {
      this.error.set('Please fill in all fields.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.signup({
      companyName: this.companyName,
      contactEmail: this.contactEmail,
      adminUsername: this.adminUsername
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.done.set(true);
        this.message.set(res?.message || 'Your workspace is ready. You can start uploading documents.');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not create workspace. Please try again.');
      }
    });
  }
}
