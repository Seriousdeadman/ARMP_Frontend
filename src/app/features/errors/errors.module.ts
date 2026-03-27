import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ForbiddenComponent],
  imports: [SharedModule, RouterModule],
  exports: [ForbiddenComponent]
})
export class ErrorsModule {}
