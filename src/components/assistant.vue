<template>
  <div class="i-assistant-container">
    <div class="i-assistant-deck-bar">
      <span>Колода: {{ deck }}</span>
      <span>Жетоны: {{ tokens }}</span>
    </div>
    <div class="i-assistant-player-container" :class="allegianceClass">
      <div class="i-assistant-allegiance">
        <h3 v-if="showAllegiance">{{ target.allegiance.title }}</h3>
      </div>
      <div class="i-assistant-stats-container">
        <div class="i-assistant-cards">{{ target.hand.length }}</div>
        <div class="i-assistant-pic" :class="target.character.imgClass"></div>
        <div class="i-assistant-tokens">{{ target.tokens }}</div>
      </div>
      <div class="i-assistant-player-name">{{ target.character.name }}</div>
    </div>
    <div class="i-assistant-occupation-container">
      <header>{{ showOccupation ? target.occupation.name : '???' }}</header>
      <div class="i-assistant-occupation-description" v-if="showOccupation">{{ target.occupation.description }}</div>
    </div>
    <button class="i-assistant-occupation-button" :class="occupationStatus" title="{{occupationTitle}}" v-show="showOccupation" @click.stop="activateOccupation()"><i class="icon-certificate"></i></button>
  </div>
</template>

<script>
import rulecoordinator from '../world/rulecoordinator'
import {brotherhood, order} from '../cards/allegiance'

import Vue from 'vue';

export default {
  props: ['options'],
  data () {
    return {
      target: this.options.players[this.options.selfIndex],
      globalTurn: true,
      gameFinished: false,
      classObject: {
        'default-canvas': true,
        [brotherhood.cssClass]: false,
        [order.cssClass]: false
      },
      occupationStatusObject: {
        available: false,
        active: false,
        activated: false
      },
      occupationBusy: false
    }
  },
  computed: {
    showAllegiance () {
      if (this.gameFinished) return true;
      if (this.target.uid === this.options.user.uid) return true;

      return this.options.players[this.options.selfIndex].known.findIndex(p => p.uid === this.target.uid) >= 0;
    },
    allegianceClass () {
      let co = Object.assign({}, this.classObject);

      if (this.showAllegiance) {
        co[this.target.allegiance.cssClass] = true;
      }

      return co;
    },
    deck () { return rulecoordinator.deck.length },
    tokens () { return rulecoordinator.tokens },
    showOccupation () {
      if (this.gameFinished) return true;
      if (this.target.uid === this.options.user.uid) return true;

      return this.target.occupation.disclosed;
    },
    occupationStatus () {
      let o = Object.assign({}, this.occupationStatusObject);

      o.available = this.target.uid === this.options.user.uid
      ? (this.target.occupation.availability && this.globalTurn && !this.gameFinished)
      : false;

      o.active = this.target.occupation.disclosed && this.target.occupation.continuous;

      o.activated = this.target.occupation.disclosed && !this.target.occupation.continuous;
      return o;
    },
    occupationTitle () {
      let s = this.occupationStatus;
      let d = this.target.occupation.disclosed;

      if (!s.available && !d) return 'Нельзя активировать в данный момент';

      if (s.available && !d) return 'Активировать профессию';

      if (s.active) return 'Эффект активен';

      if (s.activated) return 'Профессия была активирована';
    }
  },
  events: {
    'as.change-target' (player) {
      this.target = player || this.options.players[this.options.selfIndex];
    },
    'as-allow' () {
      this.globalTurn = true;
    },
    'as-restrict' () {
      this.globalTurn = false;
    },
    'as-start' () {
      Vue.nextTick(() => {
        this.target = null;
      });
      Vue.nextTick(() => {
        this.target = this.options.players[this.options.selfIndex];
      });
    },
    'as-win' () {
      this.gameFinished = true;
    },
    'as-occupation-disclosed' (player) {
      if (player.uid === this.options.user.uid) {
        this.occupationBusy = false;
      }
    },
    'as-turn-action' () {
      this.options.players.forEach(player => {
        let o = player.occupation;
        if (o.disclosed) return;

        if (o.onSelfTurn) {
          o.availability = false;
        }
      });
    },
    'as-turn-new' (info) {
      let uid = info.uid;

      this.options.players.forEach(player => {
        let o = player.occupation;
        if (o.disclosed) return;

        if (o.onTurn ||
            (o.onSelfTurn && player.uid === uid)) {
          o.availability = true;
        }
      });
    }
  },
  methods: {
    activateOccupation () {
      if (!this.globalTurn || this.gameFinished) return;
      if (this.target.uid === this.options.user.uid &&
        this.occupationStatus.available &&
        this.occupationBusy === false) {
        this.occupationBusy = true;
        this.em.emit('gm.occupation.disclose', this.target);
      }
    }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';
@import '../cards/characters.scss';

.i-assistant-container{
  overflow: hidden;
  position: relative;
  .brotherhood {
    background: url(../assets/brotherhood.jpg) no-repeat center;
    background-size: contain;
  }
  .order {
    background: url(../assets/order.jpg) no-repeat center;
    background-size: contain;
  }
}

.i-assistant-deck-bar{
  height: $assistant-deck-bar-height;
  box-shadow: 0 0 21px;
  text-shadow: 1px 1px 4px #000;
  padding: 0px 15px;
  line-height: $assistant-deck-bar-height;
  text-align: center;
  background: url(../assets/wood.jpg) repeat-x, sienna;
  span:nth-child(1){
    margin-right: 30px;
  }
}

.i-assistant-player-container{
  height: $control-bar-height - $assistant-deck-bar-height;
}

.i-assistant-stats-container{
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-content: center;
  align-items: center;
  margin-top: 35px;
  > div {
    order: 0;
    flex: 0 1 auto;
    align-self: auto;
  }
}

%assist-font-rules{
  color: $yellow;
  text-shadow: 3px 3px 18px #000, -3px -3px 18px #000;
  text-align: center;
  line-height: 64px;
  font-size: 40px;
}

.i-assistant-cards{
  height: 64px;
  width: 80px;
  background: url(../assets/cards-icon.png) no-repeat center;
  @extend %assist-font-rules;
}

.i-assistant-pic{
  height: 90px;
  width: 90px;
  border: 4px solid $dark-gray;
  clip-path: circle(50% at 50% 50%);
  border-radius: 50%;
}

.i-assistant-tokens{
  background: url(../assets/token.jpg) no-repeat center, rgba(0,0,0,0.5);
  background-size: cover;
  width: 65px;
  height: 64px;
  clip-path: circle(50% at 50% 50%);
  border-radius: 50%;
  margin-right: 3px;
  border: 3px solid $dark-gray;
  @extend %assist-font-rules;
  line-height: 60px; /* wtf */
}

.i-assistant-player-name{
  color: #eee;
  margin-top: 5px;
  font-size: 24px;
  text-align: center;
}

.default-canvas{
  background: url(../assets/default-canvas.jpg) no-repeat center;
  background-size: contain;
}

.i-assistant-allegiance {
  height: 30px;
  h3 {
    margin: 0;
    padding: 12px;
    text-align: center;
    /*text-shadow: 1px 2px 3px #444;*/
  }
}

.order .i-assistant-allegiance h3 {
  color: $order-primary;
}

.brotherhood .i-assistant-allegiance h3 {
  color: $brotherhood-primary;
}

.i-assistant-occupation-container{
  transform: translateY(-$assistant-occupation-header-height);
  box-shadow: 0 0 21px;
  cursor: pointer;
  transition: all .3s ease-in-out;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.35) 100%), url(../assets/canvas.jpg);
  &:hover{
    transform: translateY(-100%);
  }
  header{
    height: $assistant-occupation-header-height;
    padding-top: 4px;
    font-size: 24px;
  }
}

.i-assistant-occupation-button{
  position: absolute;
  top: $control-bar-height - 36px;
  font-size: 24px;
  right: 0;
  padding: 0;
  margin: 0;
  cursor: not-allowed;
  color: $dark-gray;
  background: none;
  border: none;
  outline: none;
  text-shadow: 0px 0px 3px #000;
  &.activated{
    animation: none;
    color: $black;
    cursor: default;
  }
  &.available{
    animation: occupation-flick .5s infinite alternate;
    cursor: pointer;
  }
  &.active{
    animation: none;
    color: $active;
    cursor: default;
  }
}

@keyframes occupation-flick {
  from {
    color: $active;
    text-shadow: 0 0 21px rgba(76, 7, 76, 0.8), 0 0 2px #2a153c;
  }
  to {
    color: lighten($active, 8);
    text-shadow: 0 0 21px rgba(118, 14, 150, 0.8), 0 0px 2px #311d47;
  }
}

.i-assistant-occupation-description{
  padding: 0 30px 30px;
  font-size: 12px;
}
</style>
