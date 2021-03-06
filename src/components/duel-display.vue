<template>
  <div class="duel-display-container">
    <div class="caller-wrapper" :class="status">
      <div class="duel-pic" :class="options.caller.character.imgClass" @click.stop="select(options.caller)">
        <div class="duel-attack-token"></div>
      </div>
      <div class="duel-name">{{ isCaller ? 'Вы' : options.caller.character.name }}</div>
      <div class="duel-caller-points" v-if="showScore">
        <div class="duel-overall-score">
          <div :class="callerScoreStatus">
          <button class="duel-supporter-token" title="Добавить жетон" v-if="isCaller" :class="{active: callerDuel.tokens > 0}" @click.stop="addToken(callerDuel)"></button>
            {{ callerOverall }}
          </div>
        </div>
        <div class="duel-supporters">
          <div class="duel-supporter" v-for="supporter in callerDuel.supporters">
            <div class="duel-supporter-name" :class="{self: supporter.uid === options.self.uid}">
              {{* supporter.uid === options.self.uid ? 'Вы' : supporter.name }}
            </div>
            <div class="duel-supporter-score">
              <button class="duel-supporter-token" title="Добавить жетон" v-if="supporter.uid === options.self.uid" :class="{active: supporter.tokens > 0}" @click.stop="addToken(supporter)"></button>
              {{ supporter.base + supporter.permanent + supporter.optional }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="callee-wrapper" :class="status">
      <div class="duel-pic" :class="options.callee.character.imgClass" @click.stop="select(options.callee)">
        <div class="duel-defend-token"></div>
      </div>
      <div class="duel-name">{{ options.callee.uid === options.self.uid ? 'Вы' : options.callee.character.name }}</div>
      <div class="duel-callee-points" v-if="showScore">
        <div class="duel-overall-score">
          <div :class="calleeScoreStatus">
          <button class="duel-supporter-token" title="Добавить жетон" v-if="isCallee" :class="{active: calleeDuel.tokens > 0}" @click.stop="addToken(calleeDuel)"></button>
            {{ calleeOverall }}
          </div>
        </div>
        <div class="duel-supporters">
          <div class="duel-supporter" v-for="supporter in calleeDuel.supporters">
            <div class="duel-supporter-name" :class="{self: supporter.uid === options.self.uid}">
              {{* supporter.uid === options.self.uid ? 'Вы' : supporter.name }}
            </div>
            <div class="duel-supporter-score">
              <button class="duel-supporter-token" title="Добавить жетон" v-if="supporter.uid === options.self.uid" :class="{active: supporter.tokens > 0}" @click.stop="addToken(supporter)"></button>
              {{ supporter.base + supporter.permanent + supporter.optional }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import tc from '../turn/turncoordinator'
import EventEmitter from '../core/eventemitter'
import {ModalOK} from '../modal'

let selectableStateCache;
export default {
  props: ['options'],
  ready () {
    if (this.isCaller || this.isCallee) {
      this.status.selectable = false;
      if (this.isCallee) this.status.isDefend = true;
      else this.status.isAttack = true;

      this.showSelectReadyModal();
    }
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      status: {
        selectable: true,
        isAttack: false,
        isDefend: false,
        'win-attack': false,
        'win-defence': false,
        'no-score-board': false
      },
      showScore: false,
      interactable: true,
      callerDuel: {},
      calleeDuel: {}
    }
  },
  computed: {
    isCaller () { return this.options.self.uid === this.options.caller.uid },
    isCallee () { return this.options.self.uid === this.options.callee.uid },
    callerOverall () { return this.calculateOverall(this.callerDuel) },
    calleeOverall () { return this.calculateOverall(this.calleeDuel) },
    callerScoreStatus () { return this.getScoreClassObject(this.callerOverall) },
    calleeScoreStatus () { return this.getScoreClassObject(this.calleeOverall) }
  },
  methods: {
    select (player) {
      if (!this.status.selectable) return;

      if (!this.status.isDefend && !this.status.isAttack) this.showSelectReadyModal();

      if (player.uid === this.options.caller.uid) {
        this.status.isAttack = true;
        this.status.isDefend = false;
      } else {
        this.status.isAttack = false;
        this.status.isDefend = true;
      }
    },
    calculateOverall (duelist) {
      if (!duelist.base) return 0;

      let score = duelist.base + duelist.permanent + duelist.optional;

      duelist.supporters.forEach(supporter => {
        score += supporter.base + supporter.permanent + supporter.optional;
      });

      return score;
    },
    getScoreClassObject (score) {
      let ind = 1;
      if (score > 2) ind = score;
      if (score > 9) ind = 9;

      return { ['duel-score-' + ind]: true }
    },
    addToken (player) {
      if (!this.interactable) return;
      if (player.busy !== false || player.tokens === 0) return;

      player.busy = true;
      this.$dispatch('duel.spend-token', player);
    },
    getPlayer (uid) {
      let player;
      let role = 'attack';
      if (this.callerDuel.uid === uid) player = this.callerDuel;
      else if (this.calleeDuel.uid === uid) {
        player = this.calleeDuel;
        role = 'defence';
      } else {
        player = this.callerDuel.supporters.find(x => x.uid === uid);
        role = 'supAttack';
        if (player === undefined) {
          player = this.calleeDuel.supporters.find(x => x.uid === uid);
          role = 'supDefence';
        }
      }

      return {player, role};
    },
    showSelectReadyModal () {
      this.em.once('modal.exec', (arg) => {
        if (arg === null) return; //modal dismissed

        this.status.selectable = false;

        let playerToSupport;
        if (this.isCallee || this.isCaller) playerToSupport = null;
        else {
          playerToSupport = this.status.isAttack
                            ? this.options.caller
                            : this.options.callee
                            ;
        }
        this.$dispatch('duel-selected', playerToSupport);
      });

      this.em.emit('log', 's', 'Потвердите готовность');
      this.em.emit('modal.show', new ModalOK('Готов'));
    }
  },
  events: {
    'duel-select-cancel' () {
      this.status.selectable = false;
      selectableStateCache = false;
      if (!this.status.isDefend && !this.status.isAttack) this.showSelectReadyModal();
    },
    'duel-select-end' () {
      this.status.selectable = false;
      selectableStateCache = false;

      this.em.emit('modal.dismiss');
    },
    'gm-restrict-turns' () {
      selectableStateCache = this.status.selectable;
      this.status.selectable = false;
    },
    'gm-allow-turns' () {
      this.status.selectable = selectableStateCache;
    },
    'duel-begin' ({caller, callee}) {
      this.calleeDuel = callee;
      this.callerDuel = caller;
      this.showScore = true;
    },
    'duel.spent-token' (uid) {
      let player = this.getPlayer(uid).player;

      player.tokens--;
      player.busy = false;
      player.permanent++;
    },
    'duel-result' () {
      this.interactable = false;
      this.status['no-score-board'] = true;
      let winner;

      if (!this.options.winner) {
        if (this.callerOverall > this.calleeOverall) {
          winner = this.options.caller;
          this.status['win-attack'] = true;
        } else if (this.callerOverall < this.calleeOverall) {
          winner = this.options.callee;
          this.status['win-defence'] = true;
        } else winner = false;
      } else {
        winner = this.options.winner;
        if (winner === this.options.caller) this.status['win-attack'] = true;
        else this.status['win-defence'] = true;
      }

      this.$dispatch('duel-result-calculated', winner);
    },
    'duel-player-ready' (uid) {
      tc.turns.updatePool('duel.player.ready');
    },
    'duel-card-toggle' ({card, isSelected}) {
      tc.turns.updatePool('duel.card', false, {card: card.uid, isSelected});
    },
    'gm-duel-card' ({uid, card, isSelected}) {
      let {player, role} = this.getPlayer(uid);
      let cardObj = player.hand.find(x => x.uid === card);

      if (!cardObj.onDuel) return;

      let score = player.optional;
      player.optional = cardObj.onDuel(score, role, isSelected);

      if (isSelected) {
        if (score !== player.optional) {
          this.options.em.emit('log', 'g', `${player.name} использует ${cardObj.name}`);
        } else if (this.options.self.uid === uid) {
          this.options.em.emit('log', 'a', 'Эта карта не имеет эффекта в данный момент');
        }
      }
    },
    'duel-occupation-disclosed' (duelist) {
      if (!this.showScore || !this.interactable) return;

      let {player, role} = this.getPlayer(duelist.uid);
      player.optional = duelist.occupation.onDuel(role, player.optional);
    }
  }
}
</script>

<style lang="scss">
  @import '../settings.scss';

  .duel-display-container{
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: center;
    align-content: space-around;
    align-items: flex-start;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    z-index: 2;
    width: 100%;
    > div{
      order: 0;
      flex: 0 1 auto;
      align-self: auto;
      margin: 2px 3px;
    }
  }
  .selectable{
    .duel-pic{
      cursor: pointer;
      border-color: $select;
      box-shadow: 0 0 7px fade-out($select, 0.1);
      animation: slow-flash .5s infinite alternate;
    }
  }
  .no-score-board{
    .duel-callee-points,
    .duel-caller-points{
      transition: opacity .8s ease-in-out;
      opacity: 0;
    }
  }
  .caller-wrapper{
    .duel-supporter-token{
      background: url(../assets/token-sword.jpg) no-repeat;
      background-size: cover;
    }
    &.win-attack{
      transition: all .8s ease-in-out;
      transform: translateX(60px);
    }
    &.win-defence{
      transition: opacity .8s ease-in-out;
      opacity: 0;
    }
  }
  .callee-wrapper{
    .duel-supporter-token{
      background: url(../assets/token-shield.jpg) no-repeat;
      background-size: cover;
    }
    &.win-attack{
      transition: opacity .8s ease-in-out;
      opacity: 0;
    }
    &.win-defence{
      transition: all .8s ease-in-out;
      transform: translateX(-60px);
    }
  }
  .caller-wrapper.isAttack{
    .duel-pic{
      border-color: darken($brotherhood-primary, 10);
      box-shadow: none;
      animation: none;
    }
  }
  .callee-wrapper.isDefend{
    .duel-pic{
      border-color: darken($order-primary, 10);
      box-shadow: none;
      animation: none;
    }
  }
  .duel-pic{
    height: 80px;
    width: 80px;
    border: 4px solid $dark-gray;
    border-radius: 50%;
    position: relative;
    margin: 0 auto;
  }
  .duel-defend-token {
    display: block;
    position: absolute;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid darken($order-primary, 10);
    background: url(../assets/token-shield.jpg) no-repeat;
    background-size: cover;
    bottom: -16px;
    left: calc(50% - 16px);
    box-shadow: 0 0 9px darken($order-primary, 20);
  }
  .duel-attack-token {
    @extend .duel-defend-token;
    background: url(../assets/token-sword.jpg) no-repeat;
    background-size: cover;
    border-color: darken($brotherhood-primary, 10);
    box-shadow: 0 0 9px darken($brotherhood-primary, 20);
  }
  .duel-name {
    text-align: center;
    color: $yellow;
    margin-top: 12px;
    font-size: 12px;
  }
  .duel-caller-points,
  .duel-callee-points{
    background: #cbc583;
    background: linear-gradient(135deg, rgba(184,176,92,1) 0%,rgba(203,197,131,1) 45%,rgba(203,197,131,1) 53%,rgba(184,176,92,1) 100%);
    padding: 5px;
    min-height: 150px;
    font-size: 12px;
    width: 120px;
    border: 2px solid #806949;
    box-shadow: inset 0 0 1px 1px rgba(0,0,0,0.8),
                3px 3px 15px rgba(0,0,0,0.9);
  }
  .duel-supporter{
    overflow: hidden;
  }
  .duel-supporter-name{
    float: left;
  }
  .duel-supporter-score{
    float: right;
    height: 16px;
  }
  .duel-supporter-name.self{
    color: darken($active,20);
  }
  .duel-supporter-token{
    display: inline-block;
    width: 16px;
    height: 16px;
    cursor: not-allowed;
    margin-right: 5px;
    border-radius: 50%;
    outline: none;
    opacity: 0.5;
    box-shadow: 1px 1px 3px rgba(0,0,0,0.7);
    border: 1px solid $dark-gray;
    &.active{
      opacity: 1;
      cursor: pointer;
    }
  }
  .duel-overall-score{
    text-align: center;
    font-size: 16px;
    position: relative;
    margin-top: -3px;
    margin-bottom: 3px;
    &:after{
      content: '';
      display: block;
      width: 70%;
      height: 1px;
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      margin: auto;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.67) 0%,rgba(0,0,0,0) 80%);
    }
  }
  .duel-score-1{
    text-shadow: 0 0 7px rgba(0,0,0,0.4);
  }
  .duel-score-3{
    color: #0e3463;
    text-shadow: 0 0 7px rgba(72,96,127,0.7);
  }
  .duel-score-4{
    color: #174d7b;
    text-shadow: 0 0 7px rgba(22,77,127,0.8);
  }
  .duel-score-5{
    color: #276ca7;
    text-shadow: 0 0 7px rgba(57,90,117,0.8);
  }
  .duel-score-6{
    color: #796eb2;
    text-shadow: 0 0 12px rgba(84,59,133,0.8);
  }
  .duel-score-7{
    color: #c347c0;
    text-shadow: 0 0 14px rgba(135,57,110,1);
  }
  .duel-score-8{
    color: #b92428;
    text-shadow: 0 0 12px rgba(150,27,30,1);
  }
  .duel-score-9{
    animation: duel-score-flash .4s infinite alternate;
  }
  @keyframes duel-score-flash{
  from{
    color: #961b1e;
    text-shadow: 0 0 12px rgba(150,27,30,.4);
  }
  to{
    color: #cd223a;
    text-shadow: 0 0 12px rgba(150,27,30,.4), 0 0 4px #bb7f87;
  }
}
</style>
