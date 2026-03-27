import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileComponent } from './profile.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ProfileComponent],
  imports: [SharedModule, ReactiveFormsModule, ProfileRoutingModule]
})
export class ProfileModule {}
