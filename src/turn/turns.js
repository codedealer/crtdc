import {ModalOK, ModalYesNo} from '../modal'
import {objectify} from '../core/utils'
import Timer from '../world/promise-timer'
import Settings from '../world/settings'
import Animator from '../animator'
//this = turncoordinator

export function vote (newPoolObject, subject, criteria, cArgs = []) {
  let consensusCriteria = {
    all (voted, poolSize) {
      this.em.emit('vote', 'all', voted);
      return voted.length === poolSize;
    },
    some (voted, poolSize, cArgs) {
      let voices = 0;

      this.em.emit('vote', cArgs, voted);

      cArgs.forEach(voterUid => {
        if (voted.find(x => x === voterUid)) voices += 1;
      });

      return voices === cArgs.length;
    },
    one (voted, poolSize, cArgs) {
      let target = Array.isArray(cArgs) ? cArgs[0] : cArgs;

      this.em.emit('vote', [target], voted);
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

  return consensusCriteria[criteria].call(this, voted, poolSize, cArgs) ? subject : false;
}

export function makeVote (subject, callee = false) {
  return new Promise((resolve, reject) => {
    this.turns.updatePool('vote', callee, { subject }).then(() => resolve(subject));
  });
}

export function _giveCard (newPoolObject) {
  let caller, callee, card, cardIndex;

  caller = this.find(newPoolObject.uid);
  callee = this.find(newPoolObject.actionObject.callee);
  cardIndex = caller.hand.findIndex(card => card.uid === newPoolObject.actionObject.args.card);

  //card has already been given
  if (cardIndex === -1) return;

  card = caller.hand[cardIndex];

  //give this card to callee
  caller.hand.splice(cardIndex, 1);
  callee.hand.push(card);
}

export function give (newPoolObject) {
  //check if everyone completed
  let voted = [];
  let poolSize = 0;

  for (let [i, poolObject] of Object.entries(this.pool.pool)) {
    poolSize += 1;
    if (poolObject.action === 'give_sext') {
      voted.push(i);
      this.turns._giveCard({uid: i, actionObject: poolObject});
    }
  }

  this.em.emit('vote', 'all', voted);

  return voted.length === poolSize;
}

export function duelVote (newPoolObject, activePlayersUid) {
  //if update happened
  if (newPoolObject.uid &&
    newPoolObject.actionObject.action === 'duel.card') {
    //card used
    this.em.emit('gm.duel.card', Object.assign({uid: newPoolObject.uid}, newPoolObject.actionObject.args));
  }

  //check if active players completed
  let voted = [];

  for (let [i, poolObject] of Object.entries(this.pool.pool)) {
    if (poolObject.action === 'duel.player.ready' &&
        activePlayersUid.some(uid => uid === i)) {
      voted.push(i);
      this.em.emit('vote', activePlayersUid, voted);
    } else if (poolObject.action === 'duel.card' && !newPoolObject.uid) {
      this.em.emit('gm.duel.card', Object.assign({uid: i}, poolObject.args));
    }
  }

  if (!newPoolObject.uid) this.em.emit('vote', activePlayersUid, voted);

  return voted.length === activePlayersUid.length;
}

export function cancelableVote (newPoolObject, ...args) {
  if (!newPoolObject.actionObject || !newPoolObject.actionObject.args.subject) return this.turns.vote(newPoolObject, ...args);

  if (newPoolObject.actionObject.args.subject === 'turn.end') {
    return this.turns.vote(newPoolObject, 'turn.end', 'all');
  }

  return this.turns.vote(newPoolObject, ...args);
}

export function getTrader (token) {
  let {caller, callee} = this.getContractorsFromPool();

  //find who ownes the card now
  //the other must've traded it
  let traderIsCaller = caller.hand.find(card => card.token === token) === undefined;
  return traderIsCaller ? caller : callee;
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

export function * skip () {
  return yield Promise.resolve('turn');
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
    poolObject = yield this.pool.expect(this.queue.peekUid());
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
    poolObject = yield this.pool.expect(this.queue.peekUid());
  }

  //cache contractors
  this.getContractorsFromPool(true);

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

    this.em.emit('selector.reset');

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

    yield Animator.animate('swapCards', caller, callee);

    yield this.turns.makeVote('trade.anim.finish');
    yield this.pool.expectAny(this.turns.vote, 'trade.anim.finish', 'all');

    let skipSpecials = callerCard.token === 'mirror' || calleeCard.token === 'mirror';

    if (callerCard.onTrade) {
      if (skipSpecials) {
        if (this.isCaller()) this.em.emit('log', 'a', 'Свойство карты отменено');
      } else {
        yield * callerCard.onTrade.call(this);
      }
    }
    if (calleeCard.onTrade) {
      if (skipSpecials) {
        if (this.self.uid === callee.uid) this.em.emit('log', 'a', 'Свойство карты отменено');
      } else {
        yield * calleeCard.onTrade.call(this);
      }
    }
  }

  yield this.turns.makeVote('turn');
  return yield this.pool.expectAny(this.turns.vote, 'turn', 'all');
}

export function* duel () {
  let selectedPlayers = yield this.turns.callerSelectPlayers(1, [this.self]);

  let poolObject;
  if (this.isCaller()) {
    let callee = selectedPlayers[0];

    poolObject = yield this.turns.updatePool('duel', callee.uid, false);
  } else {
    poolObject = yield this.pool.expect(this.queue.peekUid());
  }

  this.em.emit('turn.action.duel', poolObject);

  let {caller, callee} = this.getContractorsFromPool(true, 'duel');

  //onDuelBegin hook
  let role = this.isCaller() ? 'attack' : 'support';
  if (this.self.uid === callee.uid) role = 'defence';

  if (this.self.occupation.onDuelBegin &&
      (!this.self.occupation.disclosed || !this.self.occupation.once) &&
      this.self.occupation.onDuelBegin(role)) {
    this.self.occupation.availability = true;
  }

  let activeSupporters = this.players.filter(x => x.uid !== caller.uid && x.uid !== callee.uid);
  let playerToSupport = yield this.turns.initDuel({caller, callee, self: this.self, activeSupporters});

  if (playerToSupport !== null) {
    //other declare support
    yield this.turns.makeVote('support', playerToSupport.uid);
  }

  let playersToVotePromise = this.turns.once('duel.active_players.got');
  this.em.emit('duel.active_players.get');
  let playersToVote = yield playersToVotePromise;
  playersToVote = playersToVote.sort((a, b) => { return a.uid === this.self.uid ? -1 : 1 });
  let playersUidToVote = playersToVote.map(x => x.uid);

  let supportVoteResult = yield this.pool.expectAny(this.turns.cancelableVote, 'support', 'some', playersUidToVote);

  //onDuelBegin unhook
  if (this.self.occupation.onDuelBegin) {
    this.self.occupation.availability = false;
  }

  if (supportVoteResult === 'turn.end') return 'turn';

  playersToVotePromise = this.turns.once('duel.active_players.got');
  this.em.emit('duel.active_players.get');
  playersToVote = yield playersToVotePromise;
  playersUidToVote = playersToVote.map(x => x.uid);

  let callerDuel = {
    uid: caller.uid,
    name: caller.character.name,
    tokens: caller.tokens,
    hand: caller.hand,
    base: 1,
    permanent: 0,
    optional: 0,
    busy: false,
    supporters: []
  }

  callerDuel.optional = caller.occupation.onDuel
                        ? caller.occupation.onDuel('attack', 0)
                        : 0
                        ;

  let calleeDuel = {
    uid: callee.uid,
    name: callee.character.name,
    tokens: callee.tokens,
    hand: callee.hand,
    base: 1,
    permanent: 0,
    optional: 0,
    busy: false,
    supporters: []
  }

  calleeDuel.optional = callee.occupation.onDuel
                      ? callee.occupation.onDuel('defence', 0)
                      : 0
                      ;

  playersToVote.forEach(player => {
    let duelObj = {
      uid: player.uid,
      name: player.character.name,
      tokens: player.tokens,
      hand: player.hand,
      busy: false,
      base: 1,
      permanent: 0,
      optional: 0
    }

    if (this.pool.pool[player.uid].callee === caller.uid) {
      duelObj.optional = player.occupation.onDuel
                         ? player.occupation.onDuel('supAttack', 0)
                         : 0
                         ;
      callerDuel.supporters.push(duelObj);
    } else {
      duelObj.optional = player.occupation.onDuel
                         ? player.occupation.onDuel('supDefence', 0)
                         : 0
                         ;
      calleeDuel.supporters.push(duelObj);
    }
  });

  playersUidToVote.push(caller.uid, callee.uid);

  let selfRef = playersUidToVote.find(x => x === this.self.uid);

  this.em.emit('duel.begin', callerDuel, calleeDuel, selfRef);

  yield this.pool.expectAny(this.turns.duelVote, playersUidToVote);

  this.em.emit('duel.ready');
  yield this.turns.makeVote('duel.ready');
  yield this.pool.expectAny(this.turns.vote, 'duel.ready', 'all');

  //onDuelResult hook
  if (this.self.occupation.onDuelResult &&
      !this.self.occupation.disclosed) {
    this.self.occupation.availability = true;
  }

  let duelResultResultPromise = this.pool.expectAny(this.turns.cancelableVote, 'duel.result', 'all');

  let winner = yield this.turns.resultDuel();

  //onDuelResult unhook
  if (this.self.occupation.onDuelResult) {
    this.self.occupation.availability = false;
  }

  if (winner !== null) {
    yield this.turns.makeVote('duel.result');
  }
  let duelResultResult = yield duelResultResultPromise;

  if (duelResultResult === 'turn.end') return 'turn';

  if (winner === false) {
    //draw
    //check for ring
    let ringBearer;
    ringBearer = caller.hand.some(card => card.token === 'ring') ? caller : false;
    if (!ringBearer) {
      ringBearer = callee.hand.some(card => card.token === 'ring') ? callee : false;
    }

    let useRing = false;
    if (ringBearer) {
      let ringPoolObject;
      if (this.self.uid === ringBearer.uid) {
        this.em.emit('log', 'se', 'Вы можете использовать кольцо, чтобы победить в дуэли. Использовать?');
        this.em.emit('modal.show', new ModalYesNo('Да', 'Нет'));
        let choiceResult = yield this.turns.once('modal.exec');

        ringPoolObject = yield this.turns.updatePool('ring', false, {choice: choiceResult});
      } else {
        ringPoolObject = yield this.pool.expect(ringBearer.uid);
      }

      useRing = ringPoolObject.actionObject.args.choice;
    }

    if (useRing) {
      this.em.emit('log', 'g', `${ringBearer.character.name} использует кольцо!`);
      winner = ringBearer;
    } else {
      this.em.emit('deck.draw', caller);
      yield * this.turns.resolveHandLimit();
    }
  }
  if (winner !== false) {
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
      prizePoolObject = yield this.pool.expect(winner.uid);
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
  }
  //disclose occupation
  if (!caller.occupation.disclosed) {
    caller.occupation.disclosed = true;
    //this.em.emit('gm.occupation.disclosed', caller); <- this actually causes special property of occupation to activate
  }

  let poolObject;
  let playersToWin;
  if (this.isCaller()) {
    let selectedPlayers;
    playersToWin = [caller];
    let useSeal = false;
    //promt player to use seal
    if (this.self.hand.some(card => card.token === 'seal')) {
      this.em.emit('log', 'a', 'Вы можете объявить победу используя гербовую печать. Вы используете печать?');
      this.em.emit('modal.show', new ModalYesNo('Да', 'Нет'));
      useSeal = yield this.turns.once('modal.exec');
    }
    if (!useSeal) {
      while (selectedPlayers !== true) {
        selectedPlayers = yield this.turns.callerSelectPlayers(1, playersToWin, true);

        if (selectedPlayers !== true) {
          playersToWin.push(selectedPlayers[0]);
          this.em.emit('log', 'se', `${selectedPlayers[0].character.name} выбран`);
        }
      }
    }
    poolObject = yield this.turns.updatePool('call_winners', useSeal, objectify(playersToWin));
  } else {
    poolObject = yield this.pool.expect(caller.uid);
  }

  playersToWin = [];
  for (let playerUid of Object.keys(poolObject.actionObject.args)) {
    playersToWin.push(this.find(playerUid));
  }

  let sealWin = poolObject.actionObject.callee;

  if (sealWin) this.em.emit('log', 'g', `${playersToWin[0].character.name} использует гербовую печать!`);

  let msg = '';
  let trophies = 0;
  let winParty = sealWin ? 'seal' : caller.allegiance.org;

  let winCriteriaPromise = this.turns.once('gm.win.criteria.got');
  this.em.emit('gm.win.criteria.get', playersToWin, winParty);
  let winCriteria = yield winCriteriaPromise;

  if (sealWin) {
    let winnables = ['key', 'cup'];
    if (winCriteria.canUseBag) winnables.push('bagkey', 'bagcup');

    trophies = caller.hand.reduce((prev, card) => {
      if (winnables.some(token => token === card.token)) return prev + 1;

      return prev;
    }, 0);

    let winMsg = `${caller.character.name} обладает ${trophies} ценными предметами`;

    if (winCriteria.canUseBag) winMsg += ' в том числе саквояжи';

    this.em.emit('log', 'g', winMsg);
  } else {
    let chosenPlayersNames = playersToWin.map(player => {
      return player.character.name;
    }).join(', ');
    let handToShow = [];

    this.em.emit('log', 'g', `Были выбраны следующие игроки: ${chosenPlayersNames}`);

    yield new Timer(Settings.DEFAULT_TURN_WAIT);

    let itemsStr = caller.allegiance.org === 'order' ? 'ключа' : 'кубка';
    this.em.emit('log', 'g', `Необходимо собрать ${winCriteria.requiredNum} ${itemsStr}`);

    yield new Timer(Settings.DEFAULT_TURN_WAIT);

    let winnables = [winCriteria.winItemName];
    if (winCriteria.canUseBag) {
      winnables.push(winCriteria.bagName);
      this.em.emit('log', 'g', 'Саквояжи также учитываются');
    } else this.em.emit('log', 'g', 'Саквояжи не учитываются');

    yield new Timer(Settings.DEFAULT_TURN_WAIT);

    for (let i = 0; i < playersToWin.length; i++) {
      if (playersToWin[i].allegiance.org === caller.allegiance.org) {
        handToShow = [];
        msg = `${playersToWin[i].character.name}`;

        trophies = playersToWin[i].hand.reduce((prev, card) => {
          if (winnables.some(token => token === card.token)) {
            handToShow.push(card);
            return prev + 1;
          }

          return prev;
        }, 0);

        if (trophies > 0) {
          msg += ` обладает ${trophies} `;
          msg += (trophies === 1) ? 'предметом' : 'предметами';
        } else {
          msg += ' не имеет ценных предметов';
        }

        this.em.emit('log', 'g', msg);

        if (handToShow.length) {
          this.turns.selectBoardCards(handToShow, {selectable: false, dismissable: false});
        }

        yield new Timer(Settings.DEFAULT_TURN_WAIT * 3);
      } else {
        this.em.emit('log', 'a', `О, нет! ${playersToWin[i].character.name} принадлежит к другой организации!`);

        yield new Timer(Settings.DEFAULT_TURN_WAIT);
        break;
      }
    }
  } //else

  let resultPromise = this.turns.once('gm.game_result');
  this.em.emit('gm.try_win', playersToWin, winParty);
  let result = yield resultPromise;

  let winners = [];
  if (sealWin) {
    winners = result ? [caller] : this.players.filter(p => p.uid !== caller.uid);
  } else {
    if (result) {
      winners = this.players.filter(player => player.allegiance.org === caller.allegiance.org);
    } else {
      winners = this.players.filter(player => player.allegiance.org !== caller.allegiance.org);
    }
  }

  this.em.emit('gm.win', winners, sealWin);
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
    limitPoolObject = yield this.pool.expect(violator.uid);
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
