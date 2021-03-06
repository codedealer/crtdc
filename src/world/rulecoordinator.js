import deck from '../cards'
import shuffle from 'knuth-shuffle-seeded'
import settings from './settings'
import {brotherhood, order} from '../cards/allegiance'
import * as occupations from '../cards/occupations'
import characters from '../cards/characters.json'
import Player from '../player'
import Status from '../player/status'
import turncoordinator from '../turn/turncoordinator'

const CARDS_MIN_DEAL = 2;

const SPECIAL_CHARACTERS = {
  '-KVkOcIZlsB5_aCp4u6V': 9,
  '-KObgzBKVzAJr3xvhSGv': 10,
  '-KSwbALEpaWK9WZJka3D': 12,
  '-KOcCE1tjuhdd5aORH5E': 11,
  '-KVpiFdsesHmo_1LVDA_': 13
}

let handLimits = {
  3: 8,
  4: 6,
  5: 5,
  6: 5,
  7: 5,
  8: 5
}

export default {
  deck,
  occupationPool: [],
  tokens: 0,
  canGiveToken () { return this.tokens > 0 },
  playersNum: 0,
  init (seed, players, serverExtensions = {}) {
    this.playersNum = players.length;
    //sort order from server is undetermined
    //so we sort it first for consistency
    players.sort((a, b) => a.uid > b.uid ? 1 : -1);
    //get turn order
    shuffle(players, seed);

    let allegianceDeck = this.dealAllegianceDeck(seed, players.length);
    let occupationDeck = this.dealOccupationDeck(seed, players.length);
    let characterDeck = this.dealCharacterDeck(seed, players, players.length);

    players = players.map(player => {
      let newPlayer = {};
      let extension = {
        hand: [],
        tokens: 0,
        known: [],
        allegiance: allegianceDeck.shift(),
        occupation: occupationDeck.shift()
      }

      if (player.character) {
        //keep character if possible
        extension.character = player.character;
      } else {
        //if not assign available character
        extension.character = characterDeck.shift();

        //special characters
        if (SPECIAL_CHARACTERS.hasOwnProperty(player.uid) &&
            characters.length > SPECIAL_CHARACTERS[player.uid]) {
          extension.character = characters[SPECIAL_CHARACTERS[player.uid]];
        }
      }

      if (serverExtensions.hasOwnProperty(player.uid)) {
        newPlayer = Object.assign(newPlayer, player, extension, serverExtensions[player.uid]);
      } else {
        newPlayer = Object.assign(newPlayer, player, extension);
      }

      return newPlayer;
    });

    let tokensLeft = settings.START_TOKENS;

    players.forEach(player => { tokensLeft -= player.tokens });

    this.tokens = tokensLeft;

    return players;
  },
  sync (gameObject) {
    //normalization should be in server.js but whatevs
    let playersInGame = [];
    let serverExtensions = {};

    for (let uid of Object.keys(gameObject.profiles)) {
      let character;

      if (gameObject.profiles[uid].character) {
        character = characters.find(x => x.imgClass === gameObject.profiles[uid].character);
      }

      if (character) {
        playersInGame.push(new Player(uid, Status.INGAME, character));
      } else {
        playersInGame.push(new Player(uid, Status.INGAME));
      }

      let token = Object.keys(gameObject.occupations[uid]).shift();
      let o = Object.assign({}, occupations[token]);
      o.disclosed = gameObject.occupations[uid][token];

      let se = {
        occupation: o,
        tokens: gameObject.profiles[uid].tokens
      }

      serverExtensions[uid] = se;
    }

    let result = this.init(gameObject.seed, playersInGame, serverExtensions);

    let serverOccupationPool = [];
    for (let token of Object.keys(gameObject.occupationPool)) {
      serverOccupationPool.push(token);
    }

    this.occupationPool = serverOccupationPool.map(token => {
      return occupations[token];
    });

    return result;
  },
  checkHandLimit (players) {
    // all good -> false
    // limit exceeded -> player violated
    if (!handLimits.hasOwnProperty(this.playersNum)) return false;

    let result = false;
    let lim = handLimits[this.playersNum];
    players.some((x, i) => {
      //only get one
      //can be done recursively if cases aplicable
      if (lim < x.hand.length) {
        result = players[i];
        return true;
      }
    });

    return result;
  },
  getWinCriteria (players, playersToWin, winParty) {
    if (winParty === 'seal') {
      return {
        canUseBag: this.deck.length === 0,
        requiredNum: 3
      }
    }

    let winItemName = order.org === winParty ? order.token : brotherhood.token;
    let canUseBag = this.deck.length === 0;
    let bagName = `bag${winItemName}`;
    let requiredNum;

    if (players.length % 2 === 0) requiredNum = 3;
    else {
      let actualWinnerPartyNum = players.reduce((prev, player) => {
        return player.allegiance.org === winParty ? prev + 1 : prev;
      }, 0);

      requiredNum = actualWinnerPartyNum === Math.floor(players.length / 2) ? 2 : 3;
    }

    return {winItemName, canUseBag, bagName, requiredNum}
  },
  isWin (players, playersToWin, winParty) {
    if (winParty === 'seal') return this._isSealWin(players, playersToWin[0]);

    let {winItemName, canUseBag, bagName, requiredNum} = this.getWinCriteria(players, playersToWin, winParty);

    if (!playersToWin.every(player => player.allegiance.org === winParty)) return false;

    let itemsNum = playersToWin.reduce((prev, player) => {
      return player.hand.reduce((previous, card) => {
        if (card.token === winItemName || (canUseBag && card.token === bagName)) {
          return previous + 1;
        } else return previous;
      }, prev);
    }, 0);

    return itemsNum >= requiredNum;
  },
  _isSealWin (players, caller) {
    let permittedTokens = [order.token, brotherhood.token];
    let canUseBag = this.deck.length === 0;
    let requiredNum = 3;

    if (canUseBag) {
      permittedTokens = [...permittedTokens, ...['bag' + order.token, 'bag' + brotherhood.token]];
    }

    let itemsNum = caller.hand.reduce((prev, card) => {
      if (permittedTokens.some(token => token === card.token)) return prev + 1;

      return prev;
    }, 0);

    return itemsNum >= requiredNum;
  },
  prepDeck (seed, players) {
    let [starterPack, greens, rest] = this.deck.build(players.length);

    if (players.length === settings.PLAYERS_MIN) {
      //pearl is not played with 3 people
      rest = rest.filter(card => card.token !== 'pearl');
    }

    if (players.length === settings.PLAYERS_MAX) {
      starterPack = [...starterPack, ...greens];
    } else {
      rest = [...greens, ...rest];
    }

    let cardsToAdd = players.length === settings.PLAYERS_MIN ? CARDS_MIN_DEAL : players.length - starterPack.length;

    shuffle(rest, seed);

    for (let i = 0; i < cardsToAdd; i++) {
      starterPack.push(rest.shift());
    }

    shuffle(starterPack, seed);

    return { starterPack, rest };
  },
  dealAllegianceDeck (seed, playersNum) {
    seed += 'al';

    let n = Math.ceil(playersNum / 2);

    let br = new Array(n).fill(brotherhood);
    let or = new Array(n).fill(order);
    let deck = [...br, ...or];

    shuffle(deck, seed);

    return deck;
  },
  dealOccupationDeck (seed, playersNum) {
    seed += 'oc';

    let occupationsArr = [];
    for (let occupation of Object.values(occupations)) {
      occupationsArr.push(Object.assign({}, occupation));
    }

    shuffle(occupationsArr, seed);

    this.occupationPool = occupationsArr.slice(playersNum);

    return occupationsArr.slice(0, playersNum);
  },
  dealCharacterDeck (seed, players, playersNum) {
    seed += 'ch';

    let charactersArr = characters.slice(0, 9);

    charactersArr = charactersArr.filter(character => {
      return !players.some(p => {
        if (!p.character) return false;
        return character.name === p.character.name;
      });
    });

    shuffle(charactersArr, seed);

    return charactersArr;
  },
  load (gameObject, players, selfUid, isRestart = false) {
    let initialDeck = this.prepDeck(gameObject.seed, players);

    this.deck.fromSnapshot(initialDeck.rest, gameObject.deck);
    if (isRestart) {
      turncoordinator.reset(gameObject.turn, gameObject.pool, players, selfUid, initialDeck.starterPack);
    } else {
      turncoordinator.init(gameObject.turn, gameObject.pool, players, selfUid, initialDeck.starterPack);
    }
  }
}
