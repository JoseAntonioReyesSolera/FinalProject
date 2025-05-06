import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {StackService} from '../../services/stack.service';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-stack',
  imports: [],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.css'
})
export class StackComponent implements OnInit{
  stackCards: Cart[] = [];

  constructor(private readonly stackService: StackService, private readonly deckService: DeckService) {}

  ngOnInit() {
    this.stackService.getStackObservable().subscribe(cards => {
      this.stackCards = cards;
    });
  }

  moveTopStackCardToBattlefield() {
    this.deckService.resolveTopStackCard();
  }

}
