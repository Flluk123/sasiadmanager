// ==UserScript==
// @name         Heroes on Discord + Notyfikator Legend + Przedziały Online + Łupy Tytanów + Podział Grup + Licznik Walk
// @namespace    http://tampermonkey.net/
// @version      4.68.0
// @description  Heroes and titans alerts, online player level ranges, and legendary titan loot calls
// @author       Kris Aphalon
// @match        https://margonem.com/*
// @match        https://*.margonem.com/*
// @match        https://steamrealm.margonem.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==

// Kopia ustawień dodatków przywracana przed inicjalizacją modułów.
;(function () {
  const backupKey = 'mkAddonSettingsBackup_v1'
  const isAddonKey = key => /^(?:mk(?:BalancedParty|MargoMeter|BattleMeter|Colossus|Hub|Online|TitanLoot|Addon|_clan_|_ranges_)|MargoMeter-(?:meter-folded|meter-position|helper-folded|helper-position|storage|type-step|meter-size|helper-size)|chciamkColossus|heroes-discord|moj_notyfikator_fx)/.test(key) && key !== backupKey
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
      icon: icon('<circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M1.5 13c.3-2 1.5-3 3.5-3s3.2 1 3.5 3M7.5 13c.3-2 1.5-3 3.5-3s3.2 1 3.5 3"/>') },
    { id: 'battle-meter', name: 'LICZNIK WALK', view: 'battle-meter', key: 'mkMargoMeterEnabled', event: 'mk-battle-meter-toggle',
      desc: 'Licznik obrażeń na żywo, pomocnik walki i dodatkowe dane w tooltipach wojowników.',
      icon: icon('<path d="M2 13V8M5 13V4M8 13V7M11 13V2M14 13V5"/>') }
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
    if ((addon.view === 'ranges' || addon.view === 'party' || addon.view === 'battle-meter') && !isOn(addon)) { notify('Najpierw włącz ' + addon.name + '.'); return }
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
  function buildBattleMeter() {
    const addon = byId('battle-meter'), box = section('Licznik Walk')
    box.append(toggleRow(addon, 'Włącz Licznik Walk'),
      hint('Pełny licznik walk: obrażenia, leczenie, pomocnik walki, szczegóły wojowników i zapis walk. Panel uruchamia się po wykryciu silnika gry.'))
    const status = document.createElement('p'); status.className = 'hint'
    const refreshStatus = () => {
      const host = document.getElementById('MargoMeter-Panel')
      status.textContent = !isOn(addon) ? 'Dodatek wyłączony.' : host ? 'Licznik Walk działa. Panel i pomocnik pojawią się nad grą.' : document.getElementById('mk-battle-meter-waiter')?.textContent || 'Uruchamiam okno licznika walk…'
    }
    box.appendChild(status)
    if (isOn(addon)) {
      const actions = document.createElement('div'); actions.className = 'actions'
      const showButton = document.createElement('button'); showButton.type = 'button'; showButton.className = 'sc'; showButton.textContent = 'Pokaż / przywróć panel'
      showButton.addEventListener('click', () => { const shown = window.__mkBattleMeterShow?.(); hide(); status.textContent = shown ? 'Panel licznika został otwarty.' : 'Dekoder szuka silnika gry; panel pojawi się po podłączeniu.'; setTimeout(refreshStatus, 1200) })
      actions.appendChild(showButton); box.appendChild(actions)
    }
    refreshStatus()
    content.appendChild(box)
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
    box.innerHTML = '<h3>Heroes on Discord + Notyfikator Legend + Przedziały Online + Łupy Tytanów + Podział Grup</h3>' +
      '<p>Wersja 4.68.0. Wszystkie dodatki masz w jednym miejscu: przełącznik włącza lub wyłącza dodatek, a zębatka otwiera jego ustawienia w tym oknie.</p>' +
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
    else if (view === 'battle-meter') buildBattleMeter()
    else if (view === 'loot') buildLoot()
    else if (view === 'colossus') buildColossus()
    else if (view === 'notifier') buildNotifier()
    else if (view === 'discord') buildDiscord()
    else if (view === 'look') buildLook()
    else if (view === 'info') buildInfo()
    if (['ranges', 'party', 'battle-meter', 'loot', 'colossus', 'notifier', 'discord', 'look'].includes(view)) {
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
  window.__mkHubInstalled = true
  window.addEventListener('mk-hub-toggle', toggle)
})();

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

  const applyBackground=(preset,notify=true)=>{if(!BACKGROUND_PRESETS[preset])return;backgroundPreset=preset;const gradient=BACKGROUND_PRESETS[preset].value;for(const doc of getDocs()){for(const selector of [`#${PANEL_ID}`,`#${CHAT_PANEL_ID}`,'#mk-hub','#mk-party-floating','#MargoMeter-Panel','#heroes-colossus-call','#heroes-popup','.heroes-discord__setup'])for(const el of doc.querySelectorAll(selector))el.style.setProperty('background',gradient,'important');for(const el of doc.querySelectorAll('.heroes-discord__background'))el.style.setProperty('background','transparent','important')}try{localStorage.setItem(BACKGROUND_KEY,preset)}catch(error){}window.__mkPersistAddonSettings?.();if(backgroundPicker)backgroundPicker.value=preset;if(notify&&themeStatus)themeStatus.textContent=uiLanguage==='en'?'Background saved.':uiLanguage==='el'?'Το φόντο αποθηκεύτηκε.':'Tło dodatku zapisane.'};
  const applyTheme=color=>{if(!/^#[0-9a-f]{6}$/i.test(color||''))return;themeColor=color;for(const doc of getDocs()){doc.documentElement?.style.setProperty('--mkhd-addon-theme',themeColor);for(const el of doc.querySelectorAll(`#${PANEL_ID},#${CHAT_PANEL_ID},#mk-hub,#mk-party-floating,#MargoMeter-Panel,#heroes-colossus-call,#heroes-popup,.heroes-discord__setup,.mk-leg-settings`))el.style.setProperty('--mkhd-addon-theme',themeColor)}try{localStorage.setItem(THEME_KEY,themeColor)}catch(error){}window.__mkPersistAddonSettings?.();if(themePicker)themePicker.value=themeColor;if(themeStatus)themeStatus.textContent=`Kolor zestawu zapisany: ${themeColor}.`};
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



/* MargoMeter 0.24.0 — pełny dekoder i panel z pliku użytkownika */
;(function () {
  if (window.top !== window.self) return
// frozen/aura-turns.ts
var FROZEN_AURA_TURNS = {
  /** When the page these were read from was fetched, not when a person read it. */
  fetchedAt: "2026-10-02T14:46:17.688Z",
  skills: [
    {
      id: 25,
      turns: 2
    },
    {
      id: 76,
      turns: 8
    },
    {
      id: 89,
      turns: 8
    },
    {
      id: 123,
      turns: 8
    },
    {
      id: 188,
      turns: 5
    },
    {
      id: 206,
      turns: 2
    },
    {
      id: 212,
      turns: 8
    },
    {
      id: 219,
      turns: 8
    },
    {
      id: 244,
      turns: 8
    },
    {
      id: 264,
      turns: 8
    },
    {
      id: 285,
      turns: 40
    },
    {
      id: 298,
      turns: 8
    }
  ],
  shouts: [
    {
      id: 25,
      turns: 3,
      coverageMinimum: 6
    },
    {
      id: 188,
      turns: 3,
      coverageMinimum: 6
    }
  ]
};

// frozen/blows-granted.ts
var FROZEN_BLOWS_GRANTED = {
  /** When the page these were read from was fetched, not when a person read it. */
  fetchedAt: "2026-10-02T14:46:17.688Z",
  skills: [
    {
      id: 97,
      blowsGrantedMinimum: 1
    },
    {
      id: 239,
      blowsGrantedMinimum: 1
    },
    {
      id: 283,
      blowsGrantedMinimum: 2
    }
  ]
};

// frozen/status-bits.ts
var FROZEN_STATUS_BITS = {
  gameBuild: "DHSqC3Uh",
  bits: [
    "deep_wound",
    "wound",
    "critical_deep_wound",
    "poisoned",
    "fire",
    "swow_down",
    "speed_up",
    "frostbite",
    "shock"
  ]
};

// libs/errors.ts
var Caught = class extends Error {
  name = "Caught";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
function attempt(call) {
  try {
    return call();
  } catch (cause) {
    return new Caught(cause);
  }
}

// deno:https://jsr.io/@std/assert/1.0.19/assertion_error.ts
var AssertionError = class extends Error {
  /** Constructs a new instance.
   *
   * @param message The error message.
   * @param options Additional options. This argument is still unstable. It may change in the future release.
   */
  constructor(message, options) {
    super(message, options);
    this.name = "AssertionError";
  }
};

// deno:https://jsr.io/@std/assert/1.0.19/assert.ts
function assert(expr, msg = "") {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

// libs/unknown-value.ts
var FIELD_TYPE = {
  number: "number",
  text: "text",
  statedText: "stated-text",
  record: "record",
  list: "list"
};
var FieldWrongType = class extends Error {
  name = "FieldWrongType";
  field;
  expected;
  constructor(field, expected) {
    super();
    this.field = field;
    this.expected = expected;
  }
};
var FieldTooLong = class extends Error {
  name = "FieldTooLong";
  field;
  count;
  maximum;
  constructor(field, count, maximum) {
    super();
    this.field = field;
    this.count = count;
    this.maximum = maximum;
  }
};
function isRecord(candidate) {
  if (typeof candidate !== "object") return false;
  if (candidate === null) return false;
  return !Array.isArray(candidate);
}
function getNumberField(record, keys, field) {
  const fieldValue = getFieldValue(record, keys, field);
  if (fieldValue === void 0) return null;
  if (typeof fieldValue !== "number") {
    return new FieldWrongType(field, FIELD_TYPE.number);
  }
  if (!Number.isFinite(fieldValue)) {
    return new FieldWrongType(field, FIELD_TYPE.number);
  }
  return fieldValue;
}
function getFieldValue(record, keys, field) {
  assert(Object.hasOwn(keys, field), "every field read is given a key");
  const key = keys[field];
  assert(typeof key === "string", "and the key is text");
  return getOwnValue(record, key);
}
function getOwnValue(record, key) {
  assert(key.length > 0, "a key read is a key somebody spelled");
  if (!Object.hasOwn(record, key)) return void 0;
  return record[key];
}
function getTextField(record, keys, field) {
  const fieldValue = getFieldValue(record, keys, field);
  if (fieldValue === void 0) return null;
  if (typeof fieldValue !== "string") {
    return new FieldWrongType(field, FIELD_TYPE.text);
  }
  return fieldValue;
}
function getStatedTextField(record, keys, field) {
  const text = getTextField(record, keys, field);
  if (text instanceof Error) return text;
  if (text === null) return text;
  if (text.length === 0) {
    return new FieldWrongType(field, FIELD_TYPE.statedText);
  }
  return text;
}
function getRecordField(record, keys, field) {
  const fieldValue = getFieldValue(record, keys, field);
  if (fieldValue === void 0) return null;
  if (!isRecord(fieldValue)) {
    return new FieldWrongType(field, FIELD_TYPE.record);
  }
  return fieldValue;
}
function getListField(record, keys, field, maximum) {
  assert(Number.isSafeInteger(maximum), "a list is bounded by a whole count");
  assert(maximum >= 0, "of none or more");
  const fieldValue = getFieldValue(record, keys, field);
  if (fieldValue === void 0) return null;
  if (!Array.isArray(fieldValue)) {
    return new FieldWrongType(field, FIELD_TYPE.list);
  }
  if (fieldValue.length > maximum) {
    return new FieldTooLong(field, fieldValue.length, maximum);
  }
  return fieldValue;
}

// src/core/battle-event.ts
var BATTLE_EVENT = {
  attack: "attack",
  damageToNamedCombatant: "damage-to-named-combatant",
  declaration: "declaration",
  fightOutcome: "fight-outcome",
  healingToNamedCombatant: "healing-to-named-combatant",
  healthChange: "health-change",
  skillUsed: "skill-used",
  turnLost: "turn-lost",
  unaccountedHealth: "unaccounted-health",
  unknownMessage: "unknown-message"
};
var OUTCOME_RESULT = {
  won: "won",
  lost: "lost",
  drawn: "drawn",
  fled: "fled"
};
var UNREAD_CAUSE = {
  unknownKey: "unknown-key",
  noParameter: "no-parameter",
  grammarRefused: "grammar-refused"
};

// src/core/combatant-roster.ts
var COMBATANTS_MAXIMUM = 20;
var AMBIGUOUS = null;
var NOBODY = null;
function indexCombatantRoster(combatants) {
  assert(combatants.length <= COMBATANTS_MAXIMUM, "a cast stays inside its stated bound");
  const byId = /* @__PURE__ */ new Map();
  const idByName = /* @__PURE__ */ new Map();
  for (const combatant of combatants) {
    assert(!byId.has(combatant.id), "a cast names each combatant once");
    assert(combatant.name.length > 0, "a combatant in a cast is named");
    byId.set(combatant.id, combatant);
    if (idByName.has(combatant.name)) idByName.set(combatant.name, AMBIGUOUS);
    else idByName.set(combatant.name, combatant.id);
  }
  assert(byId.size === combatants.length, "a roster holds everybody it was handed");
  return {
    byId,
    idByName
  };
}
function lookupCombatantIdByName(roster, name) {
  assert(name.length > 0, "a name to resolve is never empty");
  const combatantId = roster.idByName.get(name);
  if (combatantId === void 0) return NOBODY;
  if (combatantId === AMBIGUOUS) return AMBIGUOUS;
  assert(roster.byId.get(combatantId)?.name === name, "a name resolves to somebody who holds it");
  return combatantId;
}

// libs/text-walk.ts
var RUN_CHARACTERS_MAXIMUM = 65536;
function isDigitAt(text, index) {
  assert(Number.isSafeInteger(index), "a character is looked for at a whole position");
  assert(index >= 0, "never before the text");
  const character = text.charAt(index);
  if (character < "0") return false;
  return character <= "9";
}
function lookupEndOfRun(text, from, maximum, isMember) {
  assert(Number.isSafeInteger(from), "a run starts at a whole position");
  assert(from >= 0, "never before the text");
  assert(from <= text.length, "nor past its end");
  assert(Number.isSafeInteger(maximum), "a run is bounded by a whole count of characters");
  assert(maximum > 0, "of at least one");
  let runEnd = from;
  for (let look = 0; look < maximum; look += 1) {
    if (runEnd >= text.length) break;
    if (!isMember(text, runEnd)) break;
    runEnd += 1;
  }
  assert(runEnd <= text.length, "a run never ends past the text it walked");
  if (runEnd - from < maximum) return runEnd;
  return null;
}
function isDigitRun(text) {
  if (text.length === 0) return false;
  if (text.length >= RUN_CHARACTERS_MAXIMUM) return false;
  const end = lookupEndOfRun(text, 0, RUN_CHARACTERS_MAXIMUM, isDigitAt);
  assert(end !== null, "a run in text shorter than the bound ends inside the bound");
  assert(end <= text.length, "a run of digits ends inside the text it was read from");
  return end === text.length;
}

// libs/number-text.ts
var MINUS = "-";
var PLACES_MAXIMUM = 100;
var FIXED_MAGNITUDE_MAXIMUM = 1e21;
var POINT = ".";
function parseInteger(text) {
  const digits = text.startsWith(MINUS) ? text.slice(MINUS.length) : text;
  if (!isDigitRun(digits)) return null;
  const integer = Number(text);
  if (!Number.isSafeInteger(integer)) return null;
  assert(String(integer).length <= text.length, "reading a number never lengthens its text");
  if (digits === text) assert(integer >= 0, "digits with no minus read as nothing or above");
  else assert(integer <= 0, "digits behind a minus read as nothing or below");
  return integer;
}
function parseDecimal(text) {
  const point = text.indexOf(POINT);
  if (point === -1) {
    if (!isDigitRun(text)) return null;
  } else {
    if (!isDigitRun(text.slice(0, point))) return null;
    if (!isDigitRun(text.slice(point + POINT.length))) return null;
  }
  const decimal = Number(text);
  if (!Number.isFinite(decimal)) return null;
  assert(decimal >= 0, "a decimal read from digits is never below nothing, having no sign");
  return decimal;
}
function formatInteger(integer) {
  assert(Number.isSafeInteger(integer), "an integer written is one held exactly");
  const text = String(integer);
  assert(text.length > 0, "a number is written as at least one character");
  return text;
}
function formatDecimal(decimal, places) {
  assert(Number.isFinite(decimal), "a number written is a number");
  assert(Math.abs(decimal) < FIXED_MAGNITUDE_MAXIMUM, "and one the platform writes in digits");
  assert(Number.isSafeInteger(places), "and is written to a whole number of places");
  assert(places >= 0, "never fewer than none");
  assert(places <= PLACES_MAXIMUM, "and never more than the platform writes");
  return decimal.toFixed(places);
}

// src/core/protocol-number.ts
var HEALTH_PERCENT_PLACES = 2;
var HEALTH_PERCENT_MAXIMUM = 100;
var POINT2 = ".";
function parseHealthPercent(text) {
  const pointIndex = text.indexOf(POINT2);
  if (pointIndex === -1) return null;
  const fraction = text.slice(pointIndex + POINT2.length);
  if (fraction.length !== HEALTH_PERCENT_PLACES) return null;
  if (!isDigitRun(text.slice(0, pointIndex))) return null;
  if (!isDigitRun(fraction)) return null;
  const healthPercent = parseDecimal(text);
  if (healthPercent === null) return null;
  if (healthPercent > HEALTH_PERCENT_MAXIMUM) return null;
  assert(healthPercent >= 0, "a percentage read from digits is never below nothing");
  return healthPercent;
}

// src/core/protocol-key.ts
var KEY_FAMILY = {
  damage: "damage",
  prevented: "prevented",
  destroyed: "destroyed",
  proc: "proc",
  healthChange: "health-change",
  declaration: "declaration",
  valuelessDeclaration: "valueless-declaration",
  skillName: "skill-name",
  customSkillName: "custom-skill-name",
  skillId: "skill-id",
  outcome: "outcome",
  fled: "fled",
  unaccountedHealth: "unaccounted-health",
  namedDamage: "named-damage",
  namedHealing: "named-healing"
};
var PROC_END = {
  actor: "actor",
  target: "target",
  unsettled: "unsettled"
};
var LEGENDARY_BONUS_SHOWING = {
  fired: "fired",
  held: "held"
};
var DEFENCE_MECHANISM = {
  pool: "pool",
  chance: "chance"
};
var DAMAGE_HALF = {
  raw: "raw",
  applied: "applied"
};
var KEY_REACH = {
  castersSide: "casters-side",
  otherSide: "other-side"
};
var DAMAGE_MARKER = "dmg";
var DAMAGE_MARKER_AT = 1;
var RAW_SIGN = "+";
var APPLIED_SIGN = "-";
var TEXT_KEY = "txt";
var SKILL_ID_KEY = "skillId";
var STEP_KEY = "step";
var PREPARE_KEY = "prepare";
var CHARGE_BROKEN_KEY = "+superspell-dispel";
var HOLYTOUCH_DECLARATION_KEY = "+legbon_holytouch";
var HOLYTOUCH_HEAL_KEY = "legbon_holytouch_heal";
var LASTHEAL_KEY = "legbon_lastheal";
var CURSE_KEY = "+legbon_curse";
var VERYCRIT_KEY = "+legbon_verycrit";
var CLEANSE_KEY = "-legbon_cleanse";
var GLARE_KEY = "-legbon_glare";
var PUNCTURE_KEY = "+legbon_puncture";
var CRITRED_KEY = "-legbon_critred";
var FACADE_KEY = "-legbon_facade";
var ANGUISH_KEY = "+legbon_anguish";
var HEALING_REDUCER_KEY = "lowheal_per-enemies";
var PROVOCATION_KEY = "shout";
var SLOW_ALL_KEY = "allslow_per";
var HASTE_AURA_KEY = "aura-sa_per";
var NAME_SEPARATOR = ", ";
var WOUND_ANNOUNCEMENT_KEY = "+injure";
var WOUND_TICK_KEY = "injure";
var HEAL_KEY = "heal";
var CRITICAL_KEY = "+crit";
var CRITICAL_OF_KEY = "+of_crit";
var CRITICAL_PROC_KEYS = [
  CRITICAL_KEY,
  CRITICAL_OF_KEY
];
var SELF_SOURCED_HEALING_KEYS = [
  HEAL_KEY,
  HOLYTOUCH_HEAL_KEY,
  LASTHEAL_KEY
];
var DAMAGE_KEYS = [
  "+thirdatt",
  "-thirdatt"
];
var DEFENCE_BY_KEY = /* @__PURE__ */ new Map([
  [
    "-absorb",
    {
      mechanism: DEFENCE_MECHANISM.pool,
      elementsAbsorbed: [
        "dmg",
        "dmgd"
      ]
    }
  ],
  [
    "-absorbm",
    {
      mechanism: DEFENCE_MECHANISM.pool,
      elementsAbsorbed: [
        "dmgf",
        "dmgc",
        "dmgl"
      ]
    }
  ],
  [
    "-blok",
    {
      mechanism: DEFENCE_MECHANISM.chance,
      elementsAbsorbed: []
    }
  ]
]);
var DESTROYED_KEYS = [
  "+acdmg",
  "+critpierce",
  "+resdmg",
  "+resdmgc",
  "+resdmgf",
  "+resdmgl",
  // One letter from `+acdmg`, and a different pool: that empties armour in points, this a
  // poison resistance in percentage points (`docs/protocol-keys.md`).
  "+actdmg",
  "+abdest_per",
  "+abmdest_per"
];
var PROC_END_BY_KEY = /* @__PURE__ */ new Map([
  [
    CRITICAL_KEY,
    PROC_END.actor
  ],
  [
    CRITICAL_OF_KEY,
    PROC_END.actor
  ],
  [
    "+pierce",
    PROC_END.actor
  ],
  [
    "-pierceb",
    PROC_END.target
  ],
  [
    "+stun",
    PROC_END.actor
  ],
  [
    "+stun2",
    PROC_END.actor
  ],
  [
    "+stun2-c",
    PROC_END.actor
  ],
  [
    "+stun2-d",
    PROC_END.actor
  ],
  [
    "+stun2-f",
    PROC_END.actor
  ],
  [
    "+stun2-l",
    PROC_END.actor
  ],
  [
    "+freeze",
    PROC_END.actor
  ],
  [
    "+wound",
    PROC_END.actor
  ],
  [
    "+of_wound",
    PROC_END.actor
  ],
  [
    "+woundpoison",
    PROC_END.actor
  ],
  [
    "+woundfrost",
    PROC_END.actor
  ],
  [
    "+woundmagic",
    PROC_END.actor
  ],
  [
    "+of_woundpoison",
    PROC_END.actor
  ],
  [
    "+of_woundmagic",
    PROC_END.actor
  ],
  [
    "+fastarrow",
    PROC_END.actor
  ],
  [
    "+swing",
    PROC_END.actor
  ],
  [
    "+acdmg_destroyed",
    PROC_END.actor
  ],
  [
    CURSE_KEY,
    PROC_END.actor
  ],
  [
    VERYCRIT_KEY,
    PROC_END.actor
  ],
  [
    CLEANSE_KEY,
    PROC_END.target
  ],
  [
    GLARE_KEY,
    PROC_END.target
  ],
  [
    CHARGE_BROKEN_KEY,
    PROC_END.unsettled
  ],
  [
    "+superspell-prevented",
    PROC_END.unsettled
  ],
  [
    "-tenacity",
    PROC_END.unsettled
  ],
  [
    "-evade",
    PROC_END.target
  ],
  [
    "-parry",
    PROC_END.target
  ],
  [
    "-contra",
    PROC_END.target
  ],
  [
    "-arrowblock",
    PROC_END.target
  ]
]);
var PROCS_WITH_VALUE = [
  "+woundpoison",
  "+woundfrost",
  "+woundmagic",
  "+of_woundpoison",
  "+of_woundmagic"
];
var HEALTH_CHANGE_BY_KEY = /* @__PURE__ */ new Map([
  [
    HEAL_KEY,
    {
      sign: 1,
      isOnTarget: false
    }
  ],
  [
    HOLYTOUCH_HEAL_KEY,
    {
      sign: 1,
      isOnTarget: false
    }
  ],
  [
    "heal_target",
    {
      sign: 1,
      isOnTarget: true
    }
  ],
  [
    "npc_heal",
    {
      sign: 1,
      isOnTarget: false
    }
  ],
  [
    "bandage",
    {
      sign: 1,
      isOnTarget: false
    }
  ],
  [
    "poison",
    {
      sign: -1,
      isOnTarget: false
    }
  ],
  [
    WOUND_TICK_KEY,
    {
      sign: -1,
      isOnTarget: false
    }
  ],
  [
    "wound",
    {
      sign: -1,
      isOnTarget: false
    }
  ],
  [
    "fire",
    {
      sign: -1,
      isOnTarget: false
    }
  ],
  [
    "light",
    {
      sign: -1,
      isOnTarget: false
    }
  ],
  [
    "anguish",
    {
      sign: -1,
      isOnTarget: false
    }
  ]
]);
var DECLARATION_KEYS = [
  "+absorb",
  "+absorbm",
  "+critpoison_per",
  "+critsa",
  "+critslow_per",
  "+crush_physical",
  "+engback",
  "+exp",
  WOUND_ANNOUNCEMENT_KEY,
  PUNCTURE_KEY,
  "+ph",
  "+rage",
  "+taken_dmg",
  "-endest",
  CRITRED_KEY,
  FACADE_KEY,
  "-manadest",
  "-poison_lowdmg_per",
  "active_absorbdest_per",
  "active_block_per",
  "active_decblock_per",
  "active_decblock_per-enemies",
  "afterheal",
  "alllowdmg",
  SLOW_ALL_KEY,
  "aura-ac_per",
  "aura-adddmg2_per-meele",
  "aura-resall",
  HASTE_AURA_KEY,
  "combo-max",
  "critmval-allies",
  "critval-allies",
  "en-regen",
  "energy",
  "heal_per-allies",
  "heal_per-enemies",
  "hp_per-allies",
  "hp_per-enemies",
  HEALING_REDUCER_KEY,
  "mana",
  "poison_lowdmg_per-enemies",
  PREPARE_KEY,
  "resfire_per",
  "resfrost_per",
  "reslight_per",
  PROVOCATION_KEY,
  "surpass_bonus_total",
  TEXT_KEY
];
var VALUELESS_DECLARATION_KEYS = [
  ANGUISH_KEY,
  HOLYTOUCH_DECLARATION_KEY,
  "+spell-taken_dmg-all",
  "en-regen-cast",
  "removedot-allies",
  "removeslow-allies",
  "removestun-allies",
  STEP_KEY,
  "sunshield_per"
];
var REACH_BY_KEY = /* @__PURE__ */ new Map([
  // The `all` says everybody and not which side. The register: _a reduction to the damage dealt
  // by everyone on the opposing side_ (`docs/protocol-keys.md`).
  [
    "alllowdmg",
    KEY_REACH.otherSide
  ],
  [
    "+spell-taken_dmg-all",
    KEY_REACH.otherSide
  ],
  [
    HEALING_REDUCER_KEY,
    KEY_REACH.otherSide
  ],
  [
    "active_decblock_per-enemies",
    KEY_REACH.otherSide
  ],
  [
    "poison_lowdmg_per-enemies",
    KEY_REACH.otherSide
  ],
  // ⚠️ The one the register does not settle, so it is measured instead: after a `Szadź` the
  // opposing combatant carries `swow_down` (`docs/auras-standing.md`).
  [
    SLOW_ALL_KEY,
    KEY_REACH.otherSide
  ],
  [
    "aura-adddmg2_per-meele",
    KEY_REACH.castersSide
  ],
  [
    "aura-ac_per",
    KEY_REACH.castersSide
  ],
  [
    "aura-resall",
    KEY_REACH.castersSide
  ],
  [
    HASTE_AURA_KEY,
    KEY_REACH.castersSide
  ],
  [
    "critval-allies",
    KEY_REACH.castersSide
  ],
  [
    "critmval-allies",
    KEY_REACH.castersSide
  ],
  [
    "removedot-allies",
    KEY_REACH.castersSide
  ],
  [
    "removeslow-allies",
    KEY_REACH.castersSide
  ],
  [
    "removestun-allies",
    KEY_REACH.castersSide
  ],
  // The affected are forced to attack the character who used the skill: you do not force an
  // ally to strike you, and every character a shout names stands opposite its caster
  // (`docs/auras-standing.md`, _The register_).
  [
    PROVOCATION_KEY,
    KEY_REACH.otherSide
  ]
]);
var SIDE_WIDE_OPENING = "aura-";
var SIDE_WIDE_ENDINGS = [
  "-all",
  "-allies",
  "-enemies"
];
var SIDE_WIDE_KEYS = [
  PROVOCATION_KEY,
  SLOW_ALL_KEY,
  "alllowdmg"
];
var LEGENDARY_BONUS_BY_KEY = /* @__PURE__ */ new Map([
  [
    HOLYTOUCH_DECLARATION_KEY,
    {
      end: PROC_END.actor,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: false
    }
  ],
  [
    VERYCRIT_KEY,
    {
      end: PROC_END.actor,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: true
    }
  ],
  [
    CURSE_KEY,
    {
      end: PROC_END.actor,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: true
    }
  ],
  [
    ANGUISH_KEY,
    {
      end: PROC_END.actor,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: true
    }
  ],
  [
    CLEANSE_KEY,
    {
      end: PROC_END.target,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: false
    }
  ],
  [
    GLARE_KEY,
    {
      end: PROC_END.target,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: true
    }
  ],
  [
    CRITRED_KEY,
    {
      end: PROC_END.target,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: true
    }
  ],
  [
    LASTHEAL_KEY,
    {
      end: PROC_END.target,
      showing: LEGENDARY_BONUS_SHOWING.fired,
      doesReachOtherEnd: false
    }
  ],
  [
    PUNCTURE_KEY,
    {
      end: PROC_END.actor,
      showing: LEGENDARY_BONUS_SHOWING.held,
      doesReachOtherEnd: false
    }
  ],
  [
    FACADE_KEY,
    {
      end: PROC_END.target,
      showing: LEGENDARY_BONUS_SHOWING.held,
      doesReachOtherEnd: false
    }
  ]
]);
var KEY_MEANING_BY_KEY = indexKeyMeanings();
var DEFENCE_BY_DEFENCE = indexDefences();
function lookupKeyReach(key) {
  assert(key.length > 0, "a reach is asked of a key");
  const reach = REACH_BY_KEY.get(key) ?? null;
  if (reach !== null) assert(isSideWideKey(key), "a key reaching a side is a side-wide key");
  return reach;
}
function lookupLegendaryBonus(key) {
  assert(key.length > 0, "a bonus is asked of a key");
  const bonus = LEGENDARY_BONUS_BY_KEY.get(key) ?? null;
  if (bonus === null) return null;
  assert(bonus.end !== PROC_END.unsettled, "a bonus held here is somebody's");
  if (bonus.showing === LEGENDARY_BONUS_SHOWING.held) {
    assert(!bonus.doesReachOtherEnd, "a held bonus names one blow of the many it acts on");
  }
  return bonus;
}
function isSideWideKey(key) {
  assert(key.length > 0, "a key that is asked about is named");
  if (key.startsWith(SIDE_WIDE_OPENING)) return true;
  for (const ending of SIDE_WIDE_ENDINGS) {
    if (key.endsWith(ending)) return true;
  }
  return SIDE_WIDE_KEYS.includes(key);
}
function lookupKeyMeaning(key) {
  assert(key.length > 0, "a key asked about is a key the message wrote");
  const listed = KEY_MEANING_BY_KEY.get(key);
  if (listed !== void 0) return listed;
  if (!key.startsWith(DAMAGE_MARKER, DAMAGE_MARKER_AT)) return null;
  let half;
  if (key.startsWith(RAW_SIGN)) half = DAMAGE_HALF.raw;
  else if (key.startsWith(APPLIED_SIGN)) half = DAMAGE_HALF.applied;
  else return null;
  return {
    kind: KEY_FAMILY.damage,
    half
  };
}
function getDefenceMechanism(defence) {
  assert(defence.length > 0, "a defence asked about is one an event named");
  const listed = DEFENCE_BY_DEFENCE.get(defence);
  assert(listed !== void 0, "every defence an event names is one this table reads");
  return listed.mechanism;
}
function getElementsAbsorbed(defence) {
  assert(defence.length > 0, "a defence asked about is one an event named");
  const listed = DEFENCE_BY_DEFENCE.get(defence);
  assert(listed !== void 0, "every defence an event names is one this table reads");
  return listed.elementsAbsorbed;
}
function isDefence(token) {
  assert(token.length > 0, "a token asked about is one somebody stated");
  return DEFENCE_BY_DEFENCE.has(token);
}
function indexKeyMeanings() {
  const keyMeaningByKey = /* @__PURE__ */ new Map();
  const addKeyMeaning = (key, keyMeaning) => {
    assert(!keyMeaningByKey.has(key), "a key belongs to one family");
    keyMeaningByKey.set(key, keyMeaning);
  };
  for (const key of DAMAGE_KEYS) {
    addKeyMeaning(key, {
      kind: KEY_FAMILY.damage,
      half: key.startsWith(RAW_SIGN) ? DAMAGE_HALF.raw : DAMAGE_HALF.applied
    });
  }
  for (const key of DEFENCE_BY_KEY.keys()) {
    addKeyMeaning(key, {
      kind: KEY_FAMILY.prevented
    });
  }
  for (const key of DESTROYED_KEYS) addKeyMeaning(key, {
    kind: KEY_FAMILY.destroyed
  });
  for (const [key, end] of PROC_END_BY_KEY) {
    addKeyMeaning(key, {
      kind: KEY_FAMILY.proc,
      end,
      doesTakeValue: PROCS_WITH_VALUE.includes(key)
    });
  }
  for (const [key, change] of HEALTH_CHANGE_BY_KEY) {
    addKeyMeaning(key, {
      kind: KEY_FAMILY.healthChange,
      ...change
    });
  }
  for (const key of DECLARATION_KEYS) addKeyMeaning(key, {
    kind: KEY_FAMILY.declaration
  });
  for (const key of VALUELESS_DECLARATION_KEYS) {
    addKeyMeaning(key, {
      kind: KEY_FAMILY.valuelessDeclaration
    });
  }
  addKeyMeaning("tspell", {
    kind: KEY_FAMILY.skillName
  });
  addKeyMeaning("tcustom", {
    kind: KEY_FAMILY.customSkillName
  });
  addKeyMeaning(SKILL_ID_KEY, {
    kind: KEY_FAMILY.skillId
  });
  addKeyMeaning("winner", {
    kind: KEY_FAMILY.outcome,
    result: OUTCOME_RESULT.won
  });
  addKeyMeaning("loser", {
    kind: KEY_FAMILY.outcome,
    result: OUTCOME_RESULT.lost
  });
  addKeyMeaning("flee", {
    kind: KEY_FAMILY.fled
  });
  addKeyMeaning("healall_per", {
    kind: KEY_FAMILY.unaccountedHealth
  });
  addKeyMeaning("+oth_dmg", {
    kind: KEY_FAMILY.namedDamage
  });
  addKeyMeaning(LASTHEAL_KEY, {
    kind: KEY_FAMILY.namedHealing
  });
  assert(keyMeaningByKey.size > PROC_END_BY_KEY.size, "every family is indexed, not only the procs");
  return keyMeaningByKey;
}
function indexDefences() {
  const defenceByDefence = /* @__PURE__ */ new Map();
  for (const [key, defence] of DEFENCE_BY_KEY) {
    assert(key.startsWith(APPLIED_SIGN), "a defence stops damage on the applied side");
    if (defence.mechanism === DEFENCE_MECHANISM.pool) {
      assert(defence.elementsAbsorbed.length > 0, "a pool takes from some element");
    } else {
      assert(defence.elementsAbsorbed.length === 0, "and a chance takes from none");
    }
    const token = key.slice(APPLIED_SIGN.length);
    assert(!defenceByDefence.has(token), "a defence is named by one key");
    defenceByDefence.set(token, defence);
  }
  assert(defenceByDefence.size === DEFENCE_BY_KEY.size, "every defence key is indexed");
  return defenceByDefence;
}

// src/core/fight-decoder.ts
var UnreadMessage = class extends Error {
  name = "UnreadMessage";
  unreadCause;
  keys;
  combatantIds;
  text;
  events;
  announcementStanding;
  /** A message the grammar refused carries the refusal as its `cause`. */
  constructor(details, options) {
    super(void 0, options);
    this.unreadCause = details.unreadCause;
    this.keys = details.keys;
    this.combatantIds = details.combatantIds;
    this.text = details.text;
    this.events = details.events;
    this.announcementStanding = details.announcementStanding;
  }
};
var MESSAGE_END = {
  actor: "actor",
  target: "target"
};
var SegmentsExceeded = class extends Error {
  name = "SegmentsExceeded";
  segments;
  maximum;
  constructor(segments, maximum) {
    super();
    this.segments = segments;
    this.maximum = maximum;
  }
};
var EndUnreadable = class extends Error {
  name = "EndUnreadable";
  end;
  constructor(end) {
    super();
    this.end = end;
  }
};
var ParameterKeyEmpty = class extends Error {
  name = "ParameterKeyEmpty";
  index;
  constructor(index) {
    super();
    this.index = index;
  }
};
var MESSAGES_MAXIMUM = 32768;
var BLOWS_GRANTED_MAXIMUM = 4;
var NAME_LENGTH_MAXIMUM = 4096;
var MEMBER_SEPARATOR = ",";
var HEALTH_CHANGE_MEMBERS_MAXIMUM = 8;
var NAMED_DAMAGE_MEMBERS = 3;
var NAMED_HEALING_MEMBERS = 2;
var PERCENT_OPENER = "(";
var PERCENT_CLOSER = "%)";
var NO_WINNER = "?";
var TURN_LOST_SEPARATOR = " - ";
var SENTENCE_STOP = ".";
var ENDS_MAXIMUM = 2;
var SEGMENTS_MAXIMUM = 512;
var MESSAGE_PARTS_MAXIMUM = 32;
var FIGURE_MAXIMUM = 2 ** 30;
var SKILLS_GRANTING_MAXIMUM = 16;
var SKILL_KEYS_READ_MAXIMUM = 2;
var SEGMENT_SEPARATOR = ";";
var VALUE_SEPARATOR = "=";
var NO_COMBATANT = "0";
var SIDE_SEGMENTS = 2;
function indexBlowsGrantedBySkillId(skills) {
  assert(skills.length <= SKILLS_GRANTING_MAXIMUM, "the table grants a bounded few skills");
  const blowsGrantedBySkillId = /* @__PURE__ */ new Map();
  for (const skill of skills) {
    assert(skill.blowsGrantedMinimum > 0, "a skill in the table grants at least one blow");
    assert(skill.blowsGrantedMinimum < BLOWS_GRANTED_MAXIMUM, "and stays inside the bound");
    assert(!blowsGrantedBySkillId.has(skill.id), "and is named once");
    blowsGrantedBySkillId.set(skill.id, skill.blowsGrantedMinimum);
  }
  return blowsGrantedBySkillId;
}
function decodePayloadMessages(texts, context) {
  assert(texts.length <= MESSAGES_MAXIMUM, "a payload stays inside its stated bound");
  const events = [];
  const unread = [];
  let announcementStanding = context.announcementStanding;
  for (const text of texts) {
    const decoded = decodeMessage(text, {
      ...context,
      announcementStanding
    });
    if (decoded instanceof Error) {
      events.push(...decoded.events, decodeUnknownMessageEvent(decoded));
      unread.push(decoded);
    } else {
      events.push(...decoded.events);
    }
    announcementStanding = decoded.announcementStanding;
  }
  assert(events.length >= texts.length, "every message leaves at least one event behind");
  assert(unread.length <= texts.length, "and at most one unread record");
  return {
    events,
    unread,
    announcementStanding
  };
}
function decodeUnknownMessageEvent(unread) {
  assert(unread.keys.length <= unread.text.length, "an unread key is part of its message");
  assert(unread.combatantIds.length <= ENDS_MAXIMUM, "a message names at most two ends");
  return {
    kind: BATTLE_EVENT.unknownMessage,
    message: unread.text,
    unreadCause: unread.unreadCause,
    unreadKeys: unread.keys,
    combatantIds: unread.combatantIds
  };
}
function decodeMessage(text, context) {
  const message = parseProtocolMessage(text);
  if (message instanceof Error) {
    const unreadCause = UNREAD_CAUSE.grammarRefused;
    return new UnreadMessage({
      unreadCause,
      keys: [],
      combatantIds: [],
      text,
      events: [],
      announcementStanding: null
    }, {
      cause: message
    });
  }
  const parametersDecoded = decodeMessageParameters(message);
  const isBlow = hasAttackFigure(parametersDecoded);
  const announcedHere = decodeAnnouncedSkill(message, parametersDecoded.announcement);
  const announced = lookupAnnouncedForMessage(message, announcedHere, context.announcementStanding, isBlow);
  if (!isBlow) parametersDecoded.unreadKeys.push(...parametersDecoded.procs);
  const events = decodeMessageEvents(message, parametersDecoded, announced, context.roster, isBlow);
  const announcementStanding = composeAnnouncementStanding(context, events, announcedHere);
  if (parametersDecoded.unreadKeys.length > 0) {
    const combatantIds = getNamedCombatantIds(message);
    const unreadCause = UNREAD_CAUSE.unknownKey;
    const keys = parametersDecoded.unreadKeys;
    return new UnreadMessage({
      unreadCause,
      keys,
      combatantIds,
      text,
      events,
      announcementStanding
    });
  }
  if (events.length === 0) {
    const combatantIds = getNamedCombatantIds(message);
    const unreadCause = UNREAD_CAUSE.noParameter;
    return new UnreadMessage({
      unreadCause,
      keys: [],
      combatantIds,
      text,
      events,
      announcementStanding
    });
  }
  return {
    events,
    announcementStanding
  };
}
function composeAnnouncementStanding(context, events, announced) {
  if (announced !== null) {
    const blowsRemaining2 = calculateBlowsForAnnouncement(announced, context.tables);
    return {
      announced,
      blowsRemaining: blowsRemaining2,
      isGlued: true
    };
  }
  const announcementStanding = context.announcementStanding;
  if (announcementStanding === null) return null;
  const attack = events.find((event) => event.kind === BATTLE_EVENT.attack);
  if (attack === void 0) {
    if (!announcementStanding.isGlued) return null;
    if (!isHealingAnnouncerOnly(events, announcementStanding.announced)) return null;
    return {
      ...announcementStanding,
      isGlued: false
    };
  }
  if (attack.actorId !== announcementStanding.announced.actorId) return null;
  assert(announcementStanding.blowsRemaining > 0, "a standing handed on has a blow left to spend");
  const blowsRemaining = announcementStanding.blowsRemaining - 1;
  assert(blowsRemaining >= 0, "a standing spends no more blows than it was given");
  if (blowsRemaining === 0) return null;
  return {
    announced: announcementStanding.announced,
    blowsRemaining,
    isGlued: false
  };
}
function isHealingAnnouncerOnly(events, announced) {
  assert(announced.skillName.length > 0, "a standing announcement names something");
  assert(events.every((event) => event.kind !== BATTLE_EVENT.attack), "only a message that struck no blow is asked whether it hands a standing on");
  if (announced.actorId === null) return false;
  if (events.length === 0) return false;
  return events.every((event) => {
    if (event.kind !== BATTLE_EVENT.healthChange) return false;
    if (event.combatantId !== announced.actorId) return false;
    return event.amount >= 0;
  });
}
function calculateBlowsForAnnouncement(announced, tables) {
  if (announced.skillId === null) return BLOWS_GRANTED_MAXIMUM;
  const blowsGranted = tables.blowsGrantedBySkillId.get(announced.skillId) ?? 0;
  assert(blowsGranted >= 0, "a table grants nothing or more");
  assert(1 + blowsGranted <= BLOWS_GRANTED_MAXIMUM, "a reach stays inside its stated bound");
  return 1 + blowsGranted;
}
function decodeMessageParameters(message) {
  const parametersDecoded = {
    raw: [],
    applied: [],
    prevented: [],
    destroyed: [],
    procs: [],
    healthChanges: [],
    namedDamage: [],
    namedHealing: [],
    unaccountedShares: [],
    outcomes: [],
    declared: [],
    announcement: null,
    skillName: null,
    skillId: null,
    skillKeysRead: 0,
    unreadKeys: []
  };
  for (const parameter of message.parameters) {
    const key = parameter.key;
    const keyMeaning = lookupKeyMeaning(key);
    const valueText = parameter.value;
    let isRead;
    if (keyMeaning === null) isRead = false;
    else if (valueText === null) {
      assert(key.length > 0, "a key is never empty");
      switch (keyMeaning.kind) {
        case KEY_FAMILY.proc:
          isRead = addParameterRead(parametersDecoded.procs, key);
          break;
        case KEY_FAMILY.fled:
          isRead = addParameterRead(parametersDecoded.outcomes, decodeFledOutcome());
          break;
        case KEY_FAMILY.valuelessDeclaration:
          isRead = addParameterRead(parametersDecoded.declared, {
            effect: key,
            amount: null,
            text: null
          });
          break;
        default:
          isRead = false;
      }
    } else isRead = addValuedKey(parametersDecoded, message, key, valueText, keyMeaning);
    if (!isRead) parametersDecoded.unreadKeys.push(key);
  }
  {
    assert(parametersDecoded.skillKeysRead <= SKILL_KEYS_READ_MAXIMUM, "a message names its skill once by name and once by id, at most");
    if (parametersDecoded.skillName !== null) {
      parametersDecoded.announcement = {
        skillName: parametersDecoded.skillName,
        skillId: parametersDecoded.skillId
      };
    } else if (parametersDecoded.skillKeysRead > 0) {
      parametersDecoded.unreadKeys.push(SKILL_ID_KEY);
      parametersDecoded.skillKeysRead -= 1;
    }
  }
  const parametersReadCount = countParametersRead(parametersDecoded);
  assert(parametersReadCount === message.parameters.length, "every parameter is read or named unread, once");
  return parametersDecoded;
}
function addValuedKey(parametersDecoded, message, key, valueText, keyMeaning) {
  assert(key.length > 0, "a key is never empty");
  assert(message.parameters.length > 0, "a valued key stands in a message that has parameters");
  switch (keyMeaning.kind) {
    case KEY_FAMILY.damage:
    case KEY_FAMILY.prevented:
    case KEY_FAMILY.destroyed: {
      const amount = parseInteger(valueText);
      if (amount === null) return false;
      if (amount < 0) return false;
      if (amount > FIGURE_MAXIMUM) return false;
      assert(Number.isSafeInteger(amount), "a figure read from digits is held exactly");
      const token = parseKeyToken(key);
      if (keyMeaning.kind === KEY_FAMILY.prevented) {
        return addParameterRead(parametersDecoded.prevented, {
          defence: token,
          amount
        });
      }
      if (keyMeaning.kind === KEY_FAMILY.destroyed) {
        return addParameterRead(parametersDecoded.destroyed, {
          statistic: token,
          amount
        });
      }
      if (keyMeaning.half === DAMAGE_HALF.raw) {
        return addParameterRead(parametersDecoded.raw, {
          element: token,
          amount
        });
      }
      return addParameterRead(parametersDecoded.applied, {
        element: token,
        amount
      });
    }
    case KEY_FAMILY.proc:
      if (keyMeaning.doesTakeValue) return addParameterRead(parametersDecoded.procs, key);
      return false;
    case KEY_FAMILY.healthChange:
      return addParameterRead(parametersDecoded.healthChanges, decodeHealthChange(key, valueText, keyMeaning));
    case KEY_FAMILY.declaration:
      if (key === PROVOCATION_KEY) {
        const names = valueText.split(NAME_SEPARATOR).filter((name) => name.length > 0);
        if (names.length > COMBATANTS_MAXIMUM) return false;
        const isShoutRead = parametersDecoded.declared.some((declaredEffect) => declaredEffect.effect === PROVOCATION_KEY);
        if (isShoutRead) return false;
      }
      return addParameterRead(parametersDecoded.declared, {
        effect: key,
        amount: parseInteger(valueText),
        text: valueText
      });
    case KEY_FAMILY.skillName:
    case KEY_FAMILY.customSkillName: {
      const isUserNamed = keyMeaning.kind === KEY_FAMILY.customSkillName ? doesNameOneCombatant(message) : true;
      if (valueText.length === 0) return false;
      if (valueText.length > NAME_LENGTH_MAXIMUM) return false;
      if (!isUserNamed) return false;
      if (parametersDecoded.skillName !== null) return false;
      parametersDecoded.skillName = valueText;
      parametersDecoded.skillKeysRead += 1;
      assert(parametersDecoded.skillKeysRead <= message.parameters.length, "a skill key is one of the message's");
      return true;
    }
    case KEY_FAMILY.skillId: {
      const skillId = parseInteger(valueText);
      if (skillId === null) return false;
      if (parametersDecoded.skillId !== null) return false;
      parametersDecoded.skillId = skillId;
      parametersDecoded.skillKeysRead += 1;
      return true;
    }
    case KEY_FAMILY.outcome:
      return addParameterRead(parametersDecoded.outcomes, decodeFightOutcome(valueText, keyMeaning.result));
    case KEY_FAMILY.fled:
      return addParameterRead(parametersDecoded.outcomes, decodeFledOutcome());
    case KEY_FAMILY.unaccountedHealth:
      return addParameterRead(parametersDecoded.unaccountedShares, decodeUnaccountedShare(key, valueText));
    case KEY_FAMILY.namedDamage:
      return addParameterRead(parametersDecoded.namedDamage, decodeNamedDamage(valueText));
    case KEY_FAMILY.namedHealing:
      return addParameterRead(parametersDecoded.namedHealing, decodeNamedHealing(key, valueText));
    case KEY_FAMILY.valuelessDeclaration:
      return false;
  }
}
function addParameterRead(decodedParameters, decoded) {
  if (decoded === null) return false;
  if (decodedParameters.length >= MESSAGE_PARTS_MAXIMUM) return false;
  const count = decodedParameters.push(decoded);
  assert(count <= MESSAGE_PARTS_MAXIMUM, "a message's parts stay inside their stated bound");
  return true;
}
function decodeFledOutcome() {
  return {
    kind: BATTLE_EVENT.fightOutcome,
    result: OUTCOME_RESULT.fled,
    combatantNames: []
  };
}
function parseKeyToken(key) {
  let token;
  if (key.startsWith(RAW_SIGN)) token = key.slice(RAW_SIGN.length);
  else {
    assert(key.startsWith(APPLIED_SIGN), "a figure's key carries one of the two signs");
    token = key.slice(APPLIED_SIGN.length);
  }
  assert(token.length > 0, "a figure carries the client's own token");
  assert(key.endsWith(token), "a token is the key's own tail");
  return token;
}
function decodeHealthChange(key, valueText, keyMeaning) {
  const members = valueText.split(MEMBER_SEPARATOR);
  if (members.length > HEALTH_CHANGE_MEMBERS_MAXIMUM) return null;
  const magnitude = parseInteger(members[0] ?? "");
  if (magnitude === null) return null;
  if (Math.abs(magnitude) > FIGURE_MAXIMUM) return null;
  const declared = [];
  for (const member of members.slice(1)) {
    declared.push({
      effect: key,
      amount: parseInteger(member),
      text: member
    });
  }
  assert(declared.length < members.length, "the health figure is not a declaration");
  const amount = keyMeaning.sign * magnitude;
  return {
    source: key,
    amount,
    isOnTarget: keyMeaning.isOnTarget,
    declared
  };
}
function doesNameOneCombatant(message) {
  if (message.actor === null) return message.target !== null;
  if (message.target === null) return true;
  return message.actor.combatantId === message.target.combatantId;
}
function decodeFightOutcome(valueText, outcomeResult) {
  if (valueText.length === 0) return null;
  if (valueText === NO_WINNER) {
    if (outcomeResult === OUTCOME_RESULT.lost) return null;
    return {
      kind: BATTLE_EVENT.fightOutcome,
      result: OUTCOME_RESULT.drawn,
      combatantNames: []
    };
  }
  const combatantNames = valueText.split(NAME_SEPARATOR);
  if (combatantNames.length > COMBATANTS_MAXIMUM) return null;
  if (combatantNames.some((combatantName) => combatantName.length === 0)) return null;
  if (combatantNames.some((combatantName) => combatantName.startsWith(" "))) return null;
  assert(combatantNames.length > 0, "a side that is named has at least one member");
  return {
    kind: BATTLE_EVENT.fightOutcome,
    result: outcomeResult,
    combatantNames
  };
}
function decodeUnaccountedShare(key, valueText) {
  const declaredShare = parseDecimal(valueText);
  if (declaredShare === null) return null;
  if (declaredShare > HEALTH_PERCENT_MAXIMUM) return null;
  assert(declaredShare >= 0, "a share read is never below nothing");
  return {
    source: key,
    declaredShare
  };
}
function decodeNamedDamage(valueText) {
  const members = valueText.split(MEMBER_SEPARATOR);
  if (members.length !== NAMED_DAMAGE_MEMBERS) return null;
  const [amountText = "", elementText = "", namedText = ""] = members;
  const amount = parseInteger(amountText);
  if (amount === null) return null;
  if (amount < 0) return null;
  if (amount > FIGURE_MAXIMUM) return null;
  const named = parseNamedTarget(namedText);
  if (named === null) return null;
  const damage = {
    element: `${DAMAGE_MARKER}${elementText.trim()}`,
    amount
  };
  assert(damage.element.startsWith(DAMAGE_MARKER), "an element named is of the family");
  assert(named.targetName.length > 0, "a figure stated against a name has a name");
  return {
    ...named,
    damage
  };
}
function parseNamedTarget(text) {
  if (!text.endsWith(PERCENT_CLOSER)) return null;
  const openerIndex = text.lastIndexOf(PERCENT_OPENER);
  if (openerIndex <= 0) return null;
  const targetName = text.slice(0, openerIndex);
  const percentText = text.slice(openerIndex + PERCENT_OPENER.length, -PERCENT_CLOSER.length);
  assert(targetName.length > 0, "a stated name says something");
  assert(percentText.length < text.length, "a percentage is shorter than what carried it");
  return {
    targetName,
    targetHealthPercent: parseHealthPercent(percentText)
  };
}
function decodeNamedHealing(key, valueText) {
  const members = valueText.split(MEMBER_SEPARATOR);
  if (members.length !== NAMED_HEALING_MEMBERS) return null;
  const [amountText = "", namedText = ""] = members;
  const amount = parseInteger(amountText);
  if (amount === null) return null;
  if (amount < 0) return null;
  if (amount > FIGURE_MAXIMUM) return null;
  const named = parseNamedTarget(namedText);
  if (named === null) return null;
  assert(named.targetName.length > 0, "the healed is named inside the value");
  assert(Number.isSafeInteger(amount), "healing read from digits is held exactly");
  return {
    ...named,
    amount,
    source: key
  };
}
function countParametersRead(parametersDecoded) {
  return parametersDecoded.raw.length + parametersDecoded.applied.length + parametersDecoded.prevented.length + parametersDecoded.destroyed.length + parametersDecoded.procs.length + parametersDecoded.healthChanges.length + parametersDecoded.namedDamage.length + parametersDecoded.namedHealing.length + parametersDecoded.unaccountedShares.length + parametersDecoded.outcomes.length + parametersDecoded.declared.length + parametersDecoded.skillKeysRead + parametersDecoded.unreadKeys.length;
}
function hasAttackFigure(parametersDecoded) {
  if (parametersDecoded.raw.length > 0) return true;
  if (parametersDecoded.applied.length > 0) return true;
  if (parametersDecoded.prevented.length > 0) return true;
  return parametersDecoded.destroyed.length > 0;
}
function lookupAnnouncedForMessage(message, announcedHere, announcementStanding, isBlow) {
  if (announcedHere !== null) return announcedHere;
  if (announcementStanding === null) return null;
  const announced = announcementStanding.announced;
  if (announced.actorId === null) return null;
  if (message.actor === null) return null;
  if (message.actor.combatantId !== announced.actorId) return null;
  assert(announcementStanding.blowsRemaining > 0, "a standing announcement has a message left to reach");
  if (announcementStanding.isGlued) return announced;
  if (isBlow) return announced;
  return null;
}
function decodeAnnouncedSkill(message, skill) {
  if (skill === null) return null;
  assert(skill.skillName.length > 0, "an announcement names something");
  const actorId = message.actor?.combatantId ?? message.target?.combatantId ?? null;
  return {
    skillName: skill.skillName,
    skillId: skill.skillId,
    actorId
  };
}
function decodeMessageEvents(message, parametersDecoded, announced, roster, isBlow) {
  const events = [];
  if (isBlow) events.push(decodeAttackEvent(message, parametersDecoded, announced));
  for (const moved of parametersDecoded.healthChanges) {
    const statedEnd = moved.isOnTarget ? message.target : message.actor;
    events.push({
      kind: BATTLE_EVENT.healthChange,
      combatantId: statedEnd?.combatantId ?? null,
      amount: moved.amount,
      healthPercent: statedEnd?.healthPercent ?? null,
      source: moved.source,
      declared: moved.declared,
      announced
    });
  }
  for (const named of parametersDecoded.namedDamage) {
    events.push({
      kind: BATTLE_EVENT.damageToNamedCombatant,
      actorId: message.actor?.combatantId ?? null,
      targetName: named.targetName,
      targetId: lookupNamedCombatantId(roster, named.targetName),
      targetHealthPercent: named.targetHealthPercent,
      damage: named.damage,
      announced
    });
  }
  for (const unaccounted of parametersDecoded.unaccountedShares) {
    events.push({
      kind: BATTLE_EVENT.unaccountedHealth,
      source: unaccounted.source,
      // The actor, always: the target slot may name somebody else, and reading it would
      // credit the wrong combatant with the cast (`docs/auras-standing.md`).
      combatantId: message.actor?.combatantId ?? null,
      declaredShare: unaccounted.declaredShare,
      announced
    });
  }
  if (parametersDecoded.announcement !== null) {
    events.push(decodeSkillUsedEvent(message, parametersDecoded, isBlow));
  }
  for (const restored of parametersDecoded.namedHealing) {
    events.push({
      kind: BATTLE_EVENT.healingToNamedCombatant,
      targetName: restored.targetName,
      targetId: lookupNamedCombatantId(roster, restored.targetName),
      targetHealthPercent: restored.targetHealthPercent,
      amount: restored.amount,
      source: restored.source
    });
  }
  events.push(...parametersDecoded.outcomes);
  const declaration = decodeDeclaration(message, parametersDecoded, roster, isBlow);
  if (declaration !== null) events.push(declaration);
  assert(events.length >= parametersDecoded.outcomes.length, "every outcome read is an event");
  assert(events.length <= message.parameters.length, "no parameter makes two events");
  return events;
}
function decodeAttackEvent(message, parametersDecoded, announced) {
  assert(hasAttackFigure(parametersDecoded), "an attack states a figure");
  assert(parametersDecoded.procs.length <= message.parameters.length, "an event stays inside its bound");
  return {
    kind: BATTLE_EVENT.attack,
    actorId: message.actor?.combatantId ?? null,
    targetId: message.target?.combatantId ?? null,
    actorHealthPercent: message.actor?.healthPercent ?? null,
    targetHealthPercent: message.target?.healthPercent ?? null,
    raw: parametersDecoded.raw,
    applied: parametersDecoded.applied,
    prevented: parametersDecoded.prevented,
    destroyed: parametersDecoded.destroyed,
    procs: parametersDecoded.procs,
    declared: parametersDecoded.declared,
    announced
  };
}
function lookupNamedCombatantId(roster, name) {
  if (roster === null) return null;
  return lookupCombatantIdByName(roster, name);
}
function decodeSkillUsedEvent(message, parametersDecoded, isBlow) {
  const skill = parametersDecoded.announcement;
  assert(skill !== null, "a skill used is a skill announced");
  assert(skill.skillName.length > 0, "an announcement names something");
  return {
    kind: BATTLE_EVENT.skillUsed,
    actorId: message.actor?.combatantId ?? null,
    targetId: message.target?.combatantId ?? null,
    actorHealthPercent: message.actor?.healthPercent ?? null,
    targetHealthPercent: message.target?.healthPercent ?? null,
    skillName: skill.skillName,
    skillId: skill.skillId,
    declared: isBlow ? [] : parametersDecoded.declared
  };
}
function decodeDeclaration(message, parametersDecoded, roster, isBlow) {
  if (isBlow) return null;
  if (parametersDecoded.announcement !== null) return null;
  if (parametersDecoded.declared.length === 0) return null;
  const turnLost = lookupTurnLostBy(parametersDecoded.declared, roster);
  if (turnLost !== null) {
    return {
      kind: BATTLE_EVENT.turnLost,
      combatantId: turnLost.combatantId
    };
  }
  const statedEnd = message.actor ?? message.target;
  assert(parametersDecoded.declared.every((declaredEffect) => declaredEffect.effect.length > 0), "each names its key");
  return {
    kind: BATTLE_EVENT.declaration,
    combatantId: statedEnd?.combatantId ?? null,
    healthPercent: statedEnd?.healthPercent ?? null,
    declared: parametersDecoded.declared
  };
}
function lookupTurnLostBy(declared, roster) {
  if (roster === null) return null;
  if (declared.length !== 1) return null;
  const declaredEffect = declared[0];
  if (declaredEffect === void 0) return null;
  if (declaredEffect.effect !== TEXT_KEY) return null;
  const text = declaredEffect.text;
  if (text === null) return null;
  if (text.endsWith(SENTENCE_STOP)) return null;
  assert(roster.idByName.size <= COMBATANTS_MAXIMUM, "a roster stays inside its stated bound");
  let longest = null;
  for (const [name] of roster.idByName) {
    if (!text.startsWith(name + TURN_LOST_SEPARATOR)) continue;
    if (longest === null) longest = name;
    else if (name.length > longest.length) longest = name;
  }
  if (longest === null) return null;
  assert(text.length > longest.length, "the sentence says more than the name");
  return {
    combatantId: lookupCombatantIdByName(roster, longest)
  };
}
function getNamedCombatantIds(message) {
  const namedCombatantIds = [];
  if (message.actor !== null) namedCombatantIds.push(message.actor.combatantId);
  if (message.target !== null) {
    if (!namedCombatantIds.includes(message.target.combatantId)) {
      namedCombatantIds.push(message.target.combatantId);
    }
  }
  assert(namedCombatantIds.length <= ENDS_MAXIMUM, "a message names at most two ends");
  assert(new Set(namedCombatantIds).size === namedCombatantIds.length, "an end named twice is named once here");
  return namedCombatantIds;
}
function parseProtocolMessage(text) {
  const segments = parseProtocolMessageSegments(text);
  if (segments instanceof Error) return segments;
  const [actorSegment, targetSegment] = segments;
  assert(actorSegment !== void 0, "text always splits into at least one segment");
  const actor = parseProtocolMessageEnd(actorSegment, MESSAGE_END.actor);
  if (actor instanceof Error) return actor;
  if (targetSegment === void 0) return new EndUnreadable(MESSAGE_END.target);
  const target = parseProtocolMessageEnd(targetSegment, MESSAGE_END.target);
  if (target instanceof Error) return target;
  const parameters = [];
  for (const segment of segments.slice(SIDE_SEGMENTS)) {
    const separatorIndex = segment.indexOf(VALUE_SEPARATOR);
    const key = separatorIndex === -1 ? segment : segment.slice(0, separatorIndex);
    if (key.length === 0) return new ParameterKeyEmpty(parameters.length);
    const valueText = separatorIndex === -1 ? null : segment.slice(separatorIndex + 1);
    parameters.push({
      key,
      value: valueText
    });
  }
  assert(parameters.length + SIDE_SEGMENTS === segments.length, "no segment is dropped");
  return {
    actor,
    target,
    parameters
  };
}
function parseProtocolMessageSegments(text) {
  const segments = [];
  let from = 0;
  for (let look = 0; look < SEGMENTS_MAXIMUM; look += 1) {
    const separatorIndex = text.indexOf(SEGMENT_SEPARATOR, from);
    if (separatorIndex === -1) {
      segments.push(text.slice(from));
      assert(segments.length <= SEGMENTS_MAXIMUM, "a message kept is one inside the bound");
      return segments;
    }
    segments.push(text.slice(from, separatorIndex));
    from = separatorIndex + SEGMENT_SEPARATOR.length;
  }
  const count = countProtocolMessageSegments(text, from);
  assert(count > SEGMENTS_MAXIMUM, "a message refused for its length is past the bound");
  return new SegmentsExceeded(count, SEGMENTS_MAXIMUM);
}
function countProtocolMessageSegments(text, from) {
  assert(from <= text.length, "the count resumes inside the text");
  let count = SEGMENTS_MAXIMUM + 1;
  let separatorIndex = text.indexOf(SEGMENT_SEPARATOR, from);
  for (let look = 0; look < text.length; look += 1) {
    if (separatorIndex === -1) break;
    count += 1;
    separatorIndex = text.indexOf(SEGMENT_SEPARATOR, separatorIndex + SEGMENT_SEPARATOR.length);
  }
  assert(separatorIndex === -1, "every separator in the text was counted");
  return count;
}
function parseProtocolMessageEnd(segment, end) {
  if (segment === NO_COMBATANT) return null;
  const separatorIndex = segment.indexOf(VALUE_SEPARATOR);
  const idText = separatorIndex === -1 ? segment : segment.slice(0, separatorIndex);
  const combatantId = parseInteger(idText);
  if (combatantId === null) return new EndUnreadable(end);
  assert(Number.isSafeInteger(combatantId), "an id read is one held exactly");
  if (formatInteger(combatantId) !== idText) return new EndUnreadable(end);
  if (combatantId === 0) return new EndUnreadable(end);
  if (separatorIndex === -1) return {
    combatantId,
    healthPercent: null
  };
  const healthPercent = parseHealthPercent(segment.slice(separatorIndex + 1));
  if (healthPercent === null) return new EndUnreadable(end);
  assert(healthPercent >= 0, "a percentage the grammar accepted is never below nothing");
  return {
    combatantId,
    healthPercent
  };
}

// src/core/turn-clock.ts
var NO_TURN_STANDING = {
  announcedStrikerId: null,
  lastActorId: null
};
function lookupTurnOpener(event, turnStanding) {
  if (event.kind === BATTLE_EVENT.skillUsed) return event.actorId;
  if (event.kind === BATTLE_EVENT.attack) {
    if (event.announced !== null) return null;
    if (turnStanding.announcedStrikerId === event.actorId) return null;
    return event.actorId;
  }
  if (event.kind !== BATTLE_EVENT.declaration) return null;
  const key = lookupDeclarationOpenerKey(event);
  if (key === STEP_KEY) return event.combatantId;
  if (key === null) return null;
  if (turnStanding.lastActorId === event.combatantId) return null;
  return event.combatantId;
}
function lookupDeclarationOpenerKey(event) {
  if (hasDeclaredEffect(event, STEP_KEY)) return STEP_KEY;
  if (hasDeclaredEffect(event, PREPARE_KEY)) return PREPARE_KEY;
  return null;
}
function hasDeclaredEffect(event, effect) {
  assert(effect.length > 0, "a declaration is looked up under a key");
  assert(event.declared.length > 0, "a declaration states something");
  return event.declared.some((declared) => declared.effect === effect);
}
function addEventTurns(turnsByCombatantId, event, turnStanding) {
  addTurn(turnsByCombatantId, lookupTurnOpener(event, turnStanding));
  if (event.kind === BATTLE_EVENT.turnLost) addTurn(turnsByCombatantId, event.combatantId);
  return composeTurnStanding(event, turnStanding);
}
function addTurn(turnsByCombatantId, combatantId) {
  if (combatantId === null) return;
  const turnsTaken = turnsByCombatantId.get(combatantId) ?? 0;
  assert(turnsTaken >= 0, "a count of turns is never below nothing");
  turnsByCombatantId.set(combatantId, turnsTaken + 1);
  assert(turnsByCombatantId.size <= COMBATANTS_MAXIMUM, "a clock runs for no more than a fight");
}
function composeTurnStanding(event, turnStanding) {
  if (turnStanding.announcedStrikerId !== null) {
    assert(turnStanding.announcedStrikerId === turnStanding.lastActorId, "whoever is mid-blow acted last");
  }
  if (event.kind === BATTLE_EVENT.attack) {
    let isStriking;
    if (event.announced !== null) isStriking = true;
    else isStriking = turnStanding.announcedStrikerId === event.actorId;
    return {
      announcedStrikerId: isStriking ? event.actorId : null,
      lastActorId: event.actorId
    };
  }
  if (event.kind === BATTLE_EVENT.skillUsed) {
    return {
      announcedStrikerId: null,
      lastActorId: event.actorId
    };
  }
  if (event.kind === BATTLE_EVENT.damageToNamedCombatant) {
    return {
      announcedStrikerId: null,
      lastActorId: event.actorId
    };
  }
  if (event.kind === BATTLE_EVENT.declaration) {
    return {
      announcedStrikerId: null,
      lastActorId: turnStanding.lastActorId
    };
  }
  if (event.kind === BATTLE_EVENT.unknownMessage) return turnStanding;
  return NO_TURN_STANDING;
}

// src/core/aura-standing.ts
var AURA_REACH = {
  ...KEY_REACH,
  bothSides: "both-sides"
};
var SKILLS_DATED_MAXIMUM = 16;
var STANDINGS_MAXIMUM = COMBATANTS_MAXIMUM * SKILLS_DATED_MAXIMUM;
function replayAuraStandings(view, statedSkills) {
  const walk = {
    castByCasterAndSkill: /* @__PURE__ */ new Map(),
    shoutByProvokedId: /* @__PURE__ */ new Map(),
    turnsByCombatantId: /* @__PURE__ */ new Map()
  };
  let turnStanding = NO_TURN_STANDING;
  for (const [eventIndex, event] of view.events.entries()) {
    turnStanding = addEventTurns(walk.turnsByCombatantId, event, turnStanding);
    const cast = lookupAuraCast(event, statedSkills, walk.turnsByCombatantId, view.eventsAtSeatingByCombatantId, eventIndex);
    if (cast === null) continue;
    if (cast.turnsStated !== null) {
      walk.castByCasterAndSkill.set(`${cast.casterId}/${cast.skillId}`, cast);
    }
    for (const provokedId of lookupProvokedIds(cast, view.roster)) {
      const turnsAtShout = walk.turnsByCombatantId.get(provokedId) ?? 0;
      walk.shoutByProvokedId.set(provokedId, {
        cast,
        turnsAtShout
      });
    }
    assert(walk.castByCasterAndSkill.size <= STANDINGS_MAXIMUM, "a fight stays inside its stated bound");
    assert(walk.shoutByProvokedId.size <= COMBATANTS_MAXIMUM, "and holds nobody the cast does not");
  }
  return {
    auras: composeDatedCasts(walk).filter((cast) => cast.turnsElapsed < cast.turnsStated),
    casts: composeDatedCasts(walk),
    provocations: composeProvocationStandings(walk)
  };
}
function lookupAuraCast(event, statedSkills, turnsByCombatantId, eventsAtSeatingByCombatantId, eventIndex) {
  if (event.kind !== BATTLE_EVENT.skillUsed) return null;
  if (event.actorId === null) return null;
  if (event.skillId === null) return null;
  if (!event.declared.some((declaredEffect) => isSideWideKey(declaredEffect.effect))) return null;
  const turnsAtCast = turnsByCombatantId.get(event.actorId) ?? 0;
  const isShout = event.declared.some((declaredEffect) => declaredEffect.effect === PROVOCATION_KEY);
  const shoutStated = isShout ? statedSkills.shoutsBySkillId.get(event.skillId) : void 0;
  const shout = shoutStated === void 0 ? null : {
    turns: shoutStated.turns,
    names: parseShoutNames(event.declared)
  };
  const turnsStated = statedSkills.auraTurnsBySkillId.get(event.skillId) ?? null;
  if (turnsStated !== null) assert(turnsStated > 0, "a half that is dated runs for stated turns");
  if (shout !== null) assert(shout.turns > 0, "and so does the other one");
  assert(turnsAtCast > 0, "the cast stands on a turn its caster has taken");
  return {
    skillId: event.skillId,
    skillName: event.skillName,
    casterId: event.actorId,
    turnsAtCast,
    turnsStated,
    reach: lookupReachOfEffects(event.declared),
    shoutTargetId: isShout ? event.targetId : null,
    shout,
    amountByKey: indexAmountByKey(event.declared),
    turnsAtCastByCombatantId: composeTurnsAtCast(turnsByCombatantId, eventsAtSeatingByCombatantId, eventIndex)
  };
}
function composeTurnsAtCast(turnsByCombatantId, eventsAtSeatingByCombatantId, eventIndex) {
  assert(eventIndex >= 0, "a cast stands at an event of the fight");
  const turnsAtCastByCombatantId = /* @__PURE__ */ new Map();
  for (const [combatantId, eventsAtSeating] of eventsAtSeatingByCombatantId) {
    if (eventsAtSeating <= eventIndex) turnsAtCastByCombatantId.set(combatantId, 0);
  }
  for (const [combatantId, turnsTaken] of turnsByCombatantId) {
    turnsAtCastByCombatantId.set(combatantId, turnsTaken);
  }
  assert(turnsAtCastByCombatantId.size <= COMBATANTS_MAXIMUM, "a cast dates nobody the fight does not count");
  return turnsAtCastByCombatantId;
}
function indexAmountByKey(declared) {
  const amountByKey = /* @__PURE__ */ new Map();
  for (const declaredEffect of declared) {
    if (declaredEffect.amount !== null) {
      amountByKey.set(declaredEffect.effect, declaredEffect.amount);
    }
  }
  assert(amountByKey.size <= declared.length, "no key states more figures than it was declared with");
  return amountByKey;
}
function lookupProvokedIds(cast, roster) {
  if (cast.shout === null) return [];
  const provokedIds = [];
  for (const name of cast.shout.names) {
    const combatantId = lookupCombatantIdByName(roster, name);
    if (combatantId === null) continue;
    if (!provokedIds.includes(combatantId)) provokedIds.push(combatantId);
  }
  assert(provokedIds.length <= cast.shout.names.length, "no more are held than the value named");
  assert(provokedIds.every((heldId) => roster.byId.has(heldId)), "and each of them is in the roster");
  return provokedIds;
}
function composeDatedCasts(walk) {
  const datedCasts = [];
  for (const cast of walk.castByCasterAndSkill.values()) {
    const turnsStated = cast.turnsStated;
    assert(turnsStated !== null, "a cast the walk holds is one the table dates");
    const turnsTakenNow = walk.turnsByCombatantId.get(cast.casterId) ?? cast.turnsAtCast;
    const turnsElapsed = turnsTakenNow - cast.turnsAtCast;
    assert(turnsElapsed >= 0, "a caster never takes fewer turns than they had at the cast");
    datedCasts.push({
      skillId: cast.skillId,
      skillName: cast.skillName,
      casterId: cast.casterId,
      turnsElapsed,
      turnsStated,
      reach: cast.reach,
      shoutTargetId: cast.shoutTargetId,
      amountByKey: cast.amountByKey,
      turnsAtCastByCombatantId: cast.turnsAtCastByCombatantId
    });
  }
  assert(datedCasts.length === walk.castByCasterAndSkill.size, "every cast held is dated once");
  return datedCasts;
}
function composeProvocationStandings(walk) {
  const provocationStandings = [];
  for (const [provokedId, provocation] of walk.shoutByProvokedId) {
    const cast = provocation.cast;
    assert(cast.shout !== null, "a cast holding somebody shouted");
    const turnsTakenNow = walk.turnsByCombatantId.get(provokedId) ?? provocation.turnsAtShout;
    const turnsElapsed = turnsTakenNow - provocation.turnsAtShout;
    assert(turnsElapsed >= 0, "a character never takes fewer turns than they had at the shout");
    if (turnsElapsed > cast.shout.turns) continue;
    provocationStandings.push({
      provokedId,
      skillId: cast.skillId,
      skillName: cast.skillName,
      casterId: cast.casterId,
      turnsElapsed,
      turnsStated: cast.shout.turns
    });
  }
  assert(provocationStandings.length <= walk.shoutByProvokedId.size, "no more are held than were shouted at");
  return provocationStandings;
}
function parseShoutNames(declared) {
  const shoutNames = [];
  for (const declaredEffect of declared) {
    if (declaredEffect.effect !== PROVOCATION_KEY) continue;
    if (declaredEffect.text === null) continue;
    for (const name of declaredEffect.text.split(NAME_SEPARATOR)) {
      if (name.length > 0) shoutNames.push(name);
    }
  }
  assert(shoutNames.length <= COMBATANTS_MAXIMUM, "a shout names no more than a fight holds");
  return shoutNames;
}
function lookupReachOfEffects(effects) {
  assert(effects.length <= MESSAGE_PARTS_MAXIMUM, "a cast states no more than a message is read to");
  let castReach = null;
  for (const declaredEffect of effects) {
    const reach = lookupKeyReach(declaredEffect.effect);
    if (reach === null) continue;
    if (castReach === null) castReach = reach;
    else if (castReach !== reach) castReach = AURA_REACH.bothSides;
  }
  return castReach;
}
function indexAuraTurnsBySkillId(skills) {
  assert(skills.length <= SKILLS_DATED_MAXIMUM, "the table dates a bounded few skills");
  const auraTurnsBySkillId = /* @__PURE__ */ new Map();
  for (const skill of skills) {
    assert(skill.turns > 0, "a skill in the table runs for a stated number of turns");
    auraTurnsBySkillId.set(skill.id, skill.turns);
  }
  assert(auraTurnsBySkillId.size === skills.length, "and each of them is named once");
  return auraTurnsBySkillId;
}
function indexShoutsBySkillId(skills) {
  assert(skills.length <= SKILLS_DATED_MAXIMUM, "the table dates a bounded few shouts");
  const shoutsBySkillId = /* @__PURE__ */ new Map();
  for (const skill of skills) {
    assert(skill.turns > 0, "a shout in the table holds for a stated number of turns");
    assert(skill.coverageMinimum > 0, "and covers at least one character");
    shoutsBySkillId.set(skill.id, {
      turns: skill.turns,
      coverageMinimum: skill.coverageMinimum
    });
  }
  assert(shoutsBySkillId.size === skills.length, "and each of them is named once");
  return shoutsBySkillId;
}

// src/core/carried-status.ts
var STATUS_BITS_MAXIMUM = 32;
var CARRIERS_MAXIMUM = COMBATANTS_MAXIMUM;
var NO_CARRIED_STATUS_WALK = {
  turnStanding: NO_TURN_STANDING,
  turnsByCombatantId: /* @__PURE__ */ new Map(),
  lightingTurnByBitByCombatantId: /* @__PURE__ */ new Map()
};
function prepareCarriedStatusWalk(walk, events, masksByCombatantId) {
  const turnsByCombatantId = new Map(walk.turnsByCombatantId);
  let turnStanding = walk.turnStanding;
  for (const event of events) {
    turnStanding = addEventTurns(turnsByCombatantId, event, turnStanding);
  }
  const lightingTurnByBitByCombatantId = new Map(walk.lightingTurnByBitByCombatantId);
  for (const [combatantId, mask] of masksByCombatantId) {
    assert(Number.isSafeInteger(mask), "a mask handed to the walk is a whole count of bits");
    assert(mask >= 0, "and never a sign");
    assert(mask < 2 ** STATUS_BITS_MAXIMUM, "and no bit past the ones a mask holds");
    const turnsNow = turnsByCombatantId.get(combatantId) ?? 0;
    const lightingTurnByBit = prepareLightingTurnByBit(lightingTurnByBitByCombatantId.get(combatantId), mask, turnsNow);
    if (lightingTurnByBit.size === 0) lightingTurnByBitByCombatantId.delete(combatantId);
    else lightingTurnByBitByCombatantId.set(combatantId, lightingTurnByBit);
  }
  assert(lightingTurnByBitByCombatantId.size <= CARRIERS_MAXIMUM, "no more carriers than a board holds");
  return {
    turnStanding,
    turnsByCombatantId,
    lightingTurnByBitByCombatantId
  };
}
function prepareLightingTurnByBit(lightingTurnByBitBefore, mask, turnsNow) {
  assert(turnsNow >= 0, "a clock counts turns from none");
  const lightingTurnByBit = /* @__PURE__ */ new Map();
  for (let bit = 0; bit < STATUS_BITS_MAXIMUM; bit += 1) {
    if ((mask >> bit & 1) !== 1) continue;
    lightingTurnByBit.set(bit, lightingTurnByBitBefore?.get(bit) ?? turnsNow);
  }
  assert(lightingTurnByBit.size <= STATUS_BITS_MAXIMUM, "a combatant holds no more statuses than a mask has");
  return lightingTurnByBit;
}
function composeCarriedStatuses(walk) {
  const carriedStatuses = [];
  for (const [combatantId, lightingTurnByBit] of walk.lightingTurnByBitByCombatantId) {
    const turnsNow = walk.turnsByCombatantId.get(combatantId) ?? 0;
    for (const [bit, turnsAtLighting] of lightingTurnByBit) {
      const turnsElapsed = turnsNow - turnsAtLighting;
      assert(turnsElapsed >= 0, "a clock never runs behind the turn a status lit on");
      carriedStatuses.push({
        combatantId,
        bit,
        turnsElapsed
      });
    }
  }
  assert(carriedStatuses.length <= CARRIERS_MAXIMUM * STATUS_BITS_MAXIMUM, "no more rows than bits");
  return carriedStatuses.sort((leftStatus, rightStatus) => leftStatus.combatantId - rightStatus.combatantId || leftStatus.bit - rightStatus.bit);
}

// src/core/carried-figure.ts
var SOURCES_COUNTED = 2;
var HALVED_FOR_THE_CASTER = [
  HASTE_AURA_KEY
];
var SLOW_BIT_NAME = "swow_down";
var HASTE_BIT_NAME = "speed_up";
var KEY_BY_BIT_NAME = /* @__PURE__ */ new Map([
  [
    SLOW_BIT_NAME,
    SLOW_ALL_KEY
  ],
  [
    HASTE_BIT_NAME,
    HASTE_AURA_KEY
  ]
]);
function indexKeyByStatusBit(bits) {
  assert(bits.length <= STATUS_BITS_MAXIMUM, "the client registers a short list of statuses");
  const keyByStatusBit = /* @__PURE__ */ new Map();
  for (let bit = 0; bit < bits.length; bit += 1) {
    const key = KEY_BY_BIT_NAME.get(bits[bit] ?? "");
    if (key !== void 0) keyByStatusBit.set(bit, key);
  }
  assert(keyByStatusBit.size <= KEY_BY_BIT_NAME.size, "no more are witnessed than have a key");
  return keyByStatusBit;
}
function tallyCarriedFigures(inputs) {
  assert(inputs.keyByStatusBit.size <= STATUS_BITS_MAXIMUM, "the bits witnessed are a short list");
  const carriedFigures = [];
  for (const status of inputs.statuses) {
    const key = inputs.keyByStatusBit.get(status.bit);
    if (key === void 0) continue;
    const combatant = inputs.roster.byId.get(status.combatantId);
    if (combatant === void 0) continue;
    const turnsTaken = inputs.turnsByCombatantId.get(status.combatantId) ?? 0;
    const bearer = {
      combatantId: status.combatantId,
      side: combatant.side,
      turnsTaken
    };
    const casts = lookupCastsOverBearer(inputs.casts, inputs.roster, bearer, key);
    const percent = tallyPercentForBearer(casts, bearer, key);
    carriedFigures.push({
      combatantId: status.combatantId,
      bit: status.bit,
      percent
    });
  }
  assert(carriedFigures.length <= inputs.statuses.length, "no more rows than statuses handed in");
  return carriedFigures;
}
function lookupCastsOverBearer(casts, roster, bearer, key) {
  assert(casts.length <= STANDINGS_MAXIMUM, "a walk over casts is bounded as the casts are");
  assert(bearer.turnsTaken >= 0, "and a count of turns never runs backwards");
  const castsOverBearer = [];
  for (const cast of casts) {
    if (cast.amountByKey.get(key) === void 0) continue;
    const caster = roster.byId.get(cast.casterId);
    if (caster === void 0) continue;
    if (!doesKeyReachBearer(key, caster.side, bearer.side)) continue;
    const turnsAtCast = cast.turnsAtCastByCombatantId.get(bearer.combatantId);
    if (turnsAtCast === void 0) continue;
    const turnsElapsed = bearer.turnsTaken - turnsAtCast;
    if (turnsElapsed < 0) continue;
    if (turnsElapsed < cast.turnsStated) castsOverBearer.push(cast);
  }
  assert(castsOverBearer.length <= casts.length, "a bearer is reached by some of the casts walked");
  return castsOverBearer;
}
function doesKeyReachBearer(key, casterSide, bearerSide) {
  assert(key.length > 0, "a reach is asked of a key");
  assert(Number.isSafeInteger(casterSide), "and between two sides the roster states");
  const reach = lookupKeyReach(key);
  if (reach === null) return false;
  if (reach === KEY_REACH.castersSide) return casterSide === bearerSide;
  return casterSide !== bearerSide;
}
function tallyPercentForBearer(casts, bearer, key) {
  assert(key.length > 0, "a figure is asked of a key");
  assert(casts.length <= STANDINGS_MAXIMUM, "and over the casts the walk above bounded");
  if (isCasterHalved(casts, bearer.combatantId, key)) return null;
  if (casts.length === 0) return null;
  const highestByCasterId = /* @__PURE__ */ new Map();
  for (const cast of casts) {
    const amount = cast.amountByKey.get(key);
    assert(amount !== void 0, "a cast over the bearer states the key it was walked for");
    const highest = highestByCasterId.get(cast.casterId) ?? amount;
    highestByCasterId.set(cast.casterId, Math.max(highest, amount));
  }
  assert(highestByCasterId.size <= casts.length, "no more sources than casts");
  const amountsDescending = [
    ...highestByCasterId.values()
  ].sort((leftAmount, rightAmount) => rightAmount - leftAmount);
  let summed = 0;
  for (let amountIndex = 0; amountIndex < SOURCES_COUNTED; amountIndex += 1) {
    summed += amountsDescending[amountIndex] ?? 0;
  }
  return summed;
}
function isCasterHalved(casts, combatantId, key) {
  assert(Number.isSafeInteger(combatantId), "a bearer is asked about by identity");
  if (!HALVED_FOR_THE_CASTER.includes(key)) return false;
  return casts.some((cast) => {
    if (cast.casterId !== combatantId) return false;
    return cast.amountByKey.get(key) !== void 0;
  });
}

// src/core/legendary-standing.ts
var HOLYTOUCH_HEALS_STATED = 3;
var HOLDERS_MAXIMUM = COMBATANTS_MAXIMUM;
var BONUSES_PER_HOLDER_MAXIMUM = 16;
var NO_LEGENDARY_WALK = {
  holytouchHealsByHolderId: /* @__PURE__ */ new Map(),
  lastHealSpentCombatantIds: /* @__PURE__ */ new Set()
};
function prepareLegendaryWalk(walk, events) {
  const holytouchHealsByHolderId = new Map(walk.holytouchHealsByHolderId);
  const lastHealSpentCombatantIds = new Set(walk.lastHealSpentCombatantIds);
  for (const event of events) {
    if (event.kind === BATTLE_EVENT.attack) {
      const isLit = event.declared.some((declaredEffect) => declaredEffect.effect === HOLYTOUCH_DECLARATION_KEY);
      if (isLit) {
        if (event.actorId !== null) holytouchHealsByHolderId.set(event.actorId, 0);
      }
    }
    if (event.kind === BATTLE_EVENT.healingToNamedCombatant) {
      if (event.source === LASTHEAL_KEY) {
        if (event.targetId !== null) lastHealSpentCombatantIds.add(event.targetId);
      }
    }
    if (event.kind !== BATTLE_EVENT.healthChange) continue;
    if (event.source !== HOLYTOUCH_HEAL_KEY) continue;
    const holderId = event.combatantId;
    if (holderId === null) continue;
    const heals = holytouchHealsByHolderId.get(holderId);
    if (heals === void 0) continue;
    assert(heals >= 0, "a run open on a holder has given none or more");
    holytouchHealsByHolderId.set(holderId, heals + 1);
  }
  assert(holytouchHealsByHolderId.size <= HOLDERS_MAXIMUM, "a board holds a bounded cast");
  assert(lastHealSpentCombatantIds.size <= HOLDERS_MAXIMUM, "and so does what has been spent on it");
  return {
    holytouchHealsByHolderId,
    lastHealSpentCombatantIds
  };
}
function composeLegendaryStandings(walk) {
  const standingByCombatantId = /* @__PURE__ */ new Map();
  for (const [combatantId, heals] of walk.holytouchHealsByHolderId) {
    assert(heals >= 0, "a run has given no fewer heals than none");
    if (heals >= HOLYTOUCH_HEALS_STATED) continue;
    const hasSpentLastheal = walk.lastHealSpentCombatantIds.has(combatantId);
    standingByCombatantId.set(combatantId, {
      combatantId,
      holytouchHealsReceived: heals,
      hasSpentLastheal
    });
  }
  for (const combatantId of walk.lastHealSpentCombatantIds) {
    if (standingByCombatantId.has(combatantId)) continue;
    standingByCombatantId.set(combatantId, {
      combatantId,
      holytouchHealsReceived: null,
      hasSpentLastheal: true
    });
  }
  assert(standingByCombatantId.size <= HOLDERS_MAXIMUM, "a row for a combatant, whichever bonus it is for");
  return [
    ...standingByCombatantId.values()
  ].sort((leftStanding, rightStanding) => leftStanding.combatantId - rightStanding.combatantId);
}
function countLegendaryBonuses(events) {
  const countsByCombatantId = /* @__PURE__ */ new Map();
  const reachedByCombatantId = /* @__PURE__ */ new Map();
  for (const event of events) {
    let keys;
    let actorId;
    let targetId;
    if (event.kind === BATTLE_EVENT.attack) {
      keys = [
        ...event.procs,
        ...event.declared.map((declared) => declared.effect)
      ];
      actorId = event.actorId;
      targetId = event.targetId;
    } else if (event.kind === BATTLE_EVENT.healingToNamedCombatant) {
      keys = [
        event.source
      ];
      actorId = null;
      targetId = event.targetId;
    } else {
      continue;
    }
    for (const key of keys) {
      const bonus = lookupLegendaryBonus(key);
      if (bonus === null) continue;
      const holderId = bonus.end === PROC_END.actor ? actorId : targetId;
      if (holderId === null) continue;
      const countByKey = countsByCombatantId.get(holderId) ?? /* @__PURE__ */ new Map();
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      countsByCombatantId.set(holderId, countByKey);
      assert(countByKey.size <= BONUSES_PER_HOLDER_MAXIMUM, "a holder shows a bounded few");
      if (!bonus.doesReachOtherEnd) continue;
      const reachedId = bonus.end === PROC_END.actor ? targetId : actorId;
      if (reachedId === null) continue;
      const reachedByKey = reachedByCombatantId.get(reachedId) ?? /* @__PURE__ */ new Map();
      reachedByKey.set(key, (reachedByKey.get(key) ?? 0) + 1);
      reachedByCombatantId.set(reachedId, reachedByKey);
      assert(reachedByKey.size <= BONUSES_PER_HOLDER_MAXIMUM, "and is reached by a bounded few");
    }
  }
  assert(countsByCombatantId.size <= HOLDERS_MAXIMUM, "a board holds a bounded cast");
  assert(reachedByCombatantId.size <= HOLDERS_MAXIMUM, "and so does whoever a bonus reached");
  return {
    byHolderId: countsByCombatantId,
    byReachedId: reachedByCombatantId
  };
}

// libs/number-range.ts
function clampNumber(number, minimum, maximum) {
  assert(Number.isFinite(number), "a value being held between two ends is a number");
  assert(Number.isFinite(minimum), "and so is the bottom");
  assert(Number.isFinite(maximum), "and the top");
  if (maximum < minimum) return minimum;
  if (number < minimum) return minimum;
  if (number > maximum) return maximum;
  return number;
}

// src/core/combatant-health.ts
var PERCENT_WHOLE = 100;
function calculateHealthFromPercent(percent, healthMaximum) {
  assert(Number.isFinite(percent), "a percentage to read from is a number");
  assert(percent >= 0, "a percentage is never below nothing");
  if (healthMaximum === null) return null;
  assert(Number.isFinite(healthMaximum), "a maximum to read against is a number");
  const health = Math.round(percent * healthMaximum / PERCENT_WHOLE);
  assert(health >= 0, "health read from a percentage is never below nothing");
  return health;
}
function getHealthPercentsFromEvent(event) {
  const stated = [];
  const addStatedPercent = (combatantId, percent) => {
    if (combatantId === null) return;
    if (percent !== null) stated.push([
      combatantId,
      percent
    ]);
  };
  switch (event.kind) {
    case BATTLE_EVENT.attack:
    case BATTLE_EVENT.skillUsed:
      addStatedPercent(event.actorId, event.actorHealthPercent);
      addStatedPercent(event.targetId, event.targetHealthPercent);
      break;
    case BATTLE_EVENT.healthChange:
    case BATTLE_EVENT.declaration:
      addStatedPercent(event.combatantId, event.healthPercent);
      break;
    case BATTLE_EVENT.damageToNamedCombatant:
    case BATTLE_EVENT.healingToNamedCombatant:
      addStatedPercent(event.targetId, event.targetHealthPercent);
      break;
  }
  assert(stated.length <= ENDS_MAXIMUM, "an event states where at most two combatants stand");
  return stated;
}
function indexFightEntryHealth(events, roster) {
  assert(roster.byId.size <= COMBATANTS_MAXIMUM, "a roster stays inside its stated bound");
  const entryHealthByCombatantId = /* @__PURE__ */ new Map();
  for (const event of events) {
    for (const [combatantId, percent] of getHealthPercentsFromEvent(event)) {
      if (entryHealthByCombatantId.has(combatantId)) continue;
      const maximum = roster.byId.get(combatantId)?.healthMaximum ?? null;
      const health = calculateHealthFromPercent(percent, maximum);
      if (health === null) continue;
      assert(maximum !== null, "a health read off a percentage was read against a pool");
      assert(health <= maximum, "nobody enters above their own pool");
      entryHealthByCombatantId.set(combatantId, health);
    }
  }
  assert(entryHealthByCombatantId.size <= roster.byId.size, "a fight is entered by the people in it");
  return entryHealthByCombatantId;
}
function indexSideHeals(events, roster) {
  const entryHealthByCombatantId = indexFightEntryHealth(events, roster);
  const reducedSides = indexReducedSides(events, roster);
  const healthByCombatantId = /* @__PURE__ */ new Map();
  const sideHealByEvent = /* @__PURE__ */ new Map();
  for (const event of events) {
    const heal = composeSideHeal(event, roster, entryHealthByCombatantId, healthByCombatantId);
    if (heal !== null) {
      const casterSide = roster.byId.get(heal.casterId)?.side;
      assert(casterSide !== void 0, "a cast is sized only on a side its caster stands on");
      if (!reducedSides.has(casterSide)) {
        sideHealByEvent.set(event, heal);
        for (const [combatantId, amount] of heal.restoredByCombatantId) {
          const healthNow = healthByCombatantId.get(combatantId);
          assert(healthNow !== void 0, "a cast is sized only over health it read");
          healthByCombatantId.set(combatantId, healthNow + amount);
        }
      }
    }
    for (const [combatantId, percent] of getHealthPercentsFromEvent(event)) {
      const maximum = roster.byId.get(combatantId)?.healthMaximum ?? null;
      const health = calculateHealthFromPercent(percent, maximum);
      if (health !== null) healthByCombatantId.set(combatantId, health);
    }
  }
  assert(sideHealByEvent.size <= events.length, "a cast is one event");
  return sideHealByEvent;
}
function indexReducedSides(events, roster) {
  const reducedSides = /* @__PURE__ */ new Set();
  for (const event of events) {
    if (event.kind !== BATTLE_EVENT.skillUsed) continue;
    if (!event.declared.some((declaredEffect) => declaredEffect.effect === HEALING_REDUCER_KEY)) continue;
    const casterSide = event.actorId === null ? void 0 : roster.byId.get(event.actorId)?.side;
    for (const combatant of roster.byId.values()) {
      if (combatant.side !== casterSide) reducedSides.add(combatant.side);
    }
  }
  assert(reducedSides.size <= roster.byId.size, "a side reduced is a side somebody is on");
  return reducedSides;
}
function composeSideHeal(event, roster, entryHealthByCombatantId, healthByCombatantId) {
  if (event.kind !== BATTLE_EVENT.unaccountedHealth) return null;
  if (event.combatantId === null) return null;
  const casterSide = roster.byId.get(event.combatantId)?.side;
  if (casterSide === void 0) return null;
  assert(event.declaredShare >= 0, "a share sized is never below nothing");
  const restoredByCombatantId = /* @__PURE__ */ new Map();
  let isWhole = true;
  for (const combatant of roster.byId.values()) {
    if (combatant.side !== casterSide) continue;
    const healthAtEntry = entryHealthByCombatantId.get(combatant.id);
    const healthNow = healthByCombatantId.get(combatant.id);
    const maximum = combatant.healthMaximum;
    if (maximum === null) isWhole = false;
    else if (healthAtEntry === void 0) isWhole = false;
    else if (healthNow === void 0) isWhole = false;
    else {
      const share = Math.floor(event.declaredShare * maximum / PERCENT_WHOLE);
      const amount = clampNumber(share, 0, healthAtEntry - healthNow);
      assert(amount <= share, "nobody is given more than the share the protocol stated");
      restoredByCombatantId.set(combatant.id, amount);
    }
  }
  assert(restoredByCombatantId.size <= roster.byId.size, "a cast reaches the people in the fight");
  const casterId = event.combatantId;
  const source = event.source;
  return {
    casterId,
    source,
    declaredShare: event.declaredShare,
    restoredByCombatantId,
    isWhole
  };
}

// src/core/fight-statistics.ts
var TOTALLED_FIELDS = [
  "damageDealt",
  "damageTaken",
  "damageDealtRaw",
  "damageDealtApplied",
  "damageTakenRaw",
  "damageTakenApplied",
  "damageDealtAbsorbed",
  "damageTakenAbsorbed",
  "damagePrevented",
  "healthRestored",
  "healthGiven"
];
var CUT_MAXIMUM = 64;
var KIND_ELEMENTS_SEPARATOR = "|";
var SKILLS_MAXIMUM = 256;
var UNREAD_COUNT_BY_CAUSE = {
  [UNREAD_CAUSE.unknownKey]: "unreadMessagesUnknownKey",
  [UNREAD_CAUSE.noParameter]: "unreadMessagesNoParameter",
  [UNREAD_CAUSE.grammarRefused]: "unreadMessagesGrammarRefused"
};
function tallyFightStatistics(events, sideHealByEvent) {
  const tallying = {
    byCombatantId: /* @__PURE__ */ new Map(),
    woundByWoundedId: /* @__PURE__ */ new Map(),
    damageDealtByNobody: 0,
    damageTakenByNobody: 0,
    healthGivenByNobody: 0,
    healthRestoredToNobody: 0,
    damageByNeitherEnd: 0,
    damageByNeitherEndByKind: /* @__PURE__ */ new Map(),
    unreadMessagesUnknownKey: 0,
    unreadMessagesNoParameter: 0,
    unreadMessagesGrammarRefused: 0,
    sideHealsUnsized: 0,
    sideHealsStated: 0,
    turnStanding: NO_TURN_STANDING,
    outcome: null
  };
  for (const event of events) {
    if (event.kind === BATTLE_EVENT.unknownMessage) {
      const { unreadCause, combatantIds } = event;
      assert(combatantIds.length <= ENDS_MAXIMUM, "a message names at most its two ends");
      tallying[UNREAD_COUNT_BY_CAUSE[unreadCause]] += 1;
      if (unreadCause === UNREAD_CAUSE.grammarRefused) {
        assert(combatantIds.length === 0, "a grammar nobody could read named nobody either");
      }
      for (const combatantId of new Set(combatantIds)) {
        const figures = addCombatantFigures(tallying.byCombatantId, combatantId);
        if (unreadCause === UNREAD_CAUSE.unknownKey) {
          figures.unreadMessagesUnknownKey += 1;
        } else figures.unreadMessagesNoParameter += 1;
      }
    }
    if (event.kind === BATTLE_EVENT.unaccountedHealth) {
      const casterId = event.combatantId;
      const announced = event.announced;
      const heal = sideHealByEvent.get(event);
      tallying.sideHealsStated += 1;
      if (casterId !== null) {
        assert(Number.isSafeInteger(casterId), "a caster named is an id read");
      }
      if (heal === void 0) {
        tallying.sideHealsUnsized += 1;
        addUnplacedCast(tallying, casterId ?? announced?.actorId ?? null);
      } else {
        if (!heal.isWhole) {
          tallying.sideHealsUnsized += 1;
          addUnplacedCast(tallying, heal.casterId);
        }
        for (const [combatantId, amount] of heal.restoredByCombatantId) {
          assert(amount >= 0, "a cast puts back no less than nothing");
          addCombatantFigures(tallying.byCombatantId, combatantId).healthRestored += amount;
          addHealthRestoredBySource(tallying, combatantId, heal.source, amount, announced);
          const stated = {
            source: heal.source,
            announced
          };
          addHealthGiven(tallying, heal.casterId, amount, combatantId, stated);
          if (announced === null) continue;
          assert(announced.actorId === heal.casterId, "one combatant cast it and one announced it");
          addSkillRestored(tallying, announced, amount, combatantId);
        }
        assert(tallying.sideHealsUnsized >= 0, "a count of casts never falls below nothing");
        assert(tallying.sideHealsUnsized <= tallying.sideHealsStated, "and no more of them than were stated");
      }
    }
    if (event.kind === BATTLE_EVENT.attack) {
      const blow = tallyBlowFigures(event);
      const dealer = event.actorId === null ? null : addCombatantFigures(tallying.byCombatantId, event.actorId);
      if (dealer === null) tallying.damageDealtByNobody += blow.amount;
      else addBlowDealt(dealer, event, blow);
      if (event.targetId === null) {
        addBlowProcs(dealer, null, event.procs);
        addBlowWithNoTarget(tallying, event.actorId, blow.amount, blow.kinds);
      } else {
        const target = addCombatantFigures(tallying.byCombatantId, event.targetId);
        addBlowTaken(target, event, blow);
        addBlowProcs(dealer, target, event.procs);
      }
      const wound = lookupAnnouncedWound(event);
      if (wound !== null) tallying.woundByWoundedId.set(wound.woundedId, wound.standing);
      assert(tallying.woundByWoundedId.size <= COMBATANTS_MAXIMUM, "a fight stays inside its bound");
    }
    if (event.kind === BATTLE_EVENT.damageToNamedCombatant) {
      const amount = event.damage.amount;
      assert(Number.isSafeInteger(amount), "a figure totalled is a whole number");
      assert(amount >= 0, "damage stated against a name is never below nothing");
      if (event.actorId === null) tallying.damageDealtByNobody += amount;
      else {
        const dealer = addCombatantFigures(tallying.byCombatantId, event.actorId);
        addDamageDealtApplied(dealer, amount);
        dealer.damageDealtBlowLargest = calculateBlowLargest(dealer.damageDealtBlowLargest, amount);
        addToCut(dealer.damageDealtByKind, event.damage.element, amount);
        if (event.announced !== null) {
          const otherEndKey = getOtherEndKey(event.targetId);
          addSkillDealt(dealer.skills, event.announced, amount, otherEndKey);
        } else if (event.targetId !== null) {
          addToCut(dealer.damageDealtWithoutSkillByOpponent, `${event.targetId}`, amount);
        }
        if (event.targetId !== null) {
          addToCut(dealer.damageDealtByOpponent, `${event.targetId}`, amount);
          addDamageFiguresToOtherEndCut(dealer.damageDealtByOpponentAndKind, `${event.targetId}`, [
            event.damage
          ]);
        }
      }
      if (event.targetId === null) {
        addBlowWithNoTarget(tallying, event.actorId, amount, [
          event.damage
        ]);
      } else {
        const target = addCombatantFigures(tallying.byCombatantId, event.targetId);
        addNamedDamageTaken(target, event, amount);
      }
    }
    if (event.kind === BATTLE_EVENT.healthChange) {
      assert(Number.isSafeInteger(event.amount), "a movement totalled is a whole number");
      if (event.combatantId === null) {
        if (event.amount >= 0) addRestoredToNobody(tallying, event.amount);
        else {
          const lost = -event.amount;
          tallying.damageTakenByNobody += lost;
          tallying.damageDealtByNobody += lost;
          tallying.damageByNeitherEnd += lost;
          addToCut(tallying.damageByNeitherEndByKind, event.source, lost);
        }
      } else {
        const figures = addCombatantFigures(tallying.byCombatantId, event.combatantId);
        const combatantId = event.combatantId;
        if (event.amount >= 0) addHealthRestored(tallying, figures, event, combatantId);
        else addHealthLost(tallying, figures, event, combatantId);
      }
    }
    if (event.kind === BATTLE_EVENT.healingToNamedCombatant) {
      assert(event.amount >= 0, "healing restored is never below nothing");
      if (event.targetId === null) addRestoredToNobody(tallying, event.amount);
      else {
        const figures = addCombatantFigures(tallying.byCombatantId, event.targetId);
        figures.healthRestored += event.amount;
        addHealthRestoredBySource(tallying, event.targetId, event.source, event.amount, null);
        const giverId = lookupGiverId(event.source, event.targetId, null);
        const stated = {
          source: event.source,
          announced: null
        };
        addHealthGiven(tallying, giverId, event.amount, event.targetId, stated);
        assert(Number.isSafeInteger(figures.healthRestored), "a total stays inside what a number holds exactly");
      }
    }
    if (event.kind === BATTLE_EVENT.fightOutcome) {
      const outcomeSoFar = tallying.outcome ?? {
        wonNames: [],
        lostNames: [],
        isDrawn: false,
        isFled: false
      };
      assert(event.combatantNames.every((combatantName) => combatantName.length > 0), "a side named is named in full");
      if (event.result === OUTCOME_RESULT.drawn) {
        tallying.outcome = {
          ...outcomeSoFar,
          isDrawn: true
        };
      } else if (event.result === OUTCOME_RESULT.fled) {
        tallying.outcome = {
          ...outcomeSoFar,
          isFled: true
        };
      } else if (event.result === OUTCOME_RESULT.won) {
        tallying.outcome = {
          ...outcomeSoFar,
          wonNames: [
            ...event.combatantNames
          ]
        };
      } else {
        tallying.outcome = {
          ...outcomeSoFar,
          lostNames: [
            ...event.combatantNames
          ]
        };
      }
    }
    if (event.kind === BATTLE_EVENT.skillUsed) {
      if (event.actorId !== null) {
        assert(event.skillName.length > 0, "an announcement names the skill it announces");
        const skills = addCombatantFigures(tallying.byCombatantId, event.actorId).skills;
        const skillFigures = addSkillFigures(skills, event.skillName);
        skillFigures.uses += 1;
      }
    }
    {
      const openerId = lookupTurnOpener(event, tallying.turnStanding);
      tallying.turnStanding = composeTurnStanding(event, tallying.turnStanding);
      if (openerId !== null) {
        assert(Number.isSafeInteger(openerId), "a turn is charged to an id that was read");
        const figures = addCombatantFigures(tallying.byCombatantId, openerId);
        figures.turnsTaken += 1;
      }
    }
    if (event.kind === BATTLE_EVENT.turnLost) {
      if (event.combatantId !== null) {
        assert(Number.isSafeInteger(event.combatantId), "a turn is lost by an id that was read");
        const figures = addCombatantFigures(tallying.byCombatantId, event.combatantId);
        figures.turnsLost += 1;
      }
    }
  }
  assert(tallying.byCombatantId.size <= COMBATANTS_MAXIMUM, "a fight stays inside its bound");
  assert(tallyUnreadMessages(tallying) <= events.length, "a message is counted unread once");
  return {
    byCombatantId: tallying.byCombatantId,
    totals: tallyTotals(tallying.byCombatantId),
    damageDealtByNobody: tallying.damageDealtByNobody,
    damageTakenByNobody: tallying.damageTakenByNobody,
    healthGivenByNobody: tallying.healthGivenByNobody,
    healthRestoredToNobody: tallying.healthRestoredToNobody,
    damageByNeitherEnd: tallying.damageByNeitherEnd,
    damageByNeitherEndByKind: tallying.damageByNeitherEndByKind,
    unreadMessagesUnknownKey: tallying.unreadMessagesUnknownKey,
    unreadMessagesNoParameter: tallying.unreadMessagesNoParameter,
    unreadMessagesGrammarRefused: tallying.unreadMessagesGrammarRefused,
    sideHealsUnsized: tallying.sideHealsUnsized,
    sideHealsStated: tallying.sideHealsStated,
    outcome: tallying.outcome,
    legendaryBonuses: countLegendaryBonuses(events)
  };
}
function addNamedDamageTaken(target, event, amount) {
  addDamageTakenApplied(target, amount);
  target.damageTakenBlowLargest = calculateBlowLargest(target.damageTakenBlowLargest, amount);
  addToCut(target.damageTakenByKind, event.damage.element, amount);
  if (event.actorId === null) {
    target.damageTakenFromNobody += amount;
    addToCut(target.damageTakenFromNobodyByKind, event.damage.element, amount);
  } else {
    addToCut(target.damageTakenByOpponent, `${event.actorId}`, amount);
    addDamageFiguresToOtherEndCut(target.damageTakenByOpponentAndKind, `${event.actorId}`, [
      event.damage
    ]);
    if (event.announced === null) {
      addToCut(target.damageTakenWithoutSkillByOpponent, `${event.actorId}`, amount);
    }
  }
}
function addHealthRestored(tallying, figures, event, combatantId) {
  figures.healthRestored += event.amount;
  addHealthRestoredBySource(tallying, combatantId, event.source, event.amount, event.announced);
  if (event.announced !== null) {
    addSkillRestored(tallying, event.announced, event.amount, combatantId);
  }
  const giverId = lookupGiverId(event.source, combatantId, event.announced);
  const stated = {
    source: event.source,
    announced: event.announced
  };
  addHealthGiven(tallying, giverId, event.amount, combatantId, stated);
}
function addHealthLost(tallying, figures, event, combatantId) {
  const lost = -event.amount;
  addDamageTakenApplied(figures, lost);
  addToCut(figures.damageTakenByKind, event.source, lost);
  addToCut(figures.damageTakenWithoutSkillByKey, event.source, lost);
  const actorId = lookupWoundActorId(tallying, event);
  if (actorId === null) {
    figures.damageTakenFromNobody += lost;
    addToCut(figures.damageTakenFromNobodyByKind, event.source, lost);
    tallying.damageDealtByNobody += lost;
  } else {
    const woundedId = combatantId;
    assert(lost > 0, "a wound ticking takes health off");
    assert(Number.isSafeInteger(lost), "a figure totalled is a whole number");
    const tickFigures = [
      {
        element: WOUND_TICK_KEY,
        amount: lost
      }
    ];
    const dealer = addCombatantFigures(tallying.byCombatantId, actorId);
    addDamageDealtApplied(dealer, lost);
    addToCut(dealer.damageDealtByKind, WOUND_TICK_KEY, lost);
    addToCut(dealer.damageDealtWithoutSkillByKey, WOUND_TICK_KEY, lost);
    addToCut(addCutForOtherEnd(dealer.damageDealtWithoutSkillByOpponentAndKey, `${woundedId}`), WOUND_TICK_KEY, lost);
    addToCut(dealer.damageDealtByOpponent, `${woundedId}`, lost);
    addDamageFiguresToOtherEndCut(dealer.damageDealtByOpponentAndKind, `${woundedId}`, tickFigures);
    const wounded = addCombatantFigures(tallying.byCombatantId, woundedId);
    addToCut(wounded.damageTakenByOpponent, `${actorId}`, lost);
    addDamageFiguresToOtherEndCut(wounded.damageTakenByOpponentAndKind, `${actorId}`, tickFigures);
  }
  assert(figures.damageTakenApplied >= lost, "a row has taken at least the health this loss took");
}
function addBlowDealt(dealer, event, blow) {
  assert(blow.amount >= blow.applied, "a pool adds to what landed and never takes from it");
  dealer.damageDealtRaw += blow.raw;
  dealer.damageDealtApplied += blow.applied;
  dealer.damageDealtAbsorbed += blow.absorbed;
  dealer.damageDealt += blow.amount;
  dealer.blowsStruck += 1;
  if (event.announced === null) {
    dealer.blowsWithoutSkill += 1;
    if (event.targetId !== null) {
      addToCut(dealer.damageDealtWithoutSkillByOpponent, `${event.targetId}`, blow.amount);
    }
  } else {
    const otherEndKey = getOtherEndKey(event.targetId);
    addSkillDealt(dealer.skills, event.announced, blow.amount, otherEndKey);
    {
      assert(event.announced.skillName.length > 0, "a blow is counted under the announcement named");
      const skillFigures = addSkillFigures(dealer.skills, event.announced.skillName);
      skillFigures.blows += 1;
    }
  }
  addDamageFiguresToCut(dealer.damageDealtByKind, blow.kinds);
  for (const absorbedPart of blow.absorbedParts) {
    addToCut(dealer.damageDealtAbsorbedByDefence, absorbedPart.defence, absorbedPart.amount);
  }
  if (event.targetId !== null) {
    addToCut(dealer.damageDealtByOpponent, `${event.targetId}`, blow.amount);
    addDamageFiguresToOtherEndCut(dealer.damageDealtByOpponentAndKind, `${event.targetId}`, blow.kinds);
  }
  {
    assert(blow.amount >= 0, "a blow lands no less than nothing");
    assert(event.destroyed.length <= MESSAGE_PARTS_MAXIMUM, "and destroys no more than one message is read to state");
    dealer.damageDealtBlowLargest = calculateBlowLargest(dealer.damageDealtBlowLargest, blow.amount);
    if (isBlowCritical(event.procs)) dealer.blowsCritical += 1;
    for (const destroyed of event.destroyed) {
      addToCut(dealer.statisticsDestroyed, destroyed.statistic, destroyed.amount);
    }
  }
}
function addBlowTaken(target, event, blow) {
  assert(blow.amount >= blow.applied, "a pool adds to what landed and never takes from it");
  target.damageTakenRaw += blow.raw;
  target.damageTakenApplied += blow.applied;
  target.damageTaken += blow.amount;
  addDamageFiguresToCut(target.damageTakenByKind, blow.kinds);
  if (event.actorId === null) {
    target.damageTakenFromNobody += blow.amount;
    addDamageFiguresToCut(target.damageTakenFromNobodyByKind, blow.kinds);
  } else {
    addToCut(target.damageTakenByOpponent, `${event.actorId}`, blow.amount);
    addDamageFiguresToOtherEndCut(target.damageTakenByOpponentAndKind, `${event.actorId}`, blow.kinds);
    if (event.announced === null) {
      addToCut(target.damageTakenWithoutSkillByOpponent, `${event.actorId}`, blow.amount);
    }
  }
  {
    assert(blow.amount >= 0, "a blow lands no less than nothing");
    target.damageTakenBlowLargest = calculateBlowLargest(target.damageTakenBlowLargest, blow.amount);
    for (const absorbedPart of blow.absorbedParts) {
      target.damageTakenAbsorbed += absorbedPart.amount;
      addToCut(target.damageTakenAbsorbedByDefence, absorbedPart.defence, absorbedPart.amount);
    }
    for (const preventedPart of blow.preventedParts) {
      target.damagePrevented += preventedPart.amount;
      addToCut(target.damagePreventedByDefence, preventedPart.defence, preventedPart.amount);
    }
  }
  assert(target.damageTaken >= 0, "a total of damage taken never falls below nothing");
}
function lookupAnnouncedWound(event) {
  const actorId = event.actorId;
  const woundedId = event.targetId;
  if (actorId === null) return null;
  if (woundedId === null) return null;
  let announcedWound = null;
  for (const declared of event.declared) {
    if (declared.effect !== WOUND_ANNOUNCEMENT_KEY) continue;
    if (declared.amount === null) continue;
    if (declared.amount <= 0) continue;
    announcedWound = {
      woundedId,
      standing: {
        actorId,
        amount: declared.amount
      }
    };
  }
  return announcedWound;
}
function addCombatantFigures(byCombatantId, combatantId) {
  assert(Number.isSafeInteger(combatantId), "a row belongs to an id that was read");
  const existing = byCombatantId.get(combatantId);
  if (existing !== void 0) return existing;
  assert(byCombatantId.size < COMBATANTS_MAXIMUM, "a fight stays inside its stated bound");
  const figures = createCombatantFigures();
  byCombatantId.set(combatantId, figures);
  return figures;
}
function addUnplacedCast(tallying, casterId) {
  if (casterId === null) return;
  assert(Number.isSafeInteger(casterId), "a cast is charged to somebody the protocol named");
  const figures = addCombatantFigures(tallying.byCombatantId, casterId);
  figures.sideHealsUnsized += 1;
}
function addHealthRestoredBySource(tallying, healedId, source, amount, announced) {
  assert(amount >= 0, "restored health is never below nothing");
  assert(source.length > 0, "and comes under a key the protocol named");
  const healed = addCombatantFigures(tallying.byCombatantId, healedId);
  addToCut(healed.healthRestoredByKey, source, amount);
  if (getSkillOwnerId(announced) !== null) return;
  addToCut(healed.healthRestoredWithoutSkillByKey, source, amount);
}
function addToCut(cut, key, amount) {
  assert(key.length > 0, "a cut is kept under a name");
  cut.set(key, (cut.get(key) ?? 0) + amount);
  assert(cut.size <= CUT_MAXIMUM, "a cut stays inside its stated bound");
}
function getSkillOwnerId(announced) {
  if (announced === null) return null;
  assert(announced.skillName.length > 0, "an announcement that was made is named");
  return announced.actorId;
}
function addHealthGiven(tallying, giverId, amount, healedId, stated) {
  assert(amount >= 0, "restored health is never below nothing");
  assert(stated.source.length > 0, "and comes under a key the protocol named");
  const healed = addCombatantFigures(tallying.byCombatantId, healedId);
  if (giverId === null) {
    tallying.healthGivenByNobody += amount;
    healed.healthRestoredByNobody += amount;
    addToCut(healed.healthRestoredByNobodyByKey, stated.source, amount);
    return;
  }
  addToCut(healed.healthRestoredByGiver, `${giverId}`, amount);
  const giver = addCombatantFigures(tallying.byCombatantId, giverId);
  giver.healthGiven += amount;
  addToCut(giver.healthGivenByReceiver, `${healedId}`, amount);
  if (getSkillOwnerId(stated.announced) !== null) return;
  const cut = addCutForOtherEnd(giver.healthGivenWithoutSkillByReceiverAndKey, `${healedId}`);
  addToCut(cut, stated.source, amount);
}
function addCutForOtherEnd(cut, otherEndKey) {
  assert(otherEndKey.length > 0, "the other end of a movement is named before it is cut by");
  const cutForOtherEnd = cut.get(otherEndKey) ?? /* @__PURE__ */ new Map();
  cut.set(otherEndKey, cutForOtherEnd);
  assert(cut.size <= COMBATANTS_MAXIMUM, "a fight cuts by the people who are in it");
  return cutForOtherEnd;
}
function addSkillRestored(tallying, announced, amount, healedId) {
  assert(amount >= 0, "restored health is never below nothing");
  assert(announced.skillName.length > 0, "and the announcement behind it is named");
  const ownerId = getSkillOwnerId(announced);
  if (ownerId === null) return;
  const skills = addCombatantFigures(tallying.byCombatantId, ownerId).skills;
  const skillFigures = addSkillFigures(skills, announced.skillName);
  skillFigures.healthGiven += amount;
  addToCut(skillFigures.healthGivenByReceiver, `${healedId}`, amount);
}
function addSkillFigures(skills, name) {
  assert(name.length > 0, "a skill is kept under the name it was announced by");
  const skillFigures = skills.get(name) ?? {
    name,
    uses: 0,
    damageDealt: 0,
    blows: 0,
    damageDealtByOpponent: /* @__PURE__ */ new Map(),
    healthGiven: 0,
    healthGivenByReceiver: /* @__PURE__ */ new Map()
  };
  skills.set(name, skillFigures);
  assert(skills.size <= SKILLS_MAXIMUM, "a fight states no more skills than it is bounded to");
  return skillFigures;
}
function tallyBlowFigures(event) {
  const raw = tallyDamageAmounts(event.raw);
  const applied = tallyDamageAmounts(event.applied);
  assert(raw >= 0, "a blow puts out no less than nothing");
  assert(applied >= 0, "and lands no less than nothing");
  assert(event.prevented.length <= MESSAGE_PARTS_MAXIMUM, "and is stopped as far as it is read");
  const kinds = [
    ...event.applied
  ];
  const absorbedParts = [];
  const preventedParts = [];
  let absorbed = 0;
  for (const stopped of event.prevented) {
    if (getDefenceMechanism(stopped.defence) === DEFENCE_MECHANISM.pool) {
      absorbedParts.push(stopped);
      const element = composeKindAbsorbed(event.raw, stopped.defence);
      kinds.push({
        element,
        amount: stopped.amount
      });
      absorbed += stopped.amount;
    } else preventedParts.push(stopped);
  }
  assert(Number.isSafeInteger(absorbed), "a total stays inside what a number holds exactly");
  assert(absorbedParts.length + preventedParts.length === event.prevented.length, "every defence either drained a pool or drained nothing");
  const amount = applied + absorbed;
  return {
    raw,
    applied,
    absorbed,
    amount,
    kinds,
    absorbedParts,
    preventedParts
  };
}
function tallyDamageAmounts(figures) {
  let total = 0;
  for (const figure of figures) {
    assert(Number.isSafeInteger(figure.amount), "a figure totalled is a whole number");
    total += figure.amount;
  }
  assert(Number.isSafeInteger(total), "a total stays inside what a number holds exactly");
  return total;
}
function composeKindAbsorbed(raw, defence) {
  assert(raw.length <= MESSAGE_PARTS_MAXIMUM, "a blow puts out as far as it is read");
  const elementsAbsorbed = getElementsAbsorbed(defence);
  assert(elementsAbsorbed.length > 0, "a pool takes from some element");
  const candidates = [];
  for (const element of elementsAbsorbed) {
    for (const figure of raw) {
      if (figure.element !== element) continue;
      if (figure.amount <= 0) continue;
      candidates.push(element);
      break;
    }
  }
  assert(candidates.length <= elementsAbsorbed.length, "each element is a candidate once");
  const elements = candidates.length === 0 ? elementsAbsorbed : candidates;
  assert(elements.length > 0, "a pool's part stands under some element");
  return elements.join(KIND_ELEMENTS_SEPARATOR);
}
function addSkillDealt(skills, announced, amount, otherEndKey) {
  assert(amount >= 0, "what a blow lands is never below nothing");
  assert(announced.skillName.length > 0, "and the announcement in front of it is named");
  const skillFigures = addSkillFigures(skills, announced.skillName);
  skillFigures.damageDealt += amount;
  if (otherEndKey !== null) addToCut(skillFigures.damageDealtByOpponent, otherEndKey, amount);
}
function getOtherEndKey(targetId) {
  if (targetId === null) return null;
  assert(Number.isSafeInteger(targetId), "an end the protocol named is named by a number");
  return `${targetId}`;
}
function addDamageFiguresToOtherEndCut(cut, otherEndKey, figures) {
  const cutForOtherEnd = addCutForOtherEnd(cut, otherEndKey);
  for (const figure of figures) addToCut(cutForOtherEnd, figure.element, figure.amount);
}
function calculateBlowLargest(largestSoFar, amount) {
  assert(largestSoFar >= 0, "the hardest blow so far landed no less than nothing");
  assert(amount >= 0, "and neither did the one being weighed against it");
  return Math.max(largestSoFar, amount);
}
function isBlowCritical(procs) {
  assert(procs.length <= MESSAGE_PARTS_MAXIMUM, "a blow fires no more procs than it is read to");
  return procs.some((key) => CRITICAL_PROC_KEYS.includes(key));
}
function addBlowProcs(dealer, target, procs) {
  assert(procs.length <= MESSAGE_PARTS_MAXIMUM, "a blow fires no more procs than it is read to");
  for (const key of procs) {
    const keyMeaning = lookupKeyMeaning(key);
    assert(keyMeaning !== null, "a proc the decoder stated is a key the table reads");
    assert(keyMeaning.kind === KEY_FAMILY.proc, "and one it places as a proc");
    if (keyMeaning.end === PROC_END.actor) {
      if (dealer !== null) addToCut(dealer.procsWhenStriking, key, 1);
    }
    if (keyMeaning.end === PROC_END.target) {
      if (target !== null) addToCut(target.procsWhenStruck, key, 1);
    }
  }
}
function addBlowWithNoTarget(tallying, actorId, amount, kinds) {
  assert(amount >= 0, "a blow lands no less than nothing");
  tallying.damageTakenByNobody += amount;
  if (actorId === null) {
    tallying.damageByNeitherEnd += amount;
    addDamageFiguresToCut(tallying.damageByNeitherEndByKind, kinds);
    return;
  }
  const dealer = addCombatantFigures(tallying.byCombatantId, actorId);
  dealer.damageDealtToNobody += amount;
  addDamageFiguresToCut(dealer.damageDealtToNobodyByKind, kinds);
}
function addDamageFiguresToCut(cut, kinds) {
  assert(kinds.length <= MESSAGE_PARTS_MAXIMUM * 2, "a blow carries its kinds inside the bound");
  for (const kind of kinds) {
    assert(kind.amount >= 0, "a kind of a blow lands no less than nothing");
    addToCut(cut, kind.element, kind.amount);
  }
}
function addDamageDealtApplied(dealer, amount) {
  assert(amount >= 0, "health taken off is never below nothing");
  dealer.damageDealtApplied += amount;
  dealer.damageDealt += amount;
  assert(dealer.damageDealt >= dealer.damageDealtApplied, "health is a part of what was dealt");
}
function addDamageTakenApplied(target, amount) {
  assert(amount >= 0, "health taken off is never below nothing");
  target.damageTakenApplied += amount;
  target.damageTaken += amount;
  assert(target.damageTaken >= target.damageTakenApplied, "health is a part of what was taken");
}
function addRestoredToNobody(tallying, amount) {
  assert(amount >= 0, "health that came back never came back below nothing");
  tallying.healthRestoredToNobody += amount;
  assert(Number.isSafeInteger(tallying.healthRestoredToNobody), "a total stays inside what a number holds exactly");
}
function lookupGiverId(source, healedId, announced) {
  assert(source.length > 0, "restored health names the key it was stated on");
  if (announced !== null) {
    if (announced.actorId !== null) return announced.actorId;
  }
  if (!SELF_SOURCED_HEALING_KEYS.includes(source)) return null;
  return healedId;
}
function lookupWoundActorId(tallying, event) {
  if (event.source !== WOUND_TICK_KEY) return null;
  if (event.combatantId === null) return null;
  const wound = tallying.woundByWoundedId.get(event.combatantId);
  if (wound === void 0) return null;
  assert(wound.amount > 0, "a wound kept announced a figure");
  let woundTicking;
  if (event.declared.length > 0) {
    if (event.declared.length > 1) return null;
    const weakeningPercent = event.declared[0]?.amount ?? null;
    if (weakeningPercent === null) return null;
    if (weakeningPercent < 0) return null;
    if (weakeningPercent >= PERCENT_WHOLE) return null;
    woundTicking = Math.ceil(wound.amount * (PERCENT_WHOLE - weakeningPercent) / PERCENT_WHOLE);
  } else {
    woundTicking = wound.amount;
  }
  assert(woundTicking > 0, "a wound ticks for something, weakened or whole");
  if (woundTicking !== -event.amount) return null;
  assert(Number.isSafeInteger(wound.actorId), "a wound was left by somebody named");
  return wound.actorId;
}
function tallyTotals(byCombatantId) {
  const totals = {
    damageDealt: 0,
    damageTaken: 0,
    damageDealtRaw: 0,
    damageDealtApplied: 0,
    damageTakenRaw: 0,
    damageTakenApplied: 0,
    damageDealtAbsorbed: 0,
    damageTakenAbsorbed: 0,
    damagePrevented: 0,
    healthRestored: 0,
    healthGiven: 0
  };
  for (const figures of byCombatantId.values()) {
    for (const field of TOTALLED_FIELDS) totals[field] += figures[field];
  }
  assert(totals.damageDealt >= totals.damageDealtApplied, "health is a part of what was dealt");
  assert(totals.healthRestored >= 0, "a total of health restored never runs below nought");
  return totals;
}
function composeKindsAbsorbed(event) {
  assert(event.prevented.length <= MESSAGE_PARTS_MAXIMUM, "a blow is stopped as far as it is read");
  const kinds = [];
  for (const stopped of event.prevented) {
    if (getDefenceMechanism(stopped.defence) === DEFENCE_MECHANISM.chance) continue;
    kinds.push(composeKindAbsorbed(event.raw, stopped.defence));
  }
  assert(kinds.length <= event.prevented.length, "and no pool stands under two kinds");
  return kinds;
}
function tallyUnreadMessages(counted) {
  const unread = counted.unreadMessagesUnknownKey + counted.unreadMessagesNoParameter + counted.unreadMessagesGrammarRefused;
  assert(Number.isSafeInteger(unread), "a count of messages stays inside what a number holds");
  assert(unread >= 0, "and never falls below none");
  return unread;
}
function createCombatantFigures() {
  return {
    damageDealt: 0,
    damageTaken: 0,
    damageDealtRaw: 0,
    damageDealtApplied: 0,
    damageTakenRaw: 0,
    damageTakenApplied: 0,
    damageDealtAbsorbed: 0,
    damageTakenAbsorbed: 0,
    damagePrevented: 0,
    healthRestored: 0,
    healthGiven: 0,
    damageTakenFromNobody: 0,
    damageDealtToNobody: 0,
    healthRestoredByNobody: 0,
    damageTakenFromNobodyByKind: /* @__PURE__ */ new Map(),
    damageDealtToNobodyByKind: /* @__PURE__ */ new Map(),
    healthRestoredByNobodyByKey: /* @__PURE__ */ new Map(),
    healthRestoredByGiver: /* @__PURE__ */ new Map(),
    healthGivenByReceiver: /* @__PURE__ */ new Map(),
    healthRestoredByKey: /* @__PURE__ */ new Map(),
    healthRestoredWithoutSkillByKey: /* @__PURE__ */ new Map(),
    damageTakenWithoutSkillByKey: /* @__PURE__ */ new Map(),
    damageDealtWithoutSkillByKey: /* @__PURE__ */ new Map(),
    damageDealtWithoutSkillByOpponentAndKey: /* @__PURE__ */ new Map(),
    damageDealtWithoutSkillByOpponent: /* @__PURE__ */ new Map(),
    damageTakenWithoutSkillByOpponent: /* @__PURE__ */ new Map(),
    healthGivenWithoutSkillByReceiverAndKey: /* @__PURE__ */ new Map(),
    damageDealtByKind: /* @__PURE__ */ new Map(),
    damageTakenByKind: /* @__PURE__ */ new Map(),
    damageDealtByOpponent: /* @__PURE__ */ new Map(),
    damageTakenByOpponent: /* @__PURE__ */ new Map(),
    damageDealtByOpponentAndKind: /* @__PURE__ */ new Map(),
    damageTakenByOpponentAndKind: /* @__PURE__ */ new Map(),
    skills: /* @__PURE__ */ new Map(),
    blowsStruck: 0,
    blowsWithoutSkill: 0,
    turnsTaken: 0,
    turnsLost: 0,
    blowsCritical: 0,
    damageDealtBlowLargest: 0,
    damageTakenBlowLargest: 0,
    procsWhenStriking: /* @__PURE__ */ new Map(),
    procsWhenStruck: /* @__PURE__ */ new Map(),
    damagePreventedByDefence: /* @__PURE__ */ new Map(),
    damageDealtAbsorbedByDefence: /* @__PURE__ */ new Map(),
    damageTakenAbsorbedByDefence: /* @__PURE__ */ new Map(),
    statisticsDestroyed: /* @__PURE__ */ new Map(),
    unreadMessagesUnknownKey: 0,
    unreadMessagesNoParameter: 0,
    sideHealsUnsized: 0
  };
}
function verifyFightStatistics(statistics) {
  assert(tallyDealtTakenImbalance(statistics) === 0, "every point dealt is counted once at each end");
  assert(tallyDamagePartsImbalance(statistics) === 0, "and every point dealt or taken reached health or drained a pool");
  assert(tallyRestoredGivenImbalance(statistics) === 0, "and every point restored once at each of its own");
  assert(tallyHalfNamedRowsImbalance(statistics) === 0, "and every half-named point is on the row it named");
  assert(tallyHalfNamedCutsImbalance(statistics) === 0, "and under the key it was stated with");
  assert(tallyDefenceCutsImbalance(statistics) === 0, "and what the defences stopped is stopped by one of them");
  for (const figures of statistics.byCombatantId.values()) verifyDefenceMechanisms(figures);
}
function verifyDefenceMechanisms(figures) {
  for (const defence of figures.damagePreventedByDefence.keys()) {
    const mechanism = getDefenceMechanism(defence);
    assert(mechanism === DEFENCE_MECHANISM.chance, "what was prevented drained no pool");
  }
  for (const defence of figures.damageDealtAbsorbedByDefence.keys()) {
    const mechanism = getDefenceMechanism(defence);
    assert(mechanism === DEFENCE_MECHANISM.pool, "what was absorbed drained a pool");
  }
  for (const defence of figures.damageTakenAbsorbedByDefence.keys()) {
    const mechanism = getDefenceMechanism(defence);
    assert(mechanism === DEFENCE_MECHANISM.pool, "what was absorbed drained a pool");
  }
  for (const kind of figures.damageDealtByKind.keys()) {
    assert(!isDefence(kind), "a defence is no kind of damage");
  }
  for (const kind of figures.damageTakenByKind.keys()) {
    assert(!isDefence(kind), "a defence is no kind of damage");
  }
}
function tallyDealtTakenImbalance(statistics) {
  let dealt = statistics.damageDealtByNobody;
  let taken = statistics.damageTakenByNobody;
  for (const figures of statistics.byCombatantId.values()) {
    dealt += figures.damageDealt;
    taken += figures.damageTaken;
  }
  assert(Number.isSafeInteger(dealt), "a total stays inside what a number holds exactly");
  assert(Number.isSafeInteger(taken), "a total stays inside what a number holds exactly");
  return dealt - taken;
}
function tallyDamagePartsImbalance(statistics) {
  let imbalance = 0;
  for (const figures of statistics.byCombatantId.values()) {
    const dealt = figures.damageDealtApplied + figures.damageDealtAbsorbed;
    const taken = figures.damageTakenApplied + figures.damageTakenAbsorbed;
    imbalance += Math.abs(figures.damageDealt - dealt) + Math.abs(figures.damageTaken - taken);
  }
  assert(Number.isSafeInteger(imbalance), "a total stays inside what a number holds exactly");
  return imbalance;
}
function tallyRestoredGivenImbalance(statistics) {
  let restored = 0;
  let given = statistics.healthGivenByNobody;
  for (const figures of statistics.byCombatantId.values()) {
    restored += figures.healthRestored;
    given += figures.healthGiven;
  }
  assert(Number.isSafeInteger(restored), "a total stays inside what a number holds exactly");
  assert(Number.isSafeInteger(given), "a total stays inside what a number holds exactly");
  return restored - given;
}
function tallyHalfNamedRowsImbalance(statistics) {
  let takenFromNobody = 0;
  let dealtToNobody = 0;
  let restoredByNobody = 0;
  for (const figures of statistics.byCombatantId.values()) {
    takenFromNobody += figures.damageTakenFromNobody;
    dealtToNobody += figures.damageDealtToNobody;
    restoredByNobody += figures.healthRestoredByNobody;
  }
  assert(statistics.damageByNeitherEnd >= 0, "what names neither end is never below nothing");
  const dealt = statistics.damageDealtByNobody - takenFromNobody - statistics.damageByNeitherEnd;
  const taken = statistics.damageTakenByNobody - dealtToNobody - statistics.damageByNeitherEnd;
  const given = statistics.healthGivenByNobody - restoredByNobody;
  return Math.abs(dealt) + Math.abs(taken) + Math.abs(given);
}
function tallyHalfNamedCutsImbalance(statistics) {
  let imbalance = tallyCutImbalance(statistics.damageByNeitherEnd, statistics.damageByNeitherEndByKind);
  for (const figures of statistics.byCombatantId.values()) {
    const takenCut = figures.damageTakenFromNobodyByKind;
    const dealtCut = figures.damageDealtToNobodyByKind;
    const restoredCut = figures.healthRestoredByNobodyByKey;
    imbalance += tallyCutImbalance(figures.damageTakenFromNobody, takenCut);
    imbalance += tallyCutImbalance(figures.damageDealtToNobody, dealtCut);
    imbalance += tallyCutImbalance(figures.healthRestoredByNobody, restoredCut);
  }
  assert(imbalance >= 0, "a difference counted as a distance is never below nothing");
  return imbalance;
}
function tallyCutImbalance(figure, cut) {
  assert(figure >= 0, "a figure being cut is never below nothing");
  assert(cut.size <= CUT_MAXIMUM, "and is cut inside the stated bound");
  let cutTotal = 0;
  for (const amount of cut.values()) cutTotal += amount;
  assert(Number.isSafeInteger(cutTotal), "a total stays inside what a number holds exactly");
  return Math.abs(figure - cutTotal);
}
function tallyDefenceCutsImbalance(statistics) {
  let imbalance = 0;
  for (const figures of statistics.byCombatantId.values()) {
    imbalance += tallyCutImbalance(figures.damagePrevented, figures.damagePreventedByDefence);
    imbalance += tallyCutImbalance(figures.damageDealtAbsorbed, figures.damageDealtAbsorbedByDefence);
    imbalance += tallyCutImbalance(figures.damageTakenAbsorbed, figures.damageTakenAbsorbedByDefence);
  }
  assert(imbalance >= 0, "a difference counted as a distance is never below nothing");
  return imbalance;
}

// src/core/charged-skill.ts
var CHARGED_SKILL_STATE = {
  charging: "charging",
  struck: "struck",
  broken: "broken"
};
var CHARGED_SKILLS_MAXIMUM = COMBATANTS_MAXIMUM;
function prepareChargedSkills(chargedSkillStandings, statements, events, ordinal) {
  assert(chargedSkillStandings.length <= CHARGED_SKILLS_MAXIMUM, "what stood stays inside the bound");
  const skillNamesByActorId = indexAnnouncedNamesByActor(events);
  const chargeBrokenIds = indexChargeBrokenIds(events);
  const statementByCombatantId = new Map(statements.map((statement) => [
    statement.combatantId,
    statement
  ]));
  const standingsNow = [];
  for (const standingBefore of chargedSkillStandings) {
    const statement = statementByCombatantId.get(standingBefore.combatantId);
    if (statement !== void 0) {
      if (statement.charge !== null) continue;
    }
    if (standingBefore.state !== CHARGED_SKILL_STATE.charging) {
      if (!isPastItsTurn(standingBefore, ordinal)) standingsNow.push(standingBefore);
      continue;
    }
    if (statement === void 0) {
      standingsNow.push(standingBefore);
      continue;
    }
    const state = lookupEndedState(standingBefore, skillNamesByActorId, chargeBrokenIds);
    if (state !== null) {
      standingsNow.push({
        ...standingBefore,
        state,
        endedAtOrdinal: ordinal
      });
    }
  }
  for (const statement of statements) {
    const charging = composeChargingStanding(statement);
    if (charging === null) continue;
    standingsNow.push(charging);
  }
  assert(standingsNow.length <= CHARGED_SKILLS_MAXIMUM, "and what stands now stays inside it too");
  return standingsNow;
}
function indexAnnouncedNamesByActor(events) {
  const skillNamesByActorId = /* @__PURE__ */ new Map();
  const addAnnouncedName = (actorId, skillName) => {
    assert(skillName.length > 0, "an announcement that was made is named");
    if (actorId === null) return;
    const skillNames = skillNamesByActorId.get(actorId) ?? /* @__PURE__ */ new Set();
    skillNames.add(skillName);
    skillNamesByActorId.set(actorId, skillNames);
  };
  for (const event of events) {
    if (event.kind === BATTLE_EVENT.skillUsed) addAnnouncedName(event.actorId, event.skillName);
    if (event.kind === BATTLE_EVENT.attack) {
      if (event.announced !== null) {
        addAnnouncedName(event.announced.actorId, event.announced.skillName);
      }
    }
  }
  assert(skillNamesByActorId.size <= events.length, "no more announcers than events announcing");
  return skillNamesByActorId;
}
function indexChargeBrokenIds(events) {
  const chargeBrokenIds = /* @__PURE__ */ new Set();
  for (const event of events) {
    if (event.kind !== BATTLE_EVENT.attack) continue;
    if (event.targetId === null) continue;
    if (event.procs.includes(CHARGE_BROKEN_KEY)) chargeBrokenIds.add(event.targetId);
  }
  assert(chargeBrokenIds.size <= events.length, "no more broken than blows");
  return chargeBrokenIds;
}
function isPastItsTurn(chargedSkillStanding, ordinal) {
  if (chargedSkillStanding.endedAtOrdinal === null) return true;
  if (ordinal === null) return true;
  return ordinal > chargedSkillStanding.endedAtOrdinal;
}
function lookupEndedState(chargedSkillStanding, skillNamesByActorId, chargeBrokenIds) {
  assert(chargedSkillStanding.skillName.length > 0, "a charge that stood names the blow being made ready");
  const skillNames = skillNamesByActorId.get(chargedSkillStanding.combatantId);
  if (skillNames?.has(chargedSkillStanding.skillName) === true) {
    return CHARGED_SKILL_STATE.struck;
  }
  if (chargeBrokenIds.has(chargedSkillStanding.combatantId)) return CHARGED_SKILL_STATE.broken;
  return null;
}
function composeChargingStanding(statement) {
  const charge = statement.charge;
  if (charge === null) return null;
  assert(charge.skillName.length > 0, "a charge that was read names the blow being made ready");
  assert(charge.turnsElapsed >= 0, "and states a count of turns that have passed");
  assert(charge.turnsStated >= charge.turnsElapsed, "no more of them than the whole charge runs");
  return {
    combatantId: statement.combatantId,
    skillName: charge.skillName,
    turnsElapsed: charge.turnsElapsed,
    turnsStated: charge.turnsStated,
    state: CHARGED_SKILL_STATE.charging,
    endedAtOrdinal: null
  };
}

// src/core/fight-session.ts
var CombatantsExceeded = class extends Error {
  name = "CombatantsExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var CutKeysExceeded = class extends Error {
  name = "CutKeysExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var EventsExceeded = class extends Error {
  name = "EventsExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var PayloadsExceeded = class extends Error {
  name = "PayloadsExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var SkillsExceeded = class extends Error {
  name = "SkillsExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var PAYLOADS_MAXIMUM = 65536;
var SESSION_OPTIONS = {
  eventsMaximum: MESSAGES_MAXIMUM * 2,
  payloadsMaximum: PAYLOADS_MAXIMUM,
  combatantsMaximum: COMBATANTS_MAXIMUM
};
var NO_UNREAD = {
  [UNREAD_CAUSE.unknownKey]: 0,
  [UNREAD_CAUSE.noParameter]: 0,
  [UNREAD_CAUSE.grammarRefused]: 0
};
function createFightSession(options) {
  assert(options.combatantsMaximum <= COMBATANTS_MAXIMUM, "a cast is bounded by the roster");
  assert(options.eventsMaximum > MESSAGES_MAXIMUM, "a fight holds more than one full payload");
  assert(options.payloadsMaximum > 0, "a fight holds a payload");
  return {
    options,
    state: null,
    events: []
  };
}
function preparePayload(session, record, tables) {
  const stateBefore = record.isInit ? null : session.state;
  const eventsBefore = stateBefore === null ? 0 : session.events.length;
  const payloadsApplied = (stateBefore?.payloadsApplied ?? 0) + 1;
  const options = session.options;
  if (payloadsApplied > options.payloadsMaximum) {
    return new PayloadsExceeded(payloadsApplied, options.payloadsMaximum);
  }
  const combatants = preparePayloadCombatants(stateBefore?.combatants ?? [], record.combatants);
  if (combatants.length > options.combatantsMaximum) {
    return new CombatantsExceeded(combatants.length, options.combatantsMaximum);
  }
  const roster = indexCombatantRoster(combatants);
  const decoded = decodePayloadMessages(record.messages, {
    roster,
    announcementStanding: null,
    tables
  });
  const eventsAfter = eventsBefore + decoded.events.length;
  if (eventsAfter > options.eventsMaximum) {
    return new EventsExceeded(eventsAfter, options.eventsMaximum);
  }
  const namedCombatantIds = prepareNamedCombatantIds(stateBefore?.namedCombatantIds ?? /* @__PURE__ */ new Set(), combatants, record, decoded.events);
  if (namedCombatantIds.size > options.combatantsMaximum) {
    return new CombatantsExceeded(namedCombatantIds.size, options.combatantsMaximum);
  }
  const cutKeys = prepareCutKeys(stateBefore?.cutKeys ?? /* @__PURE__ */ new Set(), decoded.events);
  if (cutKeys.size > CUT_MAXIMUM) return new CutKeysExceeded(cutKeys.size, CUT_MAXIMUM);
  const skillNames = prepareSkillNames(stateBefore?.skillNames ?? /* @__PURE__ */ new Set(), decoded.events);
  if (skillNames.size > SKILLS_MAXIMUM) {
    return new SkillsExceeded(skillNames.size, SKILLS_MAXIMUM);
  }
  const eventsAtSeatingByCombatantId = prepareEventsAtSeating(stateBefore?.eventsAtSeatingByCombatantId ?? /* @__PURE__ */ new Map(), combatants, eventsBefore);
  const stateAfter = preparePayloadStanding(stateBefore, record, decoded, {
    combatants,
    namedCombatantIds,
    cutKeys,
    skillNames,
    eventsAtSeatingByCombatantId
  });
  assert(stateAfter.payloadsApplied === payloadsApplied, "a payload prepared is counted once");
  const payloadIndex = stateBefore?.payloadsApplied ?? 0;
  return {
    payloadIndex,
    isOpening: stateBefore === null,
    decoded,
    stateAfter
  };
}
function prepareEventsAtSeating(eventsAtSeatingBefore, combatants, eventsBefore) {
  assert(eventsBefore >= 0, "a moment is a count of events");
  const eventsAtSeatingByCombatantId = /* @__PURE__ */ new Map();
  for (const combatant of combatants) {
    const eventsAtSeating = eventsAtSeatingBefore.get(combatant.id) ?? eventsBefore;
    assert(eventsAtSeating <= eventsBefore, "nobody was seated after the payload seating them");
    eventsAtSeatingByCombatantId.set(combatant.id, eventsAtSeating);
  }
  assert(eventsAtSeatingByCombatantId.size === combatants.length, "a moment for everybody seated, and nobody else");
  return eventsAtSeatingByCombatantId;
}
function preparePayloadCombatants(combatantsBefore, combatantsArriving) {
  const combatants = [
    ...combatantsBefore
  ];
  for (const combatant of combatantsArriving) {
    const seenIndex = combatants.findIndex((seenCombatant) => seenCombatant.id === combatant.id);
    if (seenIndex === -1) combatants.push(combatant);
    else combatants[seenIndex] = combatant;
  }
  assert(combatants.length >= combatantsBefore.length, "a cast only grows or is restated");
  assert(combatants.length <= combatantsBefore.length + combatantsArriving.length, "by no more than arrived");
  return combatants;
}
function prepareNamedCombatantIds(namedBefore, combatants, record, events) {
  const namedCombatantIds = new Set(namedBefore);
  for (const combatant of combatants) namedCombatantIds.add(combatant.id);
  for (const combatantId of record.statusMasksByCombatantId.keys()) {
    namedCombatantIds.add(combatantId);
  }
  for (const statement of record.chargeStatements) namedCombatantIds.add(statement.combatantId);
  for (const event of events) {
    let eventCombatantIds;
    switch (event.kind) {
      case BATTLE_EVENT.attack:
      case BATTLE_EVENT.damageToNamedCombatant:
        eventCombatantIds = [
          event.actorId,
          event.targetId,
          event.announced?.actorId ?? null
        ];
        break;
      case BATTLE_EVENT.skillUsed:
        eventCombatantIds = [
          event.actorId,
          event.targetId
        ];
        break;
      case BATTLE_EVENT.healthChange:
      case BATTLE_EVENT.unaccountedHealth:
        eventCombatantIds = [
          event.combatantId,
          event.announced?.actorId ?? null
        ];
        break;
      case BATTLE_EVENT.healingToNamedCombatant:
        eventCombatantIds = [
          event.targetId
        ];
        break;
      case BATTLE_EVENT.declaration:
      case BATTLE_EVENT.turnLost:
        eventCombatantIds = [
          event.combatantId
        ];
        break;
      case BATTLE_EVENT.unknownMessage:
        eventCombatantIds = event.combatantIds;
        break;
      case BATTLE_EVENT.fightOutcome:
        eventCombatantIds = [];
        break;
    }
    for (const combatantId of eventCombatantIds) {
      if (combatantId !== null) namedCombatantIds.add(combatantId);
    }
  }
  assert(namedCombatantIds.size >= namedBefore.size, "nobody named before is forgotten");
  assert(namedCombatantIds.size >= combatants.length, "and everybody seated is named");
  return namedCombatantIds;
}
function prepareCutKeys(cutKeysBefore, events) {
  const cutKeys = new Set(cutKeysBefore);
  for (const event of events) {
    let eventCutKeys;
    switch (event.kind) {
      case BATTLE_EVENT.attack:
        eventCutKeys = [
          ...event.raw.map((figure) => figure.element),
          ...event.applied.map((figure) => figure.element),
          ...composeKindsAbsorbed(event)
        ];
        break;
      case BATTLE_EVENT.damageToNamedCombatant:
        eventCutKeys = [
          event.damage.element
        ];
        break;
      case BATTLE_EVENT.healthChange:
      case BATTLE_EVENT.healingToNamedCombatant:
      case BATTLE_EVENT.unaccountedHealth:
        eventCutKeys = [
          event.source
        ];
        break;
      case BATTLE_EVENT.skillUsed:
      case BATTLE_EVENT.declaration:
      case BATTLE_EVENT.turnLost:
      case BATTLE_EVENT.unknownMessage:
      case BATTLE_EVENT.fightOutcome:
        eventCutKeys = [];
        break;
    }
    for (const cutKey of eventCutKeys) cutKeys.add(cutKey);
  }
  assert(cutKeys.size >= cutKeysBefore.size, "no name cut by before is forgotten");
  return cutKeys;
}
function prepareSkillNames(skillNamesBefore, events) {
  const skillNames = new Set(skillNamesBefore);
  for (const event of events) {
    if (event.kind === BATTLE_EVENT.skillUsed) skillNames.add(event.skillName);
  }
  for (const event of events) {
    if (!("announced" in event)) continue;
    if (event.announced === null) continue;
    assert(skillNames.has(event.announced.skillName), "what a blow rides was announced");
  }
  assert(skillNames.size >= skillNamesBefore.size, "no skill announced before is forgotten");
  return skillNames;
}
function preparePayloadStanding(stateBefore, record, decoded, prepared) {
  const { combatants, namedCombatantIds, eventsAtSeatingByCombatantId } = prepared;
  const isOnAuto = record.isOnAuto ?? stateBefore?.isOnAuto ?? false;
  const turnStatement = isOnAuto ? null : record.turnStatement ?? stateBefore?.turnStatement ?? null;
  const chargeStatementByCombatantId = new Map(record.chargeStatements.map((statement) => [
    statement.combatantId,
    statement
  ]));
  assert(chargeStatementByCombatantId.size <= namedCombatantIds.size, "a charge is held by somebody the fight named");
  const chargedSkills = prepareChargedSkills(stateBefore?.chargedSkills ?? [], [
    ...chargeStatementByCombatantId.values()
  ], decoded.events, turnStatement?.ordinal ?? null);
  const events = decoded.events;
  const statusMasksByCombatantId = record.statusMasksByCombatantId;
  return {
    combatants,
    unread: preparePayloadUnread(stateBefore?.unread ?? NO_UNREAD, decoded),
    messagesLost: (stateBefore?.messagesLost ?? 0) + calculateMessagesLost(record),
    messagesRead: (stateBefore?.messagesRead ?? 0) + record.messages.length,
    // `init` arrives once, so only the first payload of a fight can answer this.
    hasJoinedInProgress: stateBefore === null ? !record.isInit : stateBefore.hasJoinedInProgress,
    isOver: record.isEnd || (stateBefore?.isOver ?? false),
    payloadsApplied: (stateBefore?.payloadsApplied ?? 0) + 1,
    // Kept once seen, because only the opening payload carries it.
    readerSide: record.readerSide ?? stateBefore?.readerSide ?? null,
    turnStatement,
    isOnAuto,
    chargedSkills,
    carriedStatusWalk: prepareCarriedStatusWalk(stateBefore?.carriedStatusWalk ?? NO_CARRIED_STATUS_WALK, events, statusMasksByCombatantId),
    legendaryWalk: prepareLegendaryWalk(stateBefore?.legendaryWalk ?? NO_LEGENDARY_WALK, events),
    namedCombatantIds,
    cutKeys: prepared.cutKeys,
    skillNames: prepared.skillNames,
    eventsAtSeatingByCombatantId
  };
}
function preparePayloadUnread(unreadBefore, decoded) {
  const counts = {
    ...unreadBefore
  };
  for (const unread of decoded.unread) counts[unread.unreadCause] += 1;
  assert(decoded.unread.length <= decoded.events.length, "an unread message is an event too");
  return counts;
}
function calculateMessagesLost(record) {
  if (record.messagesStated === null) return 0;
  const messagesLost = record.messagesStated - record.messages.length;
  assert(record.messagesStated <= MESSAGES_MAXIMUM, "the envelope bounded what it stated");
  if (messagesLost <= 0) return 0;
  return messagesLost;
}
function commitPayload(session, prepared) {
  const wasOver = session.state?.isOver ?? false;
  if (prepared.isOpening) {
    session.events = [];
  } else {
    assert(session.state !== null, "a payload read against a fight lands on that fight");
    const payloadsApplied = session.state.payloadsApplied;
    assert(payloadsApplied === prepared.payloadIndex, "and on the payload it was read against");
  }
  const events = prepared.decoded.events;
  assert(session.events.length + events.length <= session.options.eventsMaximum, "a fight's events stay inside the bound its options state");
  for (const event of events) session.events.push(event);
  session.state = prepared.stateAfter;
  let hasClosed;
  if (prepared.stateAfter.isOver) hasClosed = prepared.isOpening || !wasOver;
  else hasClosed = false;
  return {
    hasOpened: prepared.isOpening,
    hasClosed,
    eventsAdded: events.length,
    unreadAdded: prepared.decoded.unread.length
  };
}
function composeFightView(session) {
  const state = session.state;
  if (state === null) return null;
  assert(state.payloadsApplied > 0, "a fight that exists was built from something");
  assert(state.chargedSkills.length <= CHARGED_SKILLS_MAXIMUM, "and bounds what it charges");
  return {
    roster: indexCombatantRoster(state.combatants),
    events: session.events,
    unread: state.unread,
    messagesLost: state.messagesLost,
    messagesRead: state.messagesRead,
    hasJoinedInProgress: state.hasJoinedInProgress,
    isOver: state.isOver,
    readerSide: state.readerSide,
    turnStatement: state.turnStatement,
    isOnAuto: state.isOnAuto,
    payloadsApplied: state.payloadsApplied,
    chargedSkills: state.chargedSkills,
    carriedStatuses: composeCarriedStatuses(state.carriedStatusWalk),
    legendaryStandings: composeLegendaryStandings(state.legendaryWalk),
    turnsByCombatantId: state.carriedStatusWalk.turnsByCombatantId,
    eventsAtSeatingByCombatantId: state.eventsAtSeatingByCombatantId
  };
}

// src/ports/browser-store.ts
var STORE_KEY = {
  fights: "MargoMeter-fights",
  meterFolded: "MargoMeter-meter-folded",
  meterPosition: "MargoMeter-meter-position",
  helperFolded: "MargoMeter-helper-folded",
  helperPosition: "MargoMeter-helper-position",
  storage: "MargoMeter-storage",
  typeStep: "MargoMeter-type-step",
  meterSize: "MargoMeter-meter-size",
  helperSize: "MargoMeter-helper-size"
};
var StoreUnavailable = class extends Error {
  name = "StoreUnavailable";
};
var StoreRefused = class extends Error {
  name = "StoreRefused";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
var StoreValueTooLong = class extends Error {
  name = "StoreValueTooLong";
  length;
  maximum;
  constructor(length, maximum) {
    super();
    this.length = length;
    this.maximum = maximum;
  }
};
var STORE_KEYS = Object.values(STORE_KEY);
var STORE_VALUE_LENGTH_MAXIMUM = 4194304;
function initBrowserStore(storage) {
  return {
    read(key) {
      if (storage === null) return new StoreUnavailable();
      const storedText = attempt(() => storage.getItem(key));
      if (storedText instanceof Error) return new StoreRefused(storedText);
      if (typeof storedText !== "string") return null;
      return storedText;
    },
    write(key, storedText) {
      if (storage === null) return new StoreUnavailable();
      const tooLong = lookupStoreValueTooLong(storedText);
      if (tooLong !== null) return tooLong;
      const written = attempt(() => storage.setItem(key, storedText));
      if (written instanceof Error) return new StoreRefused(written);
      return void 0;
    },
    delete(key) {
      if (storage === null) return new StoreUnavailable();
      const deleted = attempt(() => storage.removeItem(key));
      if (deleted instanceof Error) return new StoreRefused(deleted);
      return void 0;
    }
  };
}
function lookupStoreValueTooLong(storedText) {
  if (storedText.length <= STORE_VALUE_LENGTH_MAXIMUM) return null;
  return new StoreValueTooLong(storedText.length, STORE_VALUE_LENGTH_MAXIMUM);
}
function initMemoryStore() {
  const valuesByKey = /* @__PURE__ */ new Map();
  return {
    read(key) {
      return valuesByKey.get(key) ?? null;
    },
    write(key, storedText) {
      const tooLong = lookupStoreValueTooLong(storedText);
      if (tooLong !== null) return tooLong;
      valuesByKey.set(key, storedText);
      assert(valuesByKey.size <= STORE_KEYS.length, "a store holds no more than the keys it has");
      return void 0;
    },
    delete(key) {
      valuesByKey.delete(key);
      return void 0;
    }
  };
}

// src/ports/payload-envelope.ts
var PayloadNotRecord = class extends Error {
  name = "PayloadNotRecord";
};
var PayloadFieldMalformed = class extends Error {
  name = "PayloadFieldMalformed";
  field;
  constructor(field, options) {
    super(void 0, options);
    this.field = field;
  }
};
var PayloadFieldTooLong = class extends Error {
  name = "PayloadFieldTooLong";
  field;
  count;
  maximum;
  constructor(field, count, maximum, options) {
    super(void 0, options);
    this.field = field;
    this.count = count;
    this.maximum = maximum;
  }
};
var PayloadCombatantRepeated = class extends Error {
  name = "PayloadCombatantRepeated";
  combatantId;
  constructor(combatantId) {
    super();
    this.combatantId = combatantId;
  }
};
var ENVELOPE_KEYS = {
  isInit: "init",
  isEnd: "endBattle",
  messages: "m",
  messagesStated: "mi",
  readerSide: "myteam",
  isOnAuto: "auto",
  turnStatement: "turns_warriors",
  combatants: "w"
};
var QUEUE_ENTRIES_MAXIMUM = 1024;
var WARRIOR_FIELDS = {
  id: "id",
  name: "name",
  side: "team",
  profession: "prof",
  level: "lvl",
  health: "hp",
  statuses: "buffs",
  charge: "super_cast"
};
var HEALTH_FIELDS = {
  maximum: "max",
  now: "cur"
};
var CHARGE_FIELDS = {
  name: "name",
  turnsElapsed: "turn",
  turnsStated: "total_turns"
};
var NOTHING_CARRIED = 0;
function readPayloadEnvelope(payload) {
  if (!isRecord(payload)) return new PayloadNotRecord();
  const messages = [];
  {
    const listed = getListField(payload, ENVELOPE_KEYS, "messages", MESSAGES_MAXIMUM);
    if (listed instanceof Error) return createEnvelopeFailure(listed);
    for (const message of listed ?? []) {
      if (typeof message !== "string") return new PayloadFieldMalformed("messages");
      if (message.length > 0) messages.push(message);
    }
    assert(messages.length <= MESSAGES_MAXIMUM, "a payload's messages stay inside the bound");
  }
  const messagesStated = getListField(payload, ENVELOPE_KEYS, "messagesStated", MESSAGES_MAXIMUM);
  if (messagesStated instanceof Error) return createEnvelopeFailure(messagesStated);
  const readerSide = readPayloadEnvelopeInteger(payload, "readerSide");
  if (readerSide instanceof Error) return readerSide;
  const onAutoStated = readPayloadEnvelopeInteger(payload, "isOnAuto");
  if (onAutoStated instanceof Error) return onAutoStated;
  let turnStatement;
  readTurn: {
    const queue = getRecordField(payload, ENVELOPE_KEYS, "turnStatement");
    if (queue instanceof Error) return createEnvelopeFailure(queue);
    if (queue === null) {
      turnStatement = null;
      break readTurn;
    }
    const ordinals = Object.keys(queue);
    if (ordinals.length > QUEUE_ENTRIES_MAXIMUM) {
      return new PayloadFieldTooLong("turnStatement", ordinals.length, QUEUE_ENTRIES_MAXIMUM);
    }
    let least = null;
    for (const ordinalText of ordinals) {
      const ordinal = parseInteger(ordinalText);
      if (ordinal === null) return new PayloadFieldMalformed("turnStatement");
      if (least === null) least = {
        ordinal,
        key: ordinalText
      };
      else if (ordinal < least.ordinal) least = {
        ordinal,
        key: ordinalText
      };
    }
    if (least === null) {
      turnStatement = null;
      break readTurn;
    }
    const combatantId = queue[least.key];
    if (typeof combatantId !== "number") return new PayloadFieldMalformed("turnStatement");
    if (!Number.isSafeInteger(combatantId)) return new PayloadFieldMalformed("turnStatement");
    turnStatement = {
      ordinal: least.ordinal,
      combatantId
    };
  }
  let warriors;
  {
    const keyed = getRecordField(payload, ENVELOPE_KEYS, "combatants");
    if (keyed instanceof Error) {
      const listed = getListField(payload, ENVELOPE_KEYS, "combatants", COMBATANTS_MAXIMUM);
      if (listed instanceof Error) return createEnvelopeFailure(listed);
      warriors = [
        ...listed ?? []
      ];
    } else if (keyed !== null) {
      warriors = Object.values(keyed);
    } else {
      warriors = [];
    }
    if (warriors.length > COMBATANTS_MAXIMUM) {
      return new PayloadFieldTooLong("combatants", warriors.length, COMBATANTS_MAXIMUM);
    }
  }
  const warriorEntries = readPayloadWarriorEntries(warriors);
  const ids = /* @__PURE__ */ new Set();
  for (const combatant of warriorEntries.combatants) {
    if (ids.has(combatant.id)) return new PayloadCombatantRepeated(combatant.id);
    ids.add(combatant.id);
  }
  return {
    isInit: isPayloadOpening(payload),
    isEnd: Object.hasOwn(payload, ENVELOPE_KEYS.isEnd),
    messages,
    messagesStated: messagesStated === null ? null : messagesStated.length,
    readerSide,
    isOnAuto: onAutoStated === null ? null : onAutoStated !== 0,
    turnStatement,
    combatants: warriorEntries.combatants,
    statusMasksByCombatantId: warriorEntries.statusMasksByCombatantId,
    chargeStatements: warriorEntries.chargeStatements
  };
}
function createEnvelopeFailure(failure) {
  if (failure instanceof FieldWrongType) {
    return new PayloadFieldMalformed(failure.field, {
      cause: failure
    });
  }
  const { field, count, maximum } = failure;
  assert(count > maximum, "a list refused for its length is past the bound");
  return new PayloadFieldTooLong(field, count, maximum, {
    cause: failure
  });
}
function readPayloadEnvelopeInteger(payload, field) {
  const asNumber = getNumberField(payload, ENVELOPE_KEYS, field);
  if (!(asNumber instanceof Error)) {
    if (asNumber === null) return null;
    if (!Number.isSafeInteger(asNumber)) return new PayloadFieldMalformed(field);
    return asNumber;
  }
  const asText = getTextField(payload, ENVELOPE_KEYS, field);
  if (asText instanceof Error) return new PayloadFieldMalformed(field, {
    cause: asText
  });
  assert(asText !== null, "a field of the wrong type for a number is present");
  const integer = parseInteger(asText);
  if (integer === null) return new PayloadFieldMalformed(field, {
    cause: asNumber
  });
  return integer;
}
function readPayloadWarriorEntries(entries) {
  assert(entries.length <= COMBATANTS_MAXIMUM, "a payload's warriors are bounded by the envelope");
  const warriorEntries = {
    combatants: [],
    statusMasksByCombatantId: /* @__PURE__ */ new Map(),
    chargeStatements: []
  };
  for (const warriorEntry of entries) {
    if (!isRecord(warriorEntry)) continue;
    const id = getNumberField(warriorEntry, WARRIOR_FIELDS, "id");
    if (id instanceof Error) continue;
    if (id === null) continue;
    if (!Number.isSafeInteger(id)) continue;
    let combatant;
    readCombatant: {
      const name = getStatedTextField(warriorEntry, WARRIOR_FIELDS, "name");
      if (name instanceof Error) {
        combatant = null;
        break readCombatant;
      }
      if (name === null) {
        combatant = null;
        break readCombatant;
      }
      const side = getNumberField(warriorEntry, WARRIOR_FIELDS, "side");
      if (side instanceof Error) {
        combatant = null;
        break readCombatant;
      }
      if (side === null) {
        combatant = null;
        break readCombatant;
      }
      if (!Number.isSafeInteger(side)) {
        combatant = null;
        break readCombatant;
      }
      const profession = getStatedTextField(warriorEntry, WARRIOR_FIELDS, "profession");
      const level = getNumberField(warriorEntry, WARRIOR_FIELDS, "level");
      combatant = {
        id,
        name,
        side,
        profession: profession instanceof Error ? null : profession,
        level: level instanceof Error ? null : level,
        healthMaximum: readPayloadWarriorHealth(warriorEntry, "maximum")
      };
      assert(combatant.name.length > 0, "a name that was read says something");
    }
    if (combatant !== null) warriorEntries.combatants.push(combatant);
    let mask;
    readMask: {
      const now = readPayloadWarriorHealth(warriorEntry, "now");
      if (now !== null) {
        if (now <= 0) {
          mask = NOTHING_CARRIED;
          break readMask;
        }
      }
      const stated = getNumberField(warriorEntry, WARRIOR_FIELDS, "statuses");
      if (stated instanceof Error) {
        mask = null;
        break readMask;
      }
      if (stated === null) {
        mask = null;
        break readMask;
      }
      if (stated < 0) {
        mask = null;
        break readMask;
      }
      if (!Number.isSafeInteger(stated)) {
        mask = null;
        break readMask;
      }
      if (stated < 2 ** STATUS_BITS_MAXIMUM) mask = stated;
      else mask = null;
    }
    if (mask !== null) warriorEntries.statusMasksByCombatantId.set(id, mask);
    let charge;
    readCharge: {
      const stated = getRecordField(warriorEntry, WARRIOR_FIELDS, "charge");
      if (stated instanceof Error) {
        charge = null;
        break readCharge;
      }
      if (stated === null) {
        charge = null;
        break readCharge;
      }
      const skillName = getStatedTextField(stated, CHARGE_FIELDS, "name");
      const turnsElapsed = getNumberField(stated, CHARGE_FIELDS, "turnsElapsed");
      const turnsStated = getNumberField(stated, CHARGE_FIELDS, "turnsStated");
      if (skillName instanceof Error) {
        charge = null;
        break readCharge;
      }
      if (turnsElapsed instanceof Error) {
        charge = null;
        break readCharge;
      }
      if (turnsStated instanceof Error) {
        charge = null;
        break readCharge;
      }
      if (skillName === null) {
        charge = null;
        break readCharge;
      }
      if (turnsElapsed === null) {
        charge = null;
        break readCharge;
      }
      if (turnsStated === null) {
        charge = null;
        break readCharge;
      }
      if (turnsElapsed < 0) {
        charge = null;
        break readCharge;
      }
      if (turnsStated < turnsElapsed) {
        charge = null;
        break readCharge;
      }
      charge = {
        skillName,
        turnsElapsed,
        turnsStated
      };
    }
    warriorEntries.chargeStatements.push({
      combatantId: id,
      charge
    });
  }
  assert(warriorEntries.combatants.length <= entries.length, "a combatant is one entry");
  return warriorEntries;
}
function readPayloadWarriorHealth(warriorEntry, field) {
  const health = getRecordField(warriorEntry, WARRIOR_FIELDS, "health");
  if (health instanceof Error) return null;
  if (health === null) return null;
  const figure = getNumberField(health, HEALTH_FIELDS, field);
  if (figure instanceof Error) return null;
  if (figure === null) return null;
  if (field === "maximum") {
    if (figure <= 0) return null;
    if (!Number.isSafeInteger(figure)) return null;
  }
  return figure;
}
function isPayloadOpening(payload) {
  if (!isRecord(payload)) return false;
  return Object.hasOwn(payload, ENVELOPE_KEYS.isInit);
}

// src/ports/margonem-engine-warriors.ts
var MargonemEngineWarriorsAbsent = class extends Error {
  name = "MargonemEngineWarriorsAbsent";
};
var MargonemEngineWarriorCollectionAbsent = class extends Error {
  name = "MargonemEngineWarriorCollectionAbsent";
};
var MargonemEngineWarriorsExceeded = class extends Error {
  name = "MargonemEngineWarriorsExceeded";
  count;
  maximum;
  constructor(count, maximum) {
    super();
    this.count = count;
    this.maximum = maximum;
  }
};
var WARRIOR_COLLECTIONS = [
  "warriorsList",
  "warriors"
];
var WARRIOR_ID_KEY = WARRIOR_FIELDS.id;
var WARRIOR_SNAPSHOT_FIELDS = {
  originalId: "originalId",
  mana: "mana",
  energy: "energy",
  armour: "ac"
};
var IDENTITY_KEYS = [
  WARRIOR_ID_KEY,
  WARRIOR_SNAPSHOT_FIELDS.originalId
];
var COPIED_KEYS = [
  WARRIOR_FIELDS.name,
  WARRIOR_FIELDS.side,
  WARRIOR_FIELDS.profession,
  WARRIOR_FIELDS.level,
  WARRIOR_SNAPSHOT_FIELDS.mana,
  WARRIOR_SNAPSHOT_FIELDS.energy
];
var SHALLOW_COPIED_KEYS = [
  WARRIOR_FIELDS.health,
  WARRIOR_SNAPSHOT_FIELDS.armour
];
var NAME_KEY = WARRIOR_FIELDS.name;
var WARRIOR_ENTRIES_MAXIMUM = COMBATANTS_MAXIMUM * 10;
function readMargonemEngineWarriorSnapshot(battle) {
  const named = readMargonemEngineWarriorsNamed(battle);
  if (named instanceof Error) return named;
  const snapshot = named.map(readCapturedCombatant);
  assert(snapshot.length === named.length, "every named warrior is copied once");
  return snapshot;
}
function readCapturedCombatant(warrior) {
  let id = null;
  for (const key of IDENTITY_KEYS) {
    if (id !== null) break;
    const stated = warrior[key];
    if (typeof stated !== "number") continue;
    if (Number.isFinite(stated)) id = stated;
  }
  const copied = {};
  for (const key of COPIED_KEYS) copied[key] = warrior[key] ?? null;
  for (const key of SHALLOW_COPIED_KEYS) {
    const copiedValue = warrior[key];
    copied[key] = isRecord(copiedValue) ? {
      ...copiedValue
    } : copiedValue ?? null;
  }
  assert(Object.keys(copied).length === COPIED_KEYS.length + SHALLOW_COPIED_KEYS.length, "a copy holds every kept key of the warrior, once");
  const { name, team, prof, lvl, hp, mana, energy, ac } = copied;
  return {
    id,
    name,
    team,
    prof,
    lvl,
    hp,
    mana,
    energy,
    ac
  };
}
function readMargonemEngineWarriorsNamed(battle) {
  if (!isRecord(battle)) return new MargonemEngineWarriorsAbsent();
  let hasCollection = false;
  for (const collectionKey of WARRIOR_COLLECTIONS) {
    const collection = battle[collectionKey];
    if (!isRecord(collection)) continue;
    hasCollection = true;
    const named = [];
    const idsSeen = /* @__PURE__ */ new Set();
    let entriesLooked = 0;
    for (const key in collection) {
      if (!Object.hasOwn(collection, key)) continue;
      entriesLooked += 1;
      if (entriesLooked > WARRIOR_ENTRIES_MAXIMUM) {
        return new MargonemEngineWarriorsExceeded(entriesLooked, WARRIOR_ENTRIES_MAXIMUM);
      }
      const warrior = collection[key];
      if (!isMargonemEngineWarriorNamed(warrior)) continue;
      const id = warrior[WARRIOR_ID_KEY];
      if (typeof id === "number") {
        if (idsSeen.has(id)) continue;
        idsSeen.add(id);
      }
      named.push(warrior);
      if (named.length > COMBATANTS_MAXIMUM) {
        return new MargonemEngineWarriorsExceeded(named.length, COMBATANTS_MAXIMUM);
      }
    }
    if (named.length === 0) continue;
    return named;
  }
  if (!hasCollection) return new MargonemEngineWarriorCollectionAbsent();
  return new MargonemEngineWarriorsAbsent();
}
function isMargonemEngineWarriorNamed(warriorCandidate) {
  if (!isRecord(warriorCandidate)) return false;
  const name = warriorCandidate[NAME_KEY];
  if (typeof name !== "string") return false;
  return name.length > 0;
}

// src/ports/margonem-engine-battle.ts
var MargonemEngineAbsent = class extends Error {
  name = "MargonemEngineAbsent";
};
var MargonemEngineBattleAbsent = class extends Error {
  name = "MargonemEngineBattleAbsent";
};
var MargonemEngineMethodAbsent = class extends Error {
  name = "MargonemEngineMethodAbsent";
};
var MargonemEngineMethodUnwritable = class extends Error {
  name = "MargonemEngineMethodUnwritable";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
var MargonemEngineAlreadyWrapped = class extends Error {
  name = "MargonemEngineAlreadyWrapped";
};
var SearchAbandoned = class extends Error {
  name = "SearchAbandoned";
  looks;
  maximum;
  constructor(looks, maximum, cause) {
    super(void 0, {
      cause
    });
    this.looks = looks;
    this.maximum = maximum;
  }
};
var WrapCovered = class extends Error {
  name = "WrapCovered";
};
var ENGINE_FIELD = "Engine";
var ENGINE_CALL_FIELD = "getEngine";
var BATTLE_FIELD = "battle";
var WRAPPED_METHOD = "updateData";
var WRAP_MARKER = "__margometerBattleWrap";
var WRAP_VERSION = 1;
var FAILURES_MAXIMUM = 1048576;
var ENGINE_FIELDS = {
  map: "map",
  hero: "hero"
};
var HELD_FIELDS = {
  data: "d"
};
var ENGINE_ASKERS = [
  (browserWindow) => browserWindow[ENGINE_FIELD],
  (browserWindow) => {
    const getEngine = browserWindow[ENGINE_CALL_FIELD];
    if (typeof getEngine !== "function") return null;
    return Reflect.apply(getEngine, browserWindow, []);
  }
];
function initMargonemEngineBattle(browserWindow) {
  return {
    readBattle() {
      const asked = readMargonemEngineAnswer(browserWindow, lookupMargonemEngineBattle);
      if (asked instanceof Caught) return asked;
      if (!asked.hasEngine) return new MargonemEngineAbsent();
      const battle = asked.answer;
      if (battle === null) return new MargonemEngineBattleAbsent();
      return {
        // Put the wrap on the engine's own method.
        wrap: (listener) => {
          const looked = attempt(() => {
            const method = battle[WRAPPED_METHOD];
            return {
              method,
              isOurs: isOurWrap(method)
            };
          });
          if (looked instanceof Caught) {
            return new MargonemEngineMethodUnwritable(looked);
          }
          const original = looked.method;
          if (typeof original !== "function") return new MargonemEngineMethodAbsent();
          if (looked.isOurs) return new MargonemEngineAlreadyWrapped();
          const failures = {
            count: 0,
            first: null
          };
          const recordFailure = (failure) => {
            if (failures.count === FAILURES_MAXIMUM) return;
            failures.count += 1;
            if (failures.first === null) failures.first = failure;
          };
          const callEngineUpdate = function(...engineArguments) {
            const before = attempt(() => listener.onBeforeCall());
            if (before instanceof Error) recordFailure(before);
            const answer = Reflect.apply(original, this, engineArguments);
            const after = attempt(() => listener.onPayload(engineArguments[0]));
            if (after instanceof Error) recordFailure(after);
            return answer;
          };
          const wrapper = Object.assign(callEngineUpdate, {
            [WRAP_MARKER]: WRAP_VERSION
          });
          const isWrapStanding = attempt(() => {
            void Reflect.set(battle, WRAPPED_METHOD, wrapper);
            if (battle[WRAPPED_METHOD] === wrapper) return true;
            void Reflect.set(battle, WRAPPED_METHOD, original);
            return false;
          });
          if (isWrapStanding instanceof Error) {
            return new MargonemEngineMethodUnwritable(isWrapStanding);
          }
          if (!isWrapStanding) return new MargonemEngineMethodUnwritable(null);
          return {
            detach() {
              const detached = attempt(() => {
                if (battle[WRAPPED_METHOD] !== wrapper) return new WrapCovered();
                if (Reflect.set(battle, WRAPPED_METHOD, original)) return void 0;
                return new MargonemEngineMethodUnwritable(null);
              });
              if (detached instanceof Caught) {
                return new MargonemEngineMethodUnwritable(detached);
              }
              return detached;
            },
            getFailureCount: () => failures.count,
            getFirstFailure: () => failures.first
          };
        },
        readWarriors() {
          return attempt(() => readMargonemEngineWarriorSnapshot(battle));
        }
      };
    }
  };
}
function lookupMargonemEngineBattle(engine) {
  const battle = engine[BATTLE_FIELD];
  return isRecord(battle) ? battle : null;
}
function isOurWrap(engineMethod) {
  if (typeof engineMethod !== "function") return false;
  return WRAP_MARKER in engineMethod;
}
function readMargonemEngineAnswer(browserWindow, readEngine) {
  if (!isRecord(browserWindow)) return {
    answer: null,
    hasEngine: false
  };
  let hasEngine = false;
  let firstFailure = null;
  for (const askEngine of ENGINE_ASKERS) {
    const asked = attempt(() => {
      const engine = askEngine(browserWindow);
      if (!isRecord(engine)) return null;
      return {
        answer: readEngine(engine)
      };
    });
    if (asked instanceof Caught) {
      firstFailure ??= asked;
      continue;
    }
    if (asked === null) continue;
    hasEngine = true;
    if (asked.answer !== null) return {
      answer: asked.answer,
      hasEngine
    };
  }
  if (hasEngine) return {
    answer: null,
    hasEngine
  };
  if (firstFailure !== null) return firstFailure;
  return {
    answer: null,
    hasEngine
  };
}
function readMargonemEngineBattle(browserWindow) {
  const asked = readMargonemEngineAnswer(browserWindow, lookupMargonemEngineBattle);
  if (asked instanceof Caught) return asked;
  return asked.answer;
}
function readMargonemEngineRecord(engine, member) {
  const engineMember = getRecordField(engine, ENGINE_FIELDS, member);
  if (engineMember instanceof Error) return null;
  if (engineMember === null) return null;
  const memberRecord = getRecordField(engineMember, HELD_FIELDS, "data");
  if (memberRecord instanceof Error) return null;
  return memberRecord;
}

// src/ports/margonem-value.ts
var MARGONEM_VALUE = {
  place: "place",
  hero: "hero",
  label: "label",
  build: "build"
};
var MargonemValueAbsent = class extends Error {
  name = "MargonemValueAbsent";
  reading;
  constructor(reading) {
    super();
    this.reading = reading;
  }
};

// src/ports/margonem-engine-hero.ts
var HERO_FIELDS = {
  id: "id"
};
function initMargonemEngineHero(browserWindow) {
  return {
    readHeroId() {
      const asked = readMargonemEngineAnswer(browserWindow, readMargonemEngineHeroId);
      if (asked instanceof Caught) return asked;
      if (asked.answer !== null) return asked.answer;
      return new MargonemValueAbsent(MARGONEM_VALUE.hero);
    }
  };
}
function readMargonemEngineHeroId(engine) {
  const heroData = readMargonemEngineRecord(engine, "hero");
  if (heroData === null) return null;
  let id;
  readId: {
    const text = getTextField(heroData, HERO_FIELDS, "id");
    if (!(text instanceof Error)) {
      if (text !== null) {
        id = parseInteger(text);
        break readId;
      }
    }
    const stated = getNumberField(heroData, HERO_FIELDS, "id");
    if (stated instanceof Error) {
      id = null;
      break readId;
    }
    id = stated;
  }
  if (id === null) return null;
  if (!Number.isSafeInteger(id)) return null;
  if (id <= 0) return null;
  return id;
}

// src/ports/margonem-engine-place.ts
var PLACE_FIELDS = {
  mapName: "name",
  x: "x",
  y: "y"
};
function initMargonemEnginePlace(browserWindow) {
  return {
    readPlace() {
      const asked = readMargonemEngineAnswer(browserWindow, readMargonemEnginePlace);
      if (asked instanceof Caught) return asked;
      if (asked.answer !== null) return asked.answer;
      return new MargonemValueAbsent(MARGONEM_VALUE.place);
    }
  };
}
function readMargonemEnginePlace(engine) {
  const map = readMargonemEngineRecord(engine, "map");
  const hero = readMargonemEngineRecord(engine, "hero");
  let mapName;
  if (map === null) {
    mapName = null;
  } else {
    const name = getStatedTextField(map, PLACE_FIELDS, "mapName");
    if (name instanceof Error) mapName = null;
    else mapName = name;
  }
  const x = hero === null ? null : readHeroCoordinate(hero, "x");
  const y = hero === null ? null : readHeroCoordinate(hero, "y");
  if (mapName !== null) return {
    mapName,
    x,
    y
  };
  if (x !== null) return {
    mapName,
    x,
    y
  };
  if (y === null) return null;
  return {
    mapName,
    x,
    y
  };
}
function readHeroCoordinate(hero, field) {
  const text = getTextField(hero, PLACE_FIELDS, field);
  if (!(text instanceof Error)) {
    if (text !== null) return parseInteger(text);
  }
  const stated = getNumberField(hero, PLACE_FIELDS, field);
  if (stated instanceof Error) return null;
  return stated;
}

// src/ports/margonem-engine-tooltip.ts
var BLOCK_LANDING = {
  on: "on",
  off: "off",
  kept: "kept",
  refused: "refused"
};
var WARRIOR_ELEMENT_FIELD = "$";
var TOOLTIP_TARGETS = ".canvas-warrior-icon, .grave-warrior-other, .grave-warrior-npc";
var FIND_METHOD = "find";
var READ_METHOD = "getTipData";
var REPLACE_METHOD = "tip";
var APPEND_METHOD = "concatTip";
var TELL_METHOD = "trigger";
var TELL_EVENT = "tipupdate";
var CLIENT_BREAK = "<br>";
var ROWS_WRITTEN_MAXIMUM = 20;
function initMargonemEngineTooltip(browserWindow) {
  let blocksById = /* @__PURE__ */ new Map();
  return {
    writeRows(rowsByCombatantId) {
      const asked = [
        ...rowsByCombatantId.values()
      ].filter((rows) => rows.length > 0).length;
      assert(asked <= COMBATANTS_MAXIMUM, "no more blocks than a fight puts on a board");
      const warriorsById = attempt(() => {
        const battle = readMargonemEngineBattle(browserWindow);
        if (battle instanceof Caught) return battle;
        const warriors = readMargonemEngineWarriorsNamed(battle);
        if (warriors instanceof Error) return warriors;
        const drawnById = /* @__PURE__ */ new Map();
        for (const warrior of warriors) {
          const id = warrior[WARRIOR_ID_KEY];
          if (typeof id !== "number") continue;
          assert(!drawnById.has(id), "the page's warriors are read each id once");
          drawnById.set(id, warrior);
        }
        assert(drawnById.size <= warriors.length, "a fighter drawn is one the page holds");
        return drawnById;
      });
      if (warriorsById instanceof MargonemEngineWarriorsExceeded) return warriorsById;
      if (warriorsById instanceof Caught) return warriorsById;
      if (warriorsById instanceof MargonemEngineWarriorCollectionAbsent) {
        return {
          written: 0,
          refused: asked
        };
      }
      if (warriorsById instanceof MargonemEngineWarriorsAbsent) {
        return {
          written: 0,
          refused: 0
        };
      }
      const nextBlocksById = new Map(blocksById);
      const blocksWritten = attempt(() => {
        const counts = {
          written: 0,
          refused: 0
        };
        for (const [id, warrior] of warriorsById) {
          const block = encodeTooltipBlock(rowsByCombatantId.get(id) ?? []);
          const blockBefore = nextBlocksById.get(id) ?? null;
          const { landing, blockLeft } = writeMargonemEngineWarriorBlock(warrior, block, blockBefore);
          if (landing === BLOCK_LANDING.on) {
            assert(blockLeft !== null, "a block on is a block remembered");
            assert(blockLeft.composed === block, "and the one composed now");
            nextBlocksById.set(id, blockLeft);
            counts.written += 1;
          } else if (landing === BLOCK_LANDING.off) {
            nextBlocksById.delete(id);
          } else if (landing === BLOCK_LANDING.refused) {
            if (block.length > 0) counts.refused += 1;
          } else assert(landing === BLOCK_LANDING.kept, "a tooltip left as it was");
        }
        return counts;
      });
      for (const id of [
        ...nextBlocksById.keys()
      ]) {
        if (!warriorsById.has(id)) nextBlocksById.delete(id);
      }
      assert(nextBlocksById.size <= COMBATANTS_MAXIMUM, "remembered blocks stay one board's worth");
      blocksById = nextBlocksById;
      if (blocksWritten instanceof Error) return blocksWritten;
      assert(blocksWritten.written + blocksWritten.refused <= asked, "no more blocks landed or were refused than were composed");
      return blocksWritten;
    }
  };
}
function encodeTooltipBlock(rows) {
  assert(rows.length <= ROWS_WRITTEN_MAXIMUM, "a block handed over is a stated length");
  const text = rows.map((row) => `${CLIENT_BREAK}${row}`).join("");
  if (text.length > 0) assert(text.startsWith(CLIENT_BREAK), "it opens on the client's break");
  return text;
}
function writeMargonemEngineWarriorBlock(warrior, block, blockBefore) {
  const kept = {
    landing: BLOCK_LANDING.kept,
    blockLeft: null
  };
  const refused = {
    landing: BLOCK_LANDING.refused,
    blockLeft: null
  };
  const warriorElement = warrior[WARRIOR_ELEMENT_FIELD];
  if (!isRecord(warriorElement)) return kept;
  const find = warriorElement[FIND_METHOD];
  if (typeof find !== "function") return refused;
  const targets = Reflect.apply(find, warriorElement, [
    TOOLTIP_TARGETS
  ]);
  if (!isTooltipTargets(targets)) return refused;
  const registryText = targets.getTipData();
  if (typeof registryText !== "string") return refused;
  const rows = block.split(CLIENT_BREAK).slice(1);
  if (blockBefore !== null) {
    const blockIndex = registryText.lastIndexOf(blockBefore.held);
    if (blockIndex !== -1) {
      if (blockBefore.composed === block) {
        return {
          landing: BLOCK_LANDING.on,
          blockLeft: blockBefore
        };
      }
      const theirs = registryText.slice(0, blockIndex) + registryText.slice(blockIndex + blockBefore.held.length);
      if (theirs.length === 0) {
        if (block.length === 0) return kept;
        const [firstRow, ...laterRows] = rows;
        assert(firstRow !== void 0, "a block composed holds a row");
        assert(firstRow.length > 0, "a tooltip is never replaced by nothing");
        targets.tip(firstRow);
        for (const row of laterRows) targets.concatTip(row);
        targets.trigger(TELL_EVENT);
        const blockLeft = {
          composed: block,
          held: rows.join(CLIENT_BREAK)
        };
        return {
          landing: BLOCK_LANDING.on,
          blockLeft
        };
      }
      targets.tip(theirs);
    }
  }
  if (block.length === 0) return {
    landing: BLOCK_LANDING.off,
    blockLeft: null
  };
  for (const row of rows) targets.concatTip(row);
  targets.trigger(TELL_EVENT);
  return {
    landing: BLOCK_LANDING.on,
    blockLeft: {
      composed: block,
      held: block
    }
  };
}
function isTooltipTargets(targetsCandidate) {
  if (!isRecord(targetsCandidate)) return false;
  if (typeof targetsCandidate[READ_METHOD] !== "function") return false;
  if (typeof targetsCandidate[REPLACE_METHOD] !== "function") return false;
  if (typeof targetsCandidate[APPEND_METHOD] !== "function") return false;
  return typeof targetsCandidate[TELL_METHOD] === "function";
}

// src/ports/margonem-client-build.ts
var BUILD_CHARACTERS_MINIMUM = 8;
var SCRIPT_NAME_HEAD = "main.min";
var SCRIPT_NAME_TAIL = ".js";
var OPTIONAL_SEPARATOR = ".";
var BUILD_DASH = "-";
var BUILD_UNDERSCORE = "_";
var SCRIPT_NAME_LOOKS_MAXIMUM = 256;
var SCRIPTS_MAXIMUM = 4096;
function initMargonemClientBuild(readScriptSources) {
  return {
    readBuildId() {
      const sources = attempt(() => readScriptSources());
      if (sources instanceof Error) return sources;
      const walked = Math.min(sources.length, SCRIPTS_MAXIMUM);
      for (let scriptIndex = 0; scriptIndex < walked; scriptIndex += 1) {
        const source = sources[scriptIndex];
        if (typeof source !== "string") continue;
        const build = parseMargonemClientBuildId(source);
        if (build !== null) return build;
      }
      return new MargonemValueAbsent(MARGONEM_VALUE.build);
    }
  };
}
function parseMargonemClientBuildId(text) {
  const span = lookupScriptNameSpan(text);
  if (span === null) return null;
  return text.slice(span.buildStart, span.buildEnd);
}
function lookupScriptNameSpan(text) {
  let from = 0;
  for (let look = 0; look < SCRIPT_NAME_LOOKS_MAXIMUM; look += 1) {
    const head = text.indexOf(SCRIPT_NAME_HEAD, from);
    if (head === -1) return null;
    from = head + 1;
    let buildStart = head + SCRIPT_NAME_HEAD.length;
    if (text.charAt(buildStart) === OPTIONAL_SEPARATOR) buildStart += 1;
    const buildEnd = lookupEndOfRun(text, buildStart, RUN_CHARACTERS_MAXIMUM, isBuildCharacterAt);
    if (buildEnd === null) continue;
    if (buildEnd - buildStart < BUILD_CHARACTERS_MINIMUM) continue;
    if (!text.startsWith(SCRIPT_NAME_TAIL, buildEnd)) continue;
    assert(head < buildStart, "a name starts before the id inside it");
    return {
      nameStart: head,
      buildStart,
      buildEnd
    };
  }
  return null;
}
function isBuildCharacterAt(text, index) {
  const character = text.charAt(index);
  if (character === BUILD_DASH) return true;
  if (character === BUILD_UNDERSCORE) return true;
  if (character >= "0") {
    if (character <= "9") return true;
  }
  if (character >= "a") {
    if (character <= "z") return true;
  }
  if (character >= "A") return character <= "Z";
  return false;
}

// src/ports/margonem-client-dictionary.ts
var TRANSLATE_FIELD = "_t";
var DIRECTION_SIGNS = "+-";
var HOLE_MARK = "%";
var FULL_STOP = ".";
var ENTRY_LENGTH_MAXIMUM = 4096;
function initMargonemClientDictionary(browserWindow) {
  return {
    readLabel(labelId, category) {
      assert(labelId.length > 0, "an id asked of the client is one the panel named");
      if (category !== void 0) assert(category.length > 0, "and filed somewhere");
      const dictionaryText = attempt(() => {
        if (!isRecord(browserWindow)) return null;
        const translate = browserWindow[TRANSLATE_FIELD];
        if (typeof translate !== "function") return null;
        const translation = Reflect.apply(translate, browserWindow, [
          labelId,
          null,
          category
        ]);
        if (typeof translation !== "string") return null;
        return translation;
      });
      if (dictionaryText instanceof Error) return dictionaryText;
      if (dictionaryText === null) return new MargonemValueAbsent(MARGONEM_VALUE.label);
      if (dictionaryText.length > ENTRY_LENGTH_MAXIMUM) {
        return new MargonemValueAbsent(MARGONEM_VALUE.label);
      }
      const label = parseLabel(dictionaryText);
      if (label === null) return new MargonemValueAbsent(MARGONEM_VALUE.label);
      return label;
    }
  };
}
function parseLabel(dictionaryText) {
  assert(dictionaryText.length <= ENTRY_LENGTH_MAXIMUM, "an entry read for a label stays inside that bound");
  if (hasHole(dictionaryText)) return null;
  const firstCharacter = dictionaryText[0];
  const isSigned = firstCharacter === void 0 ? false : DIRECTION_SIGNS.includes(firstCharacter);
  const unsigned = (isSigned ? dictionaryText.slice(1) : dictionaryText).trim();
  assert(unsigned.length <= dictionaryText.length, "taking a sign off never lengthens an entry");
  const label = (unsigned.endsWith(FULL_STOP) ? unsigned.slice(0, -1) : unsigned).trim();
  if (label.length === 0) return null;
  assert(!hasHole(label), "a label carries no hole the client would have filled");
  assert(label.length <= dictionaryText.length, "and is no longer than the entry it was read out of");
  return label;
}
function hasHole(dictionaryText) {
  assert(dictionaryText.length <= ENTRY_LENGTH_MAXIMUM, "text walked for a hole stays inside its bound");
  const open = dictionaryText.indexOf(HOLE_MARK);
  if (open === -1) return false;
  return dictionaryText.indexOf(HOLE_MARK, open + 1) !== -1;
}

// src/ports/browser-time.ts
var DAY_MAXIMUM = 31;
var MONTH_MAXIMUM = 12;
var FIRST_MONTH_OFFSET = 1;
var HOUR_MAXIMUM = 23;
var MINUTE_MAXIMUM = 59;
function initBrowserClock(date) {
  return {
    // ⚠️ A page's `Date` is somebody else's, and a now that is no whole millisecond past nought
    // breaks it as a throw would: it is answered as one, and nothing is kept under it.
    readNowMilliseconds: () => attempt(() => {
      const now = date.now();
      assert(typeof now === "number", "a page's now is a number");
      assert(Number.isSafeInteger(now), "of whole milliseconds");
      assert(now >= 0, "counted from the clock's nought");
      return now;
    }),
    readMoment(atMilliseconds) {
      assert(Number.isSafeInteger(atMilliseconds), "a moment asked about is one a clock stated");
      const moment = attempt(() => {
        const dateValue = new date(atMilliseconds);
        const day = readMomentPart(dateValue.getDate?.(), 1, DAY_MAXIMUM);
        const monthFromZero = readMomentPart(dateValue.getMonth?.(), 0, MONTH_MAXIMUM - FIRST_MONTH_OFFSET);
        const hour = readMomentPart(dateValue.getHours?.(), 0, HOUR_MAXIMUM);
        const minute = readMomentPart(dateValue.getMinutes?.(), 0, MINUTE_MAXIMUM);
        if (day === null) return null;
        if (monthFromZero === null) return null;
        if (hour === null) return null;
        if (minute === null) return null;
        return {
          day,
          month: monthFromZero + FIRST_MONTH_OFFSET,
          hour,
          minute
        };
      });
      if (moment instanceof Error) return null;
      return moment;
    },
    readTimestampText(atMilliseconds) {
      assert(Number.isSafeInteger(atMilliseconds), "a moment written down is one a clock stated");
      return attempt(() => {
        const timestampText = new date(atMilliseconds).toISOString();
        assert(typeof timestampText === "string", "a page's clock writes a moment as text");
        return timestampText;
      });
    }
  };
}
function readMomentPart(momentPart, minimum, maximum) {
  assert(minimum <= maximum, "a range is read low to high");
  if (typeof momentPart !== "number") return null;
  if (!Number.isSafeInteger(momentPart)) return null;
  if (momentPart < minimum) return null;
  if (momentPart <= maximum) return momentPart;
  return null;
}
function initBrowserFrames(frames) {
  return {
    requestFrame(step, onStepFailure) {
      const runGuardedStep = () => {
        const ran = attempt(step);
        if (!(ran instanceof Error)) return;
        void attempt(() => onStepFailure(ran));
      };
      const handle = attempt(() => frames.requestAnimationFrame(runGuardedStep));
      if (handle instanceof Error) return handle;
      return {
        cancel: () => attempt(() => frames.cancelAnimationFrame(handle))
      };
    }
  };
}
function initBrowserInterval(timers) {
  return {
    every(step, everyMilliseconds, onStepFailure) {
      assert(Number.isSafeInteger(everyMilliseconds), "a step repeats every whole millisecond");
      assert(everyMilliseconds > 0, "and some time passes between two of them");
      const runGuardedStep = () => {
        const ran = attempt(step);
        if (!(ran instanceof Error)) return;
        void attempt(() => onStepFailure(ran));
      };
      const handle = attempt(() => timers.setInterval(runGuardedStep, everyMilliseconds));
      if (handle instanceof Error) return handle;
      return {
        cancel: () => attempt(() => timers.clearInterval(handle))
      };
    }
  };
}

// src/ports/browser-console.ts
var BRAND = "MargoMeter/Panel";
function initBrowserConsole(browserConsole) {
  return {
    writeBrandedLine(kind, detail) {
      void attempt(() => browserConsole.error(`${BRAND} ${kind}`, detail));
    }
  };
}

// src/ports/browser-file.ts
var FileApiAbsent = class extends Error {
  name = "FileApiAbsent";
};
var DOWNLOAD_ANCHOR_CLASS = "MargoMeter-download";
var FILE_TYPE = "application/json";
function initBrowserFile(downloads) {
  return {
    writeFile(name, text, onLateFailure) {
      assert(name.length > 0, "a file handed over is named");
      assert(text.length > 0, "and says something");
      if (downloads === null) return new FileApiAbsent();
      const url = attempt(() => {
        return downloads.createObjectURL(downloads.createBlob(text, FILE_TYPE));
      });
      if (url instanceof Error) return url;
      if (url.length === 0) return new FileApiAbsent();
      const wasClicked = attempt(() => {
        const anchor = downloads.createAnchor();
        if (anchor === null) return false;
        anchor.href = url;
        anchor.download = name;
        anchor.className = DOWNLOAD_ANCHOR_CLASS;
        downloads.appendAnchor(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
        }
        return true;
      });
      const releaseObjectUrl = () => {
        const revoked = attempt(() => downloads.revokeObjectURL(url));
        if (revoked instanceof Error) void attempt(() => onLateFailure(revoked));
      };
      const scheduled = attempt(() => downloads.setTimeout(releaseObjectUrl, 0));
      if (scheduled instanceof Error) return scheduled;
      if (wasClicked instanceof Error) return wasClicked;
      if (!wasClicked) return new FileApiAbsent();
      return void 0;
    }
  };
}

// src/ports/browser-surroundings.ts
var LOCATION_FIELD = "location";
var HOST_FIELD = "hostname";
var NAVIGATOR_FIELD = "navigator";
var USER_AGENT_FIELD = "userAgent";
var HOST_SEPARATOR = ".";
function initBrowserSurroundings(browserWindow) {
  return {
    readWorld() {
      const hostText = attempt(() => readBrowserText(browserWindow, LOCATION_FIELD, HOST_FIELD));
      if (hostText instanceof Error) return null;
      return parseWorld(hostText ?? "");
    },
    readUserAgent() {
      const userAgent = attempt(() => readBrowserText(browserWindow, NAVIGATOR_FIELD, USER_AGENT_FIELD));
      if (userAgent instanceof Error) return null;
      return userAgent;
    }
  };
}
function readBrowserText(browserWindow, memberName, field) {
  assert(memberName.length > 0, "a field of the page is asked for by name");
  if (!isRecord(browserWindow)) return null;
  const member = browserWindow[memberName];
  if (!isRecord(member)) return null;
  const text = member[field];
  if (typeof text !== "string") return null;
  if (text.length === 0) return null;
  return text;
}
function parseWorld(host) {
  const end = host.indexOf(HOST_SEPARATOR);
  const world = end === -1 ? host : host.slice(0, end);
  assert(world.length <= host.length, "a world is part of the host it was read off");
  if (world.length === 0) return null;
  return world;
}

// src/ui/panel-words.ts
var CAVEAT = {
  reduction: "reduction",
  turns: "turns",
  unannounced: "unannounced",
  undivided: "undivided"
};
var PANEL_REGION = {
  header: "header",
  strips: "strips",
  crumb: "crumb",
  list: "list",
  pinned: "pinned",
  sides: "sides",
  outside: "outside",
  suspicions: "suspicions",
  defects: "defects",
  /** The card a row opens. It is not a region of the panel's frame, and it is drawn like one. */
  card: "card",
  /** The window beside the panel. Its own region, drawn and undrawn like any other. */
  helper: "helper"
};
var PANEL_DEFECT_KIND = {
  kept: "kept",
  keeping: "keeping",
  mount: "mount",
  region: "region",
  reading: "reading",
  figures: "figures",
  gesture: "gesture",
  file: "file",
  engine: "engine"
};
var SUSPECT_MARK = "\u26A0 ";
var DEFECT_MARK = "\u2716 ";
var TURN_MARK = "\u25B8 ";
var CAVEAT_MARK = "i";
var PANEL_WORDS = {
  title: "MargoMeter",
  // Neither says "bez": the figure was placed, and it is the person that was never named.
  withoutActor: "Nieznany sprawca",
  withoutTarget: "Nieznany cel",
  unknown: "Nie wiadomo",
  unknownHowMany: "Nie wiadomo, ile",
  nothingYet: "Nikogo tu jeszcze nie ma.",
  noFightYet: "Nie by\u0142o jeszcze walki.",
  // Never "no fight yet": there was one, and it is this panel that could not show it.
  fightUnread: "Nie da si\u0119 pokaza\u0107 tej walki.",
  // Never "no fight yet" either: the shelf holds this one, and it is the one that would not read.
  keptUnread: "Nie da si\u0119 odczyta\u0107 zapisanej walki.",
  // What pointing at such a fight on the shelf says: what it will not do, never why.
  keptUnreadNote: "Nie da si\u0119 odczyta\u0107 tej walki, wi\u0119c nie otworzy si\u0119 ani nie zapisze do pliku.",
  noSides: "brak sk\u0142adu",
  fights: "Walki",
  backFromFights: "wr\xF3\u0107",
  options: "Opcje",
  backFromOptions: "wr\xF3\u0107",
  storage: "Zapisane walki",
  typeSize: "Rozmiar czcionki",
  windowSize: "Rozmiar okien",
  version: "Wersja dodatku",
  resizeHint: "Rozmiar zmienisz, ci\u0105gn\u0105c prawy dolny r\xF3g okna.",
  sizeOwn: "w\u0142asny",
  sizeDefault: "domy\u015Blny",
  sizeReset: "przywr\xF3\u0107",
  ourSide: "My",
  theirSide: "Oni",
  withoutSide: "Bez strony",
  wholeFight: "Ca\u0142a walka",
  openFights: "Poka\u017C albo schowaj zapisane walki",
  openOptions: "Poka\u017C albo schowaj opcje",
  back: "sk\u0142ad",
  shelfEmpty: "Nie ma jeszcze zapisanych walk.",
  dealtTo: "KOMU",
  takenFrom: "OD KOGO",
  damageKind: "TYP OBRA\u017BE\u0143",
  healthSource: "OD CZEGO",
  skills: "CZYM",
  withoutKind: "Bez podanego typu",
  /** Between the last two kinds a pool's part may have been, when the blow does not say which. */
  eitherKind: "lub",
  /** What a bound would not give a row to, summed. Never the row that closes a section: that
     * one is what the game named nothing for, and this is what it named (`develop ADR 0055`). */
  restOfKinds: "pozosta\u0142e",
  /**
     * The section under the list, and the row inside it. **Never `pozostałe`**, which the line
     * above already is: that one is a bound's leftovers inside a cut, and a reader meeting one
     * word over two different claims has no way to tell which they are looking at (**N9**).
     */
  outsideRanking: "POZA RANKINGIEM",
  outsideRow: "Poza wierszami",
  outsideNote: "Tej cz\u0119\u015Bci nie ma nigdzie wy\u017Cej \u2014 ani na wierszu postaci, ani pod list\u0105.",
  restNote: "Za du\u017Co pozycji, \u017Ceby pokaza\u0107 ka\u017Cd\u0105 \u2014 te s\u0105 tu zsumowane.",
  share: "Udzia\u0142 w walce",
  shareOfFigure: "Udzia\u0142 w tej liczbie",
  collapse: "Zwi\u0144 okno",
  expand: "Rozwi\u0144 okno",
  saveFight: "Zapisz t\u0119 walk\u0119 do pliku: policzone liczby i surowy zapis prosto z gry"
};
var OUTCOME_WORDS = {
  won: "wygrana",
  lost: "przegrana",
  drawn: "remis",
  fled: "ucieczka"
};
var OUTCOME_LETTERS = {
  won: "W",
  lost: "P",
  drawn: "R",
  fled: "U"
};
var NOTHING_WORDS = {
  damageDealt: "Nie zada\u0142a nikomu obra\u017Ce\u0144.",
  damageTaken: "Nic jej nie uby\u0142o.",
  healthGiven: "Nikogo nie leczy\u0142a.",
  healthRestored: "Nikt jej nie leczy\u0142."
};
var UNANNOUNCED_WORDS = {
  damageDealt: "Zwyk\u0142y cios",
  damageTaken: "Zwyk\u0142y cios",
  healthGiven: "Bez podanej umiej\u0119tno\u015Bci",
  healthRestored: "Bez podanej umiej\u0119tno\u015Bci"
};
var NOUN_WORDS = {
  damage: "Obra\u017Cenia",
  healing: "Leczenie"
};
var DIRECTION_WORDS = {
  damageDealt: "zadane",
  damageTaken: "otrzymane",
  healthGiven: "dane",
  healthRestored: "otrzymane"
};
var SIDE_WORDS = {
  everyone: "Wszyscy",
  reader: PANEL_WORDS.ourSide,
  opposing: PANEL_WORDS.theirSide
};
var CARD_METRIC_WORDS = {
  damageDealt: "Zadane",
  damageTaken: "Otrzymane",
  healthGiven: "Leczenie dane",
  healthRestored: "Leczenie otrzymane"
};
var UNNAMED_END_NOTES = {
  actor: {
    damage: "Gra nie m\xF3wi, kto to zada\u0142 \u2014 wiadomo tylko, kto to otrzyma\u0142.",
    healing: "Gra nie m\xF3wi, kto leczy\u0142 \u2014 wiadomo tylko, komu \u017Cycia przyby\u0142o."
  },
  target: {
    damage: "Gra nie m\xF3wi, w kogo \u2014 wiadomo tylko, \u017Ce cios wszed\u0142.",
    healing: "Gra nie m\xF3wi, komu \u2014 wiadomo tylko, \u017Ce leczenie wesz\u0142o."
  }
};
var CAVEATS = Object.values(CAVEAT);
var UNANNOUNCED_CAVEATS = {
  damage: CAVEAT.unannounced,
  healing: null
};
var APART_NOTE = "Nikt tego nie ma na swoim wierszu \u2014 dlatego stoi osobno.";
var PINNED_PLACING_NOTES = {
  dealtWithNoActor: APART_NOTE,
  givenWithNoActor: APART_NOTE,
  takenWithNoTarget: APART_NOTE,
  takenWithNoActor: "Te obra\u017Cenia s\u0105 ju\u017C policzone wy\u017Cej, u tych, kt\xF3rzy je otrzymali.",
  restoredWithNoActor: "To leczenie jest ju\u017C policzone wy\u017Cej, u tych, kt\xF3rzy je dostali."
};
var PINNED_SCOPE_NOTES = {
  dealtWithNoActor: "Tylko z pokazanej dru\u017Cyny \u2014 to ona to zada\u0142a, cho\u0107 gra nie m\xF3wi kto.",
  givenWithNoActor: "Tylko z pokazanej dru\u017Cyny \u2014 to ona to wyleczy\u0142a, cho\u0107 gra nie m\xF3wi kto.",
  takenWithNoActor: "Tylko z pokazanej dru\u017Cyny \u2014 liczone po tym, kto je otrzyma\u0142.",
  takenWithNoTarget: "Tylko z pokazanej dru\u017Cyny \u2014 gra nie m\xF3wi, kogo z niej.",
  restoredWithNoActor: "Tylko z pokazanej dru\u017Cyny \u2014 liczone po tym, komu przyby\u0142o \u017Cycia."
};
var OPENED_UNNAMED_STANDING_NOTES = {
  damageDealt: `W obra\u017Ceniach otrzymanych ta cz\u0119\u015B\u0107 stoi osobno, w wierszu \u201E${PANEL_WORDS.withoutTarget}\u201D pod list\u0105.`,
  damageTaken: `Pod list\u0105 ta cz\u0119\u015B\u0107 jest te\u017C w wierszu \u201E${PANEL_WORDS.withoutActor}\u201D, razem z reszt\u0105 takich obra\u017Ce\u0144.`,
  healthGiven: null,
  healthRestored: `Pod list\u0105 ta cz\u0119\u015B\u0107 jest te\u017C w wierszu \u201E${PANEL_WORDS.withoutActor}\u201D, razem z reszt\u0105 takiego leczenia.`
};
var NO_KIND_NOTES = {
  damage: "Gra nie m\xF3wi, jakiego typu by\u0142y te obra\u017Cenia.",
  healing: "Gra nie m\xF3wi, od czego by\u0142o to leczenie."
};
var NEITHER_END_WORDS = {
  label: "Nie do przypisania",
  note: "Ta cz\u0119\u015B\u0107 nie trafi\u0142a na \u017Caden wiersz \u2014 nie wiadomo ani kto, ani komu."
};
var CARD_WORDS = {
  /**
     * The heading over the figures the fight is summed over, and it is what the two blow headings
     * below are read against: a card whose blocks each name their own scope needs the widest one
     * named too, or the widest reads as the default every other figure is a part of.
     */
  wholeFight: "W ca\u0142ej walce",
  /**
     * **It says what the protocol stated, not what this reader summed.** `surowe z ciosów` named a
     * scope, and the scope was not true: `-dmga` — *obrażenia nieuchronne* — never carries a
     * `+dmga` half, because nothing reduces it (`docs/protocol-keys.md`), so the figure
     * sits below the blows' own applied total on 5 of the 113 rows stating one, measured over
     * `captures/` on 2026-09-14. Worded as what was **stated** it claims nothing about
     * coverage, which is the register the rest of this file's sentences are written in (**L3**).
     */
  raw: "Podane przed redukcj\u0105",
  blows: "Ciosy",
  blowsWithoutSkill: "bez umiej\u0119tno\u015Bci",
  skillUses: "U\u017Cycia umiej\u0119tno\u015Bci",
  /**
     * **Two labels, because the card states one figure or two**: which one is whether a lost turn
     * was heard anywhere in this fight, and where none was the second half is unread, not nought.
     * The longer one is exactly `LABEL_CHARACTERS_MAXIMUM` long, which is why its slash carries
     * no space where the figures beside it do. `develop ADR 0110`.
     */
  turns: "Tury wykonane",
  turnsWithLost: "Tury wykonane/utracone",
  prevented: "Zatrzymane",
  blowsCritical: "Krytyki",
  /** A subset of the line above, which is what a sub-line under it means. */
  blowsCriticalOffhand: "broni\u0105 pomocnicz\u0105",
  /**
     * A heading each, because the two runs stand together and half the keys under them belong to
     * the other end: `+pierce` fires when its holder attacks and `-evade` when its holder is hit
     * (`docs/protocol-keys.md`). `develop ADR 0032`.
     */
  striking: "W ciosach zadanych",
  struck: "W ciosach przyj\u0119tych",
  /** Said only where the row under the card states a narrower figure than the card does. */
  scope: "Liczby z ca\u0142ej walki.",
  /**
     * Said by the end left out of an opened figure: the section over it comes to a hundred with
     * that row, and a reader adding up the rest is otherwise left a part short.
     */
  insideSection: "Ta cz\u0119\u015B\u0107 jest wliczona w sum\u0119 nad sekcj\u0105 \u2014 bez niej udzia\u0142y nie da\u0142yby 100%.",
  /**
     * A heading over a run of parts and **never a sum of them**: points of armour and percentage
     * points of resistance stand under it, and one number over both would be two quantities
     * wearing one word (`src/core/battle-event.ts`).
     */
  destroyed: "Zniszczone",
  /**
     * The run of its own the legendary bonuses stand in, at whichever end of a blow each fired —
     * the line under it names which. Those held for the whole fight stand after the colon in one
     * sentence, because a count of them would read as a count of firings (ADR 0029).
     */
  legendary: "Bonusy legendarne",
  legendaryHeld: "Przez ca\u0142\u0105 walk\u0119:",
  /**
     * Somebody else's bonuses, in the run after, each by its name and count. The word is the one
     * the screens already use for what reached a combatant (ADR 0032).
     */
  legendaryReached: "Otrzymane bonusy legendarne",
  /**
     * The instruction a row gives, and it stands wherever pressing leads somewhere —
     * `DESIGN.md` owns that rule. The right press is not named beside it: a reader on the
     * ranking has nowhere to go back to, so a row's card would promise a gesture that does nothing
     * there.
     */
  gesture: "LPM \u2014 rozwi\u0144 wiersz",
  /**
     * The way back, and it stands on the crumb alone — which is drawn only where a level is open,
     * so both gestures it names do something wherever it is read. The second is the cheapest
     * gesture the panel has and the only one nothing else states. `develop ADR 0086`.
     */
  gestureBack: "LPM tutaj \u2014 wr\xF3\u0107 o krok",
  gestureBackAnywhere: "PPM gdziekolwiek \u2014 wr\xF3\u0107 o krok",
  /**
     * Said where the window is too short for the whole card, which is the one thing this panel
     * cannot answer by drawing less of a figure. **L3**: what is not shown, never which of our
     * runs was dropped to make it fit.
     */
  cut: "Nie wszystko si\u0119 mie\u015Bci w tym oknie."
};
var CAVEAT_NOTES = {
  reduction: "Pancerza ani odporno\u015Bci gra nie podaje, wi\u0119c z tych liczb nie wyliczysz ca\u0142ej redukcji.",
  turns: "Gra nie podaje, ile tur kto\u015B dosta\u0142, tylko co w nich zrobi\u0142.",
  unannounced: "Gra nie m\xF3wi, czym te ciosy zadano \u2014 wiadomo tylko, \u017Ce pad\u0142y.",
  undivided: "Absorpcj\u0119 gra podaje jedn\u0105 liczb\u0105 na ca\u0142y cios, wi\u0119c nie wiadomo, ile z niej przypada na kt\xF3ry typ."
};
var DEFENCE_WORD_BY_KEY = new Map(Object.entries({
  blok: "blok",
  absorb: "absorpcja",
  absorbm: "absorpcja magiczna"
}));
var PROC_WORD_BY_KEY = new Map(Object.entries({
  "+crit": "krytyk",
  /** Never drawn beside the others: the card states it under the count it is a part of. */
  "+of_crit": "broni\u0105 pomocnicz\u0105",
  "+pierce": "przebicie",
  "-pierceb": "blok przebicia",
  "+stun": "og\u0142uszenie",
  "+stun2": "og\u0142uszenie",
  "+stun2-c": "og\u0142uszenie",
  "+stun2-d": "og\u0142uszenie",
  "+stun2-f": "og\u0142uszenie",
  "+stun2-l": "og\u0142uszenie",
  "+freeze": "zamro\u017Cenie",
  "+wound": "g\u0142\u0119boka rana",
  /**
     * The same wound off the auxiliary weapon, sharing the word rather than taking one of its own:
     * a second row would split one mechanic over the hand that threw it, which is a difference the
     * five stun keys were not given either.
     */
  "+of_wound": "g\u0142\u0119boka rana",
  /** A deep wound something weakened, which is a deep wound: `PROC_SUB_WORD_BY_KEY` says so. */
  "+woundpoison": "g\u0142\u0119boka rana",
  "+woundfrost": "g\u0142\u0119boka rana",
  "+woundmagic": "g\u0142\u0119boka rana",
  "+of_woundpoison": "g\u0142\u0119boka rana",
  "+of_woundmagic": "g\u0142\u0119boka rana",
  "+fastarrow": "szybka strza\u0142a",
  "+swing": "szeroki zamach",
  "+acdmg_destroyed": "pancerz zniszczony",
  "-evade": "unik",
  "-parry": "parowanie",
  "-contra": "kontra",
  "-arrowblock": "blok strza\u0142y"
}));
var PROC_SUB_WORD_BY_KEY = new Map(Object.entries({
  "+woundpoison": "os\u0142abiona",
  "+woundfrost": "os\u0142abiona",
  "+woundmagic": "os\u0142abiona",
  "+of_woundpoison": "os\u0142abiona",
  "+of_woundmagic": "os\u0142abiona"
}));
var CLIENT_LABEL_CHARACTERS_MAXIMUM = 64;
var CLIENT_ID_BY_UNWORDED_KEY = new Map(Object.entries({
  "-tenacity": "msg_-tenacity",
  "+superspell-dispel": "msg_+dispel",
  "+superspell-prevented": "msg_+superspell-prevented"
}));
var DESTROYED_WORD_BY_KEY = new Map(Object.entries({
  acdmg: {
    name: "pancerz",
    unit: "pkt"
  },
  // The one pair here that empties the same pool in the same unit, so the names say which
  // took it rather than what it was (`docs/protocol-keys.md`).
  critpierce: {
    name: "pancerz z przebicia",
    unit: "pkt"
  },
  resdmg: {
    name: "odporno\u015B\u0107",
    unit: "p.p."
  },
  // The element rides after a colon rather than after "na", which the bound decides:
  // `odporność na błyskawice` runs one character past LABEL_CHARACTERS_MAXIMUM above, and
  // a label past it is cut by the column with nothing saying it was cut.
  resdmgf: {
    name: "odporno\u015B\u0107: ogie\u0144",
    unit: "p.p."
  },
  resdmgc: {
    name: "odporno\u015B\u0107: zimno",
    unit: "p.p."
  },
  resdmgl: {
    name: "odporno\u015B\u0107: b\u0142yskawice",
    unit: "p.p."
  },
  // `acdmg` opening this table is one letter away and is armour in points, not this
  // (`docs/protocol-keys.md`).
  actdmg: {
    name: "odporno\u015B\u0107: trucizna",
    unit: "p.p."
  },
  // The article's own words, as the defence line above already draws them — one pool, one
  // spelling on both surfaces (`develop ADR 0077`, **N13**).
  abdest_per: {
    name: "absorpcja",
    unit: "pkt"
  },
  abmdest_per: {
    name: "absorpcja magiczna",
    unit: "pkt"
  }
}));
var PROFESSION_WORD_BY_KEY = new Map(Object.entries({
  w: "Wojownik",
  p: "Paladyn",
  t: "Tropiciel",
  h: "\u0141owca",
  m: "Mag",
  b: "Tancerz ostrzy"
}));
var SIDE_PART_WORDS = {
  reader: SIDE_WORDS.reader,
  opposing: SIDE_WORDS.opposing,
  nobody: null
};
var ELEMENT_WORD_BY_KEY = new Map(Object.entries({
  dmg: "fizyczne",
  dmgd: "dystansowe",
  dmgo: "pomocnicze",
  dmgf: "ogie\u0144",
  dmgc: "zimno",
  dmgl: "b\u0142yskawice",
  dmga: "nieuchronne",
  dmgp: "trucizna",
  thirdatt: "trzeci cios"
}));
var HEALTH_SOURCE_WORD_BY_KEY = new Map(Object.entries({
  heal: "przywracanie \u017Cycia",
  heal_target: "uleczenie wskazanego",
  legbon_holytouch_heal: "dotyk anio\u0142a",
  legbon_lastheal: "ostatni ratunek",
  healall_per: "uleczenie sojusznik\xF3w",
  npc_heal: "regeneracja potwora",
  bandage: "banda\u017Cowanie"
}));
var LEGENDARY_BONUS_WORD_BY_KEY = new Map(Object.entries({
  "+legbon_curse": "Kl\u0105twa",
  "+legbon_verycrit": "Cios bardzo krytyczny",
  "-legbon_cleanse": "P\u0142omienne oczyszczenie",
  "-legbon_glare": "O\u015Blepienie",
  "+legbon_holytouch": "Dotyk anio\u0142a",
  "+legbon_anguish": "Krwawa udr\u0119ka",
  "-legbon_critred": "Krytyczna os\u0142ona",
  legbon_lastheal: "Ostatni ratunek",
  "-legbon_facade": "Fasada opieki",
  "+legbon_puncture": "Przeszywaj\u0105ca skuteczno\u015B\u0107"
}));
var COUNTED_NOUN_WORDS = {
  messages: {
    one: "wiadomo\u015B\u0107",
    few: "wiadomo\u015Bci",
    many: "wiadomo\u015Bci"
  },
  heals: {
    one: "uleczenie",
    few: "uleczenia",
    many: "ulecze\u0144"
  },
  fights: {
    one: "walka",
    few: "walki",
    many: "walk"
  },
  combatants: {
    one: "posta\u0107",
    few: "postacie",
    many: "postaci"
  },
  turns: {
    one: "tura",
    few: "tury",
    many: "tur"
  }
};
var HEALTH_LOSS_WORD_BY_KEY = new Map(Object.entries({
  poison: "zatrucie",
  fire: "podpalenie",
  light: "pora\u017Cenie",
  injure: "zranienie",
  wound: "g\u0142\u0119boka rana",
  anguish: "krwawienie",
  heal: "ujemne przywracanie \u017Cycia"
}));
var TEEN_FLOOR = 12;
var TEEN_CEILING = 14;
var FEW_FLOOR = 2;
var FEW_CEILING = 4;
var TEN = 10;
var HUNDRED = 100;
var HELPER_WORDS = {
  title: "Pomocnik",
  collapse: "Zwi\u0144 Pomocnika",
  expand: "Rozwi\u0144 Pomocnika",
  now: "Teraz",
  nothingHappens: "Nic si\u0119 nie dzieje.",
  /** The two shouts share one state, so they share one heading — `develop ADR 0062`. */
  provocation: "Prowokacja",
  /**
     * Between whoever is holding somebody and the shout they hold them with — `develop ADR 0097`.
     */
  castSeparator: "\xB7",
  /**
     * What a card in this window states a length under, a charge's and a shout's alike: the turns
     * left, as the game writes a charge's (ADR 0040). Never `CARD_WORDS.turns`: that one names the
     * turns a combatant took and carries the caveat that the game publishes none of them.
     */
  turnsLeft: "Zosta\u0142o",
  /** The game's own name for it, the client's label on `DHSqC3Uh` (ADR 0038, **L2**). */
  chargedSkill: "Cios specjalny"
};
var TOOLTIP_WORDS = {
  /**
     * ⚠️ **Two skills put a fighter here, so the row names the state and never either of them.**
     * `Wyzywający okrzyk` and `Prowokujący okrzyk` announce the one key — 118 casts against 48 over
     * `captures/`, 2026-09-22 — so a row reading `Wyzwany` named one of the two while the
     * state had come from either.
     */
  provokedBy: "Sprowokowany przez",
  provokedCount: "Prowokuje",
  /** The bonus fires once a fight, so this is a state and never a count. */
  spent: "wykorzystany",
  turnsTaken: CARD_WORDS.turns
};
var STATUS_CATEGORY = "buff";
var ADD_ON_NAME = PANEL_WORDS.title;
var LEADING_STATUS_NAMES = [
  SLOW_BIT_NAME,
  HASTE_BIT_NAME
];
var MARKUP_OPENER = "<";
var MARKUP_ENTITY = "&";
var ROWS_BESIDE_THE_STATUSES = 6;
var CHARGED_SKILL_WORDS = {
  charging: "",
  struck: "wykonane",
  broken: "przerwane"
};
var TURN_STATE_WORDS = {
  held: "",
  unread: "Nie wiadomo, czyja tura.",
  afterFight: "Walka si\u0119 sko\u0144czy\u0142a.",
  onAuto: "Szybka walka \u2014 gra nie podaje tur."
};
var HELPER_ABSENCE_WORDS = {
  noFightYet: PANEL_WORDS.noFightYet,
  betweenFights: HELPER_WORDS.nothingHappens,
  fightUnread: PANEL_WORDS.fightUnread
};
var STORAGE_WORDS = {
  local: "na sta\u0142e",
  session: "do zamkni\u0119cia karty",
  memory: "tylko teraz"
};
var STORAGE_MEANING_WORDS = {
  local: "Zostaj\u0105 te\u017C po zamkni\u0119ciu przegl\u0105darki.",
  session: "Przetrwaj\u0105 od\u015Bwie\u017Cenie strony, znikn\u0105 z zamkni\u0119ciem karty.",
  memory: "Znikn\u0105 przy od\u015Bwie\u017Ceniu strony."
};
var WINDOW_WORDS = {
  meter: "Licznik",
  helper: HELPER_WORDS.title
};
var TYPE_STEP_WORDS = {
  small: "ma\u0142y",
  medium: "\u015Bredni",
  large: "du\u017Cy"
};
var STORE_REFUSED_ANSWER = "Przegl\u0105darka nie przyj\u0119\u0142a tej walki \u2014 nie zosta\u0142a zapisana. Odepnij kt\xF3r\u0105\u015B, \u017Ceby zrobi\u0107 miejsce.";
var STORE_MADE_ROOM_ANSWER = "Zabrak\u0142o miejsca w przegl\u0105darce \u2014 najstarsze walki zosta\u0142y usuni\u0119te, \u017Ceby zmie\u015Bci\u0107 t\u0119. Przypnij te, kt\xF3re chcesz zachowa\u0107.";
var EVERY_SLOT_PINNED_ANSWER = "Wszystkie miejsca s\u0105 zaj\u0119te przez przypi\u0119te walki \u2014 ta si\u0119 nie zapisa\u0142a.";
var CHOICE_REFUSED_ANSWER = "Przegl\u0105darka nie zapisa\u0142a tego wyboru \u2014 zostaje tak, jak by\u0142o.";
var MOVE_REFUSED_ANSWER = "Wybrane miejsce nie przyj\u0119\u0142o zapisanych walk \u2014 zosta\u0142y tam, gdzie by\u0142y.";
var PIN_REFUSED_ANSWER = "Przegl\u0105darka nie zapisa\u0142a przypi\u0119cia.";
var FIGHT_CARD_WORDS = {
  when: "Kiedy",
  world: "\u015Awiat",
  character: "Posta\u0107",
  profession: "Profesja"
};
var LIVE_FIGHT_WORDS = {
  time: "teraz",
  outcome: "trwa"
};
var TWO_DIGITS = 2;
var MONTH_FIRST = 1;
var DAY_MINIMUM = 1;
var DAY_MAXIMUM2 = 31;
var HOUR_MAXIMUM2 = 23;
var MINUTE_MAXIMUM2 = 59;
var MONTH_WORDS = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "pa\u017A",
  "lis",
  "gru"
];
var MINUS_SIGN = "-";
var THOUSAND_DIGITS = 3;
var THOUSAND_SEPARATOR = "\xA0";
var THOUSAND_GROUPS_MAXIMUM = 5;
var NAMED_ROWS_MAXIMUM = 3;
var REGION_WORDS = {
  header: "nag\u0142\xF3wka",
  strips: "zak\u0142adek",
  crumb: "\u015Bcie\u017Cki",
  list: "listy",
  pinned: "wiersza",
  sides: "podsumowania stron",
  outside: "tego, co zosta\u0142o poza rankingiem",
  suspicions: "ostrze\u017Cenia",
  defects: "spisu usterek",
  card: "szczeg\xF3\u0142\xF3w wiersza",
  [PANEL_REGION.helper]: "pomocnika"
};
var DEFECT_WORDS = {
  kept: "Panel nie odczyta\u0142 tego, co mia\u0142 zapisane",
  keeping: "Panel nie zapisa\u0142 tej walki",
  // Said in the past: a panel that is being read got onto the page in the end, and one that
  // never did is not there to say anything at all.
  mount: "Panel nie od razu stan\u0105\u0142 na stronie",
  region: "Panel nie narysowa\u0142 jednej ze swoich cz\u0119\u015Bci",
  reading: "Panel nie przeliczy\u0142 tej walki",
  figures: "Liczby w panelu nie zgadzaj\u0105 si\u0119 ze sob\u0105",
  gesture: "Panel nie zareagowa\u0142 na mysz",
  file: "Panel nie przygotowa\u0142 pliku z walk\u0105",
  // A panel waiting for a game says what it cannot see.
  engine: "Nie wida\u0107 walki w grze"
};
var SHARE_FLOOR = "<1%";
var SHARES_MAXIMUM = 384;
var NOBODY_TO_PAY = {
  index: 0,
  amount: 0,
  points: 0,
  remainder: 0
};
function getWordsForOutcome(outcome) {
  const words = OUTCOME_WORDS[outcome];
  return words;
}
function getWordsForNothing(metric) {
  const words = NOTHING_WORDS[metric];
  return words;
}
function getWordsForUnannounced(metric) {
  const words = UNANNOUNCED_WORDS[metric];
  return words;
}
function getWordsForNoun(noun) {
  const words = NOUN_WORDS[noun];
  return words;
}
function getDirectionWordsForMetric(metric) {
  const words = DIRECTION_WORDS[metric];
  return words;
}
function getWordsForSide(choice) {
  const words = SIDE_WORDS[choice];
  return words;
}
function getWordsForCardMetric(metric) {
  const words = CARD_METRIC_WORDS[metric];
  return words;
}
function getNoteForUnnamedEnd(end, noun) {
  const words = UNNAMED_END_NOTES[end][noun];
  return words;
}
function getNoteForOpenedUnnamedStanding(metric) {
  const words = OPENED_UNNAMED_STANDING_NOTES[metric];
  return words;
}
function getNoteForNoKind(noun) {
  const words = NO_KIND_NOTES[noun];
  return words;
}
function getCaveatForUnannounced(noun) {
  return UNANNOUNCED_CAVEATS[noun];
}
function getCaveatForKind(kind) {
  if (!kind.includes(KIND_ELEMENTS_SEPARATOR)) return null;
  return CAVEAT.undivided;
}
function getWordsForPinnedStanding(pinnedCase) {
  const words = PINNED_PLACING_NOTES[pinnedCase];
  return words;
}
function getWordsForPinnedScope(pinnedCase) {
  const words = PINNED_SCOPE_NOTES[pinnedCase];
  return words;
}
function getNoteForCaveat(caveat) {
  const words = CAVEAT_NOTES[caveat];
  return words;
}
function getWordsForBlowKey(key, translate) {
  const words = PROC_WORD_BY_KEY.get(key) ?? DEFENCE_WORD_BY_KEY.get(key);
  if (words !== void 0) {
    return words;
  }
  const stated = getMargonemClientWordsForKey(key, translate);
  if (stated !== null) return stated;
  return key;
}
function getMargonemClientWordsForKey(key, translate) {
  if (translate === null) return null;
  const id = CLIENT_ID_BY_UNWORDED_KEY.get(key);
  if (id === void 0) return null;
  const label = translate(id);
  if (label === null) return null;
  if (label.length > CLIENT_LABEL_CHARACTERS_MAXIMUM) return null;
  if (label.length === 0) return null;
  return label;
}
function getWordsForLegendaryBonus(key) {
  return LEGENDARY_BONUS_WORD_BY_KEY.get(key) ?? key;
}
function getSubWordsForBlowKey(key) {
  return PROC_SUB_WORD_BY_KEY.get(key) ?? "";
}
function getWordsForDestroyed(statistic) {
  const word = DESTROYED_WORD_BY_KEY.get(statistic);
  if (word === void 0) return statistic;
  return word.name;
}
function formatDestroyed(statistic, figure) {
  const stated = formatFigure(figure);
  const word = DESTROYED_WORD_BY_KEY.get(statistic);
  if (word === void 0) return stated;
  return `${stated} ${word.unit}`;
}
function getWordsForProfession(profession) {
  const words = PROFESSION_WORD_BY_KEY.get(profession);
  if (words === void 0) return profession;
  return words;
}
function formatCardSubtitle(profession, level, sideRelation) {
  const said = [];
  if (profession !== null) said.push(getWordsForProfession(profession));
  if (isLevelStated(level)) said.push(`(${formatWholeUngrouped(level)})`);
  const stated = said.join(" ");
  const side = SIDE_PART_WORDS[sideRelation];
  if (side === null) return stated.length === 0 ? null : stated;
  return stated.length === 0 ? side : `${stated} \xB7 ${side}`;
}
function isLevelStated(level) {
  if (level === null) return false;
  if (!Number.isSafeInteger(level)) return false;
  return level > 0;
}
function getWordsForHealthSource(source) {
  const words = HEALTH_SOURCE_WORD_BY_KEY.get(source);
  if (words === void 0) return source;
  return words;
}
function formatDamageKind(kind) {
  const words = ELEMENT_WORD_BY_KEY.get(kind) ?? HEALTH_LOSS_WORD_BY_KEY.get(kind);
  if (words !== void 0) return words;
  if (!kind.includes(KIND_ELEMENTS_SEPARATOR)) return kind;
  const elementWords = kind.split(KIND_ELEMENTS_SEPARATOR).map((element) => {
    return ELEMENT_WORD_BY_KEY.get(element) ?? element;
  });
  const leadingWords = elementWords.slice(0, -1).join(", ");
  const lastWord = elementWords[elementWords.length - 1] ?? "";
  return `${leadingWords} ${PANEL_WORDS.eitherKind} ${lastWord}`;
}
function formatCountedNoun(count, noun) {
  if (!Number.isSafeInteger(count)) return `${PANEL_WORDS.unknownHowMany} ${noun.many}`;
  if (count < 0) return `${PANEL_WORDS.unknownHowMany} ${noun.many}`;
  if (count === 1) return `1 ${noun.one}`;
  const lastTwo = count % HUNDRED;
  const lastDigit = count % TEN;
  if (lastTwo >= TEEN_FLOOR) {
    if (lastTwo <= TEEN_CEILING) return `${count} ${noun.many}`;
  }
  if (lastDigit >= FEW_FLOOR) {
    if (lastDigit <= FEW_CEILING) return `${count} ${noun.few}`;
  }
  return `${count} ${noun.many}`;
}
function presentTooltipRows(tooltip, translate, statusBits) {
  const rowsMaximum = statusBits.length + ROWS_BESIDE_THE_STATUSES;
  const said = [];
  {
    if (!tooltip.hasJoinedInProgress) {
      if (tooltip.turnsTaken > 0) {
        said.push(`${TOOLTIP_WORDS.turnsTaken}: ${formatFigure(tooltip.turnsTaken)}`);
      }
    }
  }
  {
    const given = tooltip.holytouchHealsReceived;
    if (tooltip.hasSpentLastheal) {
      const lastheal = getWordsForLegendaryBonus(LASTHEAL_KEY);
      said.push(`${lastheal}: ${TOOLTIP_WORDS.spent}`);
    }
    if (given !== null) {
      const heals = formatTooltipFraction(given, HOLYTOUCH_HEALS_STATED);
      const holytouch = getWordsForLegendaryBonus(HOLYTOUCH_DECLARATION_KEY);
      said.push(`${holytouch}: ${heals}`);
    }
  }
  {
    if (tooltip.provokedCount > 0) {
      const counted = formatCountedNoun(tooltip.provokedCount, COUNTED_NOUN_WORDS.combatants);
      said.push(`${TOOLTIP_WORDS.provokedCount}: ${counted}`);
    }
    const provoker = tooltip.provokedBy;
    if (provoker !== null) {
      const left = formatTurnsLeft(provoker.turnsElapsed, provoker.turnsStated);
      said.push(`${TOOLTIP_WORDS.provokedBy}: ${provoker.name} (${left})`);
    }
  }
  const words = {
    translate,
    statusBits,
    rowsMaximum
  };
  addStatusRows(said, getLeadingStatuses(tooltip.statuses, statusBits), words);
  addStatusRows(said, getTrailingStatuses(tooltip.statuses, statusBits), words);
  const kept = said.filter((row) => !doesRowCarryMarkup(row));
  if (kept.length === 0) return [];
  return [
    ADD_ON_NAME,
    ...kept
  ].slice(0, rowsMaximum);
}
function formatTooltipFraction(figure, stated) {
  if (!Number.isSafeInteger(figure)) return PANEL_WORDS.unknown;
  if (!Number.isSafeInteger(stated)) return PANEL_WORDS.unknown;
  if (figure < 0) return PANEL_WORDS.unknown;
  if (stated < figure) return PANEL_WORDS.unknown;
  return `${formatWholeUngrouped(figure)}/${formatWholeUngrouped(stated)}`;
}
function addStatusRows(said, statuses, words) {
  for (const status of statuses) {
    if (said.length >= words.rowsMaximum) break;
    const word = getWordsForStatusBit(status.bit, words.translate, words.statusBits);
    const percent = status.percent === null ? "" : `: ${formatWholeUngrouped(status.percent)}%`;
    said.push(`${word}${percent}`);
  }
}
function getLeadingStatuses(statuses, statusBits) {
  const leading = [];
  for (const name of LEADING_STATUS_NAMES) {
    for (const status of statuses) {
      if (statusBits[status.bit] === name) leading.push(status);
    }
  }
  return leading;
}
function getTrailingStatuses(statuses, statusBits) {
  return statuses.filter((status) => {
    const name = statusBits[status.bit];
    if (name === void 0) return false;
    return !LEADING_STATUS_NAMES.includes(name);
  });
}
function doesRowCarryMarkup(row) {
  if (row.includes(MARKUP_OPENER)) return true;
  return row.includes(MARKUP_ENTITY);
}
function getWordsForStatusBit(bit, translate, statusBits) {
  const key = statusBits[bit];
  if (key === void 0) return PANEL_WORDS.unknown;
  if (translate === null) return key;
  const said = translate(key, STATUS_CATEGORY);
  if (said === null) return key;
  if (said.length === 0) return key;
  if (said.length > CLIENT_LABEL_CHARACTERS_MAXIMUM) return key;
  if (doesRowCarryMarkup(said)) return key;
  return said;
}
function formatTurnsLeft(turnsElapsed, turnsStated) {
  if (!Number.isSafeInteger(turnsElapsed)) return PANEL_WORDS.unknown;
  if (!Number.isSafeInteger(turnsStated)) return PANEL_WORDS.unknown;
  if (turnsElapsed < 0) return PANEL_WORDS.unknown;
  if (turnsStated < turnsElapsed) return PANEL_WORDS.unknown;
  return formatCountedNoun(turnsStated - turnsElapsed, COUNTED_NOUN_WORDS.turns);
}
function getWordsForChargedSkill(state) {
  const words = CHARGED_SKILL_WORDS[state];
  return words;
}
function formatChargedSkillSubtitle(name, state) {
  const said = getWordsForChargedSkill(state);
  if (said.length === 0) return name;
  return `${name} ${HELPER_WORDS.castSeparator} ${said}`;
}
function getWordsForTurnState(state) {
  const words = TURN_STATE_WORDS[state];
  return words;
}
function getWordsForHelperAbsence(absence) {
  const words = HELPER_ABSENCE_WORDS[absence];
  return words;
}
function formatTurnOrdinal(ordinal) {
  if (!Number.isSafeInteger(ordinal)) return PANEL_WORDS.unknown;
  if (ordinal < 0) return PANEL_WORDS.unknown;
  return `tura ${formatWholeUngrouped(ordinal)}`;
}
function getWordsForPin(isPinned) {
  if (isPinned) return "Odepnij \u2014 b\u0119dzie mog\u0142a znikn\u0105\u0107";
  return "Przypnij, \u017Ceby nie znikn\u0119\u0142a";
}
function getWordsForStorage(choice) {
  const words = STORAGE_WORDS[choice];
  return words;
}
function getWordsForStorageMeaning(choice) {
  const words = STORAGE_MEANING_WORDS[choice];
  return words;
}
function getWordsForWindow(window2) {
  const words = WINDOW_WORDS[window2];
  return words;
}
function getWordsForTypeStep(step) {
  const words = TYPE_STEP_WORDS[step];
  return words;
}
function formatKeptUnread(moment, place) {
  const parts = [
    formatShelfTime(moment, false),
    place ?? ""
  ];
  return parts.filter((phrase) => phrase.length > 0).join(" \xB7 ");
}
function formatShelfTime(moment, isLive) {
  if (isLive) return LIVE_FIGHT_WORDS.time;
  if (moment === null) return "";
  if (moment.hour > HOUR_MAXIMUM2) return "";
  if (moment.minute > MINUTE_MAXIMUM2) return "";
  if (moment.day < DAY_MINIMUM) return "";
  if (moment.day > DAY_MAXIMUM2) return "";
  const month = MONTH_WORDS[moment.month - MONTH_FIRST];
  if (month === void 0) return "";
  const day = formatTwoDigits(moment.day);
  if (day === "") return "";
  const hour = formatTwoDigits(moment.hour);
  if (hour === "") return "";
  const minute = formatTwoDigits(moment.minute);
  if (minute === "") return "";
  return `${day} ${month} ${hour}:${minute}`;
}
function formatTwoDigits(momentPart) {
  if (!Number.isSafeInteger(momentPart)) return "";
  if (momentPart < 0) return "";
  return formatWholeUngrouped(momentPart).padStart(TWO_DIGITS, "0");
}
function formatShelfSize(counts) {
  const countsStated = counts.filter((count) => count > 0);
  if (countsStated.length === 0) return "";
  return countsStated.map((count) => formatFigure(count)).join("\xD7");
}
function getWordsForShelfOutcome(outcome, isLive) {
  if (outcome !== null) return getWordsForOutcome(outcome);
  if (isLive) return LIVE_FIGHT_WORDS.outcome;
  return "";
}
function getLetterForShelfOutcome(outcome) {
  const letter = OUTCOME_LETTERS[outcome];
  return letter;
}
function formatUses(uses) {
  if (uses < 0) return PANEL_WORDS.unknown;
  return `\xD7${formatFigure(uses)}`;
}
function formatNamesReachedByGap(names, charged) {
  if (charged <= 0) return "";
  if (names.length === charged) {
    if (charged <= NAMED_ROWS_MAXIMUM) return ` (${names.join(", ")})`;
  }
  return ` (dotyczy ${formatGenitiveNoun(charged, COUNTED_NOUN_WORDS.combatants)})`;
}
function formatGenitiveNoun(count, noun) {
  return `${formatWholeUngrouped(count)} ${noun.many}`;
}
function formatUnknownKeySuspicion(count, stated, whom) {
  if (count <= 0) return "";
  const said = formatOutOf(count, stated, COUNTED_NOUN_WORDS.messages);
  return `Nie wiadomo, co znaczy\u0142a cz\u0119\u015B\u0107 tego, co powiedzia\u0142a gra \u2014 ${said} bez odczytu${whom}, wi\u0119c liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatOutOf(count, stated, noun) {
  if (stated <= 1) return formatCountedNoun(count, noun);
  if (stated < count) return formatCountedNoun(count, noun);
  return `${formatWholeUngrouped(count)} z ${formatGenitiveNoun(stated, noun)}`;
}
function formatNoParameterSuspicion(count, stated, whom) {
  if (count <= 0) return "";
  const said = formatOutOf(count, stated, COUNTED_NOUN_WORDS.messages);
  return `Cz\u0119\u015B\u0107 tego, co powiedzia\u0142a gra, nie nios\u0142a \u017Cadnej liczby \u2014 ${said} bez odczytu${whom}, wi\u0119c liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatGrammarRefusedSuspicion(count, stated) {
  if (count <= 0) return "";
  const said = formatOutOf(count, stated, COUNTED_NOUN_WORDS.messages);
  return `Cz\u0119\u015Bci tego, co powiedzia\u0142a gra, nie da\u0142o si\u0119 roz\u0142o\u017Cy\u0107 na s\u0142owa \u2014 ${said} bez odczytu, wi\u0119c liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatLostMessageSuspicion(count, stated) {
  if (count <= 0) return "";
  const said = formatOutOf(count, stated, COUNTED_NOUN_WORDS.messages);
  return `Cz\u0119\u015B\u0107 walki nie dotar\u0142a do panelu \u2014 ${said} bez odbioru, wi\u0119c wszystkie liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatJoinedInProgressSuspicion() {
  return "Panel zacz\u0105\u0142 czyta\u0107 t\u0119 walk\u0119 ju\u017C w trakcie \u2014 nie widzia\u0142 jej pocz\u0105tku, wi\u0119c wszystkie liczby mog\u0105 by\u0107 zani\u017Cone.";
}
function formatUnplacedHealSuspicion(count, stated, whom) {
  if (count <= 0) return "";
  const said = formatOutOf(count, stated, COUNTED_NOUN_WORDS.heals);
  return `Nie da si\u0119 rozdzieli\u0107 leczenia dru\u017Cyny \u2014 ${said} bez podzia\u0142u${whom}, wi\u0119c leczenie mo\u017Ce by\u0107 zani\u017Cone.`;
}
function formatUnknownKeyRowSuspicion(count) {
  if (count <= 0) return "";
  const said = formatCountedNoun(count, COUNTED_NOUN_WORDS.messages);
  return `Nie wiadomo, co znaczy\u0142a cz\u0119\u015B\u0107 tego, co gra powiedzia\u0142a z jej udzia\u0142em \u2014 ${said} bez odczytu, wi\u0119c jej liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatNoParameterRowSuspicion(count) {
  if (count <= 0) return "";
  const said = formatCountedNoun(count, COUNTED_NOUN_WORDS.messages);
  return `Cz\u0119\u015B\u0107 tego, co gra powiedzia\u0142a z jej udzia\u0142em, nie nios\u0142a \u017Cadnej liczby \u2014 ${said} bez odczytu, wi\u0119c jej liczby mog\u0105 by\u0107 zani\u017Cone.`;
}
function formatUnplacedHealRowSuspicion(count) {
  if (count <= 0) return "";
  const said = formatCountedNoun(count, COUNTED_NOUN_WORDS.heals);
  return `Nie da si\u0119 rozdzieli\u0107 jej leczenia dru\u017Cyny \u2014 ${said} bez podzia\u0142u, wi\u0119c jej leczenie mo\u017Ce by\u0107 zani\u017Cone.`;
}
function formatUndrawn(region) {
  return `Nie uda\u0142o si\u0119 narysowa\u0107 ${REGION_WORDS[region]}.`;
}
function formatWholeUngrouped(wholeNumber) {
  if (Number.isSafeInteger(wholeNumber)) return formatInteger(wholeNumber);
  if (!Number.isFinite(wholeNumber)) return PANEL_WORDS.unknown;
  const rounded = Math.round(wholeNumber);
  if (!Number.isSafeInteger(rounded)) return PANEL_WORDS.unknown;
  return formatInteger(rounded);
}
function formatDefect(kind, region, count) {
  let said;
  if (kind === PANEL_DEFECT_KIND.region) {
    said = region === null ? DEFECT_WORDS[kind] : `Panel nie narysowa\u0142 ${REGION_WORDS[region]}`;
  } else {
    said = DEFECT_WORDS[kind];
  }
  if (!Number.isSafeInteger(count)) return `${said}.`;
  if (count <= 1) return `${said}.`;
  return `${said} (${formatWholeUngrouped(count)}\xD7).`;
}
function formatSideCounts(sizes, unplaced) {
  const counts = sizes.filter((size) => size > 0);
  if (counts.length === 0) return PANEL_WORDS.noSides;
  const counted = counts.map((count) => formatFigure(count)).join(" vs ");
  if (unplaced <= 0) return counted;
  return `${counted} +${formatFigure(unplaced)}`;
}
function formatTurns(taken, lost) {
  const divider = `${THOUSAND_SEPARATOR}/${THOUSAND_SEPARATOR}`;
  return `${formatFigure(taken)}${divider}${formatFigure(lost)}`;
}
function formatFigure(figure) {
  const rounded = Math.round(figure);
  if (!Number.isSafeInteger(rounded)) return PANEL_WORDS.unknown;
  const digits = formatWholeUngrouped(rounded);
  const sign = digits.startsWith(MINUS_SIGN) ? MINUS_SIGN : "";
  const body = digits.slice(sign.length);
  let spaced = "";
  let start = body.length;
  for (let group = 0; group < THOUSAND_GROUPS_MAXIMUM; group += 1) {
    if (start <= THOUSAND_DIGITS) break;
    const from = start - THOUSAND_DIGITS;
    spaced = `${THOUSAND_SEPARATOR}${body.slice(from, start)}${spaced}`;
    start = from;
  }
  return `${sign}${body.slice(0, start)}${spaced}`;
}
function formatSharesApportioned(amounts, whole) {
  if (!Number.isFinite(whole)) return amounts.map(() => formatSharePoints(0, false));
  if (whole <= 0) return amounts.map(() => formatSharePoints(0, false));
  const shares = composeSharesInPoints(amounts.slice(0, SHARES_MAXIMUM), whole);
  const pointsPaid = shares.reduce((sum, share) => sum + share.points, 0);
  const exact = shares.reduce((sum, share) => sum + share.points + share.remainder, 0);
  let left = Math.round(exact) - pointsPaid;
  const unpaid = [];
  for (const group of composeShareGroups(shares)) {
    if (group.length > left) {
      unpaid.push(group);
      continue;
    }
    for (const share of group) share.points += 1;
    left -= group.length;
  }
  for (const group of unpaid) {
    for (const share of group) {
      if (left <= 0) break;
      share.points += 1;
      left -= 1;
    }
  }
  return shares.map((share) => formatSharePoints(share.points, share.amount > 0));
}
function formatSharePoints(points, isPresent) {
  if (!Number.isSafeInteger(points)) return PANEL_WORDS.unknown;
  if (points < 0) return PANEL_WORDS.unknown;
  if (points === 0) {
    if (isPresent) return SHARE_FLOOR;
  }
  return `${formatWholeUngrouped(points)}%`;
}
function composeSharesInPoints(amounts, whole) {
  return amounts.map((amount, index) => {
    const exact = amount / whole * HUNDRED;
    const points = Math.floor(exact);
    return {
      index,
      amount,
      points,
      remainder: exact - points
    };
  });
}
function composeShareGroups(shares) {
  const byAmount = /* @__PURE__ */ new Map();
  for (const share of shares) {
    if (share.remainder <= 0) continue;
    const group = byAmount.get(share.amount);
    if (group === void 0) byAmount.set(share.amount, [
      share
    ]);
    else group.push(share);
  }
  const groups = [
    ...byAmount.values()
  ];
  groups.sort((leftGroup, rightGroup) => {
    const leftHead = getShareGroupHead(leftGroup);
    const rightHead = getShareGroupHead(rightGroup);
    if (leftHead.remainder !== rightHead.remainder) {
      return rightHead.remainder - leftHead.remainder;
    }
    return leftHead.index - rightHead.index;
  });
  return groups;
}
function getShareGroupHead(group) {
  return group[0] ?? NOBODY_TO_PAY;
}
function formatShareRounded(share) {
  if (!Number.isFinite(share)) return PANEL_WORDS.unknown;
  const clamped = clampNumber(share, 0, 1);
  return formatSharePoints(Math.round(clamped * HUNDRED), clamped > 0);
}
function formatPlace(mapName, x, y) {
  const words = formatPlaceWords(mapName, x, y);
  if (words === null) return null;
  if (words.name === null) return words.tile;
  if (words.tile === null) return words.name;
  return `${words.name} ${words.tile}`;
}
function formatPlaceWords(mapName, x, y) {
  let name;
  if (mapName === null) {
    name = null;
  } else {
    name = mapName.length > 0 ? mapName : null;
  }
  let tile;
  if (x === null) {
    tile = null;
  } else if (y === null) {
    tile = null;
  } else {
    tile = `(${formatWholeUngrouped(x)}, ${formatWholeUngrouped(y)})`;
  }
  if (name === null) {
    if (tile === null) return null;
  }
  return {
    name,
    tile
  };
}

// src/runtime/defect-ledger.ts
var DEFECT_KIND = {
  kept: "kept",
  keeping: "keeping",
  mount: "mount",
  region: "region",
  reading: "reading",
  figures: "figures",
  gesture: "gesture",
  file: "file",
  engine: "engine"
};
var COUNT_MAXIMUM = 1048576;
var KINDS_COUNT = Object.values(DEFECT_KIND).length;
var ROWS_MAXIMUM = KINDS_COUNT * (Object.values(PANEL_REGION).length + 1);
function initDefectLedger(options) {
  const countsByRowKey = /* @__PURE__ */ new Map();
  const kindsWritten = /* @__PURE__ */ new Set();
  return {
    add(defect) {
      const rowKey = defect.region === null ? defect.kind : `${defect.kind}/${defect.region}`;
      const defectCount = countsByRowKey.get(rowKey);
      if (defectCount !== void 0) {
        if (defectCount.count < COUNT_MAXIMUM) defectCount.count += 1;
        return;
      }
      const { kind, region, failure } = defect;
      countsByRowKey.set(rowKey, {
        kind,
        region,
        count: 1,
        first: failure
      });
      assert(countsByRowKey.size <= ROWS_MAXIMUM, "a ledger holds a row per kind and region at most");
      if (kindsWritten.has(kind)) return;
      kindsWritten.add(kind);
      options.console.writeBrandedLine(kind, failure);
    },
    getCounts() {
      const rows = [
        ...countsByRowKey.values()
      ].map((defectCount) => ({
        ...defectCount
      }));
      assert(rows.length <= ROWS_MAXIMUM, "and states no more rows than it holds");
      return rows;
    }
  };
}

// libs/json-text.ts
var JsonUnreadable = class extends Error {
  name = "JsonUnreadable";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
var JsonUnwritable = class extends Error {
  name = "JsonUnwritable";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
var INDENT_SPACES_MAXIMUM = 10;
function parseJson(text) {
  const parsed = attempt(() => {
    const parsedText = JSON.parse(text);
    if (parsedText === null) return parsedText;
    if (typeof parsedText === "boolean") return parsedText;
    if (typeof parsedText === "number") return parsedText;
    if (typeof parsedText === "string") return parsedText;
    if (Array.isArray(parsedText)) return parsedText;
    assert(isRecord(parsedText), "JSON text parses into a value JSON has");
    return parsedText;
  });
  if (parsed instanceof Caught) return new JsonUnreadable(parsed);
  assert(text.length > 0, "text that parsed says something");
  return parsed;
}
function encodeJson(encodable, indentSpaces) {
  assert(Number.isSafeInteger(indentSpaces), "text is indented by a whole count of spaces");
  assert(indentSpaces >= 0, "of none or more");
  assert(indentSpaces <= INDENT_SPACES_MAXIMUM, "and no more than the platform writes");
  const written = attempt(() => JSON.stringify(encodable, null, indentSpaces));
  if (written instanceof Caught) return new JsonUnwritable(written);
  if (written === void 0) return new JsonUnwritable(null);
  assert(written.length > 0, "a value written as text says something");
  return written;
}

// src/runtime/fight-file.ts
var FileUnserializable = class extends Error {
  name = "FileUnserializable";
  constructor(cause) {
    super(void 0, {
      cause
    });
  }
};
var REPORT_KEY_BY_ROW_FIELD = {
  sideHealsUnsized: "castsUnplaced",
  healthRestoredByNobodyByKey: "healthRestoredByNobodyBySource",
  healthRestoredByKey: "healthRestoredBySource",
  healthRestoredWithoutSkillByKey: "healthRestoredWithoutSkillBySource",
  damageTakenWithoutSkillByKey: "damageTakenWithoutSkillBySource",
  damageDealtWithoutSkillByKey: "damageDealtWithoutSkillBySource",
  damageDealtWithoutSkillByOpponentAndKey: "damageDealtWithoutSkillByOpponentAndSource",
  healthGivenWithoutSkillByReceiverAndKey: "healthGivenWithoutSkillByReceiverAndSource"
};
var REPORT_KEY_BY_SKILL_FIELD = {
  damageDealt: "dealt",
  damageDealtByOpponent: "dealtByOpponent",
  healthGiven: "restored",
  healthGivenByReceiver: "restoredByOpponent"
};
var REPORT_KEY_BY_FIGHT_FIELD = {
  damageDealtByNobody: "dealtByNobody",
  damageTakenByNobody: "takenByNobody",
  healthGivenByNobody: "givenByNobody",
  healthRestoredToNobody: "restoredToNobody",
  damageByNeitherEnd: "byNeitherEnd",
  sideHealsUnsized: "castsUnplaced",
  sideHealsStated: "castsStated"
};
var FILE_FORMAT_VERSION = 4;
var FILE_FIELD = {
  formatVersion: "formatVersion",
  addOnVersion: "addOnVersion",
  capturedAt: "capturedAt",
  world: "world",
  margonemClientBuild: "gameBuild",
  userAgent: "userAgent",
  report: "report",
  droppedCalls: "droppedCalls",
  isTruncated: "isTruncated",
  calls: "calls",
  index: "index",
  payload: "payload",
  messages: "messages",
  combatantsBefore: "combatantsBefore",
  combatantsAfter: "combatantsAfter"
};
var INDENT_SPACES = 2;
var NOTHING_STATED = "none";
function encodeFightFile(calls, subject, surroundings) {
  assert(surroundings.world.length > 0, "a recording names the world it was taken on");
  assert(surroundings.capturedAt.length > 0, "and the moment it was taken at");
  assert(surroundings.margonemClientBuild !== "", "a build it could not read is absent, never empty");
  assert(surroundings.userAgent !== "", "and so is a browser that said nothing of itself");
  if (calls.droppedCalls !== null) {
    assert(calls.droppedCalls >= 0, "a recording drops no fewer calls than none");
  }
  const written = encodeJson({
    [FILE_FIELD.formatVersion]: FILE_FORMAT_VERSION,
    [FILE_FIELD.addOnVersion]: surroundings.addOnVersion,
    [FILE_FIELD.capturedAt]: surroundings.capturedAt,
    [FILE_FIELD.world]: surroundings.world,
    [FILE_FIELD.margonemClientBuild]: surroundings.margonemClientBuild,
    [FILE_FIELD.userAgent]: surroundings.userAgent,
    // Above the calls, which run to hundreds of kilobytes.
    [FILE_FIELD.report]: subject === null ? null : encodeFightReport(subject),
    [FILE_FIELD.droppedCalls]: calls.droppedCalls,
    [FILE_FIELD.isTruncated]: calls.isTruncated,
    [FILE_FIELD.calls]: calls.calls.map((call) => ({
      [FILE_FIELD.index]: call.index,
      [FILE_FIELD.payload]: call.payload,
      [FILE_FIELD.messages]: call.messages,
      [FILE_FIELD.combatantsBefore]: call.combatantsBefore,
      [FILE_FIELD.combatantsAfter]: call.combatantsAfter
    }))
  }, INDENT_SPACES);
  if (written instanceof Error) return new FileUnserializable(written);
  return {
    name: encodeFightFileName(surroundings),
    text: written
  };
}
function encodeFightFileName(surroundings) {
  assert(surroundings.addOnVersion.length > 0, "a file is named for the build that wrote it");
  const momentForName = surroundings.capturedAt.replaceAll(":", "-").replaceAll(".", "-");
  assert(!momentForName.includes(":"), "and for a moment no file system objects to");
  assert(!momentForName.includes("."), "nor one a file's own extension could be read out of");
  const build = surroundings.margonemClientBuild ?? NOTHING_STATED;
  const { world, addOnVersion } = surroundings;
  return `margometer-${world}-${build}-${addOnVersion}-${momentForName}.json`;
}
function encodeFightReport(subject) {
  assert(subject.payloadsApplied > 0, "a fight written into a report was built from something");
  assert(subject.messagesLost >= 0, "and lost no fewer than none of what it was handed");
  const statistics = subject.statistics;
  return {
    payloads: subject.payloadsApplied,
    isOver: subject.isOver,
    place: subject.place,
    messagesLost: subject.messagesLost,
    unreadMessagesUnknownKey: statistics.unreadMessagesUnknownKey,
    unreadMessagesNoParameter: statistics.unreadMessagesNoParameter,
    unreadMessagesGrammarRefused: statistics.unreadMessagesGrammarRefused,
    [REPORT_KEY_BY_FIGHT_FIELD.sideHealsUnsized]: statistics.sideHealsUnsized,
    [REPORT_KEY_BY_FIGHT_FIELD.sideHealsStated]: statistics.sideHealsStated,
    [REPORT_KEY_BY_FIGHT_FIELD.damageDealtByNobody]: statistics.damageDealtByNobody,
    [REPORT_KEY_BY_FIGHT_FIELD.damageTakenByNobody]: statistics.damageTakenByNobody,
    [REPORT_KEY_BY_FIGHT_FIELD.healthGivenByNobody]: statistics.healthGivenByNobody,
    [REPORT_KEY_BY_FIGHT_FIELD.healthRestoredToNobody]: statistics.healthRestoredToNobody,
    [REPORT_KEY_BY_FIGHT_FIELD.damageByNeitherEnd]: statistics.damageByNeitherEnd,
    roster: [
      ...subject.roster.byId.values()
    ],
    combatants: encodeReportCombatants(statistics),
    totals: encodeReportTotals(statistics.totals)
  };
}
function encodeReportTotals(totals) {
  assert(totals.damageDealtRaw >= 0, "the raw damage a report totals is never below nothing");
  return {
    damageDealt: totals.damageDealt,
    damageTaken: totals.damageTaken,
    damageDealtRaw: totals.damageDealtRaw,
    damageDealtApplied: totals.damageDealtApplied,
    damageTakenRaw: totals.damageTakenRaw,
    damageTakenApplied: totals.damageTakenApplied,
    damageDealtAbsorbed: totals.damageDealtAbsorbed,
    damageTakenAbsorbed: totals.damageTakenAbsorbed,
    damagePrevented: totals.damagePrevented,
    healthRestored: totals.healthRestored,
    healthGiven: totals.healthGiven
  };
}
function encodeReportCombatants(statistics) {
  const written = {};
  for (const [id, figures] of statistics.byCombatantId) {
    written[formatInteger(id)] = encodeReportRow(figures);
  }
  assert(Object.keys(written).length === statistics.byCombatantId.size, "a row per combatant");
  return written;
}
function encodeReportRow(figures) {
  assert(figures.damageDealtRaw >= 0, "the raw damage a row reports is never below nothing");
  const cut = encodeReportCut;
  const pair = encodeReportPairCut;
  return {
    unreadMessagesUnknownKey: figures.unreadMessagesUnknownKey,
    unreadMessagesNoParameter: figures.unreadMessagesNoParameter,
    [REPORT_KEY_BY_ROW_FIELD.sideHealsUnsized]: figures.sideHealsUnsized,
    damageDealt: figures.damageDealt,
    damageTaken: figures.damageTaken,
    damageDealtRaw: figures.damageDealtRaw,
    damageDealtApplied: figures.damageDealtApplied,
    damageTakenRaw: figures.damageTakenRaw,
    damageTakenApplied: figures.damageTakenApplied,
    damageDealtAbsorbed: figures.damageDealtAbsorbed,
    damageTakenAbsorbed: figures.damageTakenAbsorbed,
    damagePrevented: figures.damagePrevented,
    healthRestored: figures.healthRestored,
    healthGiven: figures.healthGiven,
    damageTakenFromNobody: figures.damageTakenFromNobody,
    damageDealtToNobody: figures.damageDealtToNobody,
    healthRestoredByNobody: figures.healthRestoredByNobody,
    damageTakenFromNobodyByKind: cut(figures.damageTakenFromNobodyByKind),
    damageDealtToNobodyByKind: cut(figures.damageDealtToNobodyByKind),
    [REPORT_KEY_BY_ROW_FIELD.healthRestoredByNobodyByKey]: cut(figures.healthRestoredByNobodyByKey),
    healthRestoredByGiver: cut(figures.healthRestoredByGiver),
    healthGivenByReceiver: cut(figures.healthGivenByReceiver),
    [REPORT_KEY_BY_ROW_FIELD.healthRestoredByKey]: cut(figures.healthRestoredByKey),
    [REPORT_KEY_BY_ROW_FIELD.healthRestoredWithoutSkillByKey]: cut(figures.healthRestoredWithoutSkillByKey),
    [REPORT_KEY_BY_ROW_FIELD.damageTakenWithoutSkillByKey]: cut(figures.damageTakenWithoutSkillByKey),
    [REPORT_KEY_BY_ROW_FIELD.damageDealtWithoutSkillByKey]: cut(figures.damageDealtWithoutSkillByKey),
    [REPORT_KEY_BY_ROW_FIELD.damageDealtWithoutSkillByOpponentAndKey]: pair(figures.damageDealtWithoutSkillByOpponentAndKey),
    damageDealtWithoutSkillByOpponent: cut(figures.damageDealtWithoutSkillByOpponent),
    damageTakenWithoutSkillByOpponent: cut(figures.damageTakenWithoutSkillByOpponent),
    [REPORT_KEY_BY_ROW_FIELD.healthGivenWithoutSkillByReceiverAndKey]: pair(figures.healthGivenWithoutSkillByReceiverAndKey),
    damageDealtByKind: cut(figures.damageDealtByKind),
    damageTakenByKind: cut(figures.damageTakenByKind),
    damageDealtByOpponent: cut(figures.damageDealtByOpponent),
    damageTakenByOpponent: cut(figures.damageTakenByOpponent),
    damageDealtByOpponentAndKind: pair(figures.damageDealtByOpponentAndKind),
    damageTakenByOpponentAndKind: pair(figures.damageTakenByOpponentAndKind),
    skills: encodeReportSkills(figures.skills),
    blowsStruck: figures.blowsStruck,
    blowsWithoutSkill: figures.blowsWithoutSkill,
    turnsTaken: figures.turnsTaken,
    turnsLost: figures.turnsLost,
    blowsCritical: figures.blowsCritical,
    damageDealtBlowLargest: figures.damageDealtBlowLargest,
    damageTakenBlowLargest: figures.damageTakenBlowLargest,
    procsWhenStriking: cut(figures.procsWhenStriking),
    procsWhenStruck: cut(figures.procsWhenStruck),
    damagePreventedByDefence: cut(figures.damagePreventedByDefence),
    damageDealtAbsorbedByDefence: cut(figures.damageDealtAbsorbedByDefence),
    damageTakenAbsorbedByDefence: cut(figures.damageTakenAbsorbedByDefence),
    statisticsDestroyed: cut(figures.statisticsDestroyed)
  };
}
function encodeReportCut(cut) {
  const written = {};
  for (const [key, amount] of cut) written[key] = amount;
  assert(Object.keys(written).length === cut.size, "every cut is written down");
  return written;
}
function encodeReportPairCut(cut) {
  const written = {};
  for (const [key, innerCut] of cut) written[key] = encodeReportCut(innerCut);
  assert(Object.keys(written).length === cut.size, "every cut of a cut is written down");
  return written;
}
function encodeReportSkills(skills) {
  const written = {};
  for (const [key, skill] of skills) {
    assert(key.length > 0, "a skill is kept under the name it was announced by");
    written[key] = {
      name: skill.name,
      uses: skill.uses,
      [REPORT_KEY_BY_SKILL_FIELD.damageDealt]: skill.damageDealt,
      blows: skill.blows,
      [REPORT_KEY_BY_SKILL_FIELD.damageDealtByOpponent]: encodeReportCut(skill.damageDealtByOpponent),
      [REPORT_KEY_BY_SKILL_FIELD.healthGiven]: skill.healthGiven,
      [REPORT_KEY_BY_SKILL_FIELD.healthGivenByReceiver]: encodeReportCut(skill.healthGivenByReceiver)
    };
  }
  assert(Object.keys(written).length === skills.size, "and every one of them is written down");
  return written;
}

// src/runtime/fight-handover.ts
var ShownFightAbsent = class extends Error {
  name = "ShownFightAbsent";
};
var WORLD_UNKNOWN = "unknown";
function writeShownFightFile(shownFight, liveHandover, ports, onLateFailure) {
  assert(ports.addOnVersion.length > 0, "a file names the build that wrote it");
  if (shownFight === null) return new ShownFightAbsent();
  let handover;
  if (shownFight.keptFight === null) {
    const surroundings = readLiveFileSurroundings(ports);
    if (surroundings instanceof Error) return surroundings;
    const subject = composeFileSubject(shownFight.fightState, liveHandover.place);
    handover = {
      calls: liveHandover.capture,
      subject,
      surroundings
    };
  } else {
    const { keptFight, fightState } = shownFight;
    const payloadsReplayedCount = fightState.messagesByPayload.length;
    assert(payloadsReplayedCount === keptFight.payloads.length, "a kept fight was replayed payload by payload");
    const calls = keptFight.payloads.map((payload, index) => ({
      index,
      payload,
      messages: fightState.messagesByPayload[index] ?? [],
      combatantsBefore: null,
      combatantsAfter: null
    }));
    const surroundings = readFileSurroundings(ports, keptFight.openedAt, keptFight.margonemClientBuild);
    if (surroundings instanceof Error) return surroundings;
    handover = {
      calls: {
        calls,
        droppedCalls: null,
        isTruncated: null
      },
      subject: composeFileSubject(fightState, keptFight.place),
      surroundings
    };
  }
  const encoded = encodeFightFile(handover.calls, handover.subject, handover.surroundings);
  if (encoded instanceof Error) return encoded;
  return ports.file.writeFile(encoded.name, encoded.text, onLateFailure);
}
function readLiveFileSurroundings(ports) {
  const now = ports.clock.readNowMilliseconds();
  if (now instanceof Error) return now;
  let margonemClientBuild;
  {
    const buildId = ports.build.readBuildId();
    if (buildId instanceof Error) margonemClientBuild = null;
    else {
      assert(buildId.length > 0, "a build the page stated says something");
      margonemClientBuild = buildId;
    }
  }
  return readFileSurroundings(ports, now, margonemClientBuild);
}
function readFileSurroundings(ports, atMilliseconds, margonemClientBuild) {
  const capturedAt = ports.clock.readTimestampText(atMilliseconds);
  if (capturedAt instanceof Error) return capturedAt;
  const world = ports.surroundings.readWorld();
  assert(world !== "", "a world the page named says something");
  return {
    world: world ?? WORLD_UNKNOWN,
    margonemClientBuild,
    capturedAt,
    userAgent: ports.surroundings.readUserAgent(),
    addOnVersion: ports.addOnVersion
  };
}
function composeFileSubject(fightState, place) {
  assert(fightState.view.payloadsApplied > 0, "a fight handed over was read from something");
  return {
    statistics: fightState.figures.statistics,
    roster: fightState.view.roster,
    place,
    payloadsApplied: fightState.view.payloadsApplied,
    messagesLost: fightState.view.messagesLost,
    isOver: fightState.view.isOver
  };
}
function writeLiveCallsFile(liveHandover, ports, onLateFailure) {
  assert(liveHandover.capture.calls.length > 0, "a file of calls is written from some");
  const surroundings = readLiveFileSurroundings(ports);
  if (surroundings instanceof Error) return surroundings;
  const encoded = encodeFightFile(liveHandover.capture, null, surroundings);
  if (encoded instanceof Error) return encoded;
  return ports.file.writeFile(encoded.name, encoded.text, onLateFailure);
}

// src/core/fight-figures.ts
function tallyFightFigures(view) {
  assert(view.payloadsApplied > 0, "figures are tallied from a fight that exists");
  const sideHealByEvent = indexSideHeals(view.events, view.roster);
  const statistics = tallyFightStatistics(view.events, sideHealByEvent);
  assert(sideHealByEvent.size <= view.events.length, "a cast sized is an event of the fight");
  return {
    statistics,
    sideHealByEvent,
    payloadsApplied: view.payloadsApplied
  };
}
function verifyFightFigures(figures) {
  assert(figures.payloadsApplied > 0, "figures verified were tallied from a fight");
  assert(figures.statistics.sideHealsStated >= figures.sideHealByEvent.size, "a cast sized was stated");
  verifyFightStatistics(figures.statistics);
}

// src/ports/fight-capture.ts
var CALLS_MAXIMUM = 2e3;
var SHAPE_KEYS_MAXIMUM = 256;
var SHAPE_KEYS_PAST_MAXIMUM = "+";
function createFightCapture() {
  return {
    calls: [],
    droppedCalls: 0,
    isTruncated: false,
    shapesSeen: /* @__PURE__ */ new Set(),
    statesSeen: /* @__PURE__ */ new Set()
  };
}
function prepareCapture(capture, call, isOpening) {
  const callIndex = isOpening ? 0 : capture.calls.length;
  assert(callIndex <= CALLS_MAXIMUM, "a recording stays inside its stated bound");
  const shape = composeCaptureShapeKey(call.payload);
  const state = composeCaptureStateKey(call.combatantsAfter);
  let isKept;
  if (isOpening) isKept = true;
  else if (call.messages.length > 0) isKept = true;
  else if (call.wasRefused) isKept = true;
  else if (!capture.shapesSeen.has(shape)) isKept = true;
  else isKept = !capture.statesSeen.has(state);
  if (!isKept) return {
    callIndex,
    isOpening,
    isPastCeiling: false,
    kept: null
  };
  if (callIndex === CALLS_MAXIMUM) {
    return {
      callIndex,
      isOpening,
      isPastCeiling: true,
      kept: null
    };
  }
  const keptCall = {
    index: callIndex,
    payload: createCaptureCopy(call.payload),
    messages: [
      ...call.messages
    ],
    combatantsBefore: call.combatantsBefore === null ? null : [
      ...call.combatantsBefore
    ],
    combatantsAfter: call.combatantsAfter === null ? null : [
      ...call.combatantsAfter
    ]
  };
  return {
    callIndex,
    isOpening,
    isPastCeiling: false,
    kept: {
      call: keptCall,
      shape,
      state
    }
  };
}
function composeCaptureShapeKey(payload) {
  if (!isRecord(payload)) return "";
  const keys = Object.keys(payload).sort();
  if (keys.length <= SHAPE_KEYS_MAXIMUM) return keys.join(",");
  return [
    ...keys.slice(0, SHAPE_KEYS_MAXIMUM),
    SHAPE_KEYS_PAST_MAXIMUM
  ].join(",");
}
function composeCaptureStateKey(combatants) {
  const written = encodeJson(combatants, 0);
  if (written instanceof Error) return "";
  assert(written.length > 0, "a key that was written says something");
  return written;
}
function createCaptureCopy(payload) {
  const written = encodeJson(payload, 0);
  if (written instanceof Error) return null;
  const payloadCopy = parseJson(written);
  assert(!(payloadCopy instanceof Error), "text this writer produced is text this reader takes back");
  return payloadCopy;
}
function commitCapture(capture, prepared) {
  if (prepared.isOpening) {
    capture.calls = [];
    capture.droppedCalls = 0;
    capture.isTruncated = false;
    capture.shapesSeen = /* @__PURE__ */ new Set();
    capture.statesSeen = /* @__PURE__ */ new Set();
  } else {
    const callIndex = capture.calls.length;
    assert(callIndex === prepared.callIndex, "a call lands on the recording it was read against");
  }
  if (prepared.isPastCeiling) capture.isTruncated = true;
  const kept = prepared.kept;
  if (kept === null) {
    capture.droppedCalls += 1;
    return;
  }
  assert(capture.calls.length < CALLS_MAXIMUM, "a call is kept only under the ceiling");
  capture.calls.push(kept.call);
  capture.shapesSeen.add(kept.shape);
  capture.statesSeen.add(kept.state);
}

// src/runtime/shelf.ts
var ShelfUnreadable = class extends Error {
  name = "ShelfUnreadable";
  constructor(options) {
    super(void 0, options);
  }
};
var ShelfUnwritable = class extends Error {
  name = "ShelfUnwritable";
  constructor(options) {
    super(void 0, options);
  }
};
var KeptFightsUnreadable = class extends Error {
  name = "KeptFightsUnreadable";
  count;
  constructor(count) {
    super();
    this.count = count;
  }
};
var ShelfVersionUnknown = class extends Error {
  name = "ShelfVersionUnknown";
  version;
  constructor(version, options) {
    super(void 0, options);
    this.version = version;
  }
};
var EverySlotPinned = class extends Error {
  name = "EverySlotPinned";
  maximum;
  constructor(maximum, options) {
    super(void 0, options);
    this.maximum = maximum;
  }
};
var RotationRefused = class extends Error {
  name = "RotationRefused";
  attempts;
  constructor(attempts, options) {
    super(void 0, options);
    this.attempts = attempts;
  }
};
var FightAlreadyKept = class extends Error {
  name = "FightAlreadyKept";
  openedAt;
  constructor(openedAt, options) {
    super(void 0, options);
    this.openedAt = openedAt;
  }
};
var KEPT_MAXIMUM = 20;
var SHELF_VERSION = 3;
var SHELF_KEY = STORE_KEY.fights;
var SHELF_FIELDS = {
  version: "version",
  fights: "fights"
};
var FIGHT_FIELDS = {
  openedAt: "openedAt",
  payloads: "payloads",
  place: "place",
  readerId: "readerId",
  margonemClientBuild: "gameBuild",
  isPinned: "isPinned"
};
var PLACE_FIELDS2 = {
  mapName: "mapName",
  x: "x",
  y: "y"
};
function openShelf(store) {
  const stored = store.read(SHELF_KEY);
  if (stored instanceof Error) return stored;
  if (stored === null) return {
    fights: [],
    fightsUnreadable: 0
  };
  const parsed = parseJson(stored);
  if (parsed instanceof Error) return new ShelfUnreadable({
    cause: parsed
  });
  if (!isRecord(parsed)) return new ShelfUnreadable();
  const version = getNumberField(parsed, SHELF_FIELDS, "version");
  if (version instanceof Error) return new ShelfVersionUnknown(null, {
    cause: version
  });
  if (version !== SHELF_VERSION) return new ShelfVersionUnknown(version);
  const storedFights = getListField(parsed, SHELF_FIELDS, "fights", KEPT_MAXIMUM);
  if (storedFights instanceof Error) return new ShelfUnreadable({
    cause: storedFights
  });
  const fights = [];
  for (const storedFight of storedFights ?? []) {
    let fight;
    readFight: {
      if (!isRecord(storedFight)) {
        fight = null;
        break readFight;
      }
      const openedAt = getNumberField(storedFight, FIGHT_FIELDS, "openedAt");
      if (openedAt instanceof Error) {
        fight = null;
        break readFight;
      }
      if (openedAt === null) {
        fight = null;
        break readFight;
      }
      if (!Number.isSafeInteger(openedAt)) {
        fight = null;
        break readFight;
      }
      if (openedAt < 0) {
        fight = null;
        break readFight;
      }
      if (fights.some((keptFight) => keptFight.openedAt === openedAt)) {
        fight = null;
        break readFight;
      }
      const payloads = getListField(storedFight, FIGHT_FIELDS, "payloads", CALLS_MAXIMUM);
      if (payloads instanceof Error) {
        fight = null;
        break readFight;
      }
      if (payloads === null) {
        fight = null;
        break readFight;
      }
      if (payloads.length === 0) {
        fight = null;
        break readFight;
      }
      if (!payloads.every(isRecord)) {
        fight = null;
        break readFight;
      }
      const margonemClientBuild = getStatedTextField(storedFight, FIGHT_FIELDS, "margonemClientBuild");
      let place;
      readPlace: {
        const stored2 = getRecordField(storedFight, FIGHT_FIELDS, "place");
        if (stored2 instanceof Error) {
          place = null;
          break readPlace;
        }
        if (stored2 === null) {
          place = null;
          break readPlace;
        }
        const mapName = getStatedTextField(stored2, PLACE_FIELDS2, "mapName");
        const x = getNumberField(stored2, PLACE_FIELDS2, "x");
        const y = getNumberField(stored2, PLACE_FIELDS2, "y");
        const statedPlace = {
          mapName: mapName instanceof Error ? null : mapName,
          x: x instanceof Error ? null : x,
          y: y instanceof Error ? null : y
        };
        if (statedPlace.mapName !== null) {
          place = statedPlace;
          break readPlace;
        }
        if (statedPlace.x !== null) {
          place = statedPlace;
          break readPlace;
        }
        if (statedPlace.y === null) {
          place = null;
          break readPlace;
        }
        place = statedPlace;
      }
      let readerId;
      readReaderId: {
        const id = getNumberField(storedFight, FIGHT_FIELDS, "readerId");
        if (id instanceof Error) {
          readerId = null;
          break readReaderId;
        }
        if (id === null) {
          readerId = null;
          break readReaderId;
        }
        if (!Number.isSafeInteger(id)) {
          readerId = null;
          break readReaderId;
        }
        if (id <= 0) {
          readerId = null;
          break readReaderId;
        }
        readerId = id;
      }
      fight = {
        openedAt,
        payloads: [
          ...payloads
        ],
        place,
        readerId,
        margonemClientBuild: margonemClientBuild instanceof Error ? null : margonemClientBuild,
        isPinned: storedFight[FIGHT_FIELDS.isPinned] === true
      };
    }
    if (fight !== null) fights.push(fight);
  }
  assert(fights.length <= KEPT_MAXIMUM, "a shelf read back stays inside its stated bound");
  const fightsUnreadable = (storedFights ?? []).length - fights.length;
  assert(fightsUnreadable >= 0, "a fight read back is one the store held");
  return {
    fights,
    fightsUnreadable
  };
}
function isShelfSuperseded(failure) {
  if (!(failure instanceof ShelfVersionUnknown)) return false;
  assert(failure.version !== SHELF_VERSION, "a shelf of this version is read, not refused");
  if (failure.version === null) return false;
  return failure.version < SHELF_VERSION;
}
function writeKeptFight(store, shelf, fight) {
  assert(fight.payloads.length > 0, "a fight kept was kept from something");
  assert(fight.payloads.length <= CALLS_MAXIMUM, "and stays inside a recording's bound");
  if (shelf.fights.some((keptFight) => keptFight.openedAt === fight.openedAt)) {
    return new FightAlreadyKept(fight.openedAt);
  }
  assert(shelf.fights.length <= KEPT_MAXIMUM, "a fight is kept onto a shelf inside its bound");
  const fightsAfter = [
    ...shelf.fights,
    fight
  ];
  const pinned = fightsAfter.filter((keptFight) => keptFight.isPinned).length;
  if (pinned >= KEPT_MAXIMUM) {
    if (fightsAfter.length > KEPT_MAXIMUM) return new EverySlotPinned(KEPT_MAXIMUM);
  }
  return writeShelf(store, fightsAfter);
}
function writeShelf(store, fights) {
  let offered = rotateShelf(fights);
  let refused = null;
  for (let attempts = 1; attempts <= KEPT_MAXIMUM + 1; attempts += 1) {
    const text = encodeJson({
      version: SHELF_VERSION,
      fights: offered.map(encodeKeptFight)
    }, 0);
    if (text instanceof Error) return new ShelfUnwritable({
      cause: text
    });
    const written = store.write(SHELF_KEY, text);
    if (!(written instanceof Error)) {
      const keptOpenedAts = new Set(offered.map((keptFight) => keptFight.openedAt));
      const droppedOpenedAts = fights.filter((keptFight) => !keptOpenedAts.has(keptFight.openedAt)).map((keptFight) => keptFight.openedAt);
      assert(droppedOpenedAts.length + offered.length === fights.length, "every fight offered is kept or dropped");
      return {
        contents: {
          fights: offered
        },
        droppedOpenedAt: droppedOpenedAts
      };
    }
    if (written instanceof StoreUnavailable) return written;
    refused = written;
    const shorter = dropOldestUnpinned(offered);
    if (shorter === null) return new RotationRefused(attempts, {
      cause: refused
    });
    offered = shorter;
  }
  assert(offered.length === 0, "a shelf offered once per fight it holds has nothing left to drop");
  return new RotationRefused(KEPT_MAXIMUM + 1, {
    cause: refused
  });
}
function encodeKeptFight(fight) {
  assert(fight.payloads.length > 0, "a fight written was kept from something");
  const encoded = {
    [FIGHT_FIELDS.openedAt]: fight.openedAt,
    [FIGHT_FIELDS.payloads]: fight.payloads,
    [FIGHT_FIELDS.place]: fight.place,
    [FIGHT_FIELDS.margonemClientBuild]: fight.margonemClientBuild,
    [FIGHT_FIELDS.isPinned]: fight.isPinned
  };
  if (fight.readerId === null) return encoded;
  assert(fight.readerId > 0, "an id written is one the page stated");
  return {
    ...encoded,
    [FIGHT_FIELDS.readerId]: fight.readerId
  };
}
function dropOldestUnpinned(fights) {
  const fightIndex = fights.findIndex((keptFight) => !keptFight.isPinned);
  if (fightIndex === -1) return null;
  const remaining = [
    ...fights
  ];
  remaining.splice(fightIndex, 1);
  assert(remaining.length + 1 === fights.length, "dropping the oldest drops exactly one");
  return remaining;
}
function writeKeptFightPin(store, shelf, openedAt, isPinned) {
  assert(shelf.fights.some((keptFight) => keptFight.openedAt === openedAt), "a pin is asked of a fight the shelf keeps");
  assert(shelf.fights.length <= KEPT_MAXIMUM, "on a shelf inside its bound");
  const fightsAfter = shelf.fights.map((keptFight) => keptFight.openedAt === openedAt ? {
    ...keptFight,
    isPinned
  } : keptFight);
  return writeShelf(store, fightsAfter);
}
function writeShelfContents(store, shelf) {
  assert(shelf.fights.length <= KEPT_MAXIMUM, "a shelf moved is inside its stated bound");
  return writeShelf(store, shelf.fights);
}
function deleteShelf(store) {
  return store.delete(SHELF_KEY);
}
function rotateShelf(fights) {
  let rotated = [
    ...fights
  ];
  for (let rotations = 0; rotations < fights.length; rotations += 1) {
    if (rotated.length <= KEPT_MAXIMUM) break;
    const shorter = dropOldestUnpinned(rotated);
    if (shorter === null) break;
    rotated = shorter;
  }
  assert(rotated.length <= fights.length, "a rotation never grows the shelf it was handed");
  assert(rotated.length <= KEPT_MAXIMUM, "a rotation leaves the shelf inside its bound");
  return rotated;
}

// src/runtime/fight-state.ts
function tallyFightState(view) {
  const figures = tallyFightFigures(view);
  verifyFightFigures(figures);
  assert(figures.payloadsApplied === view.payloadsApplied, "tallied off the view it was handed");
  return {
    view,
    figures
  };
}
function replayKeptFight(fight, tables, options) {
  assert(fight.payloads.length > 0, "a fight kept was kept from something");
  const replayed = replayFightPayloads(fight.payloads, tables, options);
  assert(replayed !== null, "a payload replayed is a fight to stand on");
  return replayed;
}
function replayFightPayloads(payloads, tables, options) {
  assert(payloads.length <= CALLS_MAXIMUM, "a fight replayed is inside a recording's bound");
  const session = createFightSession(options);
  const messagesByPayload = [];
  for (const payload of payloads) {
    const record = readPayloadEnvelope(payload);
    if (record instanceof Error) return record;
    const prepared = preparePayload(session, record, tables);
    if (prepared instanceof Error) return prepared;
    commitPayload(session, prepared);
    messagesByPayload.push(record.messages);
  }
  const view = composeFightView(session);
  if (view === null) return null;
  return {
    ...tallyFightState(view),
    messagesByPayload
  };
}
function lookupShownFight(liveView, chosenFightOpenedAt, fights, keptFightStatesByOpenedAt) {
  const keptFight = lookupShownKeptFight(liveView !== null, chosenFightOpenedAt, fights);
  if (keptFight !== void 0) {
    const keptFightState = keptFightStatesByOpenedAt.get(keptFight.openedAt);
    assert(keptFightState !== void 0, "a fight on the shelf has its reading held");
    if (keptFightState === null) return null;
    return {
      keptFight,
      fightState: keptFightState
    };
  }
  if (liveView === null) return null;
  return {
    keptFight: null,
    fightState: tallyFightState(liveView)
  };
}
function lookupShownKeptFight(hasLiveView, chosenFightOpenedAt, fights) {
  assert(fights.length <= KEPT_MAXIMUM, "a shelf walked is inside its stated bound");
  const chosen = chosenFightOpenedAt === null ? void 0 : fights.find((keptFight) => keptFight.openedAt === chosenFightOpenedAt);
  return chosen ?? (hasLiveView ? void 0 : lookupNewestFight(fights));
}
function lookupNewestFight(fights) {
  let newest;
  for (const keptFight of fights) {
    if (newest === void 0) newest = keptFight;
    else if (keptFight.openedAt > newest.openedAt) newest = keptFight;
  }
  if (newest !== void 0) assert(fights.includes(newest), "the newest is one of the shelf's");
  else assert(fights.length === 0, "only an empty shelf names no newest");
  return newest;
}

// src/runtime/live-fight.ts
var CaptureCallsExceeded = class extends Error {
  name = "CaptureCallsExceeded";
  maximum;
  constructor(maximum) {
    super();
    this.maximum = maximum;
  }
};
function initLiveFight(options) {
  const liveFight = {
    session: createFightSession(options.sessionOptions),
    capture: createFightCapture(),
    snapshotBefore: null,
    place: null,
    readerId: null,
    openedAt: null,
    openedAtRefusal: null,
    payloadRefusal: null,
    margonemEngineBattle: null
  };
  const listener = {
    onBeforeCall() {
      liveFight.snapshotBefore = executeLiveStep(options, DEFECT_KIND.file, null, () => readLiveMargonemEngineWarriors(liveFight, options));
    },
    onPayload(payload) {
      const openingRead = attempt(() => isPayloadOpening(payload));
      const isOpeningApart = openingRead instanceof Caught ? false : openingRead;
      if (isOpeningApart) liveFight.payloadRefusal = null;
      const { record, isOpening } = executeLiveReading(liveFight, options, DEFECT_KIND.reading, {
        record: null,
        isOpening: isOpeningApart
      }, () => {
        const payloadRecord = readPayloadEnvelope(payload);
        if (!(payloadRecord instanceof Error)) {
          return {
            record: payloadRecord,
            isOpening: payloadRecord.isInit
          };
        }
        options.defects.add({
          kind: DEFECT_KIND.reading,
          region: null,
          failure: payloadRecord
        });
        liveFight.payloadRefusal ??= payloadRecord;
        return {
          record: null,
          isOpening: isOpeningApart
        };
      });
      const snapshotAfter = executeLiveStep(options, DEFECT_KIND.file, null, () => readLiveMargonemEngineWarriors(liveFight, options));
      const isCaptured = executeLiveReading(liveFight, options, DEFECT_KIND.file, false, () => {
        const messages = record === null ? [] : record.messages;
        const call = {
          payload,
          messages,
          wasRefused: record === null,
          combatantsBefore: liveFight.snapshotBefore,
          combatantsAfter: snapshotAfter
        };
        const prepared = prepareCapture(liveFight.capture, call, isOpening);
        commitCapture(liveFight.capture, prepared);
        return true;
      });
      if (!isCaptured) {
        if (isOpening) liveFight.capture = createFightCapture();
      }
      const committed = record === null ? null : executeLiveReading(liveFight, options, DEFECT_KIND.reading, null, () => {
        const prepared = preparePayload(liveFight.session, record, options.tables);
        if (prepared instanceof Error) {
          options.defects.add({
            kind: DEFECT_KIND.reading,
            region: null,
            failure: prepared
          });
          liveFight.payloadRefusal ??= prepared;
          return null;
        }
        return commitPayload(liveFight.session, prepared);
      });
      if (committed === null) {
        if (isOpening) liveFight.session = createFightSession(options.sessionOptions);
      }
      if (committed?.hasOpened === true) {
        const now = options.clock.readNowMilliseconds();
        if (now instanceof Caught) {
          liveFight.openedAt = null;
          liveFight.openedAtRefusal = now;
        } else {
          liveFight.openedAt = now;
          liveFight.openedAtRefusal = null;
        }
        liveFight.place = null;
        liveFight.readerId = null;
        executeLiveStep(options, DEFECT_KIND.reading, void 0, () => {
          liveFight.place = lookupMargonemValue(options.place.readPlace());
          liveFight.readerId = lookupMargonemValue(options.hero.readHeroId());
          options.onFightOpened();
        });
      }
      if (committed?.hasClosed === true) {
        executeLiveStep(options, DEFECT_KIND.keeping, void 0, () => {
          const openedAt = liveFight.openedAt;
          if (openedAt === null) {
            const refusal = liveFight.openedAtRefusal;
            assert(refusal !== null, "a fight opened with no moment kept why");
            options.defects.add({
              kind: DEFECT_KIND.keeping,
              region: null,
              failure: refusal
            });
            return;
          }
          if (liveFight.payloadRefusal !== null) {
            options.defects.add({
              kind: DEFECT_KIND.keeping,
              region: null,
              failure: liveFight.payloadRefusal
            });
            return;
          }
          if (liveFight.capture.isTruncated) {
            options.defects.add({
              kind: DEFECT_KIND.keeping,
              region: null,
              failure: new CaptureCallsExceeded(CALLS_MAXIMUM)
            });
            return;
          }
          const payloads = liveFight.capture.calls.map((call) => call.payload);
          const fight = {
            openedAt,
            payloads,
            place: liveFight.place,
            readerId: liveFight.readerId,
            margonemClientBuild: lookupMargonemValue(options.build.readBuildId()),
            isPinned: false
          };
          options.keeper.keep(fight);
        });
        executeLiveStep(options, DEFECT_KIND.reading, void 0, () => options.onFightKept());
      }
      executeLiveStep(options, DEFECT_KIND.reading, void 0, () => options.markStale());
    }
  };
  return {
    live: liveFight,
    listener
  };
}
function executeLiveStep(options, kind, fallback, step) {
  const ran = attempt(step);
  if (!(ran instanceof Caught)) return ran;
  options.defects.add({
    kind,
    region: null,
    failure: ran
  });
  return fallback;
}
function executeLiveReading(liveFight, options, kind, fallback, step) {
  const ran = attempt(step);
  if (!(ran instanceof Caught)) return ran;
  options.defects.add({
    kind,
    region: null,
    failure: ran
  });
  liveFight.payloadRefusal ??= ran;
  return fallback;
}
function readLiveMargonemEngineWarriors(liveFight, options) {
  if (liveFight.margonemEngineBattle === null) {
    const battle = options.battle.readBattle();
    if (battle instanceof Error) {
      options.defects.add({
        kind: DEFECT_KIND.file,
        region: null,
        failure: battle
      });
      return null;
    }
    liveFight.margonemEngineBattle = battle;
  }
  const warriorSnapshot = liveFight.margonemEngineBattle.readWarriors();
  if (!(warriorSnapshot instanceof Error)) return warriorSnapshot;
  if (warriorSnapshot instanceof MargonemEngineWarriorsAbsent) return [];
  options.defects.add({
    kind: DEFECT_KIND.file,
    region: null,
    failure: warriorSnapshot
  });
  return null;
}
function lookupMargonemValue(margonemValue) {
  if (margonemValue instanceof MargonemValueAbsent) return null;
  if (margonemValue instanceof Caught) return null;
  return margonemValue;
}

// src/runtime/carried-tooltip.ts
function writeCarriedTooltips(view, tables, translate, tooltip) {
  const fightStandings = replayAuraStandings(view, tables.statedSkills);
  const figuresByCombatantAndBit = /* @__PURE__ */ new Map();
  const carriedFigures = tallyCarriedFigures({
    statuses: view.carriedStatuses,
    casts: fightStandings.casts,
    roster: view.roster,
    turnsByCombatantId: view.turnsByCombatantId,
    keyByStatusBit: tables.keyByStatusBit
  });
  for (const carriedFigure of carriedFigures) {
    figuresByCombatantAndBit.set(`${carriedFigure.combatantId}/${carriedFigure.bit}`, carriedFigure);
  }
  const rowsByCombatantId = /* @__PURE__ */ new Map();
  for (const combatantId of view.roster.byId.keys()) {
    const tooltipContent = presentCarriedTooltip(combatantId, view, fightStandings, figuresByCombatantAndBit);
    rowsByCombatantId.set(combatantId, presentTooltipRows(tooltipContent, translate, tables.statusBits));
  }
  assert(rowsByCombatantId.size <= COMBATANTS_MAXIMUM, "a block per fighter the roster holds, and no more");
  return tooltip.writeRows(rowsByCombatantId);
}
function presentCarriedTooltip(combatantId, view, fightStandings, figuresByCombatantAndBit) {
  const legendary = view.legendaryStandings.find((legendaryStanding) => legendaryStanding.combatantId === combatantId);
  const provoked = fightStandings.provocations.find((provocation) => provocation.provokedId === combatantId);
  const caster = provoked === void 0 ? void 0 : view.roster.byId.get(provoked.casterId);
  const statuses = view.carriedStatuses.filter((carriedStatus) => carriedStatus.combatantId === combatantId);
  return {
    turnsTaken: view.turnsByCombatantId.get(combatantId) ?? 0,
    provokedBy: provoked === void 0 ? null : {
      name: caster?.name ?? PANEL_WORDS.withoutActor,
      turnsElapsed: provoked.turnsElapsed,
      turnsStated: provoked.turnsStated
    },
    provokedCount: fightStandings.provocations.filter((provocation) => provocation.casterId === combatantId).length,
    statuses: statuses.map((carriedStatus) => {
      const statusKey = `${carriedStatus.combatantId}/${carriedStatus.bit}`;
      const carriedFigure = figuresByCombatantAndBit.get(statusKey);
      return {
        bit: carriedStatus.bit,
        percent: carriedFigure?.percent ?? null
      };
    }),
    holytouchHealsReceived: legendary?.holytouchHealsReceived ?? null,
    hasSpentLastheal: legendary?.hasSpentLastheal ?? false,
    hasJoinedInProgress: view.hasJoinedInProgress
  };
}

// libs/vocabulary.ts
function isOneOf(words, candidate) {
  assert(words.length > 0, "a vocabulary holds at least one word");
  if (typeof candidate !== "string") return false;
  return words.includes(candidate);
}

// src/ui/panel-choice.ts
var STORAGE_CHOICE = {
  local: "local",
  session: "session",
  memory: "memory"
};
var PANEL_WINDOW = {
  meter: "meter",
  helper: "helper"
};
var TYPE_STEP = {
  small: "small",
  medium: "medium",
  large: "large"
};
var STORAGE_CHOICES = Object.values(STORAGE_CHOICE);
var PANEL_WINDOWS = Object.values(PANEL_WINDOW);
var TYPE_STEPS = Object.values(TYPE_STEP);
var TYPE_STEP_DEFAULT = TYPE_STEP.medium;

// src/runtime/settings.ts
var SETTING_KEY = {
  storage: "storage",
  typeStep: "type-step",
  meterPosition: "meter-position",
  meterFolded: "meter-folded",
  helperPosition: "helper-position",
  helperFolded: "helper-folded",
  meterSize: "meter-size",
  helperSize: "helper-size"
};
var SettingUnreadable = class extends Error {
  name = "SettingUnreadable";
  key;
  constructor(key, options) {
    super(void 0, options);
    this.key = key;
  }
};
var SettingTooLong = class extends Error {
  name = "SettingTooLong";
  key;
  constructor(key) {
    super();
    this.key = key;
  }
};
var STORE_KEY_BY_SETTING = {
  [SETTING_KEY.storage]: STORE_KEY.storage,
  [SETTING_KEY.typeStep]: STORE_KEY.typeStep,
  [SETTING_KEY.meterPosition]: STORE_KEY.meterPosition,
  [SETTING_KEY.meterFolded]: STORE_KEY.meterFolded,
  [SETTING_KEY.helperPosition]: STORE_KEY.helperPosition,
  [SETTING_KEY.helperFolded]: STORE_KEY.helperFolded,
  [SETTING_KEY.meterSize]: STORE_KEY.meterSize,
  [SETTING_KEY.helperSize]: STORE_KEY.helperSize
};
var FOLD_SETTING_BY_WINDOW = {
  [PANEL_WINDOW.meter]: SETTING_KEY.meterFolded,
  [PANEL_WINDOW.helper]: SETTING_KEY.helperFolded
};
var POSITION_SETTING_BY_WINDOW = {
  [PANEL_WINDOW.meter]: SETTING_KEY.meterPosition,
  [PANEL_WINDOW.helper]: SETTING_KEY.helperPosition
};
var SIZE_SETTING_BY_WINDOW = {
  [PANEL_WINDOW.meter]: SETTING_KEY.meterSize,
  [PANEL_WINDOW.helper]: SETTING_KEY.helperSize
};
var STORAGE_DEFAULT = STORAGE_CHOICE.local;
var FOLDED = "1";
var UNFOLDED = "";
var PAIR_LENGTH_MAXIMUM = 4096;
var POSITION_FIELDS = {
  left: "left",
  top: "top"
};
var SIZE_FIELDS = {
  width: "width",
  height: "height"
};
function readStorageChoice(store) {
  const storedText = store.read(STORE_KEY_BY_SETTING[SETTING_KEY.storage]);
  if (storedText instanceof Error) return storedText;
  if (storedText === null) return STORAGE_DEFAULT;
  if (!isOneOf(STORAGE_CHOICES, storedText)) return new SettingUnreadable(SETTING_KEY.storage);
  return storedText;
}
function writeStorageChoice(store, choice) {
  return store.write(STORE_KEY_BY_SETTING[SETTING_KEY.storage], choice);
}
function readTypeStep(store) {
  const storedText = store.read(STORE_KEY_BY_SETTING[SETTING_KEY.typeStep]);
  if (storedText instanceof Error) return storedText;
  if (storedText === null) return TYPE_STEP_DEFAULT;
  if (!isOneOf(TYPE_STEPS, storedText)) return new SettingUnreadable(SETTING_KEY.typeStep);
  return storedText;
}
function writeTypeStep(store, step) {
  return store.write(STORE_KEY_BY_SETTING[SETTING_KEY.typeStep], step);
}
function readWindowCollapsed(store, panelWindow) {
  const key = FOLD_SETTING_BY_WINDOW[panelWindow];
  const storedText = store.read(STORE_KEY_BY_SETTING[key]);
  if (storedText instanceof Error) return storedText;
  if (storedText === null) return false;
  if (storedText === FOLDED) return true;
  if (storedText === UNFOLDED) return false;
  return new SettingUnreadable(key);
}
function writeWindowCollapsed(store, panelWindow, isCollapsed) {
  const key = FOLD_SETTING_BY_WINDOW[panelWindow];
  return store.write(STORE_KEY_BY_SETTING[key], isCollapsed ? FOLDED : UNFOLDED);
}
function readWindowPosition(store, panelWindow) {
  const key = POSITION_SETTING_BY_WINDOW[panelWindow];
  const storedText = store.read(STORE_KEY_BY_SETTING[key]);
  if (storedText instanceof Error) return storedText;
  if (storedText === null) return null;
  if (storedText.length > PAIR_LENGTH_MAXIMUM) return new SettingTooLong(key);
  const pair = parseWholePair(storedText, key, POSITION_FIELDS, [
    "left",
    "top"
  ]);
  if (pair instanceof Error) return pair;
  return {
    left: pair[0],
    top: pair[1]
  };
}
function parseWholePair(text, key, fields, names) {
  const parsed = parseJson(text);
  if (parsed instanceof Error) return new SettingUnreadable(key, {
    cause: parsed
  });
  if (!isRecord(parsed)) return new SettingUnreadable(key);
  const firstNumber = getNumberField(parsed, fields, names[0]);
  const secondNumber = getNumberField(parsed, fields, names[1]);
  if (firstNumber instanceof Error) return new SettingUnreadable(key, {
    cause: firstNumber
  });
  if (secondNumber instanceof Error) return new SettingUnreadable(key, {
    cause: secondNumber
  });
  if (firstNumber === null) return new SettingUnreadable(key);
  if (secondNumber === null) return new SettingUnreadable(key);
  if (!Number.isSafeInteger(firstNumber)) return new SettingUnreadable(key);
  if (!Number.isSafeInteger(secondNumber)) return new SettingUnreadable(key);
  return [
    firstNumber,
    secondNumber
  ];
}
function writeWindowPosition(store, panelWindow, position) {
  const key = POSITION_SETTING_BY_WINDOW[panelWindow];
  const text = encodeWholePair(POSITION_FIELDS, [
    "left",
    "top"
  ], [
    position.left,
    position.top
  ]);
  return store.write(STORE_KEY_BY_SETTING[key], text);
}
function encodeWholePair(fields, names, numbers) {
  const firstKey = fields[names[0]];
  const secondKey = fields[names[1]];
  assert(firstKey !== secondKey, "a pair is written under two names");
  const firstNumber = formatInteger(numbers[0]);
  const secondNumber = formatInteger(numbers[1]);
  return `{"${firstKey}":${firstNumber},"${secondKey}":${secondNumber}}`;
}
function readWindowSize(store, panelWindow) {
  const key = SIZE_SETTING_BY_WINDOW[panelWindow];
  const storedText = store.read(STORE_KEY_BY_SETTING[key]);
  if (storedText instanceof Error) return storedText;
  if (storedText === null) return null;
  if (storedText.length > PAIR_LENGTH_MAXIMUM) return new SettingTooLong(key);
  const pair = parseWholePair(storedText, key, SIZE_FIELDS, [
    "width",
    "height"
  ]);
  if (pair instanceof Error) return pair;
  const [width, height] = pair;
  if (width < 1) return new SettingUnreadable(key);
  if (height < 1) return new SettingUnreadable(key);
  return {
    width,
    height
  };
}
function writeWindowSize(store, panelWindow, size) {
  assert(size.width > 0, "a window made narrower than nothing is our bug");
  assert(size.height > 0, "and so is one made shorter than nothing");
  const key = SIZE_SETTING_BY_WINDOW[panelWindow];
  const text = encodeWholePair(SIZE_FIELDS, [
    "width",
    "height"
  ], [
    size.width,
    size.height
  ]);
  return store.write(STORE_KEY_BY_SETTING[key], text);
}
function deleteWindowSize(store, panelWindow) {
  return store.delete(STORE_KEY_BY_SETTING[SIZE_SETTING_BY_WINDOW[panelWindow]]);
}

// src/runtime/shelf-keeper.ts
var SHELF_ANSWERS_MAXIMUM = 4;
function initShelfKeeper(options) {
  let store;
  {
    const chosen = options.initShelfStore(options.choice);
    if (chosen instanceof StoreUnavailable) {
      options.defects.add({
        kind: DEFECT_KIND.kept,
        region: null,
        failure: chosen
      });
      store = initMemoryStore();
    } else store = chosen;
  }
  const opened = openShelf(store);
  if (opened instanceof Error) {
    options.defects.add({
      kind: DEFECT_KIND.kept,
      region: null,
      failure: opened
    });
    if (!isShelfSuperseded(opened)) store = initMemoryStore();
  } else if (opened.fightsUnreadable > 0) {
    const failure = new KeptFightsUnreadable(opened.fightsUnreadable);
    options.defects.add({
      kind: DEFECT_KIND.kept,
      region: null,
      failure
    });
  }
  const state = {
    options,
    store,
    choice: options.choice,
    fights: opened instanceof Error ? [] : opened.fights,
    answers: {
      isEverySlotPinned: false,
      hasStoreRefused: false,
      hasStoreMadeRoom: false,
      hasChoiceRefused: false,
      hasMoveRefused: false,
      hasPinRefused: false
    },
    fightStatesByOpenedAt: /* @__PURE__ */ new Map()
  };
  assert(state.fights.length <= KEPT_MAXIMUM, "a shelf opened is inside its stated bound");
  executeShelvedFightReplays(state);
  return {
    getFights: () => state.fights,
    getChoice: () => state.choice,
    getAnswers: () => ({
      ...state.answers
    }),
    getKeptFightStates: () => state.fightStatesByOpenedAt,
    // Keep a fight, and hold what the store answered.
    keep: (fight) => {
      const fightsAfter = [
        ...state.fights,
        fight
      ];
      const written = writeKeptFight(state.store, {
        fights: state.fights
      }, fight);
      state.answers.isEverySlotPinned = false;
      if (!(written instanceof Error)) {
        setShelfWritten(state, written.contents, rotateShelf(fightsAfter).length);
        executeShelvedFightReplays(state);
        return;
      }
      if (written instanceof EverySlotPinned) {
        state.answers.isEverySlotPinned = true;
        return;
      }
      if (written instanceof FightAlreadyKept) {
        state.options.defects.add({
          kind: DEFECT_KIND.keeping,
          region: null,
          failure: written
        });
        return;
      }
      {
        const asked = rotateShelf(fightsAfter);
        assert(asked.length <= KEPT_MAXIMUM, "what a reader asked for is inside the bound");
        state.answers.hasStoreRefused = true;
        state.answers.hasStoreMadeRoom = false;
        state.fights = asked;
      }
      executeShelvedFightReplays(state);
    },
    // Pin a fight, or take its pin off.
    pin: (openedAt) => {
      const fight = state.fights.find((keptFight) => keptFight.openedAt === openedAt);
      if (fight === void 0) return;
      const fightsAfter = state.fights.map((keptFight) => keptFight.openedAt === openedAt ? {
        ...keptFight,
        isPinned: !keptFight.isPinned
      } : keptFight);
      assert(fightsAfter.length === state.fights.length, "a pin moves no fight on or off the shelf");
      const written = writeKeptFightPin(state.store, {
        fights: state.fights
      }, openedAt, !fight.isPinned);
      if (written instanceof Error) {
        state.answers.hasPinRefused = true;
        state.fights = fightsAfter;
      } else setShelfWritten(state, written.contents, fightsAfter.length);
      executeShelvedFightReplays(state);
    },
    // Move the shelf to the store chosen. The fights go first, the answer second, and the place
    // they came from is emptied last: a store that refuses them, or a browser that will not
    // keep the answer, leaves the reader's fights where the next page will still look.
    moveShelf: (storageChoice) => {
      if (storageChoice === state.choice) {
        state.answers.hasChoiceRefused = false;
        state.answers.hasMoveRefused = false;
        return;
      }
      state.answers.hasChoiceRefused = false;
      const targetStore = state.options.initShelfStore(storageChoice);
      if (targetStore instanceof StoreUnavailable) {
        state.answers.hasMoveRefused = true;
        return;
      }
      const written = writeShelfContents(targetStore, {
        fights: state.fights
      });
      state.answers.hasMoveRefused = written instanceof Error;
      if (written instanceof Error) return;
      const answered = writeStorageChoice(state.options.settings, storageChoice);
      state.answers.hasChoiceRefused = answered instanceof Error;
      if (answered instanceof Error) return;
      const deleted = deleteShelf(state.store);
      if (deleted instanceof Error) {
        state.options.defects.add({
          kind: DEFECT_KIND.kept,
          region: null,
          failure: deleted
        });
      }
      const offered = state.fights.length;
      assert(written.contents.fights.length <= offered, "a shelf moved grows by nothing");
      state.choice = storageChoice;
      state.store = targetStore;
      setShelfWritten(state, written.contents, offered);
      executeShelvedFightReplays(state);
    }
  };
}
function executeShelvedFightReplays(state) {
  assert(state.fights.length <= KEPT_MAXIMUM, "a shelf replayed is inside its stated bound");
  for (const openedAt of [
    ...state.fightStatesByOpenedAt.keys()
  ]) {
    if (state.fights.some((keptFight) => keptFight.openedAt === openedAt)) continue;
    state.fightStatesByOpenedAt.delete(openedAt);
  }
  const { tables, sessionOptions, defects } = state.options;
  for (const fight of state.fights) {
    if (state.fightStatesByOpenedAt.has(fight.openedAt)) continue;
    const ran = attempt(() => replayKeptFight(fight, tables, sessionOptions));
    let fightState = null;
    if (ran instanceof Error) {
      defects.add({
        kind: DEFECT_KIND.kept,
        region: null,
        failure: ran
      });
    } else fightState = ran;
    if (fightState !== null) {
      const payloadsReplayedCount = fightState.messagesByPayload.length;
      assert(payloadsReplayedCount === fight.payloads.length, "a kept fight is replayed payload by payload");
    }
    state.fightStatesByOpenedAt.set(fight.openedAt, fightState);
  }
  assert(state.fightStatesByOpenedAt.size <= state.fights.length, "a reading is held for a fight on the shelf, and for nothing else");
}
function setShelfWritten(state, contents, offered) {
  assert(contents.fights.length <= offered, "a store never keeps more than it was offered");
  assert(offered <= KEPT_MAXIMUM, "and was offered a shelf inside its bound");
  state.answers.hasStoreRefused = false;
  state.answers.hasStoreMadeRoom = contents.fights.length < offered;
  state.answers.hasPinRefused = false;
  state.fights = contents.fights;
}

// src/ui/ranked-order.ts
function calculateRankedOrder(oneFigure, otherFigure, oneText, otherText) {
  const isOneStated = Number.isFinite(oneFigure);
  const isOtherStated = Number.isFinite(otherFigure);
  if (isOneStated) {
    if (!isOtherStated) return -1;
    if (otherFigure !== oneFigure) return otherFigure - oneFigure;
  } else {
    if (isOtherStated) return 1;
  }
  if (oneText === otherText) return 0;
  return oneText < otherText ? -1 : 1;
}

// src/ui/panel-screen.ts
var PANEL_METRIC = {
  damageDealt: "damageDealt",
  damageTaken: "damageTaken",
  healthGiven: "healthGiven",
  healthRestored: "healthRestored"
};
var PANEL_NOUN = {
  damage: "damage",
  healing: "healing"
};
var PANEL_DIRECTION = {
  given: "given",
  received: "received"
};
var SIDE_CHOICE = {
  everyone: "everyone",
  reader: "reader",
  opposing: "opposing"
};
var SCREEN_ORDER = Object.values(PANEL_METRIC);
var SCREEN_AXES = {
  damageDealt: {
    noun: PANEL_NOUN.damage,
    direction: PANEL_DIRECTION.given
  },
  damageTaken: {
    noun: PANEL_NOUN.damage,
    direction: PANEL_DIRECTION.received
  },
  healthGiven: {
    noun: PANEL_NOUN.healing,
    direction: PANEL_DIRECTION.given
  },
  healthRestored: {
    noun: PANEL_NOUN.healing,
    direction: PANEL_DIRECTION.received
  }
};
var SCREEN_BY_AXES = {
  damage: {
    given: PANEL_METRIC.damageDealt,
    received: PANEL_METRIC.damageTaken
  },
  healing: {
    given: PANEL_METRIC.healthGiven,
    received: PANEL_METRIC.healthRestored
  }
};
var OPENED_PART = {
  skill: "skill",
  source: "source",
  element: "element",
  plain: "plain"
};
var SIDE_CHOICES = Object.values(SIDE_CHOICE);
var OPTIONS_LIST_NAME = "options";
var SHELF_LIST_NAME = "shelf";
var OPPONENT_WORDS = {
  damageDealt: PANEL_WORDS.dealtTo,
  damageTaken: PANEL_WORDS.takenFrom,
  healthGiven: PANEL_WORDS.dealtTo,
  healthRestored: PANEL_WORDS.takenFrom
};
var KIND_WORDS = {
  damageDealt: PANEL_WORDS.damageKind,
  damageTaken: PANEL_WORDS.damageKind,
  healthGiven: PANEL_WORDS.healthSource,
  healthRestored: PANEL_WORDS.healthSource
};
function createScreenState(isMeterCollapsed, isHelperCollapsed, typeStep, windowSizes) {
  const state = {
    metric: PANEL_METRIC.damageDealt,
    side: SIDE_CHOICE.everyone,
    isOnShelf: false,
    isOnOptions: false,
    openedCombatantId: null,
    openUnnamedEnd: null,
    pairCombatantId: null,
    openPart: null,
    chosenFightOpenedAt: null,
    isMeterCollapsed,
    isHelperCollapsed,
    typeStep,
    windowSizes
  };
  return state;
}
function composeListName(screen, fightId) {
  if (screen.isOnOptions) return OPTIONS_LIST_NAME;
  if (screen.isOnShelf) return SHELF_LIST_NAME;
  const partName = screen.openPart === null ? "" : composeNameForPart(screen.openPart);
  const name = [
    screen.metric,
    screen.side,
    `${fightId}`,
    `${screen.openedCombatantId}`,
    `${screen.openUnnamedEnd}`,
    `${screen.pairCombatantId}`,
    partName
  ].join("|");
  return name;
}
function composeNameForPart(openedPart) {
  if (openedPart.kind === OPENED_PART.skill) return `${OPENED_PART.skill}:${openedPart.name}`;
  if (openedPart.kind === OPENED_PART.source) return `${OPENED_PART.source}:${openedPart.source}`;
  if (openedPart.kind === OPENED_PART.plain) return `${OPENED_PART.plain}:`;
  return `${OPENED_PART.element}:${openedPart.element}`;
}
function getWordsForOpponentCut(metric) {
  return OPPONENT_WORDS[metric];
}
function getWordsForKindCut(metric) {
  return KIND_WORDS[metric];
}
function getNounForMetric(metric) {
  return SCREEN_AXES[metric].noun;
}
function getDirectionForMetric(metric) {
  return SCREEN_AXES[metric].direction;
}
function getWordsForMetric(metric) {
  const axes = SCREEN_AXES[metric];
  return `${getWordsForNoun(axes.noun)} ${getDirectionWordsForMetric(metric)}`;
}
function presentNounStrips(metricShown) {
  const strips = Object.values(PANEL_NOUN).map((noun) => ({
    name: getScreenAfterNoun(noun, metricShown),
    words: getWordsForNoun(noun),
    isCurrent: noun === SCREEN_AXES[metricShown].noun
  }));
  return strips;
}
function getScreenAfterNoun(noun, metricShown) {
  return SCREEN_BY_AXES[noun][SCREEN_AXES[metricShown].direction];
}
function presentDirectionStrips(metricShown) {
  const strips = getScreensForNoun(SCREEN_AXES[metricShown].noun).map((screen) => ({
    name: screen,
    words: getDirectionWordsForMetric(screen),
    isCurrent: screen === metricShown
  }));
  return strips;
}
function getScreensForNoun(noun) {
  const screens = SCREEN_ORDER.filter((screen) => SCREEN_AXES[screen].noun === noun);
  return screens;
}
function presentSideStrips(sideShown) {
  const strips = SIDE_CHOICES.map((choice) => ({
    name: choice,
    words: getWordsForSide(choice),
    isCurrent: choice === sideShown
  }));
  return strips;
}

// src/ui/panel-content.ts
var UNNAMED_END = {
  actor: "actor",
  target: "target"
};
var PINNED_PLACING = {
  apart: "apart",
  cut: "cut"
};
var PINNED_CASE = {
  dealtWithNoActor: "dealtWithNoActor",
  givenWithNoActor: "givenWithNoActor",
  takenWithNoActor: "takenWithNoActor",
  takenWithNoTarget: "takenWithNoTarget",
  restoredWithNoActor: "restoredWithNoActor"
};
var HALF_NAMED_FIELD = {
  damageTakenFromNobody: "damageTakenFromNobody",
  damageDealtToNobody: "damageDealtToNobody",
  healthRestoredByNobody: "healthRestoredByNobody"
};
var HALF_NAMED_TOTAL_FIELD = {
  damageDealtByNobody: "damageDealtByNobody",
  damageTakenByNobody: "damageTakenByNobody",
  healthGivenByNobody: "healthGivenByNobody",
  healthRestoredToNobody: "healthRestoredToNobody"
};
var HALF_NAMED_KIND_FIELD = {
  damageTakenFromNobodyByKind: "damageTakenFromNobodyByKind",
  damageDealtToNobodyByKind: "damageDealtToNobodyByKind",
  healthRestoredByNobodyByKey: "healthRestoredByNobodyByKey"
};
var HALF_NAMED_OPENED = {
  person: "person",
  element: "element"
};
var SIDE_RELATION = {
  reader: "reader",
  opposing: "opposing",
  nobody: "nobody"
};
var ROWS_MAXIMUM2 = COMBATANTS_MAXIMUM;
var CUT_PARTS_MAXIMUM = CUT_MAXIMUM;
var SKILLS_MAXIMUM2 = SKILLS_MAXIMUM;
var RANKING_ROWS = 11;
var SIDE_ROWS = 10;
var PINNED_SHAPES = {
  dealtWithNoActor: {
    metric: PANEL_METRIC.damageDealt,
    end: UNNAMED_END.actor,
    placing: PINNED_PLACING.apart,
    field: HALF_NAMED_FIELD.damageTakenFromNobody,
    kinds: HALF_NAMED_KIND_FIELD.damageTakenFromNobodyByKind
  },
  givenWithNoActor: {
    metric: PANEL_METRIC.healthGiven,
    end: UNNAMED_END.actor,
    placing: PINNED_PLACING.apart,
    field: HALF_NAMED_FIELD.healthRestoredByNobody,
    kinds: HALF_NAMED_KIND_FIELD.healthRestoredByNobodyByKey
  },
  takenWithNoActor: {
    metric: PANEL_METRIC.damageTaken,
    end: UNNAMED_END.actor,
    placing: PINNED_PLACING.cut,
    field: HALF_NAMED_FIELD.damageTakenFromNobody,
    kinds: HALF_NAMED_KIND_FIELD.damageTakenFromNobodyByKind
  },
  takenWithNoTarget: {
    metric: PANEL_METRIC.damageTaken,
    end: UNNAMED_END.target,
    placing: PINNED_PLACING.apart,
    field: HALF_NAMED_FIELD.damageDealtToNobody,
    kinds: HALF_NAMED_KIND_FIELD.damageDealtToNobodyByKind
  },
  restoredWithNoActor: {
    metric: PANEL_METRIC.healthRestored,
    end: UNNAMED_END.actor,
    placing: PINNED_PLACING.cut,
    field: HALF_NAMED_FIELD.healthRestoredByNobody,
    kinds: HALF_NAMED_KIND_FIELD.healthRestoredByNobodyByKey
  }
};
var PINNED_CASES = Object.values(PINNED_CASE);
var HALF_NAMED_TOTAL_FIELD_BY_METRIC = {
  damageDealt: HALF_NAMED_TOTAL_FIELD.damageDealtByNobody,
  damageTaken: HALF_NAMED_TOTAL_FIELD.damageTakenByNobody,
  healthGiven: HALF_NAMED_TOTAL_FIELD.healthGivenByNobody,
  healthRestored: HALF_NAMED_TOTAL_FIELD.healthRestoredToNobody
};
var OPENED_UNNAMED_CASES = {
  damageDealt: PINNED_CASE.takenWithNoTarget,
  damageTaken: PINNED_CASE.takenWithNoActor,
  healthGiven: null,
  healthRestored: PINNED_CASE.restoredWithNoActor
};
var SUSPICIONS_MAXIMUM = 6;
var ROW_SUSPICIONS_MAXIMUM = 3;
function getEndForPinned(pinnedCase) {
  return PINNED_SHAPES[pinnedCase].end;
}
function getMetricForPinned(pinnedCase) {
  return PINNED_SHAPES[pinnedCase].metric;
}
function lookupPinnedCase(metric, end) {
  const pinnedCases = PINNED_CASES.filter((pinnedCase) => {
    const shape = PINNED_SHAPES[pinnedCase];
    if (shape.metric !== metric) return false;
    return shape.end === end;
  });
  return pinnedCases[0] ?? null;
}
function formatRowSuspicions(detail, metric) {
  const said = [
    formatUnknownKeyRowSuspicion(detail.unreadMessagesUnknownKey),
    formatNoParameterRowSuspicion(detail.unreadMessagesNoParameter)
  ];
  if (getNounForMetric(metric) === PANEL_NOUN.healing) {
    said.push(formatUnplacedHealRowSuspicion(detail.sideHealsUnsized));
  }
  return said.filter((sentence) => sentence.length > 0).slice(0, ROW_SUSPICIONS_MAXIMUM);
}
function isRowSuspect(detail, metric) {
  if (detail.unreadMessagesUnknownKey > 0) return true;
  if (detail.unreadMessagesNoParameter > 0) return true;
  if (getNounForMetric(metric) !== PANEL_NOUN.healing) return false;
  return detail.sideHealsUnsized > 0;
}
function presentUnnamedLevel(statistics, roster, pinnedCase, choice, readerSide) {
  const { parts, sideListed } = composeHalfNamedListing(statistics, roster, pinnedCase, choice, readerSide);
  const total = tallyPinnedFigure(statistics, pinnedCase, parts, sideListed);
  if (total <= 0) return null;
  const neither = getNeitherEndForPinned(statistics, pinnedCase, sideListed);
  const largest = calculateLargestFigure([
    ...parts.map((halfNamedPart) => halfNamedPart.figure),
    neither
  ]);
  const shares = formatSharesApportioned([
    ...parts.map((halfNamedPart) => halfNamedPart.figure),
    neither
  ], total);
  return {
    case: pinnedCase,
    end: getEndForPinned(pinnedCase),
    total,
    rows: composeHalfNamedRows(statistics, roster, parts, shares, largest),
    kinds: composeHalfNamedKinds(statistics, pinnedCase, parts, neither, total),
    neitherEnd: neither <= 0 ? null : {
      figure: neither,
      fill: calculateBarFill(neither, largest),
      shareText: shares[parts.length] ?? ""
    }
  };
}
function composeHalfNamedListing(statistics, roster, pinnedCase, choice, readerSide) {
  const metric = getMetricForPinned(pinnedCase);
  const listed = composeRowsBeforeShares(statistics, roster, metric).filter((row) => isSideListed(row.side, choice, readerSide));
  const sideListed = getSideRelationListed(choice, readerSide);
  return {
    parts: composeHalfNamedParts(statistics, roster, pinnedCase, listed, sideListed, readerSide),
    sideListed
  };
}
function composeRowsBeforeShares(statistics, roster, metric) {
  const rows = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [combatantId, figures] of statistics.byCombatantId) {
    seen.add(combatantId);
    const combatant = roster.byId.get(combatantId);
    rows.push({
      combatantId,
      name: combatant?.name ?? null,
      side: combatant?.side ?? null,
      profession: combatant?.profession ?? null,
      figure: getFigureForMetric(figures, metric)
    });
  }
  for (const combatant of roster.byId.values()) {
    if (seen.has(combatant.id)) continue;
    rows.push({
      combatantId: combatant.id,
      name: combatant.name,
      side: combatant.side,
      profession: combatant.profession,
      figure: 0
    });
  }
  return rows;
}
function getFigureForMetric(figures, metric) {
  const figure = figures[metric];
  return figure;
}
function isSideListed(side, choice, readerSide) {
  if (choice === SIDE_CHOICE.everyone) return true;
  if (readerSide === null) return true;
  if (side === null) return false;
  if (choice === SIDE_CHOICE.reader) return side === readerSide;
  return side !== readerSide;
}
function getSideRelationListed(choice, readerSide) {
  if (choice === SIDE_CHOICE.everyone) return null;
  if (readerSide === null) return null;
  if (choice === SIDE_CHOICE.reader) return SIDE_RELATION.reader;
  return SIDE_RELATION.opposing;
}
function composeHalfNamedParts(statistics, roster, pinnedCase, rows, sideListed, readerSide) {
  const shape = PINNED_SHAPES[pinnedCase];
  const listed = new Set(rows.map((unsharedRow) => unsharedRow.combatantId));
  const halfNamedParts = [];
  for (const [combatantId, figures] of statistics.byCombatantId) {
    const figure = figures[shape.field];
    if (figure <= 0) continue;
    const sideRelation = getSideRelation(roster.byId.get(combatantId)?.side ?? null, readerSide);
    if (!isPinnedPersonKept(shape, sideRelation, listed.has(combatantId), sideListed)) continue;
    halfNamedParts.push({
      combatantId,
      figure
    });
  }
  return halfNamedParts;
}
function isPinnedPersonKept(shape, sideRelation, isListed, sideListed) {
  if (shape.placing === PINNED_PLACING.cut) return isListed;
  if (sideListed === null) return true;
  return getSideRelationCharged(sideRelation, shape.metric) === sideListed;
}
function getSideRelationCharged(sideRelation, metric) {
  if (sideRelation === SIDE_RELATION.nobody) return sideRelation;
  if (metric === PANEL_METRIC.healthGiven) return sideRelation;
  if (metric === PANEL_METRIC.healthRestored) return sideRelation;
  return sideRelation === SIDE_RELATION.reader ? SIDE_RELATION.opposing : SIDE_RELATION.reader;
}
function tallyPinnedFigure(statistics, pinnedCase, parts, sideListed) {
  let total = 0;
  for (const halfNamedPart of parts) total += halfNamedPart.figure;
  total += getNeitherEndForPinned(statistics, pinnedCase, sideListed);
  return total;
}
function getNeitherEndForPinned(statistics, pinnedCase, sideListed) {
  const shape = PINNED_SHAPES[pinnedCase];
  if (sideListed !== null) return 0;
  if (shape.placing === PINNED_PLACING.cut) return 0;
  if (getNounForMetric(shape.metric) === PANEL_NOUN.healing) return 0;
  return statistics.damageByNeitherEnd;
}
function calculateLargestFigure(figures) {
  let largest = 0;
  for (const figure of figures) {
    if (figure > largest) largest = figure;
  }
  return largest;
}
function composeHalfNamedRows(statistics, roster, parts, shares, largest) {
  const rows = parts.map((halfNamedPart, partIndex) => {
    const combatant = roster.byId.get(halfNamedPart.combatantId);
    return {
      combatantId: halfNamedPart.combatantId,
      name: combatant?.name ?? null,
      side: combatant?.side ?? null,
      profession: combatant?.profession ?? null,
      figure: halfNamedPart.figure,
      fill: calculateBarFill(halfNamedPart.figure, largest),
      shareText: shares[partIndex] ?? "",
      detail: composeRowDetailFor(statistics, roster, halfNamedPart.combatantId)
    };
  });
  rows.sort((leftRow, rightRow) => calculateRankedOrder(leftRow.figure, rightRow.figure, leftRow.name ?? "", rightRow.name ?? ""));
  return rows;
}
function calculateBarFill(figure, largest) {
  if (largest <= 0) return 0;
  return figure / largest;
}
function composeRowDetailFor(statistics, roster, combatantId) {
  return composeRowDetail(statistics.byCombatantId.get(combatantId) ?? createCombatantFigures(), roster.byId.get(combatantId)?.level ?? null, wasAnyTurnLost(statistics), statistics.legendaryBonuses.byHolderId.get(combatantId) ?? /* @__PURE__ */ new Map(), statistics.legendaryBonuses.byReachedId.get(combatantId) ?? /* @__PURE__ */ new Map());
}
function composeRowDetail(figures, level, wasTurnLostRead, legendaryBonuses, legendaryBonusesReached) {
  return {
    level,
    damageDealt: figures.damageDealt,
    damageTaken: figures.damageTaken,
    damageDealtRaw: figures.damageDealtRaw,
    damageTakenRaw: figures.damageTakenRaw,
    healthGiven: figures.healthGiven,
    healthRestored: figures.healthRestored,
    damagePrevented: figures.damagePrevented,
    blowsStruck: figures.blowsStruck,
    blowsWithoutSkill: figures.blowsWithoutSkill,
    skillUses: tallySkillUses(figures),
    turnsTaken: figures.turnsTaken,
    turnsLost: figures.turnsLost,
    wasTurnLostRead,
    damageDealtToNobody: figures.damageDealtToNobody,
    damageTakenFromNobody: figures.damageTakenFromNobody,
    healthRestoredByNobody: figures.healthRestoredByNobody,
    blowsCritical: figures.blowsCritical,
    procsWhenStriking: composeCutParts(figures.procsWhenStriking),
    procsWhenStruck: composeCutParts(figures.procsWhenStruck),
    damagePreventedByDefence: composeCutParts(figures.damagePreventedByDefence),
    damageDealtAbsorbedByDefence: composeCutParts(figures.damageDealtAbsorbedByDefence),
    damageTakenAbsorbedByDefence: composeCutParts(figures.damageTakenAbsorbedByDefence),
    statisticsDestroyed: composeCutParts(figures.statisticsDestroyed),
    legendaryBonuses: composeCutParts(legendaryBonuses),
    legendaryBonusesReached: composeCutParts(legendaryBonusesReached),
    unreadMessagesUnknownKey: figures.unreadMessagesUnknownKey,
    unreadMessagesNoParameter: figures.unreadMessagesNoParameter,
    sideHealsUnsized: figures.sideHealsUnsized
  };
}
function tallySkillUses(figures) {
  let uses = 0;
  for (const skill of figures.skills.values()) {
    uses += skill.uses;
  }
  return uses;
}
function composeCutParts(cut) {
  const parts = [];
  for (const [key, figure] of cut) {
    if (figure > 0) parts.push({
      key,
      figure
    });
  }
  parts.sort((leftPart, rightPart) => calculateRankedOrder(leftPart.figure, rightPart.figure, leftPart.key, rightPart.key));
  return parts.slice(0, CUT_PARTS_MAXIMUM);
}
function wasAnyTurnLost(statistics) {
  let walked = 0;
  for (const figures of statistics.byCombatantId.values()) {
    if (figures.turnsLost > 0) return true;
    walked += 1;
    if (walked >= ROWS_MAXIMUM2) break;
  }
  return false;
}
function composeHalfNamedKinds(statistics, pinnedCase, parts, neither, total) {
  const shape = PINNED_SHAPES[pinnedCase];
  const folded = /* @__PURE__ */ new Map();
  let rest = 0;
  for (const halfNamedPart of parts) {
    const figures = statistics.byCombatantId.get(halfNamedPart.combatantId);
    if (figures === void 0) continue;
    rest += addFoldedCut(folded, figures[shape.kinds]);
  }
  if (neither > 0) rest += addFoldedCut(folded, statistics.damageByNeitherEndByKind);
  return composeElementCut(folded, total, rest, (element) => {
    return getHalfNamedByKind(statistics, shape.kinds, parts, element).length > 0;
  });
}
function addFoldedCut(folded, cut) {
  let rest = 0;
  for (const [key, figure] of cut) {
    if (folded.has(key)) {
      folded.set(key, (folded.get(key) ?? 0) + figure);
      continue;
    }
    if (folded.size >= CUT_PARTS_MAXIMUM) {
      rest += figure;
      continue;
    }
    folded.set(key, figure);
  }
  return rest;
}
function composeElementCut(cut, total, rest, doesOpen) {
  const stated = [];
  let partsTotal = rest;
  for (const [element, figure] of cut) {
    partsTotal += figure;
    if (figure > 0) stated.push({
      element,
      figure
    });
  }
  stated.sort((leftRow, rightRow) => calculateRankedOrder(leftRow.figure, rightRow.figure, leftRow.element, rightRow.element));
  const unnamed = total - partsTotal;
  const figures = stated.map((elementRow) => elementRow.figure);
  if (rest > 0) figures.push(rest);
  if (unnamed > 0) figures.push(unnamed);
  const shares = formatSharesApportioned(figures, total);
  const largest = calculateLargestFigure(figures);
  const closing = stated.length + (rest > 0 ? 1 : 0);
  return {
    rows: stated.map((elementRow, rowIndex) => ({
      ...elementRow,
      doesOpenPart: doesOpen(elementRow.element),
      fill: calculateBarFill(elementRow.figure, largest),
      shareText: shares[rowIndex] ?? ""
    })),
    rest: rest > 0 ? {
      figure: rest,
      fill: calculateBarFill(rest, largest),
      shareText: shares[stated.length] ?? ""
    } : null,
    noKind: unnamed > 0 ? {
      figure: unnamed,
      fill: calculateBarFill(unnamed, largest),
      shareText: shares[closing] ?? ""
    } : null
  };
}
function getHalfNamedByKind(statistics, kinds, parts, element) {
  const halfNamedParts = [];
  for (const halfNamedPart of parts) {
    const figures = statistics.byCombatantId.get(halfNamedPart.combatantId);
    if (figures === void 0) continue;
    const figure = figures[kinds].get(element) ?? 0;
    if (figure <= 0) continue;
    halfNamedParts.push({
      combatantId: halfNamedPart.combatantId,
      figure
    });
  }
  return halfNamedParts;
}
function presentUnnamedCutLevel(statistics, roster, pinnedCase, choice, readerSide, opened) {
  const { parts, sideListed } = composeHalfNamedListing(statistics, roster, pinnedCase, choice, readerSide);
  if (opened.kind === HALF_NAMED_OPENED.person) {
    return composeHalfNamedForPerson(statistics, roster, pinnedCase, parts, opened.combatantId);
  }
  return composeHalfNamedForKind(statistics, roster, pinnedCase, {
    parts,
    sideListed
  }, opened);
}
function composeHalfNamedForPerson(statistics, roster, pinnedCase, parts, combatantId) {
  const personPart = parts.find((halfNamedPart) => halfNamedPart.combatantId === combatantId);
  if (personPart === void 0) return null;
  const figures = statistics.byCombatantId.get(combatantId);
  if (figures === void 0) return null;
  const [row] = composeHalfNamedRows(statistics, roster, [
    personPart
  ], [
    formatShareRounded(1)
  ], personPart.figure);
  if (row === void 0) return null;
  return {
    opened: HALF_NAMED_OPENED.person,
    case: pinnedCase,
    row,
    total: personPart.figure,
    kinds: composeElementCut(figures[PINNED_SHAPES[pinnedCase].kinds], personPart.figure, 0, () => false)
  };
}
function composeHalfNamedForKind(statistics, roster, pinnedCase, listing, opened) {
  const shape = PINNED_SHAPES[pinnedCase];
  const carriers = getHalfNamedByKind(statistics, shape.kinds, listing.parts, opened.element);
  if (carriers.length === 0) return null;
  const neitherEndPinned = getNeitherEndForPinned(statistics, pinnedCase, listing.sideListed);
  const neither = neitherEndPinned <= 0 ? 0 : statistics.damageByNeitherEndByKind.get(opened.element) ?? 0;
  let total = neither;
  for (const carrier of carriers) total += carrier.figure;
  if (total <= 0) return null;
  const figures = [
    ...carriers.map((carrier) => carrier.figure),
    neither
  ];
  const shares = formatSharesApportioned(figures, total);
  const largest = calculateLargestFigure(figures);
  return {
    opened: HALF_NAMED_OPENED.element,
    case: pinnedCase,
    element: opened.element,
    end: shape.end,
    total,
    rows: composeHalfNamedRows(statistics, roster, carriers, shares, largest),
    neitherEnd: neither <= 0 ? null : {
      figure: neither,
      fill: calculateBarFill(neither, largest),
      shareText: shares[carriers.length] ?? ""
    }
  };
}
function presentUnnamedPairLevel(statistics, roster, metric, combatantId) {
  const pinnedCase = OPENED_UNNAMED_CASES[metric];
  if (pinnedCase === null) return null;
  const figures = statistics.byCombatantId.get(combatantId);
  if (figures === void 0) return null;
  const shape = PINNED_SHAPES[pinnedCase];
  const figure = figures[shape.field];
  if (figure <= 0) return null;
  const [row] = composeHalfNamedRows(statistics, roster, [
    {
      combatantId,
      figure
    }
  ], [
    formatShareRounded(1)
  ], figure);
  if (row === void 0) return null;
  return {
    opened: HALF_NAMED_OPENED.person,
    case: pinnedCase,
    row,
    total: figure,
    kinds: composeElementCut(figures[shape.kinds], figure, 0, () => false)
  };
}
function getOutcomeForReaderSide(outcome, roster, readerSide) {
  if (outcome.isFled) return OUTCOME_RESULT.fled;
  if (outcome.isDrawn) return OUTCOME_RESULT.drawn;
  if (readerSide === null) return null;
  if (isReaderSideNamed(roster, readerSide, outcome.wonNames)) return OUTCOME_RESULT.won;
  if (isReaderSideNamed(roster, readerSide, outcome.lostNames)) return OUTCOME_RESULT.lost;
  return null;
}
function isReaderSideNamed(roster, readerSide, names) {
  for (const name of names) {
    const combatantId = lookupCombatantIdByName(roster, name);
    if (combatantId === null) continue;
    if (roster.byId.get(combatantId)?.side === readerSide) return true;
  }
  return false;
}
function presentScreen(statistics, roster, metric, choice, readerSide, suspicions) {
  const sideRows = composeRowsBeforeShares(statistics, roster, metric).filter((row) => isSideListed(row.side, choice, readerSide));
  sideRows.sort(calculateRowOrderByFigureThenId);
  const listed = sideRows.slice(0, ROWS_MAXIMUM2);
  const total = tallyListedTotal(statistics, listed, metric, choice);
  const pinned = composePinnedFigures(statistics, roster, listed, metric, choice, readerSide);
  const sides = composePanelSides(statistics, roster, metric, readerSide);
  const sideListed = getSideRelationListed(choice, readerSide);
  const pinnedApart = pinned.filter((pinnedFigure) => pinnedFigure.placing === PINNED_PLACING.apart);
  const figurePlaced = pinnedApart.reduce((sum, pinnedFigure) => sum + pinnedFigure.figure, total);
  const screenTotal = calculateCountedTotal(statistics, sides, metric, sideListed);
  const outside = Math.max(screenTotal - figurePlaced, 0);
  const whole = figurePlaced + outside;
  const shared = [
    ...listed.map((row) => row.figure),
    ...pinnedApart.map((pinnedFigure) => pinnedFigure.figure)
  ];
  if (outside > 0) shared.push(outside);
  const shares = formatSharesApportioned(shared, whole);
  const largest = calculateLargestFigure([
    ...shared,
    ...pinned.map((pinnedFigure) => pinnedFigure.figure)
  ]);
  const rows = listed.map((row, rowIndex) => ({
    ...row,
    fill: calculateBarFill(row.figure, largest),
    shareText: shares[rowIndex] ?? "",
    detail: composeRowDetailFor(statistics, roster, row.combatantId)
  }));
  let hasFiguresDisagreed;
  if (screenTotal < figurePlaced) {
    hasFiguresDisagreed = true;
  } else {
    hasFiguresDisagreed = pinned.some((pinnedFigure) => hasPinnedTotalDisagreed(statistics, pinnedFigure.case, pinnedFigure.figure, sideListed));
  }
  return {
    rows,
    hasFiguresDisagreed,
    outcome: getFightOutcomeForReaderSide(statistics, roster, readerSide),
    ...composeHeadcount(statistics, roster, readerSide),
    total,
    pinned: composePinnedRows(pinned, shares.slice(listed.length), whole, largest),
    outsideRanking: outside > 0 ? {
      figure: outside,
      fill: calculateBarFill(outside, largest),
      shareText: shares[shared.length - 1] ?? ""
    } : null,
    suspicions: formatScreenSuspicions(statistics, roster, metric, suspicions),
    sides,
    // Read off what the list is, and never off what was pressed: with no seat to read from
    // every list is everybody, whatever the strip last answered, and a shorter window would
    // be the height of a side nothing narrowed to.
    rowsVisibleCount: sideListed === null ? RANKING_ROWS : SIDE_ROWS
  };
}
function calculateRowOrderByFigureThenId(leftRow, rightRow) {
  if (leftRow.figure !== rightRow.figure) return rightRow.figure - leftRow.figure;
  return leftRow.combatantId - rightRow.combatantId;
}
function tallyListedTotal(statistics, rows, metric, choice) {
  if (choice === SIDE_CHOICE.everyone) return getFigureForMetric(statistics.totals, metric);
  let total = 0;
  for (const row of rows) total += row.figure;
  return total;
}
function composePinnedFigures(statistics, roster, rows, metric, choice, readerSide) {
  const sideListed = getSideRelationListed(choice, readerSide);
  const pinnedFigures = [];
  const pinned = PINNED_CASES.filter((pinnedCase) => PINNED_SHAPES[pinnedCase].metric === metric);
  for (const pinnedCase of pinned) {
    const parts = composeHalfNamedParts(statistics, roster, pinnedCase, rows, sideListed, readerSide);
    const figure = tallyPinnedFigure(statistics, pinnedCase, parts, sideListed);
    if (figure <= 0) continue;
    const shape = PINNED_SHAPES[pinnedCase];
    const neither = getNeitherEndForPinned(statistics, pinnedCase, sideListed);
    pinnedFigures.push({
      case: pinnedCase,
      end: shape.end,
      placing: shape.placing,
      figure,
      kinds: composeHalfNamedKinds(statistics, pinnedCase, parts, neither, figure)
    });
  }
  return pinnedFigures;
}
function composePanelSides(statistics, roster, metric, readerSide) {
  if (readerSide === null) return null;
  const totals = {
    reader: 0,
    opposing: 0,
    nobody: 0
  };
  const apartCase = lookupApartCase(metric);
  const apartField = apartCase === null ? null : PINNED_SHAPES[apartCase].field;
  for (const [combatantId, figures] of statistics.byCombatantId) {
    const sideRelation = getSideRelation(roster.byId.get(combatantId)?.side ?? null, readerSide);
    totals[sideRelation] += getFigureForMetric(figures, metric);
    if (apartField !== null) {
      totals[getSideRelationCharged(sideRelation, metric)] += figures[apartField];
    }
  }
  if (apartCase !== null) totals.nobody += getNeitherEndForPinned(statistics, apartCase, null);
  return totals;
}
function lookupApartCase(metric) {
  const apartCases = PINNED_CASES.filter((pinnedCase) => {
    const shape = PINNED_SHAPES[pinnedCase];
    if (shape.metric !== metric) return false;
    return shape.placing === PINNED_PLACING.apart;
  });
  return apartCases[0] ?? null;
}
function calculateCountedTotal(statistics, sides, metric, sideListed) {
  if (sideListed === null) {
    return getFigureForMetric(statistics.totals, metric) + statistics[HALF_NAMED_TOTAL_FIELD_BY_METRIC[metric]];
  }
  if (sides === null) return 0;
  if (sideListed === SIDE_RELATION.reader) return sides.reader;
  if (sideListed === SIDE_RELATION.opposing) return sides.opposing;
  return sides.nobody;
}
function hasPinnedTotalDisagreed(statistics, pinnedCase, total, sideListed) {
  if (sideListed !== null) return false;
  const shape = PINNED_SHAPES[pinnedCase];
  if (shape.placing === PINNED_PLACING.cut) return false;
  return total !== statistics[HALF_NAMED_TOTAL_FIELD_BY_METRIC[shape.metric]];
}
function getFightOutcomeForReaderSide(statistics, roster, readerSide) {
  if (statistics.outcome === null) return null;
  return getOutcomeForReaderSide(statistics.outcome, roster, readerSide);
}
function composePinnedRows(pinned, apartShares, whole, largest) {
  let taken = 0;
  return pinned.map((pinnedFigure) => {
    const shareText = pinnedFigure.placing === PINNED_PLACING.apart ? apartShares[taken++] ?? "" : formatShareRounded(whole === 0 ? 0 : pinnedFigure.figure / whole);
    return {
      ...pinnedFigure,
      fill: calculateBarFill(pinnedFigure.figure, largest),
      shareText
    };
  });
}
function formatScreenSuspicions(statistics, roster, metric, suspicions) {
  const said = formatFightSuspicions(statistics, roster, suspicions);
  if (getNounForMetric(metric) === PANEL_NOUN.healing) {
    said.push(formatUnplacedHealSuspicion(statistics.sideHealsUnsized, statistics.sideHealsStated, formatRowsReachedByGap(statistics, roster, (figures) => figures.sideHealsUnsized)));
  }
  return said.filter((sentence) => sentence.length > 0).slice(0, SUSPICIONS_MAXIMUM);
}
function formatRowsReachedByGap(statistics, roster, getCount) {
  const names = [];
  let charged = 0;
  for (const [combatantId, figures] of statistics.byCombatantId) {
    if (charged >= COMBATANTS_MAXIMUM) break;
    if (getCount(figures) <= 0) continue;
    charged += 1;
    const combatant = roster.byId.get(combatantId);
    if (combatant === void 0) continue;
    if (names.length >= NAMED_ROWS_MAXIMUM) continue;
    names.push(combatant.name);
  }
  return formatNamesReachedByGap(names, charged);
}
function formatFightSuspicions(statistics, roster, suspicions) {
  const { messagesRead, messagesLost } = suspicions;
  const said = [];
  if (suspicions.hasJoinedInProgress) said.push(formatJoinedInProgressSuspicion());
  said.push(formatLostMessageSuspicion(messagesLost, messagesRead + messagesLost));
  said.push(formatUnknownKeySuspicion(statistics.unreadMessagesUnknownKey, messagesRead, formatRowsReachedByGap(statistics, roster, (figures) => figures.unreadMessagesUnknownKey)));
  said.push(formatNoParameterSuspicion(statistics.unreadMessagesNoParameter, messagesRead, formatRowsReachedByGap(statistics, roster, (figures) => figures.unreadMessagesNoParameter)));
  said.push(formatGrammarRefusedSuspicion(statistics.unreadMessagesGrammarRefused, messagesRead));
  return said.filter((sentence) => sentence.length > 0);
}
function composeHeadcount(statistics, roster, readerSide) {
  const countBySide = /* @__PURE__ */ new Map();
  let unplaced = 0;
  const everybody = /* @__PURE__ */ new Set([
    ...statistics.byCombatantId.keys(),
    ...roster.byId.keys()
  ]);
  for (const combatantId of everybody) {
    const side = roster.byId.get(combatantId)?.side ?? null;
    if (side === null) unplaced += 1;
    else countBySide.set(side, (countBySide.get(side) ?? 0) + 1);
  }
  const sides = [
    ...countBySide
  ].sort(([leftSide], [rightSide]) => {
    if (readerSide === leftSide) return -1;
    if (readerSide === rightSide) return 1;
    return leftSide - rightSide;
  });
  const sizes = sides.map(([, count]) => count);
  return {
    sizes,
    unplaced
  };
}
function getSideRelation(side, readerSide) {
  if (side === null) return SIDE_RELATION.nobody;
  if (readerSide === null) return SIDE_RELATION.nobody;
  return side === readerSide ? SIDE_RELATION.reader : SIDE_RELATION.opposing;
}
function getTextForNamedPart(openedPart) {
  if (openedPart.kind === OPENED_PART.skill) return openedPart.name;
  if (openedPart.kind === OPENED_PART.source) return openedPart.source;
  if (openedPart.kind === OPENED_PART.element) return openedPart.element;
  return "";
}
function presentPartLevel(statistics, roster, metric, combatantId, openedPart) {
  const figures = statistics.byCombatantId.get(combatantId);
  if (figures === void 0) return null;
  const cut = composePeopleForPart(statistics, figures, metric, combatantId, openedPart);
  if (cut === null) return null;
  const total = tallyPartTotal(figures, metric, openedPart, cut);
  const byOtherEnd = composeOpponentCut(cut, statistics, roster, {
    figure: total,
    unnamedOpened: null
  }, () => false);
  return {
    part: openedPart,
    total,
    byOtherEnd,
    hasFiguresDisagreed: byOtherEnd.hasFiguresDisagreed
  };
}
function composePeopleForPart(statistics, figures, metric, combatantId, openedPart) {
  if (openedPart.kind === OPENED_PART.skill) {
    return composePeopleForSkill(statistics, figures, metric, combatantId, openedPart.name);
  }
  if (openedPart.kind === OPENED_PART.plain) {
    if (getNounForMetric(metric) !== PANEL_NOUN.damage) return null;
    const cut = getDirectionForMetric(metric) === PANEL_DIRECTION.given ? figures.damageDealtWithoutSkillByOpponent : figures.damageTakenWithoutSkillByOpponent;
    return composeCutWithoutZeros(cut);
  }
  if (openedPart.kind === OPENED_PART.source) {
    if (metric !== PANEL_METRIC.healthGiven) return null;
    return composePeopleForKey(figures.healthGivenWithoutSkillByReceiverAndKey, openedPart.source);
  }
  if (metric === PANEL_METRIC.damageDealt) {
    return composePeopleForKey(figures.damageDealtByOpponentAndKind, openedPart.element);
  }
  if (metric === PANEL_METRIC.damageTaken) {
    return composePeopleForKey(figures.damageTakenByOpponentAndKind, openedPart.element);
  }
  return null;
}
function composePeopleForSkill(statistics, figures, metric, combatantId, name) {
  const isDamage = getNounForMetric(metric) === PANEL_NOUN.damage;
  if (getDirectionForMetric(metric) === PANEL_DIRECTION.given) {
    const skill = figures.skills.get(name);
    if (skill === void 0) return null;
    return composeCutWithoutZeros(isDamage ? skill.damageDealtByOpponent : skill.healthGivenByReceiver);
  }
  const reached = /* @__PURE__ */ new Map();
  for (const [otherId, otherFigures] of statistics.byCombatantId) {
    for (const skill of otherFigures.skills.values()) {
      if (skill.name !== name) continue;
      const cut = isDamage ? skill.damageDealtByOpponent : skill.healthGivenByReceiver;
      const figure = cut.get(`${combatantId}`) ?? 0;
      if (figure > 0) reached.set(`${otherId}`, (reached.get(`${otherId}`) ?? 0) + figure);
    }
  }
  return reached.size === 0 ? null : reached;
}
function composeCutWithoutZeros(cut) {
  const stated = /* @__PURE__ */ new Map();
  for (const [otherEnd, figure] of cut) {
    if (figure > 0) stated.set(otherEnd, figure);
  }
  return stated.size === 0 ? null : stated;
}
function composePeopleForKey(pairs, named) {
  const reached = /* @__PURE__ */ new Map();
  for (const [otherEnd, cut] of pairs) {
    const figure = cut.get(named) ?? 0;
    if (figure > 0) reached.set(otherEnd, figure);
  }
  return reached.size === 0 ? null : reached;
}
function tallyPartTotal(figures, metric, openedPart, cut) {
  if (openedPart.kind === OPENED_PART.element) {
    return getCutsForMetric(figures, metric).byElement?.get(openedPart.element) ?? tallyCut(cut);
  }
  if (openedPart.kind === OPENED_PART.skill) {
    if (getDirectionForMetric(metric) === PANEL_DIRECTION.given) {
      const skill = figures.skills.get(openedPart.name);
      if (skill === void 0) return tallyCut(cut);
      return getNounForMetric(metric) === PANEL_NOUN.damage ? skill.damageDealt : skill.healthGiven;
    }
  }
  return tallyCut(cut);
}
function getCutsForMetric(figures, metric) {
  if (metric === PANEL_METRIC.damageDealt) {
    return {
      byOtherEnd: figures.damageDealtByOpponent,
      byElement: figures.damageDealtByKind
    };
  }
  if (metric === PANEL_METRIC.damageTaken) {
    return {
      byOtherEnd: figures.damageTakenByOpponent,
      byElement: figures.damageTakenByKind
    };
  }
  if (metric === PANEL_METRIC.healthGiven) {
    return {
      byOtherEnd: figures.healthGivenByReceiver,
      byElement: null
    };
  }
  return {
    byOtherEnd: figures.healthRestoredByGiver,
    byElement: figures.healthRestoredByKey
  };
}
function tallyCut(cut) {
  let total = 0;
  for (const figure of cut.values()) total += figure;
  return total;
}
function composeOpponentCut(cut, statistics, roster, totals, doesOpen) {
  const total = totals.figure;
  const stated = [];
  let partsTotal = 0;
  let hasKeyUnparsed = false;
  for (const [named, figure] of cut) {
    const otherId = parseInteger(named);
    if (otherId === null) {
      hasKeyUnparsed = true;
      continue;
    }
    partsTotal += figure;
    const combatant = roster.byId.get(otherId);
    stated.push({
      combatantId: otherId,
      name: combatant?.name ?? null,
      side: combatant?.side ?? null,
      profession: combatant?.profession ?? null,
      figure
    });
  }
  stated.sort(calculateRowOrderByFigureThenId);
  const unnamed = total - partsTotal;
  let hasFiguresDisagreed;
  if (unnamed < 0) {
    hasFiguresDisagreed = true;
  } else {
    hasFiguresDisagreed = hasKeyUnparsed;
  }
  const figures = stated.map((unsharedRow) => unsharedRow.figure);
  if (unnamed > 0) figures.push(unnamed);
  const shares = formatSharesApportioned(figures, total);
  const largest = calculateLargestFigure(figures);
  const keptKinds = totals.unnamedOpened?.total === unnamed ? totals.unnamedOpened.kinds : null;
  return {
    rows: stated.map((row, rowIndex) => ({
      ...row,
      fill: calculateBarFill(row.figure, largest),
      shareText: shares[rowIndex] ?? "",
      doesOpenPair: doesOpen(row.combatantId),
      detail: composeRowDetailFor(statistics, roster, row.combatantId)
    })),
    halfNamed: unnamed > 0 ? {
      figure: unnamed,
      fill: calculateBarFill(unnamed, largest),
      shareText: shares[stated.length] ?? "",
      doesOpenPair: keptKinds !== null,
      kinds: keptKinds
    } : null,
    hasFiguresDisagreed
  };
}
function presentPairLevel(statistics, roster, metric, combatantId, otherId) {
  const figures = statistics.byCombatantId.get(combatantId);
  if (figures === void 0) return null;
  const total = tallyPairTotal(figures, metric, otherId);
  if (total === null) return null;
  const kinds = getPairKinds(figures, metric, otherId);
  const otherCombatant = roster.byId.get(otherId);
  const parts = composePairParts(statistics, metric, combatantId, otherId, total);
  return {
    combatantId,
    otherId,
    otherName: otherCombatant?.name ?? null,
    otherProfession: otherCombatant?.profession ?? null,
    total,
    parts: parts.rows,
    hasFiguresDisagreed: parts.hasFiguresDisagreed,
    // Nothing on the last rung opens: the protocol states no further cut of a pair.
    byElement: kinds === null ? {
      rows: [],
      rest: null,
      noKind: null
    } : composeElementCut(kinds, total, 0, () => false)
  };
}
function tallyPairTotal(figures, metric, otherId) {
  if (getNounForMetric(metric) === PANEL_NOUN.damage) {
    const kinds = getPairKinds(figures, metric, otherId);
    return kinds === null ? null : tallyCut(kinds);
  }
  if (metric === PANEL_METRIC.healthGiven) {
    return figures.healthGivenByReceiver.get(`${otherId}`) ?? null;
  }
  return figures.healthRestoredByGiver.get(`${otherId}`) ?? null;
}
function getPairKinds(figures, metric, otherId) {
  if (metric === PANEL_METRIC.damageDealt) {
    return figures.damageDealtByOpponentAndKind.get(`${otherId}`) ?? null;
  }
  if (metric === PANEL_METRIC.damageTaken) {
    return figures.damageTakenByOpponentAndKind.get(`${otherId}`) ?? null;
  }
  return null;
}
function composePairParts(statistics, metric, combatantId, otherId, total) {
  const stated = composePairPartFigures(statistics, metric, combatantId, otherId);
  stated.sort((leftPart, rightPart) => calculateRankedOrder(leftPart.figure, rightPart.figure, getTextForNamedPart(leftPart.part), getTextForNamedPart(rightPart.part)));
  const partsTotal = tallyUnsharedPairParts(stated);
  const closingFigure = total - partsTotal;
  const closingFigureClamped = Math.max(closingFigure, 0);
  const statedFigures = stated.map((pairPart) => pairPart.figure);
  const figures = closingFigure === 0 ? statedFigures : [
    ...statedFigures,
    closingFigureClamped
  ];
  const shares = formatSharesApportioned(figures, total);
  const largest = calculateLargestFigure(figures);
  const rows = stated.map((pairPart, partIndex) => ({
    part: pairPart.part,
    figure: pairPart.figure,
    fill: calculateBarFill(pairPart.figure, largest),
    shareText: shares[partIndex] ?? ""
  }));
  if (closingFigure === 0) return {
    rows,
    hasFiguresDisagreed: false
  };
  rows.splice(calculatePlaceForClosing(stated, closingFigureClamped) - 1, 0, {
    part: {
      kind: OPENED_PART.plain
    },
    figure: closingFigureClamped,
    fill: calculateBarFill(closingFigureClamped, largest),
    shareText: shares[stated.length] ?? ""
  });
  return {
    rows,
    hasFiguresDisagreed: closingFigure < 0
  };
}
function composePairPartFigures(statistics, metric, combatantId, otherId) {
  const end = getPairGivingEnd(statistics, metric, combatantId, otherId);
  if (end.figures === void 0) return [];
  const isDamage = getNounForMetric(metric) === PANEL_NOUN.damage;
  const stated = [];
  for (const skill of end.figures.skills.values()) {
    const figure = isDamage ? skill.damageDealtByOpponent.get(end.subject) ?? 0 : skill.healthGivenByReceiver.get(end.subject) ?? 0;
    if (figure > 0) {
      stated.push({
        part: {
          kind: OPENED_PART.skill,
          name: skill.name
        },
        figure
      });
    }
  }
  if (isDamage) {
    const cut2 = end.figures.damageDealtWithoutSkillByOpponentAndKey.get(end.subject);
    if (cut2 === void 0) return stated;
    for (const [source, figure] of cut2) {
      if (figure <= 0) continue;
      stated.push({
        part: {
          kind: OPENED_PART.source,
          source
        },
        figure
      });
    }
    return stated;
  }
  const cut = end.figures.healthGivenWithoutSkillByReceiverAndKey.get(end.subject);
  if (cut === void 0) return stated;
  for (const [source, figure] of cut) {
    if (figure > 0) stated.push({
      part: {
        kind: OPENED_PART.source,
        source
      },
      figure
    });
  }
  return stated;
}
function getPairGivingEnd(statistics, metric, combatantId, otherId) {
  if (getDirectionForMetric(metric) === PANEL_DIRECTION.received) {
    return {
      figures: statistics.byCombatantId.get(otherId),
      subject: `${combatantId}`
    };
  }
  return {
    figures: statistics.byCombatantId.get(combatantId),
    subject: `${otherId}`
  };
}
function tallyUnsharedPairParts(parts) {
  let total = 0;
  for (const pairPart of parts) {
    total += pairPart.figure;
  }
  return total;
}
function calculatePlaceForClosing(stated, figure) {
  let bigger = 0;
  for (const row of stated) {
    if (row.figure <= figure) continue;
    bigger += 1;
  }
  return bigger + 1;
}
function presentOpenedLevel(statistics, roster, metric, combatantId) {
  const combatant = roster.byId.get(combatantId);
  const figures = statistics.byCombatantId.get(combatantId) ?? (combatant === void 0 ? void 0 : createCombatantFigures());
  if (figures === void 0) return null;
  const cuts = getCutsForMetric(figures, metric);
  const total = getFigureForMetric(figures, metric);
  const unnamedOpened = presentUnnamedPairLevel(statistics, roster, metric, combatantId);
  const byOtherEnd = composeOpponentCut(cuts.byOtherEnd, statistics, roster, {
    figure: total,
    unnamedOpened
  }, (otherId) => tallyPairTotal(figures, metric, otherId) !== null);
  const byElement = cuts.byElement === null ? {
    rows: [],
    rest: null,
    noKind: null
  } : composeElementCut(cuts.byElement, total, 0, (element) => composePeopleForPart(statistics, figures, metric, combatantId, {
    kind: OPENED_PART.element,
    element
  }) !== null);
  const bySkill = composeSkillCut(statistics, figures, metric, total, combatantId);
  return {
    combatantId,
    name: combatant?.name ?? null,
    profession: combatant?.profession ?? null,
    byOtherEnd,
    bySkill,
    byElement,
    total,
    hasFiguresDisagreed: bySkill.hasFiguresDisagreed || byOtherEnd.hasFiguresDisagreed
  };
}
function composeSkillCut(statistics, figures, metric, total, combatantId) {
  const folded = composeSkillRows(statistics, figures, metric, combatantId);
  const stated = folded.rows;
  stated.sort(calculateSkillRowOrder);
  const partsTotal = stated.reduce((sum, skillRow) => sum + skillRow.figure, folded.rest);
  const closingFigure = total - partsTotal;
  const isCounted = metric === PANEL_METRIC.damageDealt;
  let hasClosing;
  if (closingFigure > 0) {
    hasClosing = true;
  } else if (isCounted) {
    hasClosing = figures.blowsWithoutSkill > 0;
  } else {
    hasClosing = false;
  }
  const hasRest = folded.rest > 0;
  const closingFigureClamped = Math.max(closingFigure, 0);
  const figuresOnScreen = stated.map((skillRow) => skillRow.figure);
  if (hasRest) figuresOnScreen.push(folded.rest);
  if (hasClosing) figuresOnScreen.push(closingFigureClamped);
  const shares = formatSharesApportioned(figuresOnScreen, total);
  const largest = calculateLargestFigure(figuresOnScreen);
  return {
    rows: stated.map((skillRow, rowIndex) => ({
      ...skillRow,
      fill: calculateBarFill(skillRow.figure, largest),
      shareText: shares[rowIndex] ?? ""
    })),
    // ⚠️ **Last, because it is the only row of the section left holding no place.** What a
    // bound would not draw is never folded into the row below it (`develop ADR 0055`).
    rest: hasRest ? composeRestRow(folded.rest, largest, shares[stated.length] ?? "") : null,
    closing: hasClosing ? composeClosingRow({
      blows: isCounted ? figures.blowsWithoutSkill : null,
      doesOpenPart: composePeopleForPart(statistics, figures, metric, combatantId, {
        kind: OPENED_PART.plain
      }) !== null,
      figure: closingFigureClamped,
      largest,
      stated,
      shareText: shares[stated.length + (hasRest ? 1 : 0)] ?? ""
    }) : null,
    hasFiguresDisagreed: closingFigure < 0
  };
}
function composeSkillRows(statistics, figures, metric, combatantId) {
  const stated = composeSkillRowsStated(statistics, figures, metric, combatantId);
  const rows = stated.parts.map((unsharedPart) => ({
    ...unsharedPart,
    doesOpenPart: composePeopleForPart(statistics, figures, metric, combatantId, unsharedPart.part) !== null
  }));
  return {
    rows,
    rest: stated.rest
  };
}
function composeSkillRowsStated(statistics, figures, metric, combatantId) {
  if (metric === PANEL_METRIC.healthRestored) {
    const named = composeSkillRowsReceived(statistics, combatantId, (skill) => skill.healthGivenByReceiver);
    return composeFoldsJoined(named, composeSourceRows(figures.healthRestoredWithoutSkillByKey));
  }
  if (metric === PANEL_METRIC.damageTaken) {
    const named = composeSkillRowsReceived(statistics, combatantId, (skill) => skill.damageDealtByOpponent);
    return composeFoldsJoined(named, composeSourceRows(figures.damageTakenWithoutSkillByKey));
  }
  const own = [
    ...figures.skills.values()
  ];
  if (metric === PANEL_METRIC.healthGiven) {
    const given = tallyGivenSourceCut(figures);
    return composeFoldsJoined({
      parts: own.filter((skill) => skill.healthGiven > 0).map((skill) => ({
        part: {
          kind: OPENED_PART.skill,
          name: skill.name
        },
        uses: skill.uses,
        figure: skill.healthGiven
      })),
      // What the fold could not key travels with the section it was folded for, so the two
      // bounds on one path come to one row rather than to a shortfall nobody drew.
      rest: given.rest
    }, composeSourceRows(given.cut));
  }
  return composeFoldsJoined({
    parts: own.filter((skill) => {
      if (skill.damageDealt > 0) return true;
      return skill.blows > 0;
    }).map((skill) => ({
      part: {
        kind: OPENED_PART.skill,
        name: skill.name
      },
      uses: skill.uses,
      figure: skill.damageDealt
    })),
    rest: 0
  }, composeSourceRows(figures.damageDealtWithoutSkillByKey));
}
function composeSkillRowsReceived(statistics, combatantId, getCut) {
  const byName = /* @__PURE__ */ new Map();
  let rest = 0;
  for (const combatantFigures of statistics.byCombatantId.values()) {
    for (const skill of combatantFigures.skills.values()) {
      const figure = getCut(skill).get(`${combatantId}`) ?? 0;
      if (figure <= 0) continue;
      if (byName.has(skill.name)) {
        byName.set(skill.name, (byName.get(skill.name) ?? 0) + figure);
        continue;
      }
      if (byName.size >= SKILLS_MAXIMUM2) {
        rest += figure;
        continue;
      }
      byName.set(skill.name, figure);
    }
  }
  const parts = [
    ...byName
  ].map(([name, figure]) => ({
    part: {
      kind: OPENED_PART.skill,
      name
    },
    uses: null,
    figure
  }));
  return {
    parts,
    rest
  };
}
function composeFoldsJoined(skillFold, sourceFold) {
  return {
    parts: [
      ...skillFold.parts,
      ...sourceFold.parts
    ],
    rest: skillFold.rest + sourceFold.rest
  };
}
function composeSourceRows(cut) {
  const stated = [];
  let rest = 0;
  for (const [source, figure] of cut) {
    if (figure <= 0) continue;
    if (stated.length < CUT_PARTS_MAXIMUM) {
      stated.push({
        part: {
          kind: OPENED_PART.source,
          source
        },
        uses: null,
        figure
      });
      continue;
    }
    rest += figure;
  }
  return {
    parts: stated,
    rest
  };
}
function tallyGivenSourceCut(figures) {
  const folded = /* @__PURE__ */ new Map();
  let rest = 0;
  for (const cut of figures.healthGivenWithoutSkillByReceiverAndKey.values()) {
    rest += addFoldedCut(folded, cut);
  }
  return {
    cut: folded,
    rest
  };
}
function calculateSkillRowOrder(leftSkill, rightSkill) {
  return calculateRankedOrder(leftSkill.figure, rightSkill.figure, getTextForNamedPart(leftSkill.part), getTextForNamedPart(rightSkill.part));
}
function composeRestRow(figure, largest, shareText) {
  return {
    blows: null,
    figure,
    fill: calculateBarFill(figure, largest),
    shareText
  };
}
function composeClosingRow(said) {
  return {
    blows: said.blows,
    rank: calculatePlaceForClosing(said.stated, said.figure),
    doesOpenPart: said.doesOpenPart,
    figure: said.figure,
    fill: calculateBarFill(said.figure, said.largest),
    shareText: said.shareText
  };
}

// src/ui/panel-palette.ts
var SIGNAL = {
  ours: [
    0,
    208,
    131
  ],
  theirs: [
    255,
    134,
    133
  ],
  suspect: [
    237,
    156,
    0
  ],
  caveat: [
    107,
    181,
    255
  ],
  defect: [
    237,
    120,
    255
  ],
  unknown: [
    146,
    153,
    160
  ]
};
var HEX_BASE = 16;
var PALETTE_COLOURS = [
  [
    21,
    124,
    208
  ],
  [
    63,
    142,
    43
  ],
  [
    187,
    74,
    127
  ],
  [
    157,
    111,
    0
  ],
  [
    0,
    142,
    113
  ],
  [
    194,
    80,
    43
  ]
];
var PALETTE_COLOUR_BY_PROFESSION = /* @__PURE__ */ new Map([
  [
    "m",
    PALETTE_COLOURS[0]
  ],
  [
    "h",
    PALETTE_COLOURS[1]
  ],
  [
    "p",
    PALETTE_COLOURS[2]
  ],
  [
    "t",
    PALETTE_COLOURS[3]
  ],
  [
    "b",
    PALETTE_COLOURS[4]
  ],
  [
    "w",
    PALETTE_COLOURS[5]
  ]
]);
function lookupColourForProfession(profession) {
  if (profession === null) return SIGNAL.unknown;
  return PALETTE_COLOUR_BY_PROFESSION.get(profession) ?? SIGNAL.unknown;
}
function formatColour(colour) {
  return `#${colour.map((channel) => channel.toString(HEX_BASE).padStart(2, "0")).join("")}`;
}

// src/ui/panel-helper.ts
var STANDING_TURN_STATE = {
  held: "held",
  unread: "unread",
  afterFight: "afterFight",
  onAuto: "onAuto"
};
var HELPER_ABSENCE = {
  noFightYet: "noFightYet",
  betweenFights: "betweenFights",
  fightUnread: "fightUnread"
};
var PROVOKED_MAXIMUM = COMBATANTS_MAXIMUM;
var CHARGED_ROWS_MAXIMUM = CHARGED_SKILLS_MAXIMUM;
var CHARGED_PIPS_MAXIMUM = 8;
function presentHelper(provocations, chargedSkills, roster, readerSide, turn) {
  const provocationsBounded = provocations.slice(0, PROVOKED_MAXIMUM);
  const now = getStandingTurnNow(turn);
  const holder = now === null ? void 0 : roster.byId.get(now.combatantId);
  return {
    turnState: getStandingTurnState(turn, holder !== void 0),
    turnOrdinal: now?.ordinal ?? null,
    turnHolder: holder === void 0 ? null : {
      name: holder.name,
      colour: lookupColourForProfession(holder.profession),
      sideRelation: getSideRelation(holder.side, readerSide)
    },
    provocations: presentStandingProvocations(provocationsBounded, roster, readerSide),
    chargedSkills: presentStandingChargedSkills(chargedSkills, roster, readerSide),
    hasFiguresDisagreed: hasHelperFiguresDisagreed(provocations, chargedSkills)
  };
}
function hasHelperFiguresDisagreed(provocations, chargedSkills) {
  if (provocations.length > PROVOKED_MAXIMUM) return true;
  if (chargedSkills.length > CHARGED_ROWS_MAXIMUM) return true;
  return chargedSkills.some((standing) => isChargedSkillUndrawable(standing));
}
function isChargedSkillUndrawable(standing) {
  if (standing.skillName.length === 0) return true;
  return standing.turnsStated > CHARGED_PIPS_MAXIMUM;
}
function getStandingTurnNow(turn) {
  if (turn.isOnAuto) return null;
  if (turn.isOver) return null;
  return turn.statement;
}
function getStandingTurnState(turn, hasHolder) {
  if (turn.isOnAuto) return STANDING_TURN_STATE.onAuto;
  if (turn.isOver) return STANDING_TURN_STATE.afterFight;
  if (hasHolder) return STANDING_TURN_STATE.held;
  return STANDING_TURN_STATE.unread;
}
function presentStandingProvocations(provocations, roster, readerSide) {
  const byCast = /* @__PURE__ */ new Map();
  for (const standing of provocations) {
    const caster = roster.byId.get(standing.casterId);
    const key = `${standing.casterId}/${standing.skillId}`;
    const group = byCast.get(key) ?? {
      casterId: standing.casterId,
      casterName: caster?.name ?? PANEL_WORDS.withoutActor,
      skillId: standing.skillId,
      skillName: standing.skillName,
      casterColour: lookupColourForProfession(caster?.profession ?? null),
      casterSideRelation: getSideRelation(caster?.side ?? null, readerSide),
      provoked: []
    };
    group.provoked.push(presentStandingProvoked(standing, roster, readerSide));
    byCast.set(key, group);
  }
  return [
    ...byCast.values()
  ];
}
function presentStandingProvoked(standing, roster, readerSide) {
  const provoked = roster.byId.get(standing.provokedId);
  return {
    provokedId: standing.provokedId,
    name: provoked?.name ?? PANEL_WORDS.withoutTarget,
    colour: lookupColourForProfession(provoked?.profession ?? null),
    sideRelation: getSideRelation(provoked?.side ?? null, readerSide),
    turnsElapsed: standing.turnsElapsed,
    turnsStated: standing.turnsStated
  };
}
function presentStandingChargedSkills(standings, roster, readerSide) {
  const composed = [];
  for (const standing of standings) {
    if (composed.length >= CHARGED_ROWS_MAXIMUM) break;
    if (standing.skillName.length === 0) continue;
    composed.push(presentStandingChargedSkill(standing, roster, readerSide));
  }
  return composed;
}
function presentStandingChargedSkill(standing, roster, readerSide) {
  const combatant = roster.byId.get(standing.combatantId);
  return {
    combatantId: standing.combatantId,
    name: combatant?.name ?? PANEL_WORDS.withoutActor,
    skillName: standing.skillName,
    turnsElapsed: standing.turnsElapsed,
    turnsStated: standing.turnsStated,
    state: standing.state,
    colour: getColourForCharge(standing.state, combatant?.profession ?? null),
    sideRelation: getSideRelation(combatant?.side ?? null, readerSide)
  };
}
function getColourForCharge(state, profession) {
  if (state !== CHARGED_SKILL_STATE.charging) return SIGNAL.unknown;
  return lookupColourForProfession(profession);
}

// src/runtime/panel-frame.ts
var FIGURES_CUT = {
  screen: "screen",
  drill: "drill",
  pair: "pair",
  part: "part",
  helper: "helper"
};
var FiguresDisagreed = class extends Error {
  name = "FiguresDisagreed";
  cut;
  constructor(cut) {
    super();
    this.cut = cut;
  }
};
var MargonemEngineTooltipRefused = class extends Error {
  name = "MargonemEngineTooltipRefused";
  refused;
  constructor(refused) {
    super();
    this.refused = refused;
  }
};
function renderFrame(parts) {
  assert(parts.keeper.getFights().length <= KEPT_MAXIMUM, "a frame draws a shelf inside its bound");
  const tooltips = attempt(() => {
    const view = composeFightView(parts.live.session);
    if (view === null) return;
    const written = writeCarriedTooltips(view, parts.tables, parts.translate, parts.tooltip);
    if (written instanceof Error) addRegionDefect(parts, written);
    else if (written.refused > 0) {
      addRegionDefect(parts, new MargonemEngineTooltipRefused(written.refused));
    } else assert(written.refused === 0, "a frame whose blocks all landed marks nothing");
  });
  if (tooltips instanceof Error) addRegionDefect(parts, tooltips);
  {
    const isShelfEmpty = parts.keeper.getFights().length === 0;
    const helperRead = attempt(() => presentHelperForFrame(parts.live, parts.tables, isShelfEmpty));
    let helper;
    if (helperRead instanceof Error) {
      parts.defects.add({
        kind: DEFECT_KIND.reading,
        region: null,
        failure: helperRead
      });
      helper = HELPER_ABSENCE.fightUnread;
    } else {
      helper = helperRead;
      if (isHelperFiguresDisagreed(helperRead)) {
        parts.defects.add({
          kind: DEFECT_KIND.figures,
          region: null,
          failure: new FiguresDisagreed(FIGURES_CUT.helper)
        });
      }
    }
    addUndrawnDefects(parts.defects, parts.view.renderHelper(helper, parts.screen.isHelperCollapsed));
  }
  const defects = getPanelDefects(parts.defects);
  const rendered = attempt(() => {
    const { screen, keeper, live: liveFight } = parts;
    const liveView = composeFightView(liveFight.session);
    const shownFight = lookupShownFight(liveView, screen.chosenFightOpenedAt, keeper.getFights(), keeper.getKeptFightStates());
    if (shownFight === null) {
      const unreadKeptFight = lookupShownKeptFight(liveView !== null, screen.chosenFightOpenedAt, keeper.getFights());
      const keptUnread = unreadKeptFight === void 0 ? null : {
        at: parts.clock.readMoment(unreadKeptFight.openedAt),
        place: formatFightPlace(unreadKeptFight.place)
      };
      const waiting2 = {
        isMeterCollapsed: screen.isMeterCollapsed,
        defects,
        hasFightToSave: false
      };
      const renderedWaiting = parts.view.renderWaiting({
        ...waiting2,
        isFightUnread: false,
        keptUnread,
        options: presentOptions(parts),
        typeStep: screen.typeStep,
        windowSizes: screen.windowSizes
      });
      addUndrawnDefects(parts.defects, renderedWaiting);
      return;
    }
    assert(shownFight.fightState.view.payloadsApplied > 0, "a fight stood on was read from something");
    let liveFightState;
    if (shownFight.keptFight === null) liveFightState = shownFight.fightState;
    else if (liveView === null) liveFightState = null;
    else {
      const tallied = attempt(() => tallyFightState(liveView));
      if (tallied instanceof Error) {
        parts.defects.add({
          kind: DEFECT_KIND.reading,
          region: null,
          failure: tallied
        });
        liveFightState = null;
      } else liveFightState = tallied;
    }
    const shownScreen = presentFrameScreen(parts, shownFight, liveFightState, defects);
    {
      const ledger = parts.defects;
      const addFiguresDisagreed = (cut) => {
        ledger.add({
          kind: DEFECT_KIND.figures,
          region: null,
          failure: new FiguresDisagreed(cut)
        });
      };
      if (shownScreen.ranking.hasFiguresDisagreed) addFiguresDisagreed(FIGURES_CUT.screen);
      if (shownScreen.opened?.hasFiguresDisagreed === true) {
        addFiguresDisagreed(FIGURES_CUT.drill);
      }
      if (shownScreen.pair?.hasFiguresDisagreed === true) {
        addFiguresDisagreed(FIGURES_CUT.pair);
      }
      if (shownScreen.part?.hasFiguresDisagreed === true) {
        addFiguresDisagreed(FIGURES_CUT.part);
      }
    }
    addUndrawnDefects(parts.defects, parts.view.render(shownScreen));
  });
  if (!(rendered instanceof Error)) return;
  parts.defects.add({
    kind: DEFECT_KIND.reading,
    region: null,
    failure: rendered
  });
  const hasFightToSave = parts.live.capture.calls.length > 0 || parts.keeper.getFights().length > 0;
  const waiting = {
    isMeterCollapsed: parts.screen.isMeterCollapsed,
    defects: getPanelDefects(parts.defects),
    hasFightToSave,
    isFightUnread: true,
    keptUnread: null,
    options: presentOptions(parts),
    typeStep: parts.screen.typeStep,
    windowSizes: parts.screen.windowSizes
  };
  assert(waiting.defects.length > 0, "a panel that could not be drawn says why");
  addUndrawnDefects(parts.defects, parts.view.renderWaiting(waiting));
}
function addRegionDefect(parts, failure) {
  parts.defects.add({
    kind: DEFECT_KIND.region,
    region: null,
    failure
  });
}
function presentHelperForFrame(liveFight, tables, isShelfEmpty) {
  const view = composeFightView(liveFight.session);
  if (view === null) {
    return isShelfEmpty ? HELPER_ABSENCE.noFightYet : HELPER_ABSENCE.betweenFights;
  }
  const standings = replayAuraStandings(view, tables.statedSkills);
  assert(standings.provocations.length <= COMBATANTS_MAXIMUM, "a shout holds people of this fight");
  const turn = {
    statement: view.turnStatement,
    isOver: view.isOver,
    isOnAuto: view.isOnAuto
  };
  return presentHelper(standings.provocations, view.chargedSkills, view.roster, view.readerSide, turn);
}
function isHelperFiguresDisagreed(helper) {
  if (typeof helper === "string") return false;
  return helper.hasFiguresDisagreed;
}
function addUndrawnDefects(defects, report) {
  for (const failure of report.undrawn) {
    defects.add({
      kind: DEFECT_KIND.region,
      region: failure.region,
      failure
    });
  }
}
function formatFightPlace(place) {
  if (place === null) return null;
  return formatPlace(place.mapName, place.x, place.y);
}
function presentFrameScreen(parts, shownFight, liveFightState, defects) {
  const { screen, keeper, live: liveFight } = parts;
  const { view, figures } = shownFight.fightState;
  const ranking = presentScreen(figures.statistics, view.roster, screen.metric, screen.side, view.readerSide, getFightSuspicions(view));
  const openedLevels = presentOpenedLevels(shownFight.fightState, screen);
  const chosenFightOpenedAt = screen.chosenFightOpenedAt ?? shownFight.keptFight?.openedAt ?? null;
  if (shownFight.keptFight !== null) {
    assert(chosenFightOpenedAt !== null, "a kept fight on screen is one named");
  }
  assert(ranking.rows.length <= COMBATANTS_MAXIMUM, "a ranking holds the fight's cast at most");
  const liveRow = liveFightState === null ? null : {
    fightState: liveFightState,
    place: liveFight.place,
    readerId: liveFight.readerId,
    openedAt: liveFight.openedAt
  };
  return {
    ranking,
    listName: composeListName(screen, chosenFightOpenedAt ?? liveFight.openedAt),
    metric: screen.metric,
    side: screen.side,
    readerSide: view.readerSide,
    // A fight already over numbers nobody's turn, and one read off the shelf has passed.
    turnHolderId: view.isOver ? null : view.turnStatement?.combatantId ?? null,
    shelf: presentShelfRows(parts, liveRow, chosenFightOpenedAt),
    options: presentOptions(parts),
    typeStep: screen.typeStep,
    windowSizes: screen.windowSizes,
    hasFightToSave: true,
    shelfAnswers: presentShelfAnswers(keeper.getAnswers()),
    defects,
    isOnShelf: screen.isOnShelf,
    ...openedLevels,
    fightPlace: formatFightPlaceWords(shownFight.keptFight === null ? liveFight.place : shownFight.keptFight.place),
    card: presentFightCardContent(parts, {
      sizes: ranking.sizes,
      unplaced: ranking.unplaced,
      outcome: ranking.outcome,
      isLive: shownFight.keptFight === null,
      openedAt: shownFight.keptFight?.openedAt ?? liveFight.openedAt,
      place: shownFight.keptFight === null ? liveFight.place : shownFight.keptFight.place,
      readerId: shownFight.keptFight === null ? liveFight.readerId : shownFight.keptFight.readerId,
      roster: view.roster,
      suspicions: composeSuspicionsOfReading(shownFight.fightState)
    }),
    isMeterCollapsed: screen.isMeterCollapsed
  };
}
function formatFightPlaceWords(place) {
  if (place === null) return null;
  return formatPlaceWords(place.mapName, place.x, place.y);
}
function presentFightCardContent(parts, source) {
  assert(source.unplaced >= 0, "a card counts nobody fewer than none unplaced");
  return {
    sizes: source.sizes,
    unplaced: source.unplaced,
    outcome: source.outcome,
    isLive: source.isLive,
    at: source.openedAt === null ? null : parts.clock.readMoment(source.openedAt),
    place: formatFightPlace(source.place),
    world: parts.world,
    reader: lookupFightReader(source.roster, source.readerId),
    suspicions: source.suspicions,
    isUnread: false
  };
}
function lookupFightReader(roster, readerId) {
  if (readerId === null) return null;
  const combatant = roster.byId.get(readerId);
  if (combatant === void 0) return null;
  assert(combatant.id === readerId, "a combatant found by an id is the one it names");
  return {
    name: combatant.name,
    profession: combatant.profession,
    level: combatant.level
  };
}
function composeSuspicionsOfReading(fightState) {
  const { view, figures } = fightState;
  return formatFightSuspicions(figures.statistics, view.roster, getFightSuspicions(view));
}
function getFightSuspicions(view) {
  assert(view.messagesLost >= 0, "a reading lost no fewer than none of what it was handed");
  assert(view.messagesRead >= 0, "and read no fewer than none");
  return {
    messagesLost: view.messagesLost,
    hasJoinedInProgress: view.hasJoinedInProgress,
    messagesRead: view.messagesRead
  };
}
function presentShelfRows(parts, liveRow, chosenFightOpenedAt) {
  const keptFights = parts.keeper.getFights();
  const keptFightStatesByOpenedAt = parts.keeper.getKeptFightStates();
  const rows = [];
  const alsoKept = liveRow === null ? void 0 : keptFights.find((keptFight) => keptFight.openedAt === liveRow.openedAt);
  if (liveRow !== null) {
    const { sizes, unplaced } = presentShelfHeadcount(liveRow.fightState);
    const outcome = getOutcomeOfReading(liveRow.fightState);
    const liveOpenedAt = liveRow.openedAt;
    rows.push({
      openedAt: liveOpenedAt,
      at: liveOpenedAt === null ? null : parts.clock.readMoment(liveOpenedAt),
      sizes,
      place: formatFightPlace(liveRow.place),
      outcome,
      isLive: true,
      // Nothing chosen is the live fight: a kept row's moment is never the live one's.
      isChosen: chosenFightOpenedAt === null,
      isPinned: alsoKept?.isPinned ?? false,
      isPinnable: alsoKept !== void 0,
      card: presentFightCardContent(parts, {
        sizes,
        unplaced,
        outcome,
        isLive: true,
        openedAt: liveRow.openedAt,
        place: liveRow.place,
        readerId: liveRow.readerId,
        roster: liveRow.fightState.view.roster,
        suspicions: composeSuspicionsOfReading(liveRow.fightState)
      })
    });
  }
  const keptFightsNewestFirst = [
    ...keptFights
  ].sort((leftFight, rightFight) => rightFight.openedAt - leftFight.openedAt);
  for (const keptFight of keptFightsNewestFirst) {
    if (keptFight.openedAt === alsoKept?.openedAt) continue;
    const fightState = keptFightStatesByOpenedAt.get(keptFight.openedAt);
    assert(fightState !== void 0, "a kept fight's reading is held while it is kept");
    if (fightState === null) {
      rows.push(presentUnreadShelfRow(parts, keptFight, chosenFightOpenedAt));
    } else {
      rows.push(presentKeptShelfRow(parts, keptFight, fightState, chosenFightOpenedAt));
    }
  }
  assert(rows.length <= KEPT_MAXIMUM + 1, "a row per kept fight, and one for the live one");
  assert(rows.filter((shelfRow) => shelfRow.isLive).length <= 1, "and one live fight at most");
  return rows;
}
function presentShelfHeadcount(fightState) {
  const { roster, readerSide } = fightState.view;
  const headcount = composeHeadcount(fightState.figures.statistics, roster, readerSide);
  const counted = headcount.sizes.reduce((sum, count) => sum + count, 0);
  assert(headcount.sizes.every((count) => count > 0), "a side on the shelf holds somebody");
  assert(counted === roster.byId.size, "everybody the roster seats, once");
  return headcount;
}
function presentUnreadShelfRow(parts, fight, chosenFightOpenedAt) {
  assert(fight.payloads.length > 0, "a kept row was kept from something, read or not");
  const moment = parts.clock.readMoment(fight.openedAt);
  const place = formatFightPlace(fight.place);
  return {
    openedAt: fight.openedAt,
    at: moment,
    sizes: [],
    place,
    outcome: null,
    isLive: false,
    isChosen: chosenFightOpenedAt === fight.openedAt,
    isPinned: fight.isPinned,
    isPinnable: true,
    card: {
      sizes: [],
      unplaced: 0,
      outcome: null,
      isLive: false,
      at: moment,
      place,
      world: parts.world,
      reader: null,
      suspicions: [],
      isUnread: true
    }
  };
}
function getOutcomeOfReading(fightState) {
  const outcome = fightState.figures.statistics.outcome;
  if (outcome === null) return null;
  return getOutcomeForReaderSide(outcome, fightState.view.roster, fightState.view.readerSide);
}
function presentKeptShelfRow(parts, fight, fightState, chosenFightOpenedAt) {
  assert(fightState.view.payloadsApplied > 0, "a kept row states a fight read from something");
  assert(fight.payloads.length > 0, "and kept from something");
  const { sizes, unplaced } = presentShelfHeadcount(fightState);
  const outcome = getOutcomeOfReading(fightState);
  return {
    openedAt: fight.openedAt,
    at: parts.clock.readMoment(fight.openedAt),
    sizes,
    place: formatFightPlace(fight.place),
    outcome,
    isLive: false,
    isChosen: chosenFightOpenedAt === fight.openedAt,
    isPinned: fight.isPinned,
    isPinnable: true,
    card: presentFightCardContent(parts, {
      sizes,
      unplaced,
      outcome,
      isLive: false,
      openedAt: fight.openedAt,
      place: fight.place,
      readerId: fight.readerId,
      roster: fightState.view.roster,
      suspicions: composeSuspicionsOfReading(fightState)
    })
  };
}
function presentOptions(parts) {
  if (!parts.screen.isOnOptions) return null;
  return {
    storage: parts.keeper.getChoice(),
    answers: presentShelfAnswers(parts.keeper.getAnswers())
  };
}
function presentShelfAnswers(shelfAnswers) {
  const answers = [];
  if (shelfAnswers.isEverySlotPinned) answers.push(EVERY_SLOT_PINNED_ANSWER);
  if (shelfAnswers.hasStoreRefused) answers.push(STORE_REFUSED_ANSWER);
  if (shelfAnswers.hasStoreMadeRoom) answers.push(STORE_MADE_ROOM_ANSWER);
  if (shelfAnswers.hasChoiceRefused) answers.push(CHOICE_REFUSED_ANSWER);
  if (shelfAnswers.hasMoveRefused) answers.push(MOVE_REFUSED_ANSWER);
  if (shelfAnswers.hasPinRefused) answers.push(PIN_REFUSED_ANSWER);
  if (shelfAnswers.hasStoreRefused) {
    assert(!shelfAnswers.hasStoreMadeRoom, "a store refused, or made room");
  }
  if (shelfAnswers.hasMoveRefused) {
    assert(!shelfAnswers.hasChoiceRefused, "a move is refused, or its choice is");
  }
  assert(answers.length <= SHELF_ANSWERS_MAXIMUM, "a shelf states only answers that hold together");
  return answers;
}
function getPanelDefects(defects) {
  return defects.getCounts().map(({ kind, region, count }) => ({
    kind,
    region,
    count
  }));
}
function presentOpenedLevels(fightState, screen) {
  const statistics = fightState.figures.statistics;
  const roster = fightState.view.roster;
  if (screen.openedCombatantId === null) {
    const unnamed = lookupUnnamedLevel(fightState, screen);
    const unnamedCut2 = lookupUnnamedCutLevel(fightState, screen);
    return {
      opened: null,
      pair: null,
      part: null,
      unnamed,
      unnamedCut: unnamedCut2
    };
  }
  const opened = presentOpenedLevel(statistics, roster, screen.metric, screen.openedCombatantId);
  if (opened === null) {
    return {
      opened: null,
      pair: null,
      part: null,
      unnamed: null,
      unnamedCut: null
    };
  }
  assert(opened.combatantId === screen.openedCombatantId, "the row drawn open is the row opened");
  const pair = screen.pairCombatantId === null ? null : presentPairLevel(statistics, roster, screen.metric, opened.combatantId, screen.pairCombatantId);
  const partLevel = screen.openPart === null ? null : presentPartLevel(statistics, roster, screen.metric, opened.combatantId, screen.openPart);
  const unnamedCut = lookupUnnamedPairLevel(fightState, screen, opened);
  return {
    opened,
    pair,
    part: partLevel,
    unnamed: null,
    unnamedCut
  };
}
function lookupUnnamedPairLevel(fightState, screen, drill) {
  assert(screen.openedCombatantId === drill.combatantId, "the rung is under the row drawn open");
  if (screen.openUnnamedEnd === null) return null;
  const unnamed = drill.byOtherEnd.halfNamed;
  if (unnamed === null) return null;
  if (!unnamed.doesOpenPair) return null;
  const { statistics } = fightState.figures;
  const { roster } = fightState.view;
  const unnamedPair = presentUnnamedPairLevel(statistics, roster, screen.metric, drill.combatantId);
  if (unnamedPair === null) return null;
  return getEndForPinned(unnamedPair.case) === screen.openUnnamedEnd ? unnamedPair : null;
}
function lookupUnnamedLevel(fightState, screen) {
  if (screen.openUnnamedEnd === null) return null;
  const pinnedCase = lookupPinnedCase(screen.metric, screen.openUnnamedEnd);
  if (pinnedCase === null) return null;
  const { statistics } = fightState.figures;
  const { roster, readerSide } = fightState.view;
  return presentUnnamedLevel(statistics, roster, pinnedCase, screen.side, readerSide);
}
function lookupUnnamedCutLevel(fightState, screen) {
  if (screen.openUnnamedEnd === null) return null;
  const pinnedCase = lookupPinnedCase(screen.metric, screen.openUnnamedEnd);
  if (pinnedCase === null) return null;
  const halfNamedOpened = lookupUnnamedCutPress(screen);
  if (halfNamedOpened === null) return null;
  const { statistics } = fightState.figures;
  const { roster, readerSide } = fightState.view;
  return presentUnnamedCutLevel(statistics, roster, pinnedCase, screen.side, readerSide, halfNamedOpened);
}
function lookupUnnamedCutPress(screen) {
  assert(screen.openUnnamedEnd !== null, "a pinned row's rung is asked of an open pinned row");
  assert(screen.openedCombatantId === null, "a person's row and a pinned row are never open at once");
  if (screen.openPart !== null) {
    if (screen.openPart.kind !== OPENED_PART.element) return null;
    return {
      kind: HALF_NAMED_OPENED.element,
      element: screen.openPart.element
    };
  }
  if (screen.pairCombatantId === null) return null;
  return {
    kind: HALF_NAMED_OPENED.person,
    combatantId: screen.pairCombatantId
  };
}

// src/ui/panel-document.ts
var STYLE_ATTRIBUTE = "style";
var EVENT_TYPE = {
  press: "pointerdown",
  back: "contextmenu",
  move: "pointermove",
  leave: "pointerout",
  release: "pointerup",
  cancel: "pointercancel"
};

// src/ui/panel-intent.ts
var PANEL_MARK = {
  fold: "data-fold",
  save: "data-save",
  shelf: "data-shelf",
  options: "data-options",
  screen: "data-screen",
  side: "data-side",
  row: "data-row",
  back: "data-back",
  /** One per kind of part, so what a row opens is read off an attribute rather than parsed. */
  skill: "data-skill",
  source: "data-source",
  kind: "data-kind",
  /** The row closing a damage section, which opens onto the other end of those blows. */
  plain: "data-plain",
  fight: "data-fight",
  pin: "data-pin",
  /** Which end a pinned row leaves out, which is the whole of what opening it asks for. */
  unnamed: "data-unnamed",
  storage: "data-storage",
  typeStep: "data-type-step",
  /** Which window a reset gives back to its type, named as `PANEL_WINDOW` names it. */
  resetSize: "data-reset-size",
  /** The helper's own fold: one mark over both would put away the window being watched. */
  helperFold: "data-helper-fold"
};
var PANEL_INTENT = {
  metric: "metric",
  side: "side",
  openRow: "open-row",
  openUnnamed: "open-unnamed",
  openPart: "open-part",
  close: "close",
  fold: "fold",
  move: "move",
  resize: "resize",
  resetSize: "reset-size",
  saveFile: "save-file",
  storage: "storage",
  typeStep: "type-step",
  shelf: "shelf",
  options: "options",
  showKept: "show-kept",
  showLive: "show-live",
  pin: "pin"
};
var MarkValueUnknown = class extends Error {
  name = "MarkValueUnknown";
  mark;
  constructor(mark) {
    super();
    this.mark = mark;
  }
};
var PLAIN_MARK = "closing";
var LIVE_FIGHT_MARK = "live";
var UNNAMED_ENDS = Object.values(UNNAMED_END);
function readPanelIntent(target) {
  if (typeof target.getAttribute !== "function") return null;
  {
    const metric = target.getAttribute(PANEL_MARK.screen);
    if (metric !== null) {
      if (!isOneOf(SCREEN_ORDER, metric)) return new MarkValueUnknown(PANEL_MARK.screen);
      return {
        kind: PANEL_INTENT.metric,
        metric
      };
    }
    const side = target.getAttribute(PANEL_MARK.side);
    if (side !== null) {
      if (!isOneOf(SIDE_CHOICES, side)) return new MarkValueUnknown(PANEL_MARK.side);
      return {
        kind: PANEL_INTENT.side,
        side
      };
    }
    const row = target.getAttribute(PANEL_MARK.row);
    if (row !== null) {
      const combatantId = parseInteger(row);
      if (combatantId === null) return new MarkValueUnknown(PANEL_MARK.row);
      return {
        kind: PANEL_INTENT.openRow,
        combatantId
      };
    }
    const end = target.getAttribute(PANEL_MARK.unnamed);
    if (end !== null) {
      if (!isOneOf(UNNAMED_ENDS, end)) return new MarkValueUnknown(PANEL_MARK.unnamed);
      return {
        kind: PANEL_INTENT.openUnnamed,
        end
      };
    }
  }
  {
    const name = target.getAttribute(PANEL_MARK.skill);
    if (name !== null) return createOpenPartIntent({
      kind: OPENED_PART.skill,
      name
    });
    const source = target.getAttribute(PANEL_MARK.source);
    if (source !== null) return createOpenPartIntent({
      kind: OPENED_PART.source,
      source
    });
    if (target.getAttribute(PANEL_MARK.plain) !== null) {
      return createOpenPartIntent({
        kind: OPENED_PART.plain
      });
    }
    const element = target.getAttribute(PANEL_MARK.kind);
    if (element !== null) {
      return createOpenPartIntent({
        kind: OPENED_PART.element,
        element
      });
    }
  }
  {
    const fight = target.getAttribute(PANEL_MARK.fight);
    if (fight !== null) {
      if (fight === LIVE_FIGHT_MARK) return {
        kind: PANEL_INTENT.showLive
      };
      const openedAt = parseInteger(fight);
      if (openedAt === null) return new MarkValueUnknown(PANEL_MARK.fight);
      return {
        kind: PANEL_INTENT.showKept,
        openedAt
      };
    }
    const pinned = target.getAttribute(PANEL_MARK.pin);
    if (pinned !== null) {
      const openedAt = parseInteger(pinned);
      if (openedAt === null) return new MarkValueUnknown(PANEL_MARK.pin);
      return {
        kind: PANEL_INTENT.pin,
        openedAt
      };
    }
  }
  {
    const choice = target.getAttribute(PANEL_MARK.storage);
    if (choice !== null) {
      if (!isOneOf(STORAGE_CHOICES, choice)) return new MarkValueUnknown(PANEL_MARK.storage);
      return {
        kind: PANEL_INTENT.storage,
        choice
      };
    }
    const step = target.getAttribute(PANEL_MARK.typeStep);
    if (step !== null) {
      if (!isOneOf(TYPE_STEPS, step)) return new MarkValueUnknown(PANEL_MARK.typeStep);
      return {
        kind: PANEL_INTENT.typeStep,
        step
      };
    }
    const window2 = target.getAttribute(PANEL_MARK.resetSize);
    if (window2 !== null) {
      if (!isOneOf(PANEL_WINDOWS, window2)) return new MarkValueUnknown(PANEL_MARK.resetSize);
      return {
        kind: PANEL_INTENT.resetSize,
        window: window2
      };
    }
  }
  {
    if (target.getAttribute(PANEL_MARK.helperFold) !== null) {
      return {
        kind: PANEL_INTENT.fold,
        window: PANEL_WINDOW.helper
      };
    }
    if (target.getAttribute(PANEL_MARK.save) !== null) return {
      kind: PANEL_INTENT.saveFile
    };
    if (target.getAttribute(PANEL_MARK.shelf) !== null) return {
      kind: PANEL_INTENT.shelf
    };
    if (target.getAttribute(PANEL_MARK.options) !== null) return {
      kind: PANEL_INTENT.options
    };
    if (target.getAttribute(PANEL_MARK.fold) !== null) {
      return {
        kind: PANEL_INTENT.fold,
        window: PANEL_WINDOW.meter
      };
    }
    if (target.getAttribute(PANEL_MARK.back) !== null) return {
      kind: PANEL_INTENT.close
    };
  }
  return null;
}
function createOpenPartIntent(openedPart) {
  return {
    kind: PANEL_INTENT.openPart,
    part: openedPart
  };
}
function isPanelIntentSame(pressed, released) {
  return composeNameForIntent(pressed) === composeNameForIntent(released);
}
function composeNameForIntent(intent) {
  if (intent.kind === PANEL_INTENT.metric) return `${intent.kind}:${intent.metric}`;
  if (intent.kind === PANEL_INTENT.side) return `${intent.kind}:${intent.side}`;
  if (intent.kind === PANEL_INTENT.openRow) return `${intent.kind}:${intent.combatantId}`;
  if (intent.kind === PANEL_INTENT.openUnnamed) return `${intent.kind}:${intent.end}`;
  if (intent.kind === PANEL_INTENT.openPart) {
    return `${intent.kind}:${composeNameForPart(intent.part)}`;
  }
  if (intent.kind === PANEL_INTENT.fold) return `${intent.kind}:${intent.window}`;
  if (intent.kind === PANEL_INTENT.move) {
    const position = intent.position;
    return `${intent.kind}:${intent.window}:${position.left}:${position.top}`;
  }
  if (intent.kind === PANEL_INTENT.resize) {
    const size = intent.size;
    return `${intent.kind}:${intent.window}:${size.width}:${size.height}`;
  }
  if (intent.kind === PANEL_INTENT.resetSize) return `${intent.kind}:${intent.window}`;
  if (intent.kind === PANEL_INTENT.storage) return `${intent.kind}:${intent.choice}`;
  if (intent.kind === PANEL_INTENT.typeStep) return `${intent.kind}:${intent.step}`;
  if (intent.kind === PANEL_INTENT.showKept) return `${intent.kind}:${intent.openedAt}`;
  if (intent.kind === PANEL_INTENT.pin) return `${intent.kind}:${intent.openedAt}`;
  return intent.kind;
}

// src/ui/view-failure.ts
var PANEL_LISTENER = {
  press: "press",
  click: "click",
  back: "back",
  hover: "hover",
  leave: "leave",
  grab: "grab",
  drag: "drag",
  release: "release",
  cancel: "cancel",
  capture: "capture"
};
var RegionUndrawn = class extends Error {
  name = "RegionUndrawn";
  region;
  constructor(region, cause) {
    super(void 0, {
      cause
    });
    this.region = region;
  }
};
var GestureDropped = class extends Error {
  name = "GestureDropped";
  listener;
  constructor(listener, cause) {
    super(void 0, {
      cause
    });
    this.listener = listener;
  }
};
var WindowUnplaced = class extends Error {
  name = "WindowUnplaced";
  window;
  constructor(window2, cause) {
    super(void 0, {
      cause
    });
    this.window = window2;
  }
};
var CardRefused = class extends Error {
  name = "CardRefused";
  key;
  constructor(key) {
    super();
    this.key = key;
  }
};
var CardLinesExceeded = class extends Error {
  name = "CardLinesExceeded";
  lines;
  maximum;
  constructor(lines, maximum) {
    super();
    this.lines = lines;
    this.maximum = maximum;
  }
};
function addViewFailureGuarded(failure, onFailure) {
  void attempt(() => onFailure(failure));
}

// src/ui/panel-listener.ts
function addGuardedListener(root, type, listener, handle, onFailure) {
  root.addEventListener(type, (event) => {
    const handled = attempt(() => handle(event));
    if (!(handled instanceof Error)) return;
    addViewFailureGuarded(new GestureDropped(listener, handled), onFailure);
  });
}

// src/ui/panel-look.ts
var BAR_ICON = {
  options: "options",
  shelf: "shelf",
  save: "save",
  fold: "fold",
  unfold: "unfold"
};
var SURFACE = {
  panel: [
    15,
    22,
    29
  ],
  raised: [
    23,
    30,
    37
  ],
  track: [
    27,
    35,
    42
  ],
  border: [
    35,
    43,
    51
  ]
};
var TEXT = {
  plain: [
    227,
    231,
    234
  ],
  quiet: [
    151,
    159,
    168
  ],
  inkDark: [
    13,
    19,
    25
  ],
  inkLight: [
    255,
    255,
    255
  ]
};
var CLASS = {
  title: "MargoMeter-titlebar",
  control: "titlebar-button",
  /** The first control on the bar, which pushes every control after it to the far end. */
  controlLead: "titlebar-lead",
  frame: "MargoMeter-body",
  folded: "folded",
  meter: "meter",
  slot: "slot",
  header: "header",
  headerLine: "header-line",
  headerPlace: "header-place",
  headerPlaceName: "header-place-name",
  headerPlaceTile: "header-place-tile",
  headerOutcome: "header-outcome",
  /** The ink of the side that took the fight, on the header's word and on a shelf row's letter. */
  outcomeWon: "outcome-won",
  outcomeLost: "outcome-lost",
  strips: "strips",
  stripsGap: "strips-gap",
  strip: "strip",
  stripCurrent: "selected",
  crumb: "crumb",
  crumbBack: "crumb-back",
  crumbHere: "crumb-here",
  /** One question of the options: a heading, then its answers in the shape they need. */
  optionsQuestion: "options-question",
  optionsHeading: "options-heading",
  optionsSteps: "options-steps",
  options: "options",
  optionsStep: "options-step",
  optionsWindow: "options-window",
  optionsWindowName: "options-window-name",
  optionsWindowState: "options-window-state",
  optionsWindowOwn: "options-window-own",
  optionsReset: "options-reset",
  optionsAnswer: "options-answer",
  optionsMeaning: "options-meaning",
  optionsVersion: "options-version",
  list: "list",
  listWaiting: "list-waiting",
  section: "section-heading",
  sectionWords: "section-words",
  row: "row",
  rowDrillable: "drillable",
  rowLeaf: "leaf",
  rowRank: "row-rank",
  rowTime: "row-time",
  rowName: "row-name",
  rowSize: "row-size",
  rowChosen: "chosen",
  rowApart: "apart",
  rowPin: "row-pin",
  rowPinSet: "pinned",
  rowValue: "row-value",
  rowOutcome: "row-outcome",
  /** A kept fight that no longer reads: its row opens nothing and says so in its last cell. */
  rowUnread: "unread",
  rowShare: "row-share",
  rowSuspect: "row-suspect",
  rowCaveat: "row-caveat",
  rowTurn: "row-turn",
  rowSide: "row-side",
  bar: "bar",
  barCap: "bar-cap",
  /** Worn by every cell that carries a figure, wherever in the panel it stands. */
  figure: "figure",
  pinned: "pinned-region",
  /** The section under the pinned rows: what the screen's own count holds and no row does. */
  outside: "outside-region",
  empty: "empty",
  undrawn: "undrawn",
  suspicions: "suspicions",
  suspicion: "suspicion",
  defects: "defects",
  defect: "defect",
  sides: "MargoMeter-sides",
  sidesLine: "sides",
  sidesLabel: "sides-label",
  sidesSpare: "sides-spare",
  sidesTrack: "sides-track",
  sidesOurs: "sides-ours",
  sidesTheirs: "sides-theirs",
  sidesNobody: "sides-nobody",
  card: "MargoMeter-card",
  cardHidden: "card-hidden",
  /** A card too tall for the window in one column, drawn in two (ADR 0033). */
  cardWide: "card-wide",
  cardColumns: "card-columns",
  cardColumn: "card-column",
  cardName: "card-name",
  cardSubtitle: "card-subtitle",
  cardGroup: "card-group",
  cardHeading: "card-heading",
  cardLine: "card-line",
  cardStrong: "card-strong",
  cardSub: "card-sub",
  cardLabel: "card-label",
  cardCaveat: "card-caveat",
  cardValue: "card-value",
  /** A sentence rather than a column, so the placement counts it as wrapping. */
  cardNote: "card-note",
  cardSuspect: "card-suspect",
  cardDefect: "card-defect",
  /** How the fight a card is about went, after its headcount. */
  cardOutcome: "card-outcome",
  /** The sentence's own, and never `cardCaveat` — that one is the glyph cell beside a figure. */
  cardCaveatNote: "card-caveat-note",
  /** The helper: its own bar, its own body, and the rows under each heading. */
  helper: "MargoMeter-helper",
  helperBar: "helper-bar",
  helperBody: "helper-body",
  helperFolded: "helper-folded",
  /** A row nested under the one above it, whoever stands in either. */
  helperUnder: "helper-under",
  /** The shout a holder is holding somebody with, drawn on their row (`develop ADR 0097`). */
  helperCast: "helper-cast",
  /** The row that carries one, which is the only row where the name gives way last. */
  helperHolding: "helper-holding",
  helperPips: "helper-pips",
  helperPip: "helper-pip",
  helperPipLit: "helper-pip-lit",
  /** The corner a window is sized by, in either window (ADR 0013). */
  sizeGrip: "size-grip"
};
var TARGET_PIXELS_MINIMUM = 24;
var SPACE_PIXELS = {
  half: 2,
  small: 4,
  regionDown: 5,
  regionAcross: 7,
  wide: 8
};
var METER_HEIGHT_VIEWPORT_PERCENT_MAXIMUM = 66;
var PLACE = {
  insetPixels: 8,
  /**
     * The host against the game's own page, and nothing inside the root: the game's interface
     * layer, won by standing after it in `body`, and under every window of theirs —
     * `develop ADR 0114`.
     */
  layer: "10"
};
var LAYER = {
  /** A section's heading over the rows scrolling under it, and the size grip over the list. */
  section: "1",
  grip: "1",
  helper: "2",
  card: "3"
};
var TYPE_TOKENS = {
  [TYPE_STEP.small]: {
    fontPixels: 12,
    lineHeightPixels: 16,
    lineHeightTitlePixels: 14,
    fontSmallPixels: 11,
    rowHeightPixels: 25,
    rankWidthPixels: 24,
    pipSizePixels: 5,
    castWidthPixelsMinimum: 50,
    markSizePixels: 12,
    meterWidthPixels: 274,
    cardWidthPixelsMaximum: 272,
    helperWidthPixels: 228
  },
  [TYPE_STEP.medium]: {
    fontPixels: 13,
    lineHeightPixels: 18,
    lineHeightTitlePixels: 15,
    fontSmallPixels: 12,
    rowHeightPixels: 27,
    rankWidthPixels: 25,
    pipSizePixels: 6,
    castWidthPixelsMinimum: 54,
    markSizePixels: 12,
    meterWidthPixels: 306,
    cardWidthPixelsMaximum: 296,
    helperWidthPixels: 248
  },
  [TYPE_STEP.large]: {
    fontPixels: 14,
    lineHeightPixels: 20,
    lineHeightTitlePixels: 16,
    fontSmallPixels: 13,
    rowHeightPixels: 29,
    rankWidthPixels: 27,
    pipSizePixels: 6,
    castWidthPixelsMinimum: 58,
    markSizePixels: 14,
    meterWidthPixels: 316,
    cardWidthPixelsMaximum: 318,
    helperWidthPixels: 268
  }
};
var SHAPE = {
  radiusPixels: 8,
  radiusSmallPixels: 3,
  windowShadow: "0 6px 20px rgb(0 0 0 / 55%)"
};
var ROW_INK_DROP_PIXELS = 1;
var BAR_TINT = 0.55;
var MASK_INK = [
  0,
  0,
  0
];
var HEADING_TINT = 0.85;
var VARIABLE_PREFIX = "--MargoMeter-";
var ROWS_BY_DEFAULT = RANKING_ROWS;
var FONT_STACK = "system-ui, sans-serif";
var RULE_WIDTH_PIXELS = 1;
var SIDES_TRACK_HEIGHT_PIXELS = SPACE_PIXELS.small;
var ROW_SIDE_WIDTH_PIXELS = 2;
var MASK_STRIPE_PIXELS = 4;
var HEADING_LETTER_SPACING_EM = 0.08;
var TITLE_LETTER_SPACING_EM = 0.06;
var CAP_WIDTH_PIXELS = 3;
var CAVEAT_LETTER = {
  clearPixels: 1,
  gapPixels: 1,
  stemWidthPixels: 2
};
var BAR_ICON_DRAWINGS = {
  [BAR_ICON.options]: "<circle cx='5' cy='5' r='2.4' stroke-width='1.4'/><path stroke-width='1.6' d='M8.2 5L9.6 5M7.26 7.26L8.25 8.25M5 8.2L5 9.6M2.74 7.26L1.75 8.25M1.8 5L0.4 5M2.74 2.74L1.75 1.75M5 1.8L5 0.4M7.26 2.74L8.25 1.75'/>",
  [BAR_ICON.shelf]: "<path stroke-width='1.2' d='M1 2H9M1 5H9M1 8H9'/>",
  [BAR_ICON.save]: "<path stroke-width='1.2' d='M5 1V6.6M2.4 4.2L5 6.8L7.6 4.2M1 9H9'/>",
  [BAR_ICON.fold]: "<path stroke-width='1.2' d='M1 5H9'/>",
  [BAR_ICON.unfold]: "<path stroke-width='1.2' d='M1 5H9M5 1V9'/>"
};
var BAR_ICONS = Object.values(BAR_ICON);
var BAR_ICON_INSET_PIXELS = 2;
var PIN_STAR_PATH = "M5 0.93L6.01 4.04H9.28L6.63 5.96L7.65 9.07L5 7.15L2.35 9.07L3.37 5.96L0.72 4.04H3.99Z";
var PIN_INSET_PIXELS = 6;
var SIZE_GRIP = {
  sizePixels: 12
};
var SIZED_METER_VARIABLES = {
  listBasis: "--MargoMeter-list-basis",
  listRowsLeast: "--MargoMeter-list-rows-least",
  share: "--MargoMeter-meter-share"
};
var LIST_ROWS_SIZED_MINIMUM = 3;
var SIZE_VARIABLES = {
  [PANEL_WINDOW.meter]: {
    width: "--MargoMeter-meter-width",
    height: "--MargoMeter-meter-height"
  },
  [PANEL_WINDOW.helper]: {
    width: "--MargoMeter-helper-width",
    height: "--MargoMeter-helper-height"
  }
};
var TOP_VARIABLES = {
  [PANEL_WINDOW.meter]: "--MargoMeter-meter-top",
  [PANEL_WINDOW.helper]: "--MargoMeter-helper-top"
};
var ROWS_VARIABLE = "--MargoMeter-rows";
var CARD_VARIABLES = {
  top: "--MargoMeter-card-top",
  left: "--MargoMeter-card-left",
  right: "--MargoMeter-card-right",
  height: "--MargoMeter-card-height"
};
var NO_SELECTION = "-webkit-user-select:none;user-select:none;";
function composeColourOver(top, bottom, alpha) {
  const share = clampNumber(alpha, 0, 1);
  return [
    composeColourOverChannel(top[0], bottom[0], share),
    composeColourOverChannel(top[1], bottom[1], share),
    composeColourOverChannel(top[2], bottom[2], share)
  ];
}
function composeColourOverChannel(above, below, share) {
  return Math.round(share * above + (1 - share) * below);
}
function calculateCardHeight(size, tokens) {
  const line = tokens.lineHeightPixels;
  const air = SPACE_PIXELS.small;
  if (!Number.isSafeInteger(size.lines)) return null;
  if (!Number.isSafeInteger(size.groups)) return null;
  const runs = size.groups * (2 * air + RULE_WIDTH_PIXELS);
  return size.lines * line + runs + 2 * air + 2 * RULE_WIDTH_PIXELS;
}
function calculateCardWidthForColumns(tokens, columns) {
  const between = 2 * SPACE_PIXELS.wide + RULE_WIDTH_PIXELS;
  return columns * tokens.cardWidthPixelsMaximum + (columns - 1) * between;
}
function calculateCardHeightAvailable(viewportHeight) {
  if (viewportHeight === null) return null;
  if (!Number.isFinite(viewportHeight)) return null;
  const room = viewportHeight - 2 * PLACE.insetPixels;
  if (room <= 0) return null;
  return room;
}
function calculateCardWidthAvailable(viewportWidth) {
  if (viewportWidth === null) return null;
  if (!Number.isFinite(viewportWidth)) return null;
  const room = viewportWidth - 2 * PLACE.insetPixels;
  if (room <= 0) return null;
  return room;
}
function composeSizedPanelStyle() {
  const { listBasis, listRowsLeast, share } = SIZED_METER_VARIABLES;
  return `${listBasis}:0px;${listRowsLeast}:${LIST_ROWS_SIZED_MINIMUM};${share}:100vh`;
}
function calculateBarHeight(tokens) {
  return calculateControlHeightPixels(tokens) + 2 * SPACE_PIXELS.half + RULE_WIDTH_PIXELS;
}
function calculateControlHeightPixels(tokens) {
  return Math.max(tokens.lineHeightTitlePixels + 2 * RULE_WIDTH_PIXELS, TARGET_PIXELS_MINIMUM);
}
function composeBarIconClass(icon) {
  return `${CLASS.control}-${icon}`;
}
function composeOptionsStepClass(step) {
  return `${CLASS.optionsStep}-${step}`;
}
function composeStyleSheet(step) {
  return composeStyleSheetForTokens(TYPE_TOKENS[step]);
}
function composeStyleSheetForTokens(tokens) {
  return `${composeFrameRules(tokens)}${composeRegionRules(tokens)}${composeOptionsRules(tokens)}${composeListRules(tokens)}${composeRowRules(tokens)}${composeUnderListRules()}${composeCardRules(tokens)}${composeHelperRules(tokens)}`;
}
function composeFrameRules(tokens) {
  const share = `var(${SIZED_METER_VARIABLES.share},${METER_HEIGHT_VIEWPORT_PERCENT_MAXIMUM}vh)`;
  const ceiling = `min(calc(100vh - var(${TOP_VARIABLES.meter}) - ${PLACE.insetPixels}px),${share})`;
  const width = `var(${SIZE_VARIABLES.meter.width},${tokens.meterWidthPixels}px)`;
  return `:host{all:initial;${composeVariables(tokens)}${TOP_VARIABLES.meter}:${PLACE.insetPixels}px;position:fixed;top:var(${TOP_VARIABLES.meter});right:${PLACE.insetPixels}px;z-index:${PLACE.layer};display:flex;flex-direction:column;max-height:${ceiling};}.${CLASS.title}{flex:none;display:flex;align-items:center;gap:var(${VARIABLE_PREFIX}small);padding:var(${VARIABLE_PREFIX}half) var(${VARIABLE_PREFIX}wide);font:${composeFontTitle(tokens)};letter-spacing:${TITLE_LETTER_SPACING_EM}em;color:var(${VARIABLE_PREFIX}quiet);white-space:nowrap;background:var(${VARIABLE_PREFIX}raised);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-bottom:none;border-radius:var(${VARIABLE_PREFIX}radius) var(${VARIABLE_PREFIX}radius) 0 0;box-sizing:border-box;width:${width};cursor:move;${NO_SELECTION}touch-action:none;}.${CLASS.control}{display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;padding:0;font-size:0;width:${calculateControlHeightPixels(tokens)}px;height:${calculateControlHeightPixels(tokens)}px;border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:var(${VARIABLE_PREFIX}radius);color:var(${VARIABLE_PREFIX}quiet);background:var(${VARIABLE_PREFIX}surface);cursor:pointer;}.${CLASS.control}:hover{color:var(${VARIABLE_PREFIX}text);}` + composeBarIconRules(tokens) + `.${CLASS.controlLead}{margin-left:auto;}.${CLASS.frame}{display:flex;flex-direction:column;min-height:0;}.${CLASS.frame}.${CLASS.folded}{display:none;}.${CLASS.meter}{font:${composeFontBody(tokens)};width:${width};position:relative;color:var(${VARIABLE_PREFIX}text);background:var(${VARIABLE_PREFIX}surface);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:0 0 var(${VARIABLE_PREFIX}radius) var(${VARIABLE_PREFIX}radius);box-sizing:border-box;display:flex;flex-direction:column;min-height:var(${SIZE_VARIABLES.meter.height},0);}.${CLASS.meter}>*{flex:none;}.${CLASS.meter}>.${CLASS.list}{flex:1 1 var(${SIZED_METER_VARIABLES.listBasis},auto);min-height:calc(var(${SIZED_METER_VARIABLES.listRowsLeast},0) * (var(${VARIABLE_PREFIX}row-height) + var(${VARIABLE_PREFIX}half)));}.${CLASS.slot}{display:none;}`;
}
function composeBarIconRules(tokens) {
  const lined = tokens.lineHeightTitlePixels - 2 * BAR_ICON_INSET_PIXELS;
  const size = lined + lined % 2;
  let rules = `.${CLASS.control}::before{content:"";flex:none;width:${size}px;height:${size}px;background:currentColor;}`;
  for (const icon of BAR_ICONS) {
    rules += `.${composeBarIconClass(icon)}::before{${composeMaskImage("fill='none'", BAR_ICON_DRAWINGS[icon])}}`;
  }
  return rules;
}
function composeMaskImage(paint, drawing) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' ${paint} stroke='black'>${drawing}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return `-webkit-mask-image:${url};mask-image:${url};`;
}
function composeFontBody(tokens) {
  return `${tokens.fontPixels}px/${tokens.lineHeightPixels}px ${FONT_STACK}`;
}
function composeFontTitle(tokens) {
  return `${tokens.fontPixels}px/${tokens.lineHeightTitlePixels}px ${FONT_STACK}`;
}
function composeVariables(tokens) {
  const stated = [
    composeVariable("surface", formatColour(SURFACE.panel)),
    composeVariable("raised", formatColour(SURFACE.raised)),
    composeVariable("track", formatColour(SURFACE.track)),
    composeVariable("border", formatColour(SURFACE.border)),
    composeVariable("text", formatColour(TEXT.plain)),
    composeVariable("quiet", formatColour(TEXT.quiet)),
    composeVariable("suspect", formatColour(SIGNAL.suspect)),
    composeVariable("caveat", formatColour(SIGNAL.caveat)),
    composeVariable("defect", formatColour(SIGNAL.defect)),
    composeVariable("ours", formatColour(SIGNAL.ours)),
    composeVariable("theirs", formatColour(SIGNAL.theirs)),
    composeVariable("nobody", formatColour(SIGNAL.unknown)),
    composeVariable("heading", formatRgbColour(composeColourOver(TEXT.quiet, SURFACE.panel, HEADING_TINT))),
    composeVariable("mask", formatColour(MASK_INK)),
    composeVariable("bar-tint", `${BAR_TINT}`),
    composeVariable("half", `${SPACE_PIXELS.half}px`),
    composeVariable("small", `${SPACE_PIXELS.small}px`),
    composeVariable("region-down", `${SPACE_PIXELS.regionDown}px`),
    composeVariable("region-across", `${SPACE_PIXELS.regionAcross}px`),
    composeVariable("wide", `${SPACE_PIXELS.wide}px`),
    composeVariable("row-height", `${tokens.rowHeightPixels}px`),
    composeVariable("radius", `${SHAPE.radiusPixels}px`),
    composeVariable("radius-small", `${SHAPE.radiusSmallPixels}px`)
  ].join("");
  return stated;
}
function composeVariable(name, variableValue) {
  return `${VARIABLE_PREFIX}${name}:${variableValue};`;
}
function formatRgbColour(colour) {
  return `rgb(${colour[0]} ${colour[1]} ${colour[2]})`;
}
function composeRegionRules(tokens) {
  const region = `var(${VARIABLE_PREFIX}region-down) var(${VARIABLE_PREFIX}region-across)`;
  return `.${CLASS.header}{display:block;padding:${region};padding-bottom:0;}.${CLASS.headerLine}{display:flex;align-items:baseline;gap:var(${VARIABLE_PREFIX}wide);}.${CLASS.headerLine}>*{flex:none;}.${CLASS.headerPlace}{flex:1 1 auto;min-width:0;display:flex;justify-content:flex-end;color:var(${VARIABLE_PREFIX}quiet);font-size:${tokens.fontSmallPixels}px;white-space:nowrap;}.${CLASS.headerPlaceName}{overflow:hidden;text-overflow:ellipsis;}.${CLASS.headerPlaceTile}{white-space:pre;}.${CLASS.headerOutcome}{color:var(${VARIABLE_PREFIX}quiet);text-transform:uppercase;font-size:${tokens.fontSmallPixels}px;}.${CLASS.headerOutcome}.${CLASS.outcomeWon}{color:var(${VARIABLE_PREFIX}ours);}.${CLASS.headerOutcome}.${CLASS.outcomeLost}{color:var(${VARIABLE_PREFIX}theirs);}.${CLASS.strips}{display:flex;flex-wrap:wrap;gap:var(${VARIABLE_PREFIX}half);padding:${region};padding-bottom:0;}.${CLASS.strips}+.${CLASS.strips}{padding-top:var(${VARIABLE_PREFIX}radius-small);}.${CLASS.stripsGap}{flex:1;}.${CLASS.strip}{white-space:nowrap;padding:0 var(${VARIABLE_PREFIX}small);line-height:var(${VARIABLE_PREFIX}row-height);border-radius:var(${VARIABLE_PREFIX}radius-small);color:var(${VARIABLE_PREFIX}quiet);background:transparent;cursor:pointer;${NO_SELECTION}}.${CLASS.strip}.${CLASS.stripCurrent}{color:var(${VARIABLE_PREFIX}text);background:var(${VARIABLE_PREFIX}raised);}.${CLASS.crumb}{display:flex;gap:var(${VARIABLE_PREFIX}wide);align-items:baseline;padding:${region};padding-bottom:0;}.${CLASS.crumbBack}{cursor:pointer;color:var(${VARIABLE_PREFIX}quiet);line-height:var(${VARIABLE_PREFIX}row-height);}.${CLASS.crumbBack}:hover{color:var(${VARIABLE_PREFIX}text);}.${CLASS.crumbHere}{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}`;
}
function composeOptionsRules(tokens) {
  const chosen = CLASS.stripCurrent;
  const stepSizes = TYPE_STEPS.map((step) => `.${composeOptionsStepClass(step)}{font-size:${TYPE_TOKENS[step].fontPixels}px;}`).join("");
  return `.${CLASS.optionsQuestion}{padding:var(${VARIABLE_PREFIX}wide) var(${VARIABLE_PREFIX}region-across) 0;}.${CLASS.options}{padding-bottom:var(${VARIABLE_PREFIX}wide);}.${CLASS.optionsHeading}{color:var(${VARIABLE_PREFIX}heading);letter-spacing:${HEADING_LETTER_SPACING_EM}em;font-size:${tokens.fontSmallPixels}px;text-transform:uppercase;}.${CLASS.optionsSteps}{display:flex;margin-top:var(${VARIABLE_PREFIX}half);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:var(${VARIABLE_PREFIX}radius-small);overflow:hidden;}.${CLASS.optionsStep}{flex:1 1 0;height:var(${VARIABLE_PREFIX}row-height);line-height:var(${VARIABLE_PREFIX}row-height);text-align:center;white-space:nowrap;color:var(${VARIABLE_PREFIX}quiet);border-left:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);cursor:pointer;${NO_SELECTION}}.${CLASS.optionsStep}:first-child{border-left:none;}` + stepSizes + `.${CLASS.optionsWindow}{display:flex;align-items:center;gap:var(${VARIABLE_PREFIX}small);height:var(${VARIABLE_PREFIX}row-height);margin-top:var(${VARIABLE_PREFIX}half);padding-left:var(${VARIABLE_PREFIX}small);}.${CLASS.optionsWindowName}{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${CLASS.optionsWindowState}{color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.optionsWindowState}.${CLASS.optionsWindowOwn}{color:var(${VARIABLE_PREFIX}text);}.${CLASS.optionsReset}{padding:0 var(${VARIABLE_PREFIX}small);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:var(${VARIABLE_PREFIX}radius-small);background:var(${VARIABLE_PREFIX}raised);color:var(${VARIABLE_PREFIX}text);font-size:${tokens.fontSmallPixels}px;line-height:calc(var(${VARIABLE_PREFIX}row-height) - ${2 * RULE_WIDTH_PIXELS}px);cursor:pointer;${NO_SELECTION}}.${CLASS.optionsAnswer}{display:flex;align-items:center;height:var(${VARIABLE_PREFIX}row-height);margin-top:var(${VARIABLE_PREFIX}half);padding:0 var(${VARIABLE_PREFIX}small) 0 var(${VARIABLE_PREFIX}half);border-radius:var(${VARIABLE_PREFIX}radius-small);color:var(${VARIABLE_PREFIX}quiet);white-space:nowrap;cursor:pointer;${NO_SELECTION}}.${CLASS.optionsAnswer}::before{content:"";flex:none;text-align:center;width:calc(var(${VARIABLE_PREFIX}wide) + var(${VARIABLE_PREFIX}small));}.${CLASS.optionsAnswer}.${chosen}::before{content:"\u2713";}.${CLASS.optionsStep}:hover,.${CLASS.optionsAnswer}:hover{color:var(${VARIABLE_PREFIX}text);}.${CLASS.optionsStep}.${chosen},.${CLASS.optionsAnswer}.${chosen}{color:var(${VARIABLE_PREFIX}text);background:var(${VARIABLE_PREFIX}track);font-weight:600;}.${CLASS.optionsMeaning}{margin-top:var(${VARIABLE_PREFIX}small);padding:0 var(${VARIABLE_PREFIX}half);color:var(${VARIABLE_PREFIX}quiet);font-size:${tokens.fontSmallPixels}px;}.${CLASS.optionsVersion}{margin-top:var(${VARIABLE_PREFIX}half);padding:0 var(${VARIABLE_PREFIX}half);font-variant-numeric:tabular-nums;}`;
}
function composeListRules(tokens) {
  const region = `var(${VARIABLE_PREFIX}region-down) var(${VARIABLE_PREFIX}region-across)`;
  const belowRows = composeInsetUnderRows(VARIABLE_PREFIX + "region-down");
  const rowCost = `(var(${VARIABLE_PREFIX}row-height) + var(${VARIABLE_PREFIX}half))`;
  return `.${CLASS.list}{padding:${region};padding-bottom:${belowRows};height:calc(var(${ROWS_VARIABLE},${ROWS_BY_DEFAULT}) * ${rowCost});overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none;}.${CLASS.figure}{flex:none;white-space:nowrap;}.${CLASS.sectionWords}{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${CLASS.section}{position:sticky;top:calc(0px - var(${VARIABLE_PREFIX}region-down));z-index:${LAYER.section};background:var(${VARIABLE_PREFIX}surface);display:flex;justify-content:space-between;color:var(${VARIABLE_PREFIX}heading);letter-spacing:${HEADING_LETTER_SPACING_EM}em;font-size:${tokens.fontSmallPixels}px;padding:var(${VARIABLE_PREFIX}small) var(${VARIABLE_PREFIX}half) var(${VARIABLE_PREFIX}half);}.${CLASS.listWaiting}{display:flex;align-items:center;justify-content:center;text-align:center;}.${CLASS.empty}{color:var(${VARIABLE_PREFIX}quiet);padding:var(${VARIABLE_PREFIX}wide) var(${VARIABLE_PREFIX}half);}.${CLASS.undrawn}{color:var(${VARIABLE_PREFIX}quiet);font-style:italic;padding:var(${VARIABLE_PREFIX}small);}.${CLASS.sides}{padding:var(${VARIABLE_PREFIX}region-down) var(${VARIABLE_PREFIX}region-across);border-top:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);overflow:hidden;}.${CLASS.sidesLine}{display:flex;justify-content:space-between;align-items:baseline;font-variant-numeric:tabular-nums;font-weight:600;}.${CLASS.sidesLabel}{color:var(${VARIABLE_PREFIX}quiet);font-weight:400;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${CLASS.sidesSpare}{margin-top:var(${VARIABLE_PREFIX}small);font-size:${tokens.fontSmallPixels}px;}.${CLASS.sidesSpare} .${CLASS.sidesLabel}{color:inherit;}.${CLASS.sidesTrack}{display:flex;height:${SIDES_TRACK_HEIGHT_PIXELS}px;margin-top:var(${VARIABLE_PREFIX}small);border-radius:var(${VARIABLE_PREFIX}radius-small);overflow:hidden;background:var(${VARIABLE_PREFIX}track);}.${CLASS.sidesOurs}{color:var(${VARIABLE_PREFIX}ours);}.${CLASS.sidesTheirs}{color:var(${VARIABLE_PREFIX}theirs);}.${CLASS.sidesNobody}{color:var(${VARIABLE_PREFIX}nobody);}.${CLASS.sidesTrack}>*{background:currentColor;}.${CLASS.suspicions}{border-top:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);padding-top:var(${VARIABLE_PREFIX}region-down);}.${CLASS.suspicion}{color:var(${VARIABLE_PREFIX}suspect);padding:0 var(${VARIABLE_PREFIX}region-across) var(${VARIABLE_PREFIX}region-down);}.${CLASS.defects}{border-top:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);padding-top:var(${VARIABLE_PREFIX}region-down);}.${CLASS.defect}{color:var(${VARIABLE_PREFIX}defect);padding:0 var(${VARIABLE_PREFIX}region-across) var(${VARIABLE_PREFIX}region-down);}`;
}
function composeInsetUnderRows(inset) {
  const written = `calc(var(${inset}) - var(${VARIABLE_PREFIX}half))`;
  return written;
}
function composeRowRules(tokens) {
  const capRight = `var(${VARIABLE_PREFIX}radius-small)`;
  const cap = `${capRight} 0 0 ${capRight}`;
  return `.${CLASS.row}{position:relative;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;height:var(${VARIABLE_PREFIX}row-height);padding:${ROW_INK_DROP_PIXELS}px var(${VARIABLE_PREFIX}wide) 0;margin-bottom:var(${VARIABLE_PREFIX}half);border-radius:var(${VARIABLE_PREFIX}radius-small);background:var(${VARIABLE_PREFIX}track);overflow:hidden;${NO_SELECTION}}.${CLASS.row}.${CLASS.rowDrillable}{cursor:pointer;}.${CLASS.row}.${CLASS.rowLeaf}{cursor:help;}.${CLASS.bar}{position:absolute;left:0;top:0;bottom:0;opacity:var(${VARIABLE_PREFIX}bar-tint);}.${CLASS.barCap}{position:absolute;left:0;top:0;bottom:0;width:${CAP_WIDTH_PIXELS}px;border-radius:${cap};}.${CLASS.rowRank},.${CLASS.rowName},.${CLASS.rowValue}{position:relative;}.${CLASS.rowRank}{color:var(${VARIABLE_PREFIX}text);font-variant-numeric:tabular-nums;flex:none;box-sizing:border-box;width:${tokens.rankWidthPixels}px;text-align:right;padding-right:var(${VARIABLE_PREFIX}small);}.${CLASS.rowTime}{color:var(${VARIABLE_PREFIX}quiet);font-variant-numeric:tabular-nums;flex:none;padding-right:var(${VARIABLE_PREFIX}small);}.${CLASS.rowName}{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}.${CLASS.rowSuspect}{position:relative;color:var(${VARIABLE_PREFIX}suspect);flex:none;padding-right:var(${VARIABLE_PREFIX}small);background:var(${VARIABLE_PREFIX}track);border-radius:var(${VARIABLE_PREFIX}radius-small);}.${CLASS.rowCaveat}{position:relative;margin-right:var(${VARIABLE_PREFIX}small);background:var(${VARIABLE_PREFIX}track);}.${CLASS.rowTurn}{position:relative;color:var(${VARIABLE_PREFIX}text);flex:none;padding-right:var(${VARIABLE_PREFIX}small);}.${CLASS.rowSide}{position:absolute;right:0;top:0;bottom:0;width:${ROW_SIDE_WIDTH_PIXELS}px;border-radius:0 ${capRight} ${capRight} 0;background:currentColor;}.${CLASS.rowSize}{flex:none;padding-right:var(${VARIABLE_PREFIX}small);}.${CLASS.row}.${CLASS.rowChosen}{box-shadow:inset ${CAP_WIDTH_PIXELS}px 0 0 var(${VARIABLE_PREFIX}text);}.${CLASS.rowPin}{position:relative;cursor:pointer;color:var(${VARIABLE_PREFIX}quiet);width:var(${VARIABLE_PREFIX}row-height);flex:none;align-self:stretch;display:flex;align-items:center;justify-content:center;font-size:0;margin:-${ROW_INK_DROP_PIXELS}px var(${VARIABLE_PREFIX}small) 0 0;padding-top:${ROW_INK_DROP_PIXELS}px;}.${CLASS.rowPin}:hover{color:var(${VARIABLE_PREFIX}text);}.${CLASS.rowPin}.${CLASS.rowPinSet}{color:var(${VARIABLE_PREFIX}text);}` + composePinStarRules(tokens) + `.${CLASS.rowValue}{font-variant-numeric:tabular-nums;flex:none;white-space:nowrap;padding-left:var(${VARIABLE_PREFIX}wide);font-weight:600;}.${CLASS.rowOutcome}{position:relative;flex:none;width:var(${VARIABLE_PREFIX}row-height);text-align:center;font-weight:600;color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.rowOutcome}.${CLASS.outcomeWon}{color:var(${VARIABLE_PREFIX}ours);}.${CLASS.rowOutcome}.${CLASS.outcomeLost}{color:var(${VARIABLE_PREFIX}theirs);}.${CLASS.row}.${CLASS.rowUnread} .${CLASS.rowName}{color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.row}.${CLASS.rowUnread} .${CLASS.rowOutcome}{color:var(${VARIABLE_PREFIX}defect);}.${CLASS.rowShare}{color:var(${VARIABLE_PREFIX}text);padding-left:var(${VARIABLE_PREFIX}small);font-weight:400;}.${CLASS.row}.${CLASS.rowApart} .${CLASS.bar}{opacity:0.4;mask-image:repeating-linear-gradient(-45deg,var(${VARIABLE_PREFIX}mask) 0 ${MASK_STRIPE_PIXELS}px,transparent ${MASK_STRIPE_PIXELS}px ${2 * MASK_STRIPE_PIXELS}px);}.${CLASS.row}.${CLASS.rowApart} .${CLASS.barCap}{opacity:0.7;}`;
}
function composePinStarRules(tokens) {
  const lined = tokens.rowHeightPixels - 2 * PIN_INSET_PIXELS;
  const size = lined + lined % 2;
  const star = `<path stroke-width='1' stroke-linejoin='round' d='${PIN_STAR_PATH}'/>`;
  return `.${CLASS.rowPin}::before{content:"";flex:none;width:${size}px;height:${size}px;background:currentColor;${composeMaskImage("fill='none'", star)}}.${CLASS.rowPin}.${CLASS.rowPinSet}::before{${composeMaskImage("fill='black'", star)}}`;
}
function composeUnderListRules() {
  const inset = composeInsetUnderRows(VARIABLE_PREFIX + "region-down");
  const shape = `margin:0 var(${VARIABLE_PREFIX}region-across);padding:var(${VARIABLE_PREFIX}region-down) 0 ${inset};border-top:${RULE_WIDTH_PIXELS}px dashed var(${VARIABLE_PREFIX}border);overflow:hidden;`;
  return `.${CLASS.pinned}{${shape}}.${CLASS.outside}{${shape}}`;
}
function composeCardRules(tokens) {
  const right = `var(${CARD_VARIABLES.right},calc(${PLACE.insetPixels}px + var(${SIZE_VARIABLES.meter.width},${tokens.meterWidthPixels}px) + ${SPACE_PIXELS.small}px))`;
  return `.${CLASS.card}{position:fixed;box-sizing:border-box;pointer-events:none;left:var(${CARD_VARIABLES.left},auto);right:${right};top:${composeCardTop()};z-index:${LAYER.card};width:max-content;max-width:min(${tokens.cardWidthPixelsMaximum}px,calc(100vw - ${PLACE.insetPixels}px - ${PLACE.insetPixels}px));max-height:calc(100vh - ${PLACE.insetPixels}px - ${PLACE.insetPixels}px);overflow:hidden;padding:var(${VARIABLE_PREFIX}small);font:${composeFontBody(tokens)};color:var(${VARIABLE_PREFIX}text);background:var(${VARIABLE_PREFIX}raised);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:var(${VARIABLE_PREFIX}radius);box-shadow:${SHAPE.windowShadow};}.${CLASS.cardHidden}{display:none;}.${CLASS.card}.${CLASS.cardWide}{width:min(${calculateCardWidthForColumns(tokens, 2)}px,calc(100vw - ${PLACE.insetPixels}px - ${PLACE.insetPixels}px));max-width:none;}.${CLASS.cardColumns}{display:flex;gap:var(${VARIABLE_PREFIX}wide);}.${CLASS.cardColumn}{flex:1 1 0;min-width:0;}.${CLASS.cardColumn}+.${CLASS.cardColumn}{padding-left:var(${VARIABLE_PREFIX}wide);border-left:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);}.${CLASS.cardName}{font-weight:600;overflow-wrap:break-word;}.${CLASS.cardSubtitle}{color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.cardGroup}{margin-top:var(${VARIABLE_PREFIX}small);padding-top:var(${VARIABLE_PREFIX}small);border-top:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);}.${CLASS.cardLine}{display:flex;justify-content:space-between;gap:var(${VARIABLE_PREFIX}small);}.${CLASS.cardLine}.${CLASS.cardStrong}{font-weight:600;}.${CLASS.cardLine}.${CLASS.cardSub}{padding-left:var(${VARIABLE_PREFIX}wide);}.${CLASS.cardLabel}{color:var(${VARIABLE_PREFIX}quiet);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${CLASS.cardValue}{font-variant-numeric:tabular-nums;flex:none;}` + composeCaveatMarkRule(tokens) + // The same letters a cut's heading wears down the panel, so a run of parts under one
  // reads as the same kind of thing in both places. `DESIGN.md` owns the look.
  `.${CLASS.cardHeading}{color:var(${VARIABLE_PREFIX}heading);letter-spacing:${HEADING_LETTER_SPACING_EM}em;font-size:${tokens.fontSmallPixels}px;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${CLASS.cardNote}{color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.cardNote}.${CLASS.cardCaveatNote}{display:flex;align-items:flex-start;gap:var(${VARIABLE_PREFIX}small);}.${CLASS.cardNote} .${CLASS.cardCaveat}{order:-1;align-self:flex-start;margin-top:${Math.floor((tokens.lineHeightPixels - tokens.markSizePixels) / 2)}px;}.${CLASS.cardNote}.${CLASS.cardSuspect}{color:var(${VARIABLE_PREFIX}suspect);}.${CLASS.cardNote}.${CLASS.cardDefect}{color:var(${VARIABLE_PREFIX}defect);}.${CLASS.cardOutcome}.${CLASS.outcomeWon}{color:var(${VARIABLE_PREFIX}ours);}.${CLASS.cardOutcome}.${CLASS.outcomeLost}{color:var(${VARIABLE_PREFIX}theirs);}.${CLASS.cardNote}.${CLASS.cardCaveatNote}{color:var(${VARIABLE_PREFIX}caveat);}`;
}
function composeCardTop() {
  return `clamp(${PLACE.insetPixels}px,var(${CARD_VARIABLES.top},${PLACE.insetPixels}px),calc(100vh - var(${CARD_VARIABLES.height},0px) - ${PLACE.insetPixels}px))`;
}
function composeCaveatMarkRule(tokens) {
  const marks = `.${CLASS.rowCaveat},.${CLASS.cardCaveat}`;
  const { clearPixels, gapPixels, stemWidthPixels } = CAVEAT_LETTER;
  const inside = tokens.markSizePixels - 2 * RULE_WIDTH_PIXELS;
  const stemTop = clearPixels + stemWidthPixels + gapPixels;
  return `${marks}{box-sizing:border-box;display:inline-flex;align-self:center;flex:none;position:relative;font-size:0;width:${tokens.markSizePixels}px;height:${tokens.markSizePixels}px;color:var(${VARIABLE_PREFIX}caveat);border:${RULE_WIDTH_PIXELS}px solid currentColor;border-radius:50%;}.${CLASS.rowCaveat}::before,.${CLASS.cardCaveat}::before,.${CLASS.rowCaveat}::after,.${CLASS.cardCaveat}::after{content:"";position:absolute;left:${(inside - stemWidthPixels) / 2}px;width:${stemWidthPixels}px;background:currentColor;}.${CLASS.rowCaveat}::before,.${CLASS.cardCaveat}::before{top:${clearPixels}px;height:${stemWidthPixels}px;}.${CLASS.rowCaveat}::after,.${CLASS.cardCaveat}::after{top:${stemTop}px;height:${inside - stemTop - clearPixels}px;}`;
}
function composeHelperRules(tokens) {
  const top = `clamp(${PLACE.insetPixels}px,var(${TOP_VARIABLES.helper},${PLACE.insetPixels}px),calc(100vh - ${PLACE.insetPixels}px))`;
  const left = `calc(100vw - ${PLACE.insetPixels}px - var(${SIZE_VARIABLES.meter.width},${tokens.meterWidthPixels}px) - var(${SIZE_VARIABLES.helper.width},${tokens.helperWidthPixels}px) - ${SPACE_PIXELS.small}px)`;
  return `.${CLASS.helper}{position:fixed;box-sizing:border-box;left:${left};top:${top};z-index:${LAYER.helper};width:var(${SIZE_VARIABLES.helper.width},${tokens.helperWidthPixels}px);display:flex;flex-direction:column;max-height:calc(100vh - ${PLACE.insetPixels}px - ${PLACE.insetPixels}px);font:${composeFontBody(tokens)};color:var(${VARIABLE_PREFIX}text);}.${CLASS.helperBar}{flex:none;display:flex;align-items:center;gap:var(${VARIABLE_PREFIX}small);padding:var(${VARIABLE_PREFIX}half) var(${VARIABLE_PREFIX}wide);font:${composeFontTitle(tokens)};letter-spacing:${TITLE_LETTER_SPACING_EM}em;color:var(${VARIABLE_PREFIX}quiet);white-space:nowrap;background:var(${VARIABLE_PREFIX}raised);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-bottom:none;border-radius:var(${VARIABLE_PREFIX}radius) var(${VARIABLE_PREFIX}radius) 0 0;cursor:move;${NO_SELECTION}touch-action:none;}.${CLASS.helperBar} .${CLASS.control}{margin-left:auto;}.${CLASS.helperBody}{min-height:0;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;height:var(${SIZE_VARIABLES.helper.height},auto);overscroll-behavior:contain;scrollbar-width:none;padding:var(${VARIABLE_PREFIX}region-down) var(${VARIABLE_PREFIX}region-across);padding-bottom:calc(var(${VARIABLE_PREFIX}region-down) - var(${VARIABLE_PREFIX}half));background:var(${VARIABLE_PREFIX}surface);border:${RULE_WIDTH_PIXELS}px solid var(${VARIABLE_PREFIX}border);border-radius:0 0 var(${VARIABLE_PREFIX}radius) var(${VARIABLE_PREFIX}radius);}.${CLASS.helper}.${CLASS.helperFolded} .${CLASS.helperBody}{display:none;}.${CLASS.helperUnder}{margin-left:var(${VARIABLE_PREFIX}wide);}.${CLASS.helperHolding} .${CLASS.rowName}{flex:0 1 auto;}.${CLASS.helperHolding} .${CLASS.rowShare}{color:var(${VARIABLE_PREFIX}quiet);}.${CLASS.helperCast}{color:var(${VARIABLE_PREFIX}quiet);flex:1 1 0;min-width:min(${tokens.castWidthPixelsMinimum}px,100%);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:var(${VARIABLE_PREFIX}small);}.${CLASS.helperPips}{position:relative;flex:none;display:flex;align-items:center;gap:var(${VARIABLE_PREFIX}half);padding-left:var(${VARIABLE_PREFIX}small);}.${CLASS.helperPip}{width:${tokens.pipSizePixels}px;height:${tokens.pipSizePixels}px;border-radius:50%;flex:none;background:var(${VARIABLE_PREFIX}border);}.${CLASS.helperPip}.${CLASS.helperPipLit}{background:currentColor;}.${CLASS.helper}.${CLASS.helperFolded} .${CLASS.sizeGrip}{display:none;}` + composeSizeGripRules();
}
function composeSizeGripRules() {
  const strokes = "transparent 0 50%,currentColor 50% 60%,transparent 60% 72%,currentColor 72% 82%,transparent 82%";
  const meterOutside = `-${RULE_WIDTH_PIXELS}px`;
  return `.${CLASS.sizeGrip}{position:absolute;right:0;bottom:0;width:${SIZE_GRIP.sizePixels}px;height:${SIZE_GRIP.sizePixels}px;z-index:${LAYER.grip};color:var(${VARIABLE_PREFIX}quiet);background:linear-gradient(135deg,${strokes});cursor:nwse-resize;touch-action:none;${NO_SELECTION}}.${CLASS.meter}>.${CLASS.sizeGrip}{right:${meterOutside};bottom:${meterOutside};}.${CLASS.sizeGrip}:hover{color:var(${VARIABLE_PREFIX}text);}`;
}

// src/ui/panel-drag.ts
var GRAB_KIND = {
  move: "move",
  size: "size"
};
var CARD_EDGE = {
  left: "left",
  right: "right"
};
var VISIBLE_PIXELS_MINIMUM = 64;
var GRIP_ATTRIBUTE = "data-grip";
var SIZE_GRIP_ATTRIBUTE = "data-size-grip";
var WIDTH_TIMES_TYPE_MAXIMUM = 2;
var ROWS_BY_WINDOW_MINIMUM = {
  [PANEL_WINDOW.meter]: 6,
  [PANEL_WINDOW.helper]: 3
};
var HELPER_GAP_PIXELS = SPACE_PIXELS.small;
function clampPosition(position, viewport) {
  if (viewport === null) {
    return {
      left: clampPositionWithin(position.left, Number.POSITIVE_INFINITY),
      top: clampPositionWithin(position.top, Number.POSITIVE_INFINITY)
    };
  }
  return {
    left: clampPositionWithin(position.left, viewport.width - VISIBLE_PIXELS_MINIMUM),
    top: clampPositionWithin(position.top, viewport.height - VISIBLE_PIXELS_MINIMUM)
  };
}
function clampPositionWithin(coordinate, limit) {
  if (!Number.isFinite(coordinate)) return 0;
  let clamped;
  if (Number.isFinite(limit)) clamped = clampNumber(coordinate, 0, limit);
  else clamped = coordinate;
  const rounded = Math.round(clamped);
  if (!Number.isSafeInteger(rounded)) return 0;
  return rounded;
}
function composeDefaultPosition(viewport, meterWidthPixels) {
  if (viewport === null) return null;
  const height = viewport.height * METER_HEIGHT_VIEWPORT_PERCENT_MAXIMUM / 100;
  return clampPosition({
    left: (viewport.width - meterWidthPixels) / 2,
    top: (viewport.height - height) / 2
  }, viewport);
}
function composePositionStyle(position, panelWindow) {
  if (!Number.isSafeInteger(position.left)) return null;
  if (!Number.isSafeInteger(position.top)) return null;
  const left = formatWholeUngrouped(position.left);
  const top = formatWholeUngrouped(position.top);
  return `left:${left}px;top:${top}px;${TOP_VARIABLES[panelWindow]}:${top}px;right:auto`;
}
function composeHostStyle(position, size, panelWindow) {
  const placed = position === null ? null : composePositionStyle(position, panelWindow);
  if (size === null) return placed;
  if (!Number.isSafeInteger(size.width)) return placed;
  if (!Number.isSafeInteger(size.height)) return placed;
  const variables = SIZE_VARIABLES[panelWindow];
  const width = formatWholeUngrouped(size.width);
  const height = formatWholeUngrouped(size.height);
  const both = `${variables.width}:${width}px;${variables.height}:${height}px`;
  const sized = panelWindow === PANEL_WINDOW.meter ? `${both};${composeSizedPanelStyle()}` : both;
  return placed === null ? sized : `${placed};${sized}`;
}
function composeSizeBounds(panelWindow, tokens, position, viewport) {
  const widthMinimum = getWindowWidthPixels(panelWindow, tokens);
  const rowCost = tokens.rowHeightPixels + SPACE_PIXELS.half;
  const heightMinimum = ROWS_BY_WINDOW_MINIMUM[panelWindow] * rowCost;
  const widthTypeMaximum = widthMinimum * WIDTH_TIMES_TYPE_MAXIMUM;
  let widthMaximum;
  let heightMaximum;
  if (viewport !== null) {
    if (position !== null) {
      widthMaximum = Math.min(widthTypeMaximum, viewport.width - position.left - PLACE.insetPixels);
      heightMaximum = viewport.height - position.top - calculateBarHeight(tokens) - PLACE.insetPixels;
    } else {
      widthMaximum = widthTypeMaximum;
      heightMaximum = Number.POSITIVE_INFINITY;
    }
  } else {
    widthMaximum = widthTypeMaximum;
    heightMaximum = Number.POSITIVE_INFINITY;
  }
  return {
    widthMinimum,
    widthMaximum: Math.max(widthMinimum, widthMaximum),
    heightMinimum,
    heightMaximum: Math.max(heightMinimum, heightMaximum)
  };
}
function getWindowWidthPixels(panelWindow, tokens) {
  if (panelWindow === PANEL_WINDOW.helper) return tokens.helperWidthPixels;
  return tokens.meterWidthPixels;
}
function clampSize(size, bounds) {
  const width = Number.isFinite(size.width) ? size.width : bounds.widthMinimum;
  const height = Number.isFinite(size.height) ? size.height : bounds.heightMinimum;
  const heightHeld = Number.isFinite(bounds.heightMaximum) ? clampNumber(height, bounds.heightMinimum, bounds.heightMaximum) : Math.max(height, bounds.heightMinimum);
  return {
    width: Math.round(clampNumber(width, bounds.widthMinimum, bounds.widthMaximum)),
    height: Math.round(heightHeld)
  };
}
function composeCardAcross(anchor, viewport, cardWidthMaximum) {
  if (!Number.isFinite(cardWidthMaximum)) return null;
  if (cardWidthMaximum <= 0) return null;
  if (anchor === null) return null;
  if (viewport === null) return null;
  const gap = SPACE_PIXELS.small;
  if (anchor.position.left - cardWidthMaximum - gap >= 0) {
    return {
      edge: CARD_EDGE.right,
      offsetPixels: viewport.width - anchor.position.left + gap
    };
  }
  const right = calculateWindowRight(anchor);
  return {
    edge: CARD_EDGE.left,
    offsetPixels: Math.min(right + gap, Math.max(0, viewport.width - cardWidthMaximum))
  };
}
function calculateWindowRight(place) {
  return place.position.left + place.widthPixels;
}
function setGripMark(grip, window2) {
  grip.setAttribute(GRIP_ATTRIBUTE, window2);
}
function composeHelperPositionAfterTypeStep(meter, helper, before, after) {
  const helperRight = helper.left + before.helper;
  if (helperRight <= meter.left) {
    return {
      left: helper.left - (after.helper - before.helper),
      top: helper.top
    };
  }
  if (helper.left >= meter.left + before.meter) {
    return {
      left: helper.left + (after.meter - before.meter),
      top: helper.top
    };
  }
  return null;
}
function initPanelDrag(root, host, getBar, placement, options) {
  const state = {
    position: null,
    size: placement.size,
    grab: null,
    written: null
  };
  const writeHostStyle = () => {
    const applied = readPanelDragSize(state, placement, options);
    const style = composeHostStyle(state.position, applied, options.window);
    if (style === state.written) return;
    host.setAttribute(STYLE_ATTRIBUTE, style ?? "");
    state.written = style;
  };
  {
    const opened = attempt(() => {
      const opening = placement.position ?? composeOpeningPosition(options.window, placement.readViewport(), options.getTypeTokens());
      state.position = opening === null ? null : clampPosition(opening, placement.readViewport());
      writeHostStyle();
      return state.position;
    });
    if (opened instanceof Error) {
      addViewFailureGuarded(new WindowUnplaced(options.window, opened), options.onFailure);
      state.position = null;
      const sized = attempt(writeHostStyle);
      if (sized instanceof Error) {
        addViewFailureGuarded(new WindowUnplaced(options.window, sized), options.onFailure);
      }
    }
  }
  {
    const addRootListener = (type, listener, handle) => {
      addGuardedListener(root, type, listener, handle, (failure) => {
        state.grab = null;
        addViewFailureGuarded(failure, options.onFailure);
      });
    };
    const getGrabbedElement = (grab) => {
      if (grab.kind === GRAB_KIND.size) return options.grip;
      return getBar();
    };
    addRootListener(EVENT_TYPE.press, PANEL_LISTENER.grab, (event) => {
      const started = composePanelDragGrab(event, state, placement, options);
      if (started === null) return;
      event.preventDefault?.();
      state.grab = started;
      writePointerCapture(getGrabbedElement(started), true, event.pointerId, options);
    });
    const onDragEnd = () => {
      const grab = state.grab;
      if (grab === null) return;
      state.grab = null;
      writePointerCapture(getGrabbedElement(grab), false, grab.pointerId, options);
      const window2 = options.window;
      if (grab.kind === GRAB_KIND.size) {
        const size = state.size;
        if (size !== null) options.onIntent({
          kind: PANEL_INTENT.resize,
          window: window2,
          size
        });
      } else {
        const position = state.position;
        if (position !== null) {
          options.onIntent({
            kind: PANEL_INTENT.move,
            window: window2,
            position
          });
        }
      }
    };
    addRootListener(EVENT_TYPE.move, PANEL_LISTENER.drag, (event) => {
      const grab = state.grab;
      if (grab === null) return;
      if (event.buttons === 0) {
        onDragEnd();
        return;
      }
      const pointer = readPointerFromEvent(event);
      if (pointer === null) return;
      const viewport = placement.readViewport();
      if (grab.kind === GRAB_KIND.move) {
        state.position = composeDraggedPosition(grab, pointer, viewport);
        writeHostStyle();
        return;
      }
      state.size = composeDraggedSize(grab, pointer, state, placement, options);
      writeHostStyle();
    });
    addRootListener(EVENT_TYPE.release, PANEL_LISTENER.release, onDragEnd);
    addRootListener(EVENT_TYPE.cancel, PANEL_LISTENER.cancel, onDragEnd);
  }
  return {
    getPosition: () => state.position,
    holdBarRedrawn: () => {
      if (state.grab?.kind === GRAB_KIND.move) {
        const grab = state.grab;
        writePointerCapture(getBar(), true, grab.pointerId, options);
      }
    },
    placeWindow: (positionRequested) => {
      const position = clampPosition(positionRequested, placement.readViewport());
      state.position = position;
      writeHostStyle();
      options.onIntent({
        kind: PANEL_INTENT.move,
        window: options.window,
        position
      });
    },
    readWidthPixels: () => {
      const applied = readPanelDragSize(state, placement, options);
      return applied?.width ?? getWindowWidthPixels(options.window, options.getTypeTokens());
    },
    sizeWindow: (size) => {
      if (state.grab?.kind === GRAB_KIND.size) return;
      state.size = size;
      writeHostStyle();
    }
  };
}
function readPanelDragSize(state, placement, options) {
  if (state.size === null) return null;
  const viewport = placement.readViewport();
  const tokens = options.getTypeTokens();
  return clampSize(state.size, composeSizeBounds(options.window, tokens, state.position, viewport));
}
function composeOpeningPosition(panelWindow, viewport, tokens) {
  if (panelWindow === PANEL_WINDOW.helper) return composeHelperOpeningPosition(viewport, tokens);
  return composeDefaultPosition(viewport, tokens.meterWidthPixels);
}
function composeHelperOpeningPosition(viewport, tokens) {
  const meter = composeDefaultPosition(viewport, tokens.meterWidthPixels);
  if (meter === null) return null;
  const gap = HELPER_GAP_PIXELS;
  const beside = meter.left - tokens.helperWidthPixels - gap;
  if (beside >= 0) return clampPosition({
    left: beside,
    top: meter.top
  }, viewport);
  const rightOfMeter = {
    left: meter.left + tokens.meterWidthPixels + gap,
    top: meter.top
  };
  return clampPosition(rightOfMeter, viewport);
}
function composePanelDragGrab(event, state, placement, options) {
  const grip = event.target?.getAttribute(GRIP_ATTRIBUTE) ?? null;
  const corner = event.target?.getAttribute(SIZE_GRIP_ATTRIBUTE) ?? null;
  const mark = options.window;
  const kind = grip === mark ? GRAB_KIND.move : corner === mark ? GRAB_KIND.size : null;
  if (kind === null) return null;
  const pointer = readPointerFromEvent(event);
  if (pointer === null) return null;
  const tokens = options.getTypeTokens();
  const from = state.position ?? composeOpeningPosition(options.window, placement.readViewport(), tokens);
  if (from === null) return null;
  const grab = {
    kind,
    pointerLeft: pointer.left,
    pointerTop: pointer.top,
    pointerId: event.pointerId
  };
  if (kind === GRAB_KIND.move) return {
    ...grab,
    fromLeft: from.left,
    fromTop: from.top
  };
  const inside = SIZE_GRIP.sizePixels;
  const right = pointer.left + inside - readGripPressOffset(event.offsetX, inside);
  const bottom = pointer.top + inside - readGripPressOffset(event.offsetY, inside);
  return {
    ...grab,
    fromLeft: right - from.left,
    fromTop: bottom - from.top - calculateBarHeight(tokens)
  };
}
function readGripPressOffset(offset, corner) {
  const offsetRead = readCoordinate(offset);
  return offsetRead === null ? corner : offsetRead;
}
function composeDraggedSize(grab, pointer, state, placement, options) {
  const size = {
    width: grab.fromLeft + (pointer.left - grab.pointerLeft),
    height: grab.fromTop + (pointer.top - grab.pointerTop)
  };
  const tokens = options.getTypeTokens();
  const bounds = composeSizeBounds(options.window, tokens, state.position, placement.readViewport());
  return clampSize(size, bounds);
}
function readCoordinate(coordinate) {
  if (typeof coordinate !== "number") return null;
  if (!Number.isFinite(coordinate)) return null;
  return coordinate;
}
function writePointerCapture(grabbed, isHeld, pointerId, options) {
  if (pointerId === void 0) return;
  const captured = attempt(() => {
    if (isHeld) grabbed.setPointerCapture?.(pointerId);
    else grabbed.releasePointerCapture?.(pointerId);
  });
  if (!(captured instanceof Error)) return;
  addViewFailureGuarded(new GestureDropped(PANEL_LISTENER.capture, captured), options.onFailure);
}
function composeDraggedPosition(grab, pointer, viewport) {
  return clampPosition({
    left: grab.fromLeft + (pointer.left - grab.pointerLeft),
    top: grab.fromTop + (pointer.top - grab.pointerTop)
  }, viewport);
}
function readPointerFromEvent(event) {
  const left = readCoordinate(event.clientX);
  const top = readCoordinate(event.clientY);
  if (left === null) return null;
  if (top === null) return null;
  return {
    left,
    top
  };
}

// src/ui/panel-element.ts
var CARD_KEY_PLACE = {
  skill: "skill",
  pair: "pair",
  pairKinds: "pair-kinds"
};
var CARD_KEY_PREFIX = {
  row: "row",
  reached: "reached",
  to: "to",
  named: "named",
  kind: "kind",
  skill: "skill",
  source: "source",
  shelf: "shelf",
  pin: "pin",
  /**
     * Keyed by whoever is making the blow ready: `core/charged-skill.ts` holds one charge per
     * combatant, so one row is one key. A second row under the same key would be refused,
     * reported as the card undrawn, and would wear its neighbour's card, which is why
     * `tests/ui/panel-helper.test.ts` counts the keys rather than trusting that.
     * `develop ADR 0100`.
     */
  helperCharge: "helper:charge",
  helperHolding: "helper:holding",
  helperHeld: "helper:held"
};
var CARD_LINE = {
  stat: "stat",
  sub: "sub",
  heading: "heading",
  note: "note"
};
var CARD_NOTE_TONE = {
  plain: "plain",
  suspect: "suspect",
  caveat: "caveat",
  defect: "defect"
};
var STANDING_CARD = {
  options: "bar:options",
  shelf: "bar:shelf",
  save: "bar:save"
};
var HOST_NAME = "MargoMeter-Panel";
var VERSION_ATTRIBUTE = "data-margometer-version";
var CARD_ATTRIBUTE = "data-card";
var DOES_RANKING_ROW_OPEN = true;
var CRUMB_CARD_KEY = "crumb:back";
var FIGHT_CARD_KEY = "fight";
var HELPER_CARD_PREFIX = "helper:";
var HELPER_NOW_CARD_KEY = `${HELPER_CARD_PREFIX}now`;
var STANDING_CARD_WORDS = /* @__PURE__ */ new Map([
  [
    STANDING_CARD.options,
    PANEL_WORDS.openOptions
  ],
  [
    STANDING_CARD.shelf,
    PANEL_WORDS.openFights
  ],
  [
    STANDING_CARD.save,
    PANEL_WORDS.saveFight
  ]
]);
var FOLD_CARD_KEY = "bar:fold";
var HELPER_FOLD_CARD_KEY = `${HELPER_CARD_PREFIX}bar:fold`;
var CRUMB_HERE_CARD_KEY = "crumb:here";
var SAVE_MARK = "\u2B73";
var SHELF_MARK = "\u2630";
var OPTIONS_MARK = "\u2699";
var FOLD_MARK = "\u2014";
var UNFOLD_MARK = "+";
var BACK_MARK = "\u2039 ";
var GRIP_MARK = "\u283F ";
var PRIMARY_BUTTON = 0;
var STILL_TRAVEL_PIXELS_MAXIMUM = 3;
var PIN_MARK = "\u2605";
var UNPINNED_MARK = "\u2606";
var ROWS_WAITING = RANKING_ROWS;
var ROWS_SHELF = 11;
var WAITING_LIST_NAME = "waiting";
var CARD_CUT_PARTS_MAXIMUM = 6;
var FILL_PLACES = 1;
var AS_PERCENT = 100;
var UNDRAWN_MAXIMUM = 32;
var DEFECTS_MAXIMUM = Object.values(PANEL_DEFECT_KIND).length * (Object.values(PANEL_REGION).length + 1);
var CARDS_DRAWN_MAXIMUM = 512;
var CHARACTERS_PER_LINE_BY_STEP = {
  [TYPE_STEP.small]: {
    note: 32,
    name: 27
  },
  [TYPE_STEP.medium]: {
    note: 32,
    name: 27
  },
  [TYPE_STEP.large]: {
    note: 32,
    name: 27
  }
};
var NOTE_MARK_CHARACTERS = 2;
var CARD_LINES_MAXIMUM = 128;
var EDGE_RELEASED = "auto";
var CARD_GROUPS_MAXIMUM = 16;
var LISTS_KEPT_MAXIMUM = 32;
var CARD_NOTE_TONE_CLASS = {
  [CARD_NOTE_TONE.plain]: "",
  [CARD_NOTE_TONE.suspect]: ` ${CLASS.cardSuspect}`,
  [CARD_NOTE_TONE.caveat]: ` ${CLASS.cardCaveatNote}`,
  [CARD_NOTE_TONE.defect]: ` ${CLASS.cardDefect}`
};
var CARD_ENDING_SEPARATOR = " \xB7 ";
var OUTCOME_INK_CLASS = {
  [OUTCOME_RESULT.won]: ` ${CLASS.outcomeWon}`,
  [OUTCOME_RESULT.lost]: ` ${CLASS.outcomeLost}`,
  [OUTCOME_RESULT.drawn]: "",
  [OUTCOME_RESULT.fled]: ""
};
function initPanelView(document, options) {
  let typeStep = options.typeStep;
  const host = document.createElement("div");
  let root;
  let sheet;
  {
    host.setAttribute("id", HOST_NAME);
    host.setAttribute(VERSION_ATTRIBUTE, options.addOnVersion);
    root = host.attachShadow({
      mode: "open"
    });
    sheet = document.createElement("style");
    sheet.textContent = composeStyleSheet(typeStep);
    root.append(sheet);
  }
  const regions = {
    title: renderElement(document, "div", CLASS.title),
    header: renderSlot(document),
    nouns: renderSlot(document),
    directions: renderSlot(document),
    crumb: renderSlot(document),
    options: renderSlot(document),
    list: renderSlot(document),
    pinnedActor: renderSlot(document),
    pinnedTarget: renderSlot(document),
    outside: renderSlot(document),
    sides: renderSlot(document),
    suspicions: renderSlot(document),
    defects: renderSlot(document)
  };
  const meterGrip = renderSizeGrip(document, PANEL_WINDOW.meter);
  const frame = renderElement(document, "div", CLASS.frame);
  {
    const meter = renderElement(document, "div", CLASS.meter);
    for (const region of [
      regions.header,
      regions.nouns,
      regions.directions,
      regions.crumb
    ]) {
      meter.append(region);
    }
    meter.append(regions.options);
    for (const region of [
      regions.list,
      regions.pinnedActor,
      regions.pinnedTarget
    ]) {
      meter.append(region);
    }
    meter.append(regions.outside);
    meter.append(regions.sides);
    meter.append(regions.suspicions);
    meter.append(regions.defects);
    meter.append(meterGrip);
    frame.append(meter);
  }
  const report = initUndrawnReport(options);
  const renderInPlace = (previousRegion, region, render) => {
    const renderedRegion = renderRegion(document, region, report, render);
    if (renderedRegion === null) return previousRegion;
    const replaced = attempt(() => previousRegion.replaceWith(renderedRegion));
    if (!(replaced instanceof Error)) return renderedRegion;
    report.add(region, replaced);
    return previousRegion;
  };
  const meterRegister = createCardRegister();
  const helperRegister = createCardRegister();
  const standingRegister = createCardRegister();
  for (const [key, words] of STANDING_CARD_WORDS) {
    standingRegister.add(key, () => presentNamedCard(words));
  }
  let drawing;
  {
    const scrolls = createScrollMemo();
    let shownName = WAITING_LIST_NAME;
    let isRegionKept = false;
    drawing = {
      // ⚠️ **Before any region is redrawn.** A region taken away grows the list under it,
      // and a browser answers a taller box by clamping the position on it — the reader's own
      // place, gone before anything read it. Measured on Chrome 152.0.7977.64, 2026-09-04:
      // going back from a level takes the crumb away, and 54 pixels became 34 as it went.
      keep: () => {
        const top = readTopOfList(regions.list);
        if (top !== null) scrolls.setTop(shownName, top);
      },
      renderListRegion: (name, render) => {
        const renderedList = renderRegion(document, PANEL_REGION.list, report, render);
        if (renderedList === null) return;
        if (name === shownName) {
          const wasKept = attempt(() => renderListRows(regions.list, renderedList));
          if (wasKept instanceof Error) {
            report.add(PANEL_REGION.list, wasKept);
            isRegionKept = true;
            return;
          }
          isRegionKept = wasKept;
        } else {
          isRegionKept = false;
        }
        if (!isRegionKept) {
          const replaced = attempt(() => regions.list.replaceWith(renderedList));
          if (replaced instanceof Error) report.add(PANEL_REGION.list, replaced);
          else regions.list = renderedList;
        }
        shownName = name;
      },
      // And after every region is standing, for the same reason read the other way round. A
      // fold empties the region like any other and takes no name away, so what a reader
      // unfolds onto is the list they were reading, at the position they left it at.
      // Nothing to put back where the region itself stayed: the browser has the reader's
      // place already.
      settle: () => {
        if (isRegionKept) return;
        writeTopOfList(regions.list, scrolls.getTop(shownName));
      }
    };
  }
  let meterDrag = null;
  let helperDrag = null;
  const lookupCard = composeCardLookup(meterRegister, helperRegister, standingRegister);
  const getTypeStep = () => typeStep;
  let cardHandle;
  {
    const placement = options.meterPlacement;
    const readCardWindowPlace = (handle) => {
      const position = handle?.getPosition() ?? null;
      if (handle === null) return null;
      if (position === null) return null;
      return {
        position,
        widthPixels: handle.readWidthPixels()
      };
    };
    const readCardAcross = (key, columns) => {
      const viewport = placement?.readViewport() ?? null;
      const widthMaximum = calculateCardWidthForColumns(TYPE_TOKENS[getTypeStep()], columns);
      if (key.startsWith(HELPER_CARD_PREFIX)) {
        const helperPlace = readCardWindowPlace(helperDrag);
        return composeCardAcross(helperPlace, viewport, widthMaximum);
      }
      const meterPlace = readCardWindowPlace(meterDrag);
      return composeCardAcross(meterPlace, viewport, widthMaximum);
    };
    cardHandle = initCardHandle(
      document,
      lookupCard,
      // standing where it was; the card is a child of the root and the only thing the sheet
      // places, so that sentence would be a block under the panel. A card that will not
      // render is no card: the one standing hides (**E12**).
      (previousCard, render) => {
        const rendered = attempt(() => {
          const renderedCard = render();
          previousCard.replaceWith(renderedCard);
          return renderedCard;
        });
        if (!(rendered instanceof Error)) return rendered;
        report.add(PANEL_REGION.card, rendered);
        setCardHidden(previousCard, true);
        return previousCard;
      },
      readCardAcross,
      () => placement?.readViewport() ?? null,
      getTypeStep,
      (failure) => report.add(PANEL_REGION.card, failure)
    );
  }
  const helperWindow = renderElement(document, "div", CLASS.helper);
  let helperBar = renderHelperBar(document, helperRegister, false);
  let helperBody = renderSlot(document);
  const helperGrip = renderSizeGrip(document, PANEL_WINDOW.helper);
  helperWindow.append(helperBar);
  helperWindow.append(helperBody);
  helperWindow.append(helperGrip);
  for (const child of [
    regions.title,
    frame,
    cardHandle.element,
    helperWindow
  ]) {
    root.append(child);
  }
  {
    const onHover = cardHandle.onHover;
    let pressed = null;
    addGuardedListener(root, EVENT_TYPE.press, PANEL_LISTENER.press, (event) => {
      if ((event.button ?? PRIMARY_BUTTON) !== PRIMARY_BUTTON) return;
      pressed = null;
      const target = event.target;
      if (target === null) return;
      const intent = readPanelIntent(target);
      if (intent instanceof Error) {
        addViewFailureGuarded(new GestureDropped(PANEL_LISTENER.press, intent), options.onFailure);
        return;
      }
      if (intent === null) return;
      pressed = {
        intent,
        pointer: readPointerFromEvent(event)
      };
    }, options.onFailure);
    addGuardedListener(root, EVENT_TYPE.release, PANEL_LISTENER.click, (event) => {
      if ((event.button ?? PRIMARY_BUTTON) !== PRIMARY_BUTTON) return;
      const press = pressed;
      pressed = null;
      if (press === null) return;
      if (isPointerStill(press.pointer, readPointerFromEvent(event))) {
        options.onIntent(press.intent);
        return;
      }
      const target = event.target;
      if (target === null) return;
      const intent = readPanelIntent(target);
      if (intent instanceof Error) {
        addViewFailureGuarded(new GestureDropped(PANEL_LISTENER.click, intent), options.onFailure);
        return;
      }
      if (intent === null) return;
      if (isPanelIntentSame(press.intent, intent)) options.onIntent(intent);
    }, options.onFailure);
    addGuardedListener(root, EVENT_TYPE.back, PANEL_LISTENER.back, (event) => {
      event.preventDefault?.();
      if (helperWindow.contains(event.target)) return;
      options.onIntent({
        kind: PANEL_INTENT.close
      });
    }, options.onFailure);
    addGuardedListener(root, EVENT_TYPE.move, PANEL_LISTENER.hover, (event) => {
      onHover(readCardKey(event.target), event.clientY);
    }, options.onFailure);
    addGuardedListener(root, EVENT_TYPE.leave, PANEL_LISTENER.leave, (event) => {
      const towards = event.relatedTarget ?? null;
      onHover(readCardKey(towards), event.clientY);
      for (const element of [
        regions.title,
        frame,
        cardHandle.element,
        helperWindow
      ]) {
        if (element.contains(towards)) return;
      }
      pressed = null;
    }, options.onFailure);
  }
  const dragOptions = {
    view: options,
    getTypeStep
  };
  const meterDragOptions = {
    ...dragOptions,
    window: PANEL_WINDOW.meter,
    grip: meterGrip
  };
  meterDrag = initPanelDragIfPlaced(root, host, () => regions.title, options.meterPlacement, meterDragOptions);
  const helperDragOptions = {
    ...dragOptions,
    window: PANEL_WINDOW.helper,
    grip: helperGrip
  };
  const helperBarNow = () => helperBar;
  const helperPlacement = options.helperPlacement;
  helperDrag = initPanelDragIfPlaced(root, helperWindow, helperBarNow, helperPlacement, helperDragOptions);
  const panelDrawing = {
    document,
    addOnVersion: options.addOnVersion,
    sheet,
    getTypeStep,
    setTypeStep: (typeStepChosen) => typeStep = typeStepChosen,
    regions,
    frame,
    renderInPlace,
    report,
    drawing,
    card: cardHandle,
    meterDrag,
    helperDrag
  };
  const renderScreen = (shown) => report.collect(() => {
    executeRegionStep(report, PANEL_REGION.list, () => drawing.keep());
    meterRegister.reset();
    renderFold(panelDrawing, meterRegister, shown);
    if (shown.isMeterCollapsed) {
      renderPanelFolded(document, regions, renderInPlace);
    } else if (shown.options !== null) {
      renderPanelOptions(document, {
        regions,
        renderInPlace,
        drawing,
        register: meterRegister
      }, shown.options, {
        typeStep: shown.typeStep,
        windowSizes: shown.windowSizes
      }, panelDrawing.addOnVersion);
      regions.defects = renderInPlace(regions.defects, PANEL_REGION.defects, () => renderDefects(document, shown.defects));
    } else {
      regions.header = renderInPlace(regions.header, PANEL_REGION.header, () => renderHeaderRegion(document, meterRegister, shown));
      regions.nouns = renderInPlace(regions.nouns, PANEL_REGION.strips, () => renderNounStrips(document, shown));
      regions.directions = renderInPlace(regions.directions, PANEL_REGION.strips, () => renderDirectionStrips(document, shown));
      regions.crumb = renderInPlace(regions.crumb, PANEL_REGION.crumb, () => renderCrumbRegion(document, meterRegister, shown));
      regions.options = renderInPlace(regions.options, PANEL_REGION.strips, () => renderSlot(document));
      drawing.renderListRegion(shown.listName, () => renderListLevel(document, meterRegister, shown, options.translate));
      renderPinnedRows(document, regions, renderInPlace, meterRegister, shown);
      regions.outside = renderInPlace(regions.outside, PANEL_REGION.outside, () => renderOutsideRegion(document, meterRegister, shown));
      regions.sides = renderInPlace(regions.sides, PANEL_REGION.sides, () => renderSidesRegion(document, shown));
      regions.suspicions = renderInPlace(regions.suspicions, PANEL_REGION.suspicions, () => renderSuspicions(document, shown.isOnShelf ? shown.shelfAnswers : shown.ranking.suspicions));
      regions.defects = renderInPlace(regions.defects, PANEL_REGION.defects, () => renderDefects(document, shown.defects));
    }
    const refused = meterRegister.lookupRefused();
    if (refused !== null) report.add(PANEL_REGION.card, refused);
    renderPanelSettled(panelDrawing);
  });
  const renderWaiting = (waiting) => report.collect(() => {
    executeRegionStep(report, PANEL_REGION.list, () => drawing.keep());
    meterRegister.reset();
    renderFold(panelDrawing, meterRegister, waiting);
    renderPanelFolded(document, regions, renderInPlace);
    if (!waiting.isMeterCollapsed) {
      if (waiting.options !== null) {
        renderPanelOptions(document, {
          regions,
          renderInPlace,
          drawing,
          register: meterRegister
        }, waiting.options, {
          typeStep: waiting.typeStep,
          windowSizes: waiting.windowSizes
        }, panelDrawing.addOnVersion);
      } else {
        drawing.renderListRegion(WAITING_LIST_NAME, () => renderWaitingList(document, waiting));
      }
      regions.defects = renderInPlace(regions.defects, PANEL_REGION.defects, () => renderDefects(document, waiting.defects));
    }
    renderPanelSettled(panelDrawing);
  });
  const renderHelper = (helper, isCollapsed) => report.collect(() => {
    executeRegionStep(report, PANEL_REGION.helper, () => {
      helperWindow.className = isCollapsed ? `${CLASS.helper} ${CLASS.helperFolded}` : CLASS.helper;
    });
    helperRegister.reset();
    helperBar = renderInPlace(helperBar, PANEL_REGION.helper, () => renderHelperBar(document, helperRegister, isCollapsed));
    helperBody = renderInPlace(helperBody, PANEL_REGION.helper, () => renderHelperBody(document, helperRegister, helper, isCollapsed));
    const refused = helperRegister.lookupRefused();
    if (refused !== null) report.add(PANEL_REGION.card, refused);
    helperDrag?.holdBarRedrawn();
  });
  return {
    element: host,
    render: renderScreen,
    renderWaiting,
    renderHelper
  };
}
function readCardKey(target) {
  if (target === null) return null;
  if (typeof target.getAttribute !== "function") return null;
  return target.getAttribute(CARD_ATTRIBUTE);
}
function presentNamedCard(name) {
  return {
    name,
    subtitle: null,
    ending: null,
    groups: []
  };
}
function renderWaitingList(document, waiting) {
  const list = renderListContainer(document, ROWS_WAITING);
  list.className = `${CLASS.list} ${CLASS.listWaiting}`;
  const kept = waiting.keptUnread;
  if (kept !== null) {
    list.append(renderEmptyNote(document, PANEL_WORDS.keptUnread));
    const when = formatKeptUnread(kept.at, kept.place);
    if (when.length > 0) list.append(renderEmptyNote(document, when));
    return list;
  }
  const said = waiting.isFightUnread ? PANEL_WORDS.fightUnread : PANEL_WORDS.noFightYet;
  list.append(renderEmptyNote(document, said));
  return list;
}
function renderHelperBody(document, register, helper, isCollapsed) {
  if (isCollapsed) return renderSlot(document);
  const body = renderElement(document, "div", CLASS.helperBody);
  if (typeof helper === "string") {
    body.append(renderEmptyNote(document, getWordsForHelperAbsence(helper)));
    return body;
  }
  {
    const said = helper.turnOrdinal === null ? "" : formatTurnOrdinal(helper.turnOrdinal);
    const section = renderElement(document, "div", CLASS.section);
    const words = renderText(document, "span", CLASS.sectionWords, HELPER_WORDS.now);
    const figure = renderText(document, "span", CLASS.figure, said);
    section.append(words);
    section.append(figure);
    body.append(section);
    const holder = helper.turnHolder;
    if (holder === null) {
      const empty = renderText(document, "div", CLASS.empty, getWordsForTurnState(helper.turnState));
      body.append(empty);
    } else {
      body.append(renderHelperPerson(document, register, HELPER_NOW_CARD_KEY, {
        name: holder.name,
        skillName: null,
        colour: holder.colour,
        sideRelation: holder.sideRelation,
        turns: null,
        turnsCaveat: null,
        isNested: false
      }));
    }
  }
  if (helper.chargedSkills.length > 0) {
    const firstCharged = helper.chargedSkills[0];
    const section = renderElement(document, "div", CLASS.section);
    const words = renderText(document, "span", CLASS.sectionWords, HELPER_WORDS.chargedSkill);
    const state = renderText(document, "span", CLASS.figure, firstCharged === void 0 ? "" : getWordsForChargedSkill(firstCharged.state));
    section.append(words);
    section.append(state);
    body.append(section);
    for (const charged of helper.chargedSkills) {
      const row = renderElement(document, "div", `${CLASS.row} ${CLASS.rowLeaf}`);
      const cap = renderElement(document, "div", CLASS.barCap);
      cap.setAttribute(STYLE_ATTRIBUTE, `background:${formatColour(charged.colour)}`);
      const name = renderText(document, "span", CLASS.rowName, charged.skillName);
      const pips = renderElement(document, "div", CLASS.helperPips);
      const dots = [
        pips
      ];
      {
        pips.setAttribute(STYLE_ATTRIBUTE, `color:${formatColour(charged.colour)}`);
        const stated = Math.min(Math.max(charged.turnsStated, 0), CHARGED_PIPS_MAXIMUM);
        for (let turn = 0; turn < stated; turn += 1) {
          const lit = turn < charged.turnsElapsed ? ` ${CLASS.helperPipLit}` : "";
          const pip = renderElement(document, "div", `${CLASS.helperPip}${lit}`);
          pips.append(pip);
          dots.push(pip);
        }
      }
      row.append(cap);
      row.append(name);
      row.append(pips);
      const parts = [
        cap,
        name,
        ...dots
      ];
      const turnsLeft = formatChargedSkillTurnsLeft(charged);
      if (turnsLeft !== null) {
        const counter = renderText(document, "span", `${CLASS.rowValue} ${CLASS.figure}`, turnsLeft);
        row.append(counter);
        parts.push(counter);
      }
      for (const rule of renderSideRules(document, charged.sideRelation)) {
        row.append(rule);
        parts.push(rule);
      }
      const key = composeCardKey(CARD_KEY_PREFIX.helperCharge, formatWholeUngrouped(charged.combatantId));
      register.add(key, () => presentChargedSkillCard(charged));
      setRowMarks([
        row,
        ...parts
      ], CARD_ATTRIBUTE, key);
      body.append(row);
    }
  }
  if (helper.provocations.length === 0) {
    if (helper.chargedSkills.length === 0) {
      const empty = renderText(document, "div", CLASS.empty, HELPER_WORDS.nothingHappens);
      body.append(empty);
    }
    return body;
  }
  {
    let counted = 0;
    for (const provocation of helper.provocations) counted += provocation.provoked.length;
    body.append(renderSection(document, HELPER_WORDS.provocation, counted));
    for (const provocation of helper.provocations) {
      const cast = `${formatWholeUngrouped(provocation.casterId)}/${formatWholeUngrouped(provocation.skillId)}`;
      body.append(renderHelperPerson(document, register, composeCardKey(CARD_KEY_PREFIX.helperHolding, cast), {
        name: provocation.casterName,
        skillName: provocation.skillName,
        colour: provocation.casterColour,
        sideRelation: provocation.casterSideRelation,
        // No length here: one cast holding two characters is two counts on
        // two clocks, so the figure sits on the row of whoever is carrying
        // it (`develop ADR 0103`).
        turns: null,
        turnsCaveat: null,
        isNested: false
      }));
      for (const holding of provocation.provoked) {
        const key = composeCardKey(CARD_KEY_PREFIX.helperHeld, `${cast}/${formatWholeUngrouped(holding.provokedId)}`);
        body.append(renderHelperPerson(document, register, key, {
          name: holding.name,
          // Named on the card and never on the row: the row above draws it
          // already, and what this row does state is a length of this
          // character's own (`develop ADR 0103`).
          skillName: provocation.skillName,
          colour: holding.colour,
          sideRelation: holding.sideRelation,
          turns: formatTurnsLeft(holding.turnsElapsed, holding.turnsStated),
          turnsCaveat: null,
          isNested: true
        }));
      }
    }
  }
  return body;
}
function renderHeaderRegion(document, register, shown) {
  if (shown.isOnShelf) return renderSlot(document);
  const header = renderElement(document, "div", CLASS.header);
  const line = renderElement(document, "div", CLASS.headerLine);
  const who = renderText(document, "span", "", formatSideCounts(shown.ranking.sizes, shown.ranking.unplaced));
  line.append(who);
  const marked = [
    line,
    who
  ];
  const outcome = shown.ranking.outcome;
  if (outcome !== null) {
    const said = renderText(document, "span", `${CLASS.headerOutcome}${OUTCOME_INK_CLASS[outcome]}`, getWordsForOutcome(outcome));
    line.append(said);
    marked.push(said);
  }
  if (shown.fightPlace !== null) {
    const place = shown.fightPlace;
    const where = renderElement(document, "span", CLASS.headerPlace);
    if (place.name !== null) {
      const name = renderText(document, "span", CLASS.headerPlaceName, place.name);
      where.append(name);
    }
    if (place.tile !== null) {
      const tile = renderText(document, "span", CLASS.headerPlaceTile, place.name === null ? place.tile : ` ${place.tile}`);
      where.append(tile);
    }
    line.append(where);
    marked.push(where, ...Array.from(where.children));
  }
  header.append(line);
  register.add(FIGHT_CARD_KEY, () => presentFightCard(shown.card));
  setRowMarks(marked, CARD_ATTRIBUTE, FIGHT_CARD_KEY);
  return header;
}
function renderNounStrips(document, shown) {
  if (shown.isOnShelf) return renderSlot(document);
  const strips = renderElement(document, "div", CLASS.strips);
  for (const strip of presentNounStrips(shown.metric)) {
    strips.append(renderStrip(document, PANEL_MARK.screen, strip));
  }
  return strips;
}
function renderDirectionStrips(document, shown) {
  if (shown.isOnShelf) return renderSlot(document);
  const strips = renderElement(document, "div", CLASS.strips);
  for (const strip of presentDirectionStrips(shown.metric)) {
    strips.append(renderStrip(document, PANEL_MARK.screen, strip));
  }
  if (shown.readerSide === null) return strips;
  strips.append(renderElement(document, "span", CLASS.stripsGap));
  for (const strip of presentSideStrips(shown.side)) {
    strips.append(renderStrip(document, PANEL_MARK.side, strip));
  }
  return strips;
}
function renderCrumbRegion(document, register, shown) {
  if (shown.isOnShelf) {
    return renderCrumb(document, register, {
      said: PANEL_WORDS.fights,
      from: PANEL_WORDS.backFromFights
    });
  }
  if (shown.unnamedCut !== null) {
    const unnamed = getWordsForUnnamedRow(getEndForPinned(shown.unnamedCut.case));
    if (shown.opened !== null) {
      return renderCrumb(document, register, {
        said: unnamed,
        from: shown.opened.name ?? PANEL_WORDS.unknown
      });
    }
    return renderCrumb(document, register, {
      said: getCrumbWordsForUnnamedCut(shown.unnamedCut, shown.metric),
      from: unnamed
    });
  }
  if (shown.unnamed !== null) {
    return renderCrumb(document, register, {
      said: getWordsForUnnamedRow(shown.unnamed.end),
      from: null
    });
  }
  if (shown.opened === null) return renderSlot(document);
  const opened = shown.opened.name ?? PANEL_WORDS.unknown;
  if (shown.part !== null) {
    return renderCrumb(document, register, {
      said: getWordsForNamedPart(shown.part.part, shown.metric),
      from: opened
    });
  }
  if (shown.pair === null) {
    return renderCrumb(document, register, {
      said: opened,
      from: null
    });
  }
  return renderCrumb(document, register, {
    said: shown.pair.otherName ?? PANEL_WORDS.unknown,
    from: opened
  });
}
function renderListLevel(document, register, shown, translate) {
  if (shown.isOnShelf) {
    const list2 = renderListContainer(document, ROWS_SHELF);
    if (shown.shelf.length === 0) {
      list2.append(renderEmptyNote(document, PANEL_WORDS.shelfEmpty));
      return list2;
    }
    for (const fight of shown.shelf) {
      const chosen = fight.isChosen ? ` ${CLASS.rowChosen}` : "";
      const opens = fight.card.isUnread ? ` ${CLASS.rowUnread}` : ` ${CLASS.rowDrillable}`;
      const row = renderElement(document, "div", `${CLASS.row}${opens}${chosen}`);
      if (fight.isPinnable) {
        const set = fight.isPinned ? ` ${CLASS.rowPinSet}` : "";
        const pin = renderText(document, "span", `${CLASS.rowPin}${set}`, fight.isPinned ? PIN_MARK : UNPINNED_MARK);
        const pinKey = composeCardKey(CARD_KEY_PREFIX.pin, `${fight.openedAt}`);
        const pinWords = getWordsForPin(fight.isPinned);
        register.add(pinKey, () => presentNamedCard(pinWords));
        pin.setAttribute(CARD_ATTRIBUTE, pinKey);
        pin.setAttribute(PANEL_MARK.pin, `${fight.openedAt}`);
        row.append(pin);
      }
      const time = renderText(document, "span", CLASS.rowTime, formatShelfTime(fight.at, fight.isLive));
      const size = renderText(document, "span", CLASS.rowSize, formatShelfSize(fight.sizes));
      const parts = [
        row,
        time,
        size
      ];
      for (const cell of [
        time,
        size
      ]) row.append(cell);
      if (fight.card.suspicions.length > 0) {
        const mark = renderText(document, "span", CLASS.rowSuspect, SUSPECT_MARK);
        row.append(mark);
        parts.push(mark);
      }
      const where = renderText(document, "span", CLASS.rowName, fight.place ?? "");
      let outcomeClass;
      let outcomeText;
      if (fight.card.isUnread) {
        outcomeClass = CLASS.rowOutcome;
        outcomeText = DEFECT_MARK.trimEnd();
      } else if (fight.outcome === null) {
        outcomeClass = CLASS.rowOutcome;
        outcomeText = "";
      } else {
        outcomeClass = `${CLASS.rowOutcome}${OUTCOME_INK_CLASS[fight.outcome]}`;
        outcomeText = getLetterForShelfOutcome(fight.outcome);
      }
      const outcome = renderText(document, "span", outcomeClass, outcomeText);
      for (const cell of [
        where,
        outcome
      ]) row.append(cell);
      parts.push(where, outcome);
      const rowKey = fight.isLive ? LIVE_FIGHT_MARK : `${fight.openedAt}`;
      const shelfKey = composeCardKey(CARD_KEY_PREFIX.shelf, rowKey);
      register.add(shelfKey, () => presentFightCard(fight.card));
      setRowMarks(parts, CARD_ATTRIBUTE, shelfKey);
      if (!fight.card.isUnread) setRowMarks(parts, PANEL_MARK.fight, rowKey);
      list2.append(row);
    }
    return list2;
  }
  if (shown.part !== null) {
    const partLevel = shown.part;
    const rows = partLevel.byOtherEnd.rows.length + (partLevel.byOtherEnd.halfNamed === null ? 0 : 1);
    const list2 = renderListContainer(document, Math.max(rows + 1, shown.ranking.rowsVisibleCount));
    const figure = getWordsForMetric(shown.metric);
    const heading = getWordsForOpponentCut(shown.metric);
    list2.append(renderSection(document, heading, partLevel.total));
    const share = PANEL_WORDS.shareOfFigure;
    const cardContext = {
      metric: shown.metric,
      translate,
      isRowNarrower: true,
      unnamedNote: null,
      readerSide: shown.readerSide
    };
    const person2 = {
      register,
      keyPrefix: CARD_KEY_PREFIX.reached,
      figure,
      share,
      card: cardContext,
      place: composeCutPlace(shown)
    };
    for (const [rowIndex, row] of partLevel.byOtherEnd.rows.entries()) {
      list2.append(renderPersonRow(document, row, rowIndex + 1, person2, false));
    }
    if (partLevel.byOtherEnd.halfNamed === null) return list2;
    const end = getUnnamedEndForMetric(shown.metric);
    const card = {
      register,
      key: "reached/nobody",
      figure,
      share,
      notes: formatOpenedUnnamedNotes(shown.metric)
    };
    const rowContent = presentUnnamedRow(partLevel.byOtherEnd.halfNamed, getWordsForUnnamedRow(end));
    list2.append(renderRow(document, rowContent, null, card));
    return list2;
  }
  if (shown.pair !== null) {
    const pair = shown.pair;
    const list2 = renderListContainer(document, countRowsForPairLevel(pair, shown.ranking.rowsVisibleCount));
    const figure = getWordsForMetric(shown.metric);
    const share = PANEL_WORDS.shareOfFigure;
    if (pair.parts.length > 0) {
      list2.append(renderSection(document, PANEL_WORDS.skills, pair.total));
      for (const [rowIndex, row] of pair.parts.entries()) {
        const card = {
          register,
          figure,
          share,
          key: getKeyForNamedPart(CARD_KEY_PLACE.pair, row.part),
          caveat: getCaveatForNamedPart(row.part, shown.metric)
        };
        const rowContent = {
          name: getWordsForNamedPart(row.part, shown.metric),
          figure: row.figure,
          fill: row.fill,
          shareText: row.shareText,
          colour: lookupColourForProfession(null),
          profession: null,
          rank: rowIndex + 1
        };
        list2.append(renderRow(document, rowContent, null, card));
      }
    }
    const cut = pair.byElement;
    if (cut.rows.length > 0) {
      list2.append(renderSection(document, PANEL_WORDS.damageKind, pair.total));
      for (const [rowIndex, row] of cut.rows.entries()) {
        const openedPart = {
          kind: OPENED_PART.element,
          element: row.element
        };
        const card = {
          register,
          figure,
          share,
          key: getKeyForNamedPart(CARD_KEY_PLACE.pairKinds, openedPart),
          caveat: getCaveatForNamedPart(openedPart, shown.metric)
        };
        list2.append(renderRow(document, presentElementRow(row, PANEL_NOUN.damage, rowIndex + 1), null, card));
      }
    }
    return list2;
  }
  if (shown.unnamedCut !== null) {
    const unnamedCut = shown.unnamedCut;
    const figure = getWordsForMetric(shown.metric);
    const unnamedNote = getNoteForUnnamedEnd(getEndForPinned(unnamedCut.case), getNounForMetric(shown.metric));
    if (unnamedCut.opened === HALF_NAMED_OPENED.element) {
      const rows = unnamedCut.rows.length + (unnamedCut.neitherEnd === null ? 0 : 1);
      const list3 = renderListContainer(document, Math.max(rows + 1, shown.ranking.rowsVisibleCount));
      const heading = getWordsForHalfNamedCut(unnamedCut.end);
      list3.append(renderSection(document, heading, unnamedCut.total));
      renderHalfNamedRows(document, list3, shown, {
        rows: unnamedCut.rows,
        neither: unnamedCut.neitherEnd,
        doesOpen: false,
        register,
        translate: null,
        unnamedNote
      });
      return list3;
    }
    const kinds = countElementCutRows(unnamedCut.kinds);
    const list2 = renderListContainer(document, Math.max(kinds + 1, shown.ranking.rowsVisibleCount));
    renderElementSection(document, list2, unnamedCut.kinds, {
      metric: shown.metric,
      register,
      figure,
      total: unnamedCut.total,
      unnamedNote
    });
    return list2;
  }
  if (shown.unnamed !== null) {
    const unnamed = shown.unnamed;
    const named = unnamed.rows.length + (unnamed.neitherEnd === null ? 0 : 1);
    const kinds = countElementCutRows(unnamed.kinds);
    const needed = named + 1 + (kinds === 0 ? 0 : kinds + 1);
    const list2 = renderListContainer(document, Math.max(needed, shown.ranking.rowsVisibleCount));
    const heading = getWordsForHalfNamedCut(unnamed.end);
    list2.append(renderSection(document, heading, unnamed.total));
    const unnamedNote = getNoteForUnnamedEnd(unnamed.end, getNounForMetric(shown.metric));
    renderHalfNamedRows(document, list2, shown, {
      rows: unnamed.rows,
      neither: unnamed.neitherEnd,
      doesOpen: true,
      register,
      translate,
      unnamedNote
    });
    renderElementSection(document, list2, unnamed.kinds, {
      metric: shown.metric,
      register,
      figure: getWordsForMetric(shown.metric),
      total: unnamed.total,
      unnamedNote
    });
    return list2;
  }
  if (shown.opened !== null) {
    const opened = shown.opened;
    const list2 = renderListContainer(document, countRowsForOpenedLevel(opened, shown.ranking.rowsVisibleCount));
    const figure = getWordsForMetric(shown.metric);
    const share = PANEL_WORDS.shareOfFigure;
    {
      const cut = opened.byOtherEnd;
      const cardContext = {
        metric: shown.metric,
        translate,
        isRowNarrower: true,
        unnamedNote: null,
        readerSide: shown.readerSide
      };
      if (cut.rows.length + (cut.halfNamed === null ? 0 : 1) > 0) {
        const heading = getWordsForOpponentCut(shown.metric);
        list2.append(renderSection(document, heading, opened.total));
      }
      const person2 = {
        register,
        keyPrefix: CARD_KEY_PREFIX.to,
        figure,
        share,
        card: cardContext,
        place: composeCutPlace(shown)
      };
      for (const [rowIndex, row] of cut.rows.entries()) {
        const drawn = renderPersonRow(document, row, rowIndex + 1, person2, row.doesOpenPair);
        list2.append(drawn);
      }
      if (cut.halfNamed !== null) {
        const end = getUnnamedEndForMetric(shown.metric);
        const kinds = cut.halfNamed.kinds;
        const card = {
          register,
          key: "to/nobody",
          figure,
          share,
          notes: formatOpenedUnnamedNotes(shown.metric),
          cut: kinds === null ? void 0 : presentKindCutParts(kinds, shown.metric)
        };
        const rowContent = presentUnnamedRow(cut.halfNamed, getWordsForUnnamedRow(end));
        const mark = cut.halfNamed.doesOpenPair ? {
          attribute: PANEL_MARK.unnamed,
          stated: end
        } : null;
        list2.append(renderRow(document, rowContent, mark, card));
      }
    }
    {
      const cut = opened.bySkill;
      const stated = {
        metric: shown.metric,
        register,
        figure
      };
      if (cut.rows.length + (cut.closing === null ? 0 : 1) > 0) {
        list2.append(renderSection(document, PANEL_WORDS.skills, opened.total));
        let drawn = 0;
        for (const row of cut.rows) {
          drawn = renderClosingRowAtPlace(document, list2, cut.closing, stated, drawn, false);
          drawn += 1;
          const card = {
            register,
            key: getKeyForNamedPart(CARD_KEY_PLACE.skill, row.part),
            figure,
            share
          };
          const rowContent = presentSkillRow(row, shown.metric, drawn);
          const mark = getMarkForNamedPart(row.part, row.doesOpenPart);
          list2.append(renderRow(document, rowContent, mark, card));
        }
        renderClosingRowAtPlace(document, list2, cut.closing, stated, drawn, true);
        renderRestRow(document, list2, cut.rest, {
          register,
          figure,
          key: "skill/rest",
          unnamedNote: null
        });
      }
    }
    renderElementSection(document, list2, opened.byElement, {
      metric: shown.metric,
      register,
      figure,
      total: opened.total,
      unnamedNote: null
    });
    if (opened.total === 0) {
      list2.append(renderEmptyNote(document, getWordsForNothing(shown.metric)));
    }
    return list2;
  }
  const ranking = shown.ranking;
  const metric = shown.metric;
  const personContext = {
    readerSide: shown.readerSide,
    turnHolderId: shown.turnHolderId
  };
  const list = renderListContainer(document, ranking.rowsVisibleCount);
  if (ranking.rows.length === 0) {
    list.append(renderEmptyNote(document, PANEL_WORDS.nothingYet));
    return list;
  }
  const person = {
    register,
    keyPrefix: CARD_KEY_PREFIX.row,
    figure: getWordsForMetric(metric),
    share: PANEL_WORDS.share,
    card: composeRankingCardPlace(metric, translate, shown.readerSide),
    place: personContext
  };
  for (const [rowIndex, row] of ranking.rows.entries()) {
    list.append(renderPersonRow(document, row, rowIndex + 1, person, DOES_RANKING_ROW_OPEN));
  }
  return list;
}
function composeRankingCardPlace(metric, translate, readerSide) {
  return {
    metric,
    translate,
    isRowNarrower: false,
    unnamedNote: null,
    readerSide
  };
}
function renderPinnedRows(document, regions, renderInPlace, register, shown) {
  const stated = {
    metric: shown.metric,
    isSideChosen: shown.side !== SIDE_CHOICE.everyone,
    figure: getWordsForMetric(shown.metric)
  };
  const ends = [
    [
      UNNAMED_END.actor,
      "pinnedActor"
    ],
    [
      UNNAMED_END.target,
      "pinnedTarget"
    ]
  ];
  for (const [end, regionName] of ends) {
    regions[regionName] = renderInPlace(regions[regionName], PANEL_REGION.pinned, () => {
      let pinned;
      if (isLevelOpen(shown)) {
        pinned = [];
      } else {
        pinned = shown.isOnShelf ? [] : shown.ranking.pinned;
      }
      const row = pinned.find((pinnedRow) => pinnedRow.end === end) ?? null;
      if (row === null) return renderSlot(document);
      const block = renderElement(document, "div", CLASS.pinned);
      const card = {
        register,
        key: `pinned:${row.end}`,
        figure: stated.figure,
        share: PANEL_WORDS.share,
        notes: formatPinnedNotes(row, stated.metric, stated.isSideChosen),
        cut: presentKindCutParts(row.kinds, stated.metric)
      };
      const rowContent = presentUnnamedRow(row, getWordsForUnnamedRow(row.end));
      const mark = {
        attribute: PANEL_MARK.unnamed,
        stated: row.end
      };
      block.append(renderRow(document, rowContent, mark, card));
      return block;
    });
  }
}
function renderOutsideRegion(document, register, shown) {
  if (shown.isOnShelf) return renderSlot(document);
  const outside = shown.ranking.outsideRanking;
  if (outside === null) return renderSlot(document);
  const block = renderElement(document, "div", CLASS.outside);
  block.append(renderSection(document, PANEL_WORDS.outsideRanking, outside.figure));
  const rowContent = {
    name: PANEL_WORDS.outsideRow,
    figure: outside.figure,
    fill: outside.fill,
    shareText: outside.shareText,
    colour: lookupColourForProfession(null),
    profession: null,
    // No place, so the hatch: its figure is what reached no row rather than
    // what anybody did — `DESIGN.md`, and `develop ADR 0079`'s test for
    // which kind of row takes one.
    rank: null
  };
  const card = {
    register,
    key: "outside",
    figure: getWordsForMetric(shown.metric),
    share: PANEL_WORDS.share,
    notes: [
      PANEL_WORDS.outsideNote
    ]
  };
  block.append(renderRow(document, rowContent, null, card));
  return block;
}
function renderSidesRegion(document, shown) {
  const sides = shown.ranking.sides;
  if (sides === null) return renderSlot(document);
  if (shown.isOnShelf) return renderSlot(document);
  const block = renderElement(document, "div", CLASS.sides);
  const line = renderElement(document, "div", CLASS.sidesLine);
  const reader = renderText(document, "span", `${CLASS.sidesOurs} ${CLASS.figure}`, formatFigure(sides.reader));
  const label = renderText(document, "span", CLASS.sidesLabel, formatSidesLabel(shown));
  const opposing = renderText(document, "span", `${CLASS.sidesTheirs} ${CLASS.figure}`, formatFigure(sides.opposing));
  line.append(reader);
  line.append(label);
  line.append(opposing);
  block.append(line);
  {
    const whole = sides.reader + sides.opposing + sides.nobody;
    if (whole > 0) {
      const track = renderElement(document, "div", CLASS.sidesTrack);
      const parts = [
        [
          sides.reader / whole,
          CLASS.sidesOurs
        ],
        [
          sides.opposing / whole,
          CLASS.sidesTheirs
        ],
        [
          sides.nobody / whole,
          CLASS.sidesNobody
        ]
      ];
      for (const [share, className] of parts) {
        if (share > 0) {
          const sideSegment = renderElement(document, "span", className);
          const width = formatDecimal(Math.min(share, 1) * AS_PERCENT, FILL_PLACES);
          sideSegment.setAttribute(STYLE_ATTRIBUTE, `width:${width}%`);
          track.append(sideSegment);
        }
      }
      block.append(track);
    }
  }
  if (sides.nobody > 0) {
    const spare = renderElement(document, "div", `${CLASS.sidesLine} ${CLASS.sidesSpare} ${CLASS.sidesNobody}`);
    const words = renderText(document, "span", CLASS.sidesLabel, PANEL_WORDS.withoutSide);
    const stated = renderText(document, "span", CLASS.figure, formatFigure(sides.nobody));
    spare.append(words);
    spare.append(stated);
    block.append(spare);
  }
  return block;
}
function renderElement(document, tag, className) {
  const createdElement = document.createElement(tag);
  createdElement.className = className;
  return createdElement;
}
function renderText(document, tag, className, text) {
  const textElement = renderElement(document, tag, className);
  textElement.textContent = text;
  return textElement;
}
function renderSlot(document) {
  const slot = renderElement(document, "div", CLASS.slot);
  return slot;
}
function renderSizeGrip(document, window2) {
  const grip = renderElement(document, "div", CLASS.sizeGrip);
  grip.setAttribute(SIZE_GRIP_ATTRIBUTE, window2);
  return grip;
}
function renderRegion(document, region, report, render) {
  const rendered = attempt(render);
  if (!(rendered instanceof Error)) return rendered;
  report.add(region, rendered);
  const undrawn = attempt(() => {
    const mark = renderText(document, "div", CLASS.undrawn, formatUndrawn(region));
    return mark;
  });
  return undrawn instanceof Error ? null : undrawn;
}
function composeCardLookup(meterRegister, helperRegister, standingRegister) {
  return (key) => meterRegister.lookup(key) ?? helperRegister.lookup(key) ?? standingRegister.lookup(key);
}
function renderHelperBar(document, register, isCollapsed) {
  const bar = renderText(document, "div", CLASS.helperBar, `${GRIP_MARK}${HELPER_WORDS.title}`);
  setGripMark(bar, PANEL_WINDOW.helper);
  const words = isCollapsed ? HELPER_WORDS.expand : HELPER_WORDS.collapse;
  register.add(HELPER_FOLD_CARD_KEY, () => presentNamedCard(words));
  bar.append(renderBarControl(document, {
    className: CLASS.control,
    icon: isCollapsed ? BAR_ICON.unfold : BAR_ICON.fold,
    mark: isCollapsed ? UNFOLD_MARK : FOLD_MARK,
    attribute: PANEL_MARK.helperFold,
    card: HELPER_FOLD_CARD_KEY
  }));
  return bar;
}
function renderBarControl(document, stated) {
  const className = `${stated.className} ${composeBarIconClass(stated.icon)}`;
  const control = renderText(document, "span", className, stated.mark);
  control.setAttribute(stated.attribute, "");
  control.setAttribute(CARD_ATTRIBUTE, stated.card);
  return control;
}
function initPanelDragIfPlaced(root, host, getBar, placement, dragOptions) {
  if (placement === null) return null;
  const { window: window2, view } = dragOptions;
  return initPanelDrag(root, host, getBar, placement, {
    window: window2,
    getTypeTokens: () => TYPE_TOKENS[dragOptions.getTypeStep()],
    onIntent: view.onIntent,
    onFailure: view.onFailure,
    grip: dragOptions.grip
  });
}
function executeRegionStep(report, region, step) {
  const ran = attempt(step);
  if (ran instanceof Error) report.add(region, ran);
}
function renderFold(panelDrawing, register, drawn) {
  const { isMeterCollapsed, hasFightToSave, typeStep } = drawn;
  if (typeStep !== panelDrawing.getTypeStep()) {
    const before = attempt(() => readWindowWidths(panelDrawing));
    if (before instanceof Error) panelDrawing.report.add(PANEL_REGION.helper, before);
    executeRegionStep(panelDrawing.report, PANEL_REGION.header, () => {
      panelDrawing.sheet.textContent = composeStyleSheet(typeStep);
      panelDrawing.setTypeStep(typeStep);
    });
    executeRegionStep(panelDrawing.report, PANEL_REGION.helper, () => {
      if (before instanceof Error) return;
      const after = readWindowWidths(panelDrawing);
      const meterPosition = panelDrawing.meterDrag?.getPosition() ?? null;
      const helperPosition = panelDrawing.helperDrag?.getPosition() ?? null;
      if (meterPosition === null) return;
      if (helperPosition === null) return;
      const helperPositionAfter = composeHelperPositionAfterTypeStep(meterPosition, helperPosition, before, after);
      if (helperPositionAfter !== null) {
        panelDrawing.helperDrag?.placeWindow(helperPositionAfter);
      }
    });
  }
  executeRegionStep(panelDrawing.report, PANEL_REGION.header, () => {
    panelDrawing.meterDrag?.sizeWindow(drawn.windowSizes.meter);
  });
  executeRegionStep(panelDrawing.report, PANEL_REGION.helper, () => {
    panelDrawing.helperDrag?.sizeWindow(drawn.windowSizes.helper);
  });
  const foldWords = isMeterCollapsed ? PANEL_WORDS.expand : PANEL_WORDS.collapse;
  register.add(FOLD_CARD_KEY, () => presentNamedCard(foldWords));
  panelDrawing.regions.title = panelDrawing.renderInPlace(panelDrawing.regions.title, PANEL_REGION.header, () => {
    const document = panelDrawing.document;
    const bar = renderElement(document, "div", CLASS.title);
    bar.textContent = `${GRIP_MARK}${PANEL_WORDS.title}`;
    setGripMark(bar, PANEL_WINDOW.meter);
    bar.append(renderBarControl(document, {
      className: `${CLASS.control} ${CLASS.controlLead}`,
      icon: BAR_ICON.options,
      mark: OPTIONS_MARK,
      attribute: PANEL_MARK.options,
      card: STANDING_CARD.options
    }));
    bar.append(renderBarControl(document, {
      className: CLASS.control,
      icon: BAR_ICON.shelf,
      mark: SHELF_MARK,
      attribute: PANEL_MARK.shelf,
      card: STANDING_CARD.shelf
    }));
    if (hasFightToSave) {
      bar.append(renderBarControl(document, {
        className: CLASS.control,
        icon: BAR_ICON.save,
        mark: SAVE_MARK,
        attribute: PANEL_MARK.save,
        card: STANDING_CARD.save
      }));
    }
    bar.append(renderBarControl(document, {
      className: CLASS.control,
      icon: isMeterCollapsed ? BAR_ICON.unfold : BAR_ICON.fold,
      mark: isMeterCollapsed ? UNFOLD_MARK : FOLD_MARK,
      attribute: PANEL_MARK.fold,
      card: FOLD_CARD_KEY
    }));
    return bar;
  });
  executeRegionStep(panelDrawing.report, PANEL_REGION.header, () => {
    panelDrawing.frame.className = isMeterCollapsed ? `${CLASS.frame} ${CLASS.folded}` : CLASS.frame;
  });
}
function readWindowWidths(panelDrawing) {
  const tokens = TYPE_TOKENS[panelDrawing.getTypeStep()];
  return {
    meter: panelDrawing.meterDrag?.readWidthPixels() ?? tokens.meterWidthPixels,
    helper: panelDrawing.helperDrag?.readWidthPixels() ?? tokens.helperWidthPixels
  };
}
function renderPanelFolded(document, regions, renderInPlace) {
  const renderEmptySlot = () => renderSlot(document);
  regions.header = renderInPlace(regions.header, PANEL_REGION.header, renderEmptySlot);
  regions.nouns = renderInPlace(regions.nouns, PANEL_REGION.strips, renderEmptySlot);
  regions.directions = renderInPlace(regions.directions, PANEL_REGION.strips, renderEmptySlot);
  regions.crumb = renderInPlace(regions.crumb, PANEL_REGION.crumb, renderEmptySlot);
  regions.options = renderInPlace(regions.options, PANEL_REGION.strips, renderEmptySlot);
  regions.list = renderInPlace(regions.list, PANEL_REGION.list, renderEmptySlot);
  regions.pinnedActor = renderInPlace(regions.pinnedActor, PANEL_REGION.pinned, renderEmptySlot);
  regions.pinnedTarget = renderInPlace(regions.pinnedTarget, PANEL_REGION.pinned, renderEmptySlot);
  regions.outside = renderInPlace(regions.outside, PANEL_REGION.outside, renderEmptySlot);
  regions.sides = renderInPlace(regions.sides, PANEL_REGION.sides, renderEmptySlot);
  regions.suspicions = renderInPlace(regions.suspicions, PANEL_REGION.suspicions, renderEmptySlot);
  regions.defects = renderInPlace(regions.defects, PANEL_REGION.defects, renderEmptySlot);
}
function renderStrip(document, attribute, strip) {
  const marked = strip.isCurrent ? ` ${CLASS.stripCurrent}` : "";
  const stripElement = renderElement(document, "div", `${CLASS.strip}${marked}`);
  stripElement.setAttribute(attribute, strip.name);
  stripElement.textContent = strip.words;
  return stripElement;
}
function renderCrumb(document, register, stated) {
  const crumb = renderElement(document, "div", CLASS.crumb);
  const back = renderElement(document, "span", CLASS.crumbBack);
  const leaving = stated.from ?? PANEL_WORDS.back;
  back.textContent = `${BACK_MARK}${leaving}`;
  back.setAttribute(PANEL_MARK.back, PANEL_WORDS.back);
  register.add(CRUMB_CARD_KEY, () => presentCrumbCard(leaving));
  back.setAttribute(CARD_ATTRIBUTE, CRUMB_CARD_KEY);
  const here = renderText(document, "span", CLASS.crumbHere, stated.said);
  register.add(CRUMB_HERE_CARD_KEY, () => presentNamedCard(stated.said));
  here.setAttribute(CARD_ATTRIBUTE, CRUMB_HERE_CARD_KEY);
  crumb.append(back);
  crumb.append(here);
  return crumb;
}
function presentCrumbCard(leaving) {
  return {
    name: leaving,
    subtitle: null,
    ending: null,
    groups: [
      {
        lines: [
          {
            kind: CARD_LINE.note,
            text: CARD_WORDS.gestureBack,
            tone: CARD_NOTE_TONE.plain
          },
          {
            kind: CARD_LINE.note,
            text: CARD_WORDS.gestureBackAnywhere,
            tone: CARD_NOTE_TONE.plain
          }
        ]
      }
    ]
  };
}
function getCrumbWordsForUnnamedCut(unnamedCut, metric) {
  if (unnamedCut.opened === HALF_NAMED_OPENED.person) {
    return unnamedCut.row.name ?? PANEL_WORDS.unknown;
  }
  return getWordsForKind(getNounForMetric(metric), unnamedCut.element);
}
function getWordsForKind(noun, key) {
  if (noun === PANEL_NOUN.damage) return formatDamageKind(key);
  return getWordsForHealthSource(key);
}
function getWordsForUnnamedRow(end) {
  return end === UNNAMED_END.actor ? PANEL_WORDS.withoutActor : PANEL_WORDS.withoutTarget;
}
function getWordsForNamedPart(openedPart, metric) {
  if (openedPart.kind === OPENED_PART.skill) return openedPart.name;
  if (openedPart.kind === OPENED_PART.plain) return getWordsForUnannounced(metric);
  const named = openedPart.kind === OPENED_PART.source ? openedPart.source : openedPart.element;
  return getWordsForKind(getNounForMetric(metric), named);
}
function renderPanelOptions(document, drawn, options, chosen, addOnVersion) {
  const { regions, renderInPlace, drawing, register } = drawn;
  const renderEmptySlot = () => renderSlot(document);
  regions.header = renderInPlace(regions.header, PANEL_REGION.header, renderEmptySlot);
  regions.nouns = renderInPlace(regions.nouns, PANEL_REGION.strips, renderEmptySlot);
  regions.directions = renderInPlace(regions.directions, PANEL_REGION.strips, renderEmptySlot);
  regions.crumb = renderInPlace(regions.crumb, PANEL_REGION.crumb, () => renderCrumb(document, register, {
    said: PANEL_WORDS.options,
    from: PANEL_WORDS.backFromOptions
  }));
  regions.options = renderInPlace(regions.options, PANEL_REGION.strips, () => {
    const region = renderElement(document, "div", CLASS.options);
    {
      const question = renderOptionsQuestion(document, PANEL_WORDS.typeSize);
      const steps = renderElement(document, "div", CLASS.optionsSteps);
      for (const step of TYPE_STEPS) {
        const marked = step === chosen.typeStep ? ` ${CLASS.stripCurrent}` : "";
        const className = `${CLASS.optionsStep} ${composeOptionsStepClass(step)}${marked}`;
        const answer = renderText(document, "div", className, getWordsForTypeStep(step));
        answer.setAttribute(PANEL_MARK.typeStep, step);
        steps.append(answer);
      }
      question.append(steps);
      region.append(question);
    }
    {
      const question = renderOptionsQuestion(document, PANEL_WORDS.windowSize);
      for (const window2 of PANEL_WINDOWS) {
        const isSized = chosen.windowSizes[window2] !== null;
        const line = renderElement(document, "div", CLASS.optionsWindow);
        const name = renderText(document, "span", CLASS.optionsWindowName, getWordsForWindow(window2));
        const own = isSized ? ` ${CLASS.optionsWindowOwn}` : "";
        const state = renderText(document, "span", `${CLASS.optionsWindowState}${own}`, isSized ? PANEL_WORDS.sizeOwn : PANEL_WORDS.sizeDefault);
        line.append(name);
        line.append(state);
        if (isSized) {
          const reset = renderText(document, "span", CLASS.optionsReset, PANEL_WORDS.sizeReset);
          reset.setAttribute(PANEL_MARK.resetSize, window2);
          line.append(reset);
        }
        question.append(line);
      }
      const hint = renderText(document, "div", CLASS.optionsMeaning, PANEL_WORDS.resizeHint);
      question.append(hint);
      region.append(question);
    }
    {
      const storageChosen = options.storage;
      const question = renderOptionsQuestion(document, PANEL_WORDS.storage);
      for (const choice of STORAGE_CHOICES) {
        const marked = choice === storageChosen ? ` ${CLASS.stripCurrent}` : "";
        const answer = renderText(document, "div", `${CLASS.optionsAnswer}${marked}`, getWordsForStorage(choice));
        answer.setAttribute(PANEL_MARK.storage, choice);
        question.append(answer);
      }
      const meaning = renderText(document, "div", CLASS.optionsMeaning, getWordsForStorageMeaning(storageChosen));
      question.append(meaning);
      region.append(question);
    }
    {
      const question = renderOptionsQuestion(document, PANEL_WORDS.version);
      question.append(renderText(document, "div", CLASS.optionsVersion, addOnVersion));
      region.append(question);
    }
    return region;
  });
  drawing.renderListRegion(OPTIONS_LIST_NAME, renderEmptySlot);
  regions.pinnedActor = renderInPlace(regions.pinnedActor, PANEL_REGION.pinned, renderEmptySlot);
  regions.pinnedTarget = renderInPlace(regions.pinnedTarget, PANEL_REGION.pinned, renderEmptySlot);
  regions.outside = renderInPlace(regions.outside, PANEL_REGION.outside, renderEmptySlot);
  regions.sides = renderInPlace(regions.sides, PANEL_REGION.sides, renderEmptySlot);
  regions.suspicions = renderInPlace(regions.suspicions, PANEL_REGION.suspicions, () => renderSuspicions(document, options.answers));
}
function renderOptionsQuestion(document, said) {
  const question = renderElement(document, "div", CLASS.optionsQuestion);
  const heading = renderText(document, "div", CLASS.optionsHeading, said);
  question.append(heading);
  return question;
}
function renderListContainer(document, rowsVisibleCount) {
  if (!Number.isSafeInteger(rowsVisibleCount)) rowsVisibleCount = ROWS_WAITING;
  if (rowsVisibleCount < 1) rowsVisibleCount = ROWS_WAITING;
  const list = renderElement(document, "div", CLASS.list);
  list.setAttribute(STYLE_ATTRIBUTE, `${ROWS_VARIABLE}:${formatWholeUngrouped(rowsVisibleCount)}`);
  return list;
}
function renderEmptyNote(document, words) {
  const empty = renderText(document, "div", CLASS.empty, words);
  return empty;
}
function setRowMarks(parts, name, stated) {
  for (const cell of parts) cell.setAttribute(name, stated);
}
function renderSection(document, heading, total) {
  const section = renderElement(document, "div", CLASS.section);
  const words = renderText(document, "span", CLASS.sectionWords, heading);
  const figure = renderText(document, "span", CLASS.figure, formatFigure(total));
  section.append(words);
  section.append(figure);
  return section;
}
function renderPersonRow(document, row, rank, person, doesOpen) {
  const card = {
    register: person.register,
    key: composeCardKey(person.keyPrefix, `${row.combatantId}`),
    figure: person.figure,
    share: person.share,
    compose: composePersonCard(row, person.card, doesOpen)
  };
  const rowContent = presentCombatantRow(row, rank, person.card.metric, person.place);
  const mark = doesOpen ? {
    attribute: PANEL_MARK.row,
    stated: `${row.combatantId}`
  } : null;
  return renderRow(document, rowContent, mark, card);
}
function composePersonCard(row, cardContext, doesOpen) {
  return () => presentPersonCard(row, cardContext, doesOpen);
}
function presentPersonCard(row, cardContext, doesOpen) {
  return presentCard({
    name: row.name ?? PANEL_WORDS.unknown,
    profession: row.profession,
    sideRelation: getSideRelation(row.side, cardContext.readerSide),
    detail: row.detail,
    metric: cardContext.metric,
    doesOpen,
    isRowNarrower: cardContext.isRowNarrower,
    unnamedNote: cardContext.unnamedNote,
    translate: cardContext.translate
  });
}
function renderRow(document, rowContent, mark, card) {
  const doesOpen = mark !== null;
  const kind = doesOpen ? CLASS.rowDrillable : CLASS.rowLeaf;
  const apartClass = rowContent.rank === null ? ` ${CLASS.rowApart}` : "";
  const rowElement = renderElement(document, "div", `${CLASS.row} ${kind}${apartClass}`);
  const parts = [];
  {
    const fill = Number.isFinite(rowContent.fill) ? Math.min(rowContent.fill, 1) : 0;
    const width = formatDecimal(fill * AS_PERCENT, FILL_PLACES);
    const colour = formatColour(rowContent.colour);
    const bar = renderElement(document, "div", CLASS.bar);
    bar.setAttribute(STYLE_ATTRIBUTE, `width:${width}%;background:${colour}`);
    const cap = renderElement(document, "div", CLASS.barCap);
    cap.setAttribute(STYLE_ATTRIBUTE, `background:${colour}`);
    parts.push(bar, cap);
  }
  const rank = renderText(document, "span", CLASS.rowRank, rowContent.rank === null ? "" : `${formatFigure(rowContent.rank)}.`);
  parts.push(rank);
  if (rowContent.isSuspect === true) {
    const mark2 = renderText(document, "span", CLASS.rowSuspect, SUSPECT_MARK);
    parts.push(mark2);
  }
  if (card.caveat !== void 0) {
    if (card.caveat !== null) {
      const mark2 = renderText(document, "span", CLASS.rowCaveat, CAVEAT_MARK);
      parts.push(mark2);
    }
  }
  if (rowContent.isTurnHolder === true) {
    const mark2 = renderText(document, "span", CLASS.rowTurn, TURN_MARK);
    parts.push(mark2);
  }
  parts.push(...renderSideRules(document, rowContent.sideRelation ?? SIDE_RELATION.nobody));
  const name = renderText(document, "span", CLASS.rowName, rowContent.name);
  const figureCell = renderText(document, "span", `${CLASS.rowValue} ${CLASS.figure}`, formatFigure(rowContent.figure));
  const share = renderElement(document, "span", CLASS.rowShare);
  const uses = rowContent.uses ?? null;
  const counted = uses === null ? "" : ` \xB7 ${formatUses(uses)}`;
  share.textContent = `(${rowContent.shareText}${counted})`;
  figureCell.append(share);
  parts.push(name, figureCell);
  for (const cell of parts) rowElement.append(cell);
  parts.push(share);
  const marked = [
    rowElement,
    ...parts
  ];
  if (mark !== null) setRowMarks(marked, mark.attribute, mark.stated);
  card.register.add(card.key, card.compose ?? (() => presentRowCard(rowContent, card, doesOpen)));
  setRowMarks(marked, CARD_ATTRIBUTE, card.key);
  return rowElement;
}
function renderSideRules(document, sideRelation) {
  if (sideRelation === SIDE_RELATION.nobody) return [];
  const rule = renderElement(document, "div", CLASS.rowSide);
  const colour = sideRelation === SIDE_RELATION.reader ? SIGNAL.ours : SIGNAL.theirs;
  rule.setAttribute(STYLE_ATTRIBUTE, `color:${formatColour(colour)}`);
  return [
    rule
  ];
}
function presentRowCard(rowContent, card, doesOpen) {
  const stated = [
    {
      kind: CARD_LINE.stat,
      label: card.figure,
      stated: formatFigure(rowContent.figure),
      isStrong: false,
      caveat: card.caveat ?? null
    }
  ];
  if (card.share !== null) {
    stated.push({
      kind: CARD_LINE.stat,
      label: card.share,
      stated: rowContent.shareText,
      isStrong: false,
      caveat: null
    });
  }
  const said = [
    ...presentCaveatNoteLines([
      {
        lines: stated
      }
    ])
  ];
  for (const note of card.notes ?? []) {
    said.push({
      kind: CARD_LINE.note,
      text: note,
      tone: CARD_NOTE_TONE.plain
    });
  }
  if (doesOpen) {
    said.push({
      kind: CARD_LINE.note,
      text: CARD_WORDS.gesture,
      tone: CARD_NOTE_TONE.plain
    });
  }
  const cut = presentRowCardCutLines(card.cut);
  if (cut.length === 0) {
    return {
      name: rowContent.name,
      subtitle: null,
      ending: null,
      groups: [
        {
          lines: [
            ...stated,
            ...said
          ]
        }
      ]
    };
  }
  const groups = [
    {
      lines: stated
    },
    {
      lines: cut
    }
  ];
  if (said.length > 0) groups.push({
    lines: said
  });
  return {
    name: rowContent.name,
    subtitle: null,
    ending: null,
    groups
  };
}
function presentRowCardCutLines(cut) {
  if (cut === void 0) return [];
  if (cut.parts.length === 0) return [];
  const lines = [
    {
      kind: CARD_LINE.heading,
      text: cut.heading
    }
  ];
  for (const cutPart of cut.parts) {
    lines.push({
      kind: CARD_LINE.sub,
      label: cutPart.label,
      stated: cutPart.stated
    });
  }
  return lines;
}
function presentCombatantRow(row, rank, metric, personContext) {
  return {
    name: row.name ?? PANEL_WORDS.unknown,
    figure: row.figure,
    fill: row.fill,
    shareText: row.shareText,
    colour: lookupColourForProfession(row.profession),
    profession: row.profession,
    rank,
    isSuspect: isRowSuspect(row.detail, metric),
    sideRelation: getSideRelation(row.side, personContext.readerSide),
    isTurnHolder: row.combatantId === personContext.turnHolderId
  };
}
function composeCutPlace(shown) {
  return {
    readerSide: shown.readerSide,
    turnHolderId: null
  };
}
function formatOpenedUnnamedNotes(metric) {
  const notes = [
    getNoteForUnnamedEnd(getUnnamedEndForMetric(metric), getNounForMetric(metric)),
    CARD_WORDS.insideSection
  ];
  const standing = getNoteForOpenedUnnamedStanding(metric);
  if (standing !== null) notes.push(standing);
  return notes;
}
function getUnnamedEndForMetric(metric) {
  return getDirectionForMetric(metric) === PANEL_DIRECTION.given ? UNNAMED_END.target : UNNAMED_END.actor;
}
function presentUnnamedRow(row, name) {
  return {
    name,
    figure: row.figure,
    fill: row.fill,
    shareText: row.shareText,
    colour: lookupColourForProfession(null),
    profession: null,
    rank: null
  };
}
function countRowsForPairLevel(pair, floor) {
  const parts = pair.parts.length;
  const kinds = pair.byElement.rows.length;
  const needed = (parts === 0 ? 0 : parts + 1) + (kinds === 0 ? 0 : kinds + 1);
  return Math.max(needed, floor);
}
function getKeyForNamedPart(where, openedPart) {
  if (openedPart.kind === OPENED_PART.skill) {
    return `${where}-${composeCardKey(CARD_KEY_PREFIX.skill, openedPart.name)}`;
  }
  if (openedPart.kind === OPENED_PART.plain) return `${where}-skill/plain`;
  if (openedPart.kind === OPENED_PART.element) {
    return `${where}-${composeCardKey(CARD_KEY_PREFIX.kind, openedPart.element)}`;
  }
  return `${where}-${composeCardKey(CARD_KEY_PREFIX.source, openedPart.source)}`;
}
function composeCardKey(prefix, stated) {
  return `${prefix}:${stated}`;
}
function getCaveatForNamedPart(openedPart, metric) {
  if (openedPart.kind === OPENED_PART.element) return getCaveatForKind(openedPart.element);
  if (openedPart.kind !== OPENED_PART.plain) return null;
  return getCaveatForUnannounced(getNounForMetric(metric));
}
function presentElementRow(row, noun, rank) {
  return {
    name: getWordsForKind(noun, row.element),
    figure: row.figure,
    fill: row.fill,
    shareText: row.shareText,
    colour: lookupColourForProfession(null),
    profession: null,
    rank
  };
}
function getWordsForHalfNamedCut(end) {
  return end === UNNAMED_END.actor ? PANEL_WORDS.dealtTo : PANEL_WORDS.takenFrom;
}
function renderHalfNamedRows(document, list, shown, stated) {
  const { rows, neither, doesOpen, register, translate } = stated;
  const figure = getWordsForMetric(shown.metric);
  const share = PANEL_WORDS.shareOfFigure;
  const cardContext = {
    metric: shown.metric,
    translate,
    isRowNarrower: true,
    unnamedNote: stated.unnamedNote,
    readerSide: shown.readerSide
  };
  const person = {
    register,
    keyPrefix: CARD_KEY_PREFIX.named,
    figure,
    share,
    card: cardContext,
    place: composeCutPlace(shown)
  };
  for (const [rowIndex, row] of rows.entries()) {
    list.append(renderPersonRow(document, row, rowIndex + 1, person, doesOpen));
  }
  if (neither === null) return;
  const card = {
    register,
    key: "named/nobody",
    figure,
    share,
    notes: [
      NEITHER_END_WORDS.note
    ]
  };
  const rowContent = presentUnnamedRow(neither, NEITHER_END_WORDS.label);
  list.append(renderRow(document, rowContent, null, card));
}
function countElementCutRows(cut) {
  return cut.rows.length + (cut.rest === null ? 0 : 1) + (cut.noKind === null ? 0 : 1);
}
function renderElementSection(document, list, cut, stated) {
  if (countElementCutRows(cut) === 0) return;
  const unnamedNotes = stated.unnamedNote === null ? [] : [
    stated.unnamedNote
  ];
  list.append(renderSection(document, getWordsForKindCut(stated.metric), stated.total));
  const noun = getNounForMetric(stated.metric);
  const share = PANEL_WORDS.shareOfFigure;
  for (const [rowIndex, row] of cut.rows.entries()) {
    const openedPart = {
      kind: OPENED_PART.element,
      element: row.element
    };
    const card2 = {
      register: stated.register,
      key: composeCardKey(CARD_KEY_PREFIX.kind, row.element),
      figure: stated.figure,
      share,
      notes: unnamedNotes,
      caveat: getCaveatForNamedPart(openedPart, stated.metric)
    };
    list.append(renderRow(document, presentElementRow(row, noun, rowIndex + 1), getMarkForNamedPart(openedPart, row.doesOpenPart), card2));
  }
  renderRestRow(document, list, cut.rest, {
    register: stated.register,
    figure: stated.figure,
    key: "kind/rest",
    unnamedNote: stated.unnamedNote
  });
  if (cut.noKind === null) return;
  const card = {
    register: stated.register,
    key: "kind/nobody",
    figure: stated.figure,
    share,
    notes: [
      getNoteForNoKind(noun),
      ...unnamedNotes
    ]
  };
  const rowContent = presentUnnamedRow(cut.noKind, PANEL_WORDS.withoutKind);
  list.append(renderRow(document, rowContent, null, card));
}
function getMarkForNamedPart(openedPart, doesOpen) {
  if (!doesOpen) return null;
  if (openedPart.kind === OPENED_PART.skill) {
    return {
      attribute: PANEL_MARK.skill,
      stated: openedPart.name
    };
  }
  if (openedPart.kind === OPENED_PART.source) {
    return {
      attribute: PANEL_MARK.source,
      stated: openedPart.source
    };
  }
  if (openedPart.kind === OPENED_PART.plain) {
    return {
      attribute: PANEL_MARK.plain,
      stated: PLAIN_MARK
    };
  }
  return {
    attribute: PANEL_MARK.kind,
    stated: openedPart.element
  };
}
function renderRestRow(document, list, rest, stated) {
  if (rest === null) return;
  const notes = [
    PANEL_WORDS.restNote
  ];
  if (stated.unnamedNote !== null) notes.push(stated.unnamedNote);
  const card = {
    register: stated.register,
    key: stated.key,
    figure: stated.figure,
    share: PANEL_WORDS.shareOfFigure,
    notes
  };
  const rowContent = presentUnnamedRow(rest, PANEL_WORDS.restOfKinds);
  list.append(renderRow(document, rowContent, null, card));
}
function countRowsForOpenedLevel(opened, floor) {
  const opponents = opened.byOtherEnd;
  let needed = 0;
  const opponentRows = opponents.rows.length + (opponents.halfNamed === null ? 0 : 1);
  if (opponentRows > 0) needed += opponentRows + 1;
  if (countElementCutRows(opened.byElement) > 0) {
    needed += countElementCutRows(opened.byElement) + 1;
  }
  const skillRows = opened.bySkill.rows.length + (opened.bySkill.closing === null ? 0 : 1);
  if (skillRows > 0) needed += skillRows + (opened.bySkill.rest === null ? 0 : 1) + 1;
  return Math.max(needed, floor);
}
function renderClosingRowAtPlace(document, list, closing, stated, drawn, isLast) {
  if (closing === null) return drawn;
  if (closing.rank !== drawn + 1) {
    if (!isLast) return drawn;
    if (closing.rank <= drawn) return drawn;
  }
  const card = {
    register: stated.register,
    key: "skill/plain",
    figure: stated.figure,
    share: PANEL_WORDS.shareOfFigure,
    caveat: getCaveatForNamedPart({
      kind: OPENED_PART.plain
    }, stated.metric)
  };
  const rowContent = {
    ...presentUnnamedRow(closing, getWordsForUnannounced(stated.metric)),
    rank: closing.rank,
    uses: closing.blows
  };
  const mark = getMarkForNamedPart({
    kind: OPENED_PART.plain
  }, closing.doesOpenPart);
  list.append(renderRow(document, rowContent, mark, card));
  return drawn + 1;
}
function presentSkillRow(row, metric, rank) {
  const name = getWordsForNamedPart(row.part, metric);
  return {
    name,
    figure: row.figure,
    fill: row.fill,
    shareText: row.shareText,
    colour: lookupColourForProfession(null),
    profession: null,
    rank,
    uses: row.uses
  };
}
function isLevelOpen(shown) {
  if (shown.opened !== null) return true;
  if (shown.unnamed !== null) return true;
  return shown.unnamedCut !== null;
}
function formatPinnedNotes(row, metric, isSideChosen) {
  const notes = [
    getNoteForUnnamedEnd(row.end, getNounForMetric(metric)),
    getWordsForPinnedStanding(row.case)
  ];
  if (isSideChosen) notes.push(getWordsForPinnedScope(row.case));
  return notes;
}
function presentKindCutParts(kinds, metric) {
  const parts = [];
  let rest = 0;
  for (const [kindIndex, kindRow] of kinds.rows.entries()) {
    if (kindIndex < CARD_CUT_PARTS_MAXIMUM) {
      parts.push({
        label: getWordsForNamedPart({
          kind: OPENED_PART.element,
          element: kindRow.element
        }, metric),
        stated: `${formatFigure(kindRow.figure)} (${kindRow.shareText})`
      });
      continue;
    }
    rest += kindRow.figure;
  }
  if (rest > 0) parts.push({
    label: PANEL_WORDS.restOfKinds,
    stated: formatFigure(rest)
  });
  return {
    heading: getWordsForKindCut(metric),
    parts
  };
}
function formatSidesLabel(shown) {
  const sides = `${PANEL_WORDS.ourSide} / ${PANEL_WORDS.theirSide}`;
  if (shown.side === SIDE_CHOICE.everyone) {
    if (!isLevelOpen(shown)) return sides;
  }
  return `${PANEL_WORDS.wholeFight} \xB7 ${sides}`;
}
function renderSuspicions(document, suspicions) {
  if (suspicions.length === 0) return renderSlot(document);
  const block = renderElement(document, "div", CLASS.suspicions);
  for (const suspicion of suspicions) {
    const line = renderText(document, "div", CLASS.suspicion, `${SUSPECT_MARK}${suspicion}`);
    block.append(line);
  }
  return block;
}
function renderDefects(document, defects) {
  if (defects.length === 0) return renderSlot(document);
  const block = renderElement(document, "div", CLASS.defects);
  for (const defect of defects.slice(0, DEFECTS_MAXIMUM)) {
    const line = renderElement(document, "div", CLASS.defect);
    const said = formatDefect(defect.kind, defect.region, defect.count);
    line.textContent = `${DEFECT_MARK}${said}`;
    block.append(line);
  }
  return block;
}
function renderPanelSettled(panelDrawing) {
  executeRegionStep(panelDrawing.report, PANEL_REGION.list, () => panelDrawing.drawing.settle());
  panelDrawing.meterDrag?.holdBarRedrawn();
  executeRegionStep(panelDrawing.report, PANEL_REGION.card, () => panelDrawing.card.renderOpen());
}
function renderHelperPerson(document, register, cardKey, person) {
  const nested = person.isNested ? ` ${CLASS.helperUnder}` : "";
  const castName = person.isNested ? null : person.skillName;
  const holding = castName === null ? "" : ` ${CLASS.helperHolding}`;
  const classes = `${CLASS.row} ${CLASS.rowLeaf}${nested}${holding}`;
  const row = renderElement(document, "div", classes);
  const cap = renderElement(document, "div", CLASS.barCap);
  cap.setAttribute(STYLE_ATTRIBUTE, `background:${formatColour(person.colour)}`);
  const name = renderText(document, "span", CLASS.rowName, person.name);
  row.append(cap);
  row.append(name);
  const parts = [
    cap,
    name
  ];
  if (castName !== null) {
    const between = renderText(document, "span", CLASS.rowShare, HELPER_WORDS.castSeparator);
    const cast = renderText(document, "span", CLASS.helperCast, castName);
    row.append(between);
    row.append(cast);
    parts.push(between, cast);
  }
  if (person.turns !== null) {
    const turnsCell = renderText(document, "span", `${CLASS.rowValue} ${CLASS.figure}`, person.turns);
    row.append(turnsCell);
    parts.push(turnsCell);
  }
  for (const rule of renderSideRules(document, person.sideRelation)) {
    row.append(rule);
    parts.push(rule);
  }
  register.add(cardKey, () => presentHelperPersonCard(person));
  setRowMarks([
    row,
    ...parts
  ], CARD_ATTRIBUTE, cardKey);
  return row;
}
function presentHelperPersonCard(person) {
  if (person.turns === null) {
    return {
      name: person.name,
      subtitle: person.skillName,
      ending: null,
      groups: []
    };
  }
  const stated = {
    kind: CARD_LINE.stat,
    label: HELPER_WORDS.turnsLeft,
    stated: person.turns,
    isStrong: false,
    caveat: person.turnsCaveat
  };
  const lines = [
    stated,
    ...presentCaveatNoteLines([
      {
        lines: [
          stated
        ]
      }
    ])
  ];
  return {
    name: person.name,
    subtitle: person.skillName,
    ending: null,
    groups: [
      {
        lines
      }
    ]
  };
}
function presentChargedSkillCard(charged) {
  const name = charged.skillName;
  const subtitle = formatChargedSkillSubtitle(charged.name, charged.state);
  const turnsLeft = formatChargedSkillTurnsLeft(charged);
  if (turnsLeft === null) return {
    name,
    subtitle,
    ending: null,
    groups: []
  };
  const stated = {
    kind: CARD_LINE.stat,
    label: HELPER_WORDS.turnsLeft,
    stated: turnsLeft,
    isStrong: false,
    caveat: null
  };
  return {
    name,
    subtitle,
    ending: null,
    groups: [
      {
        lines: [
          stated
        ]
      }
    ]
  };
}
function formatChargedSkillTurnsLeft(charged) {
  if (charged.state === CHARGED_SKILL_STATE.charging) {
    return formatTurnsLeft(charged.turnsElapsed, charged.turnsStated);
  }
  return null;
}
function presentCaveatNoteLines(groups) {
  const said = /* @__PURE__ */ new Set();
  for (const group of groups) {
    for (const line of group.lines) {
      if (line.kind !== CARD_LINE.stat) continue;
      if (line.caveat === null) continue;
      said.add(line.caveat);
    }
  }
  return CAVEATS.filter((caveat) => said.has(caveat)).map((caveat) => ({
    kind: CARD_LINE.note,
    text: getNoteForCaveat(caveat),
    tone: CARD_NOTE_TONE.caveat
  }));
}
function presentFightCard(fight) {
  const counted = fight.isUnread ? null : formatSideCounts(fight.sizes, fight.unplaced);
  const words = getWordsForShelfOutcome(fight.outcome, fight.isLive);
  const ending = words.length === 0 ? null : {
    words,
    outcome: fight.outcome
  };
  const lines = [];
  addFightCardLine(lines, FIGHT_CARD_WORDS.when, formatShelfTime(fight.at, false));
  addFightCardLine(lines, FIGHT_CARD_WORDS.world, fight.world ?? "");
  addFightCardLine(lines, FIGHT_CARD_WORDS.character, fight.reader?.name ?? "");
  const said = fight.reader === null ? null : formatCardSubtitle(fight.reader.profession, fight.reader.level, SIDE_RELATION.nobody);
  addFightCardLine(lines, FIGHT_CARD_WORDS.profession, said ?? "");
  const groups = lines.length === 0 ? [] : [
    {
      lines
    }
  ];
  const notes = [];
  if (fight.isUnread) {
    notes.push({
      kind: CARD_LINE.note,
      text: `${DEFECT_MARK}${PANEL_WORDS.keptUnreadNote}`,
      tone: CARD_NOTE_TONE.defect
    });
  }
  for (const suspicion of fight.suspicions) {
    notes.push({
      kind: CARD_LINE.note,
      text: `${SUSPECT_MARK}${suspicion}`,
      tone: CARD_NOTE_TONE.suspect
    });
  }
  if (notes.length > 0) groups.push({
    lines: notes
  });
  if (fight.place === null) {
    return {
      name: counted ?? PANEL_WORDS.keptUnread,
      subtitle: null,
      ending,
      groups
    };
  }
  return {
    name: fight.place,
    subtitle: counted,
    ending,
    groups
  };
}
function addFightCardLine(lines, label, stated) {
  if (stated.length === 0) return;
  lines.push({
    kind: CARD_LINE.stat,
    label,
    stated,
    isStrong: false,
    caveat: null
  });
}
function isPointerStill(pressedAt, releasedAt) {
  if (pressedAt === null) return false;
  if (releasedAt === null) return false;
  if (Math.abs(releasedAt.left - pressedAt.left) > STILL_TRAVEL_PIXELS_MAXIMUM) return false;
  return Math.abs(releasedAt.top - pressedAt.top) <= STILL_TRAVEL_PIXELS_MAXIMUM;
}
function createCardRegister() {
  const composeByKey = /* @__PURE__ */ new Map();
  let refused = null;
  return {
    // A row with no name, one already registered, or one past the bound is left without a
    // card, and the first of them is kept for the draw to report (**E12**). What that costs
    // is detail on hover, and never the draw it arrived in.
    add(key, compose) {
      let isRefused;
      if (key.length === 0) {
        isRefused = true;
      } else if (composeByKey.has(key)) {
        isRefused = true;
      } else {
        isRefused = composeByKey.size >= CARDS_DRAWN_MAXIMUM;
      }
      if (!isRefused) {
        composeByKey.set(key, compose);
      } else if (refused === null) {
        refused = new CardRefused(key);
      }
    },
    lookup(key) {
      return composeByKey.get(key) ?? null;
    },
    lookupRefused() {
      return refused;
    },
    reset() {
      composeByKey.clear();
      refused = null;
    }
  };
}
function tallyCardSize(card, step) {
  if (card === null) return {
    lines: 1,
    groups: 0
  };
  const floors = CHARACTERS_PER_LINE_BY_STEP[step];
  const endingLength = card.ending === null ? 0 : CARD_ENDING_SEPARATOR.length + card.ending.words.length;
  let nameLength = card.name.length;
  if (card.subtitle === null) nameLength += endingLength;
  let lines = calculateCardLinesForCharacters(nameLength, floors.name);
  if (card.subtitle !== null) {
    lines += calculateCardLinesForCharacters(card.subtitle.length + endingLength, floors.note);
  }
  for (const group of card.groups) {
    for (const line of group.lines) {
      lines += calculateCardLineCost(line, floors);
    }
  }
  return {
    lines,
    groups: card.groups.length
  };
}
function calculateCardLinesForCharacters(characters, charactersPerLine) {
  const wrapped = Math.ceil(characters / charactersPerLine);
  if (wrapped < 1) return 1;
  return wrapped;
}
function calculateCardLineCost(line, floors) {
  if (line.kind !== CARD_LINE.note) return 1;
  const marked = line.tone === CARD_NOTE_TONE.caveat ? NOTE_MARK_CHARACTERS : 0;
  return calculateCardLinesForCharacters(line.text.length + marked, floors.note);
}
function renderCard(document, card, secondColumnFrom = null) {
  const drawnCard = document.createElement("div");
  drawnCard.className = composeCardClass(card === null, secondColumnFrom !== null);
  if (card === null) return drawnCard;
  const separator = card.ending === null ? "" : CARD_ENDING_SEPARATOR;
  const name = document.createElement("div");
  name.className = CLASS.cardName;
  name.textContent = card.subtitle === null ? `${card.name}${separator}` : card.name;
  drawnCard.append(name);
  let headcount;
  if (card.subtitle !== null) {
    const subtitle = document.createElement("div");
    subtitle.className = CLASS.cardSubtitle;
    subtitle.textContent = `${card.subtitle}${separator}`;
    drawnCard.append(subtitle);
    headcount = subtitle;
  } else {
    headcount = name;
  }
  if (card.ending !== null) {
    const inked = card.ending.outcome === null ? "" : OUTCOME_INK_CLASS[card.ending.outcome];
    const words = card.ending.words;
    headcount.append(renderText(document, "span", `${CLASS.cardOutcome}${inked}`, words));
  }
  const notesFrom = countCardGroupsColumned(card.groups);
  let firstColumn;
  let secondColumn;
  if (secondColumnFrom === null) {
    firstColumn = drawnCard;
    secondColumn = drawnCard;
  } else {
    const columns = document.createElement("div");
    columns.className = CLASS.cardColumns;
    firstColumn = document.createElement("div");
    firstColumn.className = CLASS.cardColumn;
    secondColumn = document.createElement("div");
    secondColumn.className = CLASS.cardColumn;
    columns.append(firstColumn);
    columns.append(secondColumn);
    drawnCard.append(columns);
  }
  for (const [groupIndex, group] of card.groups.entries()) {
    let parent;
    if (groupIndex < (secondColumnFrom ?? notesFrom)) parent = firstColumn;
    else if (groupIndex < notesFrom) parent = secondColumn;
    else parent = drawnCard;
    const drawnGroup = document.createElement("div");
    drawnGroup.className = CLASS.cardGroup;
    for (const line of group.lines) {
      if (line.kind === CARD_LINE.note) {
        const note = document.createElement("div");
        const tone = CARD_NOTE_TONE_CLASS[line.tone];
        note.className = `${CLASS.cardNote}${tone}`;
        note.textContent = line.text;
        if (line.tone === CARD_NOTE_TONE.caveat) {
          note.append(renderCardCaveat(document));
        }
        drawnGroup.append(note);
      } else if (line.kind === CARD_LINE.heading) {
        const heading = document.createElement("div");
        heading.className = CLASS.cardHeading;
        heading.textContent = line.text;
        drawnGroup.append(heading);
      } else {
        const drawnLine = document.createElement("div");
        drawnLine.className = composeCardLineClass(line);
        const label = document.createElement("span");
        label.className = CLASS.cardLabel;
        label.textContent = line.label;
        const stated = document.createElement("span");
        stated.className = CLASS.cardValue;
        stated.textContent = line.stated;
        drawnLine.append(label);
        if (line.kind === CARD_LINE.stat) {
          if (line.caveat !== null) drawnLine.append(renderCardCaveat(document));
        }
        drawnLine.append(stated);
        drawnGroup.append(drawnLine);
      }
    }
    parent.append(drawnGroup);
  }
  return drawnCard;
}
function composeCardClass(isHidden, isWide) {
  if (isHidden) return `${CLASS.card} ${CLASS.cardHidden}`;
  if (isWide) return `${CLASS.card} ${CLASS.cardWide}`;
  return CLASS.card;
}
function countCardGroupsColumned(groups) {
  const lastGroup = groups[groups.length - 1];
  if (lastGroup === void 0) return 0;
  if (isNoteGroup(lastGroup)) return groups.length - 1;
  return groups.length;
}
function isNoteGroup(group) {
  if (group.lines.length === 0) return false;
  return group.lines.every((line) => line.kind === CARD_LINE.note);
}
function renderCardCaveat(document) {
  const caveatElement = document.createElement("span");
  caveatElement.className = CLASS.cardCaveat;
  caveatElement.textContent = CAVEAT_MARK;
  return caveatElement;
}
function composeCardLineClass(line) {
  if (line.kind === CARD_LINE.sub) return `${CLASS.cardLine} ${CLASS.cardSub}`;
  if (line.kind === CARD_LINE.stat) {
    if (line.isStrong) return `${CLASS.cardLine} ${CLASS.cardStrong}`;
  }
  return CLASS.cardLine;
}
function setCardHidden(card, isHidden) {
  card.className = isHidden ? `${CLASS.card} ${CLASS.cardHidden}` : CLASS.card;
}
function setCardPosition(card, clientY, across, size, step) {
  const stated = Number.isFinite(clientY) ? clientY : 0;
  const top = Math.max(0, Math.round(stated));
  const sideways = composeCardAcrossStyle(across);
  const height = calculateCardHeight(size, TYPE_TOKENS[step]);
  const tall = height === null ? "" : `;${CARD_VARIABLES.height}:${height}px`;
  card.setAttribute(STYLE_ATTRIBUTE, `${CARD_VARIABLES.top}:${top}px${tall}${sideways}`);
}
function composeCardAcrossStyle(across) {
  if (across === null) return "";
  const edgeOffset = `${Math.max(0, Math.round(across.offsetPixels))}px`;
  if (across.edge === CARD_EDGE.left) {
    return `;${CARD_VARIABLES.left}:${edgeOffset};${CARD_VARIABLES.right}:${EDGE_RELEASED}`;
  }
  return `;${CARD_VARIABLES.left}:${EDGE_RELEASED};${CARD_VARIABLES.right}:${edgeOffset}`;
}
function composeCardLayout(card, room, typeStep) {
  const whole = {
    card,
    secondColumnFrom: null
  };
  const height = room.heightPixels;
  if (height === null) return whole;
  if (!Number.isFinite(height)) return whole;
  if (height <= 0) return whole;
  if (isCardLayoutWithin(whole, height, typeStep)) return whole;
  const isTwoColumnsWithin = isCardWidthWithin(room.widthPixels, typeStep);
  let kept = card.groups;
  let laidOut = whole;
  for (let step = 0; step < CARD_GROUPS_MAXIMUM; step += 1) {
    const trimmed = composeCardTrimmed(card, kept);
    const split = isTwoColumnsWithin ? calculateCardColumnSplit(trimmed, typeStep) : null;
    laidOut = {
      card: trimmed,
      secondColumnFrom: split
    };
    if (isCardLayoutWithin(laidOut, height, typeStep)) return laidOut;
    const shorter = composeGroupsWithout(kept);
    if (shorter === null) return laidOut;
    kept = shorter;
  }
  return laidOut;
}
function isCardLayoutWithin(layout, room, step) {
  const height = calculateCardHeight(tallyCardLayoutSize(layout, step), TYPE_TOKENS[step]);
  if (height === null) return true;
  return height <= room;
}
function isCardWidthWithin(room, step) {
  if (room === null) return false;
  return calculateCardWidthForColumns(TYPE_TOKENS[step], 2) <= room;
}
function calculateCardColumnSplit(card, step) {
  const columned = countCardGroupsColumned(card.groups);
  if (columned < 2) return null;
  const floors = CHARACTERS_PER_LINE_BY_STEP[step];
  const costs = card.groups.slice(0, columned).map((group) => group.lines.reduce((sum, line) => sum + calculateCardLineCost(line, floors), 0));
  const total = costs.reduce((sum, cost) => sum + cost, 0);
  let split = 1;
  let tallerLeast = Number.POSITIVE_INFINITY;
  let before = 0;
  for (let candidate = 1; candidate < Math.min(columned, CARD_GROUPS_MAXIMUM); candidate += 1) {
    before += costs[candidate - 1] ?? 0;
    const taller = Math.max(before, total - before);
    if (taller < tallerLeast) {
      split = candidate;
      tallerLeast = taller;
    }
  }
  return split;
}
function composeGroupsWithout(groups) {
  const lastIndex = groups.length - 1;
  if (lastIndex < 1) return null;
  const droppedIndex = isNoteGroup(groups[lastIndex] ?? {
    lines: []
  }) ? lastIndex - 1 : lastIndex;
  if (droppedIndex < 1) return null;
  return [
    ...groups.slice(0, droppedIndex),
    ...groups.slice(droppedIndex + 1)
  ];
}
function composeCardTrimmed(card, kept) {
  if (kept.length === card.groups.length) return card;
  const said = {
    kind: CARD_LINE.note,
    text: CARD_WORDS.cut,
    tone: CARD_NOTE_TONE.plain
  };
  const lastGroup = kept[kept.length - 1];
  if (lastGroup !== void 0) {
    if (isNoteGroup(lastGroup)) {
      const groups = [
        ...kept.slice(0, -1),
        {
          lines: [
            ...lastGroup.lines,
            said
          ]
        }
      ];
      return {
        ...card,
        groups
      };
    }
  }
  return {
    ...card,
    groups: [
      ...kept,
      {
        lines: [
          said
        ]
      }
    ]
  };
}
function tallyCardLayoutSize(layout, step) {
  const split = layout.secondColumnFrom;
  if (split === null) return tallyCardSize(layout.card, step);
  const card = layout.card;
  const notesFrom = countCardGroupsColumned(card.groups);
  const header = tallyCardSize({
    ...card,
    groups: []
  }, step);
  const leftColumn = tallyCardSize({
    ...card,
    groups: card.groups.slice(0, split)
  }, step);
  const rightColumn = tallyCardSize({
    ...card,
    groups: card.groups.slice(split, notesFrom)
  }, step);
  const notes = tallyCardSize({
    ...card,
    groups: card.groups.slice(notesFrom)
  }, step);
  const columnLines = Math.max(leftColumn.lines, rightColumn.lines) - header.lines;
  const noteLines = notes.lines - header.lines;
  return {
    lines: header.lines + columnLines + noteLines,
    groups: Math.max(leftColumn.groups, rightColumn.groups) + notes.groups
  };
}
function initUndrawnReport(options) {
  let collected = null;
  return {
    add(region, cause) {
      const failure = new RegionUndrawn(region, cause);
      if (collected === null) {
        addViewFailureGuarded(failure, options.onFailure);
        return;
      }
      if (collected.length < UNDRAWN_MAXIMUM) collected.push(failure);
      else addViewFailureGuarded(failure, options.onFailure);
    },
    // ⚠️ Every step of a render stands under a guard of its own, so nothing leaves `render`
    // with the report still collecting. A step added unguarded would take the sink with it.
    collect(render) {
      const undrawn = [];
      collected = undrawn;
      render();
      collected = null;
      return {
        undrawn
      };
    }
  };
}
function initCardHandle(document, lookupCard, redraw, readAcross, readViewport, getTypeStep, reportLinesExceeded) {
  let cardElement = renderCard(document, null);
  let openKey = null;
  let openTop = 0;
  let openSize = tallyCardSize(null, getTypeStep());
  let openColumns = 1;
  const renderCardFor = (key, compose) => {
    cardElement = redraw(cardElement, () => {
      const viewport = readViewport();
      const room = {
        heightPixels: calculateCardHeightAvailable(viewport?.height ?? null),
        widthPixels: calculateCardWidthAvailable(viewport?.width ?? null)
      };
      const layout = composeCardLayout(compose(), room, getTypeStep());
      const renderedCard = renderCard(document, layout.card, layout.secondColumnFrom);
      const counted = tallyCardLayoutSize(layout, getTypeStep());
      if (counted.lines > CARD_LINES_MAXIMUM) {
        openSize = {
          lines: CARD_LINES_MAXIMUM,
          groups: counted.groups
        };
        reportLinesExceeded(new CardLinesExceeded(counted.lines, CARD_LINES_MAXIMUM));
      } else {
        openSize = counted;
      }
      openColumns = layout.secondColumnFrom === null ? 1 : 2;
      return renderedCard;
    });
    setCardPosition(cardElement, openTop, readAcross(key, openColumns), openSize, getTypeStep());
  };
  const hideCard = () => {
    if (openKey === null) return;
    openKey = null;
    setCardHidden(cardElement, true);
  };
  return {
    element: cardElement,
    onHover(key, clientY) {
      if (key === null) {
        hideCard();
        return;
      }
      const top = Math.max(0, Math.round(clientY));
      if (key === openKey) {
        if (!cardElement.className.includes(CLASS.cardHidden)) {
          if (top === openTop) return;
          openTop = top;
          setCardPosition(cardElement, openTop, readAcross(key, openColumns), openSize, getTypeStep());
          return;
        }
      }
      const compose = lookupCard(key);
      if (compose === null) {
        hideCard();
        return;
      }
      openTop = top;
      openKey = key;
      renderCardFor(key, compose);
    },
    renderOpen() {
      const key = openKey;
      if (key === null) return;
      const compose = lookupCard(key);
      if (compose === null) {
        hideCard();
        return;
      }
      renderCardFor(key, compose);
    }
  };
}
function presentCard(subject) {
  const groups = [
    {
      lines: presentCardFigureLines(subject.detail, subject.metric, subject.translate)
    }
  ];
  const counters = presentCardCounterLines(subject.detail);
  if (counters.length > 0) groups.push({
    lines: counters
  });
  groups.push(...presentCardRunGroups(subject.detail, subject.translate));
  const legendary = presentCardLegendaryLines(subject.detail.legendaryBonuses);
  if (legendary.length > 0) groups.push({
    lines: legendary
  });
  const reached = presentCardReachedLines(subject.detail.legendaryBonusesReached);
  if (reached.length > 0) groups.push({
    lines: reached
  });
  const notes = presentCardNoteLines(subject, groups);
  if (notes.length > 0) groups.push({
    lines: notes
  });
  return {
    // A card with nobody behind it says so rather than standing with a blank where a name is.
    name: subject.name.length > 0 ? subject.name : PANEL_WORDS.unknown,
    subtitle: formatCardSubtitle(subject.profession, subject.detail.level, subject.sideRelation),
    ending: null,
    groups
  };
}
function presentCardFigureLines(detail, metric, translate) {
  const lines = [
    {
      kind: CARD_LINE.heading,
      text: CARD_WORDS.wholeFight
    }
  ];
  for (const cardFigure of presentCardFigures(detail)) {
    if (cardFigure.metric !== metric) {
      if (!Number.isFinite(cardFigure.figure)) continue;
      if (cardFigure.figure <= 0) continue;
    }
    lines.push({
      kind: CARD_LINE.stat,
      label: getWordsForCardMetric(cardFigure.metric),
      stated: formatFigure(cardFigure.figure),
      isStrong: cardFigure.metric === metric,
      caveat: null
    });
    if (cardFigure.halfNamed !== null) {
      lines.push(...presentCardSubLine(cardFigure.halfNamed.label, cardFigure.halfNamed.figure));
    }
    for (const mergedPart of presentCardPartsMergedByWord(cardFigure.absorbed, translate)) {
      lines.push(...presentCardSubLine(mergedPart.label, mergedPart.figure));
    }
  }
  return lines;
}
function presentCardFigures(detail) {
  const figures = [
    {
      metric: PANEL_METRIC.damageDealt,
      figure: detail.damageDealt,
      halfNamed: {
        label: PANEL_WORDS.withoutTarget,
        figure: detail.damageDealtToNobody
      },
      absorbed: detail.damageDealtAbsorbedByDefence
    },
    {
      metric: PANEL_METRIC.damageTaken,
      figure: detail.damageTaken,
      halfNamed: {
        label: PANEL_WORDS.withoutActor,
        figure: detail.damageTakenFromNobody
      },
      absorbed: detail.damageTakenAbsorbedByDefence
    },
    {
      metric: PANEL_METRIC.healthGiven,
      figure: detail.healthGiven,
      halfNamed: null,
      absorbed: []
    },
    {
      metric: PANEL_METRIC.healthRestored,
      figure: detail.healthRestored,
      halfNamed: {
        label: PANEL_WORDS.withoutActor,
        figure: detail.healthRestoredByNobody
      },
      absorbed: []
    }
  ];
  return figures;
}
function presentCardSubLine(label, figure) {
  if (label.length === 0) return [];
  if (!Number.isFinite(figure)) return [];
  if (figure <= 0) return [];
  return [
    {
      kind: CARD_LINE.sub,
      label,
      stated: formatFigure(figure)
    }
  ];
}
function presentCardCounterLines(detail) {
  const lines = [];
  if (detail.turnsTaken > 0) lines.push(presentCardTurnLine(detail));
  if (detail.blowsStruck > 0) {
    lines.push({
      kind: CARD_LINE.stat,
      label: CARD_WORDS.blows,
      stated: formatFigure(detail.blowsStruck),
      isStrong: false,
      caveat: null
    });
    lines.push(...presentCardSubLine(CARD_WORDS.blowsWithoutSkill, detail.blowsWithoutSkill));
  }
  if (detail.skillUses > 0) {
    lines.push({
      kind: CARD_LINE.stat,
      label: CARD_WORDS.skillUses,
      stated: formatFigure(detail.skillUses),
      isStrong: false,
      caveat: null
    });
  }
  return lines;
}
function presentCardTurnLine(detail) {
  if (!detail.wasTurnLostRead) {
    return {
      kind: CARD_LINE.stat,
      label: CARD_WORDS.turns,
      stated: formatFigure(detail.turnsTaken),
      isStrong: false,
      caveat: CAVEAT.turns
    };
  }
  return {
    kind: CARD_LINE.stat,
    label: CARD_WORDS.turnsWithLost,
    stated: formatTurns(detail.turnsTaken, detail.turnsLost),
    isStrong: false,
    caveat: CAVEAT.turns
  };
}
function presentCardRunGroups(detail, translate) {
  const runs = [
    {
      heading: CARD_WORDS.striking,
      lines: presentCardDealtLines(detail, translate)
    },
    {
      heading: CARD_WORDS.struck,
      lines: presentCardTakenLines(detail, translate)
    }
  ];
  const groups = [];
  for (const run of runs) {
    if (run.heading.length === 0) continue;
    if (run.lines.length === 0) continue;
    groups.push({
      lines: [
        {
          kind: CARD_LINE.heading,
          text: run.heading
        },
        ...run.lines
      ]
    });
  }
  return groups;
}
function presentCardDealtLines(detail, translate) {
  const lines = [
    ...presentCardRawLine(detail.damageDealtRaw)
  ];
  const critical = presentCardCriticalText(detail);
  if (critical !== null) {
    lines.push({
      kind: CARD_LINE.stat,
      label: CARD_WORDS.blowsCritical,
      stated: critical,
      isStrong: false,
      caveat: null
    });
    const offhand = detail.procsWhenStriking.filter((cutPart) => cutPart.key === CRITICAL_OF_KEY);
    lines.push(...presentCardPartsMergedByWord(offhand, translate).map((mergedPart) => ({
      kind: CARD_LINE.sub,
      label: mergedPart.label,
      stated: formatUses(mergedPart.figure)
    })));
  }
  lines.push(...presentCardProcLines(detail.procsWhenStriking, CRITICAL_PROC_KEYS, translate));
  lines.push(...presentCardDestroyedLines(detail.statisticsDestroyed));
  return lines;
}
function presentCardRawLine(raw) {
  if (!Number.isFinite(raw)) return [];
  if (raw <= 0) return [];
  return [
    {
      kind: CARD_LINE.stat,
      label: CARD_WORDS.raw,
      stated: formatFigure(raw),
      isStrong: false,
      caveat: CAVEAT.reduction
    }
  ];
}
function presentCardCriticalText(detail) {
  if (detail.blowsCritical <= 0) return null;
  if (detail.blowsStruck <= 0) return null;
  if (detail.blowsCritical > detail.blowsStruck) return formatUses(detail.blowsCritical);
  const share = formatShareRounded(detail.blowsCritical / detail.blowsStruck);
  return `${formatFigure(detail.blowsCritical)} (${share})`;
}
function presentCardPartsMergedByWord(parts, translate) {
  const byLabel = /* @__PURE__ */ new Map();
  for (const cutPart of parts.slice(0, CUT_PARTS_MAXIMUM)) {
    const label = getWordsForBlowKey(cutPart.key, translate);
    if (label.length === 0) continue;
    byLabel.set(label, (byLabel.get(label) ?? 0) + cutPart.figure);
  }
  const folded = [
    ...byLabel
  ].map(([label, figure]) => ({
    label,
    figure
  }));
  folded.sort((leftPart, rightPart) => calculateRankedOrder(leftPart.figure, rightPart.figure, leftPart.label, rightPart.label));
  return folded;
}
function presentCardProcLines(parts, without, translate) {
  const kept = parts.filter((cutPart) => !without.includes(cutPart.key)).filter((cutPart) => lookupLegendaryBonus(cutPart.key) === null);
  const narrowed = presentCardProcSubParts(kept, translate);
  const lines = [];
  for (const mergedPart of presentCardPartsMergedByWord(kept, translate)) {
    lines.push({
      kind: CARD_LINE.stat,
      label: mergedPart.label,
      stated: formatUses(mergedPart.figure),
      isStrong: false,
      caveat: null
    });
    for (const sub of narrowed.get(mergedPart.label) ?? []) {
      lines.push({
        kind: CARD_LINE.sub,
        label: sub.label,
        stated: formatUses(sub.figure)
      });
    }
  }
  return lines;
}
function presentCardProcSubParts(parts, translate) {
  const figureBySubWordByLabel = /* @__PURE__ */ new Map();
  for (const cutPart of parts.slice(0, CUT_PARTS_MAXIMUM)) {
    const words = getSubWordsForBlowKey(cutPart.key);
    if (words.length === 0) continue;
    const label = getWordsForBlowKey(cutPart.key, translate);
    if (label.length === 0) continue;
    const figureBySubWord = figureBySubWordByLabel.get(label) ?? /* @__PURE__ */ new Map();
    figureBySubWord.set(words, (figureBySubWord.get(words) ?? 0) + cutPart.figure);
    figureBySubWordByLabel.set(label, figureBySubWord);
  }
  const folded = /* @__PURE__ */ new Map();
  for (const [label, figureBySubWord] of figureBySubWordByLabel) {
    const run = [
      ...figureBySubWord
    ].map(([words, figure]) => ({
      label: words,
      figure
    }));
    run.sort((leftPart, rightPart) => calculateRankedOrder(leftPart.figure, rightPart.figure, leftPart.label, rightPart.label));
    folded.set(label, run);
  }
  return folded;
}
function presentCardLegendaryLines(parts) {
  const fired = [];
  const held = [];
  for (const cutPart of parts.slice(0, CUT_PARTS_MAXIMUM)) {
    const bonus = lookupLegendaryBonus(cutPart.key);
    if (bonus === null) continue;
    const label = getWordsForLegendaryBonus(cutPart.key);
    if (bonus.showing === LEGENDARY_BONUS_SHOWING.held) held.push(label);
    else {
      fired.push({
        kind: CARD_LINE.stat,
        label,
        stated: formatUses(cutPart.figure),
        isStrong: false,
        caveat: null
      });
    }
  }
  if (fired.length + held.length === 0) return [];
  const lines = [
    {
      kind: CARD_LINE.heading,
      text: CARD_WORDS.legendary
    },
    ...fired
  ];
  if (held.length > 0) {
    lines.push({
      kind: CARD_LINE.note,
      text: `${CARD_WORDS.legendaryHeld} ${held.join(", ")}.`,
      tone: CARD_NOTE_TONE.plain
    });
  }
  return lines;
}
function presentCardReachedLines(parts) {
  if (parts.length === 0) return [];
  const lines = [
    {
      kind: CARD_LINE.heading,
      text: CARD_WORDS.legendaryReached
    }
  ];
  for (const cutPart of parts.slice(0, CUT_PARTS_MAXIMUM)) {
    lines.push({
      kind: CARD_LINE.stat,
      label: getWordsForLegendaryBonus(cutPart.key),
      stated: formatUses(cutPart.figure),
      isStrong: false,
      caveat: null
    });
  }
  return lines;
}
function presentCardDestroyedLines(parts) {
  if (parts.length === 0) return [];
  const lines = [
    {
      kind: CARD_LINE.heading,
      text: CARD_WORDS.destroyed
    }
  ];
  for (const cutPart of parts.slice(0, CUT_PARTS_MAXIMUM)) {
    if (cutPart.figure <= 0) continue;
    lines.push({
      kind: CARD_LINE.sub,
      label: getWordsForDestroyed(cutPart.key),
      stated: formatDestroyed(cutPart.key, cutPart.figure)
    });
  }
  return lines;
}
function presentCardTakenLines(detail, translate) {
  const lines = [
    ...presentCardRawLine(detail.damageTakenRaw)
  ];
  if (detail.damagePrevented > 0) {
    lines.push({
      kind: CARD_LINE.stat,
      label: CARD_WORDS.prevented,
      stated: formatFigure(detail.damagePrevented),
      isStrong: false,
      caveat: CAVEAT.reduction
    });
    lines.push(...presentCardPartsMergedByWord(detail.damagePreventedByDefence, translate).map((mergedPart) => ({
      kind: CARD_LINE.sub,
      label: mergedPart.label,
      stated: formatFigure(mergedPart.figure)
    })));
  }
  lines.push(...presentCardProcLines(detail.procsWhenStruck, [], translate));
  return lines;
}
function presentCardNoteLines(subject, groups) {
  const lines = [
    ...presentCaveatNoteLines(groups)
  ];
  for (const suspicion of formatRowSuspicions(subject.detail, subject.metric)) {
    if (suspicion.length === 0) continue;
    lines.push({
      kind: CARD_LINE.note,
      text: `${SUSPECT_MARK}${suspicion}`,
      tone: CARD_NOTE_TONE.suspect
    });
  }
  if (subject.unnamedNote !== null) {
    lines.push({
      kind: CARD_LINE.note,
      text: subject.unnamedNote,
      tone: CARD_NOTE_TONE.plain
    });
  }
  if (subject.isRowNarrower) {
    lines.push({
      kind: CARD_LINE.note,
      text: CARD_WORDS.scope,
      tone: CARD_NOTE_TONE.plain
    });
  }
  if (subject.doesOpen) {
    lines.push({
      kind: CARD_LINE.note,
      text: CARD_WORDS.gesture,
      tone: CARD_NOTE_TONE.plain
    });
  }
  return lines;
}
function createScrollMemo() {
  const topByName = /* @__PURE__ */ new Map();
  return {
    getTop(name) {
      const kept = topByName.get(name);
      if (kept === void 0) return 0;
      if (!Number.isFinite(kept)) return 0;
      if (kept < 0) return 0;
      return kept;
    },
    // A name nobody can look up again, or a position no region could be put at, is refused
    // rather than kept: what a bad one costs is the place a reader was at (**E12**).
    setTop(name, top) {
      if (name.length === 0) return;
      if (!Number.isFinite(top)) return;
      if (top < 0) return;
      topByName.delete(name);
      topByName.set(name, top);
      if (topByName.size <= LISTS_KEPT_MAXIMUM) return;
      const oldest = topByName.keys().next();
      if (!oldest.done) topByName.delete(oldest.value);
    }
  };
}
function readTopOfList(region) {
  if (!isRegionList(region)) return null;
  const top = region.scrollTop;
  if (!Number.isFinite(top)) return null;
  if (top < 0) return null;
  return top;
}
function isRegionList(region) {
  return region.className.includes(CLASS.list);
}
function renderListRows(region, renderedList) {
  if (!isRegionList(region)) return false;
  if (!isRegionList(renderedList)) return false;
  region.className = renderedList.className;
  region.setAttribute(STYLE_ATTRIBUTE, renderedList.getAttribute(STYLE_ATTRIBUTE) ?? "");
  region.replaceChildren(...Array.from(renderedList.children));
  return true;
}
function writeTopOfList(region, top) {
  if (!Number.isFinite(top)) return;
  if (top < 0) return;
  if (!isRegionList(region)) return;
  region.scrollTop = top;
}

// src/runtime/margometer-runtime.ts
var LOOK_EVERY_MILLISECONDS = 250;
var LOOKS_MAXIMUM = 240;
function initRuntime(ports, options) {
  assert(options.addOnVersion.length > 0, "a runtime names the build it runs");
  const statusBitsCount = options.tables.tooltip.statusBits.length;
  assert(statusBitsCount + ROWS_BESIDE_THE_STATUSES <= ROWS_WRITTEN_MAXIMUM, "every row a fighter can be given fits the block the tooltip writer takes");
  const defects = initDefectLedger({
    console: ports.console
  });
  const storageChoice = recoverSetting(defects, readStorageChoice(ports.settings), STORAGE_DEFAULT);
  const keeper = initShelfKeeper({
    settings: ports.settings,
    initShelfStore: ports.initShelfStore,
    choice: storageChoice,
    tables: options.tables.decoder,
    sessionOptions: options.sessionOptions,
    defects
  });
  const screen = createScreenState(readFoldSetting(ports, defects, PANEL_WINDOW.meter), readFoldSetting(ports, defects, PANEL_WINDOW.helper), recoverSetting(defects, readTypeStep(ports.settings), TYPE_STEP_DEFAULT), {
    meter: readSizeSetting(ports, defects, PANEL_WINDOW.meter),
    helper: readSizeSetting(ports, defects, PANEL_WINDOW.helper)
  });
  const translateLabel = (id, category) => {
    assert(id.length > 0, "a label is asked for by an id the panel named");
    const label = ports.dictionary.readLabel(id, category);
    if (label instanceof Error) return null;
    assert(label.length > 0, "a label the client answered says something");
    return label;
  };
  let state;
  {
    const { live: liveFight, listener } = initLiveFight({
      battle: ports.battle,
      clock: ports.clock,
      place: ports.place,
      hero: ports.hero,
      build: ports.build,
      tables: options.tables.decoder,
      sessionOptions: options.sessionOptions,
      defects,
      keeper,
      // ⚠️ **A row left open would find somebody in the next fight**: a party keeps its ids
      // from one fight to the next, ten of them shared between
      // `captures/2026-08-15-tempest-grupa-vs-hildur-1` and `-2`, read 2026-08-31.
      onFightOpened: () => {
        if (screen.chosenFightOpenedAt !== null) return;
        resetScreenOpened(screen);
      },
      onFightKept: () => resetScreenFightDropped(screen, keeper.getFights()),
      markStale: () => markStale(state)
    });
    let builtState = null;
    const view = initPanelView(ports.document, {
      addOnVersion: options.addOnVersion,
      typeStep: screen.typeStep,
      onIntent: (intent) => onRuntimeIntent(state, intent),
      // Count the failure the view met. One met outside a frame — a gesture dropped, a card
      // that would not draw under a pointer — asks for the frame that says it, or a reader
      // who only hovers never sees the line.
      onFailure: (failure) => {
        if (failure instanceof RegionUndrawn) {
          defects.add({
            kind: DEFECT_KIND.region,
            region: failure.region,
            failure
          });
        } else if (failure instanceof GestureDropped) {
          defects.add({
            kind: DEFECT_KIND.gesture,
            region: null,
            failure
          });
        } else {
          defects.add({
            kind: DEFECT_KIND.mount,
            region: null,
            failure
          });
        }
        if (builtState === null) return;
        markStale(builtState);
      },
      meterPlacement: readPlacementSetting(ports, defects, PANEL_WINDOW.meter, screen),
      helperPlacement: readPlacementSetting(ports, defects, PANEL_WINDOW.helper, screen),
      translate: translateLabel
    });
    assert(keeper.getFights().length <= KEPT_MAXIMUM, "the shelf opened stays inside its bound");
    state = {
      ports,
      options,
      defects,
      keeper,
      screen,
      translate: translateLabel,
      live: liveFight,
      view,
      search: null,
      wrap: null,
      wrapFailuresMarked: 0,
      frame: null,
      isStale: false,
      hasFrameRefused: false,
      isMounted: false,
      isStoodDown: false
    };
    builtState = state;
    state.search = initMargonemEngineSearch({
      battle: ports.battle,
      interval: ports.interval,
      listener,
      report: {
        onAttached: (wrap) => {
          state.wrap = wrap;
          markPanelDue(state);
        },
        onStoodDown: (failure) => {
          state.isStoodDown = true;
          ports.console.writeBrandedLine(failure.name, failure);
        },
        onRefused: (failure) => onMargonemEngineSearchFailed(state, failure),
        onAbandoned: (failure) => onMargonemEngineSearchFailed(state, failure),
        onLookFailed: (failure) => ports.console.writeBrandedLine(failure.name, failure)
      },
      console: ports.console
    });
  }
  return {
    onIntent: (intent) => onRuntimeIntent(state, intent),
    deinit: () => {
      state.search?.stop();
      const cancelled = state.frame?.cancel();
      state.frame = null;
      if (cancelled instanceof Error) {
        ports.console.writeBrandedLine(cancelled.name, cancelled);
      }
      state.isStoodDown = true;
      if (state.search !== null) {
        assert(state.search.isDone(), "a stopped add-on looks no further");
      }
      const wrap = state.wrap;
      state.wrap = null;
      if (wrap === null) return void 0;
      return wrap.detach();
    }
  };
}
function resetScreenOpened(screen) {
  screen.openedCombatantId = null;
  screen.openUnnamedEnd = null;
  screen.pairCombatantId = null;
  screen.openPart = null;
}
function resetScreenFightDropped(screen, fights) {
  assert(fights.length <= KEPT_MAXIMUM, "a shelf looked through is inside its bound");
  const chosenFightOpenedAt = screen.chosenFightOpenedAt;
  if (chosenFightOpenedAt === null) return;
  if (fights.some((keptFight) => keptFight.openedAt === chosenFightOpenedAt)) return;
  screen.chosenFightOpenedAt = null;
  resetScreenOpened(screen);
}
function recoverSetting(defects, storedSetting, fallback) {
  if (!(storedSetting instanceof Error)) return storedSetting;
  defects.add({
    kind: DEFECT_KIND.kept,
    region: null,
    failure: storedSetting
  });
  return fallback;
}
function readFoldSetting(ports, defects, panelWindow) {
  return recoverSetting(defects, readWindowCollapsed(ports.settings, panelWindow), false);
}
function readSizeSetting(ports, defects, panelWindow) {
  const size = recoverSetting(defects, readWindowSize(ports.settings, panelWindow), null);
  if (size !== null) {
    assert(size.width > 0, "a window is put back at a width it can stand at");
    assert(size.height > 0, "and a height");
  }
  return size;
}
function markStale(state) {
  if (state.isStoodDown) return;
  if (state.isStale) return;
  state.isStale = true;
  const requested = state.ports.frames.requestFrame(() => onFrame(state), (failure) => state.defects.add({
    kind: DEFECT_KIND.region,
    region: null,
    failure
  }));
  if (!(requested instanceof Error)) {
    state.frame = requested;
    return;
  }
  if (!state.hasFrameRefused) {
    state.hasFrameRefused = true;
    state.defects.add({
      kind: DEFECT_KIND.region,
      region: null,
      failure: requested
    });
  }
  assert(state.frame === null, "a draw without a frame holds none it asked for");
  onFrame(state);
}
function onFrame(state) {
  assert(state.isStale, "a frame falls only where one was asked for");
  state.isStale = false;
  state.frame = null;
  if (state.isStoodDown) return;
  if (state.wrap !== null) {
    const escaped = state.wrap.getFailureCount();
    assert(escaped >= state.wrapFailuresMarked, "a wrap's count of failures never runs backwards");
    if (escaped > state.wrapFailuresMarked) {
      const failure = state.wrap.getFirstFailure();
      assert(failure !== null, "a wrap that counted a failure kept the first of them");
      state.defects.add({
        kind: DEFECT_KIND.reading,
        region: null,
        failure
      });
      state.wrapFailuresMarked = escaped;
    }
  }
  renderFrame({
    screen: state.screen,
    keeper: state.keeper,
    live: state.live,
    defects: state.defects,
    view: state.view,
    clock: state.ports.clock,
    tooltip: state.ports.tooltip,
    tables: state.options.tables.tooltip,
    translate: state.translate,
    world: state.ports.surroundings.readWorld()
  });
  assert(!state.isStale, "a frame asks for no second frame of its own");
  if (state.isMounted) return;
  const mounted = state.ports.mountPanel(state.view.element);
  if (mounted instanceof Error) {
    state.defects.add({
      kind: DEFECT_KIND.mount,
      region: null,
      failure: mounted
    });
  } else state.isMounted = true;
}
function onRuntimeIntent(state, intent) {
  if (state.isStoodDown) return;
  let shouldDraw;
  switch (intent.kind) {
    case PANEL_INTENT.saveFile: {
      let isTallied = false;
      const saved = attempt(() => {
        const { screen, keeper, live: liveFight, defects } = state;
        const shownFight = lookupShownFight(composeFightView(liveFight.session), screen.chosenFightOpenedAt, keeper.getFights(), keeper.getKeptFightStates());
        isTallied = true;
        if (shownFight !== null) {
          const applied = shownFight.fightState.view.payloadsApplied;
          assert(applied > 0, "a fight handed over was read from something");
        }
        const ports = {
          ...state.ports,
          addOnVersion: state.options.addOnVersion
        };
        const written = writeShownFightFile(shownFight, liveFight, ports, (failure) => {
          addFileDefect(defects, failure);
        });
        if (written instanceof Error) addFileDefect(defects, written);
      });
      if (saved instanceof Error) {
        addFileDefect(state.defects, saved);
        if (!isTallied) writeLiveCallsFallback(state);
      }
      shouldDraw = executeScreenIntent(state.screen, intent);
      break;
    }
    // A store that made room can drop the fight on screen, on a pin as on a move.
    case PANEL_INTENT.pin:
      state.keeper.pin(intent.openedAt);
      resetScreenFightDropped(state.screen, state.keeper.getFights());
      shouldDraw = true;
      break;
    // A row released after a fight ending pushed it off the shelf moves nothing, as a pin on
    // it does: the frame that fight asked for already shows the shelf as it is.
    case PANEL_INTENT.showKept: {
      const openedAt = intent.openedAt;
      if (!state.keeper.getFights().some((keptFight) => keptFight.openedAt === openedAt)) {
        shouldDraw = false;
        break;
      }
      shouldDraw = executeScreenIntent(state.screen, intent);
      break;
    }
    case PANEL_INTENT.storage:
      state.keeper.moveShelf(intent.choice);
      resetScreenFightDropped(state.screen, state.keeper.getFights());
      shouldDraw = true;
      break;
    // Once per drag rather than once per frame, and no frame: the panel already stands
    // there. A refusal is an answer: the reader's choice stands, and only the next visit
    // is the poorer for it, as `develop` has it.
    case PANEL_INTENT.move:
      void writeWindowPosition(state.ports.settings, intent.window, intent.position);
      shouldDraw = false;
      break;
    // Once per release, as a move is, and for the same reason no frame, but where the
    // options stand open: they say which window is sized, and would otherwise say it wrong.
    case PANEL_INTENT.resize: {
      const hasMoved = executeScreenIntent(state.screen, intent);
      void writeWindowSize(state.ports.settings, intent.window, intent.size);
      assert(state.screen.windowSizes[intent.window] === intent.size, "a window sized is the size the frames to come draw it");
      shouldDraw = hasMoved;
      break;
    }
    case PANEL_INTENT.resetSize: {
      const hasMoved = executeScreenIntent(state.screen, intent);
      if (hasMoved) void deleteWindowSize(state.ports.settings, intent.window);
      shouldDraw = hasMoved;
      break;
    }
    case PANEL_INTENT.typeStep: {
      const hasMoved = executeScreenIntent(state.screen, intent);
      if (hasMoved) void writeTypeStep(state.ports.settings, state.screen.typeStep);
      shouldDraw = hasMoved;
      break;
    }
    case PANEL_INTENT.fold: {
      const hasMoved = executeScreenIntent(state.screen, intent);
      const isCollapsed = intent.window === PANEL_WINDOW.meter ? state.screen.isMeterCollapsed : state.screen.isHelperCollapsed;
      void writeWindowCollapsed(state.ports.settings, intent.window, isCollapsed);
      assert(hasMoved, "a fold always moves the window it names");
      shouldDraw = hasMoved;
      break;
    }
    default:
      shouldDraw = executeScreenIntent(state.screen, intent);
      break;
  }
  if (shouldDraw) markStale(state);
}
function writeLiveCallsFallback(state) {
  const { screen, live: liveFight, defects } = state;
  if (screen.chosenFightOpenedAt !== null) return;
  if (liveFight.capture.calls.length === 0) return;
  const ports = {
    ...state.ports,
    addOnVersion: state.options.addOnVersion
  };
  const written = attempt(() => writeLiveCallsFile(liveFight, ports, (failure) => {
    addFileDefect(defects, failure);
  }));
  if (written instanceof Error) addFileDefect(defects, written);
}
function addFileDefect(defects, failure) {
  defects.add({
    kind: DEFECT_KIND.file,
    region: null,
    failure
  });
}
function readPlacementSetting(ports, defects, panelWindow, screen) {
  const position = recoverSetting(defects, readWindowPosition(ports.settings, panelWindow), null);
  if (position !== null) {
    assert(Number.isSafeInteger(position.left), "a window is put back at a whole column");
    assert(Number.isSafeInteger(position.top), "and a whole row");
  }
  return {
    position,
    size: screen.windowSizes[panelWindow],
    readViewport: ports.readViewport
  };
}
function markPanelDue(state) {
  assert(!state.isStoodDown, "a copy that stood down puts no panel up");
  markStale(state);
}
function onMargonemEngineSearchFailed(state, failure) {
  assert(!(failure instanceof MargonemEngineAlreadyWrapped), "a copy that stands down shows nothing");
  assert(state.wrap === null, "and one holding the game is not looking for it");
  state.defects.add({
    kind: DEFECT_KIND.engine,
    region: null,
    failure
  });
  markPanelDue(state);
}
function initMargonemEngineSearch(options) {
  const { battle: battlePort, interval, listener, report } = options;
  const search = {
    looks: 0,
    isDone: false,
    hasFailed: false,
    hasReportFailed: false,
    handle: null,
    console: options.console
  };
  const onLookFailure = (failure) => {
    executeLookFailed(search, report, failure);
  };
  const firstLook = attempt(() => executeSearchLook(search, battlePort, listener, report));
  if (firstLook instanceof Error) onLookFailure(firstLook);
  if (!search.isDone) {
    const started = interval.every(() => executeSearchLook(search, battlePort, listener, report), LOOK_EVERY_MILLISECONDS, onLookFailure);
    if (started instanceof Error) {
      deinitSearchTimer(search);
      const abandoned = new SearchAbandoned(search.looks, LOOKS_MAXIMUM, started);
      executeSearchReport(search, () => report.onAbandoned(abandoned));
    } else search.handle = started;
  }
  return {
    stop: () => deinitSearchTimer(search),
    isDone: () => search.isDone
  };
}
function executeLookFailed(search, report, failure) {
  if (!search.hasFailed) {
    search.hasFailed = true;
    executeSearchReport(search, () => report.onLookFailed(failure));
  }
  executeSearchBound(search, report);
}
function executeSearchReport(search, reportCall) {
  const reported = attempt(reportCall);
  if (!(reported instanceof Error)) return;
  if (search.hasReportFailed) return;
  search.hasReportFailed = true;
  search.console.writeBrandedLine(reported.name, reported);
}
function executeSearchBound(search, report) {
  if (search.looks < LOOKS_MAXIMUM) return;
  if (search.isDone) return;
  deinitSearchTimer(search);
  const abandoned = new SearchAbandoned(search.looks, LOOKS_MAXIMUM, null);
  executeSearchReport(search, () => report.onAbandoned(abandoned));
}
function deinitSearchTimer(search) {
  search.isDone = true;
  const handle = search.handle;
  search.handle = null;
  if (handle === null) return;
  const cancelled = handle.cancel();
  if (cancelled instanceof Error) search.console.writeBrandedLine(cancelled.name, cancelled);
}
function executeSearchLook(search, battlePort, listener, report) {
  if (search.isDone) return;
  search.looks += 1;
  assert(search.looks <= LOOKS_MAXIMUM, "the search stays inside its stated bound");
  const battle = battlePort.readBattle();
  if (battle instanceof Error) {
    if (battle instanceof Caught) executeLookFailed(search, report, battle);
    else executeSearchBound(search, report);
    return;
  }
  const wrapped = battle.wrap(listener);
  if (!(wrapped instanceof Error)) {
    deinitSearchTimer(search);
    executeSearchReport(search, () => report.onAttached(wrapped));
    return;
  }
  if (wrapped instanceof MargonemEngineAlreadyWrapped) {
    deinitSearchTimer(search);
    executeSearchReport(search, () => report.onStoodDown(wrapped));
    return;
  }
  if (search.looks < LOOKS_MAXIMUM) return;
  deinitSearchTimer(search);
  executeSearchReport(search, () => report.onRefused(wrapped));
}
function executeScreenIntent(screen, intent) {
  let hasMoved;
  {
    switch (intent.kind) {
      case PANEL_INTENT.metric:
        {
          const metric = intent.metric;
          screen.metric = metric;
          screen.isOnShelf = false;
          screen.isOnOptions = false;
          screen.pairCombatantId = null;
          screen.openPart = null;
          screen.openUnnamedEnd = null;
          hasMoved = true;
        }
        break;
      case PANEL_INTENT.side:
        {
          const side = intent.side;
          screen.side = side;
          screen.isOnShelf = false;
          screen.isOnOptions = false;
          resetScreenOpened(screen);
          hasMoved = true;
        }
        break;
      case PANEL_INTENT.openRow:
        {
          const combatantId = intent.combatantId;
          assert(Number.isSafeInteger(combatantId), "a row is opened by the game's own id");
          if (screen.openedCombatantId !== null) {
            assert(screen.openUnnamedEnd === null, "a person's end left out is not a pair with somebody");
            screen.pairCombatantId = combatantId;
          } else if (screen.openUnnamedEnd !== null) {
            screen.pairCombatantId = combatantId;
          } else screen.openedCombatantId = combatantId;
          hasMoved = true;
        }
        break;
      case PANEL_INTENT.openUnnamed:
        {
          const end = intent.end;
          assert(screen.pairCombatantId === null, "an end left out is pressed from the level over it");
          assert(screen.openPart === null, "and never from a part's level");
          screen.openUnnamedEnd = end;
          hasMoved = true;
        }
        break;
      case PANEL_INTENT.openPart:
        screen.openPart = intent.part;
        hasMoved = true;
        break;
      // One rung at a time. False where there was none to leave: the gesture is the whole
      // panel's, so a press on the ranking would otherwise redraw it for nothing.
      case PANEL_INTENT.close:
        if (screen.isOnOptions) {
          screen.isOnOptions = false;
          hasMoved = true;
          break;
        }
        if (screen.isOnShelf) {
          screen.isOnShelf = false;
          hasMoved = true;
          break;
        }
        if (screen.openPart !== null) {
          screen.openPart = null;
          hasMoved = true;
          break;
        }
        if (screen.pairCombatantId !== null) {
          screen.pairCombatantId = null;
          hasMoved = true;
          break;
        }
        if (screen.openedCombatantId !== null) {
          if (screen.openUnnamedEnd !== null) screen.openUnnamedEnd = null;
          else screen.openedCombatantId = null;
          hasMoved = true;
          break;
        }
        if (screen.openUnnamedEnd === null) {
          hasMoved = false;
          break;
        }
        screen.openUnnamedEnd = null;
        hasMoved = true;
        break;
      case PANEL_INTENT.fold:
        if (intent.window === PANEL_WINDOW.meter) {
          screen.isMeterCollapsed = !screen.isMeterCollapsed;
        } else screen.isHelperCollapsed = !screen.isHelperCollapsed;
        hasMoved = true;
        break;
      case PANEL_INTENT.shelf:
        screen.isOnShelf = !screen.isOnShelf;
        screen.isOnOptions = false;
        hasMoved = true;
        break;
      case PANEL_INTENT.options:
        screen.isOnOptions = !screen.isOnOptions;
        screen.isOnShelf = false;
        hasMoved = true;
        break;
      case PANEL_INTENT.showKept:
        setScreenFight(screen, intent.openedAt);
        hasMoved = true;
        break;
      case PANEL_INTENT.showLive:
        setScreenFight(screen, null);
        hasMoved = true;
        break;
      // A save moves nothing, and asks for a frame all the same: the defect it can leave is
      // said on the panel, and the shelf between fights has no payload coming to draw it.
      case PANEL_INTENT.saveFile:
        hasMoved = true;
        break;
      // The same size asked for again moves nothing, and a frame for it would redraw nothing.
      case PANEL_INTENT.typeStep:
        if (screen.typeStep === intent.step) {
          hasMoved = false;
          break;
        }
        screen.typeStep = intent.step;
        hasMoved = true;
        break;
      // Kept for the frames to come, and no frame now unless the options stand open: the
      // window already stands that size, and the options are the one place that says which is
      // sized.
      case PANEL_INTENT.resize:
        screen.windowSizes = {
          ...screen.windowSizes,
          [intent.window]: intent.size
        };
        hasMoved = screen.isOnOptions;
        break;
      case PANEL_INTENT.resetSize:
        if (screen.windowSizes[intent.window] === null) {
          hasMoved = false;
          break;
        }
        screen.windowSizes = {
          ...screen.windowSizes,
          [intent.window]: null
        };
        hasMoved = true;
        break;
      case PANEL_INTENT.move:
      case PANEL_INTENT.storage:
      case PANEL_INTENT.pin:
        hasMoved = false;
        break;
    }
  }
  verifyScreenState(screen);
  return hasMoved;
}
function verifyScreenState(screen) {
  if (screen.isOnOptions) assert(!screen.isOnShelf, "the options and the shelf are one cover");
  if (screen.openedCombatantId === null) return;
  if (screen.openUnnamedEnd === null) return;
  assert(screen.pairCombatantId === null, "a person's end left out is not a pair with somebody");
  assert(screen.openPart === null, "and no part of their figure is open under it");
}
function setScreenFight(screen, openedAt) {
  if (openedAt !== null) assert(Number.isSafeInteger(openedAt), "a fight is chosen by a moment");
  screen.chosenFightOpenedAt = openedAt;
  screen.isOnShelf = false;
  screen.isOnOptions = false;
  resetScreenOpened(screen);
}

// src/build-version.ts
var BUILD_VERSION = "0.24.0";

// src/userscript-entry.ts
var BROWSER_WINDOW_PART = {
  window: "window",
  document: "document",
  console: "console",
  timers: "timers",
  frames: "frames",
  clock: "clock",
  downloads: "downloads"
};
var BrowserWindowUnusable = class extends Error {
  name = "BrowserWindowUnusable";
  missing;
  constructor(missing) {
    super();
    this.missing = missing;
  }
};
var WINDOW_FUNCTIONS = [
  [
    "setInterval",
    BROWSER_WINDOW_PART.timers
  ],
  [
    "clearInterval",
    BROWSER_WINDOW_PART.timers
  ],
  [
    "setTimeout",
    BROWSER_WINDOW_PART.timers
  ],
  [
    "requestAnimationFrame",
    BROWSER_WINDOW_PART.frames
  ],
  [
    "cancelAnimationFrame",
    BROWSER_WINDOW_PART.frames
  ],
  [
    "Date",
    BROWSER_WINDOW_PART.clock
  ],
  [
    "Blob",
    BROWSER_WINDOW_PART.downloads
  ],
  [
    "URL",
    BROWSER_WINDOW_PART.downloads
  ]
];
var SCRIPT_WITH_SOURCE = "script[src]";
var ANCHOR_TAG = "a";
function startMargoMeter(browserWindow) {
  const started = attempt(() => {
    const ports = attempt(() => readRuntimePorts(browserWindow));
    if (ports instanceof Error) {
      writeStoodDownLine(browserWindow, ports);
      return null;
    }
    return initRuntime(ports, {
      addOnVersion: BUILD_VERSION,
      tables: composeRuntimeTables(),
      sessionOptions: SESSION_OPTIONS
    });
  });
  if (!(started instanceof Error)) return started;
  writeStoodDownLine(browserWindow, started);
  return null;
}
function writeStoodDownLine(browserWindow, failure) {
  const errorConsole = attempt(() => {
    if (!isRecord(browserWindow)) return null;
    const browserConsole = browserWindow.console;
    if (!isRecord(browserConsole)) return null;
    const error = browserConsole.error;
    if (typeof error !== "function") return null;
    return {
      error: (...values) => void error.apply(browserConsole, values)
    };
  });
  if (errorConsole instanceof Error) return;
  if (errorConsole === null) return;
  initBrowserConsole(errorConsole).writeBrandedLine(failure.name, failure);
}
function readRuntimePorts(browserWindow) {
  if (!isRecord(browserWindow)) return new BrowserWindowUnusable(BROWSER_WINDOW_PART.window);
  if (!isUserscriptWindow(browserWindow)) {
    return new BrowserWindowUnusable(lookupWindowPartMissing(browserWindow) ?? BROWSER_WINDOW_PART.window);
  }
  return {
    clock: initBrowserClock(browserWindow.Date),
    frames: initBrowserFrames(browserWindow),
    interval: initBrowserInterval(browserWindow),
    battle: initMargonemEngineBattle(browserWindow),
    place: initMargonemEnginePlace(browserWindow),
    hero: initMargonemEngineHero(browserWindow),
    dictionary: initMargonemClientDictionary(browserWindow),
    // Read every script's source the page states, up to the bound the build's reader walks.
    build: initMargonemClientBuild(() => {
      const scripts = browserWindow.document.querySelectorAll(SCRIPT_WITH_SOURCE);
      const walked = Math.min(scripts.length, SCRIPTS_MAXIMUM);
      const sources = [];
      for (let scriptIndex = 0; scriptIndex < walked; scriptIndex += 1) {
        sources.push(scripts[scriptIndex]?.src);
      }
      return sources;
    }),
    surroundings: initBrowserSurroundings(browserWindow),
    tooltip: initMargonemEngineTooltip(browserWindow),
    settings: initBrowserStore(readBrowserStorage(browserWindow, STORAGE_CHOICE.local)),
    // The store the reader asked for, the one that forgets, or the answer that the browser
    // lends none under that name, which the keeper turns into a defect.
    initShelfStore: (storageChoice) => {
      if (storageChoice === STORAGE_CHOICE.memory) return initMemoryStore();
      const storage = readBrowserStorage(browserWindow, storageChoice);
      if (storage === null) return new StoreUnavailable();
      return initBrowserStore(storage);
    },
    file: initBrowserFile({
      createObjectURL: (blob) => browserWindow.URL.createObjectURL(blob),
      revokeObjectURL: (url) => browserWindow.URL.revokeObjectURL(url),
      createBlob: (text, type) => new browserWindow.Blob([
        text
      ], {
        type
      }),
      createAnchor: () => browserWindow.document.createElement(ANCHOR_TAG),
      appendAnchor: (anchor) => browserWindow.document.body.append(anchor),
      setTimeout: (step, afterMilliseconds) => void browserWindow.setTimeout(step, afterMilliseconds)
    }),
    console: initBrowserConsole(browserWindow.console),
    document: browserWindow.document,
    mountPanel: (panel) => attempt(() => browserWindow.document.body.append(panel)),
    // Read the viewport: a page stating one size and not the other states none, as does one
    // stating nonsense.
    readViewport: () => {
      const width = browserWindow.innerWidth;
      const height = browserWindow.innerHeight;
      if (typeof width !== "number") return null;
      if (typeof height !== "number") return null;
      if (!Number.isFinite(width)) return null;
      if (!Number.isFinite(height)) return null;
      if (width < 0) return null;
      if (height < 0) return null;
      return {
        width,
        height
      };
    }
  };
}
function isUserscriptWindow(browserWindow) {
  return lookupWindowPartMissing(browserWindow) === null;
}
function lookupWindowPartMissing(browserWindow) {
  if (!isUserscriptDocument(browserWindow.document)) return BROWSER_WINDOW_PART.document;
  if (!isCallableOn(browserWindow.console, "error")) return BROWSER_WINDOW_PART.console;
  for (const [member, windowPart] of WINDOW_FUNCTIONS) {
    if (typeof browserWindow[member] !== "function") return windowPart;
  }
  return null;
}
function isUserscriptDocument(documentCandidate) {
  if (!isRecord(documentCandidate)) return false;
  if (typeof documentCandidate.createElement !== "function") return false;
  if (typeof documentCandidate.querySelectorAll !== "function") return false;
  return isCallableOn(documentCandidate.body, "append");
}
function isCallableOn(owner, name) {
  if (!isRecord(owner)) return false;
  return typeof owner[name] === "function";
}
function readBrowserStorage(browserWindow, storageChoice) {
  const storage = attempt(() => {
    if (storageChoice === STORAGE_CHOICE.session) return browserWindow.sessionStorage;
    return browserWindow.localStorage;
  });
  if (storage instanceof Error) return null;
  return storage ?? null;
}
function composeRuntimeTables() {
  return {
    decoder: {
      blowsGrantedBySkillId: indexBlowsGrantedBySkillId(FROZEN_BLOWS_GRANTED.skills)
    },
    tooltip: {
      statedSkills: {
        auraTurnsBySkillId: indexAuraTurnsBySkillId(FROZEN_AURA_TURNS.skills),
        shoutsBySkillId: indexShoutsBySkillId(FROZEN_AURA_TURNS.shouts)
      },
      keyByStatusBit: indexKeyByStatusBit(FROZEN_STATUS_BITS.bits),
      statusBits: FROZEN_STATUS_BITS.bits
    }
  };
}

// src/userscript-boot.ts
  const METER_ENABLE_KEY = 'mkMargoMeterEnabled'
  const WAITER_ID = 'mk-battle-meter-waiter'
  let bundledMargoMeter = null
  let bundledMargoMeterStartedAt = 0
  let bundledMargoMeterTimer = null
  const meterEnabled = () => { try { return localStorage.getItem(METER_ENABLE_KEY) !== '0' } catch (error) { return true } }
  function findActiveBattle() {
    for (const askEngine of ENGINE_ASKERS) {
      try {
        const engine = askEngine(window)
        if (engine && engine.battle && typeof engine.battle.updateData === 'function') return engine.battle
      } catch (error) {}
    }
    return null
  }
  function showMeterWaiter(text) {
    if (!document.body || document.getElementById(HOST_NAME)) return
    let waiter = document.getElementById(WAITER_ID)
    if (!waiter) {
      waiter = document.createElement('div')
      waiter.id = WAITER_ID
      waiter.style.cssText = 'position:fixed;right:18px;bottom:82px;z-index:2147483000;max-width:min(340px,calc(100vw - 24px));padding:12px 16px;border:1px solid rgba(129,140,248,.52);border-radius:10px;background:linear-gradient(155deg,#20223e,#0b1020);box-shadow:0 12px 32px rgba(0,0,0,.55);color:#f3f3ff;font:13px/1.45 Inter,Segoe UI,Arial,sans-serif;pointer-events:none'
      document.body.appendChild(waiter)
    }
    waiter.textContent = 'LICZNIK WALK · ' + text
  }
  function hideMeterWaiter() { document.getElementById(WAITER_ID)?.remove() }
  function startBundledMargoMeter() {
    if (bundledMargoMeter) return true
    bundledMargoMeter = startMargoMeter(window)
    if (bundledMargoMeter) { bundledMargoMeterStartedAt = Date.now(); showMeterWaiter('Podłączono. Wczytuję statystyki walki…'); return true }
    showMeterWaiter('Nie udało się uruchomić dekodera; ponawiam próbę…')
    return false
  }
  function ensureMeterPolling() {
    if (bundledMargoMeterTimer || !meterEnabled()) return
    showMeterWaiter('Uruchamiam dekoder walki…')
    startBundledMargoMeter()
    bundledMargoMeterTimer = setInterval(() => {
      if (!meterEnabled()) return
      const host = document.getElementById(HOST_NAME)
      if (host) { hideMeterWaiter(); host.style.setProperty('z-index','2147483000','important'); return }
      if (bundledMargoMeter && Date.now() - bundledMargoMeterStartedAt < 65000) { showMeterWaiter('Podłączam się do walki…'); return }
      if (bundledMargoMeter) {
        try { bundledMargoMeter.deinit() } catch (error) { console.warn('[Licznik Walk] Nie udało się odświeżyć połączenia:', error) }
        bundledMargoMeter = null
      }
      startBundledMargoMeter()
    }, 1000)
  }
  function stopBundledMargoMeter() {
    if (bundledMargoMeter) { try { bundledMargoMeter.deinit() } catch (error) { console.warn('[Licznik Walk] Nie udało się zatrzymać modułu:', error) }; bundledMargoMeter = null }
    if (bundledMargoMeterTimer) { clearInterval(bundledMargoMeterTimer); bundledMargoMeterTimer = null }
    document.getElementById(HOST_NAME)?.remove(); hideMeterWaiter()
  }
  function setBundledMargoMeterEnabled(enabled) {
    try { localStorage.setItem(METER_ENABLE_KEY, enabled ? '1' : '0') } catch (error) {}
    if (enabled) ensureMeterPolling(); else stopBundledMargoMeter()
    window.__mkPersistAddonSettings?.()
    return enabled
  }
  window.__mkBattleMeterSetEnabled = setBundledMargoMeterEnabled
  window.__mkBattleMeterIsRunning = () => !!document.getElementById(HOST_NAME)
  window.__mkBattleMeterShow = () => {
    if (!meterEnabled()) return false
    ensureMeterPolling()
    const host = document.getElementById(HOST_NAME)
    if (host) {
      host.style.setProperty('display', 'block', 'important')
      host.style.setProperty('z-index', '2147483000', 'important')
      host.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } else showMeterWaiter('Gotowy — czeka na rozpoczęcie walki.')
    return true
  }
  window.addEventListener('mk-battle-meter-toggle', event => setBundledMargoMeterEnabled(event.detail?.enabled !== false))
  if (meterEnabled()) ensureMeterPolling()

})();








