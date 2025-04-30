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
      return; // No hay otra cara que mostrar
    }

    this.isFrontFaceShown = !this.isFrontFaceShown;

    const faceIndex = this.isFrontFaceShown ? 0 : 1;
    const currentFace = this.card.card_faces[faceIndex];

    // Reemplazamos las propiedades visibles por las de la cara actual
    this.card.image_uris = currentFace.image_uris;
    this.card.name = currentFace.name;
    this.card.type_line = currentFace.type_line;
    this.card.oracle_text = currentFace.oracle_text;
  }
}
