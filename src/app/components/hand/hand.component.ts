import { Component } from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-hand',
  imports: [
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent {
  deckCards: Cart[] = [];

  constructor(private readonly deckService: DeckService) {
    this.deckService.getDeckCards().subscribe(cards => {
      this.deckCards = cards;
    });
  }
}
