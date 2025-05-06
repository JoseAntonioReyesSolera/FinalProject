import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class StackService {
  private readonly stackZone: Cart[] = [];
  private readonly stackSubject = new BehaviorSubject<Cart[]>([]);

  getStackObservable() {
    return this.stackSubject.asObservable();
  }

  getStack(): Cart[] {
    return [...this.stackZone];
  }

  pushToStack(card: Cart) {
    this.stackZone.push(card);
    this.stackSubject.next([...this.stackZone]);
    console.log('Añadido a la pila:', card.name);
  }

  resolveTopStackCard(): Cart | undefined {
    const topCard = this.stackZone.pop();
    this.stackSubject.next([...this.stackZone]);
    if (topCard) console.log('Resuelto de la pila:', topCard.name);
    return topCard;
  }

}
