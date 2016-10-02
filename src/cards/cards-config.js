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
  description: 'Обеняв этот предмет, можете посмотреть карту тайной организации второго участника сделки. '
}
export let coat = {
  name: 'Плащ',
  token: 'coat',
  negotiable: true,
  description: 'Обеняв этот предмет, вы можете выбрать новую профессию из тех, что не участвуют в игре, и положить ее лицом вниз перед собой. Сбросьте свою старую профессию.'
}
export let tome = {
  name: 'Книга',
  token: 'tome',
  negotiable: true,
  description: 'Обеняв этот предмет, можете также обменяться профессиями со вторым участником сделки. Вскрытые профессии после такого обмена переворачиваются лицом вниз.'
}
export let privilege = {
  name: 'Привилегия',
  token: 'privilege',
  negotiable: true,
  description: 'Обеняв этот предмет, можете посмотреть все предметы второго участника сделки.'
}
export let sextant = {
  name: 'Секстант',
  token: 'sextant',
  negotiable: true,
  description: 'Обменяв этот предмет, выберите направление. Все игроки должны передать соседу в этом направлении любой предмет по своему выбору.'
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
  description: 'Если вы атакующий, можете добавить себе +1. Бонус не учитывается, если вы поддерживаете другого игрока.'
}
export let knives = {
  name: 'Метательные ножи',
  token: 'knives',
  negotiable: true,
  description: 'Если в дуэли вы поддерживаете атакующего, он может добавить себе +1.'
}
export let gloves = {
  name: 'Перчатки',
  token: 'gloves',
  negotiable: true,
  description: 'Если вы защищающийся можете добавить себе +1. Бонус не учитывается, если вы поддерживаете другого игрока.'
}
export let whip = {
  name: 'Кнут',
  token: 'whip',
  negotiable: true,
  description: 'Если в дуэли вы поддерживаете защищающегося, он может добавить себе +1.'
}

