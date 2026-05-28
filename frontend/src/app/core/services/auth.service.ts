import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'gestionnaire' | 'chauffeur' | 'admin';
  /** From API: sandbox = Mailtrap (no real inbox delivery), live = real SMTP */
  mail_delivery?: 'sandbox' | 'live';
}

export interface LoginResponse {
  user: User;
  token: string;
  token_type: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}`;
  private token = signal<string | null>(this.getStoredToken());
  private user = signal<User | null>(null);

  currentUser = computed(() => this.user());
  isAuthenticated = computed(() => !!this.token());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    if (this.token()) {
      this.fetchUser().subscribe();
    }
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  private storeToken(token: string): void {
    localStorage.setItem('token', token);
    this.token.set(token);
  }

  private clearToken(): void {
    localStorage.removeItem('token');
    this.token.set(null);
    this.user.set(null);
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.api}/login`, { email, password }).pipe(
      tap((res) => {
        this.storeToken(res.token);
        this.user.set(res.user);
      }),
    );
  }

  register(data: RegisterRequest) {
    return this.http.post<LoginResponse>(`${this.api}/register`, data).pipe(
      tap((res) => {
        this.storeToken(res.token);
        this.user.set(res.user);
      }),
    );
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string; reset_url?: string }>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(data: { token: string; email: string; password: string; password_confirmation: string }) {
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, data);
  }

  logout(): void {
    const token = this.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    this.http.post(`${this.api}/logout`, {}, { headers }).subscribe({ complete: () => {} });
    this.clearToken();
    this.router.navigate(['/login']);
  }

  fetchUser() {
    return this.http.get<User>(`${this.api}/user`).pipe(
      tap((u) => this.user.set(u)),
    );
  }

  getToken(): string | null {
    return this.token();
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }
}
