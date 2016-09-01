<template>
 <section class="chat-container c-widget">
  <div class="chat-message-box">
    <div v-for="m in messages">
      <div class="chat-message {{* m.cssClass}}">{{* m.message}}</div>
    </div>
  </div>
  <div class="chat-input-container">
    <input type="text" class="chat-input">
    <button class="btn">Отправить</button>
  </div>
 </section>
</template>

<script>
import Logger from '../logger'
import config from '../../package.json'
import EventEmitter from '../core/eventemitter'

export default {
  props: ['players', 'user'],
  ready () {
    let logger = new Logger(this.messages);
    logger.s(`Добро пожаловать в игру. Версия ${config.version}`);

    this.em.on('sv.player_join', uid => { logger.s(`${uid} присоединился к игре`) });
    this.em.on('sv.player_leave', uid => { logger.s(`${uid} вышел`) });
    this.em.once('gm.start', players => {
      logger.s(`Игра на ${players.length}`);
      if (players.length % 2) logger.s('Сторона в меньшинстве должна собрать только два предмета');
    });

    this.em.on('turn.new', info => {
      if (info.uid === this.user.uid) logger.se('Ваш ход!');
      else logger.g(`Ходит ${this.players[info.index].character.name}`);
    });

    this.em.on('turns.action.skip', uid => {
      if (uid === this.user.uid) logger.se('Вы пропускаете ход');
      else {
        let caller = this.players.find(x => x.uid === uid);
        logger.g(`${caller.character.name} пропускает ход`);
      }
    });

    this.em.on(['turn.action.spy',
                'turn.action.trade',
                'turn.action.trade_result',
                'turn.action.duel',
                'turn.action.give',
                'turn.action.win'], ({uid, actionObject}) => {
      let callerCharacter = this.players.find(x => x.uid === uid);
      let callee = this.players.find(x => x.uid === actionObject.callee);

      switch (actionObject.action) {
        case 'spy':
          let card = callee.hand[actionObject.args.index].name;

          logger.g(`${callerCharacter.character.name} шпионит за ${callee.character.name}`);
          if (uid === this.user.uid) {
            logger.se(`${callee.character.name} хранит у себя ${card}!`);
          } else if (callee.uid === this.user.uid) {
            logger.se(`${callerCharacter.character.name} теперь знает про ${card}!`);
          }
          break;
        case 'trade':
          let cardIn = callerCharacter.hand.find(x => x.uid === actionObject.args.card);

          logger.g(`${callerCharacter.character.name}: ${callee.character.name}, не желаете совершить обмен?`);
          if (callee.uid === this.user.uid) {
            logger.se(`${callerCharacter.character.name} предлагает ${cardIn.name}`);
          }
          break;
        case 'trade_result':
          if (actionObject.args.exchange === false) {
            logger.g(`${callerCharacter.character.name}: нет, спасибо`);
            if (this.user.uid === callee.uid) logger.se('Сделка не удалась');
          } else {
            logger.g(`${callerCharacter.character.name}: да, извольте`);
          }
          break;
        case 'duel':
          logger.g(`${callerCharacter.character.name}: ${callee.character.name}, я бросаю Вам вызов!`);
          if (this.user.uid === uid || this.user.uid === actionObject.callee) {
            logger.g('Ожидаем поддержки остальных игроков');
          } else {
            logger.se('Выберите, кому из игроков оказать поддержку');
          }
          break;
        case 'give':
          let cardGiven = callerCharacter.hand.find(x => x.uid === actionObject.args.card);
          if (this.user.uid === actionObject.callee) logger.se(`${callerCharacter.character.name} передал вам ${cardGiven.name}`);
          else logger.g(`${callerCharacter.character.name} передал карту ${callee.character.name}`);
          break;
        case 'win':
          if (callerCharacter.allegiance.org === 'order') {
            logger.g(`${callerCharacter.character.name}: ${callerCharacter.allegiance.title} обладает тремя ключами и требует полного покорения Братства!`);
          } else {
            logger.g(`${callerCharacter.character.name}: ${callerCharacter.allegiance.title} обладает тремя кубками и требует полного покорения Ордена!`);
          }

          if (this.user.uid === callerCharacter.uid) logger.se('Выберите членов организации, которые обладают предметами, необходимыми для победы');
          break;
        default:
          logger.g('Что-то произошло, но никто ничего не понял');
      }
    });

    this.em.on('board.player-selector.init', options => {
      logger.s('Выберите ' + (options.numPlayers > 1 ? 'игроков' : 'игрока'));
    });
    this.em.on('hand.select', options => {
      logger.s('Выберите ' + (options.numCards > 1 ? 'карты' : 'карту'));
    });

    this.em.on('gm.got_token', pl => {
      if (pl.uid === this.user.uid) logger.se('Вы получаете жетон');
      else logger.g(`${pl.character.name} получает жетон!`);
    });
    this.em.on('deck.card.got', (card, player = false) => {
      if (player === false || player.uid === this.user.uid) logger.se(`Вы получили ${card.name}`);
      else if (player !== false) logger.g(`${player.character.name} получает карту`);
    });
    this.em.on('gm.hand_limit.result', player => {
      if (player === false) return;
      if (player.uid === this.user.uid) logger.a('Вы превысили лимит карт!');
      else logger.a(`${player.character.name} превысил лимит карт!`);
    });
    this.em.on('gm.occupation.disclosed', player => {
      logger.g(`Оказывается, ${player.character.name} — ${player.occupation.name}!`);
    });

    this.em.on('gm.deck.empty', () => {
      logger.g('Колода пуста!');
    });

    this.em.on('duel.begin', () => logger.g('Дуэль начинается!'));
    this.em.on('duel.ready', () => logger.se('Ожидаем, когда все закончат ход'));
    this.em.on('duel.spent_token', player => logger.g(`${player.character.name} использует жетон`));
    this.em.on('duel.result.calculated', winner => {
      if (winner === false) logger.g('Ничья!');
      else if (winner.uid === this.user.uid) logger.se('Вы победили!');
      else logger.g(`${winner.character.name} побеждает в дуэли!`);
    });
    this.em.on('duel.choose_prize', () => { logger.se('Вы можете взять любую карту побежденного или узнать его организацию') });
    this.em.on('duel.one_card', () => { logger.a('У соперника только одна карта, вы будете вынуждены обменяться с ним') });
    this.em.on('duel.prize.take', ({uid, actionObject}) => {
      let winner = this.players.find(x => x.uid === uid);
      let loser = this.players.find(x => x.uid === actionObject.callee);
      if (actionObject.exchange) {
        logger.g(`${winner.character.name} меняется картами с ${loser.character.name}`);
      } else {
        logger.g(`${winner.character.name} берет карту у ${loser.character.name}`);
      }
    });
    this.em.on('duel.prize.learn', ({uid, actionObject}) => {
      let winner = this.players.find(x => x.uid === uid);
      let loser = this.players.find(x => x.uid === actionObject.callee);
      logger.g(`${winner.character.name} узнает тайную организацию ${loser.character.name}`);
    });

    this.em.on('gm.win', winners => {
      logger.a(`${winners[0].allegiance.title} побеждает!`);
      if (winners.some(x => x.uid === this.user.uid)) logger.se('Вы победили!');
      else logger.se('Вы проиграли!');
    });

    this.em.on('log', logger.onEvent.bind(logger));
  },
  data () {
    return {
      messages: [],
      em: EventEmitter.getInstance()
    }
  }
}
</script>

<style scoped lang="scss">
@import '../settings.scss';

.chat-container{
  min-width: $chat-width;
  width: $chat-width;
  font-size: 12px;
  color: $system-gray;
  background: #2c3e4f;
}
.chat-message-box{
  height: $control-bar-height - $chat-input-container-height;
  overflow-y: scroll;
}
.chat-input-container{
  height: $chat-input-container-height;
}
.chat-input{
  width: 220px;
  height: $chat-input-container-height;
  display: inline;
}
.btn{
  display: inline;
  height: $chat-input-container-height;
  width: 80px;
  float: right;
  font-size: 11px;
}
.chat-message{
  margin: 0 5px;
}
.game{
  color: $game-blue;
}
.self{
  color: $active;
}
.attention{
  color: $orange;
}
</style>
