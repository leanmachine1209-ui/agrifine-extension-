var E=Object.defineProperty;var A=(e,t,n)=>t in e?E(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var h=(e,t,n)=>A(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();const u={grain:{suit:"grain",emoji:"🌾",label:"Grain",family:"gold",color:"grain"},orchard:{suit:"orchard",emoji:"🍎",label:"Orchard",family:"gold",color:"orchard"},livestock:{suit:"livestock",emoji:"🐄",label:"Cattle",family:"rust",color:"livestock"},equipment:{suit:"equipment",emoji:"🚜",label:"Tractors",family:"rust",color:"equipment"}},c=["grain","orchard","livestock","equipment"],C=1,a=14,k=1;function v(e){return u[e].family}function H(e){return e.rank===k}function g(e){return e===1?"F":e===11?"J":e===12?"Q":e===13?"K":e===14?"★":String(e)}function F(e){const t=u[e.suit];return e.rank===k?`${t.label} Field`:e.rank===a?`${t.label} Harvest`:`${t.label} ${g(e.rank)}`}function P(){const e=[];for(const t of c)for(let n=C;n<=a;n++)e.push({id:`${t}-${n}`,suit:t,rank:n,faceUp:!1});return e}function R(e){let t=e>>>0;return function(){t|=0,t=t+1831565813|0;let n=Math.imul(t^t>>>15,1|t);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}function _(e,t=Math.random){for(let n=e.length-1;n>0;n--){const s=Math.floor(t()*(n+1));[e[n],e[s]]=[e[s],e[n]]}return e}const x=7,q=10,D=100;function K(){return{grain:[],orchard:[],livestock:[],equipment:[]}}function G(e){const t=Array.from({length:x},()=>[]);for(let s=0;s<x;s++)for(let i=0;i<=s;i++){const r=e.pop();r.faceUp=i===s,t[s].push(r)}const n=e.splice(0,e.length);return n.forEach(s=>{s.faceUp=!1}),{stock:n,waste:[],fields:K(),holding:t,moves:0,score:0,recycled:0}}function L(e){const t=e===void 0?Math.random:R(e);return G(_(P(),t))}function $(e,t){const n=e.waste.findIndex(s=>s.id===t);if(n!==-1)return{ref:{type:"waste"},index:n};for(const s of c){const i=e.fields[s].findIndex(r=>r.id===t);if(i!==-1)return{ref:{type:"field",suit:s},index:i}}for(let s=0;s<e.holding.length;s++){const i=e.holding[s].findIndex(r=>r.id===t);if(i!==-1)return{ref:{type:"hold",index:s},index:i}}return null}function b(e,t){switch(t.type){case"stock":return e.stock;case"waste":return e.waste;case"field":return e.fields[t.suit];case"hold":return e.holding[t.index]}}function d(e){return e[e.length-1]}function S(e,t){if(t.length===0)return e.rank===k;const n=d(t);return!!(n&&n.suit===e.suit&&e.rank===n.rank+1)}function O(e,t){return t?v(e.suit)!==v(t.suit)&&e.rank===t.rank-1:e.rank===a}function B(e){if(e.length===0||e.some(t=>!t.faceUp))return!1;for(let t=1;t<e.length;t++){const n=e[t-1],s=e[t];if(v(n.suit)===v(s.suit)||s.rank!==n.rank-1)return!1}return!0}function W(e,t){return e.type!==t.type?!1:e.type==="hold"&&t.type==="hold"?e.index===t.index:e.type==="field"&&t.type==="field"?e.suit===t.suit:!0}function z(e,t){if(t.type!=="hold")return;const n=d(e.holding[t.index]);n&&!n.faceUp&&(n.faceUp=!0)}function T(e,t){const n=$(e,t);if(!n)return null;const{ref:s,index:i}=n;if(s.type==="stock")return null;const r=b(e,s);if(s.type==="hold"){const o=r.slice(i);return B(o)?o:null}return i!==r.length-1?null:r[i].faceUp?[r[i]]:null}function J(e,t){const n=T(e,t);if(!n)return[];const s=[];n.length===1&&S(n[0],e.fields[n[0].suit])&&s.push({type:"field",suit:n[0].suit});for(let i=0;i<e.holding.length;i++)O(n[0],d(e.holding[i]))&&s.push({type:"hold",index:i});return s}function Q(e,t,n){return n.type==="stock"||n.type==="waste"?!1:n.type==="field"?t.length===1&&n.suit===t[0].suit&&S(t[0],e.fields[n.suit]):O(t[0],d(e.holding[n.index]))}function U(e,t,n){const s=$(e,t);if(!s||W(s.ref,n))return!1;const i=T(e,t);return!i||!Q(e,i,n)?!1:(b(e,s.ref).splice(s.index,i.length),b(e,n).push(...i),z(e,s.ref),n.type==="field"&&(e.score+=q,e.fields[n.suit].length===a&&(e.score+=D)),e.moves++,!0)}function m(e,t){const n=$(e,t);if(!n)return!1;const i=b(e,n.ref)[n.index];return i?U(e,t,{type:"field",suit:i.suit}):!1}function V(e){if(e.stock.length>0){const t=e.stock.pop();return t.faceUp=!0,e.waste.push(t),e.moves++,!0}if(e.waste.length>0){for(;e.waste.length>0;){const t=e.waste.pop();t.faceUp=!1,e.stock.push(t)}return e.recycled++,e.moves++,!0}return!1}function X(e){let t=0,n=!0;for(;n;){n=!1;const s=[],i=d(e.waste);i&&s.push(i.id);for(const r of e.holding){const o=d(r);o!=null&&o.faceUp&&s.push(o.id)}for(const r of s)m(e,r)&&(t++,n=!0)}return t}function N(e){return c.every(t=>e.fields[t].length===a)}function Y(e){return c.reduce((n,s)=>n+e.fields[s].length,0)/(c.length*a)}function Z(e){return c.filter(t=>e.fields[t].length===a).length}function w(e){return e.type==="field"?`field:${e.suit}`:e.type==="hold"?`hold:${e.index}`:e.type}function j(e){return e.type==="field"?`data-dest="field" data-suit="${e.suit}"`:e.type==="hold"?`data-dest="hold" data-col="${e.index}"`:`data-dest="${e.type}"`}function I(e,t){const n=u[e.suit];if(!e.faceUp)return'<div class="card card--back" aria-hidden="true"></div>';const s=t.selected?" is-selected":"",i=H(e)?" card--plot":"",r=t.action??"select",o=t.buried?" card--buried":"";return r==="noop"?`
    <div class="card card--${n.color}${i}${o}" aria-label="${F(e)}">
      <span class="card-suit">${n.emoji}</span>
      <span class="card-rank">${g(e.rank)}</span>
    </div>`:`
    <button type="button" class="card card--${n.color}${i}${s}${o}"
      data-action="${r}" data-id="${e.id}" aria-label="${F(e)}">
      <span class="card-suit">${n.emoji}</span>
      <span class="card-rank">${g(e.rank)}</span>
    </button>`}function ee(e,t,n){const s=e.fields[t],i=u[t],r=d(s),o=w({type:"field",suit:t}),f=n.has(o)?" is-valid":"",p=s.length===a?" is-done":"",l=r?I(r,{action:"noop"}):`<div class="slot-empty">${i.emoji}<small>Field</small></div>`;return`
    <article class="field-slot field-slot--${i.color}${f}${p}" ${j({type:"field",suit:t})} data-action="drop">
      <header class="slot-head">${i.emoji} ${i.label} <b>${s.length}/${a}</b></header>
      ${l}
    </article>`}function te(e,t,n,s){const i=e.holding[t],r=w({type:"hold",index:t}),o=s.has(r)?" is-valid":"",f=i.length===0?" is-empty":" has-cards",p=i.length?i.map((l,y)=>I(l,{selected:l.id===n,buried:y<i.length-1})).join(""):'<div class="slot-empty slot-empty--hold"><small>Hold</small></div>';return`
    <article class="hold-col${o}${f}" ${j({type:"hold",index:t})} data-action="drop">
      <div class="hold-stack">${p}</div>
    </article>`}function ne(e){const t=e.state,n=new Set(e.selectedId?J(t,e.selectedId).map(w):[]),s=d(t.waste),i=Math.round(Y(t)*100),r=Z(t),o=t.stock.length>0?`<button type="button" class="card card--back card--stock" data-action="draw" aria-label="Draw from stock, ${t.stock.length} left"></button>`:t.waste.length>0?'<button type="button" class="slot-empty slot-empty--recycle" data-action="draw" aria-label="Recycle waste into stock">♻️</button>':'<div class="slot-empty">—</div>',f=s?I(s,{selected:s.id===e.selectedId}):'<div class="slot-empty"><small>Waste</small></div>',p=e.selectedId?n.size?"Tap a glowing Field or holding pile to play the card.":"That card has nowhere to go — pick another, or draw.":"Tap a face-up card, then a Field (start with F) or a holding pile.";return`
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${t.score}</b></div>
        <div class="stat"><span>🃏</span><b>${t.moves}</b></div>
        <div class="stat"><span>📐</span><b>${r}/4</b></div>
      </div>
    </header>

    <section class="stock-row" aria-label="Stock and waste">
      <div class="stock-box">
        <div class="bank-label">Stock · ${t.stock.length}</div>
        ${o}
      </div>
      <div class="stock-box">
        <div class="bank-label">Waste · ${t.waste.length}</div>
        ${f}
      </div>
      <div class="stock-box stock-box--progress">
        <div class="bank-label">Fields set</div>
        <div class="bank-value">${i}%</div>
        <p class="season-copy">Play a <b>F</b> Field to open a plot, then stack that 14-card suit in order.</p>
      </div>
    </section>

    <section class="fields-row" aria-label="Fields">
      ${c.map(l=>ee(t,l,n)).join("")}
    </section>

    <p class="upkeep">${p}</p>

    <section class="holding-wrap" aria-label="Holding set">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="holding">
        ${t.holding.map((l,y)=>te(t,y,e.selectedId,n)).join("")}
      </div>
    </section>

    <footer class="controls">
      <div class="legend-row">
        ${c.map(l=>`<span class="legend"><i>${u[l].emoji}</i>${u[l].label}</span>`).join("")}
        <span class="legend">F = Field · ★ = Harvest</span>
      </div>
      <div class="hand-actions">
        <button class="btn" data-action="auto" type="button">🌾 Auto-set Fields</button>
        <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
      </div>
    </footer>
  </div>`}function se(e){return N(e)?`
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">🌾🐄🏆</div>
      <h2>All four fields harvested!</h2>
      <p>You stacked every 14-card suit on its Field.</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${e.score}</b></div>
        <div><span>🃏 Moves</span><b>${e.moves}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`:""}function ie(e){const t=e.dataset.dest;return t==="field"&&e.dataset.suit?{type:"field",suit:e.dataset.suit}:t==="hold"&&e.dataset.col!==void 0?{type:"hold",index:Number(e.dataset.col)}:null}class re{constructor(t,n){h(this,"root");h(this,"state");h(this,"seed");h(this,"selectedId",null);this.root=t;const s=new URLSearchParams(location.search).get("seed"),i=s!==null&&s.trim()!==""&&Number.isFinite(Number(s))?Number(s):void 0;this.seed=n??i,this.state=L(this.seed),this.bindEvents(),this.render()}restart(){this.state=L(this.seed),this.selectedId=null,this.render()}bindEvents(){this.root.addEventListener("click",t=>{const s=t.target.closest("[data-action]");if(!s)return;const i=s.dataset.action,r=s.dataset.id;switch(i){case"select":if(!r)break;if(this.selectedId===r){m(this.state,r),this.selectedId=null;break}if(this.selectedId&&m(this.state,this.selectedId)){this.selectedId=null;break}this.selectedId=r;break;case"drop":{const o=ie(s);o&&this.selectedId&&U(this.state,this.selectedId,o)&&(this.selectedId=null);break}case"draw":V(this.state),this.selectedId=null;break;case"auto":X(this.state),this.selectedId=null;break;case"new":this.restart();return}this.render()})}render(){const t={state:this.state,selectedId:this.selectedId};let n=ne(t);N(this.state)&&(n+=se(this.state)),this.root.innerHTML=n}}const M=document.getElementById("app");M&&new re(M);
