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

export function getToken (em, player) {
  return atomicAnimation(em, 'token.show', 0, 0, player);
}

export function spendToken (em, player) {
  return atomicAnimation(em, 'token.show', 0, player, 0);
}
