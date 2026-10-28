// ==UserScript==
// @name         Neon pod postacią — Steamrealm
// @namespace    neon-steamrealm
// @version      0.2.0
// @description  Pokazuje neony przydzielone na publicznej liście GitHub.
// @match        https://*.margonem.com/*
// @grant        none
// @run-at       document-idle
// @connect      raw.githubusercontent.com
// ==/UserScript==

(() => {
  'use strict';
  // Zmień TWOJ_LOGIN i NAZWA_REPOZYTORIUM na dane swojego publicznego repo GitHub.
  const NEONS_URL = 'https://raw.githubusercontent.com/Flluk123/sasiadmanager/main/neony.json';
  const WORLD = 'steamrealm';
  const REFRESH_MS = 30_000;
  const EFFECTS = {
    cyan: { color: '#55f6ff', glow: 'rgba(55, 236, 255, .78)' },
    pink: { color: '#ff55d9', glow: 'rgba(255, 60, 213, .78)' },
    violet: { color: '#aa70ff', glow: 'rgba(150, 70, 255, .78)' },
    gold: { color: '#ffe26a', glow: 'rgba(255, 203, 50, .78)' },
  };
  let assignments = new Map();
  let lastRefresh = 0;
  let rendererAdded = false;

  function nicknameOf(drawable) {
    const candidates = [drawable?.nick, drawable?.d?.nick, drawable?.data?.nick,
      drawable?.businessCard?.getNick?.(), drawable?.getNick?.()];
    return candidates.find(value => typeof value === 'string' && value.trim())?.trim() ?? null;
  }
  function players() {
    const list = window.Engine?.others?.getDrawableList?.();
    return Array.isArray(list) ? list : [];
  }
  function orderOf(target) {
    try { return Number(target.getOrder?.()) - 0.01 || Number(target.ry) || 0; }
    catch { return Number(target.ry) || 0; }
  }
  async function refreshAssignments() {
    if (NEONS_URL.includes('TWOJ_LOGIN') || NEONS_URL.includes('NAZWA_REPOZYTORIUM')) return;
    lastRefresh = Date.now();
    try {
      const response = await fetch(NEONS_URL, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data)) return;
      assignments = new Map(data
        .filter(row => row.world === WORLD && typeof row.nick === 'string' && EFFECTS[row.effect])
        .map(row => [row.nick.trim().toLocaleLowerCase('pl'), row]));
    } catch (error) {
      console.debug('[Neon Steamrealm] Nie udało się pobrać neony.json z GitHuba.', error);
    }
  }
  function installRenderer() {
    if (rendererAdded || !window.Engine?.renderer?.add) return;
    rendererAdded = true;
    const overlay = {
      rx: 0, ry: 0,
      getAlwaysDraw: () => true,
      getOrder: () => {
        let order = -Infinity;
        for (const target of players()) {
          const nick = nicknameOf(target);
          if (nick && assignments.has(nick.toLocaleLowerCase('pl'))) order = Math.max(order, orderOf(target));
        }
        return Number.isFinite(order) ? order : 0;
      },
      draw(ctx) {
        if (Date.now() - lastRefresh > REFRESH_MS) refreshAssignments();
        for (const target of players()) {
          const nick = nicknameOf(target);
          const assignment = nick && assignments.get(nick.toLocaleLowerCase('pl'));
          if (!assignment) continue;
          const effect = EFFECTS[assignment.effect];
          const x = Number(target.rx ?? target.x), y = Number(target.ry ?? target.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          const width = Number(target.fw ?? target.frameWidth ?? 32) || 32;
          const height = Number(target.fh ?? target.frameHeight ?? 48) || 48;
          const cx = x + width / 2, cy = y + height - 5;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.shadowColor = effect.glow; ctx.shadowBlur = 13;
          ctx.strokeStyle = effect.color; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(10, width * .48), Math.max(3, width * .15), 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = .22; ctx.fillStyle = effect.color;
          ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(10, width * .42), Math.max(3, width * .12), 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      },
    };
    window.Engine.renderer.add(overlay);
  }
  function waitForEngine() {
    if (window.Engine?.renderer?.add && window.Engine?.others?.getDrawableList) {
      installRenderer(); refreshAssignments(); return;
    }
    window.setTimeout(waitForEngine, 1000);
  }
  waitForEngine();
})();
