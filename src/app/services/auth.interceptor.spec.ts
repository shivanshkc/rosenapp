import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let wsService: WebSocketService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    wsService = TestBed.inject(WebSocketService);
    router = TestBed.inject(Router);

    authService.saveCredentials('alice', 'dummy-password');
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should clear credentials and navigate on 401', () => {
    const disconnectSpy = vi.spyOn(wsService, 'disconnect');
    const navSpy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

    http.get('/api/test').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isLoggedIn()).toBe(false);
    expect(disconnectSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should not interfere with non-401 errors', () => {
    const disconnectSpy = vi.spyOn(wsService, 'disconnect');

    http.get('/api/test').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(authService.isLoggedIn()).toBe(true);
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  it('should not interfere with successful responses', () => {
    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    req.flush({ ok: true });

    expect(authService.isLoggedIn()).toBe(true);
  });
});
