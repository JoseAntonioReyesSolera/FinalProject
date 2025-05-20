import {Component, OnInit} from '@angular/core';
import {StackService} from '../../services/stack.service';
import {DeckService} from '../../services/deck.service';
import {StackItem} from '../../models/stack-item';
import {Cart} from '../../models/cart';
import {Permanent} from '../../models/permanent';
import {TriggerService} from '../../services/trigger.service';

@Component({
  selector: 'app-stack',
  imports: [],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.css'
})
export class StackComponent implements OnInit{
  stackCards: StackItem[] = [];
  tempStack: StackItem[] = [];
  showModal = false;
  fixedCount= 0;

  constructor(private readonly stackService: StackService, private readonly deckService: DeckService,private readonly triggerService: TriggerService) {}

  ngOnInit() {
    this.stackService.getStackObservable().subscribe(cards => {
      this.stackCards = cards;
    });
  }

  moveUp(index: number) {
    if (index <= 0) return;
    [this.tempStack[index], this.tempStack[index - 1]] = [this.tempStack[index - 1], this.tempStack[index]];
  }

  moveDown(index: number) {
    if (index >= this.tempStack.length - 1) return;
    [this.tempStack[index], this.tempStack[index + 1]] = [this.tempStack[index + 1], this.tempStack[index]];
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


  openReorderModal() {
    this.tempStack = this.stackCards.slice(this.fixedCount);
    this.showModal = true;
  }

  confirmReorder() {
    const newOrder = this.tempStack.map(item => this.stackCards.indexOf(item));
    this.triggerService.reorderTriggers(newOrder);
    this.showModal = false;
  }

  closeModal() {
    this.showModal = false;
  }
}
