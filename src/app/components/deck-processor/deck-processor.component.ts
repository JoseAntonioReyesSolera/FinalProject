import {Component} from '@angular/core';
import {Cart} from '../../models/cart';
import {ScryfallService} from '../../services/scryfall.service';
import {DeckService} from '../../services/deck.service';
import {forkJoin} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {GameStorageService} from '../../services/game-storage.service';

@Component({
  selector: 'app-deck-processor',
  imports: [FormsModule],
  templateUrl: './deck-processor.component.html',
  styleUrl: './deck-processor.component.css'
})
export class DeckProcessorComponent {
  deckInput: string = '';
  deckMainList: { name: string, quantity: number }[] = [];
  deckSideboardList: { name: string, quantity: number }[] = [];
  deckCards: Cart[] = [];
  loadError: string | null = null;

  constructor(
              private readonly scryfallService: ScryfallService,
              private readonly deckService: DeckService,
              private readonly gameService: GameStorageService,
    ) {}

  processDeckInput() {
    const [mainPart, sidePart] = this.deckInput.split(/^\s*SIDEBOARD:\s*$/m);

    // Procesar el mazo principal
    this.deckMainList = mainPart
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const match = /^(\d+)\s+(.+)$/.exec(line);
        return match ? { quantity: parseInt(match[1], 10), name: match[2] } : { quantity: 1, name: line };
      });

    // Si hay banquillo, lo añadimos también a deckList con una marca para luego separarlo
    if (sidePart) {
      this.deckSideboardList = sidePart
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const match = /^(\d+)\s+(.+)$/.exec(line);
          return match ? { quantity: parseInt(match[1], 10), name: match[2] } : { quantity: 1, name: line };
        });
    } else {
      this.deckSideboardList = [];
    }
    this.loadDeck();
  }

  loadDeck() {
    this.loadError = null;
    const cardMapMain: { [name: string]: number } = {};
    this.deckMainList.forEach(card => {
      const name = card.name.trim().toLowerCase();
      cardMapMain[name] = (cardMapMain[name] || 0) + card.quantity;
    });

    const unifiedMainList = Object.entries(cardMapMain).map(([name, quantity]) => ({ name, quantity }));
    const mainRequests = unifiedMainList.map(card => this.scryfallService.getCardByName(card.name.replace(/\s*\(.*$/, '').trim()));

    const sideRequests = this.deckSideboardList.map(card => this.scryfallService.getCardByName(card.name.replace(/\s*\(.*$/, '').trim()));

    forkJoin([...mainRequests, ...sideRequests]).subscribe({
      next: cards => {
        const allCards: Cart[] = cards.map((card, index) => {
          const isSide = index >= unifiedMainList.length;
          const quantity = isSide
            ? this.deckSideboardList[index - unifiedMainList.length].quantity
            : unifiedMainList[index].quantity;

          // Enriquecemos cada carta, sin llamar a toggleCardFace aquí
          return this.gameService.enrichCard({
            instanceId: `${card.id}-${crypto.randomUUID?.() ?? Math.random().toString(36).substring(2)}`,
            ...card,
            quantity,
            zone: isSide ? 'sideboard' : 'library',
            isCommander: false,
          });
        });

        // Separa otra vez main y side según la longitud original
        const mainDeck = allCards.slice(0, unifiedMainList.length);
        const sideboard = allCards.slice(unifiedMainList.length);

        // Guarda en el servicio
        this.deckCards = mainDeck;
        this.deckService.setDeckCards(mainDeck, sideboard);
      },
      error: (err) => {
        console.error('Error al cargar el mazo:', err);
        this.loadError = 'Hubo un problema al cargar una o más cartas. Verifica que los nombres estén correctos. ' + err.error.details;
      }
    });
  }
}
