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
import {v4 as uuidv4} from 'uuid';
import {LogService} from '../../services/log.service';
import {GameState} from '../../models/game-state';
import {GameStorageService} from '../../services/game-storage.service';
import {StackService} from '../../services/stack.service';
import {FormsModule} from '@angular/forms';

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
    FormsModule,
  ],
  templateUrl: './battlefield.component.html',
  styleUrl: './battlefield.component.css'
})
export class BattlefieldComponent implements OnInit {
  totalDeckCards: number = 0;
  hasCommander: boolean = false;

  creaturesRow = new BehaviorSubject<Permanent[]>([]);
  allRow = new BehaviorSubject<Permanent[]>([]);
  landsRow = new BehaviorSubject<Permanent[]>([]);

  contextMenuVisible = false;
  selectedCardForDetails: Cart | null = null;
  modalVisible = false;
  allCards: Cart[] = [];
  saveName: string = "";

  savedGames: { id: string; date: string }[] = [];
  selectedSaveId: string | null = null;

  constructor(private readonly deckService: DeckService, private readonly bf: BattlefieldService, private readonly stack: StackService, private readonly log: LogService, private readonly game: GameStorageService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.allCards = cards;
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
    });

    this.deckService.getCommanderZone().subscribe(cards => {
      this.hasCommander = cards.some(card => card.isCommander);
    });

    this.refreshSavedGames();

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
        this.deckService.moveCardToZone(event.card.originalCard, 'graveyard', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'backToHand':
        this.deckService.moveCardToZone(event.card.originalCard, 'hand', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'commander':
        this.deckService.moveCardToZone(event.card.originalCard, 'command', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
      case 'exile':
        this.deckService.moveCardToZone(event.card.originalCard, 'exile', 1);
        this.bf.removePermanent(event.card.instanceId);
        break;
    }
  }

  selectSavedGame(game: { id: string; date: string }) {
    this.selectedSaveId = game.id;
    this.saveName = game.id;
  }

  saveGame() {
    const allCards = [
      ...this.deckService.getDeckCardsMain(),
      ...this.deckService.getDeckCardsSideboard(),
      ...this.deckService.getHandZoneSnapshot(),
      ...this.deckService.getExileZoneSnapshot(),
      ...this.deckService.getGraveyardZoneSnapshot(),
      ...this.deckService.getCommanderZoneSnapshot(),
    ];

    const gameState: GameState = {
      id: this.saveName?.trim() || uuidv4(),
      date: new Date().toISOString(),
      cards: allCards,
      battlefield: this.bf.getPermanentsSnapshot(),
      stack: this.stack.getCurrentStackSnapshot(),
      log: this.log.getCurrentLogSnapshot(),
    };

    this.game.saveGame(gameState);
    this.saveName = '';
    this.selectedSaveId = null;
    this.refreshSavedGames();
  }

  loadSelectedGame() {
    if (!this.selectedSaveId) return;

    const loaded = this.game.loadGame(this.selectedSaveId);
    if (!loaded) return;

    const grouped = {
      hand: [] as Cart[],
      sideboard: [] as Cart[],
      graveyard: [] as Cart[],
      exile: [] as Cart[],
      command: [] as Cart[],
      library: [] as Cart[],
    };

    for (const card of loaded.cards) {
      if (grouped[card.zone as keyof typeof grouped]) {
        grouped[card.zone as keyof typeof grouped].push(card);
      }
    }

    const enrich = (arr: Cart[]) => arr.map(c => this.game.enrichCard(c));

    const enrichedState = {
      deck: enrich(grouped.library),
      hand: enrich(grouped.hand),
      graveyard: enrich(grouped.graveyard),
      exile: enrich(grouped.exile),
      commander: enrich(grouped.command),
      sideboard: enrich(grouped.sideboard),
    };


    this.deckService.setFullGameState({
      deck: enrichedState.deck,
      hand: enrichedState.hand,
      graveyard: enrichedState.graveyard,
      exile: enrichedState.exile,
      commander: enrichedState.commander,
      sideboard: enrichedState.sideboard,
    });

    this.bf.setPermanentsFromSnapshot(loaded.battlefield);
    this.stack.setStackFromSnapshot(loaded.stack);
    this.log.setLogSnapshot(loaded.log);

    this.selectedSaveId = null;
    this.saveName = '';
  }

  deleteGame(id: string) {
    this.game.deleteGame(id);
    this.refreshSavedGames();
  }

  refreshSavedGames() {
    this.savedGames = this.game.listGameSummaries();
  }

}
