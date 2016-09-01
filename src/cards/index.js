import Card from './card'
import meta from './cards-config.json'
import EventEmitter from '../core/eventemitter'

const Marks = {
  RED: 'red',
  GREEN: 'green'
}

let deck = [];

export default {
  build (playersNum) {
    let starterPack = [new Card(meta[0]), new Card(meta[1]), new Card(meta[2]), new Card(meta[3])];

    starterPack = starterPack.map(card => {
      card.mark = Marks.RED;
      return card;
    });

    let deck = [new Card(meta[0]), new Card(meta[1])];
    let cup = new Card(meta[0]);
    let key = new Card(meta[1]);

    key.mark = Marks.GREEN;
    cup.mark = Marks.GREEN;

    let greens = [key, cup];

    let specials = meta.slice(4).map(item => {
      let card = new Card(item);
      card.special = true;
      return card;
    });

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
  }
}
