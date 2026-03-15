import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-new-chat-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>New Chat</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Username</mat-label>
        <input matInput [(ngModel)]="username" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [mat-dialog-close]="username" [disabled]="!username">Start</button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      padding-top: 0.75rem !important;
    }
    mat-form-field {
      width: 100%;
    }
  `,
})
export class NewChatDialog {
  username = '';
}
