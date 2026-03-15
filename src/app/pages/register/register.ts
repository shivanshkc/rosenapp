import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  repeatPassword = '';
  passwordVisible = false;
  repeatPasswordVisible = false;
  loading = signal(false);
  error = signal('');

  private readonly usernamePattern = /^[a-zA-Z0-9_-]+$/;

  get isValid(): boolean {
    return (
      this.username.length >= 3 &&
      this.username.length <= 100 &&
      this.usernamePattern.test(this.username) &&
      this.password.length >= 3 &&
      this.password.length <= 100 &&
      this.password === this.repeatPassword
    );
  }

  register(): void {
    if (!this.isValid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    this.api.createUser({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.auth.saveCredentials(this.username, this.password);
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.error.set('Username already exists');
        } else if (err.status === 400) {
          this.error.set(err.error?.reason ?? 'Invalid input');
        } else {
          this.error.set('Something went wrong. Please try again.');
        }
      },
    });
  }
}
