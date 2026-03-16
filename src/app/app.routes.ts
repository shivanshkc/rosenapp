import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.Register), canActivate: [guestGuard] },
  { path: 'home', loadComponent: () => import('./pages/home/home').then(m => m.Home), canActivate: [authGuard] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
