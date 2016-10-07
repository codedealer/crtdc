<template>
  <div></div>
  <div class="c-turn-buttons {{* player.allegiance.cssClass }}">
    <button class="c-turn-btn" :class="{'inactive': !canSpy, 'active': action == 'Spy'}" title="шпионаж" @click.stop="chooseAction('Spy')"><i class="icon-search"></i></button>
    <button class="c-turn-btn" :class="{'inactive': !canTrade, 'active': action == 'Trade'}" title="обмен" @click.stop="chooseAction('Trade')"><i class="icon-arrows-ccw"></i></button>
    <button class="c-turn-btn" :class="{'inactive': !canDuel, 'active': action == 'Duel'}" title="дуэль" @click.stop="chooseAction('Duel')"><i class="icon-shield"></i></button>
    <button class="c-turn-btn" :class="{'inactive': !canWin, 'active': action == 'Win'}" title="объявить победу" @click.stop="chooseAction('Win')"><i class="icon-flag-checkered"></i></button>
  </div>
  <div></div>
</template>

<script>
import EventEmitter from '../core/eventemitter'
import rulecoordinator from '../world/rulecoordinator'
import {order, brotherhood} from '../cards/allegiance'

export default {
  props: ['player'],
  ready () {
    this.em.on('turn.new', info => {
      this.action = '';
      if (info.uid === this.player.uid) this.myTurn = true;
    });
  },
  data () {
    return {
      myTurn: false,
      action: '',
      em: EventEmitter.getInstance()
    }
  },
  computed: {
    canSpy () { return this.myTurn },
    canTrade () { return this.myTurn && this.player.hand.length },
    canDuel () { return this.myTurn },
    canWin () {
      if (this.myTurn) {
        let canUseBag = rulecoordinator.deck.length === 0;
        let permittedTokens = [this.player.allegiance.token];

        if (canUseBag) permittedTokens.push('bag' + this.player.allegiance.token);

        if (this.player.hand.find(x => x.token === 'seal')) {
          permittedTokens = [order.token, brotherhood.token];
          if (canUseBag) {
            permittedTokens = [...permittedTokens, ...['bag' + order.token, 'bag' + brotherhood.token]];
          }
        }

        return this.player.hand.some(
          x => permittedTokens.findIndex(token => x.token === token) !== -1
          );
      } else return false;
    }
  },
  methods: {
    chooseAction(action) {
      if (this[`can${action}`] === false) return false;

      this.action = action;
      this.myTurn = false; //prevent re-clicking

      this.em.emit('turn.action', this.action.toLowerCase());
    }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';

  .c-turn-buttons{
    margin-top: 0;
    height: $chat-input-container-height;
    &.order .c-turn-btn{
      background: linear-gradient(to bottom, rgba(19,75,114,1) 0%,rgba(1,26,84,1) 100%);
      color: #44B9CE;
      &:not(.active){
        box-shadow: inset 0 1px 1px rgba(34, 99, 142, 0.8), inset 0 -1px 0px rgba(63, 59, 113, 0.2), 0 9px 16px 0 rgba(0, 0, 0, 0.3), 0 4px 3px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px #150a1e;
        text-shadow: 0 0 21px rgba(141, 221, 239, 0.5), 0 -1px 0 #081C66;
        &:hover{
          color: #68D4E8;
          text-shadow: 0 0 21px rgba(159, 215, 234, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #081C66;
        }
      }
      &.active{
        box-shadow: 0 9px 16px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px #170c22, 0 2px 1px 0 rgba(12, 122, 173, 0.4), inset 0 0 4px 3px rgba(15, 8, 22, 0.2);
        background: linear-gradient(to bottom, rgba(2,36,58,1) 0%,rgba(24,68,122,1) 100%);
        text-shadow: 0 0 21px rgba(159, 215, 234, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #081C66;
        color: #e4e3ce;
        &:before, &:after{
          background-image: linear-gradient(rgba(91, 35, 105, 0), #0B546B 41%, #0B546B 59%, rgba(91, 35, 105, 0));
          box-shadow: -2px 0 6px 0 #5b2369;
        }
      }
    }
    &.brotherhood .c-turn-btn{
      background: linear-gradient(to bottom, rgba(140,18,42,1) 0%,rgba(61,3,2,1) 100%);
      color: #E8769E;
      &:not(.active){
        box-shadow: inset 0 1px 1px rgba(198, 29, 89, 0.8), inset 0 -1px 0px rgba(63, 59, 113, 0.2), 0 9px 16px 0 rgba(0, 0, 0, 0.3), 0 4px 3px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px #150a1e;
        text-shadow: 0 0 21px rgba(141, 221, 239, 0.5), 0 -1px 0 #3A0202;
        &:hover{
          color: #FC7EAA;
          text-shadow: 0 0 21px rgba(252, 176, 170, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #081C66;
        }
      }
      &.active{
        box-shadow: 0 9px 16px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px #170c22, 0 2px 1px 0 rgba(247, 54, 93, 0.4), inset 0 0 4px 3px rgba(15, 8, 22, 0.2);
        background: linear-gradient(to bottom, rgba(61,3,2,1) 0%,rgba(112,14,14,1) 100%);
        text-shadow: 0 0 21px rgba(159, 215, 234, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #081C66;
        color: #e4e3ce;
        &:before, &:after{
          background-image: linear-gradient(rgba(91, 35, 105, 0), #870505 41%, #870505 59%, rgba(91, 35, 105, 0));
          box-shadow: -2px 0 6px 0 #5b2369;
        }
      }
    }
  }

  .c-turn-btn{
    width: 50px;
    cursor: pointer;
    height: $chat-input-container-height;
    border: 0;
    outline-width: 0px;
    color: #a675b3;
    text-align: center;
    display: inline-block;
    position: relative;
    float: left;
    &:not(.active){
      box-shadow: inset 0 1px 1px rgba(111, 55, 125, 0.8), inset 0 -1px 0px rgba(63, 59, 113, 0.2), 0 9px 16px 0 rgba(0, 0, 0, 0.3), 0 4px 3px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px #150a1e;
      background-image: linear-gradient(#3b2751, #271739);
      text-shadow: 0 0 21px rgba(223, 206, 228, 0.5), 0 -1px 0 #311d47;
      transition: color 200ms linear, text-shadow 500ms linear;
      &:hover{
        color: #caadd2;
        text-shadow: 0 0 21px rgba(223, 206, 228, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #2a153c;
      }
    }
    &.active{
      box-shadow: 0 9px 16px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px #170c22, 0 2px 1px 0 rgba(121, 65, 135, 0.5), inset 0 0 4px 3px rgba(15, 8, 22, 0.2);
      background-image: linear-gradient(#1f132e, #311d47);
      text-shadow: 0 0 21px rgba(223, 206, 228, 0.5), 0 0 10px rgba(223, 206, 228, 0.4), 0 0 2px #2a153c;
      color: #e4e3ce;
      z-index: 30;
      &:before{
        position: absolute;
        display: block;
        content: "";
        width: 1px;
        height: 30px;
        top: 1px;
        left: -2px;
        background-image: linear-gradient(rgba(91, 35, 105, 0), #5b2369 41%, #5b2369 59%, rgba(91, 35, 105, 0));
        box-shadow: -2px 0 6px 0 #5b2369;
      }
      &:after{
        position: absolute;
        display: block;
        content: "";
        width: 1px;
        height: 30px;
        top: 1px;
        right: -2px;
        background-image: linear-gradient(rgba(91, 35, 105, 0), #5b2369 41%, #5b2369 59%, rgba(91, 35, 105, 0));
        box-shadow: 2px 0 6px 0 #5b2369;
      }
    }
    &.inactive:not(.active){
      color: #555 !important;
      cursor: not-allowed;
      text-shadow: 0 -1px 0 #311d47 !important;
    }
    &:last-of-type{
      border-radius: 0 7px 7px 0;
      &:after{
        display: none;
      }
    }
    &:first-of-type{
      border-radius: 7px 0 0 7px;
      &:before{
        display: none;
      }
    }
  }
</style>
