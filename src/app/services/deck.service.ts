import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCardsSubject = new BehaviorSubject<Cart[]>([]);

  setDeckCards(deckCards: Cart[]) {
    this.deckCardsSubject.next(deckCards);
  }

  getDeckCards() {
    return this.deckCardsSubject.asObservable();
  }
  constructor() { }
}
