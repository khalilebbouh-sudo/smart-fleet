import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type EmailLog = {
  id: number;
  type: string;
  to_email: string;
  to_name?: string | null;
  subject: string;
  status: 'sent' | 'failed' | 'skipped' | string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  payload?: any;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

@Injectable({ providedIn: 'root' })
export class EmailLogService {
  constructor(private api: ApiService) {}

  list(params?: { per_page?: number; page?: number; type?: string; status?: string; to_email?: string }) {
    return this.api.get<Paginated<EmailLog>>('/email-logs', params as any);
  }
}

