import Card from './card'
import * as cardsConfig from './cards-config.js'
import EventEmitter from '../core/eventemitter'
import shuffle from 'knuth-shuffle-seeded'

const Marks = {
  RED: 'red',
  GREEN: 'green'
}

let deck = [];

export default {
  build (playersNum) {
    let starterPack = [new Card(cardsConfig.cup), new Card(cardsConfig.key), new Card(cardsConfig.bagcup), new Card(cardsConfig.bagkey)];

    starterPack = starterPack.map(card => {
      card.mark = Marks.RED;
      return card;
    });

    let deck = [new Card(cardsConfig.cup), new Card(cardsConfig.key)];
    let cup = new Card(cardsConfig.cup);
    let key = new Card(cardsConfig.key);

    key.mark = Marks.GREEN;
    cup.mark = Marks.GREEN;

    let greens = [key, cup];

    let specials = [];

    let excludeList = ['cup', 'key', 'bagcup', 'bagkey'];
    for (let [token, cardMeta] of Object.entries(cardsConfig)) {
      if (excludeList.find(x => token === x)) continue;

      specials.push(new Card(cardMeta));
    }

    let rest = [...deck, ...specials];

    return [starterPack, greens, rest];
  },
  em: EventEmitter.getInstance(),
  length: 0,
  fromSnapshot (initialDeck, snapshot) {
    initialDeck = initialDeck.filter(card => snapshot.hasOwnProperty(card.uid));

    deck = initialDeck.sort((a, b) => snapshot[a.uid] < snapshot[b.uid] ? -1 : 1);
    this.length = deck.length;
  },
  draw () {
    if (this.length === 0) return false;

    let card = deck.shift();
    this.length = deck.length;
    if (this.length === 0) this.em.emit('gm.deck.empty');
    return card;
  },
  getUnique () {
    let cards = [];
    for (let [token, cardMeta] of Object.entries(cardsConfig)) {
      if (cards.find(card => card.token === token) === undefined) {
        cards.push(new Card(cardMeta));
      }
    }

    return cards;
  },
  getDeck () {
    return deck;
  },
  updateDeck (rawDeck) {
    deck = rawDeck;
    this.length = rawDeck.length;
  },
  shuffle (seed) {
    shuffle(deck, seed);
    return deck;
  }
}
