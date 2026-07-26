import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignupStateService {
  readonly companyName = signal('');
  readonly contactEmail = signal('');
  readonly adminUsername = signal('');
  readonly error = signal('');
  readonly done = signal(false);
  readonly message = signal('');
}