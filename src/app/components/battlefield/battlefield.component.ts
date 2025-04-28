import {Component, OnInit} from '@angular/core';
import {DeckProcessorComponent} from "../deck-processor/deck-processor.component";
import {LibraryComponent} from '../library/library.component';
import {StackComponent} from '../stack/stack.component';
import {GraveyardComponent} from '../graveyard/graveyard.component';
import {CommanderComponent} from '../commander/commander.component';
import {DeckService} from '../../services/deck.service';
import {BattlefieldService} from '../../services/battlefield.service';
import {Observable} from 'rxjs';
import {Permanent} from '../../models/permanent';
import {AsyncPipe} from '@angular/common';
import {PermanentCardComponent} from '../permanent-card/permanent-card.component';

@Component({
  selector: 'app-battlefield',
  imports: [
    DeckProcessorComponent,
    LibraryComponent,
    StackComponent,
    GraveyardComponent,
    CommanderComponent,
    AsyncPipe,
    PermanentCardComponent
  ],
  templateUrl: './battlefield.component.html',
  styleUrl: './battlefield.component.css'
})
export class BattlefieldComponent implements OnInit {
  totalDeckCards: number = 0;
  originalDeckCards: number = 0;

  permanents: Observable<Permanent[]> | undefined;

  constructor(private readonly deckService: DeckService, private readonly bf: BattlefieldService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
    });
    this.deckService.getOriginalDeckCards().subscribe(cards => {
      this.originalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
    });

    this.permanents = this.bf.permanents$;
  }

  trackByInstance(index: number, perm: Permanent) {
    return perm.instanceId;
  }

  tapPermanent(event: { instanceId: string; tapped: boolean }) {
    // ... tu lógica para tap/untap
  }

  destroyPermanent(instanceId: string) {
    this.bf.removePermanent(instanceId);
  }
}
