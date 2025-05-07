import {Component, OnInit} from '@angular/core';
import {StackService} from '../../services/stack.service';
import {DeckService} from '../../services/deck.service';
import {StackItem} from '../../models/stack-item';
import {Cart} from '../../models/cart';
import {Permanent} from '../../models/permanent';

@Component({
  selector: 'app-stack',
  imports: [],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.css'
})
export class StackComponent implements OnInit{
  stackCards: StackItem[] = [];

  constructor(private readonly stackService: StackService, private readonly deckService: DeckService) {}

  ngOnInit() {
    this.stackService.getStackObservable().subscribe(cards => {
      this.stackCards = cards;
    });
  }

  moveTopStackCardToBattlefield() {
    this.deckService.resolveTopStackCard(true);
  }

  moveTopStackCardToGraveyard() {
    this.deckService.resolveTopStackCard(false);
  }

  isCart(source: any): source is Cart {
    return 'type_line' in source;
  }

  isPermanent(source: any): source is Permanent {
    return 'originalCard' in source;
  }
}
