import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface CreateUserRequest {
  username: string;
  password: string;
}

export interface CreateUserResponse {
  username: string;
}

export interface SendMessageRequest {
  message: string;
  receivers: string[];
}

export interface HealthResponse {
  code: string;
}

export interface ApiError {
  status: string;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = environment.apiBaseUrl;

  healthCheck(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/api`);
  }

  createUser(request: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${this.baseUrl}/api/user`, request);
  }

  sendMessage(request: SendMessageRequest): Observable<object> {
    return this.http.post(`${this.baseUrl}/api/message`, request, {
      headers: this.authHeaders(),
    });
  }

  getWebSocketUrl(): string {
    const creds = this.auth.credentials();
    if (!creds) throw new Error('Not authenticated');

    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/api/connect?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;
  }

  private authHeaders(): HttpHeaders {
    const authHeader = this.auth.getAuthHeader();
    if (!authHeader) throw new Error('Not authenticated');
    return new HttpHeaders({ Authorization: authHeader });
  }
}
