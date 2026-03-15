import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start logged out when sessionStorage is empty', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.credentials()).toBeNull();
    expect(service.username()).toBeNull();
  });

  it('should save credentials to sessionStorage', () => {
    service.saveCredentials('alice', 'pass123');

    expect(service.isLoggedIn()).toBe(true);
    expect(service.credentials()).toEqual({ username: 'alice', password: 'pass123' });
    expect(service.username()).toBe('alice');

    const stored = sessionStorage.getItem('rosenapp_credentials');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual({ username: 'alice', password: 'pass123' });
  });

  it('should clear credentials on logout', () => {
    service.saveCredentials('alice', 'pass123');
    service.clearCredentials();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.credentials()).toBeNull();
    expect(sessionStorage.getItem('rosenapp_credentials')).toBeNull();
  });

  it('should generate correct Basic Auth header', () => {
    service.saveCredentials('alice', 'pass123');
    const header = service.getAuthHeader();
    expect(header).toBe('Basic ' + btoa('alice:pass123'));
  });

  it('should return null auth header when not logged in', () => {
    expect(service.getAuthHeader()).toBeNull();
  });

  it('should load credentials from sessionStorage on init', () => {
    sessionStorage.setItem(
      'rosenapp_credentials',
      JSON.stringify({ username: 'bob', password: 'secret' })
    );

    const freshService = new AuthService();
    expect(freshService.isLoggedIn()).toBe(true);
    expect(freshService.username()).toBe('bob');
  });

  it('should handle corrupted sessionStorage data', () => {
    sessionStorage.setItem('rosenapp_credentials', 'not-json');

    const freshService = new AuthService();
    expect(freshService.isLoggedIn()).toBe(false);
    expect(freshService.credentials()).toBeNull();
  });

  it('should handle incomplete sessionStorage data', () => {
    sessionStorage.setItem('rosenapp_credentials', JSON.stringify({ username: 'alice' }));

    const freshService = new AuthService();
    expect(freshService.isLoggedIn()).toBe(false);
  });
});
