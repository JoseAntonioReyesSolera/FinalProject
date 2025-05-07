import {Component, OnInit} from '@angular/core';
import {DeckProcessorComponent} from "../deck-processor/deck-processor.component";
import {LibraryComponent} from '../library/library.component';
import {StackComponent} from '../stack/stack.component';
import {GraveyardComponent} from '../graveyard/graveyard.component';
import {CommanderComponent} from '../commander/commander.component';
import {DeckService} from '../../services/deck.service';
import {BattlefieldService} from '../../services/battlefield.service';
import {BehaviorSubject } from 'rxjs';
import {Permanent} from '../../models/permanent';
import {AsyncPipe} from '@angular/common';
import {PermanentCardComponent} from '../permanent-card/permanent-card.component';
import {CardDetailComponent} from '../card-detail/card-detail.component';
import {Cart} from '../../models/cart';

@Component({
  selector: 'app-battlefield',
  imports: [
    DeckProcessorComponent,
    LibraryComponent,
    StackComponent,
    GraveyardComponent,
    CommanderComponent,
    AsyncPipe,
    PermanentCardComponent,
    CardDetailComponent,
  ],
  templateUrl: './battlefield.component.html',
  styleUrl: './battlefield.component.css'
})
export class BattlefieldComponent implements OnInit {
  totalDeckCards: number = 0;
  originalDeckCards: number = 0;

  creaturesRow = new BehaviorSubject<Permanent[]>([]);
  allRow = new BehaviorSubject<Permanent[]>([]);
  landsRow = new BehaviorSubject<Permanent[]>([]);

  contextMenuVisible = false;
  selectedCardForDetails: Cart | null = null;
  modalVisible = false;
  allCards: Cart[] = [];

  constructor(private readonly deckService: DeckService, private readonly bf: BattlefieldService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.allCards = cards;
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
    });

    this.deckService.getOriginalDeckCards().subscribe(cards => {
      this.originalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
    });

    this.bf.permanents$.subscribe(perms => {
      const usedIds = new Set<string>();
      const creatures: Permanent[] = [];
      const all: Permanent[] = [];
      const lands: Permanent[] = [];

      for (const p of perms) {
        if (usedIds.has(p.instanceId)) continue;

        usedIds.add(p.instanceId);

        if (p.type.includes('Land')) lands.push(p);
        else if (p.type.includes('Creature') || p.type.includes('Battle')) creatures.push(p);
        else if (p.type.includes('Artifact') || p.type.includes('Enchantment') || p.type.includes('Planeswalker')) all.push(p);
      }
      this.creaturesRow.next(creatures);
      this.allRow.next(all);
      this.landsRow.next(lands);
    });
  }

  trackByInstance(index: number, perm: Permanent) {
    return perm.instanceId;
  }

  handleCardAction(event: { action: string; card: Permanent }) {
    switch (event.action) {
      case 'cast':
        // Agregar a la pila
        console.log('Lanzar hechizo:', event.card.name);
        break;
      case 'details': {
        this.contextMenuVisible = false;
        const foundCard = event.card.originalCard;
        if (foundCard) {
          this.selectedCardForDetails = foundCard;
          this.modalVisible = true;
        }
        break;
      }
      case 'destroy':
        this.deckService.moveCardToZone(event.card.originalCard, 'battlefield', 'graveyard', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'backToHand':
        this.deckService.moveCardToZone(event.card.originalCard, 'battlefield', 'hand', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'commander':
        this.deckService.moveCardToZone(event.card.originalCard, 'battlefield', 'command', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'exile':
        this.deckService.moveCardToZone(event.card.originalCard, 'battlefield', 'exile', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
    }
  }
}
