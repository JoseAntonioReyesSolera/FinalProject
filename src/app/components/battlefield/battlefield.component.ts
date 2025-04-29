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

  creaturesRow = new BehaviorSubject<Permanent[]>([]);
  allRow = new BehaviorSubject<Permanent[]>([]);
  landsRow = new BehaviorSubject<Permanent[]>([]);


  constructor(private readonly deckService: DeckService, private readonly bf: BattlefieldService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
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
        if (p.type.includes('Land') && !usedIds.has(p.instanceId)) {
          lands.push(p);
          usedIds.add(p.instanceId);
          continue;
        }

        if ((p.type.includes('Creature') || p.type.includes('Battle')) && !usedIds.has(p.instanceId)) {
          creatures.push(p);
          usedIds.add(p.instanceId);
          continue;
        }

        if ((p.type.includes('Artifact') || p.type.includes('Enchantment') || p.type.includes('Planeswalker')) && !usedIds.has(p.instanceId)) {
          all.push(p);
          usedIds.add(p.instanceId);
        }
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
      case 'details':
        // Mostrar modal o detalles
        console.log('Detalles de carta:', event.card);
        break;
      case 'exile':
        console.log('Carta Exiliada:', event.card);
        break;
    }
  }
}
