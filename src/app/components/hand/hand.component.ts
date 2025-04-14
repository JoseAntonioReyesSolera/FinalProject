import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-hand',
  imports: [
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent implements OnInit {
  handCards: Cart[] = [];

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    // Suscripción para recibir cambios en la zona de la mano
    this.deckService.getHandZone().subscribe(hand => {
      this.handCards = hand;
    });
  }

}
