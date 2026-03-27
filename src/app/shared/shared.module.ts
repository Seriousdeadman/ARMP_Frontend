import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from './spinner/spinner.component';
import { ToastComponent } from './toast/toast.component';

@NgModule({
  declarations: [
    SpinnerComponent,
    ToastComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SpinnerComponent,
    ToastComponent,
    CommonModule
  ]
})
export class SharedModule {}
