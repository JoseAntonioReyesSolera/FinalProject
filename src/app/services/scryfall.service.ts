import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Cart} from '../models/cart';
import {delay, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScryfallService {

  baseUrl;

    constructor(private readonly http: HttpClient) {
    this.baseUrl = 'https://api.scryfall.com/cards/named';
    }

  getCardByName(cartName: string): Observable<Cart> {
      delay(100);
    const url = `${this.baseUrl}?exact=${cartName}`;
    return this.http.get<Cart>(url);
  }

}
