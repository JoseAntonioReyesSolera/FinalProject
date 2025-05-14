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
  lastGraveImage: string = 'images/exile.png';

  constructor(private readonly deckService: DeckService) {}

  ngOnInit(): void {
    this.deckService.getZoneObservable('graveyard').subscribe(graveyard => {
      this.graveyardCards = graveyard;
      if (graveyard.length === 0) {
        // Si el cementerio está vacío, la imagen vuelve a la por defecto
        this.lastGraveImage = 'images/exile.png';
      } else {
        const lastCard = graveyard[graveyard.length - 1];
        if (lastCard.card_faces && !lastCard.isSingleImageDoubleFace) {
          // Si la carta tiene doble cara, selecciona la cara correspondiente
          this.lastGraveImage = lastCard.card_faces[lastCard.currentFaceIndex]?.image_uris?.normal ?? 'images/exile.png';
        } else {
          // Si es una carta normal, se asigna la imagen
          this.lastGraveImage = lastCard.image_uris?.normal ?? 'images/exile.png';
        }
      }
    });

    this.deckService.getZoneObservable('exile').subscribe(exile => {
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
