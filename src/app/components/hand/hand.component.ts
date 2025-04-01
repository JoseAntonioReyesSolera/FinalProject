import { Component } from '@angular/core';
import { ScryfallService } from '../../services/scryfall.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-hand',
  imports: [
    FormsModule
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent {
  cardName: string = '';
  cardImage: string | undefined;

  constructor(private scryfallService: ScryfallService) {}

  searchCard() {
    this.scryfallService.getCardByName(this.cardName).subscribe({
      next: (card) => {
        this.cardImage = card.image_uris?.normal;
      },
      error: (err) => {
        console.error('Error fetching card', err);
        this.cardImage = undefined;
      },
    });
  }
}
