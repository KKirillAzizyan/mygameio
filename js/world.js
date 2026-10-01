// ============ МИР: состояние, фазы (п.8), камера, коллизии, рендер ============
(function (G) {
  const U = G.U, C = G.C;

  const world = {
    cam: { x: 3500, y: 3500, scale: 0.8, shake: 0 },
    particles: [],
    rings: [],

    init() {
      world.particles = [];
      world.rings = [];
      world.cam = { x: C.WORLD_W / 2, y: C.WORLD_H / 2, scale: 0.8, shake: 0 };
    },

    /* ---------- эффекты ---------- */
    spark(x, y, color, n) {
      for (let i = 0; i < (n || 8); i++) {
        const a = U.rand(0, Math.PI * 2), s = U.rand(40, 260);
        world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.3, 0.8), t: 0, color, size: U.rand(2, 5) });
      }
    },
    ring(x, y, r, color) {
      world.rings.push({ x, y, r, color, t: 0, dur: 0.6 });
    },
    shake(v) { world.cam.shake = Math.min(20, world.cam.shake + v); },

    /* ---------- безопасная точка ---------- */
    findSafeSpot(state, minDist) {
      const pl = state.player;
      for (let i = 0; i < 40; i++) {
        const x = U.rand(250, C.WORLD_W - 250), y = U.rand(250, C.WORLD_H - 250);
        if (pl && pl.alive) {
          const mc = pl.mainCell();
          if (U.dist(x, y, mc.x, mc.y) < minDist) continue;
        }
        // не внутри опасной зоны
        let bad = false;
        for (const h of state.hazards) {
          if (h.kind === 'closed' || h.kind === 'movingWall') {
            if (Math.abs(x - h.x) < h.w / 2 + 150 && Math.abs(y - h.y) < h.h / 2 + 150) { bad = true; break; }
          } else if (h.r && U.dist(x, y, h.x, h.y) < h.r + 150) { bad = true; break; }
        }
        if (!bad) return { x, y };
      }
      return { x: U.rand(300, C.WORLD_W - 300), y: U.rand(300, C.WORLD_H - 300) };
    },

    /* ---------- ФАЗЫ МИРА (п.8) ---------- */
    phases: {
      update(state, dt) {
        const p = world.phases;
        const t = state.time;
        let newLevel = 0;
        if (t >= C.PHASE_3) newLevel = 3;
        else if (t >= C.PHASE_2) newLevel = 2;
        else if (t >= C.PHASE_1) newLevel = 1;

        if (newLevel > state.phase) {
          state.phase = newLevel;
          if (newLevel === 1) {
            G.ui.banner('🦠 Фаза 2: по карте расползаются вирусы', 4500);
          } else if (newLevel === 2) {
            G.ui.banner('🧱 Фаза 3: часть карты закрывается!', 4500);
            // закрываем углы
            const spots = [
              { x: 500, y: 500 }, { x: C.WORLD_W - 500, y: 500 },
              { x: 500, y: C.WORLD_H - 500 }, { x: C.WORLD_W - 500, y: C.WORLD_H - 500 },
            ];
            for (const s of spots) {
              if (U.chance(0.6)) G.hazards.spawn(state, 'closed', s.x, s.y, { life: 1e9, w: 640, h: 640 });
            }
          } else if (newLevel === 3) {
            G.ui.banner('🌋 Фаза 4: опасные зоны и гигантские NPC!', 4500);
            const bossSpot = world.findSafeSpot(state, 1200);
            state.npcs.push(G.npc.make(bossSpot.x, bossSpot.y, 'boss'));
            p.dangerT = 10;
          }
        }

        // фаза 1: подращиваем вирусы
        if (state.phase >= 1) {
          p.virusT = (p.virusT || 0) + dt;
          if (p.virusT > 4) {
            p.virusT = 0;
            const target = C.VIRUS_COUNT + (state.phase >= 1 ? 6 : 0);
            if (state.viruses.length < target) {
              const s = world.findSafeSpot(state, 500);
              G.viruses.spawnAt(state, s.x, s.y);
            }
          }
        }

        // фаза 3: опасные зоны понемногу
        if (state.phase >= 3) {
          p.dangerT = (p.dangerT === undefined ? 20 : p.dangerT) - dt;
          if (p.dangerT <= 0) {
            p.dangerT = U.rand(18, 30);
            const kinds = ['electric', 'acid', 'volcano', 'current', 'moverSpike'];
            const s = world.findSafeSpot(state, 700);
            const kind = U.pick(kinds);
            const opts = { life: U.rand(40, 80) };
            if (kind === 'moverSpike') {
              opts.patrolA = { x: s.x, y: s.y };
              opts.patrolB = { x: s.x + U.rand(-500, 500), y: s.y + U.rand(-500, 500) };
            }
            if (kind === 'current') { opts.w = 420; opts.h = 420; opts.dir = U.rand(0, Math.PI * 2); }
            G.hazards.spawn(state, kind, s.x, s.y, opts);
          }
        }

        // метеоритный дождь в поздней фазе
        if (state.phase >= 3) {
          p.meteorT = (p.meteorT || 0) + dt;
          if (p.meteorT > 14) {
            p.meteorT = 0;
            for (let i = 0; i < 3; i++) {
              const fromTop = U.chance(0.5);
              const x = fromTop ? U.rand(0, C.WORLD_W) : 0;
              const y = fromTop ? 0 : U.rand(0, C.WORLD_H);
              G.hazards.spawn(state, 'meteor', x, y, {
                vx: U.rand(140, 260) * (fromTop ? 1 : 1), vy: U.rand(140, 260) * (fromTop ? 1 : -0.3),
                life: 30,
              });
            }
            G.ui.toast('☄️ Метеоритный дождь!', 'bad');
          }
        }
      },
    },

    /* ---------- ОБНОВЛЕНИЕ МИРА ---------- */
    update(state, dt) {
      world.phases.update(state, dt);

      // камера следует за игроком
      const pl = state.player;
      if (pl && pl.alive) {
        const c = pl.mainCell();
        world.cam.x = U.lerp(world.cam.x, c.x, 1 - Math.exp(-6 * dt));
        world.cam.y = U.lerp(world.cam.y, c.y, 1 - Math.exp(-6 * dt));
        const visW = 1700 * Math.pow(Math.max(c.r, 40) / 40, 0.55) + 900;
        const targetScale = state.viewW / visW;
        world.cam.scale = U.lerp(world.cam.scale, targetScale, 1 - Math.exp(-4 * dt));
      }
      if (world.cam.shake > 0) world.cam.shake = Math.max(0, world.cam.shake - 30 * dt);

      // частицы
      for (const p of world.particles) {
        p.t += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-3 * dt);
      }
      world.particles = world.particles.filter(p => p.t < p.life);
      for (const r of world.rings) r.t += dt;
      world.rings = world.rings.filter(r => r.t < r.dur);

      // наполнение мира
      G.foods.ensure(state);
      G.viruses.ensure(state, C.VIRUS_COUNT);
      G.npc.ensure(state);
      G.magnets.ensure(state);

      // движение и тик организмов
      for (const org of state.orgs) {
        if (!org.alive) continue;
        org.tick(dt);
        org.move(dt);
      }
      G.npc.update(state, dt);

      // коллизии мира + поедание
      world.collideWorld(state, dt);
      G.combat.resolve(state, dt);
      world.eatFood(state);
      G.traps.update(state, dt);
      G.buildings.update(state, dt);
      G.hazards.update(state, dt);
      world.projectiles(state, dt);

      // мёртвых ботов убираем из orgs не нужно — они респавнятся на месте
      state.orgs = state.orgs.filter(o => o.alive || o.isPlayer || state.bots.includes(o));
    },

    /* ---------- стены, зоны, постройки ---------- */
    collideWorld(state, dt) {
      const rects = [];
      for (const b of G.buildings.blockers(state)) {
        rects.push({ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h, owner: b.owner, hp: b });
      }
      for (const r of G.hazards.rectBlockers(state)) rects.push(r);

      for (const org of state.orgs) {
        if (!org.alive) continue;
        const ghost = org.hasEff('ghost');
        for (const c of org.cells) {
          for (const rc of rects) {
            if (ghost) continue;
            if (rc.owner === org) continue;          // свои стены не мешают
            const hit = U.circleRect(c.x, c.y, c.r, rc.x, rc.y, rc.w, rc.h);
            if (hit) {
              c.x += hit.nx * hit.depth;
              c.y += hit.ny * hit.depth;
              const into = c.vx * hit.nx + c.vy * hit.ny;
              if (into < 0) { c.vx -= hit.nx * into; c.vy -= hit.ny * into; }
              c.fx -= hit.nx * (c.fx * hit.nx + c.fy * hit.ny);
              c.fy -= hit.ny * (c.fx * hit.nx + c.fy * hit.ny);
              // вгрызаемся в чужие постройки
              if (rc.owner && rc.owner !== org && rc.hp && rc.hp.hp !== undefined) {
                rc.hp.hp -= c.r * dt * 0.9;
              }
            }
          }
        }
        G.buildings.onHitByCell(state, org, org.mainCell(), dt);
      }

      // NPC о стены (просто отталкиваем)
      for (const n of state.npcs) {
        for (const rc of rects) {
          const hit = U.circleRect(n.x, n.y, n.r, rc.x, rc.y, rc.w, rc.h);
          if (hit) { n.x += hit.nx * hit.depth; n.y += hit.ny * hit.depth; }
        }
      }
    },

    /* ---------- еда ---------- */
    eatFood(state) {
      for (const org of state.orgs) {
        if (!org.alive || org.attach) continue;
        const bonusR = org.stat('eatRadius') || 1;
        for (const c of org.cells) {
          const er = c.r * bonusR;
          for (let i = state.food.length - 1; i >= 0; i--) {
            const f = state.food[i];
            const rr = er + f.r;
            if (U.dist2(c.x, c.y, f.x, f.y) < rr * rr) {
              state.food.splice(i, 1);
              G.foods.eat(state, org, f);
            }
          }
        }
      }
      // боты-NPC едят еду
      for (const n of state.npcs) {
        if (n.kind !== 'bacteria') G.npc.eatFood(state, n);
      }
      // вирусы
      for (let vi = state.viruses.length - 1; vi >= 0; vi--) {
        const v = state.viruses[vi];
        let consumed = false;
        for (const org of state.orgs) {
          if (!org.alive || org.attach || org.hasEff('ghost')) continue;
          for (const c of org.cells) {
            const rr = c.r + v.r;
            if (U.dist2(c.x, c.y, v.x, v.y) < rr * rr) {
              if (G.viruses.onHit(state, org, c, v)) {
                state.viruses.splice(vi, 1);
                consumed = true;
                break;
              }
            }
          }
          if (consumed) break;
        }
      }
    },

    /* ---------- снаряды ---------- */
    projectiles(state, dt) {
      for (const p of state.projectiles) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life <= 0) continue;

        for (const org of state.orgs) {
          if (!org.alive || org.hasEff('ghost')) continue;
          if (p.kind === 'turret' && (org === p.owner || org.hasEff('shield'))) continue;
          for (const c of org.cells) {
            const rr = c.r + p.r;
            if (U.dist2(p.x, p.y, c.x, c.y) < rr * rr) {
              G.hazards.damage(state, org, c, p.dmg, p.owner);
              c.fx += p.vx * 0.5; c.fy += p.vy * 0.5;
              world.spark(p.x, p.y, p.color, 6);
              p.life = 0;
              break;
            }
          }
          if (p.life <= 0) break;
        }
        if (p.life > 0) {
          for (const n of state.npcs) {
            if (n.kind === 'bacteria') continue;
            const rr = n.r + p.r;
            if (U.dist2(p.x, p.y, n.x, n.y) < rr * rr) {
              n.mass -= n.mass * p.dmg;
              world.spark(p.x, p.y, p.color, 5);
              p.life = 0;
              break;
            }
          }
        }
      }
      state.projectiles = state.projectiles.filter(p => p.life > 0);
    },

    /* ================= РЕНДЕР ================= */
    draw(ctx, state) {
      const { cam } = world;
      const W = state.viewW, H = state.viewH;
      const shx = cam.shake > 0 ? U.rand(-cam.shake, cam.shake) : 0;
      const shy = cam.shake > 0 ? U.rand(-cam.shake, cam.shake) : 0;

      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2 + shx, H / 2 + shy);
      ctx.scale(cam.scale, cam.scale);
      ctx.translate(-cam.x, -cam.y);

      // видимая область
      const vx0 = cam.x - W / 2 / cam.scale, vy0 = cam.y - H / 2 / cam.scale;
      const vx1 = cam.x + W / 2 / cam.scale, vy1 = cam.y + H / 2 / cam.scale;
      const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

      // сетка
      const grid = 100;
      ctx.strokeStyle = 'rgba(80,110,170,0.07)';
      ctx.lineWidth = 1 / cam.scale;
      ctx.beginPath();
      for (let x = Math.floor(vx0 / grid) * grid; x < vx1; x += grid) { ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); }
      for (let y = Math.floor(vy0 / grid) * grid; y < vy1; y += grid) { ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); }
      ctx.stroke();

      // границы мира
      ctx.strokeStyle = 'rgba(120,170,255,0.5)';
      ctx.lineWidth = 6 / cam.scale;
      ctx.strokeRect(0, 0, C.WORLD_W, C.WORLD_H);

      // зона короля
      if (G.king.zone) world.drawKingZone(ctx, G.king.zone);

      // опасности (статичные зоны)
      for (const h of state.hazards) if (vis(h.x, h.y, Math.max(h.r, h.w, h.h))) world.drawHazard(ctx, h);

      // магниты
      for (const m of state.magnets) world.drawMagnet(ctx, m);

      // ловушки
      for (const t of state.traps) world.drawTrap(ctx, t);

      // еда
      for (const f of state.food) {
        if (!vis(f.x, f.y, 20)) continue;
        ctx.fillStyle = f.type.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        if (f.type.id !== 'normal') {
          ctx.strokeStyle = U.hexA(f.type.color, 0.5);
          ctx.lineWidth = 2 / cam.scale;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 3 + Math.sin(state.time * 4 + f.hue) * 2, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // вирусы
      for (const v of state.viruses) if (vis(v.x, v.y, v.r + 20)) world.drawVirus(ctx, v, state.time);

      // постройки
      for (const b of state.buildings) world.drawBuilding(ctx, b, state.time);

      // незавершённая пара портала игрока
      const pl0 = state.player;
      if (pl0 && pl0.pendingPortal) {
        const pp = pl0.pendingPortal;
        ctx.strokeStyle = 'rgba(167,139,250,0.85)';
        ctx.setLineDash([9, 7]);
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(pp.x, pp.y, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌀', pp.x, pp.y + 9);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(196,181,253,0.95)';
        ctx.fillText('поставьте пару рядом', pp.x, pp.y + 56);
      }

      // NPC
      for (const n of state.npcs) if (vis(n.x, n.y, n.r + 20)) world.drawNpc(ctx, n, state);

      // организмы
      for (const org of state.orgs) {
        if (!org.alive) continue;
        for (const c of org.cells) if (vis(c.x, c.y, c.r + 60)) world.drawOrg(ctx, org, c, state);
      }

      // снаряды
      for (const p of state.projectiles) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = U.hexA(p.color, 0.3);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2); ctx.fill();
      }

      // частицы и кольца
      for (const p of world.particles) {
        ctx.globalAlpha = 1 - p.t / p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      for (const r of world.rings) {
        const k = r.t / r.dur;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 4 / cam.scale;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // прицел игрока
      if (state.player && state.player.alive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5 / cam.scale;
        ctx.beginPath();
        ctx.arc(state.player.aimX, state.player.aimY, 8 / cam.scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // экранная виньетка при уроне
      if (world.hitT > 0) {
        world.hitT -= 0.016;
        ctx.fillStyle = 'rgba(255,30,30,' + (0.25 * Math.min(world.hitT, 1)) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    },

    hitT: 0,

    drawKingZone(ctx, z) {
      const grad = ctx.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
      grad.addColorStop(0, 'rgba(253,224,71,0.10)');
      grad.addColorStop(1, 'rgba(253,224,71,0.28)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(253,224,71,0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 12]);
      ctx.lineDashOffset = -performance.now() / 40;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', z.x, z.y + 8);
      if (z.capture > 0 && z.holder) {
        ctx.fillStyle = 'rgba(253,224,71,0.9)';
        ctx.fillRect(z.x - 60, z.y - z.r - 24, 120 * Math.min(z.capture / C.KING_CAPTURE, 1), 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.strokeRect(z.x - 60, z.y - z.r - 24, 120, 8);
      }
    },

    drawHazard(ctx, h) {
      const pulse = Math.sin(performance.now() / 300) * 0.5 + 0.5;
      switch (h.kind) {
        case 'meteor':
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(249,115,22,0.3)';
          ctx.beginPath(); ctx.arc(h.x - h.vx * 0.08, h.y - h.vy * 0.08, h.r * 1.6, 0, Math.PI * 2); ctx.fill();
          break;
        case 'moverSpike':
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(performance.now() / 500);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            const r = i % 2 === 0 ? h.r : h.r * 0.55;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        case 'electric': {
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
          g.addColorStop(0, 'rgba(56,189,248,0.25)');
          g.addColorStop(1, 'rgba(56,189,248,0.02)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(125,211,252,' + (0.4 + pulse * 0.5) + ')';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            const a = performance.now() / 300 + i * 1.6;
            ctx.moveTo(h.x, h.y);
            for (let s = 1; s <= 4; s++) {
              ctx.lineTo(h.x + Math.cos(a + s) * h.r * s / 4 + U.rand(-14, 14), h.y + Math.sin(a + s * 1.3) * h.r * s / 4 + U.rand(-14, 14));
            }
            ctx.stroke();
          }
          break;
        }
        case 'blackhole': {
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
          g.addColorStop(0, 'rgba(0,0,0,0.95)');
          g.addColorStop(0.5, 'rgba(124,58,237,0.5)');
          g.addColorStop(1, 'rgba(124,58,237,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(performance.now() / 900);
          ctx.strokeStyle = 'rgba(167,139,250,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, h.r * 0.55, 0.5, 3.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, h.r * 0.75, 3.4, 6.6); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'acid': {
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
          g.addColorStop(0, 'rgba(132,204,22,0.3)');
          g.addColorStop(1, 'rgba(132,204,22,0.05)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(163,230,53,0.6)';
          for (let i = 0; i < 6; i++) {
            const a = performance.now() / 700 + i;
            ctx.beginPath();
            ctx.arc(h.x + Math.cos(a * 2) * h.r * 0.5, h.y + Math.sin(a * 1.7) * h.r * 0.5, 4 + Math.sin(a * 3) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'volcano': {
          const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
          g.addColorStop(0, 'rgba(220,38,38,0.5)');
          g.addColorStop(1, 'rgba(220,38,38,0.05)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(251,146,60,' + (0.5 + pulse * 0.4) + ')';
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.3 * (0.8 + pulse * 0.4), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'movingWall':
        case 'closed': {
          ctx.fillStyle = h.kind === 'closed' ? 'rgba(71,85,105,0.85)' : 'rgba(100,116,139,0.9)';
          ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
          ctx.strokeStyle = h.kind === 'closed' ? 'rgba(239,68,68,0.8)' : 'rgba(148,163,184,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
          // предупреждающая штриховка
          ctx.save();
          ctx.beginPath(); ctx.rect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h); ctx.clip();
          ctx.strokeStyle = 'rgba(239,68,68,0.25)';
          ctx.lineWidth = 8;
          for (let i = -h.w; i < h.w; i += 34) {
            ctx.beginPath();
            ctx.moveTo(h.x - h.w / 2 + i, h.y - h.h / 2);
            ctx.lineTo(h.x - h.w / 2 + i + h.h, h.y + h.h / 2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case 'current': {
          ctx.fillStyle = 'rgba(34,211,238,0.10)';
          ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
          ctx.strokeStyle = 'rgba(34,211,238,0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
          // стрелки течения
          ctx.strokeStyle = 'rgba(34,211,238,0.7)';
          ctx.lineWidth = 3;
          for (let i = -1; i <= 1; i++) {
            const off = ((performance.now() / 16 + i * 140) % (h.w + 140)) - h.w / 2 - 70;
            const ax = h.x + Math.cos(h.dir) * off, ay = h.y + Math.sin(h.dir) * off;
            ctx.beginPath();
            ctx.moveTo(ax - Math.cos(h.dir) * 22, ay - Math.sin(h.dir) * 22);
            ctx.lineTo(ax + Math.cos(h.dir) * 22, ay + Math.sin(h.dir) * 22);
            ctx.moveTo(ax + Math.cos(h.dir) * 22, ay + Math.sin(h.dir) * 22);
            ctx.lineTo(ax + Math.cos(h.dir) * 22 - Math.cos(h.dir - 0.6) * 14, ay + Math.sin(h.dir) * 22 - Math.sin(h.dir - 0.6) * 14);
            ctx.stroke();
          }
          break;
        }
      }
    },

    drawMagnet(ctx, m) {
      const active = m.active > 0;
      if (active) {
        ctx.strokeStyle = 'rgba(34,211,238,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(m.x, m.y, C.MAGNET_RANGE, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      const pulse = Math.sin(performance.now() / 250) * 0.15 + 0.85;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.scale(pulse, pulse);
      ctx.font = (m.r * 1.4) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧲', 0, 0);
      ctx.restore();
      if (active) {
        ctx.fillStyle = 'rgba(34,211,238,0.9)';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(m.active) + 'с', m.x, m.y - m.r - 8);
      }
    },

    drawTrap(ctx, t) {
      const own = t.owner && t.owner.isPlayer;
      ctx.globalAlpha = t.armed > 0 ? 0.5 : 1;
      const col = t.type.color;
      switch (t.type.id) {
        case 'spike':
          ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(performance.now() / 1400);
          ctx.fillStyle = col;
          ctx.beginPath();
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            const r = i % 2 === 0 ? t.r * 1.5 : t.r * 0.6;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        case 'glue':
          ctx.fillStyle = 'rgba(163,230,53,0.75)';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.3, 0, Math.PI * 2); ctx.fill();
          break;
        case 'mine': {
          const pulse = Math.sin(performance.now() / 160) * 0.5 + 0.5;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.6) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 3, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('!', t.x, t.y + 1);
          break;
        }
        case 'net':
          ctx.strokeStyle = 'rgba(148,163,184,0.9)';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(t.x, t.y);
            ctx.lineTo(t.x + Math.cos(a) * t.r * 1.4, t.y + Math.sin(a) * t.r * 1.4);
            ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.55, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'puddle': {
          const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
          g.addColorStop(0, 'rgba(120,53,15,0.9)');
          g.addColorStop(1, 'rgba(120,53,15,0.35)');
          ctx.fillStyle = g;
          ctx.beginPath();
          for (let i = 0; i <= 20; i++) {
            const a = i / 20 * Math.PI * 2;
            const rr = t.r * (1 + Math.sin(a * 3 + performance.now() / 400) * 0.12);
            const px = t.x + Math.cos(a) * rr, py = t.y + Math.sin(a) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.fill();
          break;
        }
        case 'fake':
          ctx.fillStyle = '#f472b6';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(244,114,182,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 2, 0, Math.PI * 2); ctx.stroke();
          break;
      }
      // индикатор владельцу
      if (own) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    },

    drawVirus(ctx, v, time) {
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.spin + time * 0.4);
      const col = v.type.color;
      // шипы
      ctx.fillStyle = col;
      ctx.beginPath();
      const n = v.type.spikes;
      for (let i = 0; i < n * 2; i++) {
        const a = i / (n * 2) * Math.PI * 2;
        const r = i % 2 === 0 ? v.r * 1.35 : v.r * 0.85;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      // ядро
      ctx.fillStyle = U.shade(col, 0.55);
      ctx.beginPath(); ctx.arc(0, 0, v.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = U.shade(col, 1.5);
      ctx.beginPath(); ctx.arc(-v.r * 0.25, -v.r * 0.25, v.r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawBuilding(ctx, b, time) {
      const own = b.owner && b.owner.isPlayer;
      const hpFrac = Math.max(0, b.hp / b.maxHp);
      ctx.globalAlpha = 0.55 + hpFrac * 0.45;
      switch (b.kind) {
        case 'wall':
        case 'barrier': {
          ctx.fillStyle = b.kind === 'wall' ? '#78553a' : '#64748b';
          ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          ctx.strokeStyle = own ? '#7ee787' : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          // кирпичи
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          const bw = b.kind === 'wall' ? 32 : 26;
          for (let x = -b.w / 2 + bw; x < b.w / 2; x += bw) {
            ctx.beginPath(); ctx.moveTo(b.x + x, b.y - b.h / 2); ctx.lineTo(b.x + x, b.y + b.h / 2); ctx.stroke();
          }
          break;
        }
        case 'turret': {
          ctx.fillStyle = '#475569';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = own ? '#7ee787' : '#94a3b8';
          ctx.lineWidth = 3;
          ctx.stroke();
          // ствол к последней цели
          const ang = b.aim !== undefined ? b.aim : time;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(ang);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(0, -5, b.r + 14, 10);
          ctx.restore();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'portal': {
          const pr = b.r;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(time * 2);
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = 'rgba(167,139,250,' + (0.9 - i * 0.25) + ')';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, pr * (0.45 + i * 0.28), i * 1.4, i * 1.4 + 4); ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = 'rgba(167,139,250,0.25)';
          ctx.beginPath(); ctx.arc(b.x, b.y, pr, 0, Math.PI * 2); ctx.fill();
          break;
        }
      }
      ctx.globalAlpha = 1;
      // полоска HP если повреждена
      if (hpFrac < 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(b.x - 30, b.y - (b.kind === 'wall' || b.kind === 'barrier' ? b.h / 2 + 10 : b.r + 12), 60, 5);
        ctx.fillStyle = hpFrac > 0.4 ? '#7ee787' : '#ef4444';
        ctx.fillRect(b.x - 30, b.y - (b.kind === 'wall' || b.kind === 'barrier' ? b.h / 2 + 10 : b.r + 12), 60 * hpFrac, 5);
      }
    },

    drawNpc(ctx, n, state) {
      ctx.save();
      ctx.translate(n.x, n.y);
      if (n.kind === 'bacteria') {
        ctx.fillStyle = n.color;
        ctx.beginPath(); ctx.arc(0, 0, n.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(-n.r * 0.3, -n.r * 0.3, n.r * 0.35, 0, Math.PI * 2); ctx.fill();
      } else if (n.kind === 'parasite') {
        ctx.rotate(performance.now() / 600);
        ctx.fillStyle = n.color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2;
          const r = i % 2 === 0 ? n.r * 1.4 : n.r * 0.8;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath(); ctx.arc(0, 0, n.r * 0.5, 0, Math.PI * 2); ctx.fill();
        if (n.attach) {
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(234,179,8,0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.attach.cell.x, n.attach.cell.y); ctx.stroke();
          ctx.restore();
          return;
        }
      } else {
        // хищник / босс
        const wob = Math.sin(performance.now() / 300 + n.wanderA) * n.r * 0.06;
        ctx.fillStyle = n.color;
        ctx.beginPath(); ctx.arc(0, 0, n.r + wob, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = n.r * 0.08;
        ctx.stroke();
        // глаза
        const a = Math.atan2(n.dirY, n.dirX);
        const ex = Math.cos(a) * n.r * 0.35, ey = Math.sin(a) * n.r * 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + n.r * 0.2, ey - n.r * 0.2, n.r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - n.r * 0.2, ey + n.r * 0.2, n.r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex + n.r * 0.26, ey - n.r * 0.2, n.r * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - n.r * 0.14, ey + n.r * 0.2, n.r * 0.09, 0, Math.PI * 2); ctx.fill();
        // имя
        if (n.kind === 'boss') {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = 'bold ' + Math.max(16, n.r * 0.22) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💀 ' + n.type.name + ' ' + Math.round(n.mass), 0, -n.r - 12);
        }
      }
      ctx.restore();
    },

    drawOrg(ctx, org, cell, state) {
      const isMe = org.isPlayer;
      const ghost = org.hasEff('ghost');
      ctx.save();
      ctx.translate(cell.x, cell.y);
      if (ghost) ctx.globalAlpha = 0.4;

      // аура короля
      if (org.king) {
        const g = ctx.createRadialGradient(0, 0, cell.r * 0.7, 0, 0, cell.r * 1.7);
        g.addColorStop(0, 'rgba(253,224,71,0.35)');
        g.addColorStop(1, 'rgba(253,224,71,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, cell.r * 1.7, 0, Math.PI * 2); ctx.fill();
      }

      // тело
      const grad = ctx.createRadialGradient(-cell.r * 0.3, -cell.r * 0.3, cell.r * 0.1, 0, 0, cell.r);
      grad.addColorStop(0, U.shade(org.color, 1.45));
      grad.addColorStop(1, U.shade(org.color, 0.7));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, cell.r, 0, Math.PI * 2); ctx.fill();

      ctx.lineWidth = Math.max(2, cell.r * 0.06);
      ctx.strokeStyle = isMe ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.35)';
      ctx.stroke();

      // щит
      if (org.hasEff('shield')) {
        ctx.strokeStyle = 'rgba(56,189,248,0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -performance.now() / 30;
        ctx.beginPath(); ctx.arc(0, 0, cell.r + 8, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(56,189,248,0.10)';
        ctx.beginPath(); ctx.arc(0, 0, cell.r + 8, 0, Math.PI * 2); ctx.fill();
      }
      // заморозка / замедление
      if (org.hasEff('frozenVis')) {
        ctx.fillStyle = 'rgba(125,211,252,0.35)';
        ctx.beginPath(); ctx.arc(0, 0, cell.r, 0, Math.PI * 2); ctx.fill();
      }
      // сеть
      if (org.hasEff('netVis')) {
        ctx.strokeStyle = 'rgba(200,210,220,0.8)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * cell.r, Math.sin(a) * cell.r); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, cell.r * 0.6, 0, Math.PI * 2); ctx.stroke();
      }
      // поглощение (усиленное)
      if (org.hasEff('absorb')) {
        ctx.strokeStyle = 'rgba(192,132,252,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, cell.r + 4 + Math.sin(performance.now() / 200) * 3, 0, Math.PI * 2); ctx.stroke();
      }
      // мутагенное свечение
      if (org.hasEff('mutaglow') || org.hasEff('evoGlow')) {
        ctx.fillStyle = 'rgba(192,132,252,0.18)';
        ctx.beginPath(); ctx.arc(0, 0, cell.r + 6, 0, Math.PI * 2); ctx.fill();
      }
      // призрак — пунктир
      if (ghost) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.arc(0, 0, cell.r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      // глаза
      const mc = org.mainCell();
      const a = Math.atan2(org.aimY - cell.y, org.aimX - cell.x);
      const er = cell.r * 0.18;
      const ex = Math.cos(a) * cell.r * 0.3, ey = Math.sin(a) * cell.r * 0.3;
      if (cell.r > 14) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + er, ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - er, ey + er * 0.8, er, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex + er + Math.cos(a) * er * 0.4, ey - er * 0.8 + Math.sin(a) * er * 0.4, er * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - er + Math.cos(a) * er * 0.4, ey + er * 0.8 + Math.sin(a) * er * 0.4, er * 0.45, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();

      // подпись (вне transform-а внутри — оставляем в мировых координатах)
      const showLabel = cell === mc || cell.r > 30;
      if (showLabel && !ghost) {
        ctx.save();
        ctx.translate(cell.x, cell.y);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fs = Math.max(12, Math.min(cell.r * 0.38, 34));
        ctx.font = (isMe ? 'bold ' : '') + fs + 'px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(org.name, 1.5, -cell.r - fs * 0.7 + 1.5);
        ctx.fillStyle = isMe ? '#a7f3d0' : 'rgba(255,255,255,0.92)';
        ctx.fillText(org.name, 0, -cell.r - fs * 0.7);
        if (cell.r > 26) {
          const mf = Math.max(10, fs * 0.75);
          ctx.font = mf + 'px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(Math.round(org.mass), 1, -cell.r - fs * 0.7 - mf * 1.15 + 1);
          ctx.fillStyle = '#ffe9a8';
          ctx.fillText(Math.round(org.mass), 0, -cell.r - fs * 0.7 - mf * 1.15);
        }
        // корона
        if (org.king && cell === mc) {
          ctx.font = Math.max(16, cell.r * 0.4) + 'px sans-serif';
          ctx.fillText('👑', 0, -cell.r - fs * 1.6);
        }
        // метка цели охоты
        if (org.bounty && cell === mc) {
          ctx.font = Math.max(16, cell.r * 0.35) + 'px sans-serif';
          ctx.fillText('🎯', cell.r * 0.8, -cell.r * 0.6);
        }
        ctx.restore();
      }
    },

    /* ================= МИНИКАРТА ================= */
    drawMinimap(mctx, state) {
      const W = mctx.canvas.width, H = mctx.canvas.height;
      const sx = W / C.WORLD_W, sy = H / C.WORLD_H;
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = 'rgba(12,19,34,0.9)';
      mctx.fillRect(0, 0, W, H);

      // закрытые зоны
      mctx.fillStyle = 'rgba(100,116,139,0.7)';
      for (const h of state.hazards) {
        if (h.kind === 'closed') mctx.fillRect(h.x * sx - h.w * sx / 2, h.y * sy - h.h * sy / 2, h.w * sx, h.h * sy);
      }
      // опасные зоны
      for (const h of state.hazards) {
        if (h.kind === 'blackhole') {
          mctx.fillStyle = 'rgba(124,58,237,0.8)';
          mctx.beginPath(); mctx.arc(h.x * sx, h.y * sy, Math.max(3, h.r * sx), 0, Math.PI * 2); mctx.fill();
        } else if (['acid', 'electric', 'volcano'].includes(h.kind)) {
          mctx.fillStyle = U.hexA(h.color, 0.5);
          mctx.beginPath(); mctx.arc(h.x * sx, h.y * sy, Math.max(3, h.r * sx), 0, Math.PI * 2); mctx.fill();
        }
      }
      // зона короля
      if (G.king.zone) {
        const z = G.king.zone;
        mctx.strokeStyle = 'rgba(253,224,71,0.9)';
        mctx.lineWidth = 1.5;
        mctx.beginPath(); mctx.arc(z.x * sx, z.y * sy, z.r * sx, 0, Math.PI * 2); mctx.stroke();
        mctx.fillStyle = '#fde047';
        mctx.font = '11px sans-serif';
        mctx.fillText('👑', z.x * sx - 5, z.y * sy + 4);
      }
      // боссы
      for (const n of state.npcs) {
        if (n.kind === 'boss') {
          mctx.fillStyle = '#d946ef';
          mctx.beginPath(); mctx.arc(n.x * sx, n.y * sy, 4, 0, Math.PI * 2); mctx.fill();
        }
      }
      // боты
      for (const o of state.bots) {
        if (!o.alive) continue;
        const c = o.mainCell();
        mctx.fillStyle = 'rgba(255,255,255,0.55)';
        mctx.fillRect(c.x * sx - 1, c.y * sy - 1, 2.5, 2.5);
      }
      // игрок
      const p = state.player;
      if (p && p.alive) {
        const c = p.mainCell();
        const vision = (p.s.vision || 1);
        // радиус обнаружения охотника
        if (vision > 1) {
          mctx.strokeStyle = 'rgba(126,231,135,0.35)';
          mctx.lineWidth = 1;
          mctx.beginPath(); mctx.arc(c.x * sx, c.y * sy, 28 * vision, 0, Math.PI * 2); mctx.stroke();
        }
        mctx.fillStyle = '#7ee787';
        mctx.beginPath(); mctx.arc(c.x * sx, c.y * sy, 4, 0, Math.PI * 2); mctx.fill();
        mctx.strokeStyle = '#fff';
        mctx.lineWidth = 1;
        mctx.stroke();
      }
      // границы
      mctx.strokeStyle = 'rgba(120,170,255,0.5)';
      mctx.lineWidth = 1;
      mctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    },
  };

  G.world = world;
})(window.G = window.G || {});
