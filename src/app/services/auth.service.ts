import { Injectable, signal, computed } from '@angular/core';

export interface Credentials {
  username: string;
  password: string;
}

const STORAGE_KEY = 'rosenapp_credentials';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private credentials$ = signal<Credentials | null>(this.loadCredentials());

  readonly isLoggedIn = computed(() => this.credentials$() !== null);
  readonly username = computed(() => this.credentials$()?.username ?? null);

  credentials(): Credentials | null {
    return this.credentials$();
  }

  getAuthHeader(): string | null {
    const creds = this.credentials$();
    if (!creds) return null;
    return 'Basic ' + btoa(`${creds.username}:${creds.password}`);
  }

  saveCredentials(username: string, password: string): void {
    const creds: Credentials = { username, password };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    this.credentials$.set(creds);
  }

  clearCredentials(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.credentials$.set(null);
  }

  private loadCredentials(): Credentials | null {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.username && parsed.password) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}
