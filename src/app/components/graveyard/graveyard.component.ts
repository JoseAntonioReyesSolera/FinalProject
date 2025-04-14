import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';
import {FormsModule} from '@angular/forms';
import {ZoneViewerComponent} from '../zone-viewer/zone-viewer.component';

declare const bootstrap: any; // para que reconozca los modales de Bootstrap 5

@Component({
  selector: 'app-graveyard',
  templateUrl: './graveyard.component.html',
  styleUrls: ['./graveyard.component.css'],
  imports: [
    FormsModule,
    ZoneViewerComponent
  ]
})
export class GraveyardComponent implements OnInit {
  graveyardCards: Cart[] = [];
  exileCards: Cart[] = [];
  isExile: boolean = false;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit(): void {
    this.deckService.getGraveyardZone().subscribe(graveyard => {
      this.graveyardCards = graveyard;
    });

    this.deckService.getExileZone().subscribe(exile => {
      this.exileCards = exile;
    });
  }

  openModal() {
    const modal = new bootstrap.Modal(document.getElementById('graveyardModal'));
    modal.show();
  }

  showMainDeck() {
    this.isExile = false;
  }

  showSideboard() {
    this.isExile = true;
  }
}
