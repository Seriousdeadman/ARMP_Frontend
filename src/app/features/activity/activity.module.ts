import { NgModule } from '@angular/core';
import { ActivityRoutingModule } from './activity-routing.module';
import { ActivityComponent } from './activity.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ActivityComponent],
  imports: [SharedModule, ActivityRoutingModule]
})
export class ActivityModule {}
