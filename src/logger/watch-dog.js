import Timer from '../world/timer'
import EventEmitter from '../core/eventemitter'

const POLICY = {
  observeInterval: 1500,
  violationLevelCooldown: 20000,
  allowedNum: 3,
  banTime: {
    0: 0,
    1: 1500,
    2: 10000,
    3: 60000
  }
}

export default {
  em: EventEmitter.getInstance(),
  sendIntervalTimer: null,
  banTimer: null,
  violationTimer: null,
  sent: 0,
  violationLevel: 0,
  guard () {
    //restrict sending messages if ban is in effect
    if (this.banTimer !== null && !this.banTimer.ended) return false;

    if (this.sendIntervalTimer === null || this.sendIntervalTimer.ended) {
      this.sendIntervalTimer = new Timer(POLICY.observeInterval, false, () => { this.sent = 0 }, this, POLICY.observeInterval);
    }

    this.sent++;
    if (this.sent > POLICY.allowedNum) {
      this.violationLevel++;
      if (this.violationLevel > 3) this.violationLevel = 3;

      let banTime = POLICY.banTime[this.violationLevel];

      this.banTimer = new Timer(banTime, false, this.onBanComplete, this, banTime);

      this.em.emit('self.player.chat.ban', banTime / 1000, this.violationLevel);

      return false;
    }

    return true;
  },
  onBanComplete () {
    this.em.emit('self.player.chat.ban.lifted');

    if (this.violationTimer && !this.violationTimer.ended) this.violationTimer.cancel();

    this.violationTimer = new Timer(POLICY.violationLevelCooldown, false, () => {
      this.violationLevel = this.violationLevel <= 1 ? 0 : this.violationLevel - 1;
    }, this, POLICY.violationLevelCooldown);
  }
}
