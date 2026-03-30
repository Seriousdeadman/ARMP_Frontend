import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Candidate,
  CandidateStatus,
  CandidateRequest,
  CandidateRecruitmentRow,
  CareersApplication,
  CareersApplicationRequest,
  Cv,
  CvFileMetadata,
  Department,
  DepartmentRequest,
  Employee,
  EmployeeDirectoryRow,
  EmployeeRequest,
  Grade,
  GradeRequest,
  Interview,
  InterviewRequest,
  RecruitmentAssignment,
  LeaveRequest,
  LeaveRequestPendingRow,
  LeaveRequestRequest,
  PayrollResult,
  PortalPayrollResponse
} from '../models/hr.models';

export interface ApplicationStatusResponse {
  candidateFound: boolean;
  candidateStatus?: string | null;
  message?: string | null;
  interviewScheduledAt?: string | null;
  interviewLocation?: string | null;
}

export interface LeaveSummaryResponse {
  employeeFound: boolean;
  displayName?: string | null;
  remainingLeaveDays?: number | null;
  /** Set when API returns 403 (pending onboarding); shell bootstrap only. */
  pendingValidation?: boolean;
}

export type LeaveTypeCode = 'ANNUAL' | 'SICK' | 'EXCEPTIONAL';

export interface CreateLeaveRequest {
  startDate: string;
  endDate: string;
  type: LeaveTypeCode;
  reason?: string | null;
}

export interface PortalLeaveRequestRow {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  requestedDays: number | null;
  reason: string | null;
  statusMessage: string | null;
}

export interface LeavePreviewResponse {
  requestedDays: number;
  currentRemainingDays: number;
  remainingAfterApproval: number;
}

export interface SubmittedLeaveRequestResponse {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly http = inject(HttpClient);
  private readonly portalBase = `${environment.apiUrl}/api/hr/portal`;
  private readonly adminBase = `${environment.apiUrl}/api/hr`;

  getApplicationStatus(): Observable<ApplicationStatusResponse> {
    return this.http.get<ApplicationStatusResponse>(`${this.portalBase}/application-status`);
  }

  listCareerDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.portalBase}/departments`);
  }

  getLeaveSummary(): Observable<LeaveSummaryResponse> {
    return this.http.get<LeaveSummaryResponse>(`${this.portalBase}/leave-summary`);
  }

  getMyLeaveRequests(): Observable<PortalLeaveRequestRow[]> {
    return this.http.get<PortalLeaveRequestRow[]>(`${this.portalBase}/my-leave-requests`);
  }

  getLeavePreview(startDate: string, endDate: string): Observable<LeavePreviewResponse> {
    return this.http.get<LeavePreviewResponse>(`${this.portalBase}/leave-preview`, {
      params: { startDate, endDate }
    });
  }

  submitLeaveRequest(body: CreateLeaveRequest): Observable<SubmittedLeaveRequestResponse> {
    return this.http.post<SubmittedLeaveRequestResponse>(`${this.portalBase}/leave-requests`, body);
  }

  getMyApplication(): Observable<CareersApplication | null> {
    return this.http.get<CareersApplication | null>(`${this.portalBase}/my-application`);
  }

  saveMyApplication(payload: CareersApplicationRequest): Observable<CareersApplication> {
    return this.http.put<CareersApplication>(`${this.portalBase}/my-application`, payload);
  }

  getMyApplicationCvFileMetadata(): Observable<CvFileMetadata> {
    return this.http.get<CvFileMetadata>(`${this.portalBase}/my-application/cv-file/metadata`);
  }

  uploadMyApplicationCvFile(file: File): Observable<CvFileMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvFileMetadata>(`${this.portalBase}/my-application/cv-file`, formData);
  }

  downloadMyApplicationCvFile(): Observable<Blob> {
    return this.http.get(`${this.portalBase}/my-application/cv-file`, { responseType: 'blob' });
  }

  deleteMyApplicationCvFile(): Observable<CvFileMetadata> {
    return this.http.delete<CvFileMetadata>(`${this.portalBase}/my-application/cv-file`);
  }

  listRecruitmentCandidates(): Observable<CandidateRecruitmentRow[]> {
    return this.http.get<CandidateRecruitmentRow[]>(`${this.adminBase}/candidates/recruitment`);
  }

  listRecruitmentAssignments(): Observable<RecruitmentAssignment[]> {
    return this.http.get<RecruitmentAssignment[]>(`${this.adminBase}/candidates/recruitment/assignments`);
  }

  listPendingLeaveRequests(): Observable<LeaveRequestPendingRow[]> {
    return this.http.get<LeaveRequestPendingRow[]>(`${this.adminBase}/leave-requests/pending`);
  }

  listEmployeeDirectory(): Observable<EmployeeDirectoryRow[]> {
    return this.http.get<EmployeeDirectoryRow[]>(`${this.adminBase}/employees/directory`);
  }

  promoteCandidate(
    candidateId: string,
    options?: { gradeId?: string | null; departmentId?: string | null }
  ): Observable<Employee> {
    const body: Record<string, string> = {};
    if (options?.gradeId) {
      body['gradeId'] = options.gradeId;
    }
    if (options?.departmentId) {
      body['departmentId'] = options.departmentId;
    }
    return this.http.post<Employee>(`${this.adminBase}/candidates/${candidateId}/promote`, body);
  }

  patchCandidateStatus(candidateId: string, status: CandidateStatus): Observable<Candidate> {
    return this.http.patch<Candidate>(`${this.adminBase}/candidates/${candidateId}/status`, { status });
  }

  getEmployee(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.adminBase}/employees/${id}`);
  }

  approveLeave(id: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.adminBase}/leave-requests/${id}/approve`, {});
  }

  rejectLeave(id: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.adminBase}/leave-requests/${id}/reject`, {});
  }

  listCandidates(options?: { excludePromoted?: boolean; departmentId?: string }): Observable<Candidate[]> {
    let params = new HttpParams();
    if (options?.excludePromoted) {
      params = params.set('excludePromoted', 'true');
    }
    if (options?.departmentId) {
      params = params.set('departmentId', options.departmentId);
    }
    return this.http.get<Candidate[]>(`${this.adminBase}/candidates`, { params });
  }

  getCandidate(id: string): Observable<Candidate> {
    return this.http.get<Candidate>(`${this.adminBase}/candidates/${id}`);
  }

  createCandidate(payload: CandidateRequest): Observable<Candidate> {
    return this.http.post<Candidate>(`${this.adminBase}/candidates`, payload);
  }

  updateCandidate(id: string, payload: CandidateRequest): Observable<Candidate> {
    return this.http.put<Candidate>(`${this.adminBase}/candidates/${id}`, payload);
  }

  deleteCandidate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/candidates/${id}`);
  }

  getCandidateCv(candidateId: string): Observable<Cv> {
    return this.http.get<Cv>(`${this.adminBase}/candidates/${candidateId}/cv`);
  }

  updateCandidateCv(candidateId: string, skillsAndExperience: string): Observable<Cv> {
    return this.http.put<Cv>(`${this.adminBase}/candidates/${candidateId}/cv`, { skillsAndExperience });
  }

  getCandidateCvFileMetadata(candidateId: string): Observable<CvFileMetadata> {
    return this.http.get<CvFileMetadata>(`${this.adminBase}/candidates/${candidateId}/cv-file/metadata`);
  }

  uploadCandidateCvFile(candidateId: string, file: File): Observable<CvFileMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvFileMetadata>(`${this.adminBase}/candidates/${candidateId}/cv-file`, formData);
  }

  downloadCandidateCvFile(candidateId: string): Observable<Blob> {
    return this.http.get(`${this.adminBase}/candidates/${candidateId}/cv-file`, { responseType: 'blob' });
  }

  deleteCandidateCvFile(candidateId: string): Observable<CvFileMetadata> {
    return this.http.delete<CvFileMetadata>(`${this.adminBase}/candidates/${candidateId}/cv-file`);
  }

  listInterviews(candidateId?: string): Observable<Interview[]> {
    const qs = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : '';
    return this.http.get<Interview[]>(`${this.adminBase}/interviews${qs}`);
  }

  createInterview(payload: InterviewRequest): Observable<Interview> {
    return this.http.post<Interview>(`${this.adminBase}/interviews`, payload);
  }

  updateInterview(id: string, payload: InterviewRequest): Observable<Interview> {
    return this.http.put<Interview>(`${this.adminBase}/interviews/${id}`, payload);
  }

  deleteInterview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/interviews/${id}`);
  }

  listEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.adminBase}/employees`);
  }

  createEmployee(payload: EmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(`${this.adminBase}/employees`, payload);
  }

  updateEmployee(id: string, payload: EmployeeRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.adminBase}/employees/${id}`, payload);
  }

  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/employees/${id}`);
  }

  getEmployeeMonthlyPay(id: string): Observable<PayrollResult> {
    return this.http.get<PayrollResult>(`${this.adminBase}/employees/${id}/monthly-pay`);
  }

  activateEmployee(id: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.adminBase}/employees/${id}/activate`, {});
  }

  getMyPayroll(): Observable<PortalPayrollResponse> {
    return this.http.get<PortalPayrollResponse>(`${this.portalBase}/my-payroll`);
  }

  listGrades(): Observable<Grade[]> {
    return this.http.get<Grade[]>(`${this.adminBase}/grades`);
  }

  createGrade(payload: GradeRequest): Observable<Grade> {
    return this.http.post<Grade>(`${this.adminBase}/grades`, payload);
  }

  updateGrade(id: string, payload: GradeRequest): Observable<Grade> {
    return this.http.put<Grade>(`${this.adminBase}/grades/${id}`, payload);
  }

  deleteGrade(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/grades/${id}`);
  }

  listDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.adminBase}/departments`);
  }

  createDepartment(payload: DepartmentRequest): Observable<Department> {
    return this.http.post<Department>(`${this.adminBase}/departments`, payload);
  }

  updateDepartment(id: string, payload: DepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.adminBase}/departments/${id}`, payload);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/departments/${id}`);
  }

  listLeaveRequests(employeeId?: string): Observable<LeaveRequest[]> {
    const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return this.http.get<LeaveRequest[]>(`${this.adminBase}/leave-requests${qs}`);
  }

  createLeaveRequestAdmin(payload: LeaveRequestRequest): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.adminBase}/leave-requests`, payload);
  }

  updateLeaveRequestAdmin(id: string, payload: LeaveRequestRequest): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.adminBase}/leave-requests/${id}`, payload);
  }

  deleteLeaveRequestAdmin(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/leave-requests/${id}`);
  }
}
