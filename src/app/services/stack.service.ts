import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {StackItem} from '../models/stack-item';
import {Cart} from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class StackService {
  private readonly stackZone: StackItem[] = [];
  private readonly stackSubject = new BehaviorSubject<StackItem[]>([]);

  private _spellsCastThisTurn = 0;
  private _splitSecondActive = false;

  getStackObservable() {
    return this.stackSubject.asObservable();
  }

  getCurrentStackSnapshot(): StackItem[] {
    return [...this.stackZone];
  }

  isSplitSecondActive(): boolean {
    return this._splitSecondActive;
  }

  getSpellsCastThisTurn(): number {
    return this._spellsCastThisTurn;
  }

  pushToStack(item: StackItem) {
    this.stackZone.push(item);
    this.stackSubject.next([...this.stackZone]);
  }

  resolveTopStackCard(): StackItem | undefined {
    this._splitSecondActive = false;
    const topItem = this.stackZone.pop();
    this.stackSubject.next([...this.stackZone]);
    return topItem;
  }

  setStackFromSnapshot(stack: StackItem[]): void {
    this.stackZone.splice(0, this.stackZone.length, ...stack);
    this.stackSubject.next([...stack]);
  }

  castSpell(spell: StackItem) {
    const sourceCard = spell.source as Cart;

    // Aplica Storm si corresponde
    if (sourceCard.keywords?.includes('Storm')) {
      const copies = this._spellsCastThisTurn;
      for (let i = 0; i < copies; i++) {
        const copy: StackItem = {
          ...spell,
          efecto: `${spell.description} (Storm copy ${i + 1})`,
          source: { ...sourceCard }, // puede marcarse como copia si quieres
          type: 'TriggeredAbility'
        };
        this.stackZone.push(copy);
      }
    }

    // Aplica Split second si corresponde
    if (sourceCard.keywords?.includes('Split second')) {
      this._splitSecondActive = true;
    }

    this._spellsCastThisTurn++; // cuenta el hechizo
    this.stackZone.push(spell);
    this.stackSubject.next([...this.stackZone]);
  }

  startNewTurn() {
    this._spellsCastThisTurn = 0;
  }
}
