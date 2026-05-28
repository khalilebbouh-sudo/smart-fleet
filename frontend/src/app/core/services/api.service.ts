import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private headers(): { [key: string]: string } {
    const token = this.auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<T>(`${this.base}${path}`, {
      headers: this.headers(),
      params: httpParams,
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  postForm<T>(path: string, form: FormData): Observable<T> {
    // Let browser set Content-Type boundary for multipart/form-data
    return this.http.post<T>(`${this.base}${path}`, form, { headers: this.headers() });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  putForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, form, { headers: this.headers() });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { headers: this.headers() });
  }
}
