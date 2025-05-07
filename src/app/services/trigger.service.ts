// services/trigger.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StackItem } from '../models/stack-item';

@Injectable({
  providedIn: 'root'
})
export class TriggerService {
  private stack: StackItem[] = [];
  private stackSubject = new BehaviorSubject<StackItem[]>([]);

  getStackObservable() {
    return this.stackSubject.asObservable();
  }

  getCurrentStack(): StackItem[] {
    return [...this.stack];
  }

  addStackItem(item: StackItem) {
    this.stack.push(item);
    this.stackSubject.next([...this.stack]);
  }

  resolveTop(): StackItem | undefined {
    const resolved = this.stack.pop();
    this.stackSubject.next([...this.stack]);
    return resolved;
  }

  clearStack() {
    this.stack = [];
    this.stackSubject.next([]);
  }
}
