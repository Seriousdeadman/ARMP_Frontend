import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department, Employee, EmployeeRequest, Grade } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

@Component({
  selector: 'app-hr-admin-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-employees.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminEmployeesComponent implements OnInit {
  private readonly hrService = inject(HrService);

  employees: Employee[] = [];
  grades: Grade[] = [];
  departments: Department[] = [];
  searchQuery = '';
  selectedGradeFilter = 'ALL';
  selectedDepartmentFilter = 'ALL';
  selectedId = '';
  form: EmployeeRequest = { name: '', email: '', hireDate: '', leaveBalance: 21, gradeId: '', departmentId: '' };
  salaryEmployeeId = '';
  salaryValue: number | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.reload();
    this.hrService.listGrades().subscribe({ next: v => this.grades = v });
    this.hrService.listDepartments().subscribe({ next: v => this.departments = v });
  }

  reload(): void {
    this.hrService.listEmployees().subscribe({ next: v => this.employees = v });
  }

  pick(id: string): void {
    this.selectedId = id;
    const e = this.employees.find(x => x.id === id);
    if (!e) return;
    this.form = { name: e.name, email: e.email, hireDate: e.hireDate, leaveBalance: e.leaveBalance, gradeId: e.grade.id, departmentId: e.department.id };
  }

  create(): void {
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.createEmployee(this.form).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Create failed' });
  }

  update(): void {
    if (!this.selectedId) { this.error = 'Select employee first'; return; }
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.updateEmployee(this.selectedId, this.form).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Update failed' });
  }

  remove(): void {
    if (!this.selectedId) { this.error = 'Select employee first'; return; }
    this.error = null;
    this.hrService.deleteEmployee(this.selectedId).subscribe({ next: () => { this.selectedId = ''; this.reload(); }, error: e => this.error = e?.error?.message ?? 'Delete failed' });
  }

  calculateSalary(): void {
    if (!this.salaryEmployeeId) { this.error = 'Select employee for salary'; return; }
    this.error = null;
    this.hrService.getEmployeeMonthlyPay(this.salaryEmployeeId).subscribe({ next: v => this.salaryValue = v, error: e => this.error = e?.error?.message ?? 'Calculation failed' });
  }

  get filteredEmployees(): Employee[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.employees.filter(employee => {
      const searchMatch = !query
        || employee.name.toLowerCase().includes(query)
        || employee.email.toLowerCase().includes(query)
        || employee.department.name.toLowerCase().includes(query)
        || employee.grade.name.toLowerCase().includes(query);
      const gradeMatch = this.selectedGradeFilter === 'ALL' || employee.grade.id === this.selectedGradeFilter;
      const departmentMatch = this.selectedDepartmentFilter === 'ALL' || employee.department.id === this.selectedDepartmentFilter;
      return searchMatch && gradeMatch && departmentMatch;
    });
  }

  private validateForm(): boolean {
    if (!this.form.name.trim()) {
      this.error = 'Employee name is required.';
      return false;
    }
    if (!this.form.email.trim()) {
      this.error = 'Employee email is required.';
      return false;
    }
    if (!this.form.hireDate) {
      this.error = 'Hire date is required.';
      return false;
    }
    if (!this.form.gradeId) {
      this.error = 'Grade is required.';
      return false;
    }
    if (!this.form.departmentId) {
      this.error = 'Department is required.';
      return false;
    }
    if ((this.form.leaveBalance ?? 0) < 0) {
      this.error = 'Leave balance cannot be negative.';
      return false;
    }
    return true;
  }
}
