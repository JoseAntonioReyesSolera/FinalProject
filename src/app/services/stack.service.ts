import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {StackItem} from '../models/stack-item';

@Injectable({
  providedIn: 'root'
})
export class StackService {

  private readonly stackZone: StackItem[] = [];
  private readonly stackSubject = new BehaviorSubject<StackItem[]>([]);

  getStackObservable() {
    return this.stackSubject.asObservable();
  }

  getCurrentStackSnapshot(): StackItem[] {
    return [...this.stackZone];
  }

  pushToStack(item: StackItem) {
    this.stackZone.push(item);
    this.stackSubject.next([...this.stackZone]);
  }

  resolveTopStackCard(): StackItem | undefined {
    const topItem = this.stackZone.pop();
    this.stackSubject.next([...this.stackZone]);
    return topItem;
  }

  setStackFromSnapshot(stack: StackItem[]): void {
    this.stackZone.splice(0, this.stackZone.length, ...stack);
    this.stackSubject.next([...stack]);
  }

}
