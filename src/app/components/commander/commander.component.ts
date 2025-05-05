import {Component} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';
import {Observable} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {CardDetailComponent} from '../card-detail/card-detail.component';

@Component({
  selector: 'app-commander',
  imports: [
    AsyncPipe,
    CardDetailComponent
  ],
  templateUrl: './commander.component.html',
  styleUrl: './commander.component.css'
})
export class CommanderComponent{

  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedCard: Cart | null = null;
  selectedCardForDetails: Cart | null = null;
  modalVisible = false;

  constructor(private readonly deckService: DeckService) {}

  getCommanderCards(): Observable<Cart[]> {
   return this.deckService.getCommanderZone();
  }

  onCardClick(event: MouseEvent, card: Cart) {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.selectedCard = card;
    this.contextMenuVisible = true;
  }

  castSpell(card: Cart) {
    this.contextMenuVisible = false;
    console.log('Lanzando hechizo desde comandante:', card.name);
    this.deckService.moveCardToZone(card, 'command', 'stack', 1);
  }

  viewDetails(card: any) {
    this.contextMenuVisible = false;
    this.selectedCardForDetails = card;
    this.modalVisible = true;
  }

  moveToHand(card: Cart) {
    this.contextMenuVisible = false;
    console.log('Moviendo a la mano:', card.name);
    this.deckService.moveCardToZone(card, 'command', 'hand', 1);
  }

  unassignCommander(card: Cart) {
    this.contextMenuVisible = false;
    console.log('Desmarcar como comandante:', card.name);
    this.deckService.setCommander(card);
  }
}
