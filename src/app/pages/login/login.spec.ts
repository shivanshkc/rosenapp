import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';

describe('Login', () => {
  let component: Login;
  let authService: AuthService;
  let wsService: WebSocketService;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    wsService = TestBed.inject(WebSocketService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validation', () => {
    it('should be invalid when fields are empty', () => {
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when username is too short', () => {
      component.username = 'ab';
      component.password = 'dummy-password';
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when username has invalid characters', () => {
      component.username = 'user@name';
      component.password = 'dummy-password';
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when password is too short', () => {
      component.username = 'alice';
      component.password = 'ab';
      expect(component.isValid).toBe(false);
    });

    it('should be valid with correct input', () => {
      component.username = 'alice';
      component.password = 'dummy-password';
      expect(component.isValid).toBe(true);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      component.username = 'alice';
      component.password = 'dummy-password';
    });

    it('should save credentials and navigate on successful WebSocket connect', () => {
      vi.spyOn(wsService, 'connect').mockReturnValue(of(undefined));
      const navSpy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

      component.login();

      expect(authService.isLoggedIn()).toBe(true);
      expect(authService.username()).toBe('alice');
      expect(navSpy).toHaveBeenCalledWith(['/home']);
    });

    it('should clear credentials and show error on WebSocket failure', () => {
      vi.spyOn(wsService, 'connect').mockReturnValue(throwError(() => new Event('error')));

      component.login();

      expect(authService.isLoggedIn()).toBe(false);
      expect(component.error()).toBe('Invalid username or password');
      expect(component.loading()).toBe(false);
    });

    it('should not submit when invalid', () => {
      component.username = '';
      const connectSpy = vi.spyOn(wsService, 'connect');

      component.login();

      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('should not submit when already loading', () => {
      component.loading.set(true);
      const connectSpy = vi.spyOn(wsService, 'connect');

      component.login();

      expect(connectSpy).not.toHaveBeenCalled();
    });
  });
});
