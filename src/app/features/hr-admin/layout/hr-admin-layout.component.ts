import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-hr-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './hr-admin-layout.component.html',
  styleUrl: './hr-admin-layout.component.scss'
})
export class HrAdminLayoutComponent {}
