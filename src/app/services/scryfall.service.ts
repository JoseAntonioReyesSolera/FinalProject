import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Cart} from '../models/cart';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScryfallService {

  baseUrl;

    constructor(private http: HttpClient) {
    this.baseUrl = 'https://api.scryfall.com/cards/named';
    }

  getCardByName(cartName: string): Observable<Cart> {
    const url = `${this.baseUrl}?exact=${cartName}`;
    return this.http.get<Cart>(url);
  }

}
