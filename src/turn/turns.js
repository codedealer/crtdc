import {ModalOK, ModalYesNo} from '../modal'
import {objectify} from '../core/utils'
//this = turncoordinator

export function vote (newPoolObject, subject, criteria, cArgs = []) {
  let consensusCriteria = {
    all (voted, poolSize) { return voted.length === poolSize },
    some (voted, poolSize, cArgs) {
      let voices = 0;
      cArgs.forEach(voterUid => {
        if (voted.find(x => x === voterUid)) voices += 1;
      });

      return voices === cArgs.length;
    },
    one (voted, poolSize, cArgs) {
      let target = Array.isArray(cArgs) ? cArgs[0] : cArgs;
      return voted.find(x => x === target) !== undefined;
    }
  }

  if (!consensusCriteria.hasOwnProperty(criteria)) throw 'Vote criteria is invalid';

  let voted = [];
  let poolSize = 0;

  for (let [i, poolObject] of Object.entries(this.pool.pool)) {
    poolSize += 1;
    if (poolObject.action === 'vote' &&
        poolObject.args.subject &&
        poolObject.args.subject === subject) voted.push(i);
  }

  return consensusCriteria[criteria](voted, poolSize, cArgs) ? subject : false;
}

export function makeVote (subject, callee = false) {
  return new Promise((resolve, reject) => {
    this.turns.updatePool('vote', callee, { subject }).then(() => resolve(subject));
  });
}

export function callerSelectPlayers (numPlayers, exclude = [], dismissable = false) {
  return new Promise((resolve, reject) => {
    if (!this.isCaller()) return resolve();

    this.em.emit('board.player-selector.init', {numPlayers, exclude, dismissable}, (selectedPlayers) => resolve(selectedPlayers));
  });
}

export function callerSelectCards (numCards) {
  return new Promise((resolve, reject) => {
    if (!this.isCaller()) return resolve();

    this.em.emit('hand.select', {numCards}, (selectedCards) => resolve(selectedCards));
  });
}

export function selectPlayers (numPlayers, exclude = []) {
  return new Promise((resolve, reject) => {
    this.em.emit('board.player-selector.init', {numPlayers, exclude}, (selectedPlayers) => resolve(selectedPlayers));
  });
}

export function selectCards (numCards) {
  return new Promise((resolve, reject) => {
    this.em.emit('hand.select', {numCards}, (selectedCards) => resolve(selectedCards));
  });
}

export function selectBoardCards (cards, options = {}) {
  return new Promise((resolve, reject) => {
    this.em.emit('board.card-selector.init', cards, options, arg => resolve(arg));
  });
}

export function initDuel (duelOptions) {
  return new Promise((resolve, reject) => {
    this.em.emit('board.duel-display.init', duelOptions, (player) => resolve(player));
  });
}

export function resultDuel () {
  return new Promise((resolve, reject) => {
    this.em.emit('duel.result', result => resolve(result));
  });
}

export function* spy () {
  let selectedPlayers = yield this.turns.callerSelectPlayers(1);

  let poolObject;
  if (this.isCaller()) {
    let callee = selectedPlayers[0];
    let peekedCardIndex = callee.hand.length === 1
                        ? 0
                        : Math.floor(Math.random() * callee.hand.length);

    poolObject = yield this.turns.updatePool('spy', callee.uid, { index: peekedCardIndex });
  } else {
    poolObject = yield this.pool.expect();
  }

  if (poolObject.actionObject.callee === poolObject.uid) {
    this.em.emit('turns.action.skip', poolObject.uid);
    return yield Promise.resolve('turn');
  }

  this.em.emit('turn.action.spy', poolObject);

  let callee = this.find(poolObject.actionObject.callee);
  let caller = this.find(poolObject.uid);

  if (this.isCaller()) {
    yield new Promise((resolve, reject) => {
      let calleeCard = callee.hand[poolObject.actionObject.args.index];

      this.em.emit('board.card-selector.init', [calleeCard], {
        dismissable: true,
        selectable: false
      }, () => resolve());
    });

    return yield this.turns.makeVote('turn');
  }

  return yield this.pool.expectAny(this.turns.vote, 'turn', 'one', caller.uid);
}

export function* trade () {
  let [selectedPlayers, selectedCards] = yield Promise.all([this.turns.callerSelectPlayers(1, [this.self]), this.turns.callerSelectCards(1)]);

  let poolObject;
  if (this.isCaller()) {
    let calleeTobe = selectedPlayers[0];
    let cardToTrade = selectedCards[0];

    poolObject = yield this.turns.updatePool('trade', calleeTobe.uid, { card: cardToTrade.uid });
  } else {
    poolObject = yield this.pool.expect();
  }

  this.em.emit('turn.action.trade', poolObject);

  let callee = this.find(poolObject.actionObject.callee);
  let caller = this.find(poolObject.uid);
  let cardToTradeIn = caller.hand.find(x => x.uid === poolObject.actionObject.args.card);

  //respond to trade
  if (callee.uid === this.self.uid) {
    this.em.emit('board.card-selector.init', [cardToTradeIn], {
      dismissable: false,
      selectable: false
    });

    let handSelectOptions = {
      numCards: 1,
      dismissable: cardToTradeIn.negotiable
    }

    if (cardToTradeIn.token === 'bagcup' || cardToTradeIn.token === 'bagkey') {
      handSelectOptions.excludeCriteria = function (card) {
        return !(card.token === 'bagcup' || card.token === 'bagkey');
      }
    }

    let resultHandSelect = yield new Promise((resolve, reject) => {
      this.em.emit('hand.select', handSelectOptions, result => resolve(result));
    });

    if (resultHandSelect === true) resultHandSelect = false; //trade declined
    else resultHandSelect = resultHandSelect[0].uid;

    poolObject = yield this.turns.updatePool('trade_result', caller.uid, {exchange: resultHandSelect, card: cardToTradeIn.uid});
  } else {
    poolObject = yield this.pool.expect(callee.uid);
  }

  //get results of trade
  this.em.emit('turn.action.trade_result', poolObject);

  if (poolObject.actionObject.args.exchange === false) {
    //no trade, get token
    if (this.isCaller()) this.em.emit('gm.get_token', caller);
  } else {
    let callerCardIndex = caller.hand.findIndex(x => x.uid === poolObject.actionObject.args.card);
    let callerCard = caller.hand[callerCardIndex];
    let calleeCardIndex = callee.hand.findIndex(x => x.uid === poolObject.actionObject.args.exchange);
    let calleeCard = callee.hand[calleeCardIndex];

    caller.hand.splice(callerCardIndex, 1, calleeCard);
    callee.hand.splice(calleeCardIndex, 1, callerCard);

    if (this.self.uid === caller.uid) this.em.emit('deck.card.got', calleeCard);
    if (this.self.uid === callee.uid) this.em.emit('deck.card.got', callerCard);
  }

  if (this.isCaller()) return yield this.turns.makeVote('turn');
  else return yield this.pool.expectAny(this.turns.vote, 'turn', 'one', caller.uid);
}

export function* duel () {
  let selectedPlayers = yield this.turns.callerSelectPlayers(1, [this.self]);

  let poolObject;
  if (this.isCaller()) {
    let callee = selectedPlayers[0];

    poolObject = yield this.turns.updatePool('duel', callee.uid, false);
  } else {
    poolObject = yield this.pool.expect();
  }

  this.em.emit('turn.action.duel', poolObject);

  let callee = this.find(poolObject.actionObject.callee);
  let caller = this.find(poolObject.uid);

  let playerToSupport = yield this.turns.initDuel({caller, callee, self: this.self});

  if (this.self.uid !== caller.uid && this.self.uid !== callee.uid) {
    //other declare support
    yield this.turns.makeVote('support', playerToSupport.uid);
  }

  let playersToVote = this.players.filter(x => x.uid !== caller.uid && x.uid !== callee.uid)
                          .sort((a, b) => { return a.uid === this.self.uid ? -1 : 1 });
  let playersUidToVote = playersToVote.map(x => x.uid);

  yield this.pool.expectAny(this.turns.vote, 'support', 'some', playersUidToVote);

  let callerDuel = {
    uid: caller.uid,
    name: caller.character.name,
    tokens: caller.tokens,
    base: 1,
    permanent: 0,
    optional: 0,
    busy: false,
    supporters: []
  }

  let calleeDuel = {
    uid: callee.uid,
    name: callee.character.name,
    tokens: callee.tokens,
    base: 1,
    permanent: 0,
    optional: 0,
    busy: false,
    supporters: []
  }

  playersToVote.forEach(player => {
    let duelObj = {
      uid: player.uid,
      name: player.character.name,
      tokens: player.tokens,
      busy: false,
      base: 1,
      permanent: 0,
      optional: 0
    }

    if (this.pool.pool[player.uid].callee === caller.uid) {
      callerDuel.supporters.push(duelObj);
    } else {
      calleeDuel.supporters.push(duelObj);
    }
  });

  this.em.emit('duel.begin', callerDuel, calleeDuel);

  this.em.emit('modal.show', new ModalOK('Готов'));
  yield this.turns.once('modal.exec');

  this.em.emit('duel.ready');
  yield this.turns.makeVote('duel.ready');
  yield this.pool.expectAny(this.turns.vote, 'duel.ready', 'all');

  let winner = yield this.turns.resultDuel();

  yield this.turns.makeVote('duel.result');
  yield this.pool.expectAny(this.turns.vote, 'duel.result', 'all');

  if (winner === false) {
    //draw
    this.em.emit('deck.draw', caller);
    yield * this.turns.resolveHandLimit();
  } else {
    let loser = winner.uid === caller.uid ? callee : caller;
    let prizePoolObject;
    if (winner.uid === this.self.uid) {
      this.em.emit('duel.choose_prize');
      if (loser.hand.length === 1) this.em.emit('duel.one_card');

      this.em.emit('modal.show', new ModalYesNo('Карта', 'Организация'));
      let prizeChoiceResult = yield this.turns.once('modal.exec');

      if (prizeChoiceResult) {
        //take card
        let cardsToExchange;
        if (loser.hand.length === 1) {
          this.em.emit('log', 'se', 'Выберите карты для обмена');
          cardsToExchange = yield Promise.all([
            this.turns.selectBoardCards(loser.hand, {selectable: true, dismissable: false, numCards: 1}),
            this.turns.selectCards(1)]);
        } else {
          this.em.emit('log', 'se', 'Выберите желауему карту');
          cardsToExchange = yield this.turns.selectBoardCards(loser.hand, {selectable: true, dismissable: false, numCards: 1});
        }

        let prizeArgsObj = {};
        if (Array.isArray(cardsToExchange[0])) {
          prizeArgsObj.card = cardsToExchange[0][0].uid;
          prizeArgsObj.exchange = cardsToExchange[1][0].uid;
        } else {
          prizeArgsObj.card = cardsToExchange[0].uid;
        }

        prizePoolObject = yield this.turns.updatePool('take', loser.uid, prizeArgsObj);
      } else {
        //learn allegiance
        prizePoolObject = yield this.turns.updatePool('learn', loser.uid);
      }
    } else {
      prizePoolObject = yield this.pool.expect();
    }

    this.em.emit('duel.prize.' + prizePoolObject.actionObject.action, prizePoolObject);

    if (prizePoolObject.actionObject.action === 'take') {
      let cardToTakeIndex = loser.hand.findIndex(x => x.uid === prizePoolObject.actionObject.args.card);
      let cardToTake = loser.hand[cardToTakeIndex];

      if (prizePoolObject.actionObject.args.exchange) {
        let cardToExchangeIndex = winner.hand.findIndex(x => x.uid === prizePoolObject.actionObject.args.exchange);
        let cardToExchange = winner.hand[cardToExchangeIndex];

        loser.hand.splice(cardToTakeIndex, 1, cardToExchange);
        winner.hand.splice(cardToExchangeIndex, 1, cardToTake);
      } else {
        loser.hand.splice(cardToTakeIndex, 1);
        winner.hand.push(cardToTake);
        yield * this.turns.resolveHandLimit();
      }
    } else {
      if (this.self.uid === winner.uid) this.em.emit('log', 'se', `${loser.character.name} из организации ${loser.allegiance.title}`);

      if (winner.known.find(x => x.uid === loser.uid) === undefined) {
        winner.known.push(loser);
        if (this.isCaller()) this.em.emit('gm.sync.known', winner);
      }
    }
  }

  if (this.isCaller()) return yield this.turns.makeVote('turn');
  else return yield this.pool.expectAny(this.turns.vote, 'turn', 'one', caller.uid);
}

export function* win () {
  let caller = this.find(this.queue.peekUid());

  this.em.emit('turn.action.win', {uid: caller.uid, actionObject: {
    action: 'win',
    callee: false,
    args: false
  }});

  //disclose allegiance to everyone
  if (this.self.known.find(x => x.uid === caller.uid) === undefined && !this.isCaller()) {
    this.self.known.push(caller);
    this.em.emit('log', 'se', `${caller.character.name} из организации ${caller.allegiance.title}`);
  }
  //disclose occupation
  if (!caller.occupation.disclosed) {
    caller.occupation.disclosed = true;
    this.em.emit('gm.occupation.disclosed', caller);
  }

  let poolObject;
  let playersToWin;
  if (this.isCaller()) {
    let selectedPlayers;
    playersToWin = [caller];
    while (selectedPlayers !== true) {
      //make dismissable
      selectedPlayers = yield this.turns.callerSelectPlayers(1, playersToWin, true);

      if (selectedPlayers !== true) {
        playersToWin.push(selectedPlayers[0]);
        this.em.emit('log', 'se', `${selectedPlayers[0].character.name} выбран`);
      }
    }
    poolObject = yield this.turns.updatePool('call_winners', false, objectify(playersToWin));
  } else {
    poolObject = yield this.pool.expect(caller.uid);
  }

  playersToWin = [];
  for (let playerUid of Object.keys(poolObject.actionObject.args)) {
    playersToWin.push(this.find(playerUid));
  }

  let msg = '';
  let trophies = 0;
  for (let i = 0; i < playersToWin.length; i++) {
    if (playersToWin[i].uid !== caller.uid) {
      if (this.self.known.find(x => x.uid === playersToWin[i].uid) === undefined &&
          playersToWin[i].uid !== this.self.uid) {
        this.self.known.push(playersToWin[i]);
      }
    }
    if (playersToWin[i].allegiance.org === caller.allegiance.org) {
      msg = `${playersToWin[i].character.name} из организации ${caller.allegiance.title}`;
      trophies = playersToWin[i].hand.reduce((prev, card) => {
        return card.token === caller.allegiance.token ? prev + 1 : prev;
      }, 0);

      if (trophies > 0) {
        if (caller.allegiance.org === 'order') msg += ` обладает ${trophies} ` + (trophies === 1 ? 'ключом' : 'ключами');
        else msg += ` обладает ${trophies} ` + (trophies === 1 ? 'кубком' : 'кубками');
      }
      if (playersToWin[i].hand.find(x => {
        x.token === playersToWin[i].allegiance.token === 'key' ? 'bagkey' : 'bagcup'
      })) {
        msg += trophies > 0 ? ' а также саквояжем' : 'обладает саквояжем';
      }

      this.em.emit('log', 'g', msg);
    } else {
      this.em.emit('log', 'a', `О, нет! ${playersToWin[i].character.name} принадлежит к другой организации!`);
      break;
    }
  }

  let resultPromise = this.turns.once('gm.game_result');
  this.em.emit('gm.try_win', playersToWin, caller.allegiance.org);
  let result = yield resultPromise;

  let winners = [];
  if (result) {
    winners = this.players.filter(player => player.allegiance.org === caller.allegiance.org);
  } else {
    winners = this.players.filter(player => player.allegiance.org !== caller.allegiance.org);
  }

  this.em.emit('gm.win', winners);
  this.em.emit('modal.show', new ModalOK('Рестарт'));
  yield this.turns.once('modal.exec');

  return Promise.resolve('finish');
}

export function* resolveHandLimit () {
  let checkHandLimitPromise = this.turns.once('gm.hand_limit.result');
  this.em.emit('gm.hand_limit.check');

  let violator = yield checkHandLimitPromise;

  if (violator === false) return;

  let limitPoolObject;
  if (this.self.uid === violator.uid) {
    let unavailablePlayers = this.players.filter(x => x.hand.length >= violator.hand.length - 1);
    let [playerToGive, cardToGive] = yield Promise.all([this.turns.selectPlayers(1, unavailablePlayers), this.turns.selectCards(1)]);

    limitPoolObject = yield this.turns.updatePool('give', playerToGive[0].uid, { card: cardToGive[0].uid });
  } else {
    limitPoolObject = yield this.pool.expect();
  }

  this.em.emit('turn.action.give', limitPoolObject);

  let cardToGiveAwayIndex = violator.hand.findIndex(x => x.uid === limitPoolObject.actionObject.args.card);
  let cardToGiveAway = violator.hand[cardToGiveAwayIndex];
  let receiver = this.find(limitPoolObject.actionObject.callee);

  violator.hand.splice(cardToGiveAwayIndex, 1);
  receiver.hand.push(cardToGiveAway);
}

export function once (event) {
  return new Promise((resolve, reject) => {
    this.em.once(event, arg => resolve(arg));
  });
}

export function updatePool (action = false, callee = false, argsObject = false) {
  return new Promise((resolve, reject) => {
    let actionObject = {
      action,
      callee,
      args: argsObject
    }

    this.em.once('pool.written', () => resolve({uid: this.self.uid, actionObject}))
    this.em.emit('pool.write', this.self.uid, actionObject);
  });
}
