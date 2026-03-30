import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LayoutModule } from './layout/layout.module';
import { ErrorsModule } from './features/errors/errors.module';
import { ClassroomComponent } from './features/resource/classroom/classroom.component';
import { LaboratoryComponent } from './features/resource/laboratory/laboratory.component';
import { CollaborativeSpaceComponent } from './features/resource/collaborative-space/collaborative-space.component';
import { EquipmentComponent } from './features/resource/equipment/equipment.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LayoutModule,
    ErrorsModule,
    FormsModule,
    
  ],
  providers: [
    provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
