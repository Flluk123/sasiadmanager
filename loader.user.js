// ==UserScript==
// @name         Sąsiad Manager — auto update
// @namespace    https://github.com/Fluk123/sasiadmanager
// @version      1.0.0
// @description  Loader aktualizowanego dodatku Sąsiad Manager.
// @match        https://margonem.com/*
// @match        https://*.margonem.com/*
// @match        https://steamrealm.margonem.com/*
// @updateURL    https://raw.githubusercontent.com/Fluk123/sasiadmanager/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/Fluk123/sasiadmanager/main/loader.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
    const script = document.createElement('script')
    script.src = 'https://fluk123.github.io/sasiadmanager/addon-bundle.js?v=' + Date.now()
    script.async = true
    ;(document.head || document.documentElement).appendChild(script)
})()
