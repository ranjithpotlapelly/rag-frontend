import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoginStateService {
  readonly username = signal('admin');
  readonly error = signal('');
}