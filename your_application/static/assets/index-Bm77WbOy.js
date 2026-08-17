var B=Object.defineProperty;var V=(e,t,n)=>t in e?B(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var m=(e,t,n)=>V(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();const h={grain:{suit:"grain",emoji:"🌾",label:"Grain",family:"gold",color:"grain"},orchard:{suit:"orchard",emoji:"🍎",label:"Orchard",family:"gold",color:"orchard"},livestock:{suit:"livestock",emoji:"🐄",label:"Cattle",family:"rust",color:"livestock"},equipment:{suit:"equipment",emoji:"🚜",label:"Tractors",family:"rust",color:"equipment"}},f=["grain","orchard","livestock","equipment"],z=1,p=14,$=1;function y(e){return h[e].family}function J(e){return e.rank===$}function F(e){return e===1?"F":e===11?"J":e===12?"Q":e===13?"K":e===14?"★":String(e)}function N(e){const t=h[e.suit];return e.rank===$?`${t.label} Field`:e.rank===p?`${t.label} Harvest`:`${t.label} ${F(e.rank)}`}function Q(){const e=[];for(const t of f)for(let n=z;n<=p;n++)e.push({id:`${t}-${n}`,suit:t,rank:n,faceUp:!1});return e}function X(e){let t=e>>>0;return function(){t|=0,t=t+1831565813|0;let n=Math.imul(t^t>>>15,1|t);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}function Z(e,t=Math.random){for(let n=e.length-1;n>0;n--){const s=Math.floor(t()*(n+1));[e[n],e[s]]=[e[s],e[n]]}return e}const O=7,ee=8,te=1,ne=2,se=3,ie=10,re=150;function g(e){return e.length===0?"vacant":e.length>=p?"owned":"leased"}function x(e){return f.filter(t=>g(e.fields[t])==="owned").length}function oe(e){return f.filter(t=>g(e.fields[t])==="leased").length}function E(e){return x(e)>=te}function C(e){return x(e)>=ne}function D(e){return x(e)>=se}function le(){return{grain:[],orchard:[],livestock:[],equipment:[]}}function ae(e){const t=Array.from({length:O},()=>[]);for(let s=0;s<O;s++)for(let i=0;i<=s;i++){const r=e.pop();r.faceUp=i===s,t[s].push(r)}const n=e.splice(0,e.length);return n.forEach(s=>{s.faceUp=!1}),{stock:n,waste:[],fields:le(),holding:t,moves:0,score:0,recycled:0}}function S(e){const t=e===void 0?Math.random:X(e);return ae(Z(Q(),t))}function v(e,t){const n=e.waste.findIndex(s=>s.id===t);if(n!==-1)return{ref:{type:"waste"},index:n};for(const s of f){const i=e.fields[s].findIndex(r=>r.id===t);if(i!==-1)return{ref:{type:"field",suit:s},index:i}}for(let s=0;s<e.holding.length;s++){const i=e.holding[s].findIndex(r=>r.id===t);if(i!==-1)return{ref:{type:"hold",index:s},index:i}}return null}function w(e,t){switch(t.type){case"stock":return e.stock;case"waste":return e.waste;case"field":return e.fields[t.suit];case"hold":return e.holding[t.index]}}function c(e){return e[e.length-1]}function R(e,t){if(t.length===0)return e.rank===$;const n=c(t);return!!(n&&n.suit===e.suit&&e.rank===n.rank+1)}function U(e,t){return t?y(e.suit)!==y(t.suit)&&e.rank===t.rank-1:e.rank===p}function ce(e){if(e.length===0||e.some(t=>!t.faceUp))return!1;for(let t=1;t<e.length;t++){const n=e[t-1],s=e[t];if(y(n.suit)===y(s.suit)||s.rank!==n.rank-1)return!1}return!0}function de(e,t){return e.type!==t.type?!1:e.type==="hold"&&t.type==="hold"?e.index===t.index:e.type==="field"&&t.type==="field"?e.suit===t.suit:!0}function ue(e,t){if(t.type!=="hold")return;const n=c(e.holding[t.index]);n&&!n.faceUp&&(n.faceUp=!0)}function k(e,t){const n=v(e,t);if(!n)return null;const{ref:s,index:i}=n;if(s.type==="stock")return null;const r=w(e,s);if(s.type==="hold"){const o=r.slice(i);return ce(o)?o:null}return i!==r.length-1||s.type==="field"&&(g(r)==="owned"||!E(e))?null:r[i].faceUp?[r[i]]:null}function _(e,t){const n=k(e,t);if(!n)return[];const s=v(e,t),i=[];(s==null?void 0:s.ref.type)!=="field"&&n.length===1&&R(n[0],e.fields[n[0].suit])&&i.push({type:"field",suit:n[0].suit});for(let r=0;r<e.holding.length;r++)U(n[0],c(e.holding[r]))&&i.push({type:"hold",index:r});return i}function fe(e,t,n,s){return n.type==="stock"||n.type==="waste"?!1:n.type==="field"?s.type==="field"?!1:t.length===1&&n.suit===t[0].suit&&R(t[0],e.fields[n.suit]):s.type==="field"&&!E(e)?!1:U(t[0],c(e.holding[n.index]))}function P(e){C(e)&&e.holding.length<ee&&e.holding.push([])}function j(e,t,n){const s=v(e,t);if(!s||de(s.ref,n))return!1;const i=k(e,t);return!i||!fe(e,i,n,s.ref)?!1:(w(e,s.ref).splice(s.index,i.length),w(e,n).push(...i),ue(e,s.ref),n.type==="field"&&(e.score+=ie,g(e.fields[n.suit])==="owned"&&(e.score+=re,P(e))),e.moves++,!0)}function L(e,t){const n=v(e,t);if(!n)return!1;const i=w(e,n.ref)[n.index];return i?j(e,t,{type:"field",suit:i.suit}):!1}function pe(e){if(e.stock.length>0){const t=e.stock.pop();return t.faceUp=!0,e.waste.push(t),e.moves++,!0}if(e.waste.length>0){for(;e.waste.length>0;){const t=e.waste.pop();t.faceUp=!1,e.stock.push(t)}return e.recycled++,e.moves++,!0}return!1}function H(e,t){if(t.rank<=2)return!0;const n=t.rank-1;return f.filter(s=>y(s)!==y(t.suit)).every(s=>{var i;return(((i=c(e.fields[s]))==null?void 0:i.rank)??0)>=n})}function he(e){const t=[],n=c(e.waste);n&&t.push(n);for(const s of e.holding){const i=c(s);i!=null&&i.faceUp&&t.push(i)}return t}function K(e){let t=0,n=!0;for(;n;){n=!1;for(const s of he(e))if(H(e,s)&&L(e,s.id)){t++,n=!0;break}}return t}function b(e){P(e),D(e)&&K(e)}function ye(e){var t;return((t=c(e.waste))==null?void 0:t.rank)===p?!0:e.holding.some(n=>{var s;return((s=c(n))==null?void 0:s.rank)===p})}function ve(e,t){const n=v(e,t);return!n||n.ref.type!=="hold"||n.index===0?!1:!e.holding[n.ref.index][n.index-1].faceUp}function me(e,t){const n=v(e,t);return!!(n&&n.ref.type==="hold"&&n.index===0)}function be(e){const t=[],n=c(e.waste);n&&t.push(n.id);for(const s of f){const i=c(e.fields[s]);i&&t.push(i.id)}for(const s of e.holding)for(const i of s)i.faceUp&&t.push(i.id);return t}function ge(e){var o;const t=be(e),n=[],s=[],i=[],r=[];for(const l of t){const d=k(e,l);if(d)for(const a of _(e,l))me(e,l)&&a.type!=="hold"&&!ye(e)||(ve(e,l)?n.push({cardId:l,dest:a}):a.type==="field"&&d[0].rank===$?s.push({cardId:l,dest:a}):a.type==="field"&&H(e,d[0])?i.push({cardId:l,dest:a}):a.type==="hold"&&r.push({cardId:l,dest:a}))}return n[0]?{text:"Turn a buried card — that is the best Klondike play.",...n[0]}:s[0]?{text:"Lease this Field (F). Aces go up immediately.",...s[0]}:i[0]?{text:i[0]&&((o=k(e,i[0].cardId))==null?void 0:o[0].rank)===2?"Play the 2 onto the lease. Twos almost never help the holding set.":"Safe to build the lease — opposite-family ranks below are already up.",...i[0]}:r[0]?{text:"Park it in the holding set. Keep mid-ranks off the lease until they are safe.",...r[0]}:e.stock.length||e.waste.length?{text:"No improving move. Draw from the stock (or recycle the waste)."}:{text:"No legal play left. Start a new farm, or undo by recalling from a lease if you own one."}}function W(e){return f.every(t=>e.fields[t].length===p)}function T(e){return e.type==="field"?`field:${e.suit}`:e.type==="hold"?`hold:${e.index}`:e.type}function q(e){return e.type==="field"?`data-dest="field" data-suit="${e.suit}"`:e.type==="hold"?`data-dest="hold" data-col="${e.index}"`:`data-dest="${e.type}"`}function A(e,t){const n=h[e.suit];if(!e.faceUp)return'<div class="card card--back" aria-hidden="true"></div>';const s=t.selected?" is-selected":"",i=J(e)?" card--plot":"",r=t.action??"select",o=t.buried?" card--buried":"";return r==="noop"?`
    <div class="card card--${n.color}${i}${o}" aria-label="${N(e)}">
      <span class="card-suit">${n.emoji}</span>
      <span class="card-rank">${F(e.rank)}</span>
    </div>`:`
    <button type="button" class="card card--${n.color}${i}${s}${o}"
      data-action="${r}" data-id="${e.id}" aria-label="${N(e)}">
      <span class="card-suit">${n.emoji}</span>
      <span class="card-rank">${F(e.rank)}</span>
    </button>`}function we(e,t,n,s){const i=e.fields[t],r=h[t],o=c(i),l=g(i),d=T({type:"field",suit:t}),a=n.has(d)?" is-valid":"",u=` is-${l}`,I=l==="leased"&&E(e),Y=l==="owned"?"Owned farm":l==="leased"?`Leased ${i.length}/${p}`:"Vacant · lease with F",G=o?A(o,{action:I?"select":"noop",selected:o.id===s}):`<div class="slot-empty">${r.emoji}<small>Lease</small></div>`;return`
    <article class="field-slot field-slot--${r.color}${a}${u}" ${q({type:"field",suit:t})} data-action="drop">
      <header class="slot-head">${r.emoji} ${r.label} <b>${Y}</b></header>
      ${G}
    </article>`}function ke(e,t,n,s){const i=e.holding[t],r=T({type:"hold",index:t}),o=s.has(r)?" is-valid":"",l=i.length===0?" is-empty":" has-cards",d=i.length?i.map((a,u)=>A(a,{selected:a.id===n,buried:u<i.length-1})).join(""):'<div class="slot-empty slot-empty--hold"><small>Hold</small></div>';return`
    <article class="hold-col${o}${l}" ${q({type:"hold",index:t})} data-action="drop">
      <div class="hold-stack">${d}</div>
    </article>`}function $e(e){const t=e.state,n=new Set(e.selectedId?_(t,e.selectedId).map(T):[]),s=c(t.waste),i=x(t),r=oe(t),o=ge(t),l=t.stock.length>0?`<button type="button" class="card card--back card--stock" data-action="draw" aria-label="Draw from stock, ${t.stock.length} left"></button>`:t.waste.length>0?'<button type="button" class="slot-empty slot-empty--recycle" data-action="draw" aria-label="Recycle waste into stock">♻️</button>':'<div class="slot-empty">—</div>',d=s?A(s,{selected:s.id===e.selectedId}):'<div class="slot-empty"><small>Waste</small></div>',a=e.selectedId?n.size?"Tap a glowing lease or holding pile. Prefer a move that flips a buried card.":"That card has nowhere to go — pick another, or draw.":o.text;return`
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${t.score}</b></div>
        <div class="stat"><span>🃏</span><b>${t.moves}</b></div>
        <div class="stat"><span>🏡</span><b>${i}/4</b></div>
      </div>
    </header>

    <section class="stock-row" aria-label="Stock and waste">
      <div class="stock-box">
        <div class="bank-label">Stock · ${t.stock.length}</div>
        ${l}
      </div>
      <div class="stock-box">
        <div class="bank-label">Waste · ${t.waste.length}</div>
        ${d}
      </div>
      <div class="stock-box stock-box--progress">
        <div class="bank-label">Farms owned · ${r} leased</div>
        <div class="bank-value">${i}/4</div>
        <p class="season-copy">
          ${i===0?"Lease with <b>F</b>. Finish the 14-card suit to own the farm.":i===1?"Deed #1: recall a card from a lease when you need a builder.":i===2?"Deed #2: extra yard unlocked. Keep flipping buried cards.":i===3?"Deed #3: the crew plays F and 2s for you.":"All four farms are yours."}
        </p>
      </div>
    </section>

    <section class="fields-row" aria-label="Fields">
      ${f.map(u=>we(t,u,n,e.selectedId)).join("")}
    </section>

    <p class="upkeep">${a}</p>

    <section class="holding-wrap" aria-label="Holding set">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="holding">
        ${t.holding.map((u,I)=>ke(t,I,e.selectedId,n)).join("")}
      </div>
    </section>

    <footer class="controls">
      <div class="legend-row">
        ${f.map(u=>`<span class="legend"><i>${h[u].emoji}</i>${h[u].label}</span>`).join("")}
        <span class="legend">F leases · ★ Harvest · ${C(t)?"Yard open":"7 holds"}${D(t)?" · Crew on":""}</span>
      </div>
      <div class="hand-actions">
        <button class="btn" data-action="auto" type="button">🌾 Play F &amp; 2s</button>
        <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
      </div>
    </footer>
  </div>`}function xe(e){return W(e)?`
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">🌾🐄🏆</div>
      <h2>You own all four farms!</h2>
      <p>Every leased field is now a deed — the late-game county is yours.</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${e.score}</b></div>
        <div><span>🃏 Moves</span><b>${e.moves}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`:""}function Ie(e){const t=e.dataset.dest;return t==="field"&&e.dataset.suit?{type:"field",suit:e.dataset.suit}:t==="hold"&&e.dataset.col!==void 0?{type:"hold",index:Number(e.dataset.col)}:null}class Fe{constructor(t,n){m(this,"root");m(this,"state");m(this,"seed");m(this,"selectedId",null);this.root=t;const s=new URLSearchParams(location.search).get("seed"),i=s!==null&&s.trim()!==""&&Number.isFinite(Number(s))?Number(s):void 0;this.seed=n??i,this.state=S(this.seed),this.bindEvents(),this.render()}restart(){this.state=S(this.seed),this.selectedId=null,this.render()}bindEvents(){this.root.addEventListener("click",t=>{const s=t.target.closest("[data-action]");if(!s)return;const i=s.dataset.action,r=s.dataset.id;switch(i){case"select":if(!r)break;if(this.selectedId===r){L(this.state,r)&&b(this.state),this.selectedId=null;break}if(this.selectedId&&L(this.state,this.selectedId)){b(this.state),this.selectedId=null;break}this.selectedId=r;break;case"drop":{const o=Ie(s);o&&this.selectedId&&j(this.state,this.selectedId,o)&&(b(this.state),this.selectedId=null);break}case"draw":pe(this.state),b(this.state),this.selectedId=null;break;case"auto":K(this.state),b(this.state),this.selectedId=null;break;case"new":this.restart();return}this.render()})}render(){const t={state:this.state,selectedId:this.selectedId};let n=$e(t);W(this.state)&&(n+=xe(this.state)),this.root.innerHTML=n}}const M=document.getElementById("app");M&&new Fe(M);
