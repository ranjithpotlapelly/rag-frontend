import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BillingStateService {
  readonly error = signal('');
}