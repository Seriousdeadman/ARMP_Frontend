import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HrAdminTalentBoardComponent } from './hr-admin-talent-board.component';
import { HrService } from '../../../services/hr.service';
import { Candidate, CvFileMetadata } from '../../../models/hr.models';

describe('HrAdminTalentBoardComponent', () => {
  let fixture: ComponentFixture<HrAdminTalentBoardComponent>;
  let hr: jasmine.SpyObj<HrService>;

  beforeEach(async () => {
    hr = jasmine.createSpyObj('HrService', [
      'listRecruitmentCandidates',
      'listGrades',
      'patchCandidateStatus',
      'promoteCandidate',
      'getCandidate',
      'getCandidateCvFileMetadata',
      'downloadCandidateCvFile'
    ]);
    hr.listRecruitmentCandidates.and.returnValue(of([]));
    hr.listGrades.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HrAdminTalentBoardComponent],
      providers: [{ provide: HrService, useValue: hr }]
    }).compileComponents();

    fixture = TestBed.createComponent(HrAdminTalentBoardComponent);
    fixture.detectChanges();
  });

  it('openReview loads candidate and metadata', () => {
    const candidate: Candidate = {
      id: 'c1',
      name: 'A',
      email: 'a@test.com',
      phone: '1',
      status: 'NEW',
      department: { id: 'd1', name: 'CS' },
      cv: { id: 'cv1', skillsAndExperience: 'Skills text' }
    };
    const meta: CvFileMetadata = {
      candidateId: 'c1',
      filePresent: true,
      fileName: 'cv.pdf',
      sizeBytes: 100
    };
    hr.getCandidate.and.returnValue(of(candidate));
    hr.getCandidateCvFileMetadata.and.returnValue(of(meta));

    fixture.componentInstance.openReview({
      id: 'c1',
      name: 'A',
      email: 'a@test.com',
      phone: '1',
      status: 'NEW',
      departmentName: 'CS',
      interviewScore: null
    });

    expect(hr.getCandidate).toHaveBeenCalledWith('c1');
    expect(hr.getCandidateCvFileMetadata).toHaveBeenCalledWith('c1');
    expect(fixture.componentInstance.reviewDetail).toEqual(candidate);
    expect(fixture.componentInstance.reviewFileMeta).toEqual(meta);
    expect(fixture.componentInstance.reviewPanelOpen).toBe(true);
    expect(fixture.componentInstance.reviewLoading).toBe(false);
  });

  it('openReview sets error when getCandidate fails', () => {
    hr.getCandidate.and.returnValue(throwError(() => ({ error: { message: 'nope' } })));
    hr.getCandidateCvFileMetadata.and.returnValue(
      of({ candidateId: 'c1', filePresent: false })
    );

    fixture.componentInstance.openReview({
      id: 'c1',
      name: 'A',
      email: 'a@test.com',
      phone: '1',
      status: 'NEW',
      departmentName: null,
      interviewScore: null
    });

    expect(fixture.componentInstance.reviewError).toBe('nope');
    expect(fixture.componentInstance.reviewLoading).toBe(false);
  });
});
