import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

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

const BASE_URL = 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  healthCheck(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${BASE_URL}/api`);
  }

  createUser(request: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${BASE_URL}/api/user`, request);
  }

  sendMessage(request: SendMessageRequest): Observable<object> {
    return this.http.post(`${BASE_URL}/api/message`, request, {
      headers: this.authHeaders(),
    });
  }

  getWebSocketUrl(): string {
    const creds = this.auth.credentials();
    if (!creds) throw new Error('Not authenticated');
    return `ws://localhost:8080/api/connect?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;
  }

  private authHeaders(): HttpHeaders {
    const authHeader = this.auth.getAuthHeader();
    if (!authHeader) throw new Error('Not authenticated');
    return new HttpHeaders({ Authorization: authHeader });
  }
}
