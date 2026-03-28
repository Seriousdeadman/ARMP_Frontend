import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HrService } from '../../services/hr.service';
import { HrAdminComponent } from './hr-admin.component';

describe('HrAdminComponent', () => {
  let component: HrAdminComponent;
  let fixture: ComponentFixture<HrAdminComponent>;

  const hrServiceMock = {
    listRecruitmentCandidates: () => of([]),
    listPendingLeaveRequests: () => of([]),
    listEmployeeDirectory: () => of([]),
    listCandidates: () => of([]),
    listInterviews: () => of([]),
    listEmployees: () => of([]),
    listGrades: () => of([]),
    listDepartments: () => of([]),
    listLeaveRequests: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrAdminComponent],
      providers: [
        { provide: HrService, useValue: hrServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HrAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
