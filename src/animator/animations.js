import Timer from '../world/promise-timer'
import Settings from '../world/settings'

import Vue from 'vue'

function atomicAnimation (em, animationName, index, start, end) {
  return new Promise((resolve, reject) => {
    em.emit(animationName, index, start);

    Vue.nextTick(() => {
      em.emit('animation.destination', index, end);

      let timer = new Timer(Settings.ANIM_TRANSITION_TIME);
      timer.then(() => {
        em.emit('animation.hide', index);
        resolve();
      });
    });
  });
}

export function drawCard (em, player) {
  return atomicAnimation(em, 'cardback.show', 0, 0, player);
}

export function giveCard (em, giver, taker) {
  return atomicAnimation(em, 'cardback.show', 0, giver, taker);
}

export function getToken (em, player) {
  return atomicAnimation(em, 'token.show', 0, 0, player);
}

export function spendToken (em, player) {
  return atomicAnimation(em, 'token.show', 0, player, 0);
}

export function swapCards (em, player1, player2) {
  return Promise.all([
    atomicAnimation(em, 'cardback.show', 0, player1, player2),
    atomicAnimation(em, 'cardback.show', 1, player2, player1)
  ]);
}
