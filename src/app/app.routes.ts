import { Routes } from '@angular/router';
import {AppComponent} from './app.component';

export const routes: Routes = [
  { path: 'magic-asistent', component: AppComponent },
  { path: '', redirectTo: 'magic-asistent', pathMatch: 'full' },
  { path: '**', redirectTo: 'magic-asistent' }
];
