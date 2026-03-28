import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Candidate,
  CandidateRequest,
  CandidateStatus,
  CandidateRecruitmentRow,
  CvFileMetadata,
  Department,
  Employee,
  EmployeeDirectoryRow,
  EmployeeRequest,
  Grade,
  GradeName,
  GradeRequest,
  Interview,
  InterviewRequest,
  InterviewStatus,
  LeaveRequest,
  LeaveRequestRequest,
  LeaveRequestPendingRow
} from '../../models/hr.models';
import { HrService } from '../../services/hr.service';

@Component({
  selector: 'app-hr-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin.component.html',
  styleUrl: './hr-admin.component.scss'
})
export class HrAdminComponent implements OnInit {

  candidates: CandidateRecruitmentRow[] = [];
  pendingLeaves: LeaveRequestPendingRow[] = [];
  employees: EmployeeDirectoryRow[] = [];
  employeeSearch = '';

  loadingCandidates = true;
  loadingLeaves = true;
  loadingEmployees = true;

  actionError: string | null = null;
  actionSuccess: string | null = null;
  processingCandidateId: string | null = null;
  processingLeaveId: string | null = null;
  adminPassword = '';

  candidateCrudRows: Candidate[] = [];
  employeeCrudRows: Employee[] = [];
  gradeRows: Grade[] = [];
  departmentRows: Department[] = [];
  interviewRows: Interview[] = [];
  leaveRequestRows: LeaveRequest[] = [];

  selectedCandidateId = '';
  selectedInterviewId = '';
  selectedEmployeeId = '';
  selectedGradeId = '';
  selectedDepartmentId = '';
  selectedLeaveRequestId = '';

  cvText = '';
  cvFileMetadata: CvFileMetadata | null = null;
  selectedCvCandidateId = '';
  selectedCvFile: File | null = null;
  cvBusy = false;

  candidateForm: CandidateRequest = {
    name: '',
    email: '',
    phone: '',
    status: 'PENDING',
    departmentId: '',
    skillsAndExperience: ''
  };

  interviewForm: InterviewRequest = {
    interviewDate: '',
    location: '',
    score: null,
    status: 'PLANNED',
    candidateId: ''
  };

  employeeForm: EmployeeRequest = {
    name: '',
    email: '',
    hireDate: '',
    leaveBalance: 21,
    gradeId: '',
    departmentId: ''
  };

  gradeForm: GradeRequest = {
    name: 'ASSISTANT',
    baseSalary: 0,
    hourlyBonus: 0
  };

  departmentForm = { name: '' };

  leaveRequestForm: LeaveRequestRequest = {
    startDate: '',
    endDate: '',
    type: 'ANNUAL',
    status: 'PENDING',
    employeeId: ''
  };

  selectedSalaryEmployeeId = '';
  selectedSalaryEmployeeName = '';
  salaryAmount: number | null = null;

  readonly candidateStatuses: CandidateStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED'];
  readonly interviewStatuses: InterviewStatus[] = ['PLANNED', 'COMPLETED', 'CANCELED'];
  readonly gradeNames: GradeName[] = ['ASSISTANT', 'MAITRE', 'PROF'];

  constructor(private hrService: HrService) {}

  ngOnInit(): void {
    this.loadCandidates();
    this.loadPendingLeaves();
    this.loadEmployees();
    this.loadCandidatesCrud();
    this.loadInterviews();
    this.loadEmployeesCrud();
    this.loadGrades();
    this.loadDepartments();
    this.loadLeaveRequestsCrud();
  }

  get filteredEmployees(): EmployeeDirectoryRow[] {
    const q = this.employeeSearch.trim().toLowerCase();
    if (!q) {
      return this.employees;
    }
    return this.employees.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.departmentName.toLowerCase().includes(q)
    );
  }

  loadCandidates(): void {
    this.loadingCandidates = true;
    this.hrService.listRecruitmentCandidates().subscribe({
      next: rows => {
        this.candidates = rows;
        this.loadingCandidates = false;
      },
      error: () => {
        this.loadingCandidates = false;
      }
    });
  }

  loadPendingLeaves(): void {
    this.loadingLeaves = true;
    this.hrService.listPendingLeaveRequests().subscribe({
      next: rows => {
        this.pendingLeaves = rows;
        this.loadingLeaves = false;
      },
      error: () => {
        this.loadingLeaves = false;
      }
    });
  }

  loadEmployees(): void {
    this.loadingEmployees = true;
    this.hrService.listEmployeeDirectory().subscribe({
      next: rows => {
        this.employees = rows;
        this.loadingEmployees = false;
      },
      error: () => {
        this.loadingEmployees = false;
      }
    });
  }

  hire(candidateId: string): void {
    this.clearMessages();
    this.processingCandidateId = candidateId;
    this.hrService.promoteCandidate(candidateId).subscribe({
      next: () => {
        this.processingCandidateId = null;
        this.actionSuccess = 'Candidate promoted to employee.';
        this.loadCandidates();
        this.loadEmployees();
        this.loadEmployeesCrud();
        this.loadCandidatesCrud();
      },
      error: err => {
        this.processingCandidateId = null;
        this.actionError = err?.error?.message ?? 'Hire failed';
      }
    });
  }

  approveLeave(id: string): void {
    this.clearMessages();
    this.processingLeaveId = id;
    this.hrService.approveLeave(id, this.adminPassword).subscribe({
      next: () => {
        this.processingLeaveId = null;
        this.actionSuccess = 'Leave request approved.';
        this.loadPendingLeaves();
        this.loadEmployees();
        this.loadEmployeesCrud();
        this.loadLeaveRequestsCrud();
      },
      error: err => {
        this.processingLeaveId = null;
        this.actionError = err?.error?.message ?? 'Approve failed';
      }
    });
  }

  rejectLeave(id: string): void {
    this.clearMessages();
    this.processingLeaveId = id;
    this.hrService.rejectLeave(id, this.adminPassword).subscribe({
      next: () => {
        this.processingLeaveId = null;
        this.actionSuccess = 'Leave request rejected.';
        this.loadPendingLeaves();
        this.loadLeaveRequestsCrud();
      },
      error: err => {
        this.processingLeaveId = null;
        this.actionError = err?.error?.message ?? 'Reject failed';
      }
    });
  }

  candidateStatusClass(status: string): string {
    switch (status) {
      case 'ACCEPTED':
        return 'status-pill status-pill--ok';
      case 'REJECTED':
        return 'status-pill status-pill--bad';
      default:
        return 'status-pill status-pill--pending';
    }
  }

  leaveStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'status-pill status-pill--ok';
      case 'REJECTED':
        return 'status-pill status-pill--bad';
      default:
        return 'status-pill status-pill--pending';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  loadCandidatesCrud(): void {
    this.hrService.listCandidates().subscribe({
      next: rows => {
        this.candidateCrudRows = rows;
        if (!this.selectedCvCandidateId && rows.length > 0) {
          this.selectedCvCandidateId = rows[0].id;
        }
      }
    });
  }

  createCandidate(): void {
    this.clearMessages();
    this.hrService.createCandidate(this.candidateForm).subscribe({
      next: () => {
        this.actionSuccess = 'Candidate created.';
        this.resetCandidateForm();
        this.loadCandidatesCrud();
        this.loadCandidates();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create candidate failed'
    });
  }

  updateCandidate(): void {
    if (!this.selectedCandidateId) {
      this.actionError = 'Select a candidate to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateCandidate(this.selectedCandidateId, this.candidateForm).subscribe({
      next: () => {
        this.actionSuccess = 'Candidate updated.';
        this.loadCandidatesCrud();
        this.loadCandidates();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update candidate failed'
    });
  }

  deleteCandidate(): void {
    if (!this.selectedCandidateId) {
      this.actionError = 'Select a candidate to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteCandidate(this.selectedCandidateId).subscribe({
      next: () => {
        this.actionSuccess = 'Candidate deleted.';
        this.selectedCandidateId = '';
        this.resetCandidateForm();
        this.loadCandidatesCrud();
        this.loadCandidates();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete candidate failed'
    });
  }

  onCandidatePicked(candidateId: string): void {
    this.selectedCandidateId = candidateId;
    const row = this.candidateCrudRows.find(c => c.id === candidateId);
    if (!row) {
      return;
    }
    this.candidateForm = {
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      departmentId: row.department?.id ?? '',
      skillsAndExperience: ''
    };
  }

  loadCvData(): void {
    if (!this.selectedCvCandidateId) {
      this.actionError = 'Select candidate for CV.';
      return;
    }
    this.clearMessages();
    this.hrService.getCandidateCv(this.selectedCvCandidateId).subscribe({
      next: cv => this.cvText = cv.skillsAndExperience,
      error: () => this.cvText = ''
    });
    this.hrService.getCandidateCvFileMetadata(this.selectedCvCandidateId).subscribe({
      next: meta => this.cvFileMetadata = meta,
      error: () => this.cvFileMetadata = { candidateId: this.selectedCvCandidateId, filePresent: false }
    });
  }

  saveCvText(): void {
    if (!this.selectedCvCandidateId) {
      this.actionError = 'Select candidate for CV.';
      return;
    }
    this.clearMessages();
    this.hrService.updateCandidateCv(this.selectedCvCandidateId, this.cvText).subscribe({
      next: () => this.actionSuccess = 'CV text saved.',
      error: err => this.actionError = err?.error?.message ?? 'Save CV text failed'
    });
  }

  onCvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedCvFile = input.files?.item(0) ?? null;
  }

  uploadCvFile(): void {
    if (!this.selectedCvCandidateId || !this.selectedCvFile) {
      this.actionError = 'Select candidate and file first.';
      return;
    }
    this.clearMessages();
    this.cvBusy = true;
    this.hrService.uploadCandidateCvFile(this.selectedCvCandidateId, this.selectedCvFile).subscribe({
      next: meta => {
        this.cvBusy = false;
        this.cvFileMetadata = meta;
        this.actionSuccess = 'CV file uploaded.';
      },
      error: err => {
        this.cvBusy = false;
        this.actionError = err?.error?.message ?? 'Upload failed';
      }
    });
  }

  downloadCvFile(): void {
    if (!this.selectedCvCandidateId) {
      this.actionError = 'Select candidate for CV download.';
      return;
    }
    this.hrService.downloadCandidateCvFile(this.selectedCvCandidateId).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      },
      error: err => this.actionError = err?.error?.message ?? 'Download failed'
    });
  }

  deleteCvFile(): void {
    if (!this.selectedCvCandidateId) {
      this.actionError = 'Select candidate for CV deletion.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteCandidateCvFile(this.selectedCvCandidateId).subscribe({
      next: meta => {
        this.cvFileMetadata = meta;
        this.actionSuccess = 'CV file deleted.';
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete file failed'
    });
  }

  loadInterviews(): void {
    this.hrService.listInterviews().subscribe({
      next: rows => this.interviewRows = rows
    });
  }

  createInterview(): void {
    this.clearMessages();
    this.hrService.createInterview(this.interviewForm).subscribe({
      next: () => {
        this.actionSuccess = 'Interview created.';
        this.loadInterviews();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create interview failed'
    });
  }

  updateInterview(): void {
    if (!this.selectedInterviewId) {
      this.actionError = 'Select interview to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateInterview(this.selectedInterviewId, this.interviewForm).subscribe({
      next: () => {
        this.actionSuccess = 'Interview updated.';
        this.loadInterviews();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update interview failed'
    });
  }

  deleteInterview(): void {
    if (!this.selectedInterviewId) {
      this.actionError = 'Select interview to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteInterview(this.selectedInterviewId).subscribe({
      next: () => {
        this.actionSuccess = 'Interview deleted.';
        this.selectedInterviewId = '';
        this.loadInterviews();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete interview failed'
    });
  }

  onInterviewPicked(id: string): void {
    this.selectedInterviewId = id;
    const row = this.interviewRows.find(i => i.id === id);
    if (!row) {
      return;
    }
    this.interviewForm = {
      interviewDate: row.interviewDate,
      location: row.location,
      score: row.score ?? null,
      status: row.status,
      candidateId: row.candidate.id
    };
  }

  loadEmployeesCrud(): void {
    this.hrService.listEmployees().subscribe({
      next: rows => this.employeeCrudRows = rows
    });
  }

  createEmployee(): void {
    this.clearMessages();
    this.hrService.createEmployee(this.employeeForm).subscribe({
      next: () => {
        this.actionSuccess = 'Employee created.';
        this.loadEmployeesCrud();
        this.loadEmployees();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create employee failed'
    });
  }

  updateEmployee(): void {
    if (!this.selectedEmployeeId) {
      this.actionError = 'Select employee to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateEmployee(this.selectedEmployeeId, this.employeeForm).subscribe({
      next: () => {
        this.actionSuccess = 'Employee updated.';
        this.loadEmployeesCrud();
        this.loadEmployees();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update employee failed'
    });
  }

  deleteEmployee(): void {
    if (!this.selectedEmployeeId) {
      this.actionError = 'Select employee to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteEmployee(this.selectedEmployeeId).subscribe({
      next: () => {
        this.actionSuccess = 'Employee deleted.';
        this.selectedEmployeeId = '';
        this.loadEmployeesCrud();
        this.loadEmployees();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete employee failed'
    });
  }

  onEmployeePicked(id: string): void {
    this.selectedEmployeeId = id;
    const row = this.employeeCrudRows.find(e => e.id === id);
    if (!row) {
      return;
    }
    this.employeeForm = {
      name: row.name,
      email: row.email,
      hireDate: row.hireDate,
      leaveBalance: row.leaveBalance,
      gradeId: row.grade.id,
      departmentId: row.department.id
    };
  }

  loadGrades(): void {
    this.hrService.listGrades().subscribe({
      next: rows => this.gradeRows = rows
    });
  }

  createGrade(): void {
    this.clearMessages();
    this.hrService.createGrade(this.gradeForm).subscribe({
      next: () => {
        this.actionSuccess = 'Grade created.';
        this.loadGrades();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create grade failed'
    });
  }

  updateGrade(): void {
    if (!this.selectedGradeId) {
      this.actionError = 'Select grade to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateGrade(this.selectedGradeId, this.gradeForm).subscribe({
      next: () => {
        this.actionSuccess = 'Grade updated.';
        this.loadGrades();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update grade failed'
    });
  }

  deleteGrade(): void {
    if (!this.selectedGradeId) {
      this.actionError = 'Select grade to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteGrade(this.selectedGradeId).subscribe({
      next: () => {
        this.actionSuccess = 'Grade deleted.';
        this.selectedGradeId = '';
        this.loadGrades();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete grade failed'
    });
  }

  onGradePicked(id: string): void {
    this.selectedGradeId = id;
    const row = this.gradeRows.find(g => g.id === id);
    if (!row) {
      return;
    }
    this.gradeForm = {
      name: row.name,
      baseSalary: row.baseSalary,
      hourlyBonus: row.hourlyBonus
    };
  }

  loadDepartments(): void {
    this.hrService.listDepartments().subscribe({
      next: rows => this.departmentRows = rows
    });
  }

  createDepartment(): void {
    this.clearMessages();
    this.hrService.createDepartment(this.departmentForm).subscribe({
      next: () => {
        this.actionSuccess = 'Department created.';
        this.departmentForm = { name: '' };
        this.loadDepartments();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create department failed'
    });
  }

  updateDepartment(): void {
    if (!this.selectedDepartmentId) {
      this.actionError = 'Select department to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateDepartment(this.selectedDepartmentId, this.departmentForm).subscribe({
      next: () => {
        this.actionSuccess = 'Department updated.';
        this.loadDepartments();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update department failed'
    });
  }

  deleteDepartment(): void {
    if (!this.selectedDepartmentId) {
      this.actionError = 'Select department to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteDepartment(this.selectedDepartmentId).subscribe({
      next: () => {
        this.actionSuccess = 'Department deleted.';
        this.selectedDepartmentId = '';
        this.loadDepartments();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete department failed'
    });
  }

  onDepartmentPicked(id: string): void {
    this.selectedDepartmentId = id;
    const row = this.departmentRows.find(d => d.id === id);
    if (row) {
      this.departmentForm = { name: row.name };
    }
  }

  loadLeaveRequestsCrud(): void {
    this.hrService.listLeaveRequests().subscribe({
      next: rows => this.leaveRequestRows = rows
    });
  }

  createLeaveRequestCrud(): void {
    this.clearMessages();
    this.hrService.createLeaveRequestAdmin(this.leaveRequestForm).subscribe({
      next: () => {
        this.actionSuccess = 'Leave request created.';
        this.loadLeaveRequestsCrud();
        this.loadPendingLeaves();
      },
      error: err => this.actionError = err?.error?.message ?? 'Create leave request failed'
    });
  }

  updateLeaveRequestCrud(): void {
    if (!this.selectedLeaveRequestId) {
      this.actionError = 'Select leave request to update.';
      return;
    }
    this.clearMessages();
    this.hrService.updateLeaveRequestAdmin(this.selectedLeaveRequestId, this.leaveRequestForm).subscribe({
      next: () => {
        this.actionSuccess = 'Leave request updated.';
        this.loadLeaveRequestsCrud();
        this.loadPendingLeaves();
      },
      error: err => this.actionError = err?.error?.message ?? 'Update leave request failed'
    });
  }

  deleteLeaveRequestCrud(): void {
    if (!this.selectedLeaveRequestId) {
      this.actionError = 'Select leave request to delete.';
      return;
    }
    this.clearMessages();
    this.hrService.deleteLeaveRequestAdmin(this.selectedLeaveRequestId).subscribe({
      next: () => {
        this.actionSuccess = 'Leave request deleted.';
        this.selectedLeaveRequestId = '';
        this.loadLeaveRequestsCrud();
        this.loadPendingLeaves();
      },
      error: err => this.actionError = err?.error?.message ?? 'Delete leave request failed'
    });
  }

  onLeaveRequestPicked(id: string): void {
    this.selectedLeaveRequestId = id;
    const row = this.leaveRequestRows.find(l => l.id === id);
    if (!row) {
      return;
    }
    this.leaveRequestForm = {
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      status: row.status,
      employeeId: row.employee.id
    };
  }

  calculateSalary(): void {
    if (!this.selectedSalaryEmployeeId) {
      this.actionError = 'Select employee for salary calculation.';
      return;
    }
    this.clearMessages();
    this.hrService.getEmployeeMonthlyPay(this.selectedSalaryEmployeeId).subscribe({
      next: amount => {
        this.salaryAmount = amount;
        this.actionSuccess = 'Salary calculated.';
      },
      error: err => this.actionError = err?.error?.message ?? 'Salary calculation failed'
    });
  }

  onSalaryEmployeePicked(id: string): void {
    this.selectedSalaryEmployeeId = id;
    const row = this.employeeCrudRows.find(e => e.id === id);
    this.selectedSalaryEmployeeName = row ? row.name : '';
  }

  private clearMessages(): void {
    this.actionError = null;
    this.actionSuccess = null;
  }

  private resetCandidateForm(): void {
    this.candidateForm = {
      name: '',
      email: '',
      phone: '',
      status: 'PENDING',
      departmentId: '',
      skillsAndExperience: ''
    };
  }
}
