import { Component } from '@angular/core';
import { ScryfallService } from '../../services/scryfall.service';
import {FormsModule} from '@angular/forms';
import {Cart} from '../../models/cart';

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
  card: Cart | undefined;

  constructor(private scryfallService: ScryfallService) {}

  searchCard() {
    this.scryfallService.getCardByName(this.cardName).subscribe({
      next: (card) => {
        // Asignamos todos los valores al modelo Cart
        this.card = {
          id: card.id,
          name: card.name,
          image_uris: card.image_uris, // Se pueden acceder a normal, art_crop, etc.
          oracle_text: card.oracle_text,
          type_line: card.type_line,
          mana_cost: card.mana_cost,
          cmc: card.cmc,
          power: card.power,
          toughness: card.toughness,
          keywords: card.keywords,
          produced_mana: card.produced_mana
        };
      },
      error: (err) => {
        console.error('Error fetching card', err);
        this.card = undefined; // Si ocurre un error, no se muestra la carta.
      },
    });
  }
}
