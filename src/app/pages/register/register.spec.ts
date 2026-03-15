import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Register } from './register';
import { AuthService } from '../../services/auth.service';

describe('Register', () => {
  let component: Register;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
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
      component.password = 'pass123';
      component.repeatPassword = 'pass123';
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when username has invalid characters', () => {
      component.username = 'user@name';
      component.password = 'pass123';
      component.repeatPassword = 'pass123';
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when password is too short', () => {
      component.username = 'alice';
      component.password = 'ab';
      component.repeatPassword = 'ab';
      expect(component.isValid).toBe(false);
    });

    it('should be invalid when passwords do not match', () => {
      component.username = 'alice';
      component.password = 'pass123';
      component.repeatPassword = 'pass456';
      expect(component.isValid).toBe(false);
    });

    it('should be valid with correct input', () => {
      component.username = 'alice';
      component.password = 'pass123';
      component.repeatPassword = 'pass123';
      expect(component.isValid).toBe(true);
    });

    it('should accept underscores and hyphens in username', () => {
      component.username = 'alice_bob-123';
      component.password = 'pass123';
      component.repeatPassword = 'pass123';
      expect(component.isValid).toBe(true);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      component.username = 'alice';
      component.password = 'pass123';
      component.repeatPassword = 'pass123';
    });

    it('should call API and navigate on success', () => {
      const navSpy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

      component.register();
      expect(component.loading()).toBe(true);

      const req = httpMock.expectOne('http://localhost:8080/api/user');
      expect(req.request.body).toEqual({ username: 'alice', password: 'pass123' });
      req.flush({ username: 'alice' });

      expect(authService.isLoggedIn()).toBe(true);
      expect(authService.username()).toBe('alice');
      expect(navSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should show error on 409 conflict', () => {
      component.register();

      const req = httpMock.expectOne('http://localhost:8080/api/user');
      req.flush({ status: 'Conflict', reason: 'User already exists' }, { status: 409, statusText: 'Conflict' });

      expect(component.error()).toBe('Username already exists');
      expect(component.loading()).toBe(false);
    });

    it('should show error on 400 bad request', () => {
      component.register();

      const req = httpMock.expectOne('http://localhost:8080/api/user');
      req.flush({ status: 'Bad Request', reason: 'Invalid username' }, { status: 400, statusText: 'Bad Request' });

      expect(component.error()).toBe('Invalid username');
      expect(component.loading()).toBe(false);
    });

    it('should show generic error on 500', () => {
      component.register();

      const req = httpMock.expectOne('http://localhost:8080/api/user');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      expect(component.error()).toBe('Something went wrong. Please try again.');
      expect(component.loading()).toBe(false);
    });

    it('should not submit when invalid', () => {
      component.username = '';
      component.register();
      httpMock.expectNone('http://localhost:8080/api/user');
    });

    it('should not submit when already loading', () => {
      component.loading.set(true);
      component.register();
      httpMock.expectNone('http://localhost:8080/api/user');
    });
  });
});
