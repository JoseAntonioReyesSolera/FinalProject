import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly logSubject = new BehaviorSubject<string[]>([]);

  getLogs() {
    return this.logSubject.asObservable();
  }

  addLog(message: string) {
    const currentLogs = this.logSubject.getValue();
    const timestamp = new Date().toLocaleTimeString();
    this.logSubject.next([...currentLogs, `[${timestamp}] ${message}`]);
  }

  clearLogs() {
    this.logSubject.next([]);
  }

  getCurrentLogSnapshot(): string[] {
    return this.logSubject.getValue();
  }
}
