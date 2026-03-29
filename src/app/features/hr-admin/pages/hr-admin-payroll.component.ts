import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee, PayrollResult } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

interface PayrollRow {
  employee: Employee;
  payroll: PayrollResult | null;
  loading: boolean;
}

@Component({
  selector: 'app-hr-admin-payroll',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hr-admin-payroll.component.html',
  styleUrls: ['./hr-admin-pages.shared.scss', './hr-admin-payroll.component.scss']
})
export class HrAdminPayrollComponent implements OnInit {
  private readonly hrService = inject(HrService);

  rows: PayrollRow[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.hrService.listEmployees().subscribe({
      next: employees => {
        this.rows = employees.map(e => ({
          employee: e,
          payroll: null,
          loading: true
        }));
        this.loading = false;
        this.loadPayroll();
      },
      error: e => {
        this.error = e?.error?.message ?? 'Failed to load employees.';
        this.loading = false;
      }
    });
  }

  private loadPayroll(): void {
    this.rows.forEach((row, idx) => {
      this.hrService.getEmployeeMonthlyPay(row.employee.id).subscribe({
        next: payroll => {
          this.rows[idx] = { ...this.rows[idx], payroll, loading: false };
        },
        error: () => {
          this.rows[idx] = { ...this.rows[idx], loading: false };
        }
      });
    });
  }

  hasDeduction(row: PayrollRow): boolean {
    return (row.payroll?.deduction ?? 0) > 0;
  }

  get totalGrossSalary(): number {
    return this.rows.reduce((sum, r) => sum + (r.payroll?.baseSalary ?? 0), 0);
  }

  get totalNetSalary(): number {
    return this.rows.reduce((sum, r) => sum + (r.payroll?.calculatedSalary ?? 0), 0);
  }

  get totalDeductions(): number {
    return this.rows.reduce((sum, r) => sum + (r.payroll?.deduction ?? 0), 0);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(value);
  }
}
