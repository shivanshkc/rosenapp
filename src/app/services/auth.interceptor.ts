import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const ws = inject(WebSocketService);
  const router = inject(Router);

  return next(req).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          ws.disconnect();
          auth.clearCredentials();
          router.navigate(['/login']);
        }
      },
    })
  );
};
