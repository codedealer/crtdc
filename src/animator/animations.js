import Timer from '../world/promise-timer'
import Settings from '../world/settings'

import Vue from 'vue'

export function drawCard (em, player) {
  return new Promise((resolve, reject) => {
    em.emit('cardback.show', 0, 0);

    Vue.nextTick(() => {
      em.emit('animation.destination', 0, player);

      let timer = new Timer(Settings.ANIM_TRANSITION_TIME);
      timer.then(() => {
        em.emit('animation.hide', 0);
        resolve();
      });
    });
  });
}

export function getToken (em, player) {
  return new Promise((resolve, reject) => {
    em.emit('token.show', 0, 0);

    Vue.nextTick(() => {
      em.emit('animation.destination', 0, player);

      let timer = new Timer(Settings.ANIM_TRANSITION_TIME);
      timer.then(() => {
        em.emit('animation.hide', 0);
        resolve();
      });
    });
  });
}
