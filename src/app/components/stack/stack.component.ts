import {Component, OnInit} from '@angular/core';
import {DeckService} from '../../services/deck.service';
import {Cart} from '../../models/cart';

@Component({
  selector: 'app-stack',
  imports: [],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.css'
})
export class StackComponent implements OnInit{
  stackCards: Cart[] = [];

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    this.deckService.getStackZone().subscribe(cards => {
      this.stackCards = cards;
    });
  }

  moveTopStackCardToBattlefield() {
    if (this.stackCards.length > 0) {
      const topCard = this.stackCards[this.stackCards.length - 1];

      // Quitar de la pila
      this.stackCards.pop();

      // Mover al campo de batalla (ajusta el método si usas otro nombre)
      this.deckService.moveCardToZone(topCard, topCard.zone, 'battlefield', 1);
    }
  }

}
