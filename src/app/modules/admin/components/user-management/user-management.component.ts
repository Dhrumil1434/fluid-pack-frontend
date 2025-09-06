import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="placeholder">User Management - Coming Soon</div>',
  styles: ['.placeholder { padding: 2rem; text-align: center; font-size: 1.5rem; color: #666; }']
})
export class UserManagementComponent {}
