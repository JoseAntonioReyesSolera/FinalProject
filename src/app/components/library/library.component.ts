import {Component, OnInit} from '@angular/core';
import {DeckService} from '../../services/deck.service';
import {Cart} from '../../models/cart';
import * as bootstrap from 'bootstrap';
import {FormsModule} from '@angular/forms';
import {ZoneViewerComponent} from '../zone-viewer/zone-viewer.component';

@Component({
  selector: 'app-library',
  imports: [
    FormsModule,
    ZoneViewerComponent
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent implements OnInit{
  public totalDeckCards: number = 0;
  public deckCards: Cart[] = [];
  public sideboardCards: Cart[] = [];
  public showContextMenu = false;
  public contextMenuPosition = { x: 0, y: 0 };
  isSideboard: boolean = false;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.deckCards = cards;
      if (!this.isSideboard) {
        this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
      }
    });

    this.deckService.getSideboardZone().subscribe(sideboard => {
      this.sideboardCards = sideboard;
      if (this.isSideboard) {
        this.totalDeckCards = sideboard.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
      }
    });
  }

  onRightClick(event: MouseEvent) {
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showContextMenu = true;
    const modalElement = document.getElementById('cardListModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  showMainDeck() {
    this.isSideboard = false;
  }

  showSideboard() {
    this.isSideboard = true;
  }
}
