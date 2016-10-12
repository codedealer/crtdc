export let diplomat = {
  name: 'Дипломат',
  token: 'diplomat',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру и только в свой ход вы можете потребовать у другого игрока, чтобы он обменял вам определенный предмет. Если у игрока нет названного предмета, то ваш ход тут же заканчивается.'
}

export let hypno = {
  name: 'Гипнотизер',
  token: 'hypno',
  disclosed: false,
  availability: false,
  description: 'Если вы атакующий, то сразу после того, как кто-то заявил о своём желании поддержать одну из сторон, вы можете заставить его не вмешиваться в эту дуэль.'
}

export let seer = {
  name: 'Ясновидящий',
  token: 'seer',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру и только в свой ход вы можете посмотреть колоду предметов и выбрать 2 из них. Затем перемешайте колоду и положите выбранные предметы в любом порядке сверху.'
}

export let doctor = {
  name: 'Доктор',
  token: 'doctor',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру, сразу после дуэли, вы можете отменить результат этой дуэли.'
}

export let priest = {
  name: 'Священник',
  token: 'priest',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру, до того как другие заявили, кого они поддерживают, вы можете предотвратить дуэль. Если атакующий имеет хотя бы 2 предмета, он должен отдать вам один предмет по своему выбору. Ход атакующего тут же заканчивается.'
}

export let guard = {
  name: 'Телохранитель',
  token: 'guard',
  disclosed: false,
  availability: false,
  description: 'Если вы поддерживаете игрока, он получает +1.'
}

export let alchemist = {
  name: 'Алхимик',
  token: 'alchemist',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру вы можете назначить победителя дуэли, но только если вы сами не являетесь атакующим или защищающимся в дуэли.'
}

export let thug = {
  name: 'Головорез',
  token: 'thug',
  disclosed: false,
  availability: false,
  description: 'Вы можете добавить себе +1 в дуэли, если вы атакующий.'
}

export let duelist = {
  name: 'Дуэлянт',
  token: 'duelist',
  disclosed: false,
  availability: false,
  description: 'Один раз за игру, если вы атакуете или защищаетесь, вы можете заявить, что никто не должен оказывать поддержку в этой дуэли. Также вы получаете +1 в этой дуэли.'
}

export let master = {
  name: 'Магистр',
  token: 'master',
  disclosed: false,
  availability: false,
  description: 'Вы можете добавить +1 в дуэли, если вы защищающийся.'
}
