import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppConfigService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config from /config.json', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ apiBaseUrl: 'https://example.com' }),
    });

    await service.load();

    expect(globalThis.fetch).toHaveBeenCalledWith('/config.json');
    expect(service.apiBaseUrl).toBe('https://example.com');
  });

  it('should handle empty apiBaseUrl', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ apiBaseUrl: '' }),
    });

    await service.load();

    expect(service.apiBaseUrl).toBe('');
  });
});
