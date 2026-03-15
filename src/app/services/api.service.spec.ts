import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('healthCheck', () => {
    it('should call GET /api', () => {
      service.healthCheck().subscribe(res => {
        expect(res.code).toBe('OK');
      });

      const req = httpMock.expectOne('http://localhost:8080/api');
      expect(req.request.method).toBe('GET');
      req.flush({ code: 'OK' });
    });
  });

  describe('createUser', () => {
    it('should call POST /api/user with username and password', () => {
      service.createUser({ username: 'alice', password: 'pass123' }).subscribe(res => {
        expect(res.username).toBe('alice');
      });

      const req = httpMock.expectOne('http://localhost:8080/api/user');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'alice', password: 'pass123' });
      req.flush({ username: 'alice' });
    });
  });

  describe('sendMessage', () => {
    it('should call POST /api/message with auth header', () => {
      authService.saveCredentials('alice', 'pass123');

      service.sendMessage({ message: 'hello', receivers: ['bob'] }).subscribe();

      const req = httpMock.expectOne('http://localhost:8080/api/message');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ message: 'hello', receivers: ['bob'] });
      expect(req.request.headers.get('Authorization')).toBe('Basic ' + btoa('alice:pass123'));
      req.flush({});
    });

    it('should throw when not authenticated', () => {
      expect(() => {
        service.sendMessage({ message: 'hello', receivers: ['bob'] }).subscribe();
      }).toThrow();
    });
  });

  describe('getWebSocketUrl', () => {
    it('should return correctly formatted WebSocket URL', () => {
      authService.saveCredentials('alice', 'pass123');
      const url = service.getWebSocketUrl();
      expect(url).toBe('ws://localhost:8080/api/connect?username=alice&password=pass123');
    });

    it('should encode special characters in credentials', () => {
      authService.saveCredentials('user@name', 'p@ss w0rd');
      const url = service.getWebSocketUrl();
      expect(url).toContain('username=user%40name');
      expect(url).toContain('password=p%40ss%20w0rd');
    });

    it('should throw when not authenticated', () => {
      expect(() => service.getWebSocketUrl()).toThrow();
    });
  });
});
