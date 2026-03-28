import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HrService } from './hr.service';

describe('HrService', () => {
  let service: HrService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(HrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
