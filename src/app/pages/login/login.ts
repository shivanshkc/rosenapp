import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { isValidUsername, isValidPassword } from '../../shared/validation';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  username = '';
  password = '';
  passwordVisible = false;
  loading = signal(false);
  error = signal('');

  get isValid(): boolean {
    return isValidUsername(this.username) && isValidPassword(this.password);
  }

  login(): void {
    if (!this.isValid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.saveCredentials(this.username, this.password);

    this.ws.connect().subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: () => {
        this.loading.set(false);
        this.auth.clearCredentials();
        this.error.set('Invalid username or password');
      },
    });
  }
}
