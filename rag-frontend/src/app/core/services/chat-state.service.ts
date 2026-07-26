import { Injectable, signal } from '@angular/core';
import { ChatMessage } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly draft = signal<string>('');
}