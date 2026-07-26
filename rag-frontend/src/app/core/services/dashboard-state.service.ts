import { Injectable, signal } from '@angular/core';
import { UsageStats } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  readonly stats = signal<UsageStats | null>(null);
  readonly loading = signal(false);
}