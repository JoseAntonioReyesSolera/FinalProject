import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TurnService {
  private readonly stepSubject = new BehaviorSubject<string>('');

  currentStep$ = this.stepSubject.asObservable();

  setCurrentStep(step: string) {
    this.stepSubject.next(step);
  }
}
