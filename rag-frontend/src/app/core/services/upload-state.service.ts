import { Injectable, signal } from '@angular/core';

export interface UploadItem {
  filename: string;
  status: 'uploading' | 'queued' | 'error';
  chunks?: number;
}

@Injectable({ providedIn: 'root' })
export class UploadStateService {
  readonly items = signal<UploadItem[]>([]);
  readonly category = signal<string>('general');
}