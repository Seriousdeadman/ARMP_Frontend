import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [SettingsComponent],
  imports: [SharedModule, ReactiveFormsModule, SettingsRoutingModule]
})
export class SettingsModule {}
