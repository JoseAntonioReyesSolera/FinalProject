import {Component, OnInit} from '@angular/core';
import {DeckProcessorComponent} from "../deck-processor/deck-processor.component";
import {LibraryComponent} from '../library/library.component';
import {StackComponent} from '../stack/stack.component';
import {GraveyardComponent} from '../graveyard/graveyard.component';
import {CommanderComponent} from '../commander/commander.component';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-battlefield',
  imports: [
    DeckProcessorComponent,
    LibraryComponent,
    StackComponent,
    GraveyardComponent,
    CommanderComponent
  ],
  templateUrl: './battlefield.component.html',
  styleUrl: './battlefield.component.css'
})
export class BattlefieldComponent implements OnInit {
  totalDeckCards: number = 0;
  originalDeckCards: number = 0;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    });

    this.deckService.getOriginalDeckCards().subscribe(cards => {
      this.originalDeckCards = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    });
  }
}
