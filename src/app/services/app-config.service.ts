import { Injectable } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config!: AppConfig;

  async load(): Promise<void> {
    const response = await fetch('/config.json');
    this.config = await response.json();
  }

  get apiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }
}
