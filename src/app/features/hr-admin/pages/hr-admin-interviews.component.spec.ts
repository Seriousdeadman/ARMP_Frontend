import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { HrAdminInterviewsComponent } from './hr-admin-interviews.component';
import { HrService } from '../../../services/hr.service';
import { Candidate } from '../../../models/hr.models';

describe('HrAdminInterviewsComponent', () => {
  let fixture: ComponentFixture<HrAdminInterviewsComponent>;
  let hr: jasmine.SpyObj<HrService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    hr = jasmine.createSpyObj('HrService', ['listInterviews', 'listCandidates']);
    hr.listInterviews.and.returnValue(of([]));
    router = jasmine.createSpyObj('Router', ['navigate']);

    const candidate: Candidate = {
      id: 'c1',
      name: 'A',
      email: 'a@test.com',
      phone: '1',
      status: 'NEW',
      department: { id: 'd1', name: 'CS' }
    };
    hr.listCandidates.and.returnValue(of([candidate]));

    await TestBed.configureTestingModule({
      imports: [HrAdminInterviewsComponent],
      providers: [
        { provide: HrService, useValue: hr },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (k: string) => (k === 'candidateId' ? 'c1' : null) } },
            queryParamMap: of({ get: () => null })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HrAdminInterviewsComponent);
    fixture.detectChanges();
  });

  it('preselects candidateId from query param when loading candidates', () => {
    expect(fixture.componentInstance.form.candidateId).toBe('c1');
    expect(router.navigate).toHaveBeenCalled();
  });
});
