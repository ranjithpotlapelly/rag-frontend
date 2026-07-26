import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, SignupRequest } from '../models/models';

/**
 * AuthService — handles login, token storage, and session state.
 *
 * Uses Angular signals for reactive auth state. The token is the JWT
 * issued by the backend /api/auth/token endpoint; it carries the user's
 * roles and tenantId, which the backend reads on every request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly TOKEN_KEY = 'rag_token';

  // Reactive auth state
  private tokenSignal = signal<string | null>(this.loadToken());
  readonly isLoggedIn = computed(() => this.tokenSignal() !== null);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/token`, { username, password })
      .pipe(tap(res => this.storeToken(res.token)));
  }

  signup(req: SignupRequest): Observable<any> {
    return this.http.post(`${this.api}/onboarding/signup`, req);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  /** Decode the role from the JWT payload (no verification — display only). */
  getRole(): string {
    const token = this.getToken();
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles = payload.roles || [];
      return roles.includes('ROLE_ADMIN') ? 'ADMIN' : 'USER';
    } catch {
      return '';
    }
  }

  /** Decode the tenantId claim (display only). */
  getTenantId(): string {
    const token = this.getToken();
    if (!token) return 'default';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.tenantId || 'default';
    } catch {
      return 'default';
    }
  }

  /** Decode the username (subject) for display. */
  getUsername(): string {
    const token = this.getToken();
    if (!token) return '';
    try {
      return JSON.parse(atob(token.split('.')[1])).sub || '';
    } catch {
      return '';
    }
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  private loadToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
