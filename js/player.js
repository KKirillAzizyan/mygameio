// ============ КЛЕТКА / ОРГАНИЗМ — базовая сущность игрока, ботов, NPC ============
(function (G) {
  const U = G.U, C = G.C;

  function newCell(x, y, mass) {
    return { x, y, vx: 0, vy: 0, fx: 0, fy: 0, mass, r: U.massToR(mass), mergeT: 0 };
  }

  class Organism {
    constructor(state, opts) {
      this.state = state;
      this.name = opts.name || 'Клетка';
      this.color = opts.color || U.hexHsl(U.rand(0, 360), 70, 55);
      this.isPlayer = !!opts.isPlayer;
      this.cells = [newCell(opts.x, opts.y, opts.mass || C.START_MASS)];
      this.alive = true;

      this.energy = 0;
      this.eff = {};          // name -> {t, v}
      this.cds = {};          // кулдауны способностей
      this.trapCds = {};      // кулдауны ловушек
      this.buildCds = {};     // кулдауны строек
      this.evo = { predator: 0, tank: 0, hunter: 0, parasite: 0, mutant: 0 };
      this.evoTotal = 0;
      this.milestoneIdx = 0;
      this.pendingEvo = false;

      this.king = false; this.kingT = 0;
      this.combo = 0; this.comboT = 0;
      this.kills = 0;
      this.bounty = false;
      this.attach = null;     // {host, t} — паразитизм
      this.portalCd = 0;
      this.mutantT = 0;

      this.aimX = opts.x; this.aimY = opts.y;
      this.lastEat = 0;       // сек с последнего поедания
      this.decaying = false;
      this.spawnT = 3;        // защита при спавне
      this.s = G.evo.stats(this);
      this.energy = this.maxEnergy();
      this.addEff('shield', 3, 1); // защита при появлении
    }

    /* ---------- масса ---------- */
    totalMass() { let m = 0; for (const c of this.cells) m += c.mass; return m; }
    get mass() { return this.totalMass(); }
    mainCell() {
      let best = this.cells[0];
      for (const c of this.cells) if (c.mass > best.mass) best = c;
      return best;
    }
    get r() { return this.mainCell().r; }

    gainMass(amt, src) {
      if (!this.alive || amt <= 0) return;
      this.mainCell().mass += amt;
      if (src !== 'regen' && this.isPlayer) G.contracts.onMassGain(this.state, this, amt);
    }
    spendMass(amt) {
      const m = Math.min(amt, this.mass - C.MIN_MASS);
      if (m <= 0) return false;
      let left = m;
      // вычитаем из самой большой клетки
      const c = this.mainCell();
      c.mass -= left;
      if (c.mass < 1 && this.cells.length > 1) this.cells.splice(this.cells.indexOf(c), 1);
      return true;
    }
    setMass(v) {
      const cur = this.mass;
      if (cur <= 0) return;
      const k = v / cur;
      for (const c of this.cells) c.mass = Math.max(1, c.mass * k);
    }
    hit(frac, src) {
      if (!this.alive) return;
      const mult = this.stat('dmgTaken');
      const lose = Math.min(this.mass * frac * mult, this.mass - C.MIN_MASS + (this.cells.length > 1 ? 999 : 0));
      if (lose <= 0) return;
      this.spendMass(lose);
      if (this.isPlayer) { G.ui.hitFlash(this); G.world.shake(4); }
      if (this.mass < C.MIN_MASS && this.cells.length === 1) this.die(src);
    }

    /* ---------- эффекты ---------- */
    addEff(name, t, v) {
      const cur = this.eff[name];
      if (cur) { cur.t = Math.max(cur.t, t); cur.v = v !== undefined ? v : cur.v; }
      else this.eff[name] = { t, v: v !== undefined ? v : 1 };
    }
    hasEff(name) { const e = this.eff[name]; return !!(e && e.t > 0); }
    effV(name, def) { const e = this.eff[name]; return (e && e.t > 0) ? e.v : def; }
    delEff(name) { delete this.eff[name]; }

    /* ---------- статы ---------- */
    stat(name) {
      if (name === 'abilityCost') return this.king ? 0.5 : 1;
      return this.s[name] !== undefined ? this.s[name] : 1;
    }
    maxEnergy() { return (C.ENERGY_BASE + this.mass * C.ENERGY_PER_MASS) * (this.s.energyMax || 1); }

    /* ---------- энергия / разложение / эффекты ---------- */
    tick(dt) {
      if (!this.alive) return;
      this.s = G.evo.stats(this);

      // энергия
      this.energy = Math.min(this.maxEnergy(), this.energy + (C.ENERGY_REGEN_BASE + this.mass * C.ENERGY_REGEN_PER_MASS) * dt);

      // эффекты
      for (const k in this.eff) {
        this.eff[k].t -= dt;
        if (this.eff[k].t <= 0) delete this.eff[k];
      }
      // кулдауны
      for (const k in this.cds) { this.cds[k] -= dt; if (this.cds[k] <= 0) delete this.cds[k]; }
      for (const k in this.trapCds) { this.trapCds[k] -= dt; if (this.trapCds[k] <= 0) delete this.trapCds[k]; }
      for (const k in this.buildCds) { this.buildCds[k] -= dt; if (this.buildCds[k] <= 0) delete this.buildCds[k]; }
      if (this.portalCd > 0) this.portalCd -= dt;
      if (this.spawnT > 0) this.spawnT -= dt;
      if (this.king) { this.kingT -= dt; if (this.kingT <= 0) this.king = false; }

      // реген массы от лечебной пищи / наград
      if (this.hasEff('massregen')) this.gainMass(1 * this.effV('massregen', 1) * dt, 'regen');

      // разложение (п.16): большая клетка без еды теряет массу
      this.lastEat += dt;
      this.decaying = false;
      if (this.mass > C.DECAY_MIN_MASS) {
        const idle = this.lastEat > C.DECAY_IDLE_TIME;
        const rate = C.DECAY_RATE * (idle ? C.DECAY_IDLE_MULT : 1);
        this.setMass(this.mass * (1 - rate * dt));
        this.decaying = idle;
      }

      // паразит качает хоста
      if (this.attach) {
        this.attach.t -= dt;
        const host = this.attach.host;
        const hc = host && host.alive ? host.mainCell() : null;
        if (!hc || this.attach.t <= 0) {
          this.attach = null;
        } else {
          const drain = hc.mass * 0.03 * dt;
          hc.mass -= drain;
          this.mainCell().mass += drain;
          // висим рядом с хостом
          const a = this.attach.a || 0;
          this.attach.a = a + dt * 2;
          const tc = this.mainCell();
          const gx = hc.x + Math.cos(a) * (hc.r * 0.7 + tc.r);
          const gy = hc.y + Math.sin(a) * (hc.r * 0.7 + tc.r);
          tc.x = U.lerp(tc.x, gx, 1 - Math.exp(-8 * dt));
          tc.y = U.lerp(tc.y, gy, 1 - Math.exp(-8 * dt));
          tc.vx = hc.vx; tc.vy = hc.vy;
          for (const c of this.cells) {
            if (c === tc) continue;
            c.x = U.lerp(c.x, gx + U.rand(-10, 10), 1 - Math.exp(-5 * dt));
            c.y = U.lerp(c.y, gy + U.rand(-10, 10), 1 - Math.exp(-5 * dt));
            c.vx = hc.vx; c.vy = hc.vy;
          }
        }
      }

      // мутант
      G.evo.mutantTick(this.state, this, dt);

      // совсем истощённая клетка погибает
      if (this.cells.length === 1 && this.mass < C.MIN_MASS) this.die(null);
    }

    /* ---------- движение ---------- */
    speedFor(cell) {
      let spd = C.BASE_SPEED * Math.pow(40 / Math.max(cell.r, 6), 0.22);
      spd *= this.s.speedMult || 1;
      spd *= this.effV('speed', 1);
      spd *= this.effV('slow', 1);
      spd *= G.combo.speedMult(this);
      if (this.king) spd *= 1.1;
      if (this.hasEff('root')) spd = 0;
      return spd;
    }

    move(dt) {
      if (this.attach) return;
      const mc = this.mainCell();
      this.lastX = mc.x; this.lastY = mc.y;
      let dx = this.aimX - mc.x, dy = this.aimY - mc.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) { dx /= d; dy /= d; } else { dx = 0; dy = 0; }

      for (const c of this.cells) {
        c.r = U.massToR(c.mass);
        const spd = this.speedFor(c);
        const k = 1 - Math.exp(-8 * dt);
        const tvx = dx * spd, tvy = dy * spd;
        c.vx = U.lerp(c.vx, tvx, k);
        c.vy = U.lerp(c.vy, tvy, k);

        c.x += (c.vx + c.fx) * dt;
        c.y += (c.vy + c.fy) * dt;

        const dk = Math.exp(-2.5 * dt);
        c.fx *= dk; c.fy *= dk;

        // границы мира
        c.x = U.clamp(c.x, c.r, C.WORLD_W - c.r);
        c.y = U.clamp(c.y, c.r, C.WORLD_H - c.r);

        if (c.mergeT > 0) c.mergeT -= dt;
      }

      // слияние своих клеток
      if (this.cells.length > 1) {
        for (let i = 0; i < this.cells.length; i++) {
          for (let j = i + 1; j < this.cells.length; j++) {
            const a = this.cells[i], b = this.cells[j];
            if (a.mergeT > 0 || b.mergeT > 0) continue;
            const rr = (a.r + b.r) * 0.75;
            if (U.dist2(a.x, a.y, b.x, b.y) < rr * rr) {
              const tm = a.mass + b.mass;
              a.x = (a.x * a.mass + b.x * b.mass) / tm;
              a.y = (a.y * a.mass + b.y * b.mass) / tm;
              a.mass = tm; a.r = U.massToR(tm);
              this.cells.splice(j, 1);
              j--;
            }
          }
        }
      }
    }

    /* ---------- разделение ---------- */
    canSplit() { return this.cells.length < C.MAX_CELLS && this.mass > 30; }

    split(cell, boost) {
      if (this.cells.length >= C.MAX_CELLS || cell.mass < 20) return false;
      const half = cell.mass / 2;
      cell.mass = half; cell.r = U.massToR(half);
      const nc = newCell(cell.x + U.rand(-4, 4), cell.y + U.rand(-4, 4), half);
      nc.mergeT = C.MERGE_TIME;
      cell.mergeT = C.MERGE_TIME;

      const a = U.angle(cell.x, cell.y, this.aimX, this.aimY);
      nc.fx += Math.cos(a) * C.SPLIT_BOOST * (boost || 1);
      nc.fy += Math.sin(a) * C.SPLIT_BOOST * (boost || 1);
      cell.fx -= Math.cos(a) * C.SPLIT_BOOST * 0.3 * (boost || 1);
      cell.fy -= Math.sin(a) * C.SPLIT_BOOST * 0.3 * (boost || 1);

      this.cells.push(nc);
      return true;
    }

    playerSplit() {
      if (!this.canSplit()) return;
      // делим самую большую клетку
      this.split(this.mainCell(), 1);
      G.world.spark(this.mainCell().x, this.mainCell().y, this.color, 8);
    }

    abilitySplit() {
      if (this.cells.length >= C.MAX_CELLS) return;
      const targets = [...this.cells].filter(c => c.mass >= 30);
      for (const c of targets) {
        if (this.cells.length >= C.MAX_CELLS) break;
        this.split(c, 1.3);
      }
    }

    /* ---------- смерть ---------- */
    die(killer) {
      if (!this.alive) return;
      this.alive = false;
      this.king = false;
      this.bounty = false;
      const mc = this.mainCell();
      const px = mc ? mc.x : (this.lastX || C.WORLD_W / 2);
      const py = mc ? mc.y : (this.lastY || C.WORLD_H / 2);

      if (killer && killer.alive !== false && killer.gainMass) {
        killer.kills++;
        G.combo.onKill(killer);
        G.contracts.onKillPlayer(this.state, killer);
        if (this.bounty) {
          const bonus = this.mass * C.HUNT_BOUNTY;
          killer.gainMass(bonus, 'bounty');
          if (killer.isPlayer) G.ui.toast('🎯 Награда за охоту: +' + Math.round(bonus) + ' массы!', 'good');
        }
      }
      // разлетевшаяся еда
      for (let i = 0; i < 14; i++) {
        this.state.food.push(G.foods.make(px + U.rand(-60, 60), py + U.rand(-60, 60)));
      }
      G.world.spark(px, py, this.color, 30);
      G.world.ring(px, py, 120, this.color);

      if (this.isPlayer) G.game.onPlayerDeath(killer);
      else this.respawnT = C.BOT_RESPAWN;
    }
  }

  G.Organism = Organism;
  G.newCell = newCell;

  // ============ СТОЛКНОВЕНИЯ И ПОГЛОЩЕНИЕ ============
  G.combat = {
    resolve(state, dt) {
      const orgs = state.orgs;

      // 1. клетки организмов друг с другом
      for (let i = 0; i < orgs.length; i++) {
        const A = orgs[i];
        if (!A.alive) continue;
        for (let j = i + 1; j < orgs.length; j++) {
          const B = orgs[j];
          if (!B.alive) continue;
          const ghostPair = A.hasEff('ghost') || B.hasEff('ghost');
          if (A.attach || B.attach) continue; // цепляющийся паразит не участвует

          for (const ca of A.cells) {
            for (const cb of B.cells) {
              const rr = ca.r + cb.r;
              const d2 = U.dist2(ca.x, ca.y, cb.x, cb.y);
              if (d2 > rr * rr) continue;

              if (ghostPair) continue; // призраки не едят и не сталкиваются

              // кто съедает кого
              let eater = null, prey = null, preyCell = null;
              if (ca.mass > cb.mass * C.EAT_RATIO) { eater = A; prey = B; preyCell = cb; }
              else if (cb.mass > ca.mass * C.EAT_RATIO) { eater = B; prey = A; preyCell = ca; }

              if (eater) {
                if (prey.hasEff('shield')) { G.combat.bounce(ca, cb, d2); continue; }
                // шанс паразита вместо съедения
                if (prey.s.parasiteChance > 0 && prey.mass > C.MIN_MASS * 2 && Math.random() < prey.s.parasiteChance && !prey.attach) {
                  prey.attach = { host: eater, a: 0, t: 4 };
                  if (prey.isPlayer) G.ui.toast('🦠 Паразит захватил врага — качаем массу!', 'good');
                  if (eater.isPlayer) G.ui.toast('🦠 На вас цепляется паразит!', 'bad');
                  continue;
                }
                G.combat.consume(state, eater, prey, preyCell);
              } else {
                G.combat.bounce(ca, cb, d2);
              }
            }
          }
        }
      }

      // 2. организмы vs NPC
      for (const org of orgs) {
        if (!org.alive) continue;
        for (const n of state.npcs) {
          if (!n.alive || n.attach) continue;
          for (const c of org.cells) {
            const rr = c.r + n.r;
            if (U.dist2(c.x, c.y, n.x, n.y) > rr * rr) continue;
            if (org.hasEff('ghost')) continue;

            if (c.mass > n.mass * C.EAT_RATIO && n.kind !== 'boss') {
              // органик съел NPC
              G.combat.eatNpc(state, org, c, n);
            } else if (n.mass > c.mass * C.EAT_RATIO && !org.hasEff('shield') && !org.hasEff('ghost')) {
              // NPC съел клетку
              n.mass += c.mass * 0.8;
              org.cells.splice(org.cells.indexOf(c), 1);
              if (org.cells.length === 0) org.die(null);
              else if (org.isPlayer) { G.ui.hitFlash(org); G.ui.toast('💀 ' + n.type.name + ' поглотил вашу клетку!', 'bad'); }
              break;
            } else if (n.kind === 'boss' && c.mass > n.mass * 1.5) {
              // босс ест только гигантов... наоборот: гигант ест босса
              G.combat.eatNpc(state, org, c, n);
            } else {
              // сталкиваемся
              const a = U.angle(n.x, n.y, c.x, c.y);
              c.fx += Math.cos(a) * 160; c.fy += Math.sin(a) * 160;
              n.vx -= Math.cos(a) * 60; n.vy -= Math.sin(a) * 60;
            }
          }
        }
      }
    },

    bounce(a, b, d2) {
      const d = Math.sqrt(d2) || 1;
      const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
      const push = (a.r + b.r - d);
      const ma = a.mass, mb = b.mass;
      const ka = (mb / (ma + mb)) * push, kb = (ma / (ma + mb)) * push;
      a.x += nx * ka; a.y += ny * ka;
      b.x -= nx * kb; b.y -= ny * kb;
      a.fx += nx * 40; a.fy += ny * 40;
      b.fx -= nx * 40; b.fy -= ny * 40;
    },

    // полное поглощение клетки жертвы
    consume(state, eater, prey, preyCell) {
      if (prey.attach) return;
      let gain = preyCell.mass * C.EAT_GAIN;
      gain *= eater.stat('eatGain');
      gain *= G.combo.mult(eater);
      if (eater.hasEff('absorb')) { gain *= 1.4; eater.delEff('absorb'); }
      if (eater.king) gain *= 1.15;

      preyCell.mass = 0;
      prey.cells.splice(prey.cells.indexOf(preyCell), 1);

      eater.gainMass(gain, 'eat');
      eater.lastEat = 0;
      eater.energy = Math.min(eater.maxEnergy(), eater.energy + 6);
      G.world.spark(preyCell.x || eater.mainCell().x, preyCell.y || eater.mainCell().y, prey.color, 12);

      if (prey.cells.length === 0) {
        prey.die(eater);
      } else if (prey.isPlayer) {
        G.ui.hitFlash(prey);
        if (eater.isPlayer) G.ui.toast('Вы поглотили клетку ' + prey.name + ' (+' + Math.round(gain) + ')', 'good');
      }
      if (eater.isPlayer && !prey.isPlayer) {
        G.ui.toast('Поглощена ' + prey.name + ' (+' + Math.round(gain) + ')', 'good');
      }
    },

    eatNpc(state, org, cell, n) {
      let gain = n.mass * C.EAT_GAIN * org.stat('eatGain') * G.combo.mult(org);
      if (org.hasEff('absorb')) { gain *= 1.4; org.delEff('absorb'); }
      org.gainMass(gain, 'eat');
      org.lastEat = 0;
      n.alive = false;
      G.world.spark(n.x, n.y, n.color, 10);
      if (n.kind === 'boss') {
        org.kills++;
        G.combo.onKill(org);
        G.ui.banner('💥 ' + org.name + ' уничтожил босса!', 3500);
      }
    },
  };
})(window.G = window.G || {});
