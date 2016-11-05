import rc from '../world/rulecoordinator'
import co from 'co'

function * diplomatDisclose () {
  let poolObject;
  let caller = this.find(this.queue.peekUid());
  if (this.isCaller()) {
    //this.isCaller only applicable bc this
    //function is called only onSelfTurn
    this.em.emit('log', 'se', 'Выберите, у кого какую карту потребовать');

    let itemCards = rc.deck.getUnique();
    let itemCardsOptions = {selectable: true, dismissable: false, numCards: 1};
    let [selectedPlayers, selectedCards] = yield Promise.all([
      this.turns.selectPlayers(1, [this.self]),
      this.turns.selectBoardCards(itemCards, itemCardsOptions)
    ]);

    poolObject = yield this.turns.updatePool('occupation.request_card', selectedPlayers[0].uid, {card: selectedCards[0].token});
  } else {
    poolObject = yield this.pool.expectOccupation();
  }

  this.em.emit('occupation.card.request', poolObject);

  let callee = this.find(poolObject.actionObject.callee);
  let requestedCardIndex = callee.hand.findIndex(card => card.token === poolObject.actionObject.args.card);

  if (requestedCardIndex === -1) {
    this.em.emit('log', 'g', `${callee.character.name}: Сожалею, у меня нет такой карты`);
    if (this.isCaller()) {
      this.em.emit('log', 'se', 'Ваш ход закончен');
      this.em.emit('turn.action', 'skip');
    }
  } else {
    let requestedCard = callee.hand[requestedCardIndex];
    callee.hand.splice(requestedCardIndex, 1);
    caller.hand.push(requestedCard);
    this.em.emit('log', 'g', `${callee.character.name} передает ${requestedCard.name}`);
  }
}

function * seerDisclose () {
  let poolObject;
  let caller = this.find(this.queue.peekUid());
  this.em.emit('log', 'g', `${caller.character.name} перемешивает колоду`);
  if (this.isCaller()) {
    this.em.emit('log', 'se', 'Выберите две карты. Первая из них пойдет наверх колоды, вторая будет под ней.');
    let itemCards = rc.deck.getDeck();
    let itemCardsOptions = {selectable: true, dismissable: false, numCards: 2};
    let selectedCards = yield this.turns.selectBoardCards(itemCards, itemCardsOptions);

    poolObject = yield this.turns.updatePool('occupation.shuffle_deck', false, { itemFirst: selectedCards[0].uid, itemSecond: selectedCards[1].uid });
  } else {
    poolObject = yield this.pool.expectOccupation();
  }

  let {itemFirst, itemSecond} = poolObject.actionObject.args;
  let deck = rc.deck.getDeck();
  let firstCard, secondCard;

  let reductDeck = deck.filter(x => {
    if (x.uid === itemFirst) {
      firstCard = x;
      return false;
    } else if (x.uid === itemSecond) {
      secondCard = x;
      return false;
    }

    return true;
  });

  rc.deck.updateDeck(reductDeck);

  let deckShufflePromise = this.turns.once('deck.shuffled');
  this.em.emit('deck.shuffle');
  yield deckShufflePromise;

  reductDeck.unshift(secondCard);
  reductDeck.unshift(firstCard);

  rc.deck.updateDeck(reductDeck);

  if (this.isCaller()) {
    this.em.emit('gm.sync.deck');
  }
}

function * hypnoDisclose () {
  let poolObject;
  //this.isCaller is only possible
  //bc attacker is always caller
  if (this.isCaller()) {
    this.em.emit('log', 'se', 'Выберите того, кто не будет оказывать поддержку');

    let callee = this.pool.pool[this.self.uid].callee;
    let excludeList = this.players.filter(player => {
      if (player.uid === this.self.uid) return true;
      if (player.uid === callee) return true;

      return false;
    });

    let playerToExclude = yield this.turns.selectPlayers(1, excludeList);
    poolObject = yield this.turns.updatePool('duel.exclude', playerToExclude[0].uid);
  } else {
    poolObject = yield this.pool.expect(this.queue.peekUid());
  }

  let hypno = this.find(poolObject.actionObject.callee);
  let caller = this.find(poolObject.uid);

  this.em.emit('log', 'g', `${caller.character.name} гипнотизирует ${hypno.character.name}. ${hypno.character.name} не участвует в дуэли.`);
  if (this.self.uid === hypno.uid) this.em.emit('log', 'se', 'Вы не участуете в этой дуэли');

  this.em.emit('duel.player.exclude', hypno);
}

function * priestDisclose () {
  let caller = this.getContractorsFromPool().caller;
  let priest = this.actor;

  this.em.emit('log', 'g', `${priest.character.name}, пользуясь правом священника останавливает дуэль`);
  if (priest.uid !== caller.uid && caller.hand.length > 1) {
    this.em.emit('duel.support.cancel', this.self);

    let poolObject;
    if (this.isCaller()) {
      this.em.emit('log', 'se', 'Вы обязаны передать любую карту священнику');
      let selectedCards = yield this.turns.callerSelectCards(1);

      poolObject = yield this.turns.updatePool('card.give', priest.uid, {card: selectedCards[0].uid});
    } else {
      poolObject = yield this.pool.expect(caller.uid);
    }

    this.turns._giveCard(poolObject);
    this.em.emit('log', 'g', `${caller.character.name} передает карту ${priest.character.name}`);
  }

  this.em.emit('turn.end');
  this.turns.makeVote('turn.end');
}

function * duelDisclose () {
  let duelist = this.actor;
  let {caller, callee} = this.getContractorsFromPool();
  this.em.emit('log', 'g', `${duelist.character.name} использует право дуэлянта. Остальные не участвуют в дуэли.`);

  this.players.forEach(player => {
    if (player.uid !== caller.uid && player.uid !== callee.uid) {
      this.em.emit('duel.player.exclude', player);
    }
  });
}

function * alchemistDisclose () {
  let alchemist = this.actor;
  let {caller, callee} = this.getContractorsFromPool();
  let poolObject;
  this.em.emit('log', 'g', `Алхимик ${alchemist.character.name} подстраивает результат дуэли`);
  if (alchemist.uid === this.self.uid) {
    //disable support voting
    //to not to confuse with winner voting
    this.em.emit('duel.support.cancel', this.self);
    this.em.emit('log', 'se', 'Выберите победителя дуэли');
    let supporters = this.players.filter(p => {
      return p.uid !== caller.uid && p.uid !== callee.uid;
    });
    let selectedPlayers = yield this.turns.selectPlayers(1, supporters);

    poolObject = yield this.turns.updatePool('occupation.duel.winner', selectedPlayers[0].uid);
  } else {
    poolObject = yield this.pool.expectOccupation();
  }

  let winner = this.find(poolObject.actionObject.callee);

  this.em.emit('duel.decide.winner', winner);
  if (alchemist.uid === this.self.uid) this.turns.makeVote('support', winner.uid);
}

function * doctorDisclose () {
  let doctor = this.actor;

  this.em.emit('log', 'g', `Доктор ${doctor.character.name} отменяет исход дуэли`);
  this.em.emit('duel.result.cancel');
  this.turns.makeVote('turn.end');
}

export let diplomat = {
  name: 'Дипломат',
  token: 'diplomat',
  disclosed: false,
  availability: false,
  continuous: false,
  onSelfTurn: true,
  description: 'Один раз за игру и только в свой ход вы можете потребовать у другого игрока, чтобы он обменял вам определенный предмет. Если у игрока нет названного предмета, то ваш ход тут же заканчивается.',
  onDisclose () {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');

    co(diplomatDisclose.bind(this))
    .then(() => this.em.emit('gm.allow.turns'))
    .catch(err => console.error(err))
    ;
  }
}

export let hypno = {
  name: 'Гипнотизер',
  token: 'hypno',
  disclosed: false,
  availability: false,
  continuous: false,
  onDuelBegin (role) { return role === 'attack' },
  once: false,
  description: 'Если вы атакующий, то сразу после того, как кто-то заявил о своём желании поддержать одну из сторон, вы можете заставить его не вмешиваться в эту дуэль.',
  onDisclose () {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');

    co(hypnoDisclose.bind(this))
    .then(() => this.em.emit('gm.allow.turns'))
    .catch(err => console.error(err))
    ;
  }
}

export let seer = {
  name: 'Ясновидящий',
  token: 'seer',
  disclosed: false,
  availability: false,
  continuous: false,
  onSelfTurn: true,
  description: 'Один раз за игру и только в свой ход вы можете посмотреть колоду предметов и выбрать 2 из них. Затем перемешайте колоду и положите выбранные предметы в любом порядке сверху.',
  onDisclose () {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');

    co(seerDisclose.bind(this))
    .then(() => this.em.emit('gm.allow.turns'))
    .catch(err => console.error(err))
    ;
  }
}

export let doctor = {
  name: 'Доктор',
  token: 'doctor',
  disclosed: false,
  availability: false,
  continuous: false,
  onDuelResult: true,
  description: 'Один раз за игру, сразу после дуэли, вы можете отменить результат этой дуэли.',
  onDisclose (player) {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');
    this.actor = player;

    co(doctorDisclose.bind(this))
    .then(() => {
      this.actor = undefined;
      this.em.emit('gm.allow.turns');
    })
    .catch(err => console.error(err))
    ;
  }
}

export let priest = {
  name: 'Священник',
  token: 'priest',
  disclosed: false,
  availability: false,
  continuous: false,
  onDuelBegin (role) { return true },
  once: true,
  description: 'Один раз за игру, до того как другие заявили, кого они поддерживают, вы можете предотвратить дуэль. Если атакующий имеет хотя бы 2 предмета, он должен отдать вам один предмет по своему выбору. Ход атакующего тут же заканчивается.',
  onDisclose (player) {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');
    this.actor = player;

    co(priestDisclose.bind(this))
    .then(() => {
      this.actor = undefined;
      this.em.emit('gm.allow.turns');
    })
    .catch(err => console.error(err))
    ;
  }
}

export let guard = {
  name: 'Телохранитель',
  token: 'guard',
  disclosed: false,
  availability: false,
  continuous: true,
  onTurn: true,
  description: 'Если вы поддерживаете игрока, он получает +1.',
  onDuel (role, score) {
    if (!this.disclosed) return score;
    if (role === 'supAttack' || role === 'supDefence') return score + 1;

    return score;
  },
  onDisclose (player) {
    this.em.emit('duel.occupation.disclosed', player);
  }
}

export let alchemist = {
  name: 'Алхимик',
  token: 'alchemist',
  disclosed: false,
  availability: false,
  continuous: false,
  once: true,
  onDuelBegin (role) { return role === 'support' },
  description: 'Один раз за игру вы можете назначить победителя дуэли, но только если вы сами не являетесь атакующим или защищающимся в дуэли.',
  onDisclose (player) {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');
    this.actor = player;

    co(alchemistDisclose.bind(this))
    .then(() => {
      this.actor = undefined;
      this.em.emit('gm.allow.turns');
    })
    .catch(err => console.error(err))
    ;
  }
}

export let thug = {
  name: 'Головорез',
  token: 'thug',
  disclosed: false,
  availability: false,
  continuous: true,
  onTurn: true,
  description: 'Вы можете добавить себе +1 в дуэли, если вы атакующий.',
  onDuel (role, score) {
    if (!this.disclosed || role !== 'attack') return score;
    return score + 1;
  },
  onDisclose (player) {
    this.em.emit('duel.occupation.disclosed', player);
  }
}

export let duelist = {
  name: 'Дуэлянт',
  token: 'duelist',
  disclosed: false,
  availability: false,
  continuous: false,
  activated: false,
  once: true,
  onDuelBegin (role) { return role === 'attack' || role === 'defence' },
  onDuel (role, score) {
    if (this.activated || !this.disclosed) return score;
    if (role !== 'attack' && role !== 'defence') return score;

    this.activated = true;
    return score + 1;
  },
  description: 'Один раз за игру, если вы атакуете или защищаетесь, вы можете заявить, что никто не должен оказывать поддержку в этой дуэли. Также вы получаете +1 в этой дуэли.',
  onDisclose (player) {
    //this = turncoordinator
    this.em.emit('gm.restrict.turns');
    this.actor = player;

    co(duelDisclose.bind(this))
    .then(() => {
      this.actor = undefined;
      this.em.emit('gm.allow.turns');
    })
    .catch(err => console.error(err))
    ;
  }
}

export let master = {
  name: 'Магистр',
  token: 'master',
  disclosed: false,
  availability: false,
  continuous: true,
  onTurn: true,
  description: 'Вы можете добавить +1 в дуэли, если вы защищающийся.',
  onDuel (role, score) {
    if (!this.disclosed || role !== 'defence') return score;
    return score + 1;
  },
  onDisclose (player) {
    this.em.emit('duel.occupation.disclosed', player);
  }
}
