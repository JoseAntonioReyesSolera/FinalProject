import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Cart} from '../../models/cart';

@Component({
  selector: 'app-card-detail',
  imports: [],
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.css'
})
export class CardDetailComponent implements OnChanges{
  @Input() card!: Cart;
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  isFrontFaceShown = true;

  close() {
    this.closed.emit();
  }
  ngOnChanges() {
    if (this.visible && this.card) {
      // mostrar detalle
    }
  }

  toggleCardFace() {
    if (!this.card.card_faces || this.card.card_faces.length < 2) {
      return;
    }

    this.isFrontFaceShown = !this.isFrontFaceShown;
  }

  get activeFace() {
    if (this.card?.card_faces?.length > 1) {
      return this.isFrontFaceShown ? this.card.card_faces[0] : this.card.card_faces[1];
    }
    return this.card;
  }
}
