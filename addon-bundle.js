// ==UserScript==
// @name         Heroes on Discord + Statystyki Walk + Moduły
// @namespace    http://tampermonkey.net/
// @version      4.63.1
// @description  Zestaw dodatków Margonem z lokalnym licznikiem i historią walk
// @author       Kris Aphalon
// @match        https://margonem.com/*
// @match        https://*.margonem.com/*
// @match        https://steamrealm.margonem.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Kopia ustawień dodatków przywracana przed inicjalizacją modułów.
;(function () {
  const backupKey = 'mkAddonSettingsBackup_v1'
  const isAddonKey = key => /^(?:mwsAddon|mk(?:BalancedParty|Colossus|Hub|Online|TitanLoot|Addon|_clan_|_ranges_)|chciamkColossus|heroes-discord|moj_notyfikator_fx)/.test(key) && key !== backupKey
  try {
    const snapshot = JSON.parse(localStorage.getItem(backupKey) || '{}')
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
      for (const [key, value] of Object.entries(snapshot)) {
        if (isAddonKey(key) && typeof value === 'string' && localStorage.getItem(key) === null) localStorage.setItem(key, value)
      }
    }
  } catch (error) {}
  window.__mkPersistAddonSettings = () => {
    try {
      const snapshot = {}
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index)
        if (key && isAddonKey(key)) snapshot[key] = localStorage.getItem(key)
      }
      localStorage.setItem(backupKey, JSON.stringify(snapshot))
      try { window.postMessage({ channel: 'sasiadmanager-settings-v1', type: 'save', snapshot }, location.origin) } catch (error) {}
      return true
    } catch (error) { return false }
  }
  // Also refresh the recovery copy when an existing module's own Save button is used.
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('button')
    if (button && /zapisz|save/i.test(button.textContent || '')) setTimeout(() => window.__mkPersistAddonSettings?.(), 0)
  }, true)
})()

/* ===================== MENU DODATKÓW (hub) ===================== */
;(function () {
  'use strict'
  if (window.__mkHubInstalled && typeof window.__mkHubShow === 'function') return
  window.__mkHubInstalled = false

  const lsGet = key => { try { return localStorage.getItem(key) } catch (error) { return null } }
  const lsSet = (key, value) => { try { localStorage.setItem(key, value) } catch (error) {} }
  const icon = path => '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' + path + '</svg>'
  const GEAR = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/></svg>'

  // view = widok w tym oknie, który otwiera zębatka; key = klucz localStorage z włączeniem
  const ADDONS = [
    { id: 'ranges', name: 'PRZEDZIAŁY ONLINE', view: 'ranges', key: 'mkOnlineRangesEnabled', checkbox: '.mk-online-ranges-toggle', event: 'mk-online-ranges-toggle',
      desc: 'Pokazuje graczy online w przedziałach poziomów i wysyła zbiórki na Discorda.',
      icon: icon('<path d="M2 13V9M6 13V5M10 13V7M14 13V3"/>') },
    { id: 'heroes', name: 'HEROES ON DISCORD', view: 'discord', key: 'mkHubHeroesEnabled',
      desc: 'Powiadomienia o herosach, tytanach i kolosach na Twoje kanały.',
      icon: icon('<path d="M3 4h10v6H8l-3 3v-3H3z"/>') },
    { id: 'notifier', name: 'NOTYFIKATOR LEGEND', view: 'notifier', key: 'mkHubNotifierEnabled',
      desc: 'Efekt, dźwięk i alert po zdobyciu legendarnego przedmiotu.',
      icon: icon('<path d="M8 2l1.8 3.8 4.2.6-3 3 .7 4.1L8 11.4 4.3 13.5 5 9.4l-3-3 4.2-.6z"/>') },
    { id: 'loot', name: 'ŁUPY TYTANÓW', view: 'loot', key: 'mkTitanLootEnabled_v2', checkbox: '#mk-titan-loot-settings input[type="checkbox"]',
      desc: 'Panel wezwań na łup legendarnych tytanów, osadzony przy czacie.',
      icon: icon('<path d="M3 6h10v7H3zM2 6l1.5-3h9L14 6M8 6v7"/>') },
    { id: 'colossus', name: 'WEZWANIE NA KOLOSA', view: 'colossus', key: 'mkColossusGroupPromptEnabled', checkbox: '.mk-colossus-prompt-toggle', event: 'mk-colossus-prompt-toggle',
      desc: 'Okno „Zbieramy grupę na kolosa?” w przedsionkach kolosów.',
      icon: icon('<circle cx="5.5" cy="6" r="2"/><circle cx="11" cy="6.5" r="1.6"/><path d="M2 13c.4-2 1.8-3 3.5-3s3.1 1 3.5 3M10 10.2c1.8-.3 3.5.5 4 2.8"/>') },
    { id: 'party', name: 'PODZIAŁ GRUP', view: 'party', key: 'mkBalancedPartyEnabled',
      desc: 'Otwiera osobne okno z podziałem graczy według profesji i poziomu oraz zaproszeniem grupy 1.',
      icon: icon('<circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M1.5 13c.3-2 1.5-3 3.5-3s3.2 1 3.5 3M7.5 13c.3-2 1.5-3 3.5-3s3.2 1 3.5 3"/>') },    { id: 'fightstats', name: 'STATYSTYKI WALK', view: 'fightstats', key: 'mwsAddonEnabled', event: 'mws-fightstats-toggle',
      desc: 'Licznik obrażeń i leczenia oraz historia ostatnich 10 walk z rankingiem MVP.',
      icon: icon('<path d="M2 13V8M6 13V4M10 13V7M14 13V2"/>') },
  ]
  const byId = id => ADDONS.find(addon => addon.id === id)
  const isOn = addon => lsGet(addon.key) !== '0'

  function setOn(addon, on) {
    const box = addon.checkbox ? (document.querySelector(addon.checkbox) || window.__mkLegacyRangesPanel?.querySelector(addon.checkbox)) : null
    if (box && box.checked !== on) box.click()
    if (lsGet(addon.key) !== (on ? '1' : '0')) {
      lsSet(addon.key, on ? '1' : '0')
      if (addon.event) window.dispatchEvent(new CustomEvent(addon.event, { detail: { enabled: on } }))
    }
  }

  const panelEl = () => document.getElementById('mk-clan-ranges-panel') || window.__mkLegacyRangesPanel || null
  const notify = text => { try { if (typeof window.message === 'function') window.message(text) } catch (error) {} }

  /* ---------- styl ---------- */
  const style = document.createElement('style')
  style.id = 'mk-hub-style'
  style.textContent = [
    // The legacy ranges window is removed from the DOM during initialization.
    '#mk-hub{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147482900;width:min(760px,calc(100vw - 16px));height:min(470px,calc(100vh - 16px));display:none;flex-direction:column;border:2px solid rgba(144,123,255,.32);border-radius:14px;background:linear-gradient(180deg,#221241,#0d081f);box-shadow:0 18px 48px rgba(0,0,0,.6);color:#f3f3ff;font:13px/1.4 Inter,"Segoe UI",Arial,sans-serif;overflow:hidden}',
    '#mk-hub.open{display:flex}',
    '#mk-hub *{box-sizing:border-box}',
    '#mk-hub button,#mk-hub input,#mk-hub select{font-family:inherit}',
    '#mk-hub .hd{display:flex;align-items:center;height:40px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;cursor:grab;user-select:none}',
    '#mk-hub .hd:active{cursor:grabbing}',
    '#mk-hub .hd-t{flex:1;text-align:center;font-size:13px;font-weight:700;letter-spacing:.04em;color:#c9c1ff}',
    '#mk-hub .x{width:26px;height:26px;border:1px solid rgba(255,255,255,.14);border-radius:7px;background:rgba(255,255,255,.06);color:#e7e3ff;font-size:16px;line-height:1;padding:0;cursor:pointer}',
    '#mk-hub .bd{display:flex;gap:12px;padding:12px;flex:1;min-height:0}',
    '#mk-hub .sb{display:flex;flex-direction:column;gap:8px;width:168px;flex:none}',
    '#mk-hub .nav{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:0 12px;border:1px solid rgba(144,123,255,.22);border-radius:9px;background:rgba(255,255,255,.04);color:#d9d4f5;font-size:13px;font-weight:600;text-align:left;cursor:pointer}',
    '#mk-hub .nav:hover{background:rgba(255,255,255,.09)}',
    '#mk-hub .nav.on{background:rgba(99,102,241,.34);border-color:rgba(165,180,252,.7);color:#fff}',
    '#mk-hub .sep{height:1px;background:rgba(255,255,255,.1);margin:4px 0}',
    '#mk-hub .mn{display:flex;flex-direction:column;gap:10px;flex:1;min-width:0;min-height:0}',
    '#mk-hub .sr{display:flex;gap:8px;align-items:center;flex:none}',
    '#mk-hub .q{flex:1;height:34px;padding:0 12px;border:1px solid rgba(144,123,255,.28);border-radius:9px;background:rgba(10,7,24,.72);color:#f3f3ff;font-size:13px;text-align:center;outline:none}',
    '#mk-hub .q:focus{border-color:#907bff;box-shadow:0 0 0 2px rgba(144,123,255,.2)}',
    '#mk-hub .cnt{min-width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(165,180,252,.5);border-radius:9px;background:rgba(99,102,241,.28);font-weight:700}',
    '#mk-hub .gr{display:grid;grid-template-columns:1fr 1fr;gap:10px;overflow-y:auto;align-content:start;min-height:0;padding-right:2px}',
    '#mk-hub .ct{display:none;flex:1;min-height:0;overflow-y:auto;padding-right:2px}',
    '#mk-hub .mk-hub-ranges-config .mk-config{display:block!important;max-height:none;overflow:visible;padding:10px;border:1px solid rgba(144,123,255,.22);border-radius:10px;background:rgba(8,8,25,.42)}',
    '#mk-hub .mk-hub-ranges-config .mk-config-row{gap:6px;margin-bottom:7px}',
    '#mk-hub .mk-hub-ranges-config .mk-config-input{min-height:30px;padding:5px 8px;border-radius:7px;font-size:12px}',
    '#mk-hub .mk-hub-ranges-config .mk-config-btn{min-height:30px;padding:5px 10px;border-radius:7px;font-size:12px}',
    '#mk-hub .mk-hub-ranges-config .mk-config-adv{padding:9px;border-radius:8px}',
    '#mk-hub .mk-hub-ranges-config .mk-config-actions{gap:8px}',
    '#mk-hub .card{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid rgba(144,123,255,.26);border-radius:10px;background:rgba(255,255,255,.045)}',
    '#mk-hub .card.off{background:rgba(255,255,255,.02);border-color:rgba(144,123,255,.14)}',
    '#mk-hub .top{display:flex;align-items:center;gap:10px}',
    '#mk-hub .ic{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:#2b1f5c;color:#c9c1ff;flex:none}',
    '#mk-hub .off .ic{background:#1f1a3d;color:#8f89b3}',
    '#mk-hub .nm{flex:1;font-size:13px;font-weight:700;letter-spacing:.02em;color:#f3f3ff}',
    '#mk-hub .ds{margin:0;font-size:11.5px;line-height:1.45;color:#b4adda}',
    '#mk-hub .off .nm,#mk-hub .off .ds{color:#8f89b3}',
    '#mk-hub .gear{width:28px;height:28px;border:1px solid rgba(144,123,255,.3);border-radius:7px;background:rgba(255,255,255,.05);color:#d9d4f5;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}',
    '#mk-hub .gear:hover{background:rgba(255,255,255,.12)}',
    '#mk-hub .tg{position:relative;width:34px;height:20px;border:0;border-radius:10px;background:#4f46e5;padding:0;flex:none;cursor:pointer}',
    '#mk-hub .tg:after{content:"";position:absolute;top:3px;left:17px;width:14px;height:14px;border-radius:50%;background:#fff}',
    '#mk-hub .tg.o{background:#3a3560}#mk-hub .tg.o:after{left:3px;background:#a7a0c9}',
    '#mk-hub .empty,#mk-hub .info{color:#b4adda;font-size:12.5px;line-height:1.55;padding:6px 2px}',
    '#mk-hub .info h3,#mk-hub .sec h3{margin:0 0 8px;font-size:14px;color:#f3f3ff}#mk-hub .info p{margin:0 0 8px}',
    '#mk-hub .sec{display:flex;flex-direction:column;gap:10px;padding:2px}',
    '#mk-hub .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(144,123,255,.24);border-radius:10px;background:rgba(255,255,255,.045);color:#e7e3ff;font-size:13px}',
    '#mk-hub .row select{min-width:130px;height:30px;padding:0 8px;border:1px solid rgba(144,123,255,.35);border-radius:7px;background:rgba(10,7,24,.8);color:#f3f3ff}',
    '#mk-hub .row input[type=color]{width:46px;height:28px;padding:0;border:1px solid rgba(144,123,255,.35);border-radius:7px;background:transparent;cursor:pointer}',
    '#mk-hub .row button.sc{min-width:130px;height:30px;padding:0 10px;border:1px solid rgba(144,123,255,.35);border-radius:7px;background:rgba(99,102,241,.25);color:#fff;cursor:pointer}',
    '#mk-hub .field{display:flex;flex-direction:column;gap:5px;padding:9px 11px;border:1px solid rgba(144,123,255,.24);border-radius:10px;background:rgba(255,255,255,.045);color:#e7e3ff;font-size:12px}',
    '#mk-hub .field input,#mk-hub .field textarea{width:100%;min-height:34px;padding:8px 10px;border:1px solid rgba(144,123,255,.32);border-radius:7px;background:rgba(10,7,24,.72);color:#f3f3ff;outline:none}',
    '#mk-hub .field textarea{min-height:220px;resize:vertical;font:12px/1.45 Consolas,monospace}',
    '#mk-hub .field input:focus,#mk-hub .field textarea:focus{border-color:#907bff;box-shadow:0 0 0 2px rgba(144,123,255,.16)}',
    '#mk-hub .actions{display:flex;justify-content:flex-end;gap:8px}',
    '#mk-hub .actions .sc{height:34px;padding:0 14px;border:1px solid rgba(144,123,255,.38);border-radius:8px;background:#5745d8;color:#fff;font-weight:700;cursor:pointer}',
    '#mk-hub .save-status{min-height:18px;color:#86efac;font-size:11px}',
    '#mk-hub .mk-settings-save-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}',
    '#mk-hub .mk-settings-save-row .sc{height:34px;flex:none;padding:0 14px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 70%,#fff);border-radius:8px;background:color-mix(in srgb,var(--mkhd-addon-theme) 78%,#111827);color:#fff;font-weight:700;cursor:pointer;transition:filter .15s,transform .15s}',
    '#mk-hub .mk-settings-save-row .sc:hover{filter:brightness(1.14);transform:translateY(-1px)}',
    '#mk-hub .mk-settings-save-row .save-status{flex:1;text-align:right}',
    '#mk-hub .hint{margin:0;font-size:11.5px;line-height:1.45;color:#b4adda}',
    '#mk-hub .heroes-discord__setup--inline .heroes-discord__background{max-height:none!important;overflow:visible!important}',
    '#mk-hub .mk-leg-settings{margin:0}',
    '@media(max-width:640px){#mk-hub .sb{width:46px}#mk-hub .nav{padding:0;justify-content:center}#mk-hub .nav span{display:none}#mk-hub .gr{grid-template-columns:1fr}}'
  ].join('\n')
  document.head.appendChild(style)
  const themeStyle = document.createElement('style')
  themeStyle.id = 'mk-hub-theme-style'
  themeStyle.textContent = `
    #mk-hub{--mkhd-addon-theme:#6366f1;border-color:color-mix(in srgb,var(--mkhd-addon-theme) 48%,#20243a);box-shadow:0 18px 48px rgba(0,0,0,.6),0 0 0 1px color-mix(in srgb,var(--mkhd-addon-theme) 16%,transparent)}
    #mk-hub .hd-t{color:color-mix(in srgb,var(--mkhd-addon-theme) 55%,#fff)}
    #mk-hub .nav,#mk-hub .q,#mk-hub .card,#mk-hub .gear,#mk-hub .row,#mk-hub .field{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 26%,rgba(255,255,255,.1))}
    #mk-hub .nav.on{background:color-mix(in srgb,var(--mkhd-addon-theme) 34%,#111827);border-color:color-mix(in srgb,var(--mkhd-addon-theme) 72%,#cbd5e1)}
    #mk-hub .q:focus,#mk-hub .field input:focus,#mk-hub .field textarea:focus{border-color:var(--mkhd-addon-theme);box-shadow:0 0 0 2px color-mix(in srgb,var(--mkhd-addon-theme) 24%,transparent)}
    #mk-hub .cnt{background:color-mix(in srgb,var(--mkhd-addon-theme) 28%,#111827);border-color:color-mix(in srgb,var(--mkhd-addon-theme) 58%,#cbd5e1)}
    #mk-hub .ic{background:color-mix(in srgb,var(--mkhd-addon-theme) 34%,#111827);color:color-mix(in srgb,var(--mkhd-addon-theme) 55%,#fff)}
    #mk-hub .gear,#mk-hub .row select,#mk-hub .row input[type=color],#mk-hub .field input,#mk-hub .field textarea{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 38%,rgba(255,255,255,.12))}
    #mk-hub .tg:not(.o){background:var(--mkhd-addon-theme)}
    #mk-hub .actions .sc{background:color-mix(in srgb,var(--mkhd-addon-theme) 78%,#111827);border-color:color-mix(in srgb,var(--mkhd-addon-theme) 68%,#fff)}
  `
  document.head.appendChild(themeStyle)

  /* ---------- okno ---------- */
  let root = null, grid = null, content = null, counter = null, search = null, searchRow = null
  let view = 'addons', roleFocus = false, navButtons = [], lookObserver = null

  const HUB_POSITION_KEY = 'mkHubWindowPositionV1'
  function restoreHubPosition() {
    if (!root) return
    let saved = null
    try { saved = JSON.parse(lsGet(HUB_POSITION_KEY) || 'null') } catch (error) {}
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      root.style.transform = 'none'
      root.style.left = saved.left + 'px'
      root.style.top = saved.top + 'px'
      root.dataset.userPositioned = '1'
    } else {
      root.style.left = '50%'
      root.style.top = '50%'
      root.style.transform = 'translate(-50%,-50%)'
      delete root.dataset.userPositioned
    }
  }
  function clampHubToViewport() {
    if (!root || !root.classList.contains('open') || root.dataset.userPositioned !== '1') return
    const rect = root.getBoundingClientRect()
    const margin = 8
    root.style.left = Math.max(margin, Math.min(rect.left, innerWidth - rect.width - margin)) + 'px'
    root.style.top = Math.max(margin, Math.min(rect.top, innerHeight - rect.height - margin)) + 'px'
  }
  window.addEventListener('resize', clampHubToViewport)

  const NAV = [
    { id: 'addons', label: 'Dodatki', icon: icon('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>') },
    { id: 'webhooks', label: 'Webhooki', icon: icon('<path d="M6 10l4-4M5 7L3.5 8.5a2.5 2.5 0 003.5 3.5L8.5 10.5M11 9l1.5-1.5A2.5 2.5 0 009 4L7.5 5.5"/>') },
    { id: 'roles', label: 'Role i pingi', icon: icon('<circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.6-2.4 2.5-3.5 5-3.5s4.4 1.1 5 3.5"/>') },
    { id: 'look', label: 'Wygląd i ustawienia', icon: icon('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"/>') },
    { sep: true },
    { id: 'info', label: 'Informacje', icon: icon('<circle cx="8" cy="8" r="6"/><path d="M8 7.2V11M8 5v.1"/>') }
  ]

  function build() {
    root = document.createElement('div')
    root.id = 'mk-hub'
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', 'Menu dodatków')
    root.innerHTML = '<div class="hd"><div class="hd-t">Heroes on Discord · Dodatki</div><button class="x" type="button" aria-label="Zamknij">×</button></div>' +
      '<div class="bd"><div class="sb"></div><div class="mn"><div class="sr"><input class="q" type="text" aria-label="Szukaj dodatku" placeholder="Szukaj dodatku..."><div class="cnt" aria-label="Włączone dodatki"></div></div><div class="gr"></div><div class="ct"></div></div></div>'
    const sidebar = root.querySelector('.sb')
    for (const item of NAV) {
      if (item.sep) { const sep = document.createElement('div'); sep.className = 'sep'; sidebar.appendChild(sep); continue }
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'nav'
      button.dataset.nav = item.id
      button.title = item.label
      button.innerHTML = item.icon + '<span>' + item.label + '</span>'
      sidebar.appendChild(button)
      navButtons.push(button)
    }
    grid = root.querySelector('.gr')
    content = root.querySelector('.ct')
    counter = root.querySelector('.cnt')
    search = root.querySelector('.q')
    searchRow = root.querySelector('.sr')

    root.querySelector('.x').addEventListener('click', hide)
    const header = root.querySelector('.hd')
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return
      event.preventDefault()
      const rect = root.getBoundingClientRect()
      root.style.transform = 'none'
      root.style.left = rect.left + 'px'
      root.style.top = rect.top + 'px'
      root.dataset.userPositioned = '1'
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top
      const move = moveEvent => {
        const margin = 8
        root.style.left = Math.max(margin, Math.min(innerWidth - root.offsetWidth - margin, moveEvent.clientX - offsetX)) + 'px'
        root.style.top = Math.max(margin, Math.min(innerHeight - root.offsetHeight - margin, moveEvent.clientY - offsetY)) + 'px'
      }
      const stop = () => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', stop)
        document.removeEventListener('pointercancel', stop)
        try {
          localStorage.setItem(HUB_POSITION_KEY, JSON.stringify({ left: parseFloat(root.style.left), top: parseFloat(root.style.top) }))
          window.__mkPersistAddonSettings?.()
        } catch (error) {}
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', stop)
      document.addEventListener('pointercancel', stop)
    })
    search.addEventListener('input', renderCards)
    sidebar.addEventListener('click', event => {
      const button = event.target.closest('.nav')
      if (!button) return
      const id = button.dataset.nav
      if (id === 'webhooks' || id === 'roles') setView('discord', id === 'roles')
      else setView(id)
    })
    grid.addEventListener('click', event => {
      const card = event.target.closest('.card')
      const addon = card && byId(card.dataset.id)
      if (!addon) return
      if (event.target.closest('.gear')) { openAddon(addon); return }
      if (event.target.closest('.tg')) { setOn(addon, !isOn(addon)); renderCards() }
    })
    for (const type of ['wheel', 'mousedown', 'mouseup', 'contextmenu']) root.addEventListener(type, event => event.stopPropagation(), { passive: true })
    for (const type of ['keydown', 'keyup', 'keypress']) root.addEventListener(type, event => { if (event.target.closest('input,textarea,select')) event.stopPropagation() })

    document.body.appendChild(root)
    root.style.setProperty('--mkhd-addon-theme', getComputedStyle(document.documentElement).getPropertyValue('--mkhd-addon-theme').trim() || '#6366f1')
    try { window.__mkApplyAddonAppearance?.() } catch (error) { console.warn("[Heroes on Discord] Nie udało się zastosować wyglądu menu:", error) }
  }

  /* ---------- widoki ---------- */
  function closeDiscordForm() {
    window.__mkHubDiscordHost = null
    try { window.__heroesDiscordCloseSettings && window.__heroesDiscordCloseSettings(false) } catch (error) {}
  }

  function stopLookObserver() { if (lookObserver) { lookObserver.disconnect(); lookObserver = null } }

  function openAddon(addon) {
    if ((addon.view === 'ranges' || addon.view === 'party') && !isOn(addon)) { notify('Najpierw włącz ' + addon.name + '.'); return }
    if (addon.view === 'party') { openPartyWindow(); hide(); return }
    setView(addon.view)
  }

  function closeRangesConfig() { try { window.__mkHubUnmountRangesConfig?.() } catch (error) {} }

  function setView(next, roles) {
    if (view === 'discord' && next !== 'discord') closeDiscordForm()
    if (view === 'ranges' && next !== 'ranges') closeRangesConfig()
    stopLookObserver()
    view = next
    roleFocus = !!roles
    render()
  }

  function discordConfig() {
    try { return window.__mkHubReadDiscordConfig?.() || JSON.parse(lsGet('heroes-discord') || '{}') } catch (error) { return {} }
  }

  function saveDiscordConfig(patch, status) {
    const saved = window.__mkHubSaveDiscordConfig?.(patch)
    if (saved) window.__mkPersistAddonSettings?.()
    if (status) status.textContent = saved ? 'Zapisano ustawienia.' : 'Nie udało się zapisać. Spróbuj ponownie.'
  }

  function buildDiscord() {
    const config = discordConfig()
    const box = section(roleFocus ? 'Role i pingi' : 'Webhooki Discorda')
    content.appendChild(box)
    if (!window.__mkHubReadDiscordConfig) { box.appendChild(hint('Ustawienia Discorda jeszcze się wczytują. Zamknij i otwórz menu za chwilę.')); return }
    if (roleFocus) {
      const field = document.createElement('label')
      field.className = 'field'
      field.appendChild(Object.assign(document.createElement('span'), { textContent: 'Role dla potworów — nazwa: ID roli. Puste ID wyłącza ping.' }))
      const area = document.createElement('textarea')
      area.value = JSON.stringify(config.roleMappings || {}, null, 2)
      field.appendChild(area)
      box.append(field, hint('ID roli znajdziesz w Discordzie po włączeniu trybu deweloperskiego. Event używa osobnej, stałej roli @event.'))
      const status = document.createElement('div'); status.className = 'save-status'
      const actions = document.createElement('div'); actions.className = 'actions'
      const save = document.createElement('button'); save.type = 'button'; save.className = 'sc'; save.textContent = 'Zapisz role i pingi'
      save.addEventListener('click', () => {
        try {
          const roles = JSON.parse(area.value || '{}')
          if (!roles || typeof roles !== 'object' || Array.isArray(roles)) throw new Error('invalid')
          saveDiscordConfig({ roleMappings: roles }, status)
        } catch (error) { status.style.color = '#fca5a5'; status.textContent = 'Wpisz poprawny obiekt JSON z rolami i ich ID.' }
      })
      actions.appendChild(save); box.append(status, actions)
      return
    }
    const inputs = {}
    const addField = (label, key, placeholder) => {
      const field = document.createElement('label'); field.className = 'field'
      field.appendChild(Object.assign(document.createElement('span'), { textContent: label }))
      const input = document.createElement('input'); input.type = 'url'; input.placeholder = placeholder || 'https://discord.com/api/webhooks/...'; input.value = config.webhookUrls?.[key] || ''
      inputs[key] = input; field.appendChild(input); box.appendChild(field)
    }
    addField('Webhook Discorda — Herosi', 'heroes')
    addField('Webhook Discorda — Kolosi', 'colossi')
    addField('Webhook Discorda — Tytani', 'titans')
    addField('Webhook Discorda — Event (@event)', 'event')
    box.appendChild(hint('Każdy adres jest zapisywany lokalnie na tym koncie gry. Wklej własny webhook dla każdego kanału.'))
    const nameField = document.createElement('label'); nameField.className = 'field'
    nameField.appendChild(Object.assign(document.createElement('span'), { textContent: 'Nick wysyłającego (opcjonalnie)' }))
    const name = document.createElement('input'); name.type = 'text'; name.value = config.name || ''; name.placeholder = 'Domyślnie nick postaci'; nameField.appendChild(name); box.appendChild(nameField)
    const eventRow = document.createElement('label'); eventRow.className = 'row'
    const eventLabel = document.createElement('span'); eventLabel.textContent = 'Automatyczne alerty o herosach eventowych z pingiem @event'
    const eventToggle = document.createElement('input'); eventToggle.type = 'checkbox'; eventToggle.checked = config.eventAlertsEnabled !== false
    eventRow.append(eventLabel,eventToggle); box.appendChild(eventRow)
    const status = document.createElement('div'); status.className = 'save-status'
    const actions = document.createElement('div'); actions.className = 'actions'
    const save = document.createElement('button'); save.type = 'button'; save.className = 'sc'; save.textContent = 'Zapisz webhooki'
    save.addEventListener('click', () => saveDiscordConfig({ webhookUrls: Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value.trim()])), name: name.value, eventAlertsEnabled: eventToggle.checked }, status))
    actions.appendChild(save); box.append(status,actions)
  }

  function toggleRow(addon, label) {
    const row = document.createElement('div')
    row.className = 'row'
    const on = isOn(addon)
    row.innerHTML = '<span>' + label + '</span><button class="tg' + (on ? '' : ' o') + '" type="button" aria-pressed="' + on + '" aria-label="' + label + (on ? ' włączone' : ' wyłączone') + '"></button>'
    row.querySelector('.tg').addEventListener('click', () => { setOn(addon, !isOn(addon)); render() })
    return row
  }

  function section(title) {
    const box = document.createElement('div')
    box.className = 'sec'
    box.innerHTML = '<h3></h3>'
    box.querySelector('h3').textContent = title
    return box
  }
  function hint(text) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = text; return p }

  /* ---------- podział grup z mapy ---------- */
  const partyProfLabel = value => ({ t:'T', w:'W', m:'M', p:'P', h:'H', b:'B', wojownik:'Wojownik', mag:'Mag', tropiciel:'Tropiciel', paladyn:'Paladyn', lowca:'Łowca', łowca:'Łowca' }[(value || '?').toLowerCase()] || value || '?')
  function partyReadPlayers(engine) {
    const list = engine?.others?.getDrawableList?.()
    if (!Array.isArray(list)) throw new Error('Nie udało się odczytać graczy z mapy.')
    const ownId = String(engine.hero?.getId?.() ?? engine.hero?.d?.id ?? '')
    const found = new Map()
    for (const entity of list) {
      if (!entity?.isPlayer) continue
      const d = entity.d || entity, id = d.id ?? entity.id
      if (id == null || String(id) === ownId) continue
      found.set(String(id), {
        id: String(id), name: String(d.nick ?? d.name ?? d.nick2 ?? entity.nick ?? entity.name ?? ('Gracz ' + id)),
        prof: String(d.prof ?? d.profession ?? entity.prof ?? '?'),
        lvl: Number(d.lvl ?? d.level ?? entity.lvl ?? 0) || 0, self: false
      })
    }
    const hero = engine.hero, d = hero?.d || hero, heroId = ownId || String(d?.id ?? '')
    if (heroId && d) found.set(heroId, {
      id: heroId, name: String(d.nick ?? d.name ?? d.nick2 ?? heroId),
      prof: String(d.prof ?? d.profession ?? '?'), lvl: Number(d.lvl ?? d.level ?? 0) || 0, self: true
    })
    return [...found.values()]
  }
  const partyScore = (a, b) => {
    const all = [...a, ...b], avg = Math.max(1, all.reduce((sum, p) => sum + p.lvl, 0) / Math.max(1, all.length))
    let profDiff = 0
    for (const p of new Set(all.map(x => partyProfLabel(x.prof)))) {
      profDiff += Math.abs(a.filter(x => partyProfLabel(x.prof) === p).length - b.filter(x => partyProfLabel(x.prof) === p).length)
    }
    return Math.abs(a.length - b.length) * 4 +
      Math.abs(a.reduce((sum, p) => sum + p.lvl, 0) - b.reduce((sum, p) => sum + p.lvl, 0)) / avg +
      profDiff * 2.5
  }
  function partySplit(players) {
    const teams = [[], []]
    for (const player of [...players].sort((a, b) => b.lvl - a.lvl || a.name.localeCompare(b.name, 'pl'))) {
      const choices = [0, 1].map(i => {
        const trial = teams.map(team => [...team]); trial[i].push(player)
        return { i, score: partyScore(...trial) }
      }).sort((a, b) => a.score - b.score || teams[a.i].length - teams[b.i].length)
      teams[choices[0].i].push(player)
    }
    for (let pass = 0; pass < 3; pass++) {
      let changed = false
      for (let i = 0; i < teams[0].length; i++) for (let j = 0; j < teams[1].length; j++) {
        const trial = teams.map(team => [...team]); [trial[0][i], trial[1][j]] = [trial[1][j], trial[0][i]]
        if (partyScore(...trial) + 0.001 < partyScore(...teams)) { teams[0] = trial[0]; teams[1] = trial[1]; changed = true }
      }
      if (!changed) break
    }
    return teams
  }
  let partyWindow = null
  const PARTY_POSITION_KEY = 'mkBalancedPartyWindowPositionV1'
  const PARTY_OPEN_KEY = 'mkBalancedPartyWindowOpenV1'
  function savePartyPosition() {
    if (!partyWindow) return
    try { const r = partyWindow.getBoundingClientRect(); lsSet(PARTY_POSITION_KEY, JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top) })); window.__mkPersistAddonSettings?.() } catch (error) {}
  }
  function restorePartyPosition() {
    if (!partyWindow) return
    let p = null; try { p = JSON.parse(lsGet(PARTY_POSITION_KEY) || 'null') } catch (error) {}
    if (p && Number.isFinite(p.left) && Number.isFinite(p.top)) {
      partyWindow.style.left = Math.max(6, Math.min(innerWidth - partyWindow.offsetWidth - 6, p.left)) + 'px'
      partyWindow.style.top = Math.max(6, Math.min(innerHeight - partyWindow.offsetHeight - 6, p.top)) + 'px'
      partyWindow.style.right = 'auto'; partyWindow.style.bottom = 'auto'
    } else { partyWindow.style.left = 'auto'; partyWindow.style.top = 'auto'; partyWindow.style.right = '18px'; partyWindow.style.bottom = '72px' }
  }
  function openPartyWindow() {
    if (!partyWindow || !document.body.contains(partyWindow)) {
      const style = document.createElement('style'); style.id = 'mk-party-floating-style'
      if (!document.getElementById(style.id)) {
        style.textContent = '#mk-party-floating{position:fixed;right:18px;bottom:72px;z-index:2147482800;width:min(480px,calc(100vw - 24px));max-height:min(76vh,680px);overflow:auto;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 48%,#20243a);border-radius:14px;background:linear-gradient(180deg,#221241,#0d081f);box-shadow:0 18px 48px rgba(0,0,0,.6),0 0 0 1px color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 16%,transparent);color:#f3f3ff;font:13px/1.4 Inter,"Segoe UI",Arial,sans-serif;overflow:hidden}#mk-party-floating *{box-sizing:border-box}#mk-party-floating .mk-party-head{display:flex;align-items:center;height:40px;gap:8px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08);cursor:grab;user-select:none}#mk-party-floating .mk-party-head:active{cursor:grabbing}#mk-party-floating .mk-party-title{flex:1;text-align:center;color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 55%,#fff);font-size:13px;font-weight:700;letter-spacing:.04em}#mk-party-floating .mk-party-close{width:26px;height:26px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 26%,rgba(255,255,255,.1));border-radius:7px;background:rgba(255,255,255,.06);color:#e7e3ff;font-size:16px;line-height:1;padding:0;cursor:pointer}#mk-party-floating .sec{display:flex;flex-direction:column;gap:10px;padding:10px 12px 12px}#mk-party-floating .sec>h3{margin:0;color:#f3f3ff;font-size:14px}#mk-party-floating .hint{margin:0;color:#b4adda;font-size:11.5px;line-height:1.45}#mk-party-floating .actions{display:flex;gap:8px;flex-wrap:wrap}#mk-party-floating .sc{min-height:34px;padding:0 14px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 68%,#fff);border-radius:8px;background:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 78%,#111827);color:#fff;font-weight:700;cursor:pointer}#mk-party-floating .sc:disabled{opacity:.55;cursor:wait}#mk-party-floating .card{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 26%,rgba(255,255,255,.1));border-radius:10px;background:rgba(255,255,255,.045)}#mk-party-floating .nm{margin-bottom:3px;color:#f3f3ff;font-size:12px;font-weight:700}#mk-party-floating .row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 18%,rgba(255,255,255,.1));border-radius:7px;background:rgba(255,255,255,.035);color:#e7e3ff;font-size:12px}#mk-party-floating .row small{color:#b4adda;white-space:nowrap}#mk-party-floating .mk-party-body{overflow:auto;max-height:calc(min(76vh,680px) - 40px)}'
        document.head.appendChild(style)
      }
      partyWindow = document.createElement('div'); partyWindow.id = 'mk-party-floating'
      partyWindow.innerHTML = '<div class="mk-party-head"><div class="mk-party-title">PODZIAŁ GRUP</div><button type="button" class="mk-party-close" aria-label="Zamknij">×</button></div><div class="mk-party-body"></div>'
      document.body.appendChild(partyWindow)
      partyWindow.querySelector('.mk-party-head').addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) return
        event.preventDefault()
        const r = partyWindow.getBoundingClientRect(), dx = event.clientX - r.left, dy = event.clientY - r.top
        const move = e => { partyWindow.style.left = Math.max(6, Math.min(innerWidth-partyWindow.offsetWidth-6,e.clientX-dx))+'px'; partyWindow.style.top = Math.max(6,Math.min(innerHeight-partyWindow.offsetHeight-6,e.clientY-dy))+'px'; partyWindow.style.right='auto'; partyWindow.style.bottom='auto' }
        const stop = () => { document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',stop); document.removeEventListener('pointercancel',stop); savePartyPosition() }
        document.addEventListener('pointermove',move); document.addEventListener('pointerup',stop); document.addEventListener('pointercancel',stop)
      })
      partyWindow.querySelector('.mk-party-close').addEventListener('click', () => { partyWindow.style.display='none'; lsSet(PARTY_OPEN_KEY,'0'); window.__mkPersistAddonSettings?.() })
      window.addEventListener('resize', () => { if(partyWindow?.style.display!=='none'){restorePartyPosition();savePartyPosition()} })
    }
    partyWindow.style.display='block'
    partyWindow.style.setProperty('--mkhd-addon-theme',getComputedStyle(document.documentElement).getPropertyValue('--mkhd-addon-theme').trim()||'#6366f1')
    restorePartyPosition(); lsSet(PARTY_OPEN_KEY,'1'); window.__mkPersistAddonSettings?.()
    try { window.__mkApplyAddonAppearance?.() } catch (error) {}
    const host=partyWindow.querySelector('.mk-party-body'); host.replaceChildren(); buildParty(host,true)
    if(!partyWindow._refreshTimer) partyWindow._refreshTimer=setInterval(()=>{
      if(partyWindow?.style.display==='none')return
      if(!isOn(byId('party'))){partyWindow.style.display='none';lsSet(PARTY_OPEN_KEY,'0');return}
      if(!window.__mkPartyInviteBusy)window.__mkPartyRefresh?.()
    },5000)
  }
  function buildParty(host = content, standalone = false) {
    const addon = byId('party'), box = section(standalone ? 'Gracze z mapy' : 'Podział graczy z mapy')
    if (!standalone) box.append(toggleRow(addon, 'Włącz podział grup'))
    box.appendChild(hint('Podział równoważy liczebność, poziomy i profesje. Zaproszenia wysyłasz przyciskiem dla grupy 1.'))
    host.appendChild(box)
    if (!isOn(addon)) { box.appendChild(hint('Włącz dodatek przełącznikiem, aby wyświetlić listę graczy.')); return }
    const actions = document.createElement('div'); actions.className = 'actions'
    const refreshButton = document.createElement('button'); refreshButton.type = 'button'; refreshButton.className = 'sc'; refreshButton.textContent = 'Odśwież i podziel'
    const inviteButton = document.createElement('button'); inviteButton.type = 'button'; inviteButton.className = 'sc'; inviteButton.textContent = 'Zaproś grupę 1'
    const status = document.createElement('p'); status.className = 'hint'; status.setAttribute('aria-live', 'polite')
    const teamList = document.createElement('div'); teamList.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px'
    box.append(actions, teamList, status); actions.append(refreshButton, inviteButton)
    const draw = () => {
      try {
        const engine = window.Engine
        if (!engine?.hero || !engine?.others?.getDrawableList) throw new Error('Silnik gry nie jest jeszcze gotowy. Otwórz widok ponownie za chwilę.')
        window.__mkPartyTeams = partySplit(partyReadPlayers(engine))
        teamList.replaceChildren()
        window.__mkPartyTeams.forEach((team, index) => {
          const card = document.createElement('div'); card.className = 'card'
          const title = document.createElement('div'); title.className = 'nm'; title.textContent = 'GRUPA ' + (index + 1) + ' · ' + team.length + ' osób'
          card.appendChild(title)
          for (const player of team) {
            const row = document.createElement('div'); row.className = 'row'
            const name = document.createElement('span'); name.textContent = player.name + (player.self ? ' (Ty)' : '')
            const data = document.createElement('small'); data.textContent = partyProfLabel(player.prof) + ' · ' + (player.lvl || '?')
            row.append(name, data); card.appendChild(row)
          }
          teamList.appendChild(card)
        })
        status.textContent = 'Lista odświeżona. W podziale jest ' + window.__mkPartyTeams.flat().length + ' graczy.'
      } catch (error) { teamList.replaceChildren(); status.textContent = error.message || 'Nie udało się odczytać graczy.' }
    }
    window.__mkPartyRefresh = draw
    refreshButton.addEventListener('click', draw)
    inviteButton.addEventListener('click', () => {
      if (window.__mkPartyInviteBusy) return
      const teams = window.__mkPartyTeams || [[], []]
      const me = String(window.Engine?.hero?.getId?.() ?? window.Engine?.hero?.d?.id ?? '')
      const targets = teams[0].filter(player => !player.self && player.id !== me)
      if (!targets.length) { status.textContent = 'W grupie 1 nie ma innych graczy do zaproszenia.'; return }
      if (typeof window._g !== 'function') { status.textContent = 'Nie znaleziono funkcji zaproszeń gry. Odśwież grę i spróbuj ponownie.'; return }
      window.__mkPartyInviteBusy = true; inviteButton.disabled = true
      status.textContent = 'Wysyłam prośby o zaproszenie: 0/' + targets.length + '.'
      targets.forEach((player, i) => setTimeout(() => {
        try { window._g('party&a=inv&id=' + encodeURIComponent(player.id)) }
        catch (error) { console.warn('[Podział grup]', error) }
        status.textContent = 'Wysłano prośbę ' + (i + 1) + '/' + targets.length + ': ' + player.name
        if (i === targets.length - 1) {
          window.__mkPartyInviteBusy = false; inviteButton.disabled = false
          status.textContent = 'Zakończono wysyłanie próśb grupy 1 (' + targets.length + ').'
        }
      }, i * 700))
    })
    draw()
  }
  function buildRanges() {
    const box = section('Przedziały Online')
    box.appendChild(toggleRow(byId('ranges'), 'Włącz Przedziały Online'))
    box.appendChild(hint('Konfiguracja przedziałów, progów kolorów, komunikatów i webhooków.'))
    const host = document.createElement('div')
    host.className = 'mk-hub-ranges-config'
    box.appendChild(host)
    content.appendChild(box)
    if (!isOn(byId('ranges'))) { host.appendChild(hint('Włącz Przedziały Online, aby edytować ich ustawienia.')); return }
    if (typeof window.__mkHubMountRangesConfig === 'function' && window.__mkHubMountRangesConfig(host)) return
    host.appendChild(hint('Konfiguracja przedziałów jeszcze się wczytuje. Otwórz ten widok ponownie za chwilę.'))
  }

  function buildLoot() {
    const box = section('Ustawienia łupu')
    box.append(toggleRow(byId('loot'), 'Włącz panel łupu przy czacie'),
      hint('Panel z legendarnymi dropami pojawia się przy czacie na mapie tytana. Kliknięcie przedmiotu wysyła zgłoszenie na czat grupowy.'))
    content.appendChild(box)
  }

  function buildColossus() {
    const box = section('Wezwanie na kolosa')
    box.append(toggleRow(byId('colossus'), 'Włącz okno zbiórki na kolosa'),
      hint('Wyłącza wyskakujące okno zbiórki na przedsionkach kolosów.'))
    content.appendChild(box)
  }

  function buildNotifier() {
    const box = section('Notyfikator Legend')
    box.appendChild(toggleRow(byId('notifier'), 'Włącz notyfikator legend'))
    const host = document.createElement('div')
    box.appendChild(host)
    content.appendChild(box)
    if (typeof window.__legNotifierAttach === 'function') window.__legNotifierAttach(host)
    else host.appendChild(hint('Ustawienia notyfikatora jeszcze się wczytują. Zamknij i otwórz menu za chwilę.'))
  }

  // Kontrolki wyglądu są lustrzanym odbiciem tych z panelu: zmiana tutaj przekazuje wartość do oryginału.
  function buildLook() {
    const panel = panelEl()
    const theme = panel && panel.querySelector('#mk-addon-theme-settings')
    const box = section('Wygląd i ustawienia')
    content.appendChild(box)
    if (!theme) { box.appendChild(hint('Ustawienia wyglądu jeszcze się wczytują. Zamknij i otwórz menu za chwilę.')); return }
    const lang = theme.querySelector('.mk-tl-language')
    const background = theme.querySelector('.mk-tl-background')
    const color = theme.querySelector('input[type="color"]')
    const shortcut = theme.querySelector('.mk-tl-shortcut-button')
    const fire = (el, types) => types.forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })))
    const selectRow = (label, source) => {
      const row = document.createElement('label')
      row.className = 'row'
      row.innerHTML = '<span></span><select></select>'
      row.querySelector('span').textContent = label
      const select = row.querySelector('select')
      select.innerHTML = source.innerHTML
      select.value = source.value
      select.addEventListener('change', () => { source.value = select.value; fire(source, ['change']) })
      return row
    }
    if (lang) box.appendChild(selectRow('Język dodatku', lang))
    if (color) {
      const row = document.createElement('label')
      row.className = 'row'
      row.innerHTML = '<span>Kolor przewodni całego zestawu</span><input type="color" aria-label="Wybierz kolor dodatku">'
      const input = row.querySelector('input')
      input.value = color.value
      input.addEventListener('input', () => { color.value = input.value; fire(color, ['input']) })
      input.addEventListener('change', () => { color.value = input.value; fire(color, ['input', 'change']) })
      box.appendChild(row)
    }
    if (background) box.appendChild(selectRow('Tło dodatku', background))
    if (shortcut) {
      const row = document.createElement('div')
      row.className = 'row'
      row.innerHTML = '<span>Skrót otwierania menu</span><button class="sc" type="button"></button>'
      const button = row.querySelector('button')
      const sync = () => { button.textContent = shortcut.textContent }
      sync()
      button.addEventListener('click', () => shortcut.click())
      lookObserver = new MutationObserver(sync)
      lookObserver.observe(shortcut, { childList: true, characterData: true, subtree: true })
      box.append(row, hint('Kliknij przycisk i naciśnij nowy skrót. Escape anuluje zmianę.'))
    }
  }

  function buildInfo() {
    const box = document.createElement('div')
    box.className = 'info'
    box.innerHTML = '<h3>Heroes on Discord + Notyfikator Legend + Przedziały Online + Łupy Tytanów + Podział Grup + Statystyki Walk</h3>' +
      '<p>Wersja 4.63.1. Wszystkie dodatki masz w jednym miejscu: przełącznik włącza lub wyłącza dodatek, a zębatka otwiera jego widok w tym oknie. Statystyki Walk pokazują bieżącą walkę i lokalną historię 10 ostatnich starć.</p>' +
      '<p>Webhooki, role i pingi ustawiasz w zakładkach Webhooki i Role i pingi. Przedziały Online działają na mapie, a ich konfigurację znajdziesz w tym nowym oknie po kliknięciu zębatki.</p>'
    content.appendChild(box)
  }

  function renderCards() {
    if (!root) return
    const enabledCount = ADDONS.filter(isOn).length
    counter.textContent = String(enabledCount)
    counter.setAttribute('aria-label', 'Włączone dodatki: ' + enabledCount)
    const query = search.value.trim().toLowerCase()
    const list = ADDONS.filter(addon => !query || (addon.name + ' ' + addon.desc).toLowerCase().includes(query))
    if (!list.length) { grid.style.display = 'block'; grid.innerHTML = '<div class="empty">Brak dodatku pasującego do wyszukiwania.</div>'; return }
    grid.style.display = ''
    grid.innerHTML = list.map(addon => {
      const on = isOn(addon)
      return '<div class="card' + (on ? '' : ' off') + '" data-id="' + addon.id + '"><div class="top"><div class="ic">' + addon.icon + '</div><div class="nm">' + addon.name + '</div>' +
        '<button class="gear" type="button" aria-label="Ustawienia: ' + addon.name + '">' + GEAR + '</button>' +
        '<button class="tg' + (on ? '' : ' o') + '" type="button" aria-pressed="' + on + '" aria-label="' + addon.name + (on ? ' włączony' : ' wyłączony') + '"></button></div>' +
        '<p class="ds">' + addon.desc + '</p></div>'
    }).join('')
  }

  function render() {
    if (!root) return
    const navFor = view === 'discord' ? (roleFocus ? 'roles' : 'webhooks') : (view === 'look' || view === 'info' ? view : 'addons')
    for (const button of navButtons) button.classList.toggle('on', button.dataset.nav === navFor)
    const cards = view === 'addons'
    searchRow.style.display = cards ? 'flex' : 'none'
    grid.style.display = cards ? '' : 'none'
    content.style.display = cards ? 'none' : 'block'
    if (cards) { renderCards(); return }
    content.innerHTML = ''
    if (view === 'ranges') buildRanges()
    else if (view === 'party') buildParty()
    else if (view === 'loot') buildLoot()
    else if (view === 'colossus') buildColossus()
    else if (view === 'notifier') buildNotifier()
    else if (view === 'discord') buildDiscord()
    else if (view === 'look') buildLook()
    else if (view === 'info') buildInfo()
    else if (view === 'fightstats') { if (typeof window.__mkBuildFightStatsView === 'function') window.__mkBuildFightStatsView(content); else content.appendChild(hint('Statystyki walk jeszcze się ładują. Otwórz widok ponownie za chwilę.')) }
    if (['ranges', 'party', 'loot', 'colossus', 'notifier', 'discord', 'look'].includes(view)) {
      const saveRow = document.createElement('div')
      saveRow.className = 'mk-settings-save-row'
      const saveStatus = document.createElement('div')
      saveStatus.className = 'save-status'
      const saveButton = document.createElement('button')
      saveButton.type = 'button'
      saveButton.className = 'sc'
      saveButton.textContent = 'Zapisz ustawienia'
      saveButton.addEventListener('click', () => {
        const saved = window.__mkPersistAddonSettings?.()
        saveStatus.textContent = saved ? 'Ustawienia zapisane i zostaną przywrócone po F5.' : 'Nie udało się zapisać ustawień w pamięci przeglądarki.'
        saveStatus.style.color = saved ? '#86efac' : '#fca5a5'
      })
      saveRow.append(saveButton, saveStatus)
      content.appendChild(saveRow)
    }
  }

  // Zamykanie starego formularza Discorda nie steruje widokami nowego menedżera.
  window.addEventListener('heroes-discord:settings-closed', () => {
    if (root && root.classList.contains('open') && view === 'discord') render()
  })

  function show() {
    try { if (!root) build() } catch (error) { console.error('[Heroes on Discord] Błąd tworzenia menu dodatków:', error) }
    if (!root) return
    if (view === 'discord') closeDiscordForm()
    stopLookObserver()
    view = 'addons'
    if (search) search.value = ''
    try { render() } catch (error) {
      console.error('[Heroes on Discord] Błąd widoku menu dodatków:', error)
      if (content) {
        content.innerHTML = '<div class="info"><h3>Menu dodatków</h3><p>Panel jest otwarty, ale nie udało się odświeżyć jego zawartości. Odśwież grę klawiszem F5.</p></div>'
        content.style.display = 'block'
        if (grid) grid.style.display = 'none'
        if (searchRow) searchRow.style.display = 'none'
      }
    }
    restoreHubPosition()
    root.classList.add('open')
    root.style.setProperty('display', 'flex', 'important')
    requestAnimationFrame(clampHubToViewport)
  }  function hide() {
    if (!root) return
    if (view === 'discord') closeDiscordForm()
    if (view === 'ranges') closeRangesConfig()
    stopLookObserver()
    root.classList.remove('open')
    root.style.setProperty('display', 'none', 'important')
  }
  function toggle() { if (root && root.classList.contains('open')) hide(); else show() }

  window.__mkHubOpenRangesSettings = () => {
    if (!root) build()
    if (view === 'discord') closeDiscordForm()
    stopLookObserver()
    view = 'ranges'
    roleFocus = false
    render()
    restoreHubPosition()
    root.classList.add('open')
    root.style.setProperty('display', 'flex', 'important')
    requestAnimationFrame(clampHubToViewport)
  }
  if (lsGet(PARTY_OPEN_KEY) === '1' && isOn(byId('party'))) {
    let restoreAttempts = 0
    const restoreTimer = setInterval(() => {
      if (lsGet(PARTY_OPEN_KEY) !== '1' || !isOn(byId('party'))) { clearInterval(restoreTimer); return }
      if (window.Engine?.hero && window.Engine?.others?.getDrawableList) { clearInterval(restoreTimer); openPartyWindow(); return }
      if (++restoreAttempts >= 120) clearInterval(restoreTimer)
    }, 500)
  }  window.__mkHubToggle = toggle
  window.__mkHubShow = show
  window.__mkHubRefreshFightStats = () => { if (root && root.classList.contains('open') && view === 'fightstats') render() }
  window.__mkHubInstalled = true
  window.addEventListener('mk-hub-toggle', toggle)
})();

/* ===================== STATYSTYKI WALK ===================== */
;(function () {
  'use strict'
  if (window.__mkFightStatsBundleInstalled) return
  window.__mkFightStatsBundleInstalled = true

  const STORE_KEY = 'mojeStatystykiWalk.history.v1'
  const ENABLED_KEY = 'mwsAddonEnabled'
  const MAX_HISTORY = 10
  const state = { current: null, history: loadHistory(), seen: new Set(), calls: 0, status: 'Szukam silnika walki…' }
  const enabled = () => { try { return localStorage.getItem(ENABLED_KEY) !== '0' } catch (error) { return true } }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
  const num = value => { const parsed = Number(String(value || '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? Math.abs(parsed) : 0 }
  function loadHistory() {
    try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : [] } catch (error) { return [] }
  }
  function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY))) } catch (error) {} }
  function freshFight() { return { id: String(Date.now()), startedAt: Date.now(), endedAt: null, rows: {}, namesById: {}, pendingTurnActor: null, turns: 0, events: 0 } }
  function row(name) {
    name = String(name || 'Nieznany').trim()
    return state.current.rows[name] ||= { name, dealt: 0, received: 0, healed: 0, selfHealed: 0, turns: 0, hits: 0, misses: 0, blocks: 0, crits: 0, bonuses: 0 }
  }
  function rowFor(id) { const key = String(id || ''); return row(state.current.namesById[key] || `Nieznany (${key || '?'})`) }
  function parseMessage(message) {
    if (!state.current || typeof message !== 'string') return
    const parts = message.split(';')
    if (parts.length < 3) return
    const actorId = (parts[0].split('=')[0] || '0').trim()
    const targetId = (parts[1].split('=')[0] || '0').trim()
    const attrs = []
    for (const part of parts.slice(2)) {
      const at = part.indexOf('=')
      if (at > 0) attrs.push([part.slice(0, at).trim(), part.slice(at + 1).trim()])
      else if (part.trim()) attrs.push([part.trim(), ''])
    }
    if (!attrs.length) return
    const actor = actorId !== '0' ? rowFor(actorId) : null
    const target = targetId !== '0' ? rowFor(targetId) : null
    const damage = attrs.filter(([key]) => /^-dmg[a-z0-9_]*$/i.test(key)).reduce((sum, [, value]) => sum + num(value), 0)
    if (damage > 0) {
      if (actor) { actor.dealt += damage; actor.hits++ }
      if (target) target.received += damage
    }
    if (attrs.some(([key]) => key === '+crit' || key === '+of_crit') && actor) actor.crits++
    if (attrs.some(([key]) => /blok|block/i.test(key)) && target) target.blocks++
    if (damage === 0 && attrs.some(([key]) => /miss|evad|avoid|unik/i.test(key)) && actor) actor.misses++
    const skillTurn = attrs.some(([key]) => key === 'tspell')
    if (skillTurn && actor) { actor.turns++; state.current.turns++; state.current.pendingTurnActor = actorId }
    else if (damage > 0 && actor && state.current.pendingTurnActor !== actorId) { actor.turns++; state.current.turns++; state.current.pendingTurnActor = null }
    else if (damage > 0 && state.current.pendingTurnActor !== actorId) state.current.pendingTurnActor = null
    const healKeys = new Set(['heal', 'heal_target', 'npc_heal', 'bandage', 'legbon_holytouch_heal'])
    for (const [key, value] of attrs) {
      if (!healKeys.has(key)) continue
      const amount = num(value)
      if (!amount || !actor) continue
      if (key === 'heal_target' && (actor !== target || targetId === '0')) actor.healed += amount
      else actor.selfHealed += amount
    }
    if (actor && attrs.some(([key]) => /legbon_|pierce|thirdatt|facade/i.test(key))) actor.bonuses++
    state.current.events++
  }
  function closeFight() {
    if (!state.current) return
    if (state.current.events > 0) {
      state.current.endedAt = Date.now()
      state.history.unshift({ ...state.current, rows: Object.values(state.current.rows) })
      state.history = state.history.slice(0, MAX_HISTORY)
      persist()
    }
    state.current = null
    state.seen.clear()
    refresh()
  }
  function parsePayload(payload) {
    if (!enabled() || !payload || typeof payload !== 'object') return
    if (String(payload.init) === '1') {
      if (state.current?.events) closeFight()
      state.current = freshFight()
      state.seen.clear()
    }
    if (!state.current) return
    if (payload.w && typeof payload.w === 'object') {
      for (const [id, fighter] of Object.entries(payload.w)) {
        if (!fighter || typeof fighter !== 'object') continue
        const name = fighter.name || state.current.namesById[String(fighter.id ?? id)]
        if (name) { state.current.namesById[String(fighter.id ?? id)] = name; row(name) }
      }
    }
    if (Array.isArray(payload.m) && Array.isArray(payload.mi)) {
      for (const rawIndex of payload.mi) {
        const index = Number(rawIndex), message = payload.m[index]
        if (typeof message !== 'string') continue
        const signature = `${index}:${message}`
        if (state.seen.has(signature)) continue
        state.seen.add(signature)
        parseMessage(message)
      }
    }
    const ended = String(payload.endBattle || '') === '1' || (Array.isArray(payload.m) && payload.m.some(line => /;winner=/.test(line)))
    if (ended) closeFight()
    else refresh()
  }
  function table(rows) {
    if (!rows?.length) return '<div class="mws-empty">Brak zarejestrowanych zdarzeń tej walki.</div>'
    const sorted = [...rows].sort((a, b) => b.dealt - a.dealt)
    return '<div class="mws-scroll"><table><thead><tr><th>Postać / mob</th><th>Obrażenia</th><th>Otrzymane</th><th>Leczenie</th><th>Regeneracja</th><th>Tury</th><th>Trafienia</th><th>Skuteczność</th><th>Uniki</th><th>Bloki</th><th>Krytyki</th><th>Bonusy</th></tr></thead><tbody>' + sorted.map((fighter, index) => {
      const badge = fighter.dealt > 0 && index < 3 ? `<span class="mws-rank mws-rank-${index + 1}">${index === 0 ? 'MVP' : index === 1 ? '2nd' : '3rd'}</span>` : ''
      const accuracy = fighter.hits + fighter.misses ? `${(100 * fighter.hits / (fighter.hits + fighter.misses)).toFixed(1)}%` : '—'
      return `<tr><td>${esc(fighter.name)}${badge}</td><td>${Number(fighter.dealt || 0).toLocaleString('pl-PL')}</td><td>${Number(fighter.received || 0).toLocaleString('pl-PL')}</td><td>${Number(fighter.healed || 0).toLocaleString('pl-PL')}</td><td>${Number(fighter.selfHealed || 0).toLocaleString('pl-PL')}</td><td>${Number(fighter.turns || 0)}</td><td>${Number(fighter.hits || 0)}</td><td>${accuracy}</td><td>${Number(fighter.misses || 0)}</td><td>${Number(fighter.blocks || 0)}</td><td>${Number(fighter.crits || 0)}</td><td>${Number(fighter.bonuses || 0)}</td></tr>`
    }).join('') + '</tbody></table></div>'
  }
  function buildView(host) {
    host.innerHTML = `<style>
      #mk-hub .mws-wrap{color:#e7e3ff;font:12px/1.45 Inter,"Segoe UI",Arial,sans-serif}
      #mk-hub .mws-toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
      #mk-hub .mws-toolbar button{border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 45%,#cbd5e1);border-radius:7px;background:color-mix(in srgb,var(--mkhd-addon-theme) 45%,#111827);color:#fff;padding:6px 9px;cursor:pointer}
      #mk-hub .mws-status{margin-left:auto;color:#b4adda;font-size:11px}
      #mk-hub .mws-scroll{overflow:auto;max-width:100%;margin:7px 0 14px}
      #mk-hub .mws-table-title{margin:12px 0 5px;color:#f3f3ff;font-weight:700}
      #mk-hub .mws-wrap table{border-collapse:collapse;white-space:nowrap;min-width:100%;font-size:11px}
      #mk-hub .mws-wrap th,#mk-hub .mws-wrap td{padding:6px 7px;border-bottom:1px solid rgba(255,255,255,.09);text-align:right}
      #mk-hub .mws-wrap th{color:#b4adda;font-weight:600}#mk-hub .mws-wrap th:first-child,#mk-hub .mws-wrap td:first-child{text-align:left}
      #mk-hub .mws-rank{display:inline-block;margin-left:6px;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:800;vertical-align:1px}
      #mk-hub .mws-rank-1{color:#2a1c00;background:linear-gradient(135deg,#ffe58a,#e5a91a)}#mk-hub .mws-rank-2{color:#15202b;background:linear-gradient(135deg,#f1f4f7,#9ba8b5)}#mk-hub .mws-rank-3{color:#2d1608;background:linear-gradient(135deg,#e6a16d,#a95f2f)}
      #mk-hub .mws-empty,#mk-hub .mws-note{color:#b4adda;padding:8px 2px}
      #mk-hub .mws-fight{margin:8px 0 14px;padding:9px;border:1px solid rgba(144,123,255,.2);border-radius:9px;background:rgba(255,255,255,.025)}
      #mk-hub .mws-date{margin-bottom:5px;color:#b4adda;font-size:10px}
    </style><div class="mws-wrap"></div>`
    const wrap = host.querySelector('.mws-wrap')
    const toolbar = document.createElement('div'); toolbar.className = 'mws-toolbar'
    const enabledBox = document.createElement('span'); enabledBox.textContent = enabled() ? 'Licznik włączony' : 'Licznik wyłączony'
    const importButton = document.createElement('button'); importButton.type = 'button'; importButton.textContent = 'Wczytaj próbkę'
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.hidden = true
    const clearButton = document.createElement('button'); clearButton.type = 'button'; clearButton.textContent = 'Wyczyść historię'
    const status = document.createElement('span'); status.className = 'mws-status'; status.textContent = `${state.status} · aktualizacje: ${state.calls}`
    toolbar.append(enabledBox, importButton, file, clearButton, status); wrap.appendChild(toolbar)
    importButton.addEventListener('click', () => file.click())
    file.addEventListener('change', async () => {
      const chosen = file.files?.[0]; if (!chosen) return
      try { const data = JSON.parse(await chosen.text()); for (const sample of (Array.isArray(data.samples) ? data.samples : [])) parsePayload(sample.payload) }
      catch (error) { status.textContent = 'Nie udało się odczytać pliku' }
      file.value = ''; refresh()
    })
    clearButton.addEventListener('click', () => { state.history = []; persist(); refresh() })
    if (!enabled()) { const note = document.createElement('div'); note.className = 'mws-note'; note.textContent = 'Włącz Statystyki Walk przełącznikiem na liście dodatków, aby liczyć nowe walki.'; wrap.appendChild(note) }
    if (state.current?.events) {
      const title = document.createElement('div'); title.className = 'mws-table-title'; title.textContent = 'Bieżąca walka'; wrap.appendChild(title)
      const live = document.createElement('div'); live.innerHTML = table(Object.values(state.current.rows)); wrap.appendChild(live)
    }
    if (state.history.length) {
      const title = document.createElement('div'); title.className = 'mws-table-title'; title.textContent = `Historia walk (${state.history.length}/${MAX_HISTORY})`; wrap.appendChild(title)
      for (const [index, fight] of state.history.entries()) {
        const section = document.createElement('section'); section.className = 'mws-fight'
        const date = document.createElement('div'); date.className = 'mws-date'; date.textContent = `${index + 1}. ${new Date(fight.endedAt || fight.startedAt).toLocaleString('pl-PL')} · ${fight.rows.length} uczestników`
        const data = document.createElement('div'); data.innerHTML = table(fight.rows)
        section.append(date, data); wrap.appendChild(section)
      }
    } else if (!state.current?.events) {
      const empty = document.createElement('div'); empty.className = 'mws-empty'; empty.textContent = 'Brak zapisanych walk. Statystyki pojawią się tutaj po pierwszym starciu.'; wrap.appendChild(empty)
    }
  }
  window.__mkBuildFightStatsView = buildView
  function refresh() { try { window.__mkHubRefreshFightStats?.() } catch (error) {} }
  window.addEventListener('mws-fightstats-toggle', refresh)
  function attach() {
    const engines = []
    try { if (window.Engine) engines.push(window.Engine) } catch (error) {}
    try { if (typeof window.getEngine === 'function') engines.push(window.getEngine()) } catch (error) {}
    const engine = engines.find(value => value?.battle && typeof value.battle.updateData === 'function')
    if (!engine) return false
    const battle = engine.battle, original = battle.updateData
    if (original.__mkAddonFightStats) { state.status = 'Silnik podłączony'; refresh(); return true }
    const wrapped = function (...args) {
      const result = original.apply(this, args)
      state.calls++
      state.status = 'Silnik podłączony'
      try { parsePayload(args[0]) } catch (error) { state.status = 'Błąd odczytu danych walki' }
      return result
    }
    wrapped.__mkAddonFightStats = true
    battle.updateData = wrapped
    state.status = 'Silnik podłączony'
    refresh()
    return true
  }
  let attempts = 0
  const attachTimer = setInterval(() => {
    attempts++
    if (attach() || attempts >= 240) { clearInterval(attachTimer); if (attempts >= 240 && state.calls === 0) { state.status = 'Nie znaleziono silnika walki'; refresh() } }
  }, 250)
})()


;(function (addinnnnnnnnnnnnnnntionalNpcNamesToSearch)
{
    const isColossusPromptEnabled = () => { try { return localStorage.getItem('mkColossusGroupPromptEnabled') !== '0' && localStorage.getItem('chciamkColossusGroupPromptEnabled') !== '0' } catch (error) { return true } }
    const EVENT_ROLE_ID = '1318862751334010960'
    const EVENT_HERO_NAMES = new Set(['nosferatu', 'lorelei', 'drude', 'doppelganger'])
    let settings = {
        webhookUrl: '', // legacy setting, removed during the user-owned webhook migration
        webhookUrls: { heroes: '', colossi: '', titans: '', event: '' },
        name: '',
        eventAlertsEnabled: true,
        roleMappings: { heros: '', titan: '', npc: '', 'Drakolisz': '', 'Reuzen': '', 'Pająk': '', 'Kruk': '', 'Hydra': '', 'Ważka': '', 'Umibozu': '', 'Snnnnnopel': '', 'Regulus': '', 'Orlica': '', 'Kic synu Kic': '', 'Renegat': '', 'Arcymag': '', 'Zoons': '', 'Magua': '', 'Tezatlipoca': '', 'Barbatos': '', 'Tanroth': '' }
    }

    // Create the launcher immediately so game initialization cannot hide it.
    const discordIcon = document.createElement('img')
    let launcherEnabled = false
    let startupAttempts = 0
    discordIcon.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#5865F2"/><path fill="#fff" d="M45 20a38 38 0 0 0-9-3l-1 3a33 33 0 0 0-9 0l-1-3a38 38 0 0 0-9 3C9 28 7 37 8 46a38 38 0 0 0 12 6l2-4-4-2 1-1a26 26 0 0 0 26 0l1 1-4 2 2 4a38 38 0 0 0 12-6c1-10-2-18-10-26ZM24 40a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm16 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/></svg>')
    discordIcon.alt = 'Heroes on Discord'
    discordIcon.className = 'heroes-discord__discord-icon'
    discordIcon.title = 'Menu dodatków'
    discordIcon.style.cssText = 'position:fixed!important;left:230px!important;bottom:6px!important;top:auto!important;right:auto!important;width:38px!important;height:38px!important;display:block!important;z-index:2147483000!important;box-sizing:border-box!important;padding:4px!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:8px!important;background:#202a3a!important;object-fit:contain!important;cursor:pointer!important'
    ;['width','height'].forEach(prop => discordIcon.style.setProperty(prop, '46px', 'important'))
    discordIcon.style.setProperty('padding', '5px', 'important')
    discordIcon.style.setProperty('border', '2px solid rgba(255,255,255,.22)', 'important')
    discordIcon.style.setProperty('border-radius', '10px', 'important')
    discordIcon.style.setProperty('background', 'linear-gradient(180deg,#26324a,#182033)', 'important')
    discordIcon.style.setProperty('box-shadow', 'inset 0 0 0 1px rgba(0,0,0,.55), 0 2px 5px rgba(0,0,0,.55)', 'important')
    discordIcon.addEventListener('click', function (event) {
        event.preventDefault()
        event.stopImmediatePropagation()
        try {
            if (typeof window.__mkHubShow === 'function') window.__mkHubShow()
            else window.dispatchEvent(new Event('mk-hub-toggle'))
        } catch (error) {
            console.error('[Heroes on Discord] Nie udało się otworzyć menu dodatków:', error)
            const hub = document.getElementById('mk-hub')
            if (hub) { hub.classList.add('open'); hub.style.setProperty('display', 'flex', 'important') }
        }
    }, true)
    if (document.body) document.body.appendChild(discordIcon)
    else document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(discordIcon) }, { once: true })
    const additionalRoleNames = [
        'Przewodnik', 'Złodziej', 'Opętany Paladyn', 'Kostek', 'Kochanka Nocy',
        'Perski Książę', 'Baca', 'Lichwiarz Grauhaz', 'Czarująca Atalia',
        'Święty Braciszek', 'Viviana Nandin', 'Demonis', 'Vapor', 'Dęborożec',
        'Tepeyollotl', 'Negthotep', 'Młody Smok'
    ]
    for (let i = 0; i < additionalRoleNames.length; i++)
    {
        settings.roleMappings[additionalRoleNames[i]] = ''
    }

    const suppliedRoleMappings = {
        'Przewodnik': '1308168512602374155',
        'Złodziej': '1308168512774078485',
        'Przeraza': '1434982837504704612',
        'Przeraża': '1434982837504704612',
        'Widmo': '1463813436596158628',
        'Roger': '1392565739021664447',
        'Opętany Paladyn': '1308168519602667590',
        'Kostek': '1308170133923041321',
        'Kochanka Nocy': '1308168520525418639',
        'Perski Książę': '1308168520852574282',
        'Baca': '1308168521875980318',
        'Lichwiarz Grauhaz': '1308331071473061919',
        'Lichwiarz Grauhauz': '1308331071473061919',
        'Obłąkany Łowca Orków': '1308168522110865501',
        'Czarująca Atalia': '1308168523566153738',
        'Czrująca Atalia': '1308168523566153738',
        'Święty Braciszek': '1308168524103028828',
        'Viviana Nandin': '1308330306964553740',
        'Mulher Ma': '1308168525340213249',
        'Demonis': '1308168526397313126',
        'Vapor': '1308168526942703746',
        'Dęborożec': '1308170257583575102',
        'Dęborożes': '1308170257583575102',
        'Tepeyollotl': '1308170351947022366',
        'Tepeyolotl': '1308170351947022366',
        'Negthotep': '1308170510261289080',
        'Neghotep': '1308170510261289080',
        'Młody Smok': '1308170564917133323',
        'Orlica': '1308333629004447775',
        'Kic synu Kic': '1308333690920632350',
        'Kic Syny Kic': '1308333690920632350',
        'Kic': '1308333690920632350',
        'Renegat': '1308333750811099166',
        'Arcymag': '1308333845602373664',
        'Zoons': '1308333895988809741',
        'Łowczyni Wspomnień': '1308333986929709177',
        'Łowczyni wspomnienień': '1308333986929709177',
        'Przyzywacz Demonów': '1308334105154424853',
        'Przyzywacz demonow': '1308334105154424853',
        'Magua': '1308334188751093761',
        'Tezatlipoca': '1308334249962770432',
        'Barbatos': '1308334348138844171',
        'Tanroth': '1308334403981676585',
        'Drakolisz': '1353429309477486622',
        'Reuzen': '1456741019830714428',
        'Pająk': '1456741016995627092',
        'Kruk': '1456741012645875783',
        'Hydra': '1456741007054864617',
        'Ważka': '1451282042141671495',
        'Umibozu': '1456740156802469908',
        'Sopel': '1507797466487980052',
        'Regulus': '1507798168438571119'
    }
    // Game NPC names can differ from the shortened labels used for Discord roles.
    const monsterNameAliases = {
        // English Margonem.com hero names -> the user's Discord role labels.
        'Spiteful Guide': 'Przewodnik',
        'Thief': 'Złodziej',
        'Fiendish Koschei': 'Kostek',
        'Hellish Skeletor': 'Kostek',
        'Damned Koschei': 'Kostek',
        'Possessed Paladin': 'Opętany Paladyn',
        "Night's Mistress": 'Kochanka Nocy',
        'Persian Prince': 'Perski Książę',
        'Prince Kasim': 'Perski Książę',
        'Sheepless Shepherd': 'Baca',
        'Grauhaz the Usurer': 'Lichwiarz Grauhaz',
        'Usurer Grauhaz': 'Lichwiarz Grauhaz',
        'Insane Orc Hunter': 'Obłąkany Łowca Orków',
        'Atalia the Spellcaster': 'Czarująca Atalia',
        'Spellcaster Atalia': 'Czarująca Atalia',
        'Pious Friar': 'Święty Braciszek',
        'Demonis Lord of the Void': 'Demonis',
        'Vapor Veneno': 'Vapor',
        'Oakhornus': 'Dęborożec',
        'Tepeyollotl': 'Tepeyollotl',
        'Negothep the Abyss Priest': 'Neghotep',
        'Neghothep the Abyss Priest': 'Neghotep',
        'Neghotep the Abyss Priest': 'Neghotep',
        'Negthotep the Abyss Priest': 'Neghotep',
        'Young Dragon': 'Młody Smok',
        'Golden Roger': 'Roger',
        'Preraza': 'Przeraza',
        'Frightener': 'Przeraza',
        'Triad Specter': 'Widmo',
        'Triad Phantom': 'Widmo',
        // English Margonem.com titan names -> the user's Discord role labels.
        'Virgin Eagless': 'Orlica',
        'Killer Rabbit': 'Kic',
        'Baulus the Renegade': 'Renegat',
        'Renegade Baulus': 'Renegat',
        'Infernal Archmage': 'Arcymag',
        'Versus Zoons': 'Zoons',
        'Huntress of Memories': 'Łowczyni Wspomnień',
        'Huntress of Remembrances': 'Łowczyni Wspomnień',
        'Daemons Summoner': 'Przyzywacz Demonów',
        'Maddok Magua': 'Magua',
        'Tezcatlipoca': 'Tezatlipoca',
        'Dragon Guardian Barbatos': 'Barbatos',
        'Tanroth': 'Tanroth',
        // English Margonem.com colossus names -> the user's Discord role labels.
        'Regulus the Cloudyeye': 'Regulus',
        'Regulus the Murky-Eyed': 'Regulus',
        'Umibozu': 'Umibozu',
        'Amaimon the Iciclehand': 'Sopel',
        'Chimeric Hydrocore': 'Hydra',
        'Vashkar': 'Ważka',
        'Lulukav': 'Kruk',
        'Insidious Spider': 'Pająk',
        'Insidious Arachnin': 'Pająk',
        'Insidious Arachin': 'Pająk',
        'Reusen': 'Reuzen',
        'Reuzen': 'Reuzen',
        'Vernoran Reptidragon': 'Drakolisz',
        // Names also seen in other Margonem data revisions / prior game alerts.
        'Zły Przewodnik': 'Przewodnik',
        'Piekielny Kościej': 'Kostek',
        'Złoty Roger': 'Roger',
        'Baca bez Łowiec': 'Baca',
        'Demonis Pan Nicości': 'Demonis',
        'Vapor Veneno': 'Vapor',
        'Widmo Triady': 'Widmo',
        'Negthotep Czarny Kapłan': 'Neghotep',
        'Wernoradzki Drakolisz': 'Drakolisz',
        'Vernoran Dracolich': 'Drakolisz',
        'Regulus Mętnooki': 'Regulus',
        'Amaimon Soploręki': 'Sopel',
        'Vashkar': 'Ważka',
        'Hydrokora Chimeryczna': 'Hydra',
        'Lulukav': 'Kruk',
        'Arachin Podstępny': 'Pająk'
    }
    for (const name in suppliedRoleMappings)
    {
        if (Object.prototype.hasOwnProperty.call(suppliedRoleMappings, name)) settings.roleMappings[name] = suppliedRoleMappings[name]
    }
    const defaultRoleMappings = {}
    for (const name in settings.roleMappings)
    {
        if (Object.prototype.hasOwnProperty.call(settings.roleMappings, name)) defaultRoleMappings[name] = settings.roleMappings[name]
    }

    function loadSettings()
    {
        const savedSettings = localStorage.getItem('heroes-discord')
        if (savedSettings)
        {
            try
            {
                const saved = JSON.parse(savedSettings)
                const savedWebhooks = saved.webhookUrls && typeof saved.webhookUrls === 'object' ? saved.webhookUrls : null
                if (savedWebhooks)
                {
                    for (const category of ['heroes', 'colossi', 'titans', 'event'])
                        if (String(savedWebhooks[category] || '').trim()) settings.webhookUrls[category] = String(savedWebhooks[category]).trim()
                }
                else if (saved.webhookUrl)
                {
                    for (const category of ['heroes', 'colossi', 'titans']) settings.webhookUrls[category] = saved.webhookUrl
                }
                if (saved.name) settings.name = saved.name
                if (typeof saved.eventAlertsEnabled === 'boolean') settings.eventAlertsEnabled = saved.eventAlertsEnabled
                const storedMappings = saved.roleMappings && typeof saved.roleMappings === 'object' ? saved.roleMappings : {}
                for (const name in storedMappings)
                {
                    if (Object.prototype.hasOwnProperty.call(storedMappings, name)) settings.roleMappings[name] = storedMappings[name]
                }
                for (const name in suppliedRoleMappings)
                {
                    if (Object.prototype.hasOwnProperty.call(suppliedRoleMappings, name) && !settings.roleMappings[name]) settings.roleMappings[name] = suppliedRoleMappings[name]
                }
            }
            catch (error) { console.warn('Heroes on Discord: nie udało się odczytać ustawień.', error) }
        }
        try {
            const userOwnedWebhooksKey = 'heroes-discord-user-owned-webhooks-v2'
            if (localStorage.getItem(userOwnedWebhooksKey) !== '1') {
            settings.webhookUrl = ''
            settings.webhookUrls = { heroes: '', colossi: '', titans: '', event: '' }
            localStorage.setItem('heroes-discord', JSON.stringify(settings))
            localStorage.setItem(userOwnedWebhooksKey, '1')
            }
        } catch (error) {}
    }

    const css = '.heroes-discord__popup{border-image:url(data:image/png;base64,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) 32 20 repeat;border-style:solid;border-width:10px 5px;color:#000;left:calc(50% - 150px);position:fixed;top:20px;width:300px;z-index:1000}.heroes-discord__background{background-color:#efd9a1;height:auto}.heroes-discord__img{display:flex;justify-content:center;padding-top:10px}.heroes-discord__text{margin-bottom:5px;margin-top:10px;text-align:center}.heroes-discord__buttons-container{align-content:center;border-top:2px solid #3d291c;display:flex;height:37px;justify-content:space-evenly;margin:0 -2px;padding-top:3px}.heroes-discord__button{background-color:#000;background-image:linear-gradient(to top,#12210d,#396b29);border:solid 1px #0c0d0d;border-radius:6px;box-shadow:inset 0 0 1px 1px #cecece,inset 0 0 0 3px #0c0d0d;box-sizing:border-box;color:#e6d6bf;cursor:pointer;display:inline-block;height:32px;line-height:normal;padding:0;position:relative;width:100px}.heroes-discord__button:hover{background-image:linear-gradient(to top,#101010,#434343)}.heroes-discord__button:active{background-image:linear-gradient(to top,#58310b,#b26417)}.heroes-discord__button-positive{font-size:13px}.heroes-discord__button-negative{background-image:linear-gradient(to top,#310b0b,#831f1f);box-shadow:inset 0 0 1px 1px #cecece,inset 0 0 0 3px #0c0d0d;font-size:10px}.heroes-discord__setup{left:calc(50% - 150px);top:calc(50% - 150px)}.heroes-discord__setup .heroes-discord__background{box-sizing:border-box;height:253px;padding:14px}.heroes-discord__button-close{background:url(https://i.imgur.com/sdKL0ZQ.png);border:1px solid gray;cursor:pointer;height:22px;position:absolute;right:-3px;top:-7px;width:22px}.heroes-discord__button-close:hover{background-position-x:22px}.heroes-discord__discord-icon{cursor:pointer;padding-right:4px;padding-top:5px;position:absolute;right:0;top:-2px;width:27px}.heroes-discord__label{display:block;height:60px;margin-top:16px;text-align:center}.heroes-discord__input{border:1px solid #000;height:18px;margin-top:5px;width:80%}.heroes-discord__setup .heroes-discord__buttons-container{border-top:none;margin-top:25px}.heroes-discord__setup .heroes-discord__button-negative{font-size:13px}.bottom-panel-pointer-bg .heroes-discord__discord-icon{background-color:#2c2f33;cursor:url(../img/gui/cursor/5.png),url(../img/gui/cursor/5.cur),auto;font-size:13px;left:40px;padding:0;pointer-events:auto;top:25px}'
    const style = document.createElement('style')
    style.appendChild(document.createTextNode(css))
    document.head.appendChild(style)
    const setupStyle = document.createElement('style')
    setupStyle.textContent = '.heroes-discord__setup .heroes-discord__background{height:auto;max-height:85vh;overflow:auto}.heroes-discord__setup .heroes-discord__label{height:auto;min-height:48px;margin-top:10px}.heroes-discord__setup .heroes-discord__buttons-container{margin-top:12px}' +
        '.heroes-discord__popup{box-sizing:border-box!important;width:min(390px,calc(100vw - 28px))!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%);border:1px solid rgba(148,163,184,.25)!important;border-width:1px!important;border-style:solid!important;border-image:none!important;border-radius:16px!important;overflow:hidden;color:#e5e7eb!important;background:#111827;box-shadow:0 24px 70px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.035)!important;font:14px/1.45 Inter,Segoe UI,Arial,sans-serif!important;z-index:10000!important}' +
        '.heroes-discord__background{height:auto!important;box-sizing:border-box;background:linear-gradient(160deg,#182235 0%,#111827 62%,#101522 100%)!important;padding:18px!important;color:#e5e7eb!important}' +
        '.heroes-discord__img{padding:0!important;min-height:130px;align-items:center}.heroes-discord__img img{display:block;max-width:150px;max-height:125px;object-fit:contain;filter:drop-shadow(0 8px 15px rgba(0,0,0,.35))}' +
        '.heroes-discord__text{margin:14px 0 16px!important;color:#e5e7eb!important;text-align:center!important;font-size:14px!important;line-height:1.55!important}.heroes-discord__text span:first-child{color:#f8fafc;font-weight:600}.heroes-discord__text span:nth-of-type(2){display:inline-block;margin-top:7px;color:#a5b4fc;font-size:13px}' +
        '.heroes-discord__buttons-container{height:auto!important;min-height:44px;border-top:1px solid rgba(148,163,184,.18)!important;margin:0!important;padding:14px 0 0!important;gap:10px;justify-content:center!important}' +
        '.heroes-discord__button{width:auto!important;min-width:128px;height:38px!important;padding:0 16px!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:9px!important;box-shadow:none!important;color:#fff!important;font:600 13px/1 Inter,Segoe UI,Arial,sans-serif!important;transition:filter .15s,transform .15s}' +
        '.heroes-discord__button:hover{filter:brightness(1.12);transform:translateY(-1px)}.heroes-discord__button:active{transform:translateY(0)}' +
        '.heroes-discord__button-positive{background:linear-gradient(135deg,#2563eb,#4f46e5)!important;font-size:13px!important}.heroes-discord__button-negative{background:#263244!important;font-size:13px!important}' +
        '.heroes-discord__setup{width:min(520px,calc(100vw - 24px))!important;height:min(620px,calc(100vh - 24px))!important;min-height:180px!important;max-height:calc(100vh - 12px)!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)}.heroes-discord__setup .heroes-discord__background{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;padding:16px!important;transform-origin:top left}' +
        '.heroes-discord__popup{resize:both!important;overflow:hidden!important;min-width:210px!important;min-height:0!important;max-width:calc(100vw - 12px)!important;max-height:calc(100vh - 12px)!important}.heroes-discord__popup:not(.heroes-discord__setup){height:360px!important;min-height:140px!important}.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__background{transform-origin:top left}' +
        '.heroes-discord__button-close{width:30px!important;height:30px!important;right:10px!important;top:10px!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:8px!important;background:#263244!important;background-image:none!important;z-index:2}.heroes-discord__button-close:before{content:"×";display:block;color:#dbeafe;font:22px/27px Arial,sans-serif;text-align:center}.heroes-discord__button-close:hover{background:#37465c!important}' +
        '.heroes-discord__setup .heroes-discord__label{display:block;min-height:0!important;margin:0 0 15px!important;color:#cbd5e1!important;text-align:left!important;font-size:12px!important;font-weight:600!important;line-height:1.4!important}' +
        '.heroes-discord__setup .heroes-discord__input{display:block;box-sizing:border-box;width:100%!important;height:38px!important;margin:6px 0 0!important;padding:0 11px!important;border:1px solid #344258!important;border-radius:8px!important;outline:none;background:#0b1220!important;color:#f1f5f9!important;font:13px/1.4 Inter,Segoe UI,Arial,sans-serif!important}' +
        '.heroes-discord__setup .heroes-discord__input:focus{border-color:#818cf8!important;box-shadow:0 0 0 3px rgba(99,102,241,.2)}.heroes-discord__setup .heroes-discord__input::placeholder{color:#64748b}' +
        '.heroes-discord__setup textarea.heroes-discord__input{height:180px!important;padding:10px!important;resize:vertical!important;font:12px/1.45 Consolas,monospace!important}' +
        '.heroes-discord__setup .heroes-discord__buttons-container{margin-top:16px!important;padding-top:16px!important}.heroes-discord__setup .heroes-discord__button{min-width:118px}' +
        '.heroes-discord__discord-icon{position:fixed!important;left:230px!important;right:auto!important;top:auto!important;bottom:6px!important;z-index:2147483000!important;display:block!important;box-sizing:border-box;width:38px!important;height:38px!important;margin:0!important;padding:4px!important;object-fit:contain;border:1px solid rgba(255,255,255,.2)!important;border-radius:8px!important;background:#202a3a!important;filter:drop-shadow(0 3px 8px rgba(0,0,0,.4));transition:transform .15s,filter .15s;cursor:pointer!important}' +
        '.heroes-discord__discord-icon:hover{transform:scale(1.08);filter:brightness(1.12) drop-shadow(0 4px 10px rgba(0,0,0,.5))}' +
        '.heroes-discord__drag-handle{height:24px;margin:-8px -6px 12px;padding:0 7px;border-bottom:1px solid rgba(148,163,184,.16);color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:.03em;line-height:23px;text-align:center;cursor:grab;user-select:none}.heroes-discord__drag-handle:active{cursor:grabbing}' +
        '@media(max-width:520px){.heroes-discord__setup .heroes-discord__background{padding:14px 12px!important}.heroes-discord__popup:not(.heroes-discord__setup){width:min(360px,calc(100vw - 20px))!important}.heroes-discord__img{min-height:105px}.heroes-discord__img img{max-height:105px}.heroes-discord__button{min-width:0!important;padding:0 12px!important}}' +
        '@media(max-height:700px){.heroes-discord__setup .heroes-discord__background{padding:12px!important}.heroes-discord__setup .heroes-discord__label{margin-bottom:8px!important}.heroes-discord__setup textarea.heroes-discord__input{height:76px!important}.heroes-discord__setup .heroes-discord__buttons-container{margin-top:8px!important;padding-top:8px!important}.heroes-discord__img{min-height:80px!important}.heroes-discord__img img{max-height:76px!important}.heroes-discord__text{margin:8px 0!important}}'
    document.head.appendChild(setupStyle)

    const setupRangeTheme = document.createElement('style')
    setupRangeTheme.id = 'heroes-discord-range-theme'
    setupRangeTheme.textContent =
        '.heroes-discord__setup{border:2px solid rgba(144,123,255,.24)!important;border-radius:12px!important;background:linear-gradient(180deg,rgba(34,18,65,.96),rgba(12,8,28,.96))!important;box-shadow:0 10px 24px rgba(0,0,0,.42)!important;color:#f3f3ff!important}' +
        '.heroes-discord__setup .heroes-discord__background{background:transparent!important;color:#f3f3ff!important;padding:16px!important}' +
        '.heroes-discord__setup .heroes-discord__drag-handle{color:#a7a0c9!important;border-bottom-color:rgba(255,255,255,.07)!important}' +
        '.heroes-discord__setup .heroes-discord__label{color:#d7d2e8!important;font-family:Arial,sans-serif!important}' +
        '.heroes-discord__setup .heroes-discord__input{background:rgba(10,7,24,.72)!important;border-color:rgba(144,123,255,.26)!important;border-radius:8px!important;color:#f3f3ff!important}' +
        '.heroes-discord__setup .heroes-discord__input:focus{border-color:#907bff!important;box-shadow:0 0 0 2px rgba(144,123,255,.2)!important}' +
        '.heroes-discord__setup .heroes-discord__input::placeholder{color:#938ba9!important}' +
        '.heroes-discord__setup .heroes-discord__buttons-container{border-top-color:rgba(255,255,255,.08)!important}' +
        '.heroes-discord__setup .heroes-discord__button{border-color:rgba(255,255,255,.12)!important;border-radius:9px!important;box-shadow:0 4px 12px rgba(0,0,0,.2)!important}' +
        '.heroes-discord__setup .heroes-discord__button-positive{background:linear-gradient(135deg,#4f46e5,#6366f1)!important}' +
        '.heroes-discord__setup .heroes-discord__button-negative{background:rgba(255,255,255,.06)!important;color:#e7edf8!important}' +
        '.heroes-discord__setup .heroes-discord__button-close{background:rgba(255,255,255,.1)!important;border-color:rgba(255,255,255,.14)!important}'
    setupRangeTheme.textContent +=
        '.heroes-discord__setup--inline{position:relative!important;inset:auto!important;transform:none!important;width:100%!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;resize:none!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;z-index:auto!important}' +
        '.heroes-discord__setup--inline .heroes-discord__background{max-height:min(440px,calc(100vh - 160px))!important;overflow:auto!important;overscroll-behavior:contain!important;padding:12px!important;background:transparent!important}' +
        '.heroes-discord__setup--inline .heroes-discord__button-close{position:sticky!important;float:right!important;top:0!important;right:0!important;margin:0 0 -30px auto!important}' +
        '.heroes-discord__setup--inline .heroes-discord__drag-handle{padding-right:36px!important}' +
        '.mk-addon-tabs{display:flex;gap:4px;flex:0 0 auto}' +
        '#mk-clan-ranges-panel .mk-header{gap:4px;padding-left:7px;padding-right:7px}' +
        '#mk-clan-ranges-panel .mk-addon-tabs{gap:5px;flex:0 0 auto}' +
        '#mk-clan-ranges-panel .mk-addon-tab{width:auto!important;min-width:56px;height:25px;padding:0 9px;font-size:11px;font-weight:700;white-space:nowrap;flex:0 0 auto}' +
        '#mk-clan-ranges-panel .mk-addon-tab.active{background:rgba(99,102,241,.42);border-color:rgba(165,180,252,.62)}' +
        '#mk-clan-ranges-panel .mk-addon-slot{display:none;min-width:0;max-height:none;overflow:hidden}' +
        '#mk-clan-ranges-panel.mk-discord-view{width:min(410px,calc(100vw - 16px))!important}' +
        '#mk-clan-ranges-panel.mk-discord-view .mk-body,#mk-clan-ranges-panel.mk-discord-view .mk-config{display:none!important}' +
        '#mk-clan-ranges-panel.mk-discord-view .mk-addon-slot{display:block}' +
        '#mk-clan-ranges-panel.mk-discord-view .mk-switch{display:none!important}' +
        '#mk-clan-ranges-panel.mk-discord-view .mk-header{cursor:move}' +
        '.heroes-discord__popup:not(.heroes-discord__setup){border:1px solid rgba(148,163,184,.32)!important;border-radius:12px!important;background:linear-gradient(160deg,rgba(19,28,45,.98),rgba(12,18,31,.98))!important;box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 0 1px rgba(99,102,241,.08)!important;color:#e7edf8!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__background{background:transparent!important;color:#f3f3ff!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__drag-handle{color:#94a3b8!important;border-bottom-color:rgba(148,163,184,.14)!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__text{color:#e7edf8!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__buttons-container{border-top-color:rgba(148,163,184,.14)!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__button-positive{background:linear-gradient(135deg,#4f46e5,#6366f1)!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__button-negative{background:rgba(255,255,255,.06)!important;color:#e7edf8!important}' +
        '#heroes-colossus-call{border:1px solid rgba(148,163,184,.32)!important;border-radius:12px!important;background:linear-gradient(160deg,rgba(19,28,45,.98),rgba(12,18,31,.98))!important;box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 0 1px rgba(99,102,241,.08)!important;color:#e7edf8!important}' +
        '#heroes-colossus-call select{border-color:rgba(148,163,184,.25)!important;background:rgba(7,12,23,.72)!important;color:#e7edf8!important}' +
        '#heroes-colossus-call label{color:#cbd5e1!important}' +
        '#heroes-colossus-call button{border:1px solid rgba(255,255,255,.12)!important;border-radius:8px!important;color:#f3f3ff!important}' +
        '#heroes-colossus-call button:hover{filter:brightness(1.12)}' +
        '#heroes-colossus-call button:last-child{background:linear-gradient(135deg,#4f46e5,#6366f1)!important}' +
        '#heroes-colossus-call{width:min(250px,calc(100vw - 12px))!important;height:min(253px,calc(100vh - 12px))!important;min-width:min(250px,calc(100vw - 12px))!important;min-height:min(253px,calc(100vh - 12px))!important;max-width:min(250px,calc(100vw - 12px))!important;max-height:min(253px,calc(100vh - 12px))!important;resize:none!important;backdrop-filter:blur(10px)!important;padding:16px!important}' +
        '#heroes-colossus-call>div:last-child{display:flex!important;width:100%!important;justify-content:space-between!important;align-items:stretch!important;gap:8px!important;margin-top:auto!important}' +
        '#heroes-colossus-call>div:last-child button:first-child{flex:0 0 70px!important;width:70px!important;min-width:0!important;padding:7px 4px!important;font-size:12px!important;white-space:nowrap!important}' +
        '#heroes-colossus-call>div:last-child button:last-child{flex:1 1 auto!important;min-width:0!important;padding:7px 5px!important;font-size:12px!important;line-height:1.2!important;white-space:normal!important}' +
        '#heroes-colossus-call .heroes-call-opacity{position:absolute;top:0;right:0;width:22px;height:21px;padding:0;border:1px solid rgba(129,140,248,.28)!important;border-radius:6px!important;background:rgba(99,102,241,.14)!important;color:#e8edff!important;font:700 11px/19px Inter,Segoe UI,Arial,sans-serif;cursor:pointer}' +
        '#heroes-colossus-call .heroes-call-opacity:hover{background:rgba(99,102,241,.3)!important;border-color:rgba(165,180,252,.58)!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup){width:min(300px,calc(100vw - 20px))!important;min-width:min(300px,calc(100vw - 20px))!important;height:min(270px,calc(100vh - 16px))!important;min-height:min(270px,calc(100vh - 16px))!important;max-height:min(270px,calc(100vh - 16px))!important;resize:none!important;overflow:hidden!important;backdrop-filter:blur(10px)!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__background{display:flex!important;flex-direction:column!important;justify-content:center!important;box-sizing:border-box!important;height:100%!important;max-height:100%!important;overflow:hidden!important;padding:12px!important;background:transparent!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__drag-handle{position:relative!important;flex:0 0 24px!important;height:24px!important;margin:-2px 0 8px!important;padding:0 28px 0 4px!important;line-height:23px!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__img{flex:0 1 80px!important;min-height:80px!important;height:80px!important;padding:0!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__img img{max-height:80px!important;max-width:130px!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__text{flex:0 0 auto!important;margin:7px 0 10px!important;font-size:13px!important;line-height:1.4!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__buttons-container{flex:0 0 52px!important;min-height:52px!important;padding:10px 0 0!important;gap:8px!important}' +
        '.heroes-discord__popup:not(.heroes-discord__setup) .heroes-discord__button{min-width:0!important;flex:1 1 0!important;height:38px!important;padding:0 9px!important}' +
        '.heroes-discord__popup-opacity{position:absolute;right:2px;top:1px;width:22px;height:21px;padding:0;border:1px solid rgba(129,140,248,.28);border-radius:6px;background:rgba(99,102,241,.14);color:#e8edff;font:700 11px/19px Inter,Segoe UI,Arial,sans-serif;cursor:pointer}' +
        '.heroes-discord__popup-opacity:hover{background:rgba(99,102,241,.3);border-color:rgba(165,180,252,.58)}'
    document.head.appendChild(setupRangeTheme)
    window.__heroesDiscordSelectSettings = function () { window.dispatchEvent(new CustomEvent('heroes-discord:select-settings')) }

    const consecutiveDiscordDedupeKey = 'heroes-discord-consecutive-message-v2'
    const consecutiveDiscordDedupeWindowMs = 30 * 60 * 1000
    const consecutiveDiscordMemory = {}
    window.__heroesDiscordAllowConsecutiveMessage = function (webhookUrl, signature) {
        if (!webhookUrl || !signature) return true
        const hash = value => {
            let result = 2166136261
            for (let i = 0; i < value.length; i++) {
                result ^= value.charCodeAt(i)
                result = Math.imul(result, 16777619)
            }
            return (result >>> 0).toString(36)
        }
        const channelKey = hash(String(webhookUrl).trim())
        const signatureHash = hash(String(signature))
        const now = Date.now()
        const isRecentDuplicate = last => !!last && last.signature === signatureHash &&
            Number.isFinite(last.timestamp) && now >= last.timestamp && now - last.timestamp < consecutiveDiscordDedupeWindowMs
        const record = { signature: signatureHash, timestamp: now }
        try {
            const saved = JSON.parse(localStorage.getItem(consecutiveDiscordDedupeKey) || '{}')
            const last = saved[channelKey] || consecutiveDiscordMemory[channelKey]
            if (isRecentDuplicate(last)) return false
            saved[channelKey] = record
            const keys = Object.keys(saved)
            if (keys.length > 40) keys.slice(0, keys.length - 40).forEach(key => delete saved[key])
            localStorage.setItem(consecutiveDiscordDedupeKey, JSON.stringify(saved))
            consecutiveDiscordMemory[channelKey] = record
            return true
        } catch (error) {
            if (isRecentDuplicate(consecutiveDiscordMemory[channelKey])) return false
            consecutiveDiscordMemory[channelKey] = record
            return true
        }
    }

    window.__heroesDiscordForgetConsecutive = function (webhookUrl) {
        try {
            const hash = value => {
                let result = 2166136261
                for (let i = 0; i < value.length; i++) { result ^= value.charCodeAt(i); result = Math.imul(result, 16777619) }
                return (result >>> 0).toString(36)
            }
            const channelKey = hash(String(webhookUrl).trim())
            delete consecutiveDiscordMemory[channelKey]
            const saved = JSON.parse(localStorage.getItem(consecutiveDiscordDedupeKey) || '{}')
            delete saved[channelKey]
            localStorage.setItem(consecutiveDiscordDedupeKey, JSON.stringify(saved))
        } catch (error) {}
    }
    function heroesNotify(text) { try { if (typeof window.message === 'function') window.message(text) } catch (error) {} }
    function heroesWatchRequest(request, webhookUrl, okText) {
        request.onload = function () {
            if (request.status >= 200 && request.status < 300) { heroesNotify(okText); return }
            console.warn('Heroes on Discord: Discord odrzucił wiadomość, status ' + request.status, request.responseText)
            window.__heroesDiscordForgetConsecutive(webhookUrl)
            heroesNotify('Discord odrzucił wiadomość (status ' + request.status + '). Sprawdź webhook.')
        }
        request.onerror = function () {
            console.warn('Heroes on Discord: błąd sieci przy wysyłaniu na webhook.')
            window.__heroesDiscordForgetConsecutive(webhookUrl)
            heroesNotify('Nie udało się wysłać na Discorda (błąd sieci).')
        }
    }

    async function sendDiscordAlert(webhookUrl, playerNick, npc, mapName, serverName, roleIdOverride)
    {
        let color = 8388608 //red
        let type1 = 'Tytan'
        let type2 = 'tytana'
        if (isKnownColossus(npc))
        {
            type1 = 'Kolos'
            type2 = 'kolosa'
            color = 12320855
        }
        else if (isHeros(npc))
        {
            type1 = 'Heros'
            type2 = 'herosa'
            color = 8388736 //purple
        }
        else if (isAdditionalNpcToSearch(npc))
        {
            type1 = ''
            type2 = 'npca'
            color = 12320855 //dark pink
        }

        const roleId = String(roleIdOverride === undefined ? getRoleId(npc) : roleIdOverride).replace(/\D/g, '')
        const dedupeSignature = JSON.stringify({
            category: type1 || 'NPC', nick: npc.nick, map: mapName, world: serverName,
            x: npc.x, y: npc.y, finder: playerNick, roleId: roleId || ''
        })
        if (!window.__heroesDiscordAllowConsecutiveMessage(webhookUrl, dedupeSignature)) return

        let addToThumbnail = ''
        if (getCookie('interface') === 'ni')
        {
            addToThumbnail = 'https://micc.garmory-cdn.cloud/obrazki/npc/'
        }

        let fileObj = null
        try
        {
            const response = await fetch(addToThumbnail + npc.icon)
            if (!response.ok) throw new Error('HTTP ' + response.status)
            fileObj = new File([await response.blob()], 'npc.gif')
        }
        catch (error) { console.warn('Heroes on Discord: nie udało się pobrać miniatury, wysyłam bez niej.', error) }

        const data = new FormData()
        if (fileObj) data.append(`files[0]`, fileObj)
        const categoryName = type1 || 'NPC'
        const categoryEmoji = isKnownColossus(npc) ? '🟣' : (isHeros(npc) ? '🟠' : (isAdditionalNpcToSearch(npc) ? '🔔' : '🔴'))
        data.append('payload_json', JSON.stringify({
            content: `${roleId ? `<@&${roleId}> ` : ''}**${categoryEmoji} ${categoryName} wykryty!**`,
            allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] },
            username: 'Sąsiad',
            avatar_url: 'https://samequizy.pl/wp-content/uploads/2019/02/filing_images_952825540c11-18.jpg',
            embeds: [{
                color: color,
                author: { name: `MARGONEM • ${categoryName.toLocaleUpperCase('pl-PL')}` },
                title: npc.nick,
                description: `📍 **${mapName}**`,
                fields: [
                    { name: '🌐 Świat', value: String(serverName), inline: true },
                    { name: '🧭 Pozycja', value: `\`${npc.x}, ${npc.y}\``, inline: true },
                    { name: '👤 Znalazł(a)', value: String(playerNick), inline: true }
                ],
                ...(fileObj ? { thumbnail: { url: `attachment://npc.gif` } } : {}),
                footer: { text: 'Heroes on Discord • Margonem' },
                timestamp: new Date().toISOString()
            }]
        }))
        const request = new XMLHttpRequest()
        request.open('POST', webhookUrl)
        heroesWatchRequest(request, webhookUrl, 'Wysłano powiadomienie na Discorda.')
        request.send(data)
    }


    const seenNpcSpawns = new Set()
    function handleNpcDetection(playerNick, npc, mapData)
    {
        try { if (localStorage.getItem('mkHubHeroesEnabled') === '0') return } catch (error) {}
        const mapKey = String(mapData?.id || mapData?.mapId || mapData?.mapid || mapData?.name || '')
        const spawnKey = `${mapKey}|${npc?.id || npc?.id2 || `${npc?.nick || npc?.name || ''}:${npc?.x ?? ''}:${npc?.y ?? ''}`}`
        if (seenNpcSpawns.has(spawnKey)) return
        seenNpcSpawns.add(spawnKey)
        if (seenNpcSpawns.size > 600) seenNpcSpawns.clear()
        if (isEventHero(npc) && settings.eventAlertsEnabled !== false && settings.webhookUrls.event)
        {
            const mapName = mapData?.name || mapData?.d?.name || 'Unknown map'
            sendDiscordAlert(settings.webhookUrls.event, playerNick, npc, mapName, getServerName(), EVENT_ROLE_ID)
                .catch(error => console.warn('Heroes on Discord: nie udało się wysłać powiadomienia eventowego.', error))
            return
        }
        displayPopup(playerNick, npc, mapData)
    }

    function isHeros(npc)
    {
        return npc.wt > 79 && npc.wt <= 99
    }

    function isEventHero(npc)
    {
        if (!isHeros(npc)) return false
        const name = String(npc.nick || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/\s*\([^)]*\)\s*$/, '').replace(/[^a-z0-9]/g, '')
        return EVENT_HERO_NAMES.has(name)
    }

    function isAdditionalNpcToSearch(npc)
    {
        return additionalNpcNamesToSearch.includes(npc.nick)
    }

    function getWebhookUrl(npc)
    {
        const category = isKnownColossus(npc) ? 'colossi' : (isHeros(npc) ? 'heroes' : 'titans')
        return settings.webhookUrls[category] || ''
    }

    function findMonsterRoleKey(npc)
    {
        const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ')
        const directKey = Object.keys(settings.roleMappings || {}).find(name =>
            !['heros', 'titan', 'npc'].includes(name) && normalize(name) === normalize(npc.nick))
        if (directKey) return directKey
        const aliasKey = Object.keys(monsterNameAliases).find(name => normalize(name) === normalize(npc.nick))
        if (!aliasKey) return undefined
        const roleName = monsterNameAliases[aliasKey]
        return Object.keys(settings.roleMappings || {}).find(name => normalize(name) === normalize(roleName))
    }

    function getRoleId(npc)
    {
        const monsterKey = findMonsterRoleKey(npc)
        const category = isKnownColossus(npc) ? 'titan' : (isHeros(npc) ? 'heros' : (isAdditionalNpcToSearch(npc) ? 'npc' : 'titan'))
        const value = monsterKey ? settings.roleMappings[monsterKey] : settings.roleMappings[category]
        return String(value || '').replace(/\D/g, '')
    }

    function hasKnownMonsterAlias(npc)
    {
        const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ')
        return Object.keys(monsterNameAliases).some(name => normalize(name) === normalize(npc.nick))
    }

    function isTitan(npc)
    {
        // In Margonem wt > 99 identifies titan-type NPCs. Keep alias checks as a fallback
        // for payloads where the game omits wt or uses a different data revision.
        const type = Number(npc?.wt)
        return Number.isFinite(type) && type > 99
    }

    function shouldTrackNpc(npc)
    {
        return isHeros(npc) || isTitan(npc) || isKnownColossus(npc) || isAdditionalNpcToSearch(npc) || hasKnownMonsterAlias(npc)
    }

    function isKnownColossus(npc)
    {
        const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ')
        const colossusRoleNames = ['Drakolisz', 'Reuzen', 'Pająk', 'Kruk', 'Hydra', 'Ważka', 'Umibozu', 'Sopel', 'Regulus']
        return Object.entries(monsterNameAliases).some(([gameName, roleName]) =>
            colossusRoleNames.includes(roleName) && normalize(gameName) === normalize(npc.nick))
    }

    // Margonem emits NPCs in different shapes between interfaces and map transitions.
    // Normalize single NPCs, wrapped records, and batches before applying our filters.
    function extractNpcRecords(payload)
    {
        const found = []
        const seen = new WeakSet()
        const visit = value => {
            if (!value || typeof value !== 'object' || seen.has(value)) return
            seen.add(value)
            if (Array.isArray(value)) { for (const item of value) visit(item); return }
            if (value.d && typeof value.d === 'object') { visit(value.d); return }
            if (value.npc && typeof value.npc === 'object') { visit(value.npc); return }
            if (value.data && typeof value.data === 'object' && (value.data.nick || value.data.name)) { visit(value.data); return }
            const nick = value.nick || value.name
            if (nick) {
                found.push(value.nick ? value : { ...value, nick: String(nick) })
                return
            }
            for (const item of Object.values(value)) visit(item)
        }
        visit(payload)
        return found
    }

    function closePopup()
    {
        document.body.removeChild(document.getElementById('heroes-popup'))
    }

    function enablePopupResizing(popup)
    {
        const content = popup.querySelector('.heroes-discord__background')
        if (!content) return
        const isSetup = popup.classList.contains('heroes-discord__setup')
        const sizeKey = isSetup ? 'heroes-discord-setup-size' : 'heroes-discord-alert-size'
        const minWidth = isSetup ? 340 : 250
        const minHeight = isSetup ? 440 : 220
        popup.style.setProperty('resize', 'none', 'important')
        popup.style.setProperty('overflow', 'hidden', 'important')
        popup.style.setProperty('box-sizing', 'border-box', 'important')
        try
        {
            const saved = JSON.parse(localStorage.getItem(sizeKey) || 'null')
            if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height))
            {
                popup.style.setProperty('width', `${Math.max(minWidth, saved.width)}px`, 'important')
                popup.style.setProperty('height', `${Math.max(minHeight, saved.height)}px`, 'important')
            }
            else
            {
                const rect = popup.getBoundingClientRect()
                popup.style.setProperty('width', `${Math.max(minWidth, rect.width)}px`, 'important')
                popup.style.setProperty('height', `${Math.max(minHeight, rect.height)}px`, 'important')
            }
        }
        catch (error)
        {
            const rect = popup.getBoundingClientRect()
            popup.style.setProperty('width', `${Math.max(minWidth, rect.width)}px`, 'important')
            popup.style.setProperty('height', `${Math.max(minHeight, rect.height)}px`, 'important')
        }

        const grip = document.createElement('div')
        grip.setAttribute('aria-label', 'Zmień rozmiar okna')
        grip.title = 'Przeciągnij, aby zmienić rozmiar'
        grip.style.cssText = 'position:absolute;right:2px;bottom:2px;width:22px;height:22px;z-index:20;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 0 55%,rgba(148,163,184,.4) 56% 61%,transparent 62% 70%,rgba(148,163,184,.65) 71% 76%,transparent 77% 85%,rgba(203,213,225,.9) 86% 91%,transparent 92%);border-radius:0 0 12px 0'
        popup.appendChild(grip)

        const fit = () =>
        {
            const box = popup.getBoundingClientRect()
            content.style.transform = 'none'
            content.style.zoom = '1'
            if (isSetup)
            {
                const textarea = content.querySelector('textarea.heroes-discord__input')
                if (textarea)
                {
                    const available = Math.max(55, Math.min(160, box.height - 460))
                    textarea.style.setProperty('height', `${available}px`, 'important')
                }
                content.style.setProperty('padding', box.height < 550 ? '12px' : '16px', 'important')
            }
            else
            {
                const imageBox = content.querySelector('.heroes-discord__img')
                const image = content.querySelector('.heroes-discord__img img')
                const text = content.querySelector('.heroes-discord__text')
                const buttons = content.querySelector('.heroes-discord__buttons-container')
                const handle = content.querySelector('.heroes-discord__drag-handle')
                const compact = box.height < 340
                if (imageBox) imageBox.style.setProperty('min-height', compact ? '64px' : '105px', 'important')
                if (image) image.style.setProperty('max-height', compact ? '60px' : '100px', 'important')
                if (text) text.style.setProperty('margin', compact ? '6px 0 8px' : '10px 0 12px', 'important')
                if (buttons) buttons.style.setProperty('padding-top', compact ? '8px' : '12px', 'important')
                if (handle) handle.style.setProperty('margin-bottom', compact ? '6px' : '10px', 'important')
                content.style.setProperty('padding', compact ? '10px' : '16px', 'important')
            }
        }
        let saveTimer
        const save = () =>
        {
            clearTimeout(saveTimer)
            saveTimer = setTimeout(() =>
            {
                const box = popup.getBoundingClientRect()
                try { localStorage.setItem(sizeKey, JSON.stringify({ width: Math.round(box.width), height: Math.round(box.height) })) } catch (error) {}
            }, 200)
        }
        grip.addEventListener('pointerdown', event =>
        {
            if (event.button !== undefined && event.button !== 0) return
            event.preventDefault()
            event.stopPropagation()
            const startX = event.clientX
            const startY = event.clientY
            const startRect = popup.getBoundingClientRect()
            const move = moveEvent =>
            {
                const width = Math.min(window.innerWidth - startRect.left, Math.max(minWidth, startRect.width + moveEvent.clientX - startX))
                const height = Math.min(window.innerHeight - startRect.top, Math.max(minHeight, startRect.height + moveEvent.clientY - startY))
                popup.style.setProperty('width', `${width}px`, 'important')
                popup.style.setProperty('height', `${height}px`, 'important')
                fit()
            }
            const stop = () =>
            {
                document.removeEventListener('pointermove', move)
                document.removeEventListener('pointerup', stop)
                document.removeEventListener('pointercancel', stop)
                save()
            }
            document.addEventListener('pointermove', move)
            document.addEventListener('pointerup', stop)
            document.addEventListener('pointercancel', stop)
        })
        const observer = new ResizeObserver(fit)
        observer.observe(popup)
        requestAnimationFrame(fit)
    }
    function makePopupDraggable(popup, handle)
    {
        const positionKey = popup.classList.contains('heroes-discord__setup')
            ? 'heroes-discord-setup-position'
            : 'heroes-discord-alert-position'

        handle.addEventListener('pointerdown', function (event)
        {
            if ((event.pointerType === 'mouse' && event.button !== 0) || event.target.closest('button')) return
            event.preventDefault()
            event.stopPropagation()

            const rect = popup.getBoundingClientRect()
            const startX = event.clientX
            const startY = event.clientY
            const offsetX = startX - rect.left
            const offsetY = startY - rect.top
            popup.style.setProperty('left', `${rect.left}px`, 'important')
            popup.style.setProperty('top', `${rect.top}px`, 'important')
            popup.style.right = 'auto'
            popup.style.bottom = 'auto'
            popup.style.transform = 'none'

            function move(moveEvent)
            {
                const maxLeft = Math.max(0, window.innerWidth - popup.offsetWidth)
                const maxTop = Math.max(0, window.innerHeight - popup.offsetHeight)
                popup.style.setProperty('left', `${Math.min(maxLeft, Math.max(0, moveEvent.clientX - offsetX))}px`, 'important')
                popup.style.setProperty('top', `${Math.min(maxTop, Math.max(0, moveEvent.clientY - offsetY))}px`, 'important')
            }
            function stop()
            {
                document.removeEventListener('pointermove', move)
                document.removeEventListener('pointerup', stop)
                document.removeEventListener('pointercancel', stop)
                localStorage.setItem(positionKey, JSON.stringify({
                    left: parseFloat(popup.style.left),
                    top: parseFloat(popup.style.top)
                }))
            }
            document.addEventListener('pointermove', move)
            document.addEventListener('pointerup', stop)
            document.addEventListener('pointercancel', stop)
        })
    }

    function restorePopupPosition(popup)
    {
        const positionKey = popup.classList.contains('heroes-discord__setup')
            ? 'heroes-discord-setup-position'
            : 'heroes-discord-alert-position'
        try
        {
            const savedPosition = JSON.parse(localStorage.getItem(positionKey) || 'null')
            if (!savedPosition || !Number.isFinite(savedPosition.left) || !Number.isFinite(savedPosition.top)) return
            const left = Math.min(Math.max(0, savedPosition.left), Math.max(0, window.innerWidth - popup.offsetWidth))
            const top = Math.min(Math.max(0, savedPosition.top), Math.max(0, window.innerHeight - popup.offsetHeight))
            popup.style.setProperty('left', `${left}px`, 'important')
            popup.style.setProperty('top', `${top}px`, 'important')
            popup.style.transform = 'none'
        }
        catch (error) { console.warn('Heroes on Discord: nie udało się przywrócić położenia okna.', error) }
    }

    function getServerName()
    {
        const worldName = getCookie('interface') === 'ni'
            ? Engine.worldConfig.getWorldName()
            : g.worldConfig.getWorldName()

        return worldName[0].toUpperCase() + worldName.slice(1)
    }


    function displayPopup(nick, npc, map)
    {
        let type = 'Tytan'
        if (isKnownColossus(npc))
        {
            type = 'Kolos'
        }
        else if (isHeros(npc))
        {
            type = 'Heros'
        }
        else if (isAdditionalNpcToSearch(npc))
        {
            type = ''
        }

        const popup = document.createElement('div')
        popup.id = 'heroes-popup'
        popup.className = 'heroes-discord__popup'

        const popupBackground = document.createElement('div')
        popupBackground.className = 'heroes-discord__background'

        const dragHandle = document.createElement('div')
        dragHandle.className = 'heroes-discord__drag-handle'
        dragHandle.innerText = 'Przeciągnij, aby przesunąć okno'
        popupBackground.appendChild(dragHandle)

        const imgContainer = document.createElement('div')
        imgContainer.className = 'heroes-discord__img'

        const img = document.createElement('img')
        img.src = 'https://micc.garmory-cdn.cloud/obrazki/npc/' + npc.icon

        imgContainer.appendChild(img)

        popupBackground.appendChild(imgContainer)

        const textContainer = document.createElement('div')
        textContainer.className = 'heroes-discord__text'

        const info = document.createElement('span')
        info.innerText = `${type} ${npc.nick} na mapie ${map.name} i kordach (${npc.x},${npc.y})`
        textContainer.appendChild(info)
        textContainer.appendChild(document.createElement('br'))
        const question = document.createElement('span')
        question.innerText = 'Powiadomić discorda?'
        textContainer.appendChild(question)

        popupBackground.appendChild(textContainer)

        const buttonContainer = document.createElement('div')
        buttonContainer.className = 'heroes-discord__buttons-container'

        const yesButton = document.createElement('button')
        yesButton.className = 'heroes-discord__button heroes-discord__button-positive'
        yesButton.innerText = 'Powiadom'
        yesButton.addEventListener('click', function ()
        {
            const webhookUrl = getWebhookUrl(npc)
            if (!webhookUrl)
            {
                const categoryName = isKnownColossus(npc) ? 'kolosów' : (isHeros(npc) ? 'herosów' : 'tytanów')
                message(`Nie ustawiono webhooka dla ${categoryName}. Uzupełnij go w ustawieniach dodatku.`)
                return
            }

            let name = nick
            if (settings.name)
            {
                name = settings.name
            }
            sendDiscordAlert(webhookUrl, name, npc, map.name, getServerName())
                .catch(error => { console.warn('Heroes on Discord: błąd wysyłki.', error); heroesNotify('Błąd wysyłki na Discorda: ' + (error && error.message || error)) })
            closePopup()
        })
        buttonContainer.appendChild(yesButton)

        const noButton = document.createElement('button')
        noButton.className = 'heroes-discord__button heroes-discord__button-negative'
        noButton.innerText = 'Nie powiadamiaj'
        noButton.addEventListener('click', closePopup)
        buttonContainer.appendChild(noButton)

        popupBackground.appendChild(buttonContainer)

        popup.appendChild(popupBackground)
        document.body.appendChild(popup)
        const opacityOptions = [0.4, 0.55, 0.7, 0.82, 0.92, 1]
        const opacityKey = 'heroes-discord-alert-opacity'
        let opacityIndex = 4
        try {
            const savedOpacity = Number(localStorage.getItem(opacityKey))
            const savedIndex = opacityOptions.indexOf(savedOpacity)
            if (savedIndex >= 0) opacityIndex = savedIndex
        } catch (error) {}
        popup.style.opacity = opacityOptions[opacityIndex]
        const opacityButton = document.createElement('button')
        opacityButton.type = 'button'
        opacityButton.className = 'heroes-discord__popup-opacity'
        opacityButton.textContent = 'O'
        opacityButton.title = 'Zmień przezroczystość okna'
        opacityButton.addEventListener('click', event => {
            event.preventDefault(); event.stopPropagation()
            opacityIndex = (opacityIndex + 1) % opacityOptions.length
            popup.style.opacity = opacityOptions[opacityIndex]
            try { localStorage.setItem(opacityKey, String(opacityOptions[opacityIndex])) } catch (error) {}
        })
        dragHandle.appendChild(opacityButton)
        restorePopupPosition(popup)
        makePopupDraggable(popup, dragHandle)
    }

    const webhookInputs = {
        heroes: document.createElement('input'),
        colossi: document.createElement('input'),
        titans: document.createElement('input'),
        event: document.createElement('input')
    }
    const nameInput = document.createElement('input')
    const roleMappingsInput = document.createElement('textarea')

    function saveSettings()
    {
        settings.webhookUrl = ''
        settings.webhookUrls = {
            heroes: webhookInputs.heroes.value.trim(),
            colossi: webhookInputs.colossi.value.trim(),
            titans: webhookInputs.titans.value.trim(),
            event: webhookInputs.event.value.trim()
        }
        settings.name = nameInput.value
        try
        {
            const parsed = JSON.parse(roleMappingsInput.value || '{}')
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Mapowanie musi być obiektem JSON.')
            settings.roleMappings = {}
            for (const name in parsed)
            {
                if (Object.prototype.hasOwnProperty.call(parsed, name)) settings.roleMappings[name] = String(parsed[name] || '').replace(/\D/g, '')
            }
        }
        catch (error)
        {
            message('Wpisz poprawny JSON z nazwami potworów i ID ról, np. {"Drakolisz":"123456789012345678","Heros X":"234567890123456789"}.')
            return false
        }

        localStorage.setItem('heroes-discord', JSON.stringify(settings))
        return true
    }

    function closeSetup(switchToRanges = true)
    {
        const setup = document.getElementsByClassName('heroes-discord__setup')
        if (setup.length > 0) setup[0].remove()
        if (switchToRanges) window.dispatchEvent(new CustomEvent('heroes-discord:settings-closed'))
    }

    function showSetup()
    {
        const hubHost = typeof window.__mkHubDiscordHost === 'function' ? window.__mkHubDiscordHost() : null
        const inlineHost = hubHost || document.getElementById('mk-discord-addon-slot')
        if (!inlineHost) return
        const existingSetup = document.querySelector('.heroes-discord__setup')
        if (existingSetup)
        {
            // If the Discord window was opened before the merged panel initialized,
            // move the same form into the Discord tab instead of leaving it hidden behind the game.
            existingSetup.classList.add('heroes-discord__setup--inline')
            existingSetup.querySelector('.heroes-discord__button-close')?.remove()
            existingSetup.querySelector('.heroes-discord__drag-handle')?.remove()
            if (existingSetup.parentElement !== inlineHost) inlineHost.appendChild(existingSetup)
            return
        }
        if (!existingSetup)
        {
            const popup = document.createElement('div')
            popup.className = 'heroes-discord__popup heroes-discord__setup'
            const inline = true
            popup.classList.add('heroes-discord__setup--inline')

            if (!inline)
            {
                const close = document.createElement('div')
                close.className = 'heroes-discord__button-close'
                close.addEventListener('click', closeSetup)
                popup.appendChild(close)
            }

            const popupBackground = document.createElement('div')
            popupBackground.className = 'heroes-discord__background '

            if (!inline)
            {
                const dragHandle = document.createElement('div')
                dragHandle.className = 'heroes-discord__drag-handle'
                dragHandle.innerText = 'Przeciągnij, aby przesunąć ustawienia'
                popupBackground.appendChild(dragHandle)
            }

            const webhookNames = [
                ['heroes', 'Webhook Discorda — Herosi'],
                ['colossi', 'Webhook Discorda — Kolosi'],
                ['titans', 'Webhook Discorda — Tytani']
            ]
            for (const [category, labelText] of webhookNames)
            {
                const webhookLabel = document.createElement('label')
                webhookLabel.className = 'heroes-discord__label'
                webhookLabel.innerText = labelText
                popupBackground.appendChild(webhookLabel)

                const webhookInput = webhookInputs[category]
                webhookInput.type = 'text'
                webhookInput.className = 'heroes-discord__input'
                webhookInput.value = settings.webhookUrls[category] || ''
                webhookInput.placeholder = 'Wklej link webhooka dla tego kanału'
                webhookLabel.appendChild(webhookInput)
            }

            const eventSection = document.createElement('section')
            eventSection.className = 'heroes-discord__event-settings'
            eventSection.style.cssText = 'margin:12px 0;padding:11px;border:1px solid rgba(99,102,241,.38);border-radius:9px;background:rgba(99,102,241,.10);color:#e7edf8;text-align:left'
            const eventTitle = document.createElement('div')
            eventTitle.textContent = 'Kanał eventowy — Herosi'
            eventTitle.style.cssText = 'margin-bottom:5px;font-weight:700;color:#c7d2fe'
            const eventInfo = document.createElement('div')
            eventInfo.textContent = 'Osobny kanał dla herosów eventowych • wzmianka @event'
            eventInfo.style.cssText = 'margin-bottom:8px;font-size:11px;color:#cbd5e1'
            const eventWebhookLabel = document.createElement('label')
            eventWebhookLabel.className = 'heroes-discord__label'
            eventWebhookLabel.innerText = 'Webhook Discorda — Event (@event)'
            eventWebhookLabel.style.cssText = 'display:block;height:auto;min-height:0;margin:8px 0 10px;text-align:left'
            const eventWebhookInput = webhookInputs.event
            eventWebhookInput.type = 'text'
            eventWebhookInput.className = 'heroes-discord__input'
            eventWebhookInput.value = settings.webhookUrls.event || ''
            eventWebhookInput.placeholder = 'Wklej link webhooka dla kanału Event'
            eventWebhookLabel.appendChild(eventWebhookInput)
            const eventToggleLabel = document.createElement('label')
            eventToggleLabel.style.cssText = 'display:flex;align-items:center;gap:7px;margin:0;color:#e7edf8;font-size:12px;cursor:pointer'
            const eventToggle = document.createElement('input')
            eventToggle.type = 'checkbox'
            eventToggle.className = 'heroes-discord__event-alert-toggle'
            eventToggle.checked = settings.eventAlertsEnabled !== false
            eventToggle.addEventListener('change', () => {
                settings.eventAlertsEnabled = eventToggle.checked
                try { localStorage.setItem('heroes-discord', JSON.stringify(settings)) } catch (error) {}
                window.__heroesDiscordSetEventAlerts?.(eventToggle.checked)
            })
            const eventToggleText = document.createElement('span')
            eventToggleText.textContent = 'Automatyczne powiadomienia o herosach'
            eventToggleLabel.append(eventToggle, eventToggleText)
            eventSection.append(eventTitle, eventInfo, eventWebhookLabel, eventToggleLabel)
            popupBackground.appendChild(eventSection)

            const nameLabel = document.createElement('label')
            nameLabel.className = 'heroes-discord__label'
            nameLabel.innerText = 'Nick jaki chcesz by się wyświetlał (zostaw puste jeżeli ma to być nick aktualnej postaci)'
            popupBackground.appendChild(nameLabel)

            nameInput.type = 'text'
            nameInput.className = 'heroes-discord__input'
            nameInput.value = settings.name
            if (getCookie('interface') === 'ni')
            {
                nameInput.placeholder = Engine.hero.nick
            }
            else
            {
                nameInput.placeholder = hero.nick
            }
            nameLabel.appendChild(nameInput)

            const rolesLabel = document.createElement('label')
            rolesLabel.className = 'heroes-discord__label'
            rolesLabel.innerText = 'Role dla konkretnych potworów (nazwa potwora: ID roli; puste = bez pingowania)'
            popupBackground.appendChild(rolesLabel)

            roleMappingsInput.className = 'heroes-discord__input'
            roleMappingsInput.style.height = '110px'
            roleMappingsInput.style.resize = 'vertical'
            roleMappingsInput.value = JSON.stringify(settings.roleMappings, null, 2)
            rolesLabel.appendChild(roleMappingsInput)


            const buttonContainer = document.createElement('div')
            buttonContainer.className = 'heroes-discord__buttons-container'

            const yesButton = document.createElement('button')
            yesButton.className = 'heroes-discord__button heroes-discord__button-positive'
            yesButton.innerText = 'Zapisz'
            yesButton.addEventListener('click', function ()
            {
                if (saveSettings())
                {
                    closeSetup()
                    message('Zapisano! Nie musisz nic odświeżać.')
                }
            })
            buttonContainer.appendChild(yesButton)

            const noButton = document.createElement('button')
            noButton.className = 'heroes-discord__button heroes-discord__button-negative'
            noButton.innerText = 'Anuluj'
            noButton.addEventListener('click', closeSetup)
            buttonContainer.appendChild(noButton)

            popupBackground.appendChild(buttonContainer)

            popup.appendChild(popupBackground)
            if (inline) inlineHost.appendChild(popup)
            else document.body.appendChild(popup)
            if (!inline)
            {
                enablePopupResizing(popup)
                restorePopupPosition(popup)
                makePopupDraggable(popup, dragHandle)
            }
        }
    }

    window.__heroesDiscordOpenSettings = function () { showSetup() }
    window.__heroesDiscordCloseSettings = function (switchBack = true) { closeSetup(switchBack) }
    window.__mkHubReadDiscordConfig = function () {
        return {
            webhookUrls: { heroes: settings.webhookUrls.heroes || '', colossi: settings.webhookUrls.colossi || '', titans: settings.webhookUrls.titans || '', event: settings.webhookUrls.event || '' },
            name: settings.name || '', eventAlertsEnabled: settings.eventAlertsEnabled !== false,
            roleMappings: { ...settings.roleMappings }
        }
    }
    window.__mkHubSaveDiscordConfig = function (patch) {
        if (!patch || typeof patch !== 'object') return false
        if (patch.webhookUrls && typeof patch.webhookUrls === 'object') {
            settings.webhookUrls = Object.fromEntries(['heroes','colossi','titans','event'].map(key => [key, String(patch.webhookUrls[key] || '').trim()]))
            settings.webhookUrl = ''
        }
        if (typeof patch.name === 'string') settings.name = patch.name.trim()
        if (typeof patch.eventAlertsEnabled === 'boolean') settings.eventAlertsEnabled = patch.eventAlertsEnabled
        if (patch.roleMappings && typeof patch.roleMappings === 'object' && !Array.isArray(patch.roleMappings)) {
            settings.roleMappings = Object.fromEntries(Object.entries(patch.roleMappings).map(([name,id]) => [String(name), String(id || '').replace(/\D/g, '')]))
        }
        try { localStorage.setItem('heroes-discord', JSON.stringify(settings)) } catch (error) { return false }
        for (const key of ['heroes','colossi','titans','event']) if (webhookInputs[key]) webhookInputs[key].value = settings.webhookUrls[key] || ''
        if (nameInput) nameInput.value = settings.name
        if (roleMappingsInput) roleMappingsInput.value = JSON.stringify(settings.roleMappings, null, 2)
        window.__heroesDiscordSetEventAlerts?.(settings.eventAlertsEnabled)
        return true
    }

    function getCookie(cookieName)
    {
        let c_value = ' ' + document.cookie
        let c_start = c_value.indexOf(' ' + cookieName + '=')
        if (c_start === -1)
        {
            c_value = null
        }
        else
        {
            c_start = c_value.indexOf('=', c_start) + 1
            let c_end = c_value.indexOf(';', c_start)
            if (c_end === -1)
            {
                c_end = c_value.length
            }
            c_value = unescape(c_value.substring(c_start, c_end))
        }
        return c_value
    }

    function appendDiscordIcon()
    {
        if (!launcherEnabled || !document.body) return
        // Place the launcher just to the right of the bottom-left addon buttons.
        // Find that strip by its visible footprint, rather than relying on #config
        // or pointer-bg classes which can refer to unrelated controls in NI.
        const findStrip = () => {
            const candidates = Array.from(document.querySelectorAll('body *')).filter(el => {
                const r = el.getBoundingClientRect()
                if (r.left < -1 || r.left > 35 || r.bottom < innerHeight - 12 || r.width < 150 || r.width > 380 || r.height < 42 || r.height > 140) return false
                const s = getComputedStyle(el)
                if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
                const controls = Array.from(el.querySelectorAll('button,a,img,[role="button"]')).filter(node => {
                    const cr = node.getBoundingClientRect()
                    return cr.width >= 18 && cr.height >= 18 && cr.left < 290 && cr.bottom > innerHeight - 150
                })
                return controls.length >= 6
            })
            candidates.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))
            return candidates[0] || null
        }
        let cachedRow = null
        let lastRowScan = 0
        const scanRow = () => {
            const items = []
            for (const el of document.querySelectorAll('body *')) {
                if (el === discordIcon || (el.closest && el.closest('#mk-hub'))) continue
                const r = el.getBoundingClientRect()
                if (r.width < 28 || r.width > 72 || r.height < 28 || r.height > 72 || Math.abs(r.width - r.height) > 8) continue
                if (r.left < -1 || r.left > 420 || r.bottom < innerHeight - 220 || r.bottom > innerHeight + 2) continue
                const s = getComputedStyle(el)
                if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue
                items.push({ el, r })
            }
            const outer = items.filter(a => !items.some(b => b !== a && b.el.contains(a.el) && Math.abs(b.r.width - a.r.width) < 4 && Math.abs(b.r.left - a.r.left) < 4))
            const buckets = []
            for (const item of outer) {
                let bucket = buckets.find(list => Math.abs(list[0].r.top - item.r.top) <= 3 && Math.abs(list[0].r.width - item.r.width) <= 6)
                if (!bucket) { bucket = []; buckets.push(bucket) }
                bucket.push(item)
            }
            let best = null
            for (const list of buckets) if (list.length >= 3 && (!best || list.length > best.length)) best = list
            if (!best) return null
            return best.sort((a, b) => a.r.left - b.r.left)
        }
        const applyRow = row => {
            const last = row[row.length - 1]
            const r = last.el.getBoundingClientRect()
            const size = Math.round(r.width)
            const prev = row.length > 1 ? row[row.length - 2].r : null
            const gap = prev ? Math.max(2, Math.min(12, Math.round(last.r.left - prev.right))) : 4
            if (r.right + gap + size > innerWidth) return false
            const cs = getComputedStyle(last.el)
            const put = (prop, value) => discordIcon.style.setProperty(prop, value, 'important')
            put('width', size + 'px'); put('height', size + 'px')
            put('left', Math.round(r.right + gap) + 'px'); put('top', Math.round(r.top) + 'px'); put('bottom', 'auto')
            put('padding', Math.max(3, Math.round(size * 0.1)) + 'px')
            if (cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0) { put('border-style', cs.borderTopStyle); put('border-width', cs.borderTopWidth); put('border-color', cs.borderTopColor) }
            put('border-radius', cs.borderTopLeftRadius)
            if (cs.boxShadow && cs.boxShadow !== 'none') put('box-shadow', cs.boxShadow)
            const bg = cs.backgroundColor
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') put('background', bg)
            return true
        }
        const placeInSlotRow = () => {
            const now = Date.now()
            const last = cachedRow && cachedRow[cachedRow.length - 1]
            if (!last || !last.el.isConnected || last.el.getBoundingClientRect().width < 20 || now - lastRowScan > 8000) { cachedRow = scanRow(); lastRowScan = now }
            else cachedRow.forEach(item => { item.r = item.el.getBoundingClientRect() })
            return !!cachedRow && applyRow(cachedRow)
        }
        const place = () => {
            let left = 230
            let bottom = 6
            if (placeInSlotRow()) return
            const strip = findStrip()
            if (strip) {
                const r = strip.getBoundingClientRect()
                left = Math.round(r.right + 6)
                bottom = Math.max(4, Math.round(innerHeight - r.bottom + Math.max(0, (r.height - 46) / 2)))
            }
            discordIcon.style.setProperty('left', Math.max(4, Math.min(left, innerWidth - 44)) + 'px', 'important')
            discordIcon.style.setProperty('bottom', bottom + 'px', 'important')
        }
        if (!discordIcon.isConnected) document.body.appendChild(discordIcon)
        place()
        discordIcon.__place = place
        if (!discordIcon.dataset.positionTracking) {
            discordIcon.dataset.positionTracking = '1'
            window.addEventListener('resize', place)
        }
    }

    function hasVisibleLabel(pattern)
    {
        if (!document.body) return false
        for (const el of document.body.querySelectorAll('body *'))
        {
            const label = String(el.innerText || el.textContent || '').trim()
            if (!label || !pattern.test(label)) continue
            const rect = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0) return true
        }
        return false
    }

    function isCharacterSelectionScreen()
    {
        return hasVisibleLabel(/choose your character|wybierz postac/i) && hasVisibleLabel(/play now|graj teraz/i)
    }

    function syncDiscordLauncherVisibility()
    {
        const loginScreen = isCharacterSelectionScreen()
        const icons = document.querySelectorAll('.heroes-discord__discord-icon')
        for (const icon of icons)
        {
            const shouldShow = icon === discordIcon && launcherEnabled && !loginScreen
            icon.style.setProperty('display', shouldShow ? 'block' : 'none', 'important')
        }
        if (launcherEnabled && !loginScreen && !discordIcon.isConnected) appendDiscordIcon()
        else if (launcherEnabled && !loginScreen && typeof discordIcon.__place === 'function') discordIcon.__place()
    }

    let discordIconSyncTimer = null
    const discordIconObserver = new MutationObserver(function () {
        if (discordIconSyncTimer !== null) clearTimeout(discordIconSyncTimer)
        discordIconSyncTimer = setTimeout(function () {
            discordIconSyncTimer = null
            syncDiscordLauncherVisibility()
        }, 150)
    })
    discordIconObserver.observe(document.documentElement, { childList: true, subtree: true })
    setInterval(syncDiscordLauncherVisibility, 1500)
    syncDiscordLauncherVisibility()

    const colossusCallMapKey = 'heroes-discord-colossus-map-roles'
    const knownColossi = ['Drakolisz', 'Reuzen', 'Pająk', 'Kruk', 'Hydra', 'Ważka', 'Umibozu', 'Sopel', 'Regulus']

    function normalizeMapLabel(value)
    {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    }

    function readColossusMapRoles()
    {
        try
        {
            const saved = JSON.parse(localStorage.getItem(colossusCallMapKey) || '{}')
            if (!saved['Catacombs of Ancient Wrath - Vestibule']) saved['Catacombs of Ancient Wrath - Vestibule'] = 'Drakolisz'
            return saved
        }
        catch (error) { return { 'Catacombs of Ancient Wrath - Vestibule': 'Drakolisz' } }
    }

    function getCurrentMapData()
    {
        try
        {
            if (typeof Engine !== 'undefined' && Engine.map) return Engine.map.d || Engine.map
            if (typeof map !== 'undefined' && map) return map.d || map
        }
        catch (error) {}
        return null
    }

    function inferColossusFromCallMap(mapName)
    {
        const currentName = normalizeMapLabel(mapName).replace(/[–—]/g, '-')
        const isSpiderGrotto = currentName.includes('grotto') && (currentName.includes('insidious spider') || currentName.includes('insidious arach'))
        if (!currentName.includes('vestibule') && !currentName.includes('antechamber') && !isSpiderGrotto) return ''
        if (currentName.includes('catacombs of ancient wrath')) return 'Drakolisz'
        if ((currentName.includes('abyss of cursed waves') && currentName.includes('antechamber')) || (currentName.includes('marshy lair') && currentName.includes('vestibule'))) return 'Umibozu'
        const isVestibuleOrUnqualified = currentName.includes('vestibule') || currentName.includes('antechamber') || !/(main chamber|\b\d+(st|nd|rd|th) chamber\b)/.test(currentName)
        if (isSpiderGrotto && isVestibuleOrUnqualified) return 'Pająk'
        return ''
    }

    function isColossusCallMap(mapName)
    {
        const currentName = normalizeMapLabel(mapName).replace(/[–—]/g, '-')
        if (inferColossusFromCallMap(mapName)) return true
        const colossusVestibules = [
            'Madmen Cavern - Vestibule',
            'Marshy Lair - Vestibule',
            'Permafrost of Amaimon the Iciclehand - Vestibule',
            'Abyss of Chimeric Nature - Vestibule',
            'Abyss of Reverie - Vestibule',
            'Tomb of Cursed Croak - Vestibule',
            'Grotto of Insidious Spider - Vestibule',
            'Grotto of Deadwood - Vestibule',
            'Catacombs of Ancient Wrath - Vestibule'
        ]
        return colossusVestibules.some(name => normalizeMapLabel(name).replace(/[–—]/g, '-') === currentName)
    }
    function sendColossusGroupCall(mapName, roleName)
    {
        const hook = settings.webhookUrls.colossi || settings.webhookUrl
        if (!hook)
        {
            alert('Ustaw webhook dla kolosów w menu Heroes on Discord.')
            return
        }
        const roleKey = Object.keys(settings.roleMappings || {}).find(name => normalizeMapLabel(name) === normalizeMapLabel(roleName))
        const roleId = String(roleKey ? settings.roleMappings[roleKey] : '').replace(/\D/g, '')
        if (!roleId)
        {
            alert(`Nie ma ustawionego ID roli dla: ${roleName}`)
            return
        }
        const world = getServerName()
        const payload = {
            content: `<@&${roleId}> 📣 **Zbieramy grupę na kolosa ${roleName}!**`,
            allowed_mentions: { parse: [], roles: [roleId] },
            username: 'Sąsiad',
            avatar_url: 'https://samequizy.pl/wp-content/uploads/2019/02/filing_images_952825540c11-18.jpg',
            embeds: [{
                color: 12320855,
                title: `Grupa na kolosa: ${roleName}`,
                description: `Kto chętny na wspólne bicie?\n\n📍 **${mapName}**`,
                fields: [
                    { name: '🌐 Świat', value: String(world), inline: true },
                    { name: '👤 Organizuje', value: String(settings.name || (getCookie('interface') === 'ni' ? Engine.hero.nick : hero.nick)), inline: true }
                ],
                footer: { text: 'Heroes on Discord • wezwanie na kolosa' },
                timestamp: new Date().toISOString()
            }]
        }
        const body = new FormData()
        body.append('payload_json', JSON.stringify(payload))
        const request = new XMLHttpRequest()
        request.open('POST', hook)
        heroesWatchRequest(request, hook, 'Wysłano wezwanie na kolosa na Discorda.')
        request.send(body)
    }

    function showColossusCallPrompt(mapName)
    {
        if (!isColossusPromptEnabled()) return
        const previous = document.getElementById('heroes-colossus-call')
        if (previous) previous.remove()
        const remembered = readColossusMapRoles()
        let selectedColossus = inferColossusFromCallMap(mapName) || remembered[mapName]

        const panel = document.createElement('div')
        panel.id = 'heroes-colossus-call'
        panel.style.cssText = 'position:fixed;right:24px;bottom:90px;z-index:2147483000;width:250px;height:253px;min-width:250px;min-height:253px;max-width:250px;max-height:253px;resize:none;overflow:hidden;box-sizing:border-box;padding:16px;border:1px solid #40516b;border-radius:14px;background:#111827;color:#e5e7eb;box-shadow:0 18px 55px rgba(0,0,0,.62);font:14px/1.45 Segoe UI,Arial,sans-serif'
        try {
            const savedPanelPosition = JSON.parse(localStorage.getItem('heroes-discord-colossus-call-position') || 'null')
            if (savedPanelPosition && Number.isFinite(savedPanelPosition.left) && Number.isFinite(savedPanelPosition.top)) {
                panel.style.left = Math.max(0, Math.min(innerWidth - 250, savedPanelPosition.left)) + 'px'
                panel.style.top = Math.max(0, Math.min(innerHeight - 253, savedPanelPosition.top)) + 'px'
                panel.style.right = 'auto'
                panel.style.bottom = 'auto'
            }
        } catch (error) {}
        const heading = document.createElement('div')
        heading.textContent = '📣 Zbieramy grupę na kolosa?'
        heading.style.cssText = 'position:relative;margin:0 0 7px;padding-right:28px;font-size:16px;font-weight:700;color:#fff;cursor:move;user-select:none'
        heading.title = 'Przeciągnij, aby przenieść okno'
        const opacityValues = [0.4, 0.55, 0.7, 0.82, 0.92, 1]
        const opacityStorageKey = 'heroes-discord-colossus-call-opacity'
        let opacityValueIndex = 4
        try {
            const savedOpacity = Number(localStorage.getItem(opacityStorageKey))
            const foundIndex = opacityValues.indexOf(savedOpacity)
            if (foundIndex >= 0) opacityValueIndex = foundIndex
        } catch (error) {}
        panel.style.opacity = opacityValues[opacityValueIndex]
        const opacityButton = document.createElement('button')
        opacityButton.type = 'button'
        opacityButton.className = 'heroes-call-opacity'
        opacityButton.textContent = 'O'
        opacityButton.title = 'Zmień przezroczystość okna'
        opacityButton.addEventListener('pointerdown', event => event.stopPropagation())
        opacityButton.addEventListener('click', event => {
            event.preventDefault(); event.stopPropagation()
            opacityValueIndex = (opacityValueIndex + 1) % opacityValues.length
            panel.style.opacity = opacityValues[opacityValueIndex]
            try { localStorage.setItem(opacityStorageKey, String(opacityValues[opacityValueIndex])) } catch (error) {}
        })
        heading.appendChild(opacityButton)
        heading.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 || event.target.closest('button')) return
            event.preventDefault()
            const rect = panel.getBoundingClientRect()
            const offsetX = event.clientX - rect.left
            const offsetY = event.clientY - rect.top
            function move(moveEvent) {
                const left = Math.max(0, Math.min(innerWidth - panel.offsetWidth, moveEvent.clientX - offsetX))
                const top = Math.max(0, Math.min(innerHeight - panel.offsetHeight, moveEvent.clientY - offsetY))
                panel.style.left = left + 'px'
                panel.style.top = top + 'px'
                panel.style.right = 'auto'
                panel.style.bottom = 'auto'
            }
            function stop() {
                document.removeEventListener('pointermove', move)
                document.removeEventListener('pointerup', stop)
                document.removeEventListener('pointercancel', stop)
                try {
                    const finalRect = panel.getBoundingClientRect()
                    localStorage.setItem('heroes-discord-colossus-call-position', JSON.stringify({ left: finalRect.left, top: finalRect.top }))
                } catch (error) {}
            }
            document.addEventListener('pointermove', move)
            document.addEventListener('pointerup', stop)
            document.addEventListener('pointercancel', stop)
        })
        panel.appendChild(heading)
        const location = document.createElement('div')
        location.textContent = mapName
        location.style.cssText = 'margin-bottom:12px;color:#aab8cc;font-size:12px'
        panel.appendChild(location)
        const select = document.createElement('select')
        select.style.cssText = 'display:block;width:100%;height:38px;margin:0 0 10px;padding:0 10px;border:1px solid #40516b;border-radius:8px;background:#0b1220;color:#f8fafc;font:inherit'
        const placeholder = document.createElement('option')
        placeholder.value = ''
        placeholder.textContent = 'Wybierz kolosa'
        select.appendChild(placeholder)
        for (const colossus of knownColossi)
        {
            const option = document.createElement('option')
            option.value = colossus
            option.textContent = colossus
            select.appendChild(option)
        }
        if (selectedColossus && knownColossi.includes(selectedColossus)) select.value = selectedColossus
        panel.appendChild(select)
        const rememberLabel = document.createElement('label')
        rememberLabel.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 13px;color:#b8c4d6;font-size:12px;cursor:pointer'
        const remember = document.createElement('input')
        remember.type = 'checkbox'
        remember.checked = true
        rememberLabel.appendChild(remember)
        rememberLabel.appendChild(document.createTextNode('Zapamiętaj kolosa dla tej mapy'))
        panel.appendChild(rememberLabel)
        const buttons = document.createElement('div')
        buttons.style.cssText = 'display:flex;justify-content:flex-end;gap:8px'
        const cancel = document.createElement('button')
        cancel.textContent = 'Później'
        cancel.style.cssText = 'padding:8px 13px;border:1px solid #45546a;border-radius:8px;background:#263244;color:#fff;cursor:pointer'
        cancel.addEventListener('click', () => panel.remove())
        const send = document.createElement('button')
        send.textContent = 'Wyślij na Discorda'
        send.style.cssText = 'padding:8px 13px;border:0;border-radius:8px;background:#5865f2;color:#fff;font-weight:700;cursor:pointer'
        send.addEventListener('click', () => {
            if (!select.value) { alert('Najpierw wybierz kolosa.'); return }
            if (remember.checked) {
                remembered[mapName] = select.value
                try { localStorage.setItem(colossusCallMapKey, JSON.stringify(remembered)) } catch (error) {}
            }
            sendColossusGroupCall(mapName, select.value)
            panel.remove()
        })
        buttons.appendChild(cancel)
        buttons.appendChild(send)
        panel.appendChild(buttons)
        document.body.appendChild(panel)
    }

    let lastObservedMap = ''
    function checkColossusVestibule()
    {
        if (!isColossusPromptEnabled()) return
        const currentMap = getCurrentMapData()
        const name = currentMap && String(currentMap.name || currentMap.n || '')
        if (!name) return
        const identity = `${currentMap.id || currentMap.mapId || ''}|${name}`
        if (identity === lastObservedMap) return
        lastObservedMap = identity
        if (isColossusCallMap(name)) showColossusCallPrompt(name)
    }

    window.addEventListener('mk-colossus-prompt-toggle', event => {
        if (event.detail?.enabled) { lastObservedMap = ''; checkColossusVestibule(); return }
        document.getElementById('heroes-colossus-call')?.remove()
    })

    function scanCurrentMapNpcs()
    {
        const mapData = getCurrentMapData()
        if (!mapData) return
        const sources = []
        try { if (typeof Engine !== 'undefined' && typeof Engine.npcs?.check === 'function') sources.push(Engine.npcs.check()) } catch (error) {}
        try { if (typeof g !== 'undefined' && g?.npc) sources.push(g.npc) } catch (error) {}
        for (const source of sources)
        {
            for (const npc of extractNpcRecords(source))
            {
                if (shouldTrackNpc(npc)) handleNpcDetection((typeof Engine !== 'undefined' && Engine.hero?.nick) || (typeof hero !== 'undefined' && hero?.nick) || '', npc, mapData)
            }
        }
    }

    loadSettings()
    let hooksInstalled = false

    function start()
    {
        if (!document.body) return
        const retry = () =>
        {
            startupAttempts++
            setTimeout(start, 1000)
        }
        if (getCookie('interface') === 'ni')
        {
            if (typeof Engine !== 'undefined' && Engine.npcs && Engine.npcs.check && Engine.map && Engine.hero)
            {
                if (!hooksInstalled)
                {
                    API.addCallbackToEvent('newNpc', function (payload)
                    {
                        // Handle both wrapped and direct NPC payloads used by different game interfaces.
                        try
                        {
                            for (const npc of extractNpcRecords(payload))
                                if (shouldTrackNpc(npc)) handleNpcDetection(Engine.hero?.nick || '', npc, Engine.map?.d || Engine.map)
                        }
                        catch (error) { console.warn('Heroes on Discord: błąd wykrywania NPC.', error) }
                    })
                    hooksInstalled = true
                    setTimeout(scanCurrentMapNpcs, 0)
                }
                launcherEnabled = true
                appendDiscordIcon()
                startupAttempts = 0
            }
            else retry()
        }
        else
        {
            if (typeof newNpc !== 'function' || typeof hero === 'undefined' || typeof map === 'undefined')
            {
                retry()
                return
            }
            if (!hooksInstalled)
            {
                const oldNewNpc = newNpc
                newNpc = function (dane)
                {
                    // Snapshot the incoming NPCs before the game can mutate the payload.
                    const npcsToTrack = extractNpcRecords(dane).map(npc => ({ ...npc }))
                    // Always let the game create NPCs, even if add-on detection fails.
                    const result = oldNewNpc.apply(this, arguments)
                    try
                    {
                        for (const npc of npcsToTrack)
                        {
                            if (shouldTrackNpc(npc)) handleNpcDetection(hero?.nick || '', npc, map)
                        }
                    }
                    catch (error) { console.warn('Heroes on Discord: błąd wykrywania NPC.', error) }
                    return result
                }
                hooksInstalled = true
                setTimeout(scanCurrentMapNpcs, 0)
            }
            launcherEnabled = true
            appendDiscordIcon()
            startupAttempts = 0
        }
    }
    start()
    setInterval(() => { checkColossusVestibule(); scanCurrentMapNpcs() }, 1500)
})([
    'Giant Smoldering Light',
    'Giant Shieldbell',
    'Giant Common Bulbcap',
    'Giant Frostcap',
    'Giant Gloomspike',
    'Tropiciel Herosów',
    'Wtajemniczony Tropiciel Herosów',
    'Doświadczony Tropiciel Herosów'
])


    function injectModernStyle() {
        if (document.getElementById('mk-clan-ranges-modern-style')) return;
        const style = document.createElement('style');
        style.id = 'mk-clan-ranges-modern-style';
        style.textContent = `
            #mk-clan-ranges-panel { position:fixed!important; color:#e7edf8; background:linear-gradient(160deg,rgba(19,28,45,.98),rgba(12,18,31,.98)); border:1px solid rgba(148,163,184,.32); border-radius:12px; box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 0 1px rgba(99,102,241,.08); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; backdrop-filter:blur(10px); }
            #mk-clan-ranges-panel .mk-header { min-height:38px; padding:7px 9px; gap:7px; background:rgba(255,255,255,.035); border-bottom-color:rgba(148,163,184,.14); }
            #mk-clan-ranges-panel .mk-tool-btn,#mk-clan-ranges-panel .mk-config-btn { color:#e8edff; background:rgba(99,102,241,.14); border:1px solid rgba(129,140,248,.28); border-radius:7px; transition:background .16s,border-color .16s,transform .16s; }
            #mk-clan-ranges-panel .mk-tool-btn:hover,#mk-clan-ranges-panel .mk-config-btn:hover { background:rgba(99,102,241,.3); border-color:rgba(165,180,252,.58); transform:translateY(-1px); }
            #mk-clan-ranges-panel .mk-tool-btn.active { background:#4f46e5; border-color:#818cf8; }
            #mk-clan-ranges-panel .mk-switch { border-radius:999px; background:rgba(2,6,23,.55); border-color:rgba(148,163,184,.22); }
            #mk-clan-ranges-panel .mk-slider { border-radius:999px; background:#6366f1; }
            #mk-clan-ranges-panel .mk-body { padding:8px; }
            #mk-clan-ranges-panel .mk-range { margin-bottom:7px; overflow:hidden; border:1px solid rgba(148,163,184,.15); border-radius:9px; background:rgba(255,255,255,.035); }
            #mk-clan-ranges-panel .mk-range-head { padding:8px 9px; border-bottom-color:rgba(148,163,184,.1); }
            #mk-clan-ranges-panel .mk-list { color:#cbd5e1; padding:7px 10px 9px 25px; }
            #mk-clan-ranges-panel .mk-config { padding:9px; }
            #mk-clan-ranges-panel .mk-config-input { color:#e7edf8; background:rgba(7,12,23,.72); border:1px solid rgba(148,163,184,.25); border-radius:7px; padding:6px 8px; }
            #mk-clan-ranges-panel .mk-config-input:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 2px rgba(99,102,241,.16); }
            #mk-clan-ranges-panel .mk-config-adv { border-radius:8px; border-left-width:3px; background:rgba(2,6,23,.35); }
            #mk-clan-ranges-panel .mk-footer { border-top-color:rgba(148,163,184,.14); background:rgba(2,6,23,.3); border-bottom-left-radius:11px; border-bottom-right-radius:11px; }
            #mk-clan-ranges-panel.mk-mini { border-radius:11px; }
        `;
        document.head.appendChild(style);
    }

(function () {
    'use strict';

    const PANEL_ID = 'mk-clan-ranges-panel';
    const STYLE_ID = 'mk-clan-ranges-style';
    const STORAGE_KEY = 'mk_clan_ranges_state_v37';
    const RANGE_WEBHOOKS_USER_OWNED_KEY = 'mk_ranges_webhooks_user_owned_v2';
    const RANGES_ENABLED_KEY = 'mkOnlineRangesEnabled';
    const isOnlineRangesEnabled = () => { try { return localStorage.getItem(RANGES_ENABLED_KEY) !== '0'; } catch (e) { return true; } };

    // Domyślne zakresy levelowe
    const DEFAULT_RANGES = [
        { id: 'arcy',  label: 'Arcy',  min: 131, max: 144, webhookEnabled: false, webhook: '', ping: '', spamMode: false, interval: 0, includeClan: false },
        { id: 'zoons', label: 'Zoons', min: 154, max: 167, webhookEnabled: false, webhook: '', ping: '', spamMode: false, interval: 0, includeClan: false },
        { id: 'lowka', label: 'Łowka', min: 177, max: 190, webhookEnabled: false, webhook: '', ping: '', spamMode: false, interval: 0, includeClan: false }
    ];

    const OPACITY_OPTIONS = [0.4, 0.55, 0.7, 0.82, 0.92, 1];

    let state = {
        top: '120px', left: '20px', opacityIndex: 4, collapsed: false, mode: 'clan',
        rangeCollapsed: { clan: {}, world: {} },
        config: {
            clan: {
                customRanges: [], dotRedRange: '0-6', dotYellowRange: '7-9', dotGreenRange: '10-99',
                msgEnabled: true, msgTemplate: '⭐ Zadyma na {przedzial} ! ⭐'
            },
            world: {
                customRanges: [], dotRedRange: '0-6', dotYellowRange: '7-9', dotGreenRange: '10-99',
                msgEnabled: true, msgTemplate: '⭐ Zadyma na {przedzial} ! ⭐'
            }
        }
    };

    let currentPlayers = [];
    let globalClanNicks = new Set();
    let backgroundRequestUntil = 0;
    let previousDotColors = { clan: {}, world: {} };
    let lastAutoSend = { clan: {}, world: {} };

    let panel, bodyWrapper, configWrapper, addonSlot, footerEl, statusEl, tipEl, miniDot, modeSwitch, configBtn, rangesTab, discordTab;
    let configMode = false;

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.config) state.config = parsed.config;
                state.top = parsed.top || state.top;
                state.left = parsed.left || state.left;
                state.opacityIndex = parsed.opacityIndex !== undefined ? parsed.opacityIndex : state.opacityIndex;
                state.collapsed = !!parsed.collapsed;
                state.mode = parsed.mode || 'clan';
                state.rangeCollapsed = parsed.rangeCollapsed || { clan: {}, world: {} };
            }
        } catch (e) {}

        ['clan', 'world'].forEach(m => {
            if (!state.config[m].customRanges || state.config[m].customRanges.length === 0) {
                state.config[m].customRanges = JSON.parse(JSON.stringify(DEFAULT_RANGES));
            } else {
                state.config[m].customRanges.forEach(r => {
                    if (r.webhookEnabled === undefined) r.webhookEnabled = false;
                    if (r.webhook === undefined) r.webhook = '';
                    if (r.ping === undefined) r.ping = '';
                    if (r.spamMode === undefined) r.spamMode = false;
                    if (r.interval === undefined) r.interval = 0;
                    if (r.includeClan === undefined) r.includeClan = false;
                });
            }

            // Wymuszenie domyślnych kropek z pamięci (i nadpisanie złego 10+)
            if (!state.config[m].dotRedRange) state.config[m].dotRedRange = '0-6';
            if (!state.config[m].dotYellowRange) state.config[m].dotYellowRange = '7-9';
            if (!state.config[m].dotGreenRange || state.config[m].dotGreenRange === '10+') state.config[m].dotGreenRange = '10-99';
        });

        try {
            if (localStorage.getItem(RANGE_WEBHOOKS_USER_OWNED_KEY) !== '1') {
                ['clan', 'world'].forEach(m => state.config[m].customRanges.forEach(r => {
                    r.webhookEnabled = false;
                    r.webhook = '';
                    r.ping = '';
                }));
                localStorage.setItem(RANGE_WEBHOOKS_USER_OWNED_KEY, '1');
                saveState();
            }
        } catch (e) {}

        if (!state.rangeCollapsed.clan) state.rangeCollapsed = { clan: {}, world: {} };
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function isInRange(count, rangeStr) {
        if (!rangeStr) return false;
        rangeStr = rangeStr.toString().trim();
        if (rangeStr.endsWith('+')) {
            let min = parseInt(rangeStr);
            return !isNaN(min) && count >= min;
        }
        let parts = rangeStr.split('-').map(s => parseInt(s.trim()));
        if (parts.length === 1 && !isNaN(parts[0])) return count === parts[0];
        else if (parts.length === 2 && !isNaN(parts[0])) return count >= parts[0] && count <= (isNaN(parts[1]) ? Infinity : parts[1]);
        return false;
    }

    function getDotColorValue(count, cfg) {
        if (isInRange(count, cfg.dotGreenRange)) return 2;
        if (isInRange(count, cfg.dotYellowRange)) return 1;
        return 0;
    }

    function getDotClass(colorValue) {
        if (colorValue === 2) return 'mk-dot-green';
        if (colorValue === 1) return 'mk-dot-yellow';
        return 'mk-dot-red';
    }

    function showBigMessage(text) {
        if (typeof window.message === 'function') window.message(text);
        else {
            const container = document.querySelector('.big-messages');
            if (container) {
                const msgEl = document.createElement('div');
                msgEl.className = 'message active';
                msgEl.innerHTML = `<div class="inner" style="color:#52e37c;text-shadow:0 0 4px #000,0 0 4px #000">${text}</div>`;
                container.appendChild(msgEl);
                setTimeout(() => { msgEl.classList.remove('active'); setTimeout(() => msgEl.remove(), 500); }, 4000);
            }
        }
    }

    function sendDiscordEmbed(range, players, url, pingRole) {
        if (!isOnlineRangesEnabled() || !url || url.trim() === '') return;

        const profCounts = {};
        players.forEach(p => { profCounts[p.prof] = (profCounts[p.prof] || 0) + 1; });
        const profStr = Object.entries(profCounts).map(([prof, count]) => `${count} ${prof}`).join(' • ') || 'Brak danych';
        let playerStr = players.map(p => `**${p.nick}** · ${p.level}${p.prof}`).join('\n') || 'Brak graczy online';
        if (playerStr.length > 1024) playerStr = playerStr.substring(0, 1018) + '\n…';

        const myNick = window.Engine?.hero?.d?.nick || 'Margonem';
        const modeLabel = state.mode === 'clan' ? 'Klan' : 'Świat';
        const prefix = String(pingRole || '').trim();
        const contentStr = `${prefix ? `${prefix} ` : ''}👥 **Zbiórka graczy — ${range.min}–${range.max}**`;
        const mentionedRoles = Array.from(prefix.matchAll(/<@&(\d+)>/g), match => match[1]);
        const mentionEveryone = /@everyone|@here/.test(prefix);
        const payload = {
            content: contentStr,
            username: 'Sąsiad',
            avatar_url: 'https://samequizy.pl/wp-content/uploads/2019/02/filing_images_952825540c11-18.jpg',
            allowed_mentions: {
                parse: mentionEveryone ? ['everyone'] : [],
                roles: mentionedRoles
            },
            embeds: [{
                color: 0x7657f6,
                author: { name: 'MARGONEM  •  PRZEDZIAŁY ONLINE' },
                title: `✨ ${range.label || `Poziomy ${range.min}–${range.max}`}`,
                description: `**${players.length} ${players.length === 1 ? 'gracz' : 'graczy'} online** · ${modeLabel}`,
                fields: [
                    { name: '👥 Gracze online', value: playerStr, inline: false },
                    { name: '⚔️ Profesje', value: profStr, inline: true },
                    { name: '📊 Zakres poziomów', value: `**${range.min}–${range.max}**`, inline: true }
                ],
                footer: { text: `Zgłosił(a): ${myNick}  •  Heroes on Discord` },
                timestamp: new Date().toISOString()
            }]
        };

        const dedupeSignature = JSON.stringify({
            mode: state.mode, range: range.label, min: range.min, max: range.max,
            message: contentStr, players: playerStr, professions: profStr, author: myNick
        });
        if (typeof window.__heroesDiscordAllowConsecutiveMessage === 'function' &&
            !window.__heroesDiscordAllowConsecutiveMessage(url, dedupeSignature)) return;

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('[Przedziały Online] Discord Error:', err));
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            @keyframes mk-pulse-anim { 0% { transform: scale(1); opacity: 1; box-shadow: 0 0 5px currentColor; } 50% { transform: scale(1.25); opacity: 0.8; box-shadow: 0 0 15px currentColor; } 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 5px currentColor; } }
            #${PANEL_ID} { position: fixed; width: 290px; color: #f3f3ff; background: linear-gradient(180deg, rgba(34,18,65,0.96), rgba(12,8,28,0.96)); border: 2px solid rgba(144,123,255,0.24); box-shadow: 0 10px 24px rgba(0,0,0,0.42); border-radius: 8px; z-index: 500; font-family: Arial, sans-serif; user-select: none; backdrop-filter: blur(2px); transition: opacity 0.2s; box-sizing: border-box; }
            #${PANEL_ID} * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: rgba(144,123,255,0.5) rgba(0,0,0,0.2); }
            #${PANEL_ID} ::-webkit-scrollbar { width: 6px; height: 6px; }
            #${PANEL_ID} ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
            #${PANEL_ID} ::-webkit-scrollbar-thumb { background: rgba(144,123,255,0.5); border-radius: 4px; }
            #${PANEL_ID}.mk-mini { width: 34px !important; min-width: 34px !important; background: rgba(20,12,40,0.9); border-radius: 8px; }
            #${PANEL_ID} .mk-header { display: flex; align-items: center; gap: 6px; padding: 6px 7px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.07); cursor: move; }
            #${PANEL_ID}.mk-mini .mk-header { justify-content: center; padding: 8px 0; border: none; background: transparent; }
            .mk-panel-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px; }
            #${PANEL_ID}.mk-mini .mk-panel-dot { width: 14px; height: 14px; flex: 0 0 14px; cursor: pointer; transition: transform 0.1s; animation: mk-pulse-anim 1.8s infinite ease-in-out; }
            .mk-dot-red { background: #ff5a6b; color: rgba(255,90,107,0.8); }
            .mk-dot-yellow { background: #ffd34d; color: rgba(255,211,77,0.8); }
            .mk-dot-green { background: #52e37c; color: rgba(82,227,124,0.8); }

            #${PANEL_ID}.mk-mini .mk-tool-btn { display: none !important; }
            #${PANEL_ID}.mk-mini .mk-switch { display: none !important; }

            #${PANEL_ID} .mk-tool-btn { width: 18px; height: 18px; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer; font-size: 11px; line-height: 16px; text-align: center; padding: 0; transition: background 0.1s; display: flex; align-items: center; justify-content: center; }
            #${PANEL_ID} .mk-tool-btn:hover { background: rgba(255,255,255,0.2); }
            #${PANEL_ID} .mk-tool-btn.active { background: rgba(144,123,255,0.4); border-color: rgba(144,123,255,0.8); }

            #${PANEL_ID} .mk-switch { position: relative; display: inline-flex; width: 76px; height: 18px; margin: 0 2px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; cursor: pointer; align-items: center; justify-content: space-between; }
            #${PANEL_ID} .mk-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
            #${PANEL_ID} .mk-slider { position: absolute; top: 1px; left: 1px; width: 36px; height: 14px; background-color: rgba(144,123,255,0.6); border-radius: 3px; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
            #${PANEL_ID} .mk-switch input:checked + .mk-slider { transform: translateX(37px); }
            #${PANEL_ID} .mk-switch-text { z-index: 1; font-size: 9px; font-weight: bold; width: 50%; text-align: center; pointer-events: none; color: rgba(255,255,255,0.3); }
            #${PANEL_ID} .mk-switch input:not(:checked) ~ .mk-switch-clan { color: #fff; }
            #${PANEL_ID} .mk-switch input:checked ~ .mk-switch-world { color: #fff; }

            .mk-switch-mode { width: 104px !important; }
            .mk-switch-mode .mk-slider { width: 50px !important; background-color: #5865F2 !important; }
            .mk-switch-mode input:checked + .mk-slider { transform: translateX(51px) !important; background-color: #ff5a6b !important; }
            .mk-switch-mode input:not(:checked) ~ .mk-switch-z { color: #fff; }
            .mk-switch-mode input:checked ~ .mk-switch-s { color: #fff; }

            #${PANEL_ID} .mk-body { padding: 5px; }
            #${PANEL_ID} .mk-config { padding: 5px 8px 5px 5px; max-height: 420px; overflow-y: auto; overflow-x: hidden; }
            #${PANEL_ID}.mk-mini .mk-body, #${PANEL_ID}.mk-mini .mk-config, #${PANEL_ID}.mk-mini .mk-footer { display: none !important; }
            .mk-range { margin-bottom: 5px; border: 1px solid rgba(137,102,255,0.14); border-radius: 6px; background: rgba(255,255,255,0.02); }
            .mk-range-head { display: flex; align-items: center; gap: 6px; padding: 6px 7px; font-size: 13px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.035); }
            .mk-range-name { flex: 1; }
            .mk-count { color: #fff; margin-left: auto; }
            .mk-list { font-size: 12px; color: #c6d0ff; padding: 6px 9px 8px 21px; word-break: break-word; }
            .mk-player { cursor: pointer; color: #d9deff; }
            .mk-player:hover { color: #fff3a2; }
            .mk-self { color: #9fffb8; font-weight: bold; }
            .mk-empty { color: #9da4cb; }
            #${PANEL_ID} .mk-footer { position: relative; display: flex; justify-content: center; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.18); padding: 8px 10px; min-height: 28px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
            .mk-status-text { font-size: 11px; color: #c7c7d7; text-align: center; pointer-events: none; z-index: 1; }
            .mk-creator-box { position: absolute; right: 8px; bottom: 4px; display: flex; flex-direction: column; align-items: flex-end; cursor: help; line-height: 1.1; z-index: 2; }
            .mk-creator-prefix { font-size: 8px; color: #999; font-family: Arial, sans-serif; margin-bottom: 1px; }
            .mk-neon-sig { font-size: 12px; font-family: "Comic Sans MS", "Brush Script MT", cursive, sans-serif; font-weight: bold; font-style: italic; color: #fff; text-shadow: 0 0 2px #fff, 0 0 4px #bc13fe, 0 0 8px #bc13fe, 0 0 12px #bc13fe; opacity: 0.85; transition: opacity 0.2s; }
            .mk-tip { display: none; position: absolute; background: #171819; border: 1px solid #333c43; color: #a9b2ba; font-size: 12px; padding: 5px 10px; border-radius: 5px; z-index: 999999; pointer-events: none; }

            /* Konfigurator */
            .mk-config-row { display: flex; gap: 4px; margin-bottom: 5px; align-items: center; flex-wrap: nowrap; width: 100%; }
            .mk-config-input { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 3px; padding: 3px 5px; font-size: 11px; outline: none; box-sizing: border-box; }
            .mk-config-input:focus { border-color: rgba(144,123,255,0.6); }

            /* Ukrycie strzałek w inputach z levelem */
            input.mk-config-input[type=number]::-webkit-inner-spin-button,
            input.mk-config-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input.mk-config-input[type=number] { -moz-appearance: textfield; }

            .mk-config-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; border-radius: 3px; font-size: 11px; padding: 3px 8px; transition: background 0.1s; flex-shrink: 0; box-sizing: border-box; }
            .mk-config-btn:hover { background: rgba(255,255,255,0.2); }
            .mk-config-adv { background: rgba(0,0,0,0.2); padding: 5px; border-radius: 4px; margin-bottom: 8px; border-left: 2px solid #5865F2; width: 100%; display: none; box-sizing: border-box; }
            .mk-config-actions { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.05); }
        `;
        document.head.appendChild(style);
    }

    function createTip() { tipEl = document.createElement('div'); tipEl.className = 'mk-tip'; document.body.appendChild(tipEl); }
    function showTip(text, x, y) { if(!tipEl)return; tipEl.innerHTML = text; tipEl.style.left = `${x+10}px`; tipEl.style.top = `${y+10}px`; tipEl.style.display = 'block'; }
    function hideTip() { if(tipEl) tipEl.style.display = 'none'; }

    function createPanel() {
        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.left = state.left; panel.style.top = state.top; panel.style.opacity = OPACITY_OPTIONS[state.opacityIndex];
        panel.classList.toggle('mk-mini', state.collapsed);
        if (state.collapsed) panel.style.display = 'none';

        function clampPanelPosition(persist = false) {
            const rect = panel.getBoundingClientRect();
            const left = Math.min(Math.max(0, rect.left), Math.max(0, window.innerWidth - rect.width));
            const top = Math.min(Math.max(0, rect.top), Math.max(0, window.innerHeight - rect.height));
            panel.style.left = `${left}px`; panel.style.top = `${top}px`;
            if (persist) { state.left = panel.style.left; state.top = panel.style.top; saveState(); }
        }

        const header = document.createElement('div'); header.className = 'mk-header';
        miniDot = document.createElement('div'); miniDot.className = 'mk-panel-dot mk-dot-red'; miniDot.style.display = state.collapsed ? 'block' : 'none';
        const tabs = document.createElement('div'); tabs.className = 'mk-addon-tabs';
        rangesTab = document.createElement('button'); rangesTab.className = 'mk-tool-btn mk-addon-tab active'; rangesTab.textContent = 'Przedz.'; rangesTab.title = 'Przedziały Online';
        discordTab = document.createElement('button'); discordTab.className = 'mk-tool-btn mk-addon-tab'; discordTab.textContent = 'Discord'; discordTab.title = 'Heroes on Discord';
        tabs.append(rangesTab, discordTab);
        const spacerEl = document.createElement('div'); spacerEl.style.flex = '1'; spacerEl.style.height = '18px';

        modeSwitch = document.createElement('label'); modeSwitch.className = 'mk-switch';
        const modeCheckbox = document.createElement('input'); modeCheckbox.type = 'checkbox'; modeCheckbox.checked = state.mode === 'world';
        const modeSlider = document.createElement('span'); modeSlider.className = 'mk-slider';
        const modeTextKlan = document.createElement('span'); modeTextKlan.className = 'mk-switch-text mk-switch-clan'; modeTextKlan.textContent = 'KLAN';
        const modeTextWorld = document.createElement('span'); modeTextWorld.className = 'mk-switch-text mk-switch-world'; modeTextWorld.textContent = 'ŚWIAT';
        modeSwitch.append(modeCheckbox, modeSlider, modeTextKlan, modeTextWorld);

        modeCheckbox.addEventListener('change', (e) => {
            state.mode = e.target.checked ? 'world' : 'clan'; saveState();
            if (configMode) configBtn.click();
            currentPlayers = []; renderData(); statusEl.textContent = 'Ładowanie...'; triggerFetch();
        });

        configBtn = document.createElement('button'); configBtn.className = 'mk-tool-btn'; configBtn.textContent = '⚙';
        configBtn.onclick = () => {
            if (typeof window.__mkHubOpenRangesSettings === 'function') {
                window.__mkHubOpenRangesSettings();
                return;
            }
            configMode = !configMode; configBtn.classList.toggle('active', configMode);
            bodyWrapper.style.display = configMode ? 'none' : 'block';
            configWrapper.style.display = configMode ? 'block' : 'none';
            if (configMode) openConfig();
        };

        const opacityBtn = document.createElement('button'); opacityBtn.className = 'mk-tool-btn'; opacityBtn.textContent = 'O';
        opacityBtn.onclick = () => { state.opacityIndex = (state.opacityIndex + 1) % OPACITY_OPTIONS.length; saveState(); panel.style.opacity = OPACITY_OPTIONS[state.opacityIndex]; };

        const collapseBtn = document.createElement('button'); collapseBtn.className = 'mk-tool-btn mk-collapse-btn'; collapseBtn.textContent = '−';
        function toggleCollapse() {
            state.collapsed = !state.collapsed;
            saveState();
            panel.classList.remove('mk-mini');
            panel.style.display = state.collapsed ? 'none' : '';
            if (!state.collapsed) requestAnimationFrame(() => clampPanelPosition(true));
            if (state.collapsed && panel.classList.contains('mk-discord-view')) selectAddon('ranges');
            if (state.collapsed && configMode) configBtn.click();
            miniDot.style.display = 'none';
            tabs.style.display = state.collapsed ? 'none' : 'flex';
            spacerEl.style.display = state.collapsed ? 'none' : 'block';
            modeSwitch.style.display = state.collapsed || panel.classList.contains('mk-discord-view') ? 'none' : 'inline-flex';
            opacityBtn.style.display = state.collapsed ? 'none' : 'block';
            configBtn.style.display = state.collapsed || panel.classList.contains('mk-discord-view') ? 'none' : 'block';
            collapseBtn.style.display = state.collapsed ? 'none' : 'block';
        }
        collapseBtn.onclick = toggleCollapse;

        header.append(miniDot, tabs, spacerEl, modeSwitch, configBtn, opacityBtn, collapseBtn);

        // Zastosowanie początkowej widoczności na wypadek stanu collapsed ze startu
        miniDot.style.display = state.collapsed ? 'block' : 'none';
        tabs.style.display = state.collapsed ? 'none' : 'flex';
        spacerEl.style.display = state.collapsed ? 'none' : 'block';
        modeSwitch.style.display = state.collapsed ? 'none' : 'inline-flex';
        opacityBtn.style.display = state.collapsed ? 'none' : 'block';
        configBtn.style.display = state.collapsed ? 'none' : 'block';
        collapseBtn.style.display = state.collapsed ? 'none' : 'block';

        bodyWrapper = document.createElement('div'); bodyWrapper.className = 'mk-body';
        configWrapper = document.createElement('div'); configWrapper.className = 'mk-config'; configWrapper.style.display = 'none';
        addonSlot = document.createElement('div'); addonSlot.id = 'mk-discord-addon-slot'; addonSlot.className = 'mk-addon-slot';
        addonSlot.addEventListener('wheel', (event) => { event.stopPropagation(); }, { passive: true });

        // Blokada scrolla gry
        configWrapper.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: true });

        footerEl = document.createElement('div'); footerEl.className = 'mk-footer';
        statusEl = document.createElement('div'); statusEl.className = 'mk-status-text'; statusEl.textContent = 'Oczekiwanie...';
        const creatorBox = document.createElement('div'); creatorBox.className = 'mk-creator-box';
        const creatorPrefix = document.createElement('div'); creatorPrefix.className = 'mk-creator-prefix'; creatorPrefix.textContent = 'twórca:';
        const neonSig = document.createElement('div'); neonSig.className = 'mk-neon-sig'; neonSig.textContent = 'Dyktator';
        creatorBox.append(creatorPrefix, neonSig); footerEl.append(statusEl, creatorBox);
        creatorBox.onmouseenter = (e) => showTip('💬 Discord: Dyktator', e.pageX, e.pageY);
        creatorBox.onmouseleave = hideTip;

        function selectAddon(addon) {
            const showDiscord = addon === 'discord';
            rangesTab.classList.toggle('active', !showDiscord);
            discordTab.classList.toggle('active', showDiscord);
            modeSwitch.style.display = showDiscord || state.collapsed ? 'none' : 'inline-flex';
            configBtn.style.display = showDiscord || state.collapsed ? 'none' : 'block';
            panel.classList.toggle('mk-discord-view', showDiscord);
            addonSlot.style.display = showDiscord ? 'block' : 'none';
            requestAnimationFrame(() => clampPanelPosition(true));
            if (showDiscord) {
                configMode = false; configBtn.classList.remove('active');
                bodyWrapper.style.display = 'none'; configWrapper.style.display = 'none';
                if (!document.querySelector('.heroes-discord__setup--inline')) window.__heroesDiscordOpenSettings?.();
            } else {
                if (document.querySelector('.heroes-discord__setup')) window.__heroesDiscordCloseSettings?.(false);
                bodyWrapper.style.display = configMode ? 'none' : 'block';
                configWrapper.style.display = configMode ? 'block' : 'none';
            }
        }
        rangesTab.onclick = () => { selectAddon('ranges'); window.dispatchEvent(new Event('mk-online-ranges-request')); };
        discordTab.onclick = () => selectAddon('discord');
        window.addEventListener('heroes-discord:select-settings', () => selectAddon('discord'));
        window.addEventListener('heroes-discord:settings-closed', () => {
            if (panel.classList.contains('mk-discord-view')) selectAddon('ranges');
        });

        panel.append(header, bodyWrapper, configWrapper, addonSlot, footerEl);
        // Keep the legacy view detached; the manager reuses only its settings controls.
        window.__mkLegacyRangesPanel = panel;
        window.__heroesDiscordSelectSettings = () => selectAddon('discord');
        window.__heroesDiscordTogglePanel = function () {
            if (!panel) return;
            toggleCollapse();
        };

        let dragging = false, moved = false, startX, startY, startLeft, startTop;
        function movePanel(moveEvent) {
            if (!dragging) return;
            if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) moved = true;
            const left = Math.min(Math.max(0, startLeft + moveEvent.clientX - startX), Math.max(0, window.innerWidth - panel.offsetWidth));
            const top = Math.min(Math.max(0, startTop + moveEvent.clientY - startY), Math.max(0, window.innerHeight - panel.offsetHeight));
            panel.style.left = `${left}px`; panel.style.top = `${top}px`;
        }
        function stopPanelDrag(upEvent) {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('pointermove', movePanel);
            document.removeEventListener('pointerup', stopPanelDrag);
            document.removeEventListener('pointercancel', stopPanelDrag);
            state.left = panel.style.left; state.top = panel.style.top; saveState();
            if (!moved && state.collapsed && upEvent.target === miniDot) toggleCollapse();
        }
        header.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || event.target.closest('button,input,.mk-switch')) return;
            event.preventDefault();
            dragging = true; moved = false;
            const rect = panel.getBoundingClientRect();
            startX = event.clientX; startY = event.clientY; startLeft = rect.left; startTop = rect.top;
            document.addEventListener('pointermove', movePanel);
            document.addEventListener('pointerup', stopPanelDrag);
            document.addEventListener('pointercancel', stopPanelDrag);
        });
    }

    function openConfig() {
        configWrapper.innerHTML = '';
        let activeCfg = state.config[state.mode];
        let editingRanges = JSON.parse(JSON.stringify(activeCfg.customRanges));

        const configHeader = document.createElement('div');
        configHeader.innerHTML = `<div style="text-align:center; font-weight:bold; color:#907bff; margin-bottom:10px; font-size:12px;">--- Konfiguracja: ${state.mode === 'clan' ? 'KLAN' : 'ŚWIAT'} ---</div>`;
        configWrapper.appendChild(configHeader);

        const listEl = document.createElement('div');
        configWrapper.appendChild(listEl);

        function drawRows() {
            listEl.innerHTML = '';
            editingRanges.forEach((r, idx) => {
                const row = document.createElement('div'); row.className = 'mk-config-row';

                const nameInp = document.createElement('input'); nameInp.className = 'mk-config-input';
                nameInp.style.flex = '1 1 0%';
                nameInp.style.minWidth = '0';
                nameInp.value = r.label; nameInp.placeholder = 'Nazwa';
                nameInp.oninput = (e) => r.label = e.target.value;

                const minInp = document.createElement('input'); minInp.className = 'mk-config-input';
                minInp.style.width = '48px'; minInp.type = 'number'; minInp.value = r.min;
                minInp.oninput = (e) => r.min = parseInt(e.target.value) || 0;

                const maxInp = document.createElement('input'); maxInp.className = 'mk-config-input';
                maxInp.style.width = '48px'; maxInp.type = 'number'; maxInp.value = r.max;
                maxInp.oninput = (e) => r.max = parseInt(e.target.value) || 0;

                const advBtn = document.createElement('button'); advBtn.className = 'mk-config-btn'; advBtn.textContent = '⚙️'; advBtn.title = 'Ustawienia Discorda';
                advBtn.style.padding = '3px 4px';

                const delBtn = document.createElement('button'); delBtn.className = 'mk-config-btn'; delBtn.textContent = '✕';
                delBtn.style.padding = '3px 5px'; delBtn.style.background = 'rgba(255,50,50,0.15)'; delBtn.style.color = '#ff9999';
                delBtn.onclick = () => { editingRanges.splice(idx, 1); drawRows(); };

                row.append(nameInp, minInp, document.createTextNode('-'), maxInp, advBtn, delBtn);

                const advBox = document.createElement('div'); advBox.className = 'mk-config-adv';

                let clanOptionHtml = state.mode === 'world' ? `
                    <div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" class="mk-incl-chk" title="Pokazuj klanowiczy na tym przedziale" style="cursor:pointer;" ${r.includeClan ? 'checked' : ''}>
                        <span style="font-size:10px; color:#fff;">Pokaż klanowiczy (tylko ten przedział)</span>
                    </div>
                ` : '';

                let spamOpacity = r.spamMode ? '1' : '0.4';
                let spamDisabled = r.spamMode ? '' : 'disabled';
                let spamCursor = r.spamMode ? 'text' : 'not-allowed';

                advBox.innerHTML = `
                    ${clanOptionHtml}
                    <div style="margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                        <input type="checkbox" class="mk-wh-chk" title="Włącz wysyłanie webhooka na tym przedziale" style="cursor:pointer;" ${r.webhookEnabled ? 'checked' : ''}>
                        <span style="font-size:10px; color:#fff;">ON/OFF</span>
                        <input type="text" class="mk-config-input mk-wh" placeholder="Webhook URL" style="flex:1; margin-left:4px;" value="${r.webhook || ''}">
                    </div>
                    <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                        <input type="text" class="mk-config-input mk-ping" placeholder="Ping np. @everyone" style="flex:1;" value="${r.ping || ''}">
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <label class="mk-switch mk-switch-mode" style="height:18px;">
                            <input type="checkbox" class="mk-mode-chk" ${r.spamMode ? 'checked' : ''}>
                            <span class="mk-slider"></span>
                            <span class="mk-switch-text mk-switch-z">ZIELONA</span>
                            <span class="mk-switch-text mk-switch-s">SPAM</span>
                        </label>
                        <span style="font-size:10px; color:#aaa; margin-left:2px;">Co:</span>
                        <input type="number" class="mk-config-input mk-int" placeholder="Min" title="Dostępne po przełączeniu na SPAM" style="width:40px; transition:0.2s; opacity:${spamOpacity}; cursor:${spamCursor};" value="${r.interval || 0}" ${spamDisabled}>
                        <span style="font-size:10px; color:#aaa;">min</span>
                    </div>
                `;

                advBtn.onclick = () => { advBox.style.display = advBox.style.display === 'block' ? 'none' : 'block'; };

                const intInp = advBox.querySelector('.mk-int');
                advBox.querySelector('.mk-wh-chk').onchange = (e) => r.webhookEnabled = e.target.checked;
                advBox.querySelector('.mk-wh').oninput = (e) => r.webhook = e.target.value;
                advBox.querySelector('.mk-ping').oninput = (e) => r.ping = e.target.value;
                advBox.querySelector('.mk-mode-chk').onchange = (e) => {
                    r.spamMode = e.target.checked;
                    intInp.disabled = !r.spamMode;
                    intInp.style.opacity = r.spamMode ? '1' : '0.4';
                    intInp.style.cursor = r.spamMode ? 'text' : 'not-allowed';
                };
                intInp.oninput = (e) => r.interval = parseInt(e.target.value) || 0;
                if (state.mode === 'world') advBox.querySelector('.mk-incl-chk').onchange = (e) => r.includeClan = e.target.checked;

                listEl.appendChild(row);
                listEl.appendChild(advBox);
            });
        }
        drawRows();

        const addBtnRow = document.createElement('div');
        addBtnRow.style.marginTop = '5px';
        addBtnRow.style.marginBottom = '10px';
        const addBtn = document.createElement('button'); addBtn.className = 'mk-config-btn'; addBtn.textContent = '+ Dodaj przedział';
        addBtn.style.width = '100%';
        addBtn.onclick = () => { editingRanges.push({ id: 'r_' + Date.now(), label: 'Nowy', min: 100, max: 200, webhookEnabled: false, webhook: '', ping: '', spamMode: false, interval: 0, includeClan: false }); drawRows(); };
        addBtnRow.appendChild(addBtn);
        configWrapper.appendChild(addBtnRow);

        const dotSection = document.createElement('div');
        dotSection.style.marginTop = '8px'; dotSection.style.borderTop = '1px solid rgba(255,255,255,0.1)'; dotSection.style.paddingTop = '8px';

        dotSection.innerHTML = `
            <div style="font-size:10px; margin-bottom:6px; color:#aaa; font-weight:bold;">Globalne (np. 0-6):</div>
            <div class="mk-config-row" id="mk-red-row"><span style="color:#ff5a6b; font-size:11px; flex:1;">🔴 Czerwona:</span></div>
            <div class="mk-config-row" id="mk-yellow-row"><span style="color:#ffd34d; font-size:11px; flex:1;">🟡 Żółta:</span></div>
            <div class="mk-config-row" id="mk-green-row"><span style="color:#52e37c; font-size:11px; flex:1;">🟢 Zielona:</span></div>
            <div class="mk-config-row" style="padding-left:10px;" id="mk-msg-toggle-row"><span style="color:#52e37c; font-size:10px; flex:1;">↳ Komunikat w grze:</span></div>
            <div class="mk-config-row" style="padding-left:10px; margin-bottom:6px;" id="mk-template-row"></div>
        `;

        const redInp = document.createElement('input'); redInp.className = 'mk-config-input'; redInp.style.width = '55px'; redInp.value = activeCfg.dotRedRange; redInp.placeholder = '0-6';
        const yellowInp = document.createElement('input'); yellowInp.className = 'mk-config-input'; yellowInp.style.width = '55px'; yellowInp.value = activeCfg.dotYellowRange; yellowInp.placeholder = '7-9';
        const greenInp = document.createElement('input'); greenInp.className = 'mk-config-input'; greenInp.style.width = '55px'; greenInp.value = activeCfg.dotGreenRange; greenInp.placeholder = '10-99';

        const toggleInp = document.createElement('input'); toggleInp.type = 'checkbox'; toggleInp.checked = activeCfg.msgEnabled;
        const templateInp = document.createElement('input'); templateInp.className = 'mk-config-input'; templateInp.style.width = '100%'; templateInp.value = activeCfg.msgTemplate;

        dotSection.querySelector('#mk-red-row').appendChild(redInp);
        dotSection.querySelector('#mk-yellow-row').appendChild(yellowInp);
        dotSection.querySelector('#mk-green-row').appendChild(greenInp);
        dotSection.querySelector('#mk-msg-toggle-row').appendChild(toggleInp);
        dotSection.querySelector('#mk-template-row').appendChild(templateInp);

        const actions = document.createElement('div'); actions.className = 'mk-config-actions';
        const saveBtn = document.createElement('button'); saveBtn.className = 'mk-config-btn'; saveBtn.textContent = 'Zapisz'; saveBtn.style.width = '100%';
        saveBtn.onclick = () => {
            activeCfg.customRanges = editingRanges;
            activeCfg.dotRedRange = redInp.value || '0-6'; activeCfg.dotYellowRange = yellowInp.value || '7-9'; activeCfg.dotGreenRange = greenInp.value || '10-99';
            activeCfg.msgEnabled = toggleInp.checked; activeCfg.msgTemplate = templateInp.value;
            saveState();
            if (window.__mkHubRangesConfigIsMounted?.()) {
                openConfig();
                configWrapper.style.display = 'block';
            } else {
                configMode = false;
                configBtn.classList.remove('active');
                bodyWrapper.style.display = 'block';
                configWrapper.style.display = 'none';
            }
            renderData();
        };
        actions.append(saveBtn);

        configWrapper.appendChild(dotSection); configWrapper.appendChild(actions);
    }

    // The manager hosts the existing configuration controls so their original handlers remain intact.
    window.__mkHubMountRangesConfig = host => {
        if (!panel || !host) return false;
        if (!configMode) {
            configMode = true;
            configBtn.classList.add('active');
            bodyWrapper.style.display = 'none';
            configWrapper.style.display = 'block';
            openConfig();
        }
        host.appendChild(configWrapper);
        configWrapper.style.display = 'block';
        return true;
    };
    window.__mkHubUnmountRangesConfig = () => {
        if (!panel || !configWrapper) return;
        if (configMode) {
            configMode = false;
            configBtn.classList.remove('active');
            bodyWrapper.style.display = 'block';
            configWrapper.style.display = 'none';
        }
        if (configWrapper.parentElement !== panel) panel.appendChild(configWrapper);
    };
    window.__mkHubRangesConfigIsMounted = () => !!configWrapper && !!configWrapper.closest('#mk-hub');

    function startMessage(nick) { const input = document.querySelector('.chat-tpl input'); if (input) { input.value = `@${nick.replace(/ /g, '_')} `; input.focus(); } }

    function parseClanMembers(flatArray) {
        const players = [];
        for (let i = 0; i < flatArray.length; i += 11) {
            const row = flatArray.slice(i, i + 11);
            if (row.length < 11) continue;
            players.push({ nick: row[1], level: Number(row[2]), prof: row[4], map: row[5], x: Number(row[6]), y: Number(row[7]), status: Number(row[9]) });
        }
        return players;
    }

    function renderData() {
        if (!isOnlineRangesEnabled()) { if (panel) panel.style.display = 'none'; return; }
        if (panel) panel.style.display = state.collapsed ? 'none' : '';
        const myNick = window.Engine?.hero?.d?.nick;
        let baseOnlinePlayers = currentPlayers.filter(p => p.status === 0 && p.nick !== myNick);
        let activeCfg = state.config[state.mode];

        let maxColorVal = 0, totalInRange = 0;
        bodyWrapper.innerHTML = '';
        let now = Date.now();

        activeCfg.customRanges.forEach(range => {
            let rangePlayers = baseOnlinePlayers;

            if (state.mode === 'world' && !range.includeClan) {
                rangePlayers = rangePlayers.filter(p => !globalClanNicks.has(p.nick));
            }

            const inRange = rangePlayers.filter(p => p.level >= range.min && p.level <= range.max).sort((a, b) => a.level - b.level);
            totalInRange += inRange.length;

            const isCol = state.rangeCollapsed[state.mode][range.id];
            const colorVal = getDotColorValue(inRange.length, activeCfg);
            if (colorVal > maxColorVal) maxColorVal = colorVal;

            let prevColor = previousDotColors[state.mode][range.id];

            // Komunikaty natywne (Gra)
            if (prevColor !== undefined && prevColor !== 2 && colorVal === 2) {
                if (activeCfg.msgEnabled) showBigMessage(activeCfg.msgTemplate.replace('{przedzial}', range.label));
            }

            // Webhook System
            if (range.webhookEnabled && range.webhook && range.webhook.trim() !== '') {
                if (!range.spamMode) {
                    if (prevColor !== undefined && prevColor !== 2 && colorVal === 2) {
                        sendDiscordEmbed(range, inRange, range.webhook, range.ping);
                    }
                } else {
                    let intMs = (range.interval || 0) * 60000;
                    if (intMs > 0) {
                        if (!lastAutoSend[state.mode][range.id]) lastAutoSend[state.mode][range.id] = now;
                        if (now - lastAutoSend[state.mode][range.id] >= intMs) {
                            if (inRange.length > 0) {
                                sendDiscordEmbed(range, inRange, range.webhook, range.ping);
                            }
                            lastAutoSend[state.mode][range.id] = now;
                        }
                    }
                }
            }

            previousDotColors[state.mode][range.id] = colorVal;

            const block = document.createElement('div'); block.className = 'mk-range';
            const head = document.createElement('div'); head.className = 'mk-range-head';
            const dot = document.createElement('div'); dot.className = 'mk-panel-dot ' + getDotClass(colorVal);
            const name = document.createElement('span'); name.className = 'mk-range-name'; name.textContent = range.label;
            const count = document.createElement('span'); count.className = 'mk-count'; count.textContent = inRange.length;
            const toggle = document.createElement('button'); toggle.className = 'mk-tool-btn'; toggle.textContent = isCol ? '+' : '−';
            toggle.onclick = () => { state.rangeCollapsed[state.mode][range.id] = !isCol; saveState(); renderData(); };

            head.append(dot, name, count, toggle); block.appendChild(head);

            if (!isCol) {
                const list = document.createElement('div'); list.className = 'mk-list';
                if (inRange.length === 0) list.innerHTML = '<span class="mk-empty">brak</span>';
                else {
                    inRange.forEach((p, i) => {
                        const span = document.createElement('span'); span.className = 'mk-player';
                        span.textContent = `${p.nick} (${p.level}${p.prof})`;
                        const tipText = state.mode === 'world' ? 'Brak danych' : `${p.map} (${p.x}, ${p.y})`;
                        span.onmouseenter = (e) => showTip(tipText, e.pageX, e.pageY); span.onmouseleave = hideTip;
                        span.onclick = () => startMessage(p.nick);
                        list.appendChild(span); if (i < inRange.length - 1) list.appendChild(document.createTextNode(', '));
                    });
                }
                block.appendChild(list);
            }
            bodyWrapper.appendChild(block);
        });
        miniDot.className = 'mk-panel-dot ' + getDotClass(maxColorVal);
        statusEl.textContent = state.mode === 'world' ? `Świat (online): ${baseOnlinePlayers.length}` : `Klan (online): ${baseOnlinePlayers.length}`;
    }

    async function fetchWorldData() {
        try {
            const worldName = window.location.hostname.split('.')[0];
            const response = await fetch(`https://public-api.margonem.com/info/online/${worldName}.json`);
            if (!response.ok) throw new Error('Błąd');
            currentPlayers = (await response.json()).map(p => ({ nick: p.n, level: Number(p.l), prof: p.p, map: 'Świat', x: 0, y: 0, status: 0 }));
            renderData();
        } catch (e) { statusEl.textContent = "Błąd API świata"; }
    }

    function fetchClanData() {
        if (!window._g) return;
        if (!window.Engine?.hero?.d?.clan || window.Engine.hero.d.clan === "0" || window.Engine.hero.d.clan === 0) {
            if (state.mode === 'clan') statusEl.textContent = "Postać nie ma klanu.";
            globalClanNicks = new Set(); return;
        }
        backgroundRequestUntil = Date.now() + 1500; window._g('clan&a=members');
    }

    function hookCommunication() {
        if (!window.Engine?.communication) return false;
        const originalSuccess = window.Engine.communication.successData;
        window.Engine.communication.successData = function (...args) {
            try {
                if (args[0] && typeof args[0] === 'string') {
                    let packetModified = false, data = null;
                    if (Date.now() < backgroundRequestUntil || args[0].includes('"members"') || args[0].includes('"clan"')) {
                        try { data = JSON.parse(args[0]); } catch(e) {}
                    }
                    if (data) {
                        if (data.members) {
                            const parsedClan = parseClanMembers(data.members);
                            globalClanNicks = new Set(parsedClan.map(p => p.nick));
                            if (state.mode === 'clan') { currentPlayers = parsedClan; renderData(); }
                            else if (state.mode === 'world') renderData();
                        }
                        if (Date.now() < backgroundRequestUntil) {
                            if (data.members) { delete data.members; packetModified = true; }
                            if (data.clan) { delete data.clan; packetModified = true; }
                            if (data.w?.clan) { delete data.w.clan; packetModified = true; }
                            if (data.w?.clan_members) { delete data.w.clan_members; packetModified = true; }
                            if (data.e) {
                                if (Array.isArray(data.e)) {
                                    let oldL = data.e.length; data.e = data.e.filter(err => !String(err).toLowerCase().includes('klan'));
                                    if (data.e.length !== oldL) packetModified = true;
                                    if (data.e.length === 0) delete data.e;
                                } else if (typeof data.e === 'string' && data.e.toLowerCase().includes('klan')) { delete data.e; packetModified = true; }
                            }
                        }
                        if (packetModified) args[0] = JSON.stringify(data);
                    }
                }
            } catch (e) {}
            return originalSuccess.apply(this, args);
        };
        return true;
    }

    function triggerFetch() { if (!isOnlineRangesEnabled() || state.collapsed || panel?.classList.contains('mk-discord-view')) return; fetchClanData(); if (state.mode === 'world') fetchWorldData(); }
    window.addEventListener('mk-online-ranges-request', triggerFetch);
    window.addEventListener('mk-online-ranges-toggle', event => {
        if (panel) panel.style.display = event.detail?.enabled && !state.collapsed ? '' : 'none';

    });

    function init() {
        if (!window.Engine?.allInit) return setTimeout(init, 500);
        loadState();
        // Zawsze zaczynaj schowany pod ikonką Discorda po wejściu do gry / przelogowaniu.
        state.collapsed = true;
        saveState();
        injectStyle(); injectModernStyle(); createTip(); createPanel();
        if (panel) panel.style.display = 'none';
        hookCommunication();
    }

    init();
})();


// === Panel łupu przy czacie oraz ustawienia w zakładce dodatku ===
(() => {
  'use strict';
  const PANEL_ID = 'mk-clan-ranges-panel';
  const CHAT_PANEL_ID = 'mk-titan-loot-chat-panel';
  const TAB_ID = 'mk-titan-loot-tab';
  const SETTINGS_ID = 'mk-titan-loot-settings';
  const THEME_TAB_ID = 'mk-addon-theme-tab';
  const THEME_SETTINGS_ID = 'mk-addon-theme-settings';
  const NOTIFIER_TAB_ID = 'mk-addon-notifier-tab';
  const NOTIFIER_SETTINGS_ID = 'mk-addon-notifier-settings';
  const EVENT_TAB_ID = 'mk-addon-event-tab';
  const EVENT_SETTINGS_ID = 'mk-addon-event-settings';
  const ENABLED_KEY = 'mkTitanLootEnabled_v2';
  const COLLAPSED_KEY = 'mkTitanLootCollapsed';
  const SELECTED_KEY = 'mkTitanLootSelected:';
  const THEME_KEY = 'mkAddonThemeColor';
  const BACKGROUND_KEY = 'mkAddonBackgroundPreset';
  const TOGGLE_SHORTCUT_KEY = 'mkAddonToggleShortcut';
  const LANGUAGE_KEY = 'mkAddonLanguage';
  const COLOSSUS_PROMPT_ENABLED_KEY = 'mkColossusGroupPromptEnabled';
  const BACKGROUND_PRESETS={midnight:{label:'Nocny fiolet',value:'radial-gradient(ellipse at 12% 0%,rgba(99,102,241,.26),transparent 52%),linear-gradient(155deg,#20223e 0%,#17182f 48%,#0b1020 100%)'},aurora:{label:'Zorza polarna',value:'radial-gradient(ellipse at 8% 0%,rgba(45,212,191,.27),transparent 48%),radial-gradient(ellipse at 95% 18%,rgba(129,140,248,.24),transparent 45%),linear-gradient(155deg,#142b38 0%,#182239 52%,#0b1020 100%)'},ocean:{label:'Głęboki ocean',value:'radial-gradient(ellipse at 92% 0%,rgba(14,165,233,.27),transparent 50%),linear-gradient(155deg,#102d49 0%,#12243a 50%,#091522 100%)'},emerald:{label:'Szmaragd',value:'radial-gradient(ellipse at 10% 0%,rgba(16,185,129,.25),transparent 50%),linear-gradient(155deg,#12372f 0%,#172c30 50%,#0b171d 100%)'},sunset:{label:'Zachód słońca',value:'radial-gradient(ellipse at 92% 0%,rgba(244,114,182,.22),transparent 48%),radial-gradient(ellipse at 10% 100%,rgba(249,115,22,.2),transparent 50%),linear-gradient(155deg,#3b2340 0%,#282039 52%,#121323 100%)'}};
  const CHAT_SELECTORS = ['#chatIn','#chat-input','#chatInput','.chat-tpl .input-wrapper input','.chat-tpl .input-wrapper textarea','.chat-tpl input','.chat-tpl textarea',"[data-section='chat'] .input-wrapper input","[data-section='chat'] textarea",'.chat input','.chat textarea','#chat input','#chat textarea','input[placeholder*="chat" i]','textarea[placeholder*="chat" i]'];
  const isLootlogDocument=doc=>{try{return /(^|\.)lootlog\.pl$/i.test(doc.defaultView?.location?.hostname||'')}catch(error){return true}};
  const isLootlogElement=el=>{
    if(!el||el.nodeType!==1)return false;
    if(isLootlogDocument(el.ownerDocument))return true;
    for(let node=el;node&&node.nodeType===1;node=node.parentElement){const signature=`${node.id||''} ${typeof node.className==='string'?node.className:''} ${node.getAttribute?.('data-source')||''}`.toLowerCase().replace(/[^a-z0-9]/g,'');if(signature.includes('lootlog'))return true}
    return false;
  };
    const TITAN_LOOT = [
    { id: 'orlica', name: 'Dziewicza Orlica', mapId: 1800, map: 'Glimmering Cave', items: [
      { id: 32657, name: 'Korona z ptasiego pierza', type: 'Hełm', icon: 'hel/helm788.gif', label: 'Czapka m' },
      { id: 32658, name: 'Przesłona złotych skrzydeł', type: 'Hełm', icon: 'hel/helm786.gif', label: 'Czapka p/w' },
      { id: 45976, name: 'Czerep powietrznej dominacji', type: 'Hełm', icon: 'hel/helm787.gif', label: 'Czapka b/h/t' },
      { id: 43959, name: 'Złote Pisklę', type: 'Pierścień', icon: 'pie/pierscien890.gif', label: 'Pierek p/w' },
      { id: 43960, name: 'Bursztynowy sygnet harpii', type: 'Pierścień', icon: 'pie/pierscien889.gif', label: 'Pierek b/h' },
      { id: 43961, name: 'Błyskotka z Ventum Avem', type: 'Pierścień', icon: 'pie/pierscien891.gif', label: 'Pierek m/t' },
      { id: 6069, name: 'Klejnot północnego sztormu', type: 'Naszyjnik', icon: 'nas/harpiat_amulet3.gif', label: 'Naszyj' },
    ] },
    { id: 'krolik', name: 'Zabójczy Królik', mapId: 1745, map: "Caerbannog Cave - Beast's Lair", items: [
      { id: 12094, name: 'Bambosze z Zabójczego Królika', type: 'Buty', icon: 'but/kbunny_buty2.gif', label: 'Buty' },
      { id: 47104, name: 'Para zabójczych zębów', type: 'Pierścień', icon: 'pie/pierscien885.gif', label: 'Pierek w' },
      { id: 47105, name: 'Sygnet króliczej przemiany', type: 'Pierścień', icon: 'pie/pierscien883.gif', label: 'Pierek b/h/t' },
      { id: 47106, name: 'Puszysty ogonek', type: 'Pierścień', icon: 'pie/pierscien884.gif', label: 'Pierek m/p' },
      { id: 44042, name: 'Przemoc właściwa systemowi', type: 'Neutralne', icon: 'sur/krolik_craft_01.gif', label: 'Pomka b/m' },
      { id: 44043, name: 'Końskie kokosy', type: 'Neutralne', icon: 'sur/krolik_craft_03.gif', label: 'Tarcza p/w' },
      { id: 44044, name: 'Para morderczych uszu', type: 'Neutralne', icon: 'sur/krolik_craft_02.gif', label: 'Strzały h/t' },
    ] },
    { id: 'baulus', name: 'Renegat Baulus', mapId: 6950, map: 'Bandit Camp - Treasury', items: [
      { id: 50263, name: 'Obuwie władcy olbrzymów', type: 'Buty', icon: 'but/buty982.gif', label: 'Buty' },
      { id: 44177, name: 'Symbol zakazanej miłości', type: 'Naszyjnik', icon: 'nas/naszyjnik978.gif', label: 'Naszyj b/w' },
      { id: 44178, name: 'Wyrok boskiego sądu', type: 'Naszyjnik', icon: 'nas/naszyjnik977.gif', label: 'Naszyj m/p/t' },
      { id: 44179, name: 'Skurczona czaszka olbrzyma', type: 'Naszyjnik', icon: 'nas/naszyjnik979.gif', label: 'Naszyj h' },
      { id: 44172, name: 'Metalowa powieka Anariel', type: 'Neutralne', icon: 'sur/renegat_craft_03.gif', label: 'Tarcza p/w' },
      { id: 44173, name: 'Zawiniątko z ery bogów', type: 'Neutralne', icon: 'sur/renegat_craft_01.gif', label: 'Pomka b/t' },
      { id: 44174, name: 'Niezniszczalne łańcuchy', type: 'Neutralne', icon: 'sur/renegat_craft_02.gif', label: 'Pomka m/h' },
    ] },
    { id: 'arcymag', name: 'Piekielny Arcymag', mapId: 7061, map: 'Politraki Volcano - Infernal Depths', items: [
      { id: 44228, name: 'Czerep toczącej się lawy', type: 'Hełm', icon: 'hel/helm972.gif', label: 'Czapka b/h/t' },
      { id: 44229, name: 'Kaptur ognia piekielnego', type: 'Hełm', icon: 'hel/helm974.gif', label: 'Czapka m' },
      { id: 44230, name: 'Kask władcy feniksów', type: 'Hełm', icon: 'hel/helm973.gif', label: 'Czapka p/w' },
      { id: 6013, name: 'Krok gniewnych erupcji', type: 'Buty', icon: 'but/buty1002.gif', label: 'Buty' },
      { id: 27965, name: 'Magmowa pieczęć kreatora', type: 'Naszyjnik', icon: 'nas/naszyjnik1014.gif', label: 'Naszyj m/p/t' },
      { id: 51505, name: 'Kolczatka więźnia wulkanu', type: 'Naszyjnik', icon: 'nas/naszyjnik1013.gif', label: 'Naszyj b/h' },
      { id: 51506, name: 'Pięć kryształów mocy', type: 'Naszyjnik', icon: 'nas/naszyjnik1015.gif', label: 'Naszyj w' },
    ] },
    { id: 'versus', name: 'Versus Zoons', mapId: 7478, map: "Evil Goblins' Lair - Workshop", items: [
      { id: 55090, name: 'Spalinowy kask goblina', type: 'Hełm', icon: 'hel/helm1342.gif', label: 'Czapka b/w' },
      { id: 55091, name: 'Maska z systemem chłodzenia', type: 'Hełm', icon: 'hel/helm1343.gif', label: 'Czapka m/p' },
      { id: 55092, name: 'Hełm antyiperytowy', type: 'Hełm', icon: 'hel/helm1344.gif', label: 'Czapka h/t' },
      { id: 55087, name: 'Ciężkie zawieszenie maszyny', type: 'Buty', icon: 'but/buty1182.gif', label: 'Buty p/w' },
      { id: 55088, name: 'Proteza gładkolufowa', type: 'Buty', icon: 'but/buty1183.gif', label: 'Buty b/h' },
      { id: 55089, name: 'Mobilne agregatory prądotwórcze', type: 'Buty', icon: 'but/buty1181.gif', label: 'Buty m/t' },
      { id: 6595, name: 'Minutowy zapalnik bombowy', type: 'Naszyjnik', icon: 'nas/naszyjnik1226.gif', label: 'Naszyj' },
    ] },
    { id: 'lowczyni', name: 'Łowczyni Wspomnień', mapId: 6058, map: 'Source of Memories', items: [
      { id: 28878, name: 'Pamięć śnieżnych władców', type: 'Buty', icon: 'but/buty730.gif', label: 'Buty m/p' },
      { id: 28879, name: 'Krwawe echo wojny', type: 'Buty', icon: 'but/buty728.gif', label: 'Buty b/h/t' },
      { id: 28880, name: 'Wspomnienie starożytnych', type: 'Buty', icon: 'but/buty729.gif', label: 'Buty w' },
      { id: 42217, name: 'Atrybut pani wspomnień', type: 'Rękawice', icon: 'rek/rekawice804.gif', label: 'Łapy p/w' },
      { id: 44304, name: 'Kajdany zapomnienia', type: 'Rękawice', icon: 'rek/rekawice811.gif', label: 'Łapy b/h' },
      { id: 44306, name: 'Palce przeszłości', type: 'Rękawice', icon: 'rek/rekawice810.gif', label: 'Łapy m/t' },
      { id: 6038, name: 'Uwięziona świadomość półolbrzymki', type: 'Naszyjnik', icon: 'nas/naszyjnik735.gif', label: 'Naszyj' },
    ] },
    { id: 'przyzywacz', name: 'Przyzywacz Demonów', mapId: 5947, map: 'Chamber of Blood Rituals', items: [
      { id: 29059, name: 'Czarna maska bachanalii', type: 'Hełm', icon: 'hel/helm586.gif', label: 'Czapka m' },
      { id: 29060, name: 'Demoniczne tabernakulum', type: 'Hełm', icon: 'hel/helm587.gif', label: 'Czapka b/h/t' },
      { id: 29061, name: 'Klatka niezwykłej rozkoszy', type: 'Hełm', icon: 'hel/helm585.gif', label: 'Czapka p/w' },
      { id: 44562, name: 'Symbol demonicznego oddania', type: 'Pierścień', icon: 'pie/pierscien810.gif', label: 'Pierek' },
      { id: 44258, name: 'Serce Thinkusa', type: 'Naszyjnik', icon: 'nas/naszyjnik1268.gif', label: 'Naszyj m' },
      { id: 44259, name: 'Dwulicowość Bestii', type: 'Naszyjnik', icon: 'nas/naszyjnik1267.gif', label: 'Naszyj p/t' },
      { id: 44257, name: 'Więzienie Demonów', type: 'Naszyjnik', icon: 'nas/naszyjnik1269.gif', label: 'Naszyj t/h/w' },
    ] },
    { id: 'maddok', name: 'Maddok Magua', mapId: 7849, map: 'Lizard Nightmares Den - Source', items: [
      { id: 47175, name: 'Obuwie jedności z naturą', type: 'Buty', icon: 'but/buty1346.gif', label: 'Buty p/w' },
      { id: 47176, name: 'Krok torfowego dywanu', type: 'Buty', icon: 'but/buty1344.gif', label: 'Buty b/h' },
      { id: 47177, name: 'Trzcinowe pantofle Maddoka', type: 'Buty', icon: 'but/buty1345.gif', label: 'Buty m/t' },
      { id: 7522, name: 'Oczeretowe pazury Maddoka', type: 'Rękawice', icon: 'rek/rekawice1360.gif', label: 'Łapy' },
      { id: 47171, name: 'Kłącza i wodorosty', type: 'Naszyjnik', icon: 'nas/naszyjnik1321.gif', label: 'Naszyj m/p' },
      { id: 47172, name: 'Amulet bagiennych rybaków', type: 'Naszyjnik', icon: 'nas/naszyjnik1322.gif', label: 'Naszyj w' },
      { id: 47173, name: 'Oko aligatora', type: 'Naszyjnik', icon: 'nas/naszyjnik1320.gif', label: 'Naszyj b/h/t' },
    ] },
    { id: 'tezcatlipoca', name: 'Tezcatlipoca', mapId: 5710, map: 'Teotihuacan', items: [
      { id: 44659, name: 'Boska korona Tezcatlipoki', type: 'Hełm', icon: 'hel/helm728.gif', label: 'Czapka' },
      { id: 30777, name: 'Szpony pożeracza serc', type: 'Rękawice', icon: 'rek/rekawice472.gif', label: 'Łapy m' },
      { id: 30778, name: 'Łapy boskiego jaguara', type: 'Rękawice', icon: 'rek/rekawice473.gif', label: 'Łapy b/h/t' },
      { id: 30779, name: 'Pazury Tzayanatl', type: 'Rękawice', icon: 'rek/rekawice471.gif', label: 'Łapy p/w' },
      { id: 12059, name: 'Kościany sygnet szamana', type: 'Pierścień', icon: 'pie/maho_pier03.gif', label: 'Pierek b/h' },
      { id: 12060, name: 'Szmaragdowe serce demona', type: 'Pierścień', icon: 'pie/maho_pier01.gif', label: 'Pierek p/w' },
      { id: 12061, name: 'Lodowe oko bogów', type: 'Pierścień', icon: 'pie/maho_pier02.gif', label: 'Pierek m/t' },
    ] },
    { id: 'barbatos', name: 'Barbatos Smoczy Strażnik', mapId: 3313, map: 'Hall of the Ruined Temple', items: [
      { id: 45438, name: 'Stalowe podeszwy Hebrehotha', type: 'Buty', icon: 'but/buty835.gif', label: 'Buty p/w' },
      { id: 45439, name: 'Piaskowe szpony smoka', type: 'Buty', icon: 'but/buty837.gif', label: 'Buty m' },
      { id: 45440, name: 'Parszywe obuwie świętokradcy', type: 'Buty', icon: 'but/buty836.gif', label: 'Buty b/h/t' },
      { id: 45441, name: 'Perła Pustyni', type: 'Pierścień', icon: 'pie/pierscien848.gif', label: 'Pierek' },
      { id: 45442, name: 'Medalion gadziej mutacji', type: 'Naszyjnik', icon: 'nas/naszyjnik824.gif', label: 'Naszyj w' },
      { id: 45443, name: 'Kolia smoczego kapłana', type: 'Naszyjnik', icon: 'nas/naszyjnik823.gif', label: 'Naszyj m/p' },
      { id: 45444, name: 'Ognista pieczęć Barbatosa', type: 'Naszyjnik', icon: 'nas/naszyjnik822.gif', label: 'Naszyj b/h/t' },
    ] },
    { id: 'tanroth', name: 'Tanroth', mapId: 2758, map: 'Ice Throne Room', items: [
      { id: 45482, name: 'Czarna stal Tanrotha', type: 'Hełm', icon: 'hel/helm771.gif', label: 'Czapka p/w' },
      { id: 45483, name: 'Kaptur szronowych miraży', type: 'Hełm', icon: 'hel/helm769.gif', label: 'Czapka m/t' },
      { id: 45484, name: 'Kask mroźnego nieboskłonu', type: 'Hełm', icon: 'hel/helm770.gif', label: 'Czapka b/h' },
      { id: 45485, name: 'Chwyt głębokiej martwicy', type: 'Rękawice', icon: 'rek/rekawice848.gif', label: 'Łapy b/w' },
      { id: 45486, name: 'Dłonie śnieżnych lawin', type: 'Rękawice', icon: 'rek/rekawice846.gif', label: 'Łapy m/p' },
      { id: 45487, name: 'Dotyk nagłej krystalizacji', type: 'Rękawice', icon: 'rek/rekawice847.gif', label: 'Łapy h/t' },
      { id: 45488, name: 'Artefakt minionej ery', type: 'Naszyjnik', icon: 'nas/naszyjnik836.gif', label: 'Naszyj' },
    ] },
  ];

  const MAP_ALIASES = {
    orlica:['migotliwa pieczara','glimmering cave'], krolik:['grota caerbannoga - leże bestii','caerbannog cave - beast','caerbannog cave'],
    baulus:['bandyckie chowisko - skarbiec','bandit camp - treasury'], arcymag:['wulkan politraki - piekielne czeluście','politraki volcano - infernal depths'],
    versus:['lokum złych goblinów - pracownia',"evil goblins' lair - workshop"], lowczyni:['źródło wspomnień','source of memories'],
    przyzywacz:['komnata krwawych obrzędów','chamber of blood rituals'], maddok:['nora jaszczurzych koszmarów - źródło','lizard nightmares den - source'],
    tezcatlipoca:['teotihuacan'], barbatos:['sala zrujnowanej świątyni','hall of the ruined temple'], tanroth:['sala tronowa','ice throne room']
  };
  let enabled=true, colossusPromptEnabled=true, onlineRangesEnabled=true, uiLanguage='pl', languagePicker=null, backgroundPicker=null, backgroundPreset='midnight', colossusPromptCheckbox=null, onlineRangesCheckbox=null, chatPanel=null, chatGrid=null, chatStatus=null, chatInput=null, currentTitan=null, settingsTab=null, settingsView=null, settingCheckbox=null, settingsStatus=null, themeTab=null, themeView=null, notifierTab=null, notifierView=null, eventTab=null, eventView=null, themePicker=null, themeStatus=null, themeShortcutButton=null, capturingToggleShortcut=false, toggleShortcut='Shift+V', activeSettingsTab=null, settingsSnapshot=null, themeColor='#6366f1';
  try { enabled=localStorage.getItem(ENABLED_KEY)!=='0'; } catch(error) {}
  try { colossusPromptEnabled=localStorage.getItem(COLOSSUS_PROMPT_ENABLED_KEY)!=='0'; } catch(error) {}
  try { onlineRangesEnabled=localStorage.getItem('mkOnlineRangesEnabled')!=='0'; } catch(error) {}
  try { const savedLanguage=localStorage.getItem(LANGUAGE_KEY);uiLanguage=['en','el'].includes(savedLanguage)?savedLanguage:'pl'; } catch(error) {}
  try { const saved=localStorage.getItem(THEME_KEY);if(/^#[0-9a-f]{6}$/i.test(saved||''))themeColor=saved; } catch(error) {}
  try { const saved=localStorage.getItem(BACKGROUND_KEY);if(saved&&BACKGROUND_PRESETS[saved])backgroundPreset=saved; } catch(error) {}
  try { const saved=localStorage.getItem(TOGGLE_SHORTCUT_KEY);if(saved)toggleShortcut=saved; } catch(error) {}

  const updateShortcutButton=()=>{if(themeShortcutButton)themeShortcutButton.textContent=capturingToggleShortcut?'Naciśnij skrót…':toggleShortcut.replace(/\+/g,' + ')};
  document.addEventListener('keydown',event=>{
    if(capturingToggleShortcut){event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape'){capturingToggleShortcut=false;updateShortcutButton();return}if(event.key.length===1&&(event.ctrlKey||event.altKey||event.shiftKey||event.metaKey)){const parts=[];if(event.ctrlKey)parts.push('Ctrl');if(event.altKey)parts.push('Alt');if(event.shiftKey)parts.push('Shift');if(event.metaKey)parts.push('Meta');parts.push(event.key.toUpperCase());toggleShortcut=parts.join('+');capturingToggleShortcut=false;try{localStorage.setItem(TOGGLE_SHORTCUT_KEY,toggleShortcut)}catch(error){}updateShortcutButton()}return}
    if(event.repeat||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    const parts=toggleShortcut.split('+'),key=parts.pop(),mods=new Set(parts);
    if(event.key.toLocaleLowerCase()!==key.toLocaleLowerCase()||event.ctrlKey!==mods.has('Ctrl')||event.altKey!==mods.has('Alt')||event.shiftKey!==mods.has('Shift')||event.metaKey!==mods.has('Meta'))return;
    event.preventDefault();event.stopImmediatePropagation();(window.__mkHubToggle||window.__heroesDiscordTogglePanel)?.();
  },true);

  const style=document.createElement('style');
  style.id='mk-titan-loot-chat-style';
  style.textContent=`
    #${PANEL_ID}.mk-titan-loot-settings-active{width:min(390px,calc(100vw - 16px))!important;height:auto!important;min-width:min(310px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;max-height:calc(100vh - 16px)!important;overflow:hidden!important}
    #${PANEL_ID}.mk-titan-loot-settings-active[data-mk-settings-view="loot"] #${SETTINGS_ID}{display:block!important}
    #${SETTINGS_ID}{display:none;box-sizing:border-box;padding:12px;color:#e7edf8;font:12px/1.45 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    #${SETTINGS_ID} .mk-tl-settings-title{margin:0 0 10px;color:#f4f0ff;font-size:13px;font-weight:700}
    #${SETTINGS_ID} .mk-tl-toggle{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:9px;background:linear-gradient(160deg,rgba(36,31,64,.82),rgba(14,18,34,.88));color:#e8eaff;cursor:pointer}
    #${SETTINGS_ID} .mk-tl-toggle input{width:16px;height:16px;margin:0;accent-color:#6366f1}
    #${SETTINGS_ID} .mk-tl-description{margin:9px 2px 0;color:#aeb8cc;font-size:11px}
    #${SETTINGS_ID} .mk-tl-settings-status{margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12);color:#98a6bd;font-size:10px}
    #${PANEL_ID}.mk-titan-loot-settings-active[data-mk-settings-view="theme"] #${THEME_SETTINGS_ID}{display:block!important}
    #${PANEL_ID}.mk-titan-loot-settings-active[data-mk-settings-view="notifier"] #${NOTIFIER_SETTINGS_ID}{display:block!important}
    #${PANEL_ID}.mk-titan-loot-settings-active[data-mk-settings-view="event"] #${EVENT_SETTINGS_ID}{display:block!important}
    #${EVENT_SETTINGS_ID}{display:none;box-sizing:border-box;padding:12px;max-height:calc(100vh - 112px);overflow-y:auto;color:#e7edf8;font:12px/1.45 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    #${EVENT_SETTINGS_ID} .mk-event-card{margin:10px 0;padding:11px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 38%,rgba(148,163,184,.18));border-radius:9px;background:color-mix(in srgb,var(--mkhd-addon-theme) 11%,rgba(14,18,34,.88));color:#e8eaff}
    #${EVENT_SETTINGS_ID} .mk-event-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 45%,rgba(129,140,248,.25));border-radius:999px;background:color-mix(in srgb,var(--mkhd-addon-theme) 18%,rgba(2,6,23,.55));color:#fff;font-size:10px;font-weight:700}
    #${NOTIFIER_SETTINGS_ID}{display:none;box-sizing:border-box;padding:12px;max-height:calc(100vh - 112px);overflow-y:auto;color:#e7edf8;font:12px/1.45 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    #${THEME_SETTINGS_ID}{display:none;box-sizing:border-box;padding:12px;max-height:calc(100vh - 112px);overflow-y:auto;color:#e7edf8;font:12px/1.45 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    #${THEME_SETTINGS_ID} .mk-tl-color-row{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 35%,rgba(148,163,184,.18));border-radius:9px;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme) 14%,rgba(36,31,64,.82)),rgba(14,18,34,.88));color:#e8eaff}
    #${THEME_SETTINGS_ID} input[type="color"]{width:44px;height:34px;padding:2px;border:1px solid rgba(255,255,255,.2);border-radius:7px;background:rgba(0,0,0,.35);cursor:pointer}
    #${THEME_SETTINGS_ID} .mk-tl-language-row,#${THEME_SETTINGS_ID} .mk-tl-background-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 35%,rgba(148,163,184,.18));border-radius:9px;background:color-mix(in srgb,var(--mkhd-addon-theme) 10%,rgba(14,18,34,.88));color:#e8eaff}
    #${THEME_SETTINGS_ID} .mk-tl-language-row select{min-width:100px;padding:6px 8px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(148,163,184,.25));border-radius:7px;background:#0b1220;color:#f8fafc}
    #${THEME_SETTINGS_ID} .mk-tl-background-row select{min-width:132px;padding:7px 9px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(148,163,184,.25));border-radius:7px;background:#0b1220;color:#f8fafc}
    #${THEME_SETTINGS_ID} .mk-tl-shortcut-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 35%,rgba(148,163,184,.18));border-radius:9px;background:color-mix(in srgb,var(--mkhd-addon-theme) 10%,rgba(14,18,34,.88));color:#e8eaff}
    #${THEME_SETTINGS_ID} .mk-tl-shortcut-button{min-width:90px;padding:6px 10px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme) 55%,rgba(129,140,248,.28));border-radius:7px;background:color-mix(in srgb,var(--mkhd-addon-theme) 25%,rgba(2,6,23,.55));color:#fff;font:600 11px Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif;cursor:pointer}
    #${THEME_SETTINGS_ID} .mk-tl-description{margin:9px 2px 0;color:#aeb8cc;font-size:11px}
    #${THEME_SETTINGS_ID} .mk-tl-settings-status{margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12);color:#98a6bd;font-size:10px}
    :root{--mkhd-addon-theme:${themeColor}}
    #${PANEL_ID},#${CHAT_PANEL_ID}{--mkhd-addon-theme:${themeColor}}
    #heroes-colossus-call{border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 54%,rgba(148,163,184,.32))!important;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 18%,#131c2d),color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 10%,#0c121f))!important}
    #heroes-colossus-call select{border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 52%,#40516b)!important}
    #heroes-colossus-call button:last-child,#heroes-popup .heroes-discord__button-positive{background:linear-gradient(135deg,var(--mkhd-addon-theme,#6366f1),color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 72%,#8b7cff))!important;border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 68%,white)!important}
    #heroes-popup{border-image:none!important;border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 54%,rgba(148,163,184,.32))!important;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 18%,#131c2d),color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 10%,#0c121f))!important}
    #heroes-popup .heroes-discord__background{background:transparent!important}
    #heroes-popup .heroes-discord__button-negative{border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 38%,rgba(255,255,255,.12))!important}
    #heroes-colossus-call .heroes-call-opacity,#heroes-popup .heroes-discord__popup-opacity{border-color:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 50%,rgba(129,140,248,.28))!important;background:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 24%,rgba(2,6,23,.55))!important}
    #${PANEL_ID}{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(148,163,184,.32))!important;box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 0 1px color-mix(in srgb,var(--mkhd-addon-theme) 18%,transparent)!important}
    #${PANEL_ID} .mk-tool-btn,#${PANEL_ID} .mk-config-btn{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 38%,rgba(129,140,248,.28))!important;background-color:color-mix(in srgb,var(--mkhd-addon-theme) 15%,rgba(2,6,23,.55))!important}
    #${PANEL_ID} .mk-tool-btn.active{background:color-mix(in srgb,var(--mkhd-addon-theme) 72%,#20243b)!important;border-color:color-mix(in srgb,var(--mkhd-addon-theme) 80%,white)!important}
    #${PANEL_ID} .mk-slider{background:var(--mkhd-addon-theme)!important}
    #${CHAT_PANEL_ID}{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(129,140,248,.36))!important;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme) 18%,#131c2d),color-mix(in srgb,var(--mkhd-addon-theme) 12%,#140e2a))!important}
    #${CHAT_PANEL_ID} .mk-tl-map{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(129,140,248,.28))!important;background:color-mix(in srgb,var(--mkhd-addon-theme) 18%,transparent)!important}
    #${CHAT_PANEL_ID} .mk-tl-item:hover,#${CHAT_PANEL_ID} .mk-tl-item.selected{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 72%,white)!important;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme) 44%,#241f40),#181e36)!important}
    #${PANEL_ID} .heroes-discord__setup{border-color:color-mix(in srgb,var(--mkhd-addon-theme) 48%,rgba(144,123,255,.24))!important}
    #${PANEL_ID} .heroes-discord__setup .heroes-discord__input:focus{border-color:var(--mkhd-addon-theme)!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--mkhd-addon-theme) 20%,transparent)!important}
    #${PANEL_ID} .mk-header{display:grid!important;grid-template-columns:minmax(0,1fr) 22px 22px 22px!important;grid-template-rows:auto auto;min-width:0!important;gap:3px!important;padding:5px!important;box-sizing:border-box!important}
    #${PANEL_ID} .mk-addon-tabs{grid-column:1/-1;grid-row:1;display:flex;gap:3px!important;min-width:0!important;width:100%;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
    #${PANEL_ID} .mk-addon-tabs::-webkit-scrollbar{display:none}
    #${PANEL_ID} .mk-header>div:first-child{grid-column:1;grid-row:2}
    #${PANEL_ID} .mk-header>.mk-switch{grid-column:1;grid-row:2;justify-self:start;flex:0 1 76px!important;min-width:66px!important}
    #${PANEL_ID} .mk-header>div:nth-child(3){display:none!important}
    #${PANEL_ID} .mk-header>.mk-tool-btn:not(.mk-addon-tab){grid-row:2;flex:0 0 22px!important;width:22px!important;min-width:22px!important;padding:0!important}
    #${PANEL_ID} .mk-header>.mk-tool-btn:not(.mk-addon-tab):nth-last-child(3){grid-column:2}
    #${PANEL_ID} .mk-header>.mk-tool-btn:not(.mk-addon-tab):nth-last-child(2){grid-column:3}
    #${PANEL_ID} .mk-header>.mk-tool-btn:not(.mk-addon-tab):last-child{grid-column:4}
    #${PANEL_ID} .mk-addon-tab{min-width:0!important;height:23px!important;padding:0 5px!important;font-size:10px!important}
    #${PANEL_ID} .mk-addon-tab[data-mk-loot="1"]{min-width:34px!important;padding:0 5px!important;flex:0 0 auto!important}
    #${PANEL_ID} .mk-header>.mk-switch{flex:0 1 76px!important;min-width:66px!important}
    #${PANEL_ID} .mk-header>.mk-tool-btn{flex:0 0 22px!important;width:22px!important;min-width:22px!important;padding:0!important}
    #${CHAT_PANEL_ID}{position:relative;z-index:3;display:block;flex:0 0 100%;min-width:0;width:100%;max-width:100%;box-sizing:border-box;margin:5px 0;padding:8px 7px 6px;border:1px solid rgba(129,140,248,.36);border-radius:9px;background:linear-gradient(160deg,rgba(19,28,45,.98),rgba(20,14,42,.98));box-shadow:0 8px 24px rgba(0,0,0,.42),0 0 0 1px rgba(99,102,241,.08);color:#e7edf8;font:12px/1.35 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    #${CHAT_PANEL_ID} .mk-tl-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:7px;color:#d8ccff;font-size:12px;font-weight:700}
    #${CHAT_PANEL_ID} .mk-tl-head-right{display:flex;align-items:center;gap:5px;min-width:0}
    #${CHAT_PANEL_ID} .mk-tl-map{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;border:1px solid rgba(129,140,248,.28);border-radius:7px;background:rgba(99,102,241,.12);color:#c7d2fe;font-size:10px;font-weight:500}
    #${CHAT_PANEL_ID} .mk-tl-collapse{width:21px;height:21px;padding:0;border:1px solid rgba(129,140,248,.28);border-radius:6px;background:rgba(99,102,241,.14);color:#e8edff;font:700 14px/18px Arial,sans-serif;cursor:pointer}
    #${CHAT_PANEL_ID} .mk-tl-hint{margin:0 0 7px;color:#aeb8cc;font-size:11px}
    #${CHAT_PANEL_ID} .mk-tl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(42px,1fr));gap:5px}
    #${CHAT_PANEL_ID} .mk-tl-item{display:flex;min-width:0;min-height:64px;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;padding:4px 3px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:linear-gradient(160deg,rgba(36,31,64,.82),rgba(14,18,34,.88));color:#ddd6fe;cursor:pointer;font:600 10px/1.2 Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif;text-align:center;overflow-wrap:anywhere;transition:transform .14s,border-color .14s,background .14s}
    #${CHAT_PANEL_ID} .mk-tl-item:hover,#${CHAT_PANEL_ID} .mk-tl-item.selected{transform:translateY(-1px);border-color:rgba(165,180,252,.78);background:linear-gradient(160deg,rgba(67,56,116,.9),rgba(24,30,54,.95));box-shadow:0 5px 14px rgba(0,0,0,.26)}
    #${CHAT_PANEL_ID} .mk-tl-icon{display:block;width:31px;height:31px;flex:0 0 31px;border:1px solid rgba(245,214,120,.35);border-radius:6px;background-color:rgba(4,8,20,.7);background-position:center;background-repeat:no-repeat;background-size:contain;image-rendering:pixelated}
    #${CHAT_PANEL_ID} .mk-tl-label{display:block;width:100%;color:#ddd6fe}
    #${CHAT_PANEL_ID} .mk-tl-status{min-height:14px;margin-top:7px;padding-top:5px;border-top:1px solid rgba(148,163,184,.12);color:#98a6bd;font-size:10px}
    #${CHAT_PANEL_ID}.is-collapsed .mk-tl-body{display:none}
    @media(max-width:390px){#${CHAT_PANEL_ID}{padding:7px 6px 5px}#${CHAT_PANEL_ID} .mk-tl-grid{gap:3px}#${CHAT_PANEL_ID} .mk-tl-item{padding:4px 1px;font-size:8px}#${CHAT_PANEL_ID} .mk-tl-icon{width:28px;height:28px;flex-basis:28px}}
  `;
  document.head.appendChild(style);

  const mapContext=()=>{
    const contexts=[window];for(const frame of document.querySelectorAll('iframe')){try{if(frame.contentWindow)contexts.push(frame.contentWindow)}catch(error){}}
    for(const w of contexts){const m=w.Engine?.map||w.map;const id=m?.d?.id??m?.id??m?.d?.mapid??m?.mapid??'';const name=m?.d?.name||m?.name||'';if(id||name)return{id:String(id),name:String(name).toLocaleLowerCase('pl')}}
    return{id:'',name:''};
  };
  const findTitan=()=>{const m=mapContext();return TITAN_LOOT.find(t=>String(t.mapId)===m.id||(MAP_ALIASES[t.id]||[]).some(x=>m.name.includes(x)))||null};
  const getDocs=()=>{const out=[],seen=new Set(),visit=doc=>{if(!doc||seen.has(doc))return;seen.add(doc);out.push(doc);for(const frame of doc.querySelectorAll('iframe'))try{visit(frame.contentDocument)}catch(error){}};visit(document);return out};
  const addonUiSelector='#mk-clan-ranges-panel,#heroes-popup,#heroes-colossus-call,.heroes-discord__setup,#mk-titan-loot-chat-panel';
  const uiTranslations={
    'Przeciągnij, aby przesunąć okno':'Drag to move this window','Przeciągnij, aby przesunąć ustawienia':'Drag to move settings','Przeciągnij za górny pasek, aby przesunąć okno':'Drag the top bar to move this window','Przeciągnij za górny pasek, aby przesunąć ustawienia':'Drag the top bar to move settings','Przeciągnij, aby zmienić rozmiar':'Drag to resize','Zmień rozmiar okna':'Resize window','Powiadomić discorda?':'Send a Discord notification?','Powiadom':'Notify Discord','Nie powiadamiaj':'Do not notify','Zmień przezroczystość okna':'Change window transparency','📣 Zbieramy grupę na kolosa?':'📣 Gather a group for the Colossus?','Wybierz kolosa':'Choose a Colossus','Zapamiętaj kolosa dla tej mapy':'Remember the Colossus for this map','Później':'Later','Wyślij na Discorda':'Send to Discord','Przedz.':'Ranges','KLAN':'CLAN','ŚWIAT':'WORLD','Klan':'Clan','Świat':'World','Łup':'Loot','Ustawienia':'Settings','Wygląd zestawu':'Appearance','Konfiguracja':'Settings','Dodatek wyłączony':'Add-on disabled','Oczekiwanie...':'Waiting...','Ładowanie...':'Loading...','brak':'none','Pokaż klanowiczy (tylko ten przedział)':'Show clan members (this range only)','Włącz wysyłanie webhooka na tym przedziale':'Enable webhook notifications for this range','Ustawienia Discorda':'Discord settings','Dostępne po przełączeniu na SPAM':'Available when SPAM is enabled','+ Dodaj przedział':'+ Add range','Globalne (np. 0-6):':'Global (e.g. 0–6):','Czerwona:':'Red:','Żółta:':'Yellow:','Zielona:':'Green:','Komunikat w grze:':'In-game message:','Zapisz':'Save','Webhook Discorda — Herosi':'Discord webhook — Heroes','Webhook Discorda — Kolosi':'Discord webhook — Colossi','Webhook Discorda — Tytani':'Discord webhook — Titans','Wklej link webhooka dla tego kanału':'Paste the webhook URL for this channel','Nick jaki chcesz by się wyświetlał (zostaw puste jeżeli ma to być nick aktualnej postaci)':'Display name (leave blank to use your current character name)','Role dla konkretnych potworów (nazwa potwora: ID roli; puste = bez pingowania)':'Roles for specific monsters (monster name: role ID; blank = no ping)','Zapisano! Nie musisz nic odświeżać.':'Saved! No refresh needed.','Wpisz poprawny JSON z nazwami potworów i ID ról, np. {"Drakolisz":"123456789012345678","Heros X":"234567890123456789"}.':'Enter valid JSON with monster names and role IDs, e.g. {"Drakolisz":"123456789012345678","Hero X":"234567890123456789"}.','Mapowanie musi być obiektem JSON.':'Mapping must be a JSON object.','Ustaw webhook dla kolosów w menu Heroes on Discord.':'Set the Colossus webhook in the Heroes on Discord settings.','Najpierw wybierz kolosa.':'Choose a Colossus first.','Kliknij przedmiot, aby zgłosić go na /p.':'Click an item to report it in /p.','Kliknij legendarny przedmiot, aby zgłosić go na czacie grupowym:':'Click a legendary item to report it in group chat:','Włącz panel łupu przy czacie':'Enable the loot panel next to chat','Panel z legendarnymi dropami pojawia się przy czacie na mapie tytana. Kliknięcie przedmiotu wysyła zgłoszenie na czat grupowy.':'The legendary loot panel appears beside chat on a Titan map. Click an item to report it in group chat.','Wybrany kolor obejmuje panel, oba okna powiadomień, zakładki i panel łupu.':'The selected color applies to the panel, both notification windows, tabs, and the loot panel.','Kolor przewodni całego zestawu':'Main add-on color','Wybierz kolor dodatku':'Choose add-on color','Skrót otwierania dodatku':'Add-on toggle shortcut','Kliknij przycisk i naciśnij nowy skrót. Escape anuluje zmianę.':'Click the button and press a new shortcut. Escape cancels.','Panel łupu przy czacie jest włączony.':'The chat loot panel is enabled.','Panel łupu przy czacie jest wyłączony i ustawienie zostanie zapamiętane.':'The chat loot panel is disabled and this setting will be saved.','Ustawienia panelu łupu':'Loot panel settings','Ustawienia wyglądu zestawu':'Add-on appearance settings','Wygląd zestawu':'Add-on appearance','Tropiciel Herosów':'Hero Tracker','Wtajemniczony Tropiciel Herosów':'Experienced Hero Tracker','Doświadczony Tropiciel Herosów':'Expert Hero Tracker','Hełm':'Helmet','Pierścień':'Ring','Naszyjnik':'Amulet','Rękawice':'Gloves','Buty':'Boots','Neutralne':'Other','Czapka':'Helmet','Pierek':'Ring','Łapy':'Gloves','Naszyj':'Amulet','Świat (online):':'World online:','Klan (online):':'Clan online:','Postać nie ma klanu.':'This character is not in a clan.','Błąd API świata':'World API error','Błąd':'Error','Nie znaleziono czatu gry. Otwórz czat Margonem i spróbuj ponownie.':'Game chat not found. Open Margonem chat and try again.','Wyczyść szkic w czacie przed wyborem łupu.':'Clear the chat draft before choosing loot.','Wysłano na czat grupowy:':'Sent to group chat:','Blokada czatu: dozwolone są tylko wiadomości zaczynające się od /p.':'Chat guard: only messages starting with /p are allowed.','Kliknij przedmiot, aby zgłosić go na /p.':'Click an item to report it in /p.','Nie udało się wysłać zgłoszenia.':'Could not send the report.','Zgłoszono na czat grupowy:':'Reported in group chat:','Włącz okno zbiórki na kolosa':'Enable Colossus gathering prompt','Wyłącza wyskakujące okno zbiórki na przedsionkach kolosów.':'Disables the gathering prompt on Colossus vestibules.','Język dodatku':'Add-on language','Zmień przezroczystość':'Change transparency','Włącz Przedziały Online':'Enable Online Ranges','Wyłącza panel przedziałów oraz powiadomienia Discord z tego dodatku.':'Disables the ranges panel and its Discord notifications.','Tło dodatku':'Add-on background','Nocny fiolet':'Midnight violet','Zorza polarna':'Aurora','Głęboki ocean':'Deep ocean','Szmaragd':'Emerald','Zachód słońca':'Sunset','Tło obejmuje główny panel, okna alertów i ustawienia Discorda.':'The background applies to the main panel, alert windows, and Discord settings.'
  };
  const uiGreekTranslations={
    'Przeciągnij, aby przesunąć okno':'Σύρετε για μετακίνηση του παραθύρου','Przeciągnij, aby przesunąć ustawienia':'Σύρετε για μετακίνηση των ρυθμίσεων','Przeciągnij za górny pasek, aby przesunąć okno':'Σύρετε από την επάνω γραμμή για μετακίνηση του παραθύρου','Przeciągnij za górny pasek, aby przesunąć ustawienia':'Σύρετε από την επάνω γραμμή για μετακίνηση των ρυθμίσεων','Przeciągnij, aby zmienić rozmiar':'Σύρετε για αλλαγή μεγέθους','Zmień rozmiar okna':'Αλλαγή μεγέθους παραθύρου','Powiadomić discorda?':'Να σταλεί ειδοποίηση στο Discord;','Powiadom':'Ειδοποίηση','Nie powiadamiaj':'Χωρίς ειδοποίηση','Zmień przezroczystość okna':'Αλλαγή διαφάνειας παραθύρου','📣 Zbieramy grupę na kolosa?':'📣 Συγκεντρώνουμε ομάδα για τον Κολοσσό;','Wybierz kolosa':'Επιλέξτε Κολοσσό','Zapamiętaj kolosa dla tej mapy':'Απομνημόνευση Κολοσσού για αυτόν τον χάρτη','Później':'Αργότερα','Wyślij na Discorda':'Αποστολή στο Discord','Przedz.':'Εύρη','KLAN':'ΦΥΛΗ','ŚWIAT':'ΚΟΣΜΟΣ','Klan':'Φυλή','Świat':'Κόσμος','Łup':'Λάφυρα','Ustawienia':'Ρυθμίσεις','Wygląd zestawu':'Εμφάνιση πρόσθετου','Konfiguracja':'Ρυθμίσεις','Dodatek wyłączony':'Το πρόσθετο είναι απενεργοποιημένο','Oczekiwanie...':'Αναμονή...','Ładowanie...':'Φόρτωση...','brak':'κανένα','Pokaż klanowiczy (tylko ten przedział)':'Εμφάνιση μελών φυλής (μόνο σε αυτό το εύρος)','Włącz wysyłanie webhooka na tym przedziale':'Ενεργοποίηση ειδοποιήσεων webhook για αυτό το εύρος','Ustawienia Discorda':'Ρυθμίσεις Discord','Dostępne po przełączeniu na SPAM':'Διαθέσιμο όταν ενεργοποιηθεί το SPAM','+ Dodaj przedział':'+ Προσθήκη εύρους','Globalne (np. 0-6):':'Καθολικά (π.χ. 0-6):','Czerwona:':'Κόκκινο:','Żółta:':'Κίτρινο:','Zielona:':'Πράσινο:','Komunikat w grze:':'Μήνυμα στο παιχνίδι:','Zapisz':'Αποθήκευση','Webhook Discorda — Herosi':'Webhook Discord — Ήρωες','Webhook Discorda — Kolosi':'Webhook Discord — Κολοσσοί','Webhook Discorda — Tytani':'Webhook Discord — Τιτάνες','Wklej link webhooka dla tego kanału':'Επικολλήστε το URL webhook αυτού του καναλιού','Nick jaki chcesz by się wyświetlał (zostaw puste jeżeli ma to być nick aktualnej postaci)':'Όνομα εμφάνισης (κενό για το όνομα του τρέχοντος χαρακτήρα)','Role dla konkretnych potworów (nazwa potwora: ID roli; puste = bez pingowania)':'Ρόλοι για συγκεκριμένα τέρατα (όνομα τέρατος: ID ρόλου· κενό = χωρίς αναφορά)','Zapisano! Nie musisz nic odświeżać.':'Αποθηκεύτηκε! Δεν χρειάζεται ανανέωση.','Mapowanie musi być obiektem JSON.':'Η αντιστοίχιση πρέπει να είναι αντικείμενο JSON.','Ustaw webhook dla kolosów w menu Heroes on Discord.':'Ορίστε το webhook Κολοσσών στις ρυθμίσεις Heroes on Discord.','Najpierw wybierz kolosa.':'Επιλέξτε πρώτα έναν Κολοσσό.','Kliknij przedmiot, aby zgłosić go na /p.':'Κάντε κλικ σε αντικείμενο για αναφορά στο /p.','Kliknij legendarny przedmiot, aby zgłosić go na czacie grupowym:':'Κάντε κλικ σε θρυλικό αντικείμενο για αναφορά στην ομαδική συνομιλία:','Włącz panel łupu przy czacie':'Ενεργοποίηση πίνακα λαφύρων δίπλα στη συνομιλία','Panel z legendarnymi dropami pojawia się przy czacie na mapie tytana. Kliknięcie przedmiotu wysyła zgłoszenie na czat grupowy.':'Ο πίνακας με τα θρυλικά λάφυρα εμφανίζεται δίπλα στη συνομιλία στον χάρτη Τιτάνα. Κάνοντας κλικ σε αντικείμενο στέλνεται αναφορά στην ομαδική συνομιλία.','Wybrany kolor obejmuje panel, oba okna powiadomień, zakładki i panel łupu.':'Το επιλεγμένο χρώμα εφαρμόζεται στον πίνακα, στα δύο παράθυρα ειδοποιήσεων, στις καρτέλες και στον πίνακα λαφύρων.','Kolor przewodni całego zestawu':'Κύριο χρώμα πρόσθετου','Wybierz kolor dodatku':'Επιλογή χρώματος πρόσθετου','Skrót otwierania dodatku':'Συντόμευση εναλλαγής πρόσθετου','Kliknij przycisk i naciśnij nowy skrót. Escape anuluje zmianę.':'Κάντε κλικ και πατήστε τη νέα συντόμευση. Το Escape ακυρώνει.','Panel łupu przy czacie jest włączony.':'Ο πίνακας λαφύρων συνομιλίας είναι ενεργός.','Panel łupu przy czacie jest wyłączony i ustawienie zostanie zapamiętane.':'Ο πίνακας λαφύρων συνομιλίας είναι ανενεργός· η επιλογή θα αποθηκευτεί.','Ustawienia panelu łupu':'Ρυθμίσεις πίνακα λαφύρων','Ustawienia wyglądu zestawu':'Ρυθμίσεις εμφάνισης πρόσθετου','Tropiciel Herosów':'Ανιχνευτής Ηρώων','Wtajemniczony Tropiciel Herosów':'Έμπειρος Ανιχνευτής Ηρώων','Doświadczony Tropiciel Herosów':'Προχωρημένος Ανιχνευτής Ηρώων','Hełm':'Κράνος','Pierścień':'Δαχτυλίδι','Naszyjnik':'Κολιέ','Rękawice':'Γάντια','Buty':'Μπότες','Neutralne':'Άλλο','Czapka':'Κράνος','Pierek':'Δαχτυλίδι','Łapy':'Γάντια','Naszyj':'Κολιέ','Postać nie ma klanu.':'Ο χαρακτήρας δεν ανήκει σε φυλή.','Błąd API świata':'Σφάλμα API κόσμου','Błąd':'Σφάλμα','Nie znaleziono czatu gry. Otwórz czat Margonem i spróbuj ponownie.':'Δεν βρέθηκε η συνομιλία του παιχνιδιού. Ανοίξτε τη συνομιλία Margonem και δοκιμάστε ξανά.','Wyczyść szkic w czacie przed wyborem łupu.':'Καθαρίστε το πρόχειρο μήνυμα πριν επιλέξετε λάφυρο.','Wysłano na czat grupowy:':'Στάλθηκε στην ομαδική συνομιλία:','Blokada czatu: dozwolone są tylko wiadomości zaczynające się od /p.':'Περιορισμός συνομιλίας: επιτρέπονται μόνο μηνύματα που αρχίζουν με /p.','Nie udało się wysłać zgłoszenia.':'Η αποστολή της αναφοράς απέτυχε.','Zgłoszono na czat grupowy:':'Αναφέρθηκε στην ομαδική συνομιλία:','Włącz okno zbiórki na kolosa':'Ενεργοποίηση παραθύρου συγκέντρωσης για Κολοσσό','Wyłącza wyskakujące okno zbiórki na przedsionkach kolosów.':'Απενεργοποιεί το αναδυόμενο παράθυρο συγκέντρωσης στις εισόδους των Κολοσσών.','Język dodatku':'Γλώσσα πρόσθετου','Zmień przezroczystość':'Αλλαγή διαφάνειας','Włącz Przedziały Online':'Ενεργοποίηση Εύρων Online','Wyłącza panel przedziałów oraz powiadomienia Discord z tego dodatku.':'Απενεργοποιεί τον πίνακα εύρους και τις ειδοποιήσεις Discord του πρόσθετου.','Tło dodatku':'Φόντο πρόσθετου','Nocny fiolet':'Μεσονύκτιο μωβ','Zorza polarna':'Βόρειο σέλας','Głęboki ocean':'Βαθύς ωκεανός','Szmaragd':'Σμαραγδί','Zachód słońca':'Ηλιοβασίλεμα','Tło obejmuje główny panel, okna alertów i ustawienia Discorda.':'Το φόντο εφαρμόζεται στον κύριο πίνακα, στα παράθυρα ειδοποιήσεων και στις ρυθμίσεις Discord.'
  };
  Object.assign(uiGreekTranslations,{
    'Świat (online):':'Κόσμος (online):','Klan (online):':'Φυλή (online):',
    'Wpisz poprawny JSON z nazwami potworów i ID ról, np. {"Drakolisz":"123456789012345678","Heros X":"234567890123456789"}.':'Εισαγάγετε έγκυρο JSON με ονόματα τεράτων και ID ρόλων, π.χ. {"Drakolisz":"123456789012345678","Heros X":"234567890123456789"}.'
  });  Object.assign(uiTranslations,{
    'Notyfikator':'Notifier','Notyfikator legend':'Legend notifier','Ustawienia notyfikatora legend':'Legend notifier settings',
    'Efekt, dźwięk i alert uruchamiane po zdobyciu legendy.':'Effects, sound and alert shown when a legendary item drops.',
    'Efekt':'Effect','Fioletowy wir':'Purple vortex','Elektryczny':'Electric','Złoty':'Golden','Promo':'Promo','Sąsiedzki notif':'Neighbor heads','Iskry + kometa':'Sparks + comet','Błyskawice':'Lightning','Neonowe pierścienie':'Neon rings','Wszystko naraz':'All effects','Sam glow':'Glow only','Losowy motyw':'Random effect',
    'Kolor efektu':'Effect color','Czas':'Duration','s':'s','Odtwarzaj dźwięk przy legendzie':'Play sound on legendary drop','Adres pliku MP3 (opcjonalnie)':'MP3 file URL (optional)','Głośność':'Volume','%':'%',
    'Treść alertu':'Alert text','BBcode, {leg} wstawia nazwę przedmiotu':'BBcode; {leg} inserts the item name','Test efektu':'Test effect','Test dropu':'Test loot drop','Przywróć domyślne':'Restore defaults','Skrót testu dropu: Ctrl + Shift + L':'Loot test shortcut: Ctrl + Shift + L'
  });
  Object.assign(uiGreekTranslations,{
    'Notyfikator':'Ειδοποιητής','Notyfikator legend':'Ειδοποιητής θρυλικών αντικειμένων','Ustawienia notyfikatora legend':'Ρυθμίσεις ειδοποιητή θρυλικών αντικειμένων',
    'Efekt, dźwięk i alert uruchamiane po zdobyciu legendy.':'Εφέ, ήχος και ειδοποίηση κατά την απόκτηση θρυλικού αντικειμένου.',
    'Efekt':'Εφέ','Fioletowy wir':'Μωβ δίνη','Elektryczny':'Ηλεκτρικό','Złoty':'Χρυσό','Promo':'Προωθητικό','Sąsiedzki notif':'Κεφάλια γειτόνων','Iskry + kometa':'Σπίθες + κομήτης','Błyskawice':'Κεραυνοί','Neonowe pierścienie':'Δακτύλιοι νέον','Wszystko naraz':'Όλα τα εφέ','Sam glow':'Μόνο λάμψη','Losowy motyw':'Τυχαίο εφέ',
    'Kolor efektu':'Χρώμα εφέ','Czas':'Διάρκεια','s':'δευτ.','Odtwarzaj dźwięk przy legendzie':'Αναπαραγωγή ήχου σε θρυλικό αντικείμενο','Adres pliku MP3 (opcjonalnie)':'Διεύθυνση αρχείου MP3 (προαιρετικό)','Głośność':'Ένταση','%':'%',
    'Treść alertu':'Κείμενο ειδοποίησης','BBcode, {leg} wstawia nazwę przedmiotu':'BBcode· το {leg} εισάγει το όνομα του αντικειμένου','Test efektu':'Δοκιμή εφέ','Test dropu':'Δοκιμή λάφυρου','Przywróć domyślne':'Επαναφορά προεπιλογών','Skrót testu dropu: Ctrl + Shift + L':'Συντόμευση δοκιμής λάφυρου: Ctrl + Shift + L'
  });
  Object.assign(uiTranslations,{
    'Kanał eventowy — Herosi':'Event channel — Heroes','Osobny kanał dla herosów eventowych • wzmianka @event':'Separate channel for event heroes • @event mention','Webhook Discorda — Event (@event)':'Discord webhook — Event (@event)','Wklej link webhooka dla kanału Event':'Paste the webhook URL for the Event channel','Automatyczne powiadomienia o herosach':'Automatic hero alerts','Event':'Event','Kanał eventowy':'Event channel','Kanał eventowy — herosi':'Event channel — heroes','Automatyczne alerty po wykryciu herosa.':'Automatic alerts when a hero is detected.','Webhook eventowy jest podłączony na stałe.':'The event webhook is permanently connected.','Wzmianka: ':'Mention: ','Automatycznie powiadamiaj o herosach':'Automatically notify about heroes','Automatyczne alerty eventowe są włączone.':'Automatic event alerts are enabled.','Automatyczne alerty eventowe są wyłączone.':'Automatic event alerts are disabled.'
  });
  Object.assign(uiGreekTranslations,{
    'Kanał eventowy — Herosi':'Κανάλι event — ήρωες','Osobny kanał dla herosów eventowych • wzmianka @event':'Ξεχωριστό κανάλι για ήρωες event • αναφορά @event','Webhook Discorda — Event (@event)':'Webhook Discord — Event (@event)','Wklej link webhooka dla kanału Event':'Επικόλλησε το webhook URL για το κανάλι Event','Automatyczne powiadomienia o herosach':'Αυτόματες ειδοποιήσεις ηρώων','Event':'Event','Kanał eventowy':'Κανάλι event','Kanał eventowy — herosi':'Κανάλι event — ήρωες','Automatyczne alerty po wykryciu herosa.':'Αυτόματες ειδοποιήσεις όταν εντοπίζεται ήρωας.','Webhook eventowy jest podłączony na stałe.':'Το webhook event είναι μόνιμα συνδεδεμένο.','Wzmianka: ':'Αναφορά: ','Automatycznie powiadamiaj o herosach':'Αυτόματη ειδοποίηση για ήρωες','Automatyczne alerty eventowe są włączone.':'Οι αυτόματες ειδοποιήσεις event είναι ενεργές.','Automatyczne alerty eventowe są wyłączone.':'Οι αυτόματες ειδοποιήσεις event είναι ανενεργές.'
  });
  const reverseUiTranslations=Object.fromEntries(Object.entries(uiTranslations).map(([pl,en])=>[en,pl]));
  const reverseGreekTranslations=Object.fromEntries(Object.entries(uiGreekTranslations).map(([pl,el])=>[el,pl]));
  const translateUiString=value=>{
    if(typeof value!=='string')return value;const trimmed=value.trim();const polish=uiLanguage==='pl'?(reverseUiTranslations[trimmed]||reverseGreekTranslations[trimmed]||trimmed):uiLanguage==='en'?(reverseGreekTranslations[trimmed]||trimmed):(reverseUiTranslations[trimmed]||trimmed);let translated='';
    const dynamic=[[/^--- Konfiguracja: KLAN ---$/,'--- Konfiguracja: KLAN ---','--- CLAN SETTINGS ---','--- ΡΥΘΜΙΣΕΙΣ ΦΥΛΗΣ ---'],[/^--- Konfiguracja: ŚWIAT ---$/,'--- Konfiguracja: ŚWIAT ---','--- WORLD SETTINGS ---','--- ΡΥΘΜΙΣΕΙΣ ΚΟΣΜΟΥ ---'],[/^(?:Świat \(online\): (\d+)|World online: (\d+)|Κόσμος \(online\): (\d+))$/,'Świat (online): ','World online: ','Κόσμος (online): '],[/^(?:Klan \(online\): (\d+)|Clan online: (\d+)|Φυλή \(online\): (\d+))$/,'Klan (online): ','Clan online: ','Φυλή (online): '],[/^(?:Wysłano na czat grupowy: (.+)|Sent to group chat: (.+)|Στάλθηκε στην ομαδική συνομιλία: (.+))$/,'Wysłano na czat grupowy: ','Sent to group chat: ','Στάλθηκε στην ομαδική συνομιλία: '],[/^(?:Kolor zestawu zapisany: (.+)|Add-on color saved: (.+)|Το χρώμα του πρόσθετου αποθηκεύτηκε: (.+))$/,'Kolor zestawu zapisany: ','Add-on color saved: ','Το χρώμα του πρόσθετου αποθηκεύτηκε: '],[/^(?:Aktualny kolor zestawu: (.+)|Current add-on color: (.+)|Τρέχον χρώμα πρόσθετου: (.+))$/,'Aktualny kolor zestawu: ','Current add-on color: ','Τρέχον χρώμα πρόσθετου: ']];
    for(const [pattern,pl,en,el] of dynamic){const match=trimmed.match(pattern);if(match){const captured=match.slice(1).find(Boolean)||'';translated=(uiLanguage==='pl'?pl:uiLanguage==='en'?en:el)+captured;break}}
    if(!translated)translated=uiLanguage==='pl'?polish:uiLanguage==='en'?(uiTranslations[polish]||''):(uiGreekTranslations[polish]||'');
    if(!translated)return value;const leading=value.match(/^\s*/)?.[0]||'',trailing=value.match(/\s*$/)?.[0]||'';return leading+translated+trailing;
  };
  const originalLocaleText=new WeakMap(),lastLocaleText=new WeakMap(),originalLocaleAttrs=new WeakMap(),lastLocaleAttrs=new WeakMap();
  const localizeAddonRoot=root=>{
    if(!root||root.nodeType!==1)return;
    const translateText=node=>{
      const current=node.nodeValue;
      if(!originalLocaleText.has(node)||current!==lastLocaleText.get(node))originalLocaleText.set(node,current);
      const next=translateUiString(originalLocaleText.get(node));
      if(next!==current)node.nodeValue=next;
      lastLocaleText.set(node,next);
    };
    const translateAttributes=el=>{
      let originals=originalLocaleAttrs.get(el),lasts=lastLocaleAttrs.get(el);
      if(!originals){originals=new Map();originalLocaleAttrs.set(el,originals)}
      if(!lasts){lasts=new Map();lastLocaleAttrs.set(el,lasts)}
      for(const attr of ['title','placeholder','aria-label'])if(el.hasAttribute(attr)){
        const current=el.getAttribute(attr);
        if(!originals.has(attr)||current!==lasts.get(attr))originals.set(attr,current);
        const next=translateUiString(originals.get(attr));
        if(next!==current)el.setAttribute(attr,next);
        lasts.set(attr,next);
      }
    };
    translateAttributes(root);
    const view=root.ownerDocument.defaultView,walker=root.ownerDocument.createTreeWalker(root,view.NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode()))translateText(node);
    for(const el of root.querySelectorAll('*'))translateAttributes(el);
  };  const observedLocaleDocs=new WeakSet();
  const installLocalization=doc=>{
    for(const root of doc.querySelectorAll(addonUiSelector))localizeAddonRoot(root);
    if(observedLocaleDocs.has(doc)||!doc.body)return;
    observedLocaleDocs.add(doc);
    const observer=new doc.defaultView.MutationObserver(records=>{
      for(const record of records){
        if(record.type==='characterData'){
          const root=record.target.parentElement?.closest(addonUiSelector);if(root)localizeAddonRoot(root);
        }else if(record.type==='attributes'){
          const root=record.target.closest?.(addonUiSelector);if(root)localizeAddonRoot(root);
        }else for(const added of record.addedNodes)if(added.nodeType===1){
          if(added.matches?.(addonUiSelector))localizeAddonRoot(added);
          for(const root of added.querySelectorAll?.(addonUiSelector)||[])localizeAddonRoot(root);
          const parent=added.closest?.(addonUiSelector);if(parent)localizeAddonRoot(parent);
        }
      }
    });
    observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
  };
  const applyLanguage=language=>{uiLanguage=['en','el'].includes(language)?language:'pl';try{localStorage.setItem(LANGUAGE_KEY,uiLanguage)}catch(error){}for(const doc of getDocs())installLocalization(doc);if(languagePicker)languagePicker.value=uiLanguage;if(colossusPromptCheckbox){const label=colossusPromptCheckbox.parentElement?.querySelector('span');if(label)label.textContent=translateUiString('Włącz okno zbiórki na kolosa')}if(themeStatus)themeStatus.textContent=uiLanguage==='en'?'Language saved.':uiLanguage==='el'?'Η γλώσσα αποθηκεύτηκε.':'Język zapisany.'};
  const visible=el=>{const r=el.getBoundingClientRect(),s=el.ownerDocument.defaultView.getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
  const CHAT_ROOT_SELECTORS='.chat-tpl,[data-section="chat"],#chatbox,#chat,#chatWindow,.chat-window,.chat-panel,.chat';
  const isExcludedChatArea=el=>{for(let node=el;node&&node.nodeType===1;node=node.parentElement){const signature=`${node.id||''} ${typeof node.className==='string'?node.className:''} ${node.getAttribute?.('aria-label')||''} ${node.getAttribute?.('title')||''} ${node.getAttribute?.('placeholder')||''}`.toLowerCase();if(/minimap|mini-map|mapsearch|map-search|search|wyszuk|lootlog|inventory|market|auction|marketplace/.test(signature))return true}return false};
  const chatFieldMatches=el=>{if(!el||el.nodeType!==1||isLootlogElement(el))return false;if(CHAT_SELECTORS.some(selector=>{try{return el.matches(selector)}catch(error){return false}}))return true;const editable=el.isContentEditable||el.getAttribute('role')==='textbox';return !!editable&&!!el.closest('.chat-tpl,[data-section="chat"],#chatbox,#chat,#chatWindow,.chat-window,.chat-panel,.chat')};
  const chatFieldText=el=>String(el?.isContentEditable?el.textContent:el?.value||'').trim();
  const installPartyOnlyGuard=()=>{
    for(const doc of getDocs()){
      if(doc.documentElement?.dataset.mkPartyOnlyGuard==='1')continue;doc.documentElement.dataset.mkPartyOnlyGuard='1';
      const readField=event=>{let field=event.target?.nodeType===1?(event.target.matches?.('input,textarea,[contenteditable="true"],[role="textbox"]')?event.target:event.target.closest?.('input,textarea,[contenteditable="true"],[role="textbox"]')):null;if(!chatFieldMatches(field))field=doc.activeElement;if(!chatFieldMatches(field))return null;return field};
      const blockNonParty=event=>{const field=readField(event);if(!field)return;const message=chatFieldText(field);if(/^\/p\s+\S[\s\S]*$/i.test(message))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(chatStatus)chatStatus.textContent='Blokada czatu: dozwolone są tylko wiadomości zaczynające się od /p.'};
      doc.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey)blockNonParty(event)},true);
      doc.addEventListener('keypress',event=>{if(event.key==='Enter'&&!event.shiftKey)blockNonParty(event)},true);
      doc.addEventListener('keyup',event=>{if(event.key==='Enter'&&!event.shiftKey)blockNonParty(event)},true);
      doc.addEventListener('submit',event=>{const form=event.target;if(!form?.querySelector)return;const fields=[...form.querySelectorAll('input,textarea,[contenteditable="true"],[role="textbox"]')],field=fields.find(chatFieldMatches);if(!field)return;if(!/^\/p\s+\S[\s\S]*$/i.test(chatFieldText(field))){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(chatStatus)chatStatus.textContent='Blokada czatu: dozwolone są tylko wiadomości zaczynające się od /p.'}},true);
    }
  };
  const findChatInput=()=>{
    let best=null,bestScore=-Infinity;for(const doc of getDocs()){if(isLootlogDocument(doc))continue;const candidates=new Set();for(const selector of CHAT_SELECTORS)for(const el of doc.querySelectorAll(selector))candidates.add(el);for(const el of doc.querySelectorAll('input:not([type="hidden"]),textarea,[contenteditable],[role="textbox"]'))candidates.add(el);
      for(const el of candidates){if(isLootlogElement(el)||!visible(el)||el.disabled||el.readOnly)continue;const r=el.getBoundingClientRect(),hint=[el.placeholder,el.getAttribute('aria-label'),el.title,el.id,el.className].filter(Boolean).join(' ').toLowerCase(),near=(el.parentElement?.parentElement?.className||'').toString().toLowerCase();let score=0;if(/chat|czat|wiadomo/.test(hint))score+=100;if(/chat|czat/.test(near))score+=40;if(/^chat(in|input)$/i.test(el.id))score+=35;if(r.bottom>doc.documentElement.clientHeight*.65)score+=25;if(r.left<doc.documentElement.clientWidth*.25)score+=70;else if(r.left>doc.documentElement.clientWidth*.4)score-=35;const root=chatRoot(el),rr=root.getBoundingClientRect();if(rr.width>=145&&rr.width<=430)score+=25;if(rr.left<doc.documentElement.clientWidth*.25)score+=65;if(rr.height>doc.documentElement.clientHeight*.45)score+=20;if(score>bestScore){best=el;bestScore=score}}
    }return bestScore>=35?best:null;
  };
  const chatRoot=field=>{
    const selectors=['.chat-tpl',"[data-section='chat']",'#chatbox','#chat','#chatWindow','.chat-window','.chat-panel','.chat'];let best=null,bestScore=-Infinity;for(const selector of selectors){const root=field.closest(selector);if(!root)continue;const r=root.getBoundingClientRect(),w=field.ownerDocument.defaultView;let score=Math.min(r.height,900)/10;if(r.width>=145&&r.width<=430)score+=50;if(r.left<w.innerWidth*.25)score+=100;else score-=80;if(r.height>w.innerHeight*.45)score+=40;if(score>bestScore){best=root;bestScore=score}}
    if(best)return best;let node=field,last=field.parentElement;for(let i=0;i<10&&node.parentElement;i++){node=node.parentElement;const r=node.getBoundingClientRect();if(r.width>=145&&r.width<=430&&r.height>=150&&r.left<node.ownerDocument.defaultView.innerWidth*.3)last=node}return last||field.ownerDocument.body;
  };
  const findChatRoot=()=>{
    const selectors=['#chatbox','#chatWindow','#chat','.chat-window','.chat-panel','.chat-tpl','[data-section="chat"]','.chat'];let best=null,bestScore=-Infinity;
    for(const doc of getDocs()){if(isLootlogDocument(doc))continue;const candidates=new Set();for(const selector of selectors)for(const el of doc.querySelectorAll(selector))candidates.add(el);
      for(const root of candidates){if(!visible(root)||isLootlogElement(root)||isExcludedChatArea(root))continue;const r=root.getBoundingClientRect();if(r.width<110||r.height<55)continue;const text=(root.textContent||'').toLowerCase();const input=root.querySelector('input,textarea,[contenteditable],[role="textbox"]');const hint=input?[input.placeholder,input.getAttribute('aria-label'),input.title,input.id].filter(Boolean).join(' ').toLowerCase():'';const explicit=root.querySelector('#chatIn,#chat-input,#chatInput,.chat-tpl input,.chat-tpl textarea,[data-section="chat"] input,[data-section="chat"] textarea');let score=0;if(root.matches('#chatbox,#chatWindow,#chat'))score+=125;if(root.matches('.chat-window,.chat-panel,.chat-tpl,[data-section="chat"]'))score+=100;if(/^chat(in|input)$/i.test(input?.id||''))score+=180;if(explicit)score+=130;if(/press enter to chat|chat|czat|wiadomo/.test(hint))score+=120;if(/press enter to chat/.test(text))score+=130;if(/global|party|guild|world/.test(text))score+=30;if(r.width>=120&&r.width<=600)score+=20;if(r.bottom>doc.documentElement.clientHeight*.55)score+=25;if(r.left<doc.documentElement.clientWidth*.4)score+=25;if(score>bestScore){best=root;bestScore=score}}
    }
    if(bestScore>=100)return best;
    // Margonem can render “press enter to chat” as a decorative text node instead of an input.
    for(const doc of getDocs()){if(isLootlogDocument(doc)||!doc.body)continue;const view=doc.defaultView;const walker=doc.createTreeWalker(doc.body,view.NodeFilter.SHOW_TEXT);let textNode;
      while((textNode=walker.nextNode())){if(!/press enter to chat/i.test(textNode.nodeValue||''))continue;let node=textNode.parentElement;
        for(let depth=0;node&&depth<9;depth++,node=node.parentElement){if(node.id===CHAT_PANEL_ID)continue;const r=node.getBoundingClientRect();if(r.width<110||r.width>700||r.height<55||r.left>view.innerWidth*.45||r.bottom<view.innerHeight*.45)continue;let blocked=false;for(let part=textNode.parentElement;part;part=part.parentElement){const signature=`${part.id||''} ${typeof part.className==='string'?part.className:''} ${part.getAttribute?.('aria-label')||''} ${part.getAttribute?.('title')||''}`.toLowerCase();if(/minimap|mini-map|mapsearch|map-search|search|wyszuk|lootlog|inventory|market|auction|marketplace/.test(signature)){blocked=true;break}if(part===node)break}if(blocked)continue;if(visible(node))return node}
      }
    }
    return null;
  };
  const dockChatPanel=(panel,field,rootOverride)=>{
    if(!panel||!field?.isConnected)return;const root=chatRoot(field),anchor=field.closest('.input-wrapper')||field,parent=anchor.parentElement||root;
    if(!root.contains(anchor)){if(panel.parentElement!==root||panel!==root.lastElementChild)root.appendChild(panel)}else if(panel.parentElement!==parent||panel.nextSibling!==anchor)parent.insertBefore(panel,anchor);
    panel.style.position='relative';panel.style.left='';panel.style.top='';panel.style.width='100%';panel.style.maxWidth='100%';panel.style.margin='5px 0';
  };
  const removeChatPanels=()=>{for(const doc of getDocs())doc.getElementById(CHAT_PANEL_ID)?.remove();chatPanel=chatGrid=chatStatus=chatInput=null};
  const sendToParty=label=>{
    const field=chatInput?.isConnected&&!isLootlogElement(chatInput)?chatInput:findChatInput();if(!field){if(chatStatus)chatStatus.textContent='Nie znaleziono czatu gry. Otwórz czat Margonem i spróbuj ponownie.';return}
    const current=field.isContentEditable?field.textContent:field.value;if(String(current||'').trim()){if(chatStatus)chatStatus.textContent='Wyczyść szkic w czacie przed wyborem łupu.';field.focus();return}
    const message=`/p Klepię: ${label}`;field.focus();
    if(field.isContentEditable||field.getAttribute('role')==='textbox')field.textContent=message;else{const w=field.ownerDocument.defaultView,p=field instanceof w.HTMLTextAreaElement?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype,set=Object.getOwnPropertyDescriptor(p,'value')?.set;if(set)set.call(field,message);else field.value=message}
    const w=field.ownerDocument.defaultView;field.dispatchEvent(new w.Event('input',{bubbles:true}));field.dispatchEvent(new w.Event('change',{bubbles:true}));const opts={key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true};field.dispatchEvent(new w.KeyboardEvent('keydown',opts));field.dispatchEvent(new w.KeyboardEvent('keyup',opts));if(chatStatus)chatStatus.textContent=`Wysłano na czat grupowy: ${label}`;
  };
  const renderItems=(titan)=>{
    if(chatGrid.dataset.titan===titan.id)return;chatGrid.dataset.titan=titan.id;chatGrid.replaceChildren();
    let selected=-1;try{selected=Number(localStorage.getItem(SELECTED_KEY+titan.id))}catch(error){}
    titan.items.forEach((item,index)=>{const button=chatGrid.ownerDocument.createElement('button');button.type='button';button.className='mk-tl-item';button.title=`${item.type}: ${item.name} (legendarny)`;button.setAttribute('aria-label',button.title);if(index===selected)button.classList.add('selected');const icon=chatGrid.ownerDocument.createElement('span');icon.className='mk-tl-icon';icon.style.backgroundImage=`url("https://micc.garmory-cdn.cloud/obrazki/itemy/${item.icon}")`;const label=chatGrid.ownerDocument.createElement('span');label.className='mk-tl-label';label.textContent=item.label||`${item.type}: ${item.name}`;button.append(icon,label);button.addEventListener('click',()=>{chatGrid.querySelectorAll('.mk-tl-item').forEach(x=>x.classList.remove('selected'));button.classList.add('selected');try{localStorage.setItem(SELECTED_KEY+titan.id,String(index))}catch(error){}sendToParty(item.label||`${item.type} — ${item.name}`)});chatGrid.appendChild(button)});
    chatStatus.textContent='Kliknij przedmiot, aby zgłosić go na /p.';
  };
  const mountChatPanel=(titan,field,root)=>{
    const doc=(root||field)?.ownerDocument;if(!doc||!root)return;
    // Czat może działać w ramce; style muszą wtedy trafić do tego samego dokumentu.
    if(doc!==document&&!doc.getElementById(style.id)){const frameStyle=style.cloneNode(true);doc.head?.appendChild(frameStyle)}
    let existing=doc.getElementById(CHAT_PANEL_ID);
    if(existing&&existing.dataset.titan===titan.id){chatPanel=existing;chatGrid=existing.querySelector('.mk-tl-grid');chatStatus=existing.querySelector('.mk-tl-status');chatInput=field;dockChatPanel(existing,field,root);return}
    removeChatPanels();const panel=doc.createElement('section');panel.id=CHAT_PANEL_ID;panel.dataset.titan=titan.id;panel.innerHTML='<header class="mk-tl-header"><span class="mk-tl-title"></span><span class="mk-tl-head-right"><span class="mk-tl-map"></span><button type="button" class="mk-tl-collapse" title="Zwiń panel" aria-label="Zwiń panel">−</button></span></header><div class="mk-tl-body"><div class="mk-tl-hint">Kliknij legendarny przedmiot, aby zgłosić go na czacie grupowym:</div><div class="mk-tl-grid"></div><div class="mk-tl-status"></div></div>';
    panel.querySelector('.mk-tl-title').textContent=titan.id==='tanroth'?'Łup z Tanrotha':`Łup: ${titan.name}`;panel.querySelector('.mk-tl-map').textContent=titan.map;
    let collapsed=false;try{collapsed=localStorage.getItem(COLLAPSED_KEY)==='1'}catch(error){}panel.classList.toggle('is-collapsed',collapsed);const collapse=panel.querySelector('.mk-tl-collapse');collapse.textContent=collapsed?'+':'−';collapse.title=collapsed?'Rozwiń panel':'Zwiń panel';collapse.addEventListener('click',()=>{const value=!panel.classList.contains('is-collapsed');panel.classList.toggle('is-collapsed',value);collapse.textContent=value?'+':'−';collapse.title=value?'Rozwiń panel':'Zwiń panel';try{localStorage.setItem(COLLAPSED_KEY,value?'1':'0')}catch(error){}});
    chatPanel=panel;chatGrid=panel.querySelector('.mk-tl-grid');chatStatus=panel.querySelector('.mk-tl-status');chatInput=field;renderItems(titan);dockChatPanel(panel,field,root);
  };
  const updateChatPanel=()=>{
    const titan=findTitan();currentTitan=titan;if(!enabled||!titan){removeChatPanels();return}
    const field=findChatInput();if(!field){removeChatPanels();return}mountChatPanel(titan,field,chatRoot(field));
  };
  const setLootEnabled=value=>{enabled=!!value;try{localStorage.setItem(ENABLED_KEY,enabled?'1':'0')}catch(error){}if(settingsStatus)settingsStatus.textContent=enabled?'Panel łupu przy czacie jest włączony.':'Panel łupu przy czacie jest wyłączony i ustawienie zostanie zapamiętane.';if(settingCheckbox)settingCheckbox.checked=enabled;updateChatPanel()};

  const applyBackground=(preset,notify=true)=>{if(!BACKGROUND_PRESETS[preset])return;backgroundPreset=preset;const gradient=BACKGROUND_PRESETS[preset].value;for(const doc of getDocs()){for(const selector of [`#${PANEL_ID}`,`#${CHAT_PANEL_ID}`,'#mk-hub','#mk-party-floating','#heroes-colossus-call','#heroes-popup','.heroes-discord__setup'])for(const el of doc.querySelectorAll(selector))el.style.setProperty('background',gradient,'important');for(const el of doc.querySelectorAll('.heroes-discord__background'))el.style.setProperty('background','transparent','important')}try{localStorage.setItem(BACKGROUND_KEY,preset)}catch(error){}window.__mkPersistAddonSettings?.();if(backgroundPicker)backgroundPicker.value=preset;if(notify&&themeStatus)themeStatus.textContent=uiLanguage==='en'?'Background saved.':uiLanguage==='el'?'Το φόντο αποθηκεύτηκε.':'Tło dodatku zapisane.'};
  const applyTheme=color=>{if(!/^#[0-9a-f]{6}$/i.test(color||''))return;themeColor=color;for(const doc of getDocs()){doc.documentElement?.style.setProperty('--mkhd-addon-theme',themeColor);for(const el of doc.querySelectorAll(`#${PANEL_ID},#${CHAT_PANEL_ID},#mk-hub,#mk-party-floating,#heroes-colossus-call,#heroes-popup,.heroes-discord__setup,.mk-leg-settings`))el.style.setProperty('--mkhd-addon-theme',themeColor)}try{localStorage.setItem(THEME_KEY,themeColor)}catch(error){}window.__mkPersistAddonSettings?.();if(themePicker)themePicker.value=themeColor;if(themeStatus)themeStatus.textContent=`Kolor zestawu zapisany: ${themeColor}.`};
  window.__mkApplyAddonAppearance=()=>{applyTheme(themeColor);applyBackground(backgroundPreset,false)};
  const setColossusPromptEnabled=value=>{colossusPromptEnabled=!!value;try{localStorage.setItem(COLOSSUS_PROMPT_ENABLED_KEY,colossusPromptEnabled?'1':'0')}catch(error){}if(colossusPromptCheckbox)colossusPromptCheckbox.checked=colossusPromptEnabled;window.dispatchEvent(new CustomEvent('mk-colossus-prompt-toggle',{detail:{enabled:colossusPromptEnabled}}))};
  const setOnlineRangesEnabled=value=>{onlineRangesEnabled=!!value;try{localStorage.setItem('mkOnlineRangesEnabled',onlineRangesEnabled?'1':'0')}catch(error){}if(onlineRangesCheckbox)onlineRangesCheckbox.checked=onlineRangesEnabled;window.dispatchEvent(new CustomEvent('mk-online-ranges-toggle',{detail:{enabled:onlineRangesEnabled}}))};
  const leaveSettings=()=>{
    if(!settingsSnapshot)return;const p=settingsSnapshot.panel;p.classList.remove('mk-titan-loot-settings-active');delete p.dataset.mkSettingsView;if(settingsSnapshot.discord)p.classList.add('mk-discord-view');else p.classList.remove('mk-discord-view');
    if(settingsSnapshot.width)p.style.setProperty('width',settingsSnapshot.width,settingsSnapshot.widthPriority);else p.style.removeProperty('width');
    for(const [el,value,priority] of settingsSnapshot.hidden){if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display')}
    for(const [el,wasActive] of settingsSnapshot.tabs)el.classList.toggle('active',wasActive);
    settingsView.style.display='none';if(themeView)themeView.style.display='none';if(notifierView)notifierView.style.display='none';if(eventView)eventView.style.display='none';activeSettingsTab=null;settingsSnapshot=null;
  };
  const enterSettings=(targetView=settingsView,targetTab=settingsTab)=>{
    const p=document.getElementById(PANEL_ID)||window.__mkLegacyRangesPanel;if(!p)return;const tabs=p.querySelector('.mk-addon-tabs');if(!tabs)return;
    if(settingsSnapshot){leaveSettings();return}
    settingsSnapshot={panel:p,discord:p.classList.contains('mk-discord-view'),width:p.style.getPropertyValue('width'),widthPriority:p.style.getPropertyPriority('width'),hidden:[...p.querySelectorAll('.mk-body,.mk-config,.mk-addon-slot,.mk-footer')].map(el=>[el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]),tabs:[...p.querySelectorAll('.mk-addon-tab')].map(el=>[el,el.classList.contains('active')])};
    p.classList.remove('mk-discord-view');p.classList.add('mk-titan-loot-settings-active');p.dataset.mkSettingsView=targetView===themeView?'theme':targetView===notifierView?'notifier':targetView===eventView?'event':'loot';p.style.setProperty('width','min(390px,calc(100vw - 16px))','important');for(const [el] of settingsSnapshot.hidden)el.style.setProperty('display','none','important');for(const [el] of settingsSnapshot.tabs)el.classList.toggle('active',el===targetTab);activeSettingsTab=targetTab;settingsView.style.display=targetView===settingsView?'block':'none';if(themeView)themeView.style.display=targetView===themeView?'block':'none';if(notifierView)notifierView.style.display=targetView===notifierView?'block':'none';if(eventView)eventView.style.display=targetView===eventView?'block':'none';if(targetView===settingsView){settingCheckbox.checked=enabled;settingsStatus.textContent=enabled?'Panel łupu przy czacie jest włączony.':'Panel łupu przy czacie jest wyłączony i ustawienie zostanie zapamiętane.'}else if(targetView===themeView){themePicker.value=themeColor;themeStatus.textContent=`Aktualny kolor zestawu: ${themeColor}.`}else if(targetView===notifierView){window.__legNotifierRefreshUI?.()}else if(targetView===eventView){window.__heroesDiscordRefreshEventSettings?.()}
    requestAnimationFrame(()=>{const r=p.getBoundingClientRect();p.style.setProperty('left',`${Math.max(0,Math.min(r.left,innerWidth-r.width))}px`,'important')});
  };
  const ensureSettingsTab=()=>{
    const p=document.getElementById(PANEL_ID)||window.__mkLegacyRangesPanel;if(!p)return;const tabs=p.querySelector('.mk-addon-tabs');if(!tabs)return;
    let tab=p.querySelector(`#${TAB_ID}`);let view=p.querySelector(`#${SETTINGS_ID}`);
    if(!tab){tab=document.createElement('button');tab.id=TAB_ID;tab.className='mk-tool-btn mk-addon-tab';tab.dataset.mkLoot='1';tab.textContent='Łup';tab.title='Ustawienia panelu łupu'}
    if(tab.parentElement!==tabs)tabs.appendChild(tab);settingsTab=tab;
    if(!tab.dataset.mkLootBound){tab.dataset.mkLootBound='1';tab.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();enterSettings()})}
    if(!tabs.dataset.mkLootBound){tabs.dataset.mkLootBound='1';tabs.addEventListener('click',event=>{if(settingsSnapshot&&event.target.closest('.mk-addon-tab')!==activeSettingsTab)leaveSettings()},true)}
    const collapse=p.querySelector('.mk-collapse-btn');if(collapse&&!collapse.dataset.mkLootBound){collapse.dataset.mkLootBound='1';collapse.addEventListener('click',()=>{if(settingsSnapshot)leaveSettings()},true)}
    if(!view){view=document.createElement('section');view.id=SETTINGS_ID;view.innerHTML='<h3 class="mk-tl-settings-title">Ustawienia łupu</h3><label class="mk-tl-toggle"><input type="checkbox"><span>Włącz panel łupu przy czacie</span></label><p class="mk-tl-description">Panel z legendarnymi dropami pojawia się przy czacie na mapie tytana. Kliknięcie przedmiotu wysyła zgłoszenie na czat grupowy.</p><div class="mk-tl-settings-status"></div>';p.appendChild(view)}
    settingsView=view;settingCheckbox=view.querySelector('input');settingsStatus=view.querySelector('.mk-tl-settings-status');settingCheckbox.checked=enabled;if(!settingCheckbox.dataset.mkLootBound){settingCheckbox.dataset.mkLootBound='1';settingCheckbox.addEventListener('change',()=>setLootEnabled(settingCheckbox.checked))}
    let colorTab=p.querySelector(`#${THEME_TAB_ID}`);if(!colorTab){colorTab=document.createElement('button');colorTab.id=THEME_TAB_ID;colorTab.className='mk-tool-btn mk-addon-tab';colorTab.textContent='Ustawienia';colorTab.title='Ustawienia wyglądu zestawu'}if(colorTab.parentElement!==tabs)tabs.appendChild(colorTab);themeTab=colorTab;
    if(!colorTab.dataset.mkThemeBound){colorTab.dataset.mkThemeBound='1';colorTab.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();enterSettings(themeView,themeTab)})}
    let colorView=p.querySelector(`#${THEME_SETTINGS_ID}`);if(!colorView){colorView=document.createElement('section');colorView.id=THEME_SETTINGS_ID;colorView.innerHTML='<h3 class="mk-tl-settings-title">Wygląd zestawu</h3><label class="mk-tl-toggle"><input type="checkbox" class="mk-colossus-prompt-toggle"><span>Włącz okno zbiórki na kolosa</span></label><p class="mk-tl-description">Wyłącza wyskakujące okno zbiórki na przedsionkach kolosów.</p><label class="mk-tl-toggle"><input type="checkbox" class="mk-online-ranges-toggle"><span>Włącz Przedziały Online</span></label><p class="mk-tl-description">Wyłącza panel przedziałów oraz powiadomienia Discord z tego dodatku.</p><label class="mk-tl-language-row"><span>Język dodatku</span><select class="mk-tl-language"><option value="pl">Polski</option><option value="en">English</option><option value="el">Ελληνικά</option></select></label><label class="mk-tl-color-row" style="margin-top:10px"><input type="color" aria-label="Wybierz kolor dodatku"><span>Kolor przewodni całego zestawu</span></label><label class="mk-tl-background-row"><span>Tło dodatku</span><select class="mk-tl-background"><option value="midnight">Nocny fiolet</option><option value="aurora">Zorza polarna</option><option value="ocean">Głęboki ocean</option><option value="emerald">Szmaragd</option><option value="sunset">Zachód słońca</option></select></label><p class="mk-tl-description">Wybrany kolor obejmuje panel, oba okna powiadomień, zakładki i panel łupu.</p><p class="mk-tl-description">Tło obejmuje główny panel, okna alertów i ustawienia Discorda.</p><div class="mk-tl-shortcut-row"><span>Skrót otwierania dodatku</span><button type="button" class="mk-tl-shortcut-button"></button></div><p class="mk-tl-description">Kliknij przycisk i naciśnij nowy skrót. Escape anuluje zmianę.</p><div class="mk-tl-settings-status"></div>';p.appendChild(colorView)}themeView=colorView;themePicker=colorView.querySelector('input[type="color"]');backgroundPicker=colorView.querySelector('.mk-tl-background');themeStatus=colorView.querySelector('.mk-tl-settings-status');themeShortcutButton=colorView.querySelector('.mk-tl-shortcut-button');colossusPromptCheckbox=colorView.querySelector('.mk-colossus-prompt-toggle');onlineRangesCheckbox=colorView.querySelector('.mk-online-ranges-toggle');onlineRangesCheckbox.checked=onlineRangesEnabled;if(!onlineRangesCheckbox.dataset.mkRangesBound){onlineRangesCheckbox.dataset.mkRangesBound='1';onlineRangesCheckbox.addEventListener('change',()=>setOnlineRangesEnabled(onlineRangesCheckbox.checked))}languagePicker=colorView.querySelector('.mk-tl-language');colossusPromptCheckbox.checked=colossusPromptEnabled;languagePicker.value=uiLanguage;if(!colossusPromptCheckbox.dataset.mkColossusPromptBound){colossusPromptCheckbox.dataset.mkColossusPromptBound='1';colossusPromptCheckbox.addEventListener('change',()=>setColossusPromptEnabled(colossusPromptCheckbox.checked))}if(!languagePicker.dataset.mkLanguageBound){languagePicker.dataset.mkLanguageBound='1';languagePicker.addEventListener('change',()=>applyLanguage(languagePicker.value))}updateShortcutButton();if(!themeShortcutButton.dataset.mkShortcutBound){themeShortcutButton.dataset.mkShortcutBound='1';themeShortcutButton.addEventListener('click',()=>{capturingToggleShortcut=true;updateShortcutButton()})}themePicker.value=themeColor;backgroundPicker.value=backgroundPreset;if(!backgroundPicker.dataset.mkBackgroundBound){backgroundPicker.dataset.mkBackgroundBound='1';backgroundPicker.addEventListener('change',()=>applyBackground(backgroundPicker.value))}if(!themePicker.dataset.mkThemeBound){themePicker.dataset.mkThemeBound='1';themePicker.addEventListener('input',()=>applyTheme(themePicker.value));themePicker.addEventListener('change',()=>applyTheme(themePicker.value))}let nTab=p.querySelector(`#${NOTIFIER_TAB_ID}`);if(!nTab){nTab=document.createElement('button');nTab.id=NOTIFIER_TAB_ID;nTab.className='mk-tool-btn mk-addon-tab';nTab.textContent='Notyfikator';nTab.title='Ustawienia notyfikatora legend'}if(nTab.parentElement!==tabs)tabs.appendChild(nTab);notifierTab=nTab;if(!nTab.dataset.mkNotifierBound){nTab.dataset.mkNotifierBound='1';nTab.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();enterSettings(notifierView,notifierTab)})}let nView=p.querySelector(`#${NOTIFIER_SETTINGS_ID}`);if(!nView){nView=document.createElement('section');nView.id=NOTIFIER_SETTINGS_ID;p.appendChild(nView)}notifierView=nView;if(window.__legNotifierAttach)window.__legNotifierAttach(notifierView);p.querySelector(`#${EVENT_TAB_ID}`)?.remove();p.querySelector(`#${EVENT_SETTINGS_ID}`)?.remove();eventTab=null;eventView=null;window.__heroesDiscordRefreshEventSettings=undefined;window.__heroesDiscordSetEventAlerts=value=>{settings.eventAlertsEnabled=!!value};window.__heroesDiscordOpenLegendSettings=()=>{const panel=document.getElementById(PANEL_ID)||window.__mkLegacyRangesPanel;if(!panel)return;setTimeout(()=>{if(settingsSnapshot)leaveSettings();enterSettings(notifierView,notifierTab)},0)};installLocalization(document);
  };
(function () {
  'use strict';

  /* ---------- USTAWIENIA ---------- */
  const KEY = 'moj_notyfikator_fx';
  const DEFAULTS = {
    effect: 'purple', // 'purple' | 'electric' | 'gold' | 'sparkle' | 'lightning' | 'neon' | 'glow' | 'all' | 'random'
    color: '#b44cff', // kolor glow i iskier
    duration: 12, // ile sekund trwa animacja
    sound: true,
    soundUrl: '', // link do mp3
    volume: 0.5,
    alert: '[color=red]LEGENDA!!![/color] [color=white]{leg}[/color]'
  };
  let cfg = { ...DEFAULTS };
  try { cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}

  // zmiana ustawień z konsoli, np.: legCfg({effect:'lightning'})
  window.legCfg = (o) => {
    Object.assign(cfg, o);
    localStorage.setItem(KEY, JSON.stringify(cfg));
    document.documentElement.style.setProperty('--legc', cfg.color);
    return cfg;
  };
  document.documentElement.style.setProperty('--legc', cfg.color);

  /* ---------- CSS ---------- */
  const style = document.createElement('style');
  style.textContent = `
    #leg-fx { position: fixed; pointer-events: none; z-index: 9999; display: none; }
    #leg-fx.on { display: block; animation: legpulse 1.6s ease-in-out infinite; }
    #leg-fx.crisp { border: 2px solid var(--fxb, #fff); box-sizing: border-box; }
    #leg-fx canvas { position: absolute; left: 0; top: 0; }
    @keyframes legpulse {
      0%, 100% { box-shadow: inset 0 0 var(--gb1, 90px) var(--gs1, 8px) var(--fx); }
      50%      { box-shadow: inset 0 0 var(--gb2, 40px) var(--gs2, 1px) var(--fx); }
    }
    .loot-wnd:has([data-item-type="t-leg"]) {
      outline: 2px solid #ffffffcc;
      animation: legloot 1.3s ease-in-out infinite alternate;
    }
    @keyframes legloot {
      from { box-shadow: 0 0 6px 2px #fff, 0 0 20px 6px var(--legc, #b44cff), 0 0 42px 10px var(--legc, #b44cff); }
      to   { box-shadow: 0 0 10px 3px #fff, 0 0 32px 10px var(--legc, #b44cff), 0 0 64px 18px var(--legc, #b44cff); }
    }
  `;
  document.head.appendChild(style);
  const panelStyle = document.createElement('style');
  panelStyle.textContent = `.mk-leg-settings{margin:12px 0 2px;padding:12px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 38%,rgba(148,163,184,.2));border-radius:10px;background:linear-gradient(160deg,color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 13%,rgba(36,31,64,.82)),rgba(14,18,34,.88));color:#e7edf8;font:12px/1.45 Inter,ui-sans-serif,system-ui,\"Segoe UI\",sans-serif}.mk-leg-title{margin:0 0 3px;color:#f4f0ff;font-size:13px;font-weight:700}.mk-leg-copy,.mk-leg-note{margin:0 0 9px;color:#aeb8cc;font-size:10px}.mk-leg-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;color:#e8eaff}.mk-leg-row select,.mk-leg-settings input[type=text],.mk-leg-alert textarea{min-width:0;padding:6px 8px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 44%,rgba(148,163,184,.25));border-radius:7px;background:#0b1220;color:#f8fafc;font:11px Inter,ui-sans-serif,system-ui,sans-serif}.mk-leg-row select{max-width:62%}.mk-leg-row input[type=range]{width:47%;accent-color:var(--mkhd-addon-theme,#6366f1)}.mk-leg-row input[type=color]{width:38px;height:29px;padding:2px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:#0b1220}.mk-leg-toggle{display:flex;align-items:center;gap:8px;margin:8px 0;color:#e8eaff}.mk-leg-toggle input{accent-color:var(--mkhd-addon-theme,#6366f1)}.mk-leg-alert{display:flex;flex-direction:column;gap:5px;margin:8px 0;color:#e8eaff}.mk-leg-alert small{display:block;color:#aeb8cc;font-size:9px}.mk-leg-alert textarea{box-sizing:border-box;width:100%;height:52px;resize:vertical}.mk-leg-actions{display:flex;gap:7px;margin-top:9px}.mk-leg-actions button,.mk-leg-reset{padding:7px 9px;border:1px solid color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 55%,rgba(129,140,248,.28));border-radius:7px;background:color-mix(in srgb,var(--mkhd-addon-theme,#6366f1) 25%,rgba(2,6,23,.55));color:#fff;font:600 11px Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer}.mk-leg-actions button{flex:1}.mk-leg-actions button:hover,.mk-leg-reset:hover{filter:brightness(1.18)}.mk-leg-reset{width:100%;margin-top:7px;background:rgba(15,23,42,.75)}.mk-leg-note{margin:8px 0 0}`;
  document.head.appendChild(panelStyle);

  /* ---------- OVERLAY ---------- */
  let overlay, canvas, ctx, raf, stopAt = 0, startAt = 0, tick = 0, seenLoot = false, effect = 'sparkle';
  let particles = [], bolts = [], comet = null, streaks = [], elecPaths = [], dots = [], sprite = null;
  let parts = new Set(), fxColor = '#b44cff', cx = 0, cy = 0, lootR = 90, lastElec = 0;
  let burstAt = 0;
  let neighborSprites = [];
  const NEIGHBOR_HEAD_DATA = [
    'data:image/webp;base64,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',
    'data:image/webp;base64,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'
  ];
  const NEIGHBOR_HEADS = NEIGHBOR_HEAD_DATA.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'leg-fx';
    canvas = document.createElement('canvas');
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    ctx = canvas.getContext('2d');
  }

  function fitOverlay() {
    const candidates = [
      document.querySelector('.map-overlay.filter-map-night'),
      document.getElementById('GAME_CANVAS')
    ];
    let r = { left: 0, top: 0, width: innerWidth, height: innerHeight };
    for (const el of candidates) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 100 && b.height > 100) { r = b; break; }
    }
    console.log('[notyfikator] obszar animacji:', Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height));
    Object.assign(overlay.style, {
      left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'
    });
    canvas.width = Math.max(1, Math.round(r.width));
    canvas.height = Math.max(1, Math.round(r.height));
  }

  /* ---------- CZĄSTKI / KOMETA ---------- */
  function borderPoint(w, h) {
    const side = (Math.random() * 4) | 0;
    if (side === 0) return [Math.random() * w, 0];
    if (side === 1) return [w, Math.random() * h];
    if (side === 2) return [Math.random() * w, h];
    return [0, Math.random() * h];
  }

  function spawnSparkle(w, h) {
    const [x, y] = borderPoint(w, h);
    const a = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5);
    const s = 0.5 + Math.random() * 1.5;
    const big = Math.random() < 0.07;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 1, decay: 0.008 + Math.random() * 0.012,
      r: big ? 2.4 + Math.random() * 1.2 : 0.7 + Math.random() * 1.7, glint: big
    });
  }

  function startComet(w, h) {
    comet = { t: 0, w, h, y0: Math.random() * h, y1: Math.random() * h, amp: 40 + Math.random() * 80 };
  }

  function cometStep() {
    if (!comet) return;
    comet.t += 0.012;
    if (comet.t > 1) { comet = null; return; }
    const { t, w, y0, y1, amp } = comet;
    const x = t * w;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 3) * amp;
    for (let i = 0; i < 4; i++) {
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
        life: 1, decay: 0.015 + Math.random() * 0.02, r: 0.8 + Math.random() * 2
      });
    }
  }

  // miękki, świecący punkt (biały środek + kolorowa poświata) rysowany jako sprite – dużo szybsze niż shadowBlur
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1, 7), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function makeSprite(color) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.2, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.4, hexA(color, 0.6));
    gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  function drawParticles() {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
      const sz = p.r * 5 * (0.45 + 0.55 * p.life);
      ctx.globalAlpha = Math.min(1, p.life * 1.2);
      ctx.drawImage(sprite, p.x - sz / 2, p.y - sz / 2, sz, sz);
      if (p.glint && p.life > 0.3) {
        const len = sz * 1.3;
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillRect(p.x - len, p.y - 0.5, len * 2, 1);
        ctx.fillRect(p.x - 0.5, p.y - len, 1, len * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- ZŁOTY ROZBŁYSK PROMO ---------- */
  function drawPromoReveal(now) {
    const elapsed = now - burstAt;
    if (elapsed < 0 || elapsed > 5400) return;
    const fade = Math.min(1, elapsed / 90) * Math.pow(Math.max(0, 1 - elapsed / 5400), 1.25);
    const maxR = Math.hypot(canvas.width, canvas.height) * 0.78;
    const pulse = 1 - Math.exp(-elapsed / 110);

    // Szerokie promienie rozchodzą się zza łupu jak w animacji z filmu.
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI * 2 / 48 + elapsed * 0.00011;
      const inner = lootR * (0.7 + 0.16 * pulse);
      const outer = maxR * (0.78 + 0.22 * Math.sin(i * 7.1) ** 2);
      const half = i % 4 === 0 ? 0.042 : 0.022;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a - half) * outer, Math.sin(a - half) * outer);
      ctx.lineTo(Math.cos(a + half) * outer, Math.sin(a + half) * outer);
      ctx.closePath();
      const ray = ctx.createLinearGradient(Math.cos(a) * inner, Math.sin(a) * inner,
        Math.cos(a) * outer, Math.sin(a) * outer);
      ray.addColorStop(0, 'rgba(255,255,230,0.52)');
      ray.addColorStop(0.18, i % 4 === 0 ? 'rgba(255,218,96,0.46)' : 'rgba(255,206,70,0.24)');
      ray.addColorStop(1, 'rgba(255,190,40,0)');
      ctx.fillStyle = ray;
      ctx.globalAlpha = fade * (i % 3 === 0 ? 0.9 : 0.68);
      ctx.fill();
    }

    // Kilka świetlistych obwódek daje wrażenie, że nagroda wyskakuje z ekranu.
    for (let i = 0; i < 3; i++) {
      const p = ((elapsed / 1450) + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(0, 0, lootR * (0.9 + p * 4.4), 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? '#fff3b0' : '#ffc943';
      ctx.lineWidth = 2.5 * (1 - p) + 0.5;
      ctx.globalAlpha = fade * (1 - p) * 0.72;
      ctx.shadowColor = '#ffc943';
      ctx.shadowBlur = 18;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /* ---------- SĄSIEDZKI NOTIF: LATAJĄCE GŁOWY ---------- */
  function startNeighborHeads() {
    const w = canvas.width, h = canvas.height;
    neighborSprites = Array.from({ length: 6 }, (_, i) => {
      const img = NEIGHBOR_HEADS[i % NEIGHBOR_HEADS.length];
      const headH = Math.max(54, Math.min(112, Math.min(w, h) * (0.13 + Math.random() * 0.06)));
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.86;
      return {
        img, x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 2.8),
        vy: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 2.1),
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.022,
        width: headH * ratio, height: headH
      };
    });
  }

  function drawNeighborHeads() {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const head of neighborSprites) {
      if (!head.img.complete || !head.img.naturalWidth) continue;
      head.x += head.vx;
      head.y += head.vy;
      head.angle += head.spin;
      if (head.x < head.width / 2 || head.x > canvas.width - head.width / 2) {
        head.vx *= -1;
        head.spin *= -1;
      }
      if (head.y < head.height / 2 || head.y > canvas.height - head.height / 2) head.vy *= -1;
      head.x = Math.max(head.width / 2, Math.min(canvas.width - head.width / 2, head.x));
      head.y = Math.max(head.height / 2, Math.min(canvas.height - head.height / 2, head.y));
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(head.angle);
      ctx.globalAlpha = 0.96;
      ctx.shadowColor = '#ffd75e';
      ctx.shadowBlur = 9;
      ctx.drawImage(head.img, -head.width / 2, -head.height / 2, head.width, head.height);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /* ---------- FILMOWY IMPULS PRZY DROPie ---------- */
  function spawnLegendBurst() {
    const count = Math.min(110, Math.max(64, Math.round(Math.min(canvas.width, canvas.height) / 10)));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 8.5;
      const big = Math.random() < 0.18;
      particles.push({
        x: cx + (Math.random() - 0.5) * 14,
        y: cy + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        decay: 0.022 + Math.random() * 0.026,
        r: big ? 2.5 + Math.random() * 2 : 1 + Math.random() * 1.8,
        glint: big
      });
    }
  }

  function drawLegendBurst(now) {
    const elapsed = now - burstAt;
    if (elapsed < 0 || elapsed > 1450) return;
    const t = elapsed / 1450;
    const ease = 1 - Math.pow(1 - t, 3);
    const maxR = Math.max(lootR * 2.4, Math.min(canvas.width, canvas.height) * 0.48);

    // Krótki biały błysk i kolorowa fala światła wokół okna łupów.
    const flash = Math.max(0, 1 - elapsed / 190);
    if (flash > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.72);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.72 * flash) + ')');
      g.addColorStop(0.18, hexA(fxColor, 0.48 * flash));
      g.addColorStop(1, hexA(fxColor, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dwie szybkie fale uderzeniowe z jasnym rdzeniem.
    for (let i = 0; i < 2; i++) {
      const local = Math.max(0, Math.min(1, (elapsed - i * 135) / 950));
      if (!local) continue;
      const radius = lootR * 0.42 + (maxR - lootR * 0.42) * (1 - Math.pow(1 - local, 2));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? '#ffffff' : fxColor;
      ctx.lineWidth = (i === 0 ? 4 : 2) * (1 - local) + 0.8;
      ctx.globalAlpha = (1 - local) * 0.9;
      ctx.shadowColor = fxColor;
      ctx.shadowBlur = 22 * (1 - local);
      ctx.stroke();
    }

    // Smugi rozbiegają się od środka jak w kinowym ujęciu impact.
    ctx.shadowBlur = 0;
    const rayCount = 30;
    for (let i = 0; i < rayCount; i++) {
      const a = (Math.PI * 2 * i / rayCount) + 0.04 * Math.sin(i * 13.2);
      const inner = lootR * (0.32 + ease * 0.32);
      const outer = inner + (maxR - lootR) * (0.2 + 0.8 * ease);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = i % 5 === 0 ? '#ffffff' : fxColor;
      ctx.lineWidth = i % 5 === 0 ? 2.2 : 1;
      ctx.globalAlpha = Math.max(0, 0.72 * (1 - t) * (0.65 + 0.35 * Math.sin(elapsed / 38 + i)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /* ---------- BŁYSKAWICE ---------- */
  function jag(x1, y1, x2, y2, disp, out) {
    if (disp < 3) { out.push([x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
    jag(x1, y1, mx, my, disp / 2, out);
    jag(mx, my, x2, y2, disp / 2, out);
  }

  function makeBolt(w, h) {
    const [x1, y1] = borderPoint(w, h);
    const x2 = w * (0.25 + Math.random() * 0.5);
    const y2 = h * (0.25 + Math.random() * 0.5);
    const pts = [[x1, y1]];
    jag(x1, y1, x2, y2, Math.min(w, h) * 0.35, pts);
    return { pts, life: 1 };
  }

  function drawBolts() {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= 0.08;
      if (b.life <= 0) { bolts.splice(i, 1); continue; }
      ctx.globalAlpha = b.life;
      ctx.lineJoin = 'round';
      [[6, '#7fd0ff', 18], [2, '#ffffff', 0]].forEach(([lw, col, blur]) => {
        ctx.lineWidth = lw; ctx.strokeStyle = col;
        ctx.shadowColor = '#7fd0ff'; ctx.shadowBlur = blur;
        ctx.beginPath();
        b.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- TABELA EFEKTÓW ---------- */
  const EFFECTS = {
    glow:      [],
    sparkle:   ['sparkle', 'comet'],
    lightning: ['bolts'],
    neon:      ['neon'],
    all:       ['sparkle', 'comet', 'bolts', 'neon'],
    purple:    ['crisp', 'sparkle', 'dots', 'orbit'],            // fioletowy wir
    electric:  ['elec', 'cglow', 'neon', 'stars', 'radial'],     // elektryczny
    gold:      ['crisp', 'rise', 'sparkle', 'stars'],            // złoty
    promo:     ['crisp', 'promoReveal', 'rise', 'sparkle', 'stars'], // złoty wybuch promocyjny
    neighbors: ['crisp', 'neighbors']
  };
  const THEME_COLORS = { // [kolor iskier, kolor ramki, kolor poświaty z przezroczystością]
    purple:   ['#d02bff', '#ff4cff', '#d02bff99'],
    electric: ['#7fd0ff', '#ffffff', '#6fb8ff88'],
    gold:     ['#ffc933', '#fff0a0', '#ffc93399'],
    promo:    ['#ffd34e', '#fff3b0', '#ffc933bb'],
    neighbors:['#e8c66b', '#fff1bb', '#e8c66b99']
  };
  const GLOW = { purple: [45, 3, 25, 0], electric: [55, 4, 30, 1], gold: [60, 4, 30, 1] }; // blur1, spread1, blur2, spread2

  /* ---------- ŚRODEK OKNA ŁUPÓW ---------- */
  function updateCenter() {
    const el = document.querySelector('.loot-wnd');
    if (el && overlay) {
      const b = el.getBoundingClientRect(), o = overlay.getBoundingClientRect();
      cx = b.left + b.width / 2 - o.left;
      cy = b.top + b.height / 2 - o.top;
      lootR = Math.hypot(b.width, b.height) / 2 + 10;
    } else {
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      lootR = 90;
    }
  }

  /* ---------- WIR ISKIER (dwie pętle jak ósemka) ---------- */
  const ORB = [{ rot: 0.3, ph: 0, dir: 1 }, { rot: -0.3, ph: 2, dir: -1 }];

  function orbitStep(now) {
    if (particles.length > 3500) return;
    const t = Math.max(0, now - startAt) / 1000;
    const rx = canvas.width * 0.30, ry = canvas.height * 0.16;
    ORB.forEach((o) => {
      for (let h = 0; h < 6; h++) {
        const a = t * 1.5 * o.dir + h * (Math.PI * 2 / 6) + o.ph;
        const x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry;
        const x = cx + x0 * Math.cos(o.rot) - y0 * Math.sin(o.rot);
        const y = cy + x0 * Math.sin(o.rot) + y0 * Math.cos(o.rot);
        for (let i = 0; i < 4; i++) {
          const big = Math.random() < 0.08;
          particles.push({
            x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
            life: 1, decay: 0.012 + Math.random() * 0.02,
            r: big ? 2.4 + Math.random() * 1.4 : 0.8 + Math.random() * 1.7, glint: big
          });
        }
      }
    });
  }

  function drawRing(now) {
    const fade = Math.max(0, Math.min(1, (stopAt - now) / 600, (now - startAt) / 300));
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45 * fade;
    ctx.beginPath();
    ctx.arc(cx, cy, lootR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- PRZERYWANE LINIE (kropkowane komety) ---------- */
  function dotStep(w, h, live) {
    for (let i = dots.length - 1; i >= 0; i--) {
      const c = dots[i], ca = Math.cos(c.a), sa = Math.sin(c.a);
      c.x += ca * c.sp; c.y += sa * c.sp; c.acc += c.sp;
      while (c.acc >= 7) {
        c.acc -= 7;
        particles.push({
          x: c.x - ca * c.acc, y: c.y - sa * c.acc, vx: 0, vy: 0,
          life: 1, decay: 0.014, r: 1 + Math.random() * 0.8
        });
      }
      if (c.x < -40 || c.y < -40 || c.x > w + 40 || c.y > h + 40) dots.splice(i, 1);
    }
    if (live && dots.length < 2 && Math.random() < 0.012) {
      const [x, y] = borderPoint(w, h);
      const tx = cx + (Math.random() - 0.5) * w * 0.5, ty = cy + (Math.random() - 0.5) * h * 0.5;
      dots.push({ x, y, a: Math.atan2(ty - y, tx - x), sp: 9 + Math.random() * 8, acc: 0 });
    }
  }

  /* ---------- UNOSZĄCE SIĘ ISKRY (złoty) ---------- */
  function spawnRise(w, h) {
    const big = Math.random() < 0.1;
    particles.push({
      x: Math.random() * w, y: h + 6, vx: (Math.random() - 0.5) * 0.6, vy: -(0.7 + Math.random() * 1.6),
      life: 1, decay: 0.004 + Math.random() * 0.006,
      r: big ? 2.4 + Math.random() * 1.2 : 0.8 + Math.random() * 1.6, glint: big
    });
  }

  /* ---------- GWIAZDKI I PROMIENIE ---------- */
  function spawnStar(w, h) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0,
      life: 1, decay: 0.01 + Math.random() * 0.02, r: 0.6 + Math.random() * 1.2
    });
  }

  function spawnStreak() {
    const a = Math.random() * Math.PI * 2, r0 = lootR + Math.random() * 40;
    streaks.push({
      x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0, a,
      len: 12 + Math.random() * 30, sp: 5 + Math.random() * 9, life: 1
    });
  }

  function drawStreaks() {
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#bfe8ff'; ctx.shadowBlur = 6;
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.x += Math.cos(s.a) * s.sp; s.y += Math.sin(s.a) * s.sp; s.life -= 0.025;
      if (s.life <= 0) { streaks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life * 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(s.a) * s.len, s.y + Math.sin(s.a) * s.len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /* ---------- NIEBIESKA POŚWIATA W CENTRUM + ROZCHODZĄCE SIĘ OKRĘGI ---------- */
  function drawCenterGlow(now) {
    const t = Math.max(0, now - startAt) / 1000;
    const fade = Math.max(0, Math.min(1, (stopAt - now) / 800, (now - startAt) / 300));
    const R = canvas.height * 0.55;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(210,240,255,0.75)');
    g.addColorStop(0.35, 'rgba(90,170,255,0.38)');
    g.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.globalAlpha = fade * (0.75 + 0.25 * Math.sin(t * 5));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cfeaff'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const ph = ((t * 0.45) + k / 3) % 1;
      ctx.globalAlpha = fade * (1 - ph) * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, ph * R, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- BŁYSKAWICE WZDŁUŻ RAMKI MAPY ---------- */
  function jagLine(x1, y1, x2, y2, disp) {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(len / 110));
    const pts = [[x1, y1]];
    for (let i = 0; i < n; i++) {
      jag(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n,
          x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n, disp, pts);
    }
    return pts;
  }

  function genElectric(w, h) {
    const E = [[0, 0, w, 0, 0, 1], [w, 0, w, h, -1, 0], [w, h, 0, h, 0, -1], [0, h, 0, 0, 1, 0]];
    elecPaths = E.map(([x1, y1, x2, y2]) => jagLine(x1, y1, x2, y2, 34));
    for (let k = 0; k < 4; k++) { // odgałęzienia w głąb mapy
      const [x1, y1, x2, y2, nx, ny] = E[(Math.random() * 4) | 0];
      const t = Math.random(), sx = x1 + (x2 - x1) * t, sy = y1 + (y2 - y1) * t;
      const L = 50 + Math.random() * 70;
      elecPaths.push(jagLine(sx, sy, sx + nx * L + (Math.random() - 0.5) * 40, sy + ny * L + (Math.random() - 0.5) * 40, 26));
    }
  }

  function drawElectricBorder(now) {
    const w = canvas.width, h = canvas.height;
    if (now - lastElec > 60) { lastElec = now; genElectric(w, h); }
    const fade = Math.max(0, Math.min(1, (stopAt - now) / 600, (now - startAt) / 200));
    [[5, '#7fd0ff', 16, 0.8], [1.5, '#ffffff', 0, 1]].forEach(([lw, col, blur, al]) => {
      ctx.lineWidth = lw; ctx.strokeStyle = col;
      ctx.shadowColor = '#7fd0ff'; ctx.shadowBlur = blur; ctx.globalAlpha = al * fade;
      elecPaths.forEach((pts) => {
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /* ---------- NEONOWE PIERŚCIENIE ---------- */
  const NEON = [
    { c: '#00e5ff', rx: 0.52, ry: 0.15, w: 3,  s: 0.00035,  p: 0.3 },
    { c: '#ff4cf0', rx: 0.60, ry: 0.18, w: 3,  s: -0.00028, p: 2.1 },
    { c: '#ffe94c', rx: 0.48, ry: 0.12, w: 3,  s: 0.00045,  p: 4.0 },
    { c: '#ffffff', rx: 0.66, ry: 0.07, w: 16, s: 0.00022,  p: 1.2, a: 0.3 }
  ];

  function drawNeon(now) {
    const w = canvas.width, h = canvas.height;
    const fade = Math.max(0, Math.min(1, (stopAt - now) / 800, (now - startAt) / 400));
    NEON.forEach((n) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(n.p + (now - startAt) * n.s);
      ctx.globalAlpha = (n.a || 0.9) * fade;
      ctx.strokeStyle = n.c; ctx.shadowColor = n.c; ctx.shadowBlur = 18; ctx.lineWidth = n.w;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * n.rx, h * n.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  /* ---------- PĘTLA ---------- */
  function frame(now) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // co kilkanaście klatek: środek okna łupów + wykrycie zamknięcia okna
    if (now - startAt < 500 || (tick++ & 15) === 0) {
      updateCenter();
      const present = !!document.querySelector('.loot-wnd');
      if (present) seenLoot = true;
      else if (seenLoot && stopAt - now > 800) stopAt = now + 800;
    }

    const live = now < stopAt - 1200; // nowe cząstki tylko dopóki nie zbliża się koniec
    if (parts.has('promoReveal')) drawPromoReveal(now);
    drawLegendBurst(now);
    if (parts.has('cglow')) drawCenterGlow(now);
    if (parts.has('neon')) drawNeon(now);
    if (parts.has('elec')) drawElectricBorder(now);
    if (parts.has('orbit')) { if (live) orbitStep(now); drawRing(now); }
    if (parts.has('dots')) dotStep(w, h, live);
    if (parts.has('radial')) {
      if (live) for (let k = 0; k < 2; k++) if (Math.random() < 0.45) spawnStreak();
      drawStreaks();
    }
    if (parts.has('stars') && live) {
      const sr = effect === 'electric' ? 0.55 : 0.15;
      for (let k = 0; k < 2; k++) if (Math.random() < sr) spawnStar(w, h);
    }
    if (parts.has('rise') && live) for (let k = 0; k < 2; k++) if (Math.random() < 0.5) spawnRise(w, h);
    if (parts.has('sparkle') && live && Math.random() < (effect === 'gold' ? 0.25 : 0.6)) spawnSparkle(w, h);
    if (parts.has('comet')) {
      if (live && !comet && Math.random() < 0.01) startComet(w, h);
      cometStep();
    }
    if (parts.has('bolts') && now < stopAt - 800 && Math.random() < 0.1) {
      bolts.push(makeBolt(w, h));
      if (Math.random() < 0.4) bolts.push(makeBolt(w, h));
    }
    drawParticles();
    drawBolts();
    if (parts.has('neighbors')) drawNeighborHeads();

    if (now < stopAt) raf = requestAnimationFrame(frame);
    else stop();
  }

  function stop() {
    cancelAnimationFrame(raf);
    particles.length = 0; bolts.length = 0; streaks.length = 0; dots.length = 0; comet = null;
    neighborSprites = [];
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (overlay) overlay.classList.remove('on');
  }

  function play(name) {
    ensureOverlay();
    fitOverlay();
    let e = name || cfg.effect;
    if (e === 'random') e = ['purple', 'electric', 'gold', 'promo'][(Math.random() * 4) | 0];
    if (!EFFECTS[e]) e = 'purple';
    effect = e;
    parts = new Set(EFFECTS[e]);
    const th = THEME_COLORS[e];
    fxColor = th ? th[0] : cfg.color;
    sprite = makeSprite(fxColor);
    particles.length = 0; bolts.length = 0; streaks.length = 0; dots.length = 0; comet = null;
    elecPaths = []; lastElec = 0;
    const g = GLOW[e] || [90, 8, 40, 1];
    overlay.style.setProperty('--gb1', g[0] + 'px');
    overlay.style.setProperty('--gs1', g[1] + 'px');
    overlay.style.setProperty('--gb2', g[2] + 'px');
    overlay.style.setProperty('--gs2', g[3] + 'px');
    overlay.style.setProperty('--fx', th ? th[2] : (e === 'lightning' ? '#7fd0ff' : fxColor));
    overlay.style.setProperty('--fxb', th ? th[1] : fxColor);
    overlay.classList.toggle('crisp', parts.has('crisp'));
    overlay.classList.add('on');
    document.documentElement.style.setProperty('--legc', fxColor);
    cancelAnimationFrame(raf);
    startAt = performance.now();
    burstAt = startAt + 65;
    stopAt = startAt + cfg.duration * 1000;
    tick = 0; seenLoot = false;
    updateCenter();
    spawnLegendBurst();
    if (parts.has('neighbors')) startNeighborHeads();
    raf = requestAnimationFrame(frame);
  }

  window.legFxTest = (name) => play(name); // np. legFxTest('lightning')

  /* ---------- WYKRYWANIE LEGENDY ---------- */
  function playSound() {
    if (!cfg.sound || !cfg.soundUrl) return;
    const a = new Audio(cfg.soundUrl);
    a.volume = cfg.volume;
    a.play().catch(() => {});
  }

  function onData(data) {
    if (!data || !data.loot || !data.item) return;
    try { if (localStorage.getItem('mkHubNotifierEnabled') === '0') return; } catch (e) {}
    const legs = Object.values(data.item).filter(i => /rarity=legendary/.test(i.stat || ''));
    if (!legs.length) return;
    console.log('[notyfikator] legenda:', legs.map(i => i.name));
    legs.forEach(i => message(cfg.alert.replace('{leg}', i.name)));
    playSound();
    play();
  }

  function hook() {
    const comm = window.Engine && window.Engine.communication;
    if (!comm || comm.__legHooked) return false;
    const orig = comm.parseJSON;
    comm.parseJSON = function (data) {
      const result = orig.apply(this, arguments);
      try { onData(data); } catch (e) { console.error('[notyfikator]', e); }
      return result;
    };
    comm.__legHooked = true;
    console.log('[notyfikator] hook na parseJSON zalozony');
    return true;
  }

  console.log('[notyfikator] skrypt wczytany');
  /* ---------- PANEL USTAWIEŃ W ZESTAWIE ---------- */
  window.__legNotifierAttach = function (host) {
    if (!host || host.querySelector('.mk-leg-settings')) return;
    const section = document.createElement('section');
    section.className = 'mk-leg-settings';
    section.innerHTML = `
      <h3 class="mk-leg-title">Notyfikator legend</h3>
      <p class="mk-leg-copy">Efekt, dźwięk i alert uruchamiane po zdobyciu legendy.</p>
      <label class="mk-leg-row"><span>Efekt</span><select id="lf-effect">
        <option value="purple">Fioletowy wir</option><option value="electric">Elektryczny</option>
        <option value="gold">Złoty</option><option value="promo">Promo</option>
        <option value="neighbors">Sąsiedzki notif</option><option value="sparkle">Iskry + kometa</option>
        <option value="lightning">Błyskawice</option><option value="neon">Neonowe pierścienie</option>
        <option value="all">Wszystko naraz</option><option value="glow">Sam glow</option>
        <option value="random">Losowy motyw</option>
      </select></label>
      <label class="mk-leg-row"><span>Kolor efektu</span><input type="color" id="lf-color"></label>
      <label class="mk-leg-row"><span>Czas <b><span id="lf-duration-v"></span> s</b></span><input type="range" id="lf-duration" min="3" max="30"></label>
      <label class="mk-leg-toggle"><input type="checkbox" id="lf-sound"><span>Odtwarzaj dźwięk przy legendzie</span></label>
      <input type="text" id="lf-soundurl" placeholder="Adres pliku MP3 (opcjonalnie)">
      <label class="mk-leg-row"><span>Głośność <b><span id="lf-volume-v"></span>%</b></span><input type="range" id="lf-volume" min="1" max="100"></label>
      <label class="mk-leg-alert"><span>Treść alertu <small>BBcode, {leg} wstawia nazwę przedmiotu</small></span><textarea id="lf-alert"></textarea></label>
      <div class="mk-leg-actions"><button type="button" id="lf-test">Test efektu</button><button type="button" id="lf-testall">Test dropu</button></div>
      <button type="button" class="mk-leg-reset" id="lf-reset">Przywróć domyślne</button>
      <p class="mk-leg-note">Skrót testu dropu: Ctrl + Shift + L</p>`;
    host.appendChild(section);
    const q = id => section.querySelector('#' + id);
    const syncPanel = () => {
      q('lf-effect').value = cfg.effect;
      q('lf-color').value = /^#[0-9a-f]{6}$/i.test(cfg.color) ? cfg.color : DEFAULTS.color;
      q('lf-duration').value = cfg.duration; q('lf-duration-v').textContent = cfg.duration;
      q('lf-sound').checked = !!cfg.sound; q('lf-soundurl').value = cfg.soundUrl || '';
      q('lf-volume').value = Math.round(cfg.volume * 100); q('lf-volume-v').textContent = Math.round(cfg.volume * 100);
      q('lf-alert').value = cfg.alert;
    };
    q('lf-effect').addEventListener('change', e => legCfg({ effect: e.target.value }));
    q('lf-color').addEventListener('input', e => legCfg({ color: e.target.value }));
    q('lf-duration').addEventListener('input', e => { q('lf-duration-v').textContent = e.target.value; legCfg({ duration: +e.target.value }); });
    q('lf-sound').addEventListener('change', e => legCfg({ sound: e.target.checked }));
    q('lf-soundurl').addEventListener('change', e => legCfg({ soundUrl: e.target.value.trim() }));
    q('lf-volume').addEventListener('input', e => { q('lf-volume-v').textContent = e.target.value; legCfg({ volume: +e.target.value / 100 }); });
    q('lf-alert').addEventListener('change', e => legCfg({ alert: e.target.value }));
    q('lf-test').addEventListener('click', () => play()); q('lf-testall').addEventListener('click', () => fullTest());
    q('lf-reset').addEventListener('click', () => { Object.keys(cfg).forEach(k => delete cfg[k]); Object.assign(cfg, DEFAULTS); localStorage.setItem(KEY, JSON.stringify(cfg)); document.documentElement.style.setProperty('--legc', cfg.color); syncPanel(); });
    ['keydown', 'keyup', 'keypress'].forEach(type => section.addEventListener(type, e => e.stopPropagation()));
    syncPanel();
    window.__legNotifierRefreshUI = syncPanel;
  };
  window.legIcon = () => window.__heroesDiscordOpenLegendSettings?.();

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (hook()) {
      clearInterval(timer);
    } else if (tries >= 60) {
      clearInterval(timer);
    }
  }, 500);

  // Test pełny: otwiera prawdziwe okno łupów z testową legendą i przechodzi tą samą drogą co prawdziwy drop
  window.legTest = () => {
    const heroId = (window.Engine && Engine.hero && Engine.hero.d && Engine.hero.d.id) || 0;
    Engine.communication.parseJSON({
      loot: { endTs: Math.floor(Date.now() / 1000) + 60, free: 21, init: 1, source: 'fight', states: { 1: 1 } },
      item: { 1: { id: 1, hid: 1, tpl: 1456, name: 'Testowa Legenda', own: heroId, loc: 'l',
                   icon: 'bag/toolsbag2.gif', x: 0, y: 0, cl: 24, pr: 8, st: 20,
                   stat: 'binds;lvl=100;legbon=curse,100;resfrost=8;rarity=legendary' } }
    });
  };

  function fullTest() {
    try { window.legTest(); }
    catch (err) {
      console.error('[notyfikator] legTest:', err);
    }
  }

  // Skrót do pełnego testu: Ctrl+Shift+L
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyL') {
      e.preventDefault();
      fullTest();
    }
  });
})();

  const tick=()=>{installPartyOnlyGuard();ensureSettingsTab();updateChatPanel()};
  let refreshQueued=false;const scheduleRefresh=()=>{if(refreshQueued)return;refreshQueued=true;setTimeout(()=>{refreshQueued=false;tick()},180)};
  window.addEventListener('resize',scheduleRefresh);window.addEventListener('orientationchange',scheduleRefresh);
  const chatMutation=nodes=>nodes.some(node=>{
    if(node.nodeType!==1||node.id===CHAT_PANEL_ID)return false;
    const signature=`${node.id||''} ${typeof node.className==='string'?node.className:''}`.toLowerCase();
    if(/lootlog|inventory|market|auction/.test(signature))return false;
    if(/chat|czat|wiadomo/.test(signature))return true;
    return CHAT_SELECTORS.some(selector=>{try{return node.matches(selector)}catch(error){return false}});
  });
  const uiObserver=new MutationObserver(records=>{if(records.some(record=>chatMutation([...record.addedNodes,...record.removedNodes])))scheduleRefresh()});
  uiObserver.observe(document.documentElement,{childList:true,subtree:true});
  tick();applyBackground(backgroundPreset,false);setInterval(tick,3000);
})();
