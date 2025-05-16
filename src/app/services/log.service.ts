import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly logSubject = new BehaviorSubject<string[]>([]);

  getLogs() {
    return this.logSubject.asObservable();
  }

  addLog(message: any, ...optionalParams: any[]): void {
    const currentLogs = this.logSubject.getValue();
    const timestamp = new Date().toLocaleTimeString();
    this.logSubject.next([...currentLogs, `[${timestamp}] ${message} ${optionalParams}`]);
  }

  clearLogs() {
    this.logSubject.next([]);
  }

  getCurrentLogSnapshot(): string[] {
    return this.logSubject.getValue();
  }

  setLogSnapshot(logs: string[]): void {
    this.logSubject.next([...logs]);
  }
}
