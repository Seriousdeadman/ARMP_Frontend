export type CandidateStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LeaveType = 'ANNUAL' | 'SICK' | 'EXCEPTIONAL';

export type GradeName = 'ASSISTANT' | 'MAITRE' | 'PROF';

export interface CandidateRecruitmentRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  departmentName: string | null;
  interviewScore: number | null;
}

export interface LeaveRequestPendingRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  requestedDayCount: number;
}

export interface EmployeeDirectoryRow {
  id: string;
  name: string;
  email: string;
  gradeName: GradeName;
  leaveBalanceDays: number;
  departmentName: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  name: GradeName;
  baseSalary: number;
  hourlyBonus: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  department: Department;
  cv?: Cv | null;
}

export interface CareersApplication {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  departmentId: string;
  departmentName: string;
  skillsAndExperience: string;
  hasCvFile: boolean;
}

export interface CandidateRequest {
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  departmentId: string;
  skillsAndExperience?: string;
}

export interface CareersApplicationRequest {
  name: string;
  phone: string;
  departmentId: string;
  skillsAndExperience: string;
}

export interface Cv {
  id: string;
  skillsAndExperience: string;
  fileName?: string | null;
  fileContentType?: string | null;
  fileSizeBytes?: number | null;
  fileStoragePath?: string | null;
}

export interface CvFileMetadata {
  candidateId: string;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  filePresent: boolean;
}

export type InterviewStatus = 'PLANNED' | 'COMPLETED' | 'CANCELED';

export interface Interview {
  id: string;
  interviewDate: string;
  location: string;
  score?: number | null;
  status: InterviewStatus;
  candidate: Candidate;
}

export interface InterviewRequest {
  interviewDate: string;
  location: string;
  score?: number | null;
  status: InterviewStatus;
  candidateId: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  hireDate: string;
  leaveBalance: number;
  grade: Grade;
  department: Department;
}

export interface EmployeeRequest {
  name: string;
  email: string;
  hireDate: string;
  leaveBalance?: number | null;
  gradeId: string;
  departmentId: string;
}

export interface GradeRequest {
  name: GradeName;
  baseSalary: number;
  hourlyBonus: number;
}

export interface DepartmentRequest {
  name: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  requestedDays?: number | null;
  statusMessage?: string | null;
  employee: Employee;
}

export interface LeaveRequestRequest {
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  employeeId: string;
}
