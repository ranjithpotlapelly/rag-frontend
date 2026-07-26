import { Component, inject, signal } from '@angular/core';
import { RagService } from '../../core/services/rag.service';
import { AuthService } from '../../core/services/auth.service';

interface Plan {
  id: string;
  name: string;
  price: string;
  queries: string;
  docs: string;
  features: string[];
  highlight?: boolean;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  template: `
    <div class="page">
      <header class="page-head">
        <div class="eyebrow">Plan & Billing</div>
        <h1>Choose the plan that fits</h1>
        <p class="muted">Upgrade or downgrade anytime. Prices in EUR, billed monthly.</p>
      </header>

      <div class="plans">
        @for (p of plans; track p.id) {
          <div class="plan card" [class.highlight]="p.highlight">
            @if (p.highlight) { <div class="ribbon">Most popular</div> }
            <h3>{{ p.name }}</h3>
            <div class="price">{{ p.price }}<span class="per">/mo</span></div>
            <ul class="features">
              <li><strong>{{ p.queries }}</strong> questions / month</li>
              <li><strong>{{ p.docs }}</strong> documents</li>
              @for (f of p.features; track $index) { <li>{{ f }}</li> }
            </ul>
            <button class="btn btn-block"
                    [class.btn-primary]="p.highlight" [class.btn-ghost]="!p.highlight"
                    [disabled]="busy()" (click)="choose(p)">
              {{ busy() && pending === p.id ? 'Redirecting…' : 'Choose ' + p.name }}
            </button>
          </div>
        }
      </div>

      @if (error()) { <div class="error-text" style="margin-top:16px">{{ error() }}</div> }

      <p class="muted enterprise-note">
        Need on-premise deployment, SSO, or a custom SLA? The Enterprise plan runs
        entirely on your own infrastructure — documents never leave your servers.
      </p>
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; max-width: 1000px; }
    .page-head { margin-bottom: 28px; }
    .page-head h1 { font-size: 22px; margin: 2px 0 6px; }
    .plans { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .plan { padding: 26px 22px; position: relative; display: flex; flex-direction: column; }
    .plan.highlight { border-color: var(--indigo); box-shadow: var(--shadow-lg); }
    .ribbon {
      position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
      background: var(--indigo); color: #fff; font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 999px; white-space: nowrap;
    }
    .plan h3 { font-size: 18px; }
    .price { font-family: var(--font-display); font-size: 32px; font-weight: 700; color: var(--ink); margin: 10px 0 16px; }
    .per { font-size: 14px; font-weight: 500; color: var(--muted); }
    .features { list-style: none; flex: 1; display: flex; flex-direction: column; gap: 9px; margin-bottom: 20px; }
    .features li { font-size: 13px; color: var(--slate); padding-left: 20px; position: relative; }
    .features li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }
    .enterprise-note { margin-top: 24px; font-size: 13px; max-width: 600px; }
    @media (max-width: 880px) { .plans { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 480px) { .plans { grid-template-columns: 1fr; } }
  `]
})
export class BillingComponent {
  private rag = inject(RagService);
  private auth = inject(AuthService);

  tenantId = this.auth.getTenantId();
  busy = signal(false);
  error = signal('');
  pending = '';

  plans: Plan[] = [
    { id: 'FREE',     name: 'Free',     price: '€0',   queries: '50',     docs: '10',
      features: ['14-day trial', 'Community support'] },
    { id: 'STARTER',  name: 'Starter',  price: '€49',  queries: '1,000',  docs: '100',
      features: ['Email support', 'All document types'] },
    { id: 'BUSINESS', name: 'Business', price: '€199', queries: '10,000', docs: '1,000',
      features: ['Priority support', 'Usage analytics', 'Role-based access'], highlight: true },
    { id: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', queries: 'Unlimited', docs: 'Unlimited',
      features: ['On-premise / private', 'SSO & SAML', 'Dedicated SLA'] }
  ];

  choose(p: Plan): void {
    if (p.id === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@yourproduct.com?subject=Enterprise plan enquiry';
      return;
    }
    if (p.id === 'FREE') { this.error.set('You are already on the free trial.'); return; }

    this.busy.set(true);
    this.pending = p.id;
    this.error.set('');
    this.rag.checkout(this.tenantId, p.id).subscribe({
      next: res => { window.location.href = res.checkoutUrl; },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not start checkout. Please try again.');
      }
    });
  }
}
