import {ModalYesNo} from '../modal'

export let cup = {
  name: 'Кубок',
  token: 'cup',
  negotiable: true,
  description: 'Братство может объявить победу, если обладает хотя бы 3 кубками.'
}
export let key = {
  name: 'Ключ',
  token: 'key',
  negotiable: true,
  description: 'Орден может объявить победу, если обладает хотя бы 3 ключами. '
}
export let bagcup = {
  name: 'Саквояж (Кубок)',
  token: 'bagcup',
  negotiable: true,
  description: 'Обменяв этот предмет, можете взять карту из колоды предметов. Если колода предметов пуста, этот саквояж считается кубком. Нельзя обменять на другой саквояж. ',
  onTrade: function * () {
    let trader = this.turns.getTrader('bagcup');

    this.em.emit('deck.special_exchange', trader, 'Саквояж (Кубок)');

    this.em.emit('deck.draw', trader);
    yield * this.turns.resolveHandLimit();
  }
}
export let bagkey = {
  name: 'Саквояж (Ключ)',
  token: 'bagkey',
  negotiable: true,
  description: 'Обменяв этот предмет, можете взять карту из колоды предметов. Если колода предметов пуста, этот саквояж считается ключом. Нельзя обменять на другой саквояж. ',
  onTrade: function * () {
    let trader = this.turns.getTrader('bagkey');

    this.em.emit('deck.special_exchange', trader, 'Саквояж (Ключ)');

    this.em.emit('deck.draw', trader);
    yield * this.turns.resolveHandLimit();
  }
}
export let monocle = {
  name: 'Моноколь',
  token: 'monocle',
  negotiable: true,
  description: 'Обеняв этот предмет, можете посмотреть карту тайной организации второго участника сделки. ',
  onTrade: function * () {
    let {caller, callee} = this.getContractorsFromPool();

    let trader = this.turns.getTrader('monocle');
    let receiver = trader.uid === caller.uid ? callee : caller;

    this.em.emit('deck.special_exchange', trader, 'Моноколь');
    this.em.emit('duel.prize.learn', {uid: trader.uid, actionObject: {callee: receiver.uid}});

    if (this.self.uid === trader.uid) this.em.emit('log', 'se', `${receiver.character.name} из организации ${receiver.allegiance.title}`);

    if (trader.known.find(x => x.uid === receiver.uid) === undefined) {
      trader.known.push(receiver);
      if (this.isCaller()) this.em.emit('gm.sync.known', trader);
    }
  }
}
export let coat = {
  name: 'Плащ',
  token: 'coat',
  negotiable: true,
  description: 'Обеняв этот предмет, вы можете выбрать новую профессию из тех, что не участвуют в игре, и положить ее лицом вниз перед собой. Сбросьте свою старую профессию.',
  onTrade: function * () {
    let trader = this.turns.getTrader('coat');

    this.em.emit('deck.special_exchange', trader, 'Плащ');

    if (this.self.uid === trader.uid) {
      this.em.emit('gm.change_ocupation.query');

      this.em.emit('modal.show', new ModalYesNo('Сменить', 'Отмена'));
      let choiceResult = yield this.turns.once('modal.exec');

      if (choiceResult) {
        this.em.emit('log', 's', 'Выберите новую профессию');

        let occupationPoolPromise = this.turns.once('gm.occupation_pool.got');
        this.em.emit('gm.occupation_pool.get');
        let occupationPool = yield occupationPoolPromise;

        let newOccupation = yield this.turns.selectBoardCards(occupationPool, {selectable: true, dismissable: false, numCards: 1, type: 'occupationCard'});

        let occupationChangePromise = this.turns.once('gm.occupation.changed');
        this.em.emit('gm.change_ocupation', trader, newOccupation[0]);
        yield occupationChangePromise;
      }

      yield this.turns.makeVote('ready');
    } else {
      yield this.pool.expectAny(this.turns.vote, 'ready', 'one', trader.uid);
    }
  }
}
export let tome = {
  name: 'Книга',
  token: 'tome',
  negotiable: true,
  description: 'Обеняв этот предмет, можете также обменяться профессиями со вторым участником сделки. Вскрытые профессии после такого обмена переворачиваются лицом вниз.',
  onTrade: function * () {
    let {caller, callee} = this.getContractorsFromPool();

    let trader = this.turns.getTrader('tome');
    let receiver = trader.uid === caller.uid ? callee : caller;

    this.em.emit('deck.special_exchange', trader, 'Книга');

    if (this.self.uid === trader.uid) {
      this.em.emit('gm.swap_ocupation.query');

      this.em.emit('modal.show', new ModalYesNo('Сменить', 'Отмена'));
      let choiceResult = yield this.turns.once('modal.exec');

      if (choiceResult) {
        let traderOccupation = receiver.occupation;
        let receiverOccupation = trader.occupation;

        let occupationChangePromise = this.turns.once('gm.occupation.changed');
        this.em.emit('gm.change_ocupation', trader, traderOccupation);
        yield occupationChangePromise;

        occupationChangePromise = this.turns.once('gm.occupation.changed');
        this.em.emit('gm.change_ocupation', receiver, receiverOccupation);
        yield occupationChangePromise;
      }

      yield this.turns.makeVote('ready');
    } else {
      yield this.pool.expectAny(this.turns.vote, 'ready', 'one', trader.uid);
    }
  }
}
export let privilege = {
  name: 'Привилегия',
  token: 'privilege',
  negotiable: true,
  description: 'Обеняв этот предмет, можете посмотреть все предметы второго участника сделки.',
  onTrade: function * () {
    let {caller, callee} = this.getContractorsFromPool();

    let trader = this.turns.getTrader('privilege');
    let receiver = trader.uid === caller.uid ? callee : caller;

    this.em.emit('deck.special_exchange', trader, 'Привилегия');
    this.em.emit('deck.all_cards.known', trader, receiver);

    if (this.self.uid === trader.uid) {
      yield this.turns.selectBoardCards(receiver.hand, {selectable: false, dismissable: true});
      yield this.turns.makeVote('ready');
    } else {
      yield this.pool.expectAny(this.turns.vote, 'ready', 'one', trader.uid);
    }
  }
}
export let sextant = {
  name: 'Секстант',
  token: 'sextant',
  negotiable: true,
  description: 'Обменяв этот предмет, выберите направление. Все игроки должны передать соседу в этом направлении любой предмет по своему выбору.',
  onTrade: function * () {
    let trader = this.turns.getTrader('sextant');

    this.em.emit('deck.special_exchange', trader, 'Секстант');

    let dirPoolObject;
    let turnQueue = this.queue.buffer;
    let point = turnQueue.findIndex(uid => uid === this.self.uid);

    if (this.self.uid === trader.uid) {
      let prevPlayer = point === 0 ? turnQueue[turnQueue.length - 1] : turnQueue[point - 1];
      let nextPlayer = point === (turnQueue.length - 1) ? turnQueue[0] : turnQueue[point + 1];

      let unavailablePlayers = this.players.filter(x => {
        return x.uid !== prevPlayer && x.uid !== nextPlayer;
      });

      this.em.emit('log', 'se', 'Выберите направление, в котором будут переданы карты');

      let playerToGive = yield this.turns.selectPlayers(1, unavailablePlayers);

      let direction = playerToGive[0].uid === nextPlayer ? 'next' : 'prev';
      dirPoolObject = yield this.turns.updatePool('direction', playerToGive[0].uid, { direction });
    } else {
      dirPoolObject = yield this.pool.expect(trader.uid);
    }

    let dir = dirPoolObject.actionObject.args.direction;

    let callee;
    if (dir === 'next') {
      callee = point === (turnQueue.length - 1) ? turnQueue[0] : turnQueue[point + 1];
    } else {
      callee = point === 0 ? turnQueue[turnQueue.length - 1] : turnQueue[point - 1];
    }

    let calleePlayer = this.find(callee);
    this.em.emit('log', 'se', `Вы должны выбрать карту для ${calleePlayer.character.name}`);

    let cardToGive = yield this.turns.selectCards(1);

    yield this.turns.updatePool('give_sext', callee, {card: cardToGive[0].uid});
    yield this.pool.expectAny(this.turns.give);
  }
}
export let ring = {
  name: 'Отравленное кольцо',
  token: 'ring',
  negotiable: true,
  description: 'Если вы атакующий или защищающийся, то побеждаете в дуэли в случае ничьей.'
}
export let mirror = {
  name: 'Разбитое зеркало',
  token: 'mirror',
  negotiable: false,
  description: 'От этой карты нельзя отказаться при обмене. Эффект предмета, который вы получаете, не срабатывает.'
}
export let pearl = {
  name: 'Черная жемчужина',
  token: 'pearl',
  negotiable: false,
  description: 'От этой карты нельзя отказаться при обмене. Игрок, обладающий Черной жемчужиной, не может объявить победу своей тайной организации. Не используется при игре втроем.'
}
export let seal = {
  name: 'Гербовая печать',
  token: 'seal',
  negotiable: true,
  description: 'Вы можете объявить свою единоличную победу, если обладаете этой картой и хотя бы 3 кубками/ключами(например, 2 ключа + 1 кубок).'
}
export let dagger = {
  name: 'Кинжал',
  token: 'dagger',
  negotiable: true,
  description: 'Если вы атакующий, можете добавить себе +1. Бонус не учитывается, если вы поддерживаете другого игрока.',
  onDuel (score, role, isSelected) {
    if (role !== 'attack') return score;
    return isSelected ? score + 1 : score - 1;
  }
}
export let knives = {
  name: 'Метательные ножи',
  token: 'knives',
  negotiable: true,
  description: 'Если в дуэли вы поддерживаете атакующего, он может добавить себе +1.',
  onDuel (score, role, isSelected) {
    if (role !== 'supAttack') return score;
    return isSelected ? score + 1 : score - 1;
  }
}
export let gloves = {
  name: 'Перчатки',
  token: 'gloves',
  negotiable: true,
  description: 'Если вы защищающийся можете добавить себе +1. Бонус не учитывается, если вы поддерживаете другого игрока.',
  onDuel (score, role, isSelected) {
    if (role !== 'defence') return score;
    return isSelected ? score + 1 : score - 1;
  }
}
export let whip = {
  name: 'Кнут',
  token: 'whip',
  negotiable: true,
  description: 'Если в дуэли вы поддерживаете защищающегося, он может добавить себе +1.',
  onDuel (score, role, isSelected) {
    if (role !== 'supDefence') return score;
    return isSelected ? score + 1 : score - 1;
  }
}

