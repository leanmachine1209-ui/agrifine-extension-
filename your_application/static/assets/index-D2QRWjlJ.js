var de=Object.defineProperty;var ue=(e,n,t)=>n in e?de(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var b=(e,n,t)=>ue(e,typeof n!="symbol"?n+"":n,t);(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();const d={field:{suit:"field",emoji:"🏚️",label:"Barns",color:"field"},seed:{suit:"seed",emoji:"🌱",label:"Crops",color:"seed"},equipment:{suit:"equipment",emoji:"🚜",label:"Tractors",color:"equipment"},livestock:{suit:"livestock",emoji:"🐄",label:"Cattle",color:"livestock"},expansion:{suit:"expansion",emoji:"📐",label:"Expansion",color:"expansion"},boom:{suit:"boom",emoji:"💥",label:"Boom",color:"boom"}},R=["field","seed","equipment","livestock"],x={field:[{tier:1,emoji:"🏚️",label:"Wood barn",short:"Wood"},{tier:2,emoji:"🏭",label:"Steel barn",short:"Steel"},{tier:3,emoji:"🏢",label:"Modern barn",short:"Modern"}],seed:[{tier:1,emoji:"🌱",label:"Seedling",short:"Seed"},{tier:2,emoji:"🌾",label:"Standing crop",short:"Crop"},{tier:3,emoji:"🌻",label:"Bumper crop",short:"Bumper"}],equipment:[{tier:1,emoji:"🚜",label:"Compact tractor",short:"Small"},{tier:2,emoji:"🛻",label:"Utility tractor",short:"Utility"},{tier:3,emoji:"🚛",label:"Combine",short:"Combine"}],livestock:[{tier:1,emoji:"🐄",label:"Cow",short:"Cow"},{tier:2,emoji:"🐂",label:"Herd",short:"Herd"},{tier:3,emoji:"🏞️",label:"Feedlot",short:"Lot"}]},S=["spring","summer","fall","winter"],f={spring:{emoji:"🌸",label:"Spring"},summer:{emoji:"☀️",label:"Summer"},fall:{emoji:"🍂",label:"Fall"},winter:{emoji:"❄️",label:"Winter"}},fe=10,he=3,pe=8,me=8,be=3,ve=4;function p(e){return e.suit==="expansion"||e.suit==="boom"}function D(e){return R.includes(e)}function q(e){return D(e.suit)?x[e.suit][e.tier-1]??x[e.suit][0]:null}function u(e,n,t){return Array.from({length:n},(i,s)=>({id:t?`${e}-${t}-${s+1}`:`${e}-${s+1}`,suit:e,tier:1,...t?{season:t}:{}}))}function ge(){return[...u("field",fe),...S.flatMap(e=>u("seed",he,e)),...u("equipment",pe),...u("livestock",me),...u("expansion",be),...u("boom",ve)]}function $e(e){let n=e>>>0;return function(){n|=0,n=n+1831565813|0;let t=Math.imul(n^n>>>15,1|n);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function ke(e,n=Math.random){for(let t=e.length-1;t>0;t--){const i=Math.floor(n()*(t+1));[e[t],e[i]]=[e[i],e[t]]}return e}const j=6,g=3,Se=3,G=3,w=1,V=8,Ee=4,ye=2,K=5,Ce=5,Y=2,Te=1,Ie=2,we=2,je=6,W={1:1,2:3,3:6},A={1:1,2:2,3:4};function _e(){return R.map(e=>({suit:e,cards:[]}))}function X(e,n){for(let t=0;t<n&&e.deck.length>0;t++)e.hand.push(e.deck.pop())}function _(e){return S[(e-1+S.length*8)%S.length]}function O(e){const n=e===void 0?Math.random:$e(e),t={deck:ke(ge(),n),hand:[],seeds:Ce,columns:_e(),grain:0,herd:[],score:0,season:1,sold:0,cattleCashed:0,cattleStarved:0,nextCow:0,nextMerge:0,tokensBurned:0,over:!1,failed:!1,rng:n};return X(t,K),t}function h(e,n){return e.columns.filter(t=>t.suit===n).flatMap(t=>t.cards)}function E(e,n){return e.reduce((t,i)=>t+n[i.tier],0)}function N(e){return ye+E(h(e,"field"),W)}function Q(e){return E(h(e,"equipment"),W)}function Ne(e){return e.herd.length>0||h(e,"livestock").length>0}function Me(e){return e.grain>0||h(e,"seed").length>0}function y(e){const n=E(h(e,"field"),A),t=E(h(e,"equipment"),A),i=n>0&&!Ne(e),s=t>0&&!Me(e),o=i?n*2:n,r=s?t*2:t;return{barns:o,tractors:r,idleBarns:i,idleTractors:s,total:o+r}}function M(e){return Y+y(e).total}function v(e,n){return e.cards.length===0?!1:n==="grain"?e.suit==="seed":e.suit==="livestock"}function L(e,n,t){return p(e)||e.suit==="seed"&&e.season!==t?!1:n.suit===null&&n.cards.length===0?D(e.suit):n.suit===e.suit}function Le(e){const n=_(e.season);return e.hand.some(t=>t.suit==="expansion"&&e.columns.length<j||t.suit==="boom"||e.columns.some(i=>L(t,i,n)))}function Z(e){return e.herd.length*w}function xe(e,n){let t=!0;for(;t;){t=!1;for(let i=0;i<=e.cards.length-g;i++){const s=e.cards.slice(i,i+g),o=s[0].tier;if(o>=Se||!s.every(a=>a.tier===o&&a.suit===s[0].suit))continue;const r={id:n(),suit:s[0].suit,tier:o+1};e.cards.splice(i,g,r),e.suit===null&&(e.suit=r.suit),t=!0;break}}}function Ae(e){return`merge-${e.nextMerge++}`}function z(e){return p(e)?Ie:Te}function J(e){return!e.over&&e.hand.length===0&&e.deck.length>0&&e.seeds>=M(e)}function ee(e){const n=N(e);if(e.herd.length<=n)return;e.herd.sort((i,s)=>i.life-s.life);const t=e.herd.length-n;e.cattleStarved+=t,e.herd=e.herd.slice(t)}function Oe(e){if(ee(e),e.herd.length===0)return;const n=Z(e);if(e.grain>=n)e.grain-=n;else{const i=Math.floor(e.grain/w);e.grain-=i*w,e.herd.sort((s,o)=>s.life-o.life),e.cattleStarved+=e.herd.length-i,e.herd=e.herd.slice(0,i)}const t=[];for(const i of e.herd)i.life-=1,i.life<=0?(e.score+=V,e.cattleCashed++):t.push(i);e.herd=t}function Be(e){const n=y(e).total;n<=0||(e.seeds-=n,e.tokensBurned+=n)}function Pe(e){return J(e)?(Be(e),e.seeds-=Y,e.season++,Oe(e),X(e,K),!0):!1}function B(e,n){e.over||(e.over=!0,e.failed=n,n||(e.score+=e.herd.length*Ee))}function C(e){e.over||e.hand.length>0||(e.deck.length===0?B(e,!1):e.seeds<M(e)&&B(e,!0))}function $(e,n){return e.hand.findIndex(t=>t.id===n)}function ne(e,n){const t=$(e,n);if(t<0)return null;const[i]=e.hand.splice(t,1);return i}function Ue(e,n,t){if(e.over)return!1;const i=$(e,n);if(i<0)return!1;const s=e.columns[t];if(!s)return!1;const o=e.hand[i];return L(o,s,_(e.season))?(s.cards.push(o),s.suit===null&&(s.suit=o.suit),e.hand.splice(i,1),xe(s,()=>Ae(e)),C(e),!0):!1}function Fe(e,n){if(e.over)return!1;const t=$(e,n);return t<0?!1:(e.seeds+=z(e.hand[t]),e.sold++,e.hand.splice(t,1),C(e),!0)}function He(e,n){if(e.over)return!1;const t=$(e,n);return t<0||e.hand[t].suit!=="expansion"||e.columns.length>=j?!1:(ne(e,n),e.columns.push({suit:null,cards:[]}),C(e),!0)}function P(e,n,t){if(e.over)return!1;const i=$(e,n);return i<0||e.hand[i].suit!=="boom"?!1:(ne(e,n),t==="grain"?e.grain+=1+Math.floor(e.rng()*je):(e.herd.push({id:`cow-${e.nextCow++}`,life:G}),ee(e)),C(e),!0)}function U(e,n,t){if(e.over)return!1;const i=e.columns[n];if(!i||!v(i,t))return!1;const s=i.cards.reduce((o,r)=>o+r.tier,0);if(t==="grain")e.grain+=s+Q(e),e.seeds+=we,e.score+=s;else{const o=Math.max(0,N(e)-e.herd.length),r=Math.min(s,o),a=s-r;for(let c=0;c<r;c++)e.herd.push({id:`cow-${e.nextCow++}`,life:G});e.cattleStarved+=a,e.score+=r}return i.cards=[],!0}function Re(e){const n=q(e);if(n)return e.suit==="seed"&&e.season&&e.tier===1?{emoji:n.emoji,pip:f[e.season].emoji}:{emoji:n.emoji,pip:n.short};const t=d[e.suit];return{emoji:t.emoji,pip:t.label.slice(0,4)}}function F(e){const n=q(e);return e.suit==="seed"&&e.season&&e.tier===1?`${f[e.season].label} Seed`:n?n.label:d[e.suit].label}function te(e,n="",t){const i=d[e.suit],s=Re(e),o=e.tier>1?` card--tier-${e.tier}`:"";if(t==="noop")return`
    <div class="card card--${i.color}${o} ${n}" aria-label="${F(e)}">
      <span class="card-suit">${s.emoji}</span>
      <span class="card-rank">${s.pip}</span>
    </div>`;const r=t??(p(e)?e.suit:"select");return`
    <button type="button" class="card card--${i.color}${o} ${n}" data-card-id="${e.id}"
      data-action="${r}" data-id="${e.id}" aria-label="${F(e)}">
      <span class="card-suit">${s.emoji}</span>
      <span class="card-rank">${s.pip}</span>
    </button>`}function De(e,n){return e.hand.find(t=>t.id===n)??e.hand[0]??null}function qe(e,n){return e.suit?d[e.suit].label:n<4?"Open":"Extra"}function Ge(e,n){return e.suit?e.suit==="field"?e.cards.length?`${g} same → bigger barn`:"wood barn · 3 → steel":e.suit==="equipment"?e.cards.length?`${g} same → bigger tractor`:"small tractor · 3 → utility":e.suit==="seed"?e.cards.length?"ready to harvest":`needs ${f[n].label} seed`:e.cards.length?"fold into pasture":"stack cattle here":"play any suit to lock"}function Ve(e,n,t,i){const s=e.columns[n],r=!!(t&&!p(t)&&L(t,s,i))?" is-valid":"",a=v(s,"grain")||v(s,"cattle")?" is-ripe":"",c=s.suit?` suit-col--${s.suit}`:" suit-col--open",T=s.cards.length?s.cards.map(k=>te(k,"card--on-row","noop")).join(""):'<div class="col-empty">Empty</div>';let m=`<div class="col-fold"><span class="col-hint">${Ge(s,i)}</span></div>`;v(s,"grain")?m=`<div class="col-fold">
      <button class="mini mini--grain" data-action="fold-grain" data-col="${n}" type="button">🌾 Harvest</button>
    </div>`:v(s,"cattle")&&(m=`<div class="col-fold">
      <button class="mini mini--cattle" data-action="fold-cattle" data-col="${n}" type="button">🐄 Cattle</button>
    </div>`);const I=s.suit?d[s.suit].emoji:"📐";return`
    <article class="suit-col${c}${r}${a}" data-action="place" data-col="${n}">
      <header class="col-head"><span>${I} ${qe(s,n)}</span></header>
      <div class="suit-stack">${T}</div>
      ${m}
    </article>`}function Ke(e){return e.herd.length===0?'<div class="pasture-empty">no livestock yet — fold 🐄 into pasture</div>':e.herd.slice().sort((n,t)=>n.life-t.life).map(n=>`<span class="cow" title="cashes out in ${n.life} season(s)">🐄<i>${n.life}</i></span>`).join("")}function Ye(e){const n=y(e);if(n.total===0)return"No capital upkeep this loan.";const t=[];return n.barns&&t.push(n.idleBarns?`idle barns −${n.barns}🌱`:`barns −${n.barns}🌱`),n.tractors&&t.push(n.idleTractors?`idle tractors −${n.tractors}🌱`:`tractors −${n.tractors}🌱`),t.join(" · ")}function We(e){const n=e.state,t=_(n.season),i=f[t],s=De(n,e.selectedId),o=n.hand.length===0,r=Z(n),a=y(n),c=M(n),T=N(n),m=Q(n),I=o?'<div class="card card--empty"></div>':n.hand.map(l=>te(l,`${l.id===(s==null?void 0:s.id)?"is-selected":""} ${p(l)?"card--instant":""}`)).join(""),k=!o&&!Le(n),se=o?`Season over — take the operating loan (−${c}🌱) for a new mini-deck.`:(s==null?void 0:s.suit)==="boom"?"Boom: pick grain or a cow — or sell this card.":(s==null?void 0:s.suit)==="expansion"?n.columns.length<j?"Tap Expansion again to add an extra column.":"Columns are at the cap — sell Expansion for seeds.":k?"No column fits — harvest, fold cattle, or sell this card for 🌱.":"Pick a card, then tap its suit column — 3 of a kind collapse into a bigger asset.",ie=(s==null?void 0:s.suit)==="boom"?`<div class="boom-choice">
           <button class="mini mini--grain" data-action="boom-grain" type="button">+1d6 grain</button>
           <button class="mini mini--cattle" data-action="boom-cow" type="button">+1 cow</button>
         </div>`:"",oe=o?`<button class="btn btn--seed" data-action="draw-mini" type="button" ${J(n)?"":"disabled"}>
         🌱 Take Loan · Season ${n.season+1} <small>(−${c})</small>
       </button>`:`<button class="btn btn--sell" data-action="sell" type="button">💰 Sell <small>(+${s?z(s):1}🌱)</small></button>`,re=["field","seed","equipment","livestock","expansion","boom"].map(l=>`<span class="legend"><i>${d[l].emoji}</i>${d[l].label}</span>`).join(""),ae=["spring","summer","fall","winter"].map(l=>`<li class="${l===t?"on":""}" title="${f[l].label}">${f[l].emoji}</li>`).join(""),le=a.idleBarns||a.idleTractors?" is-idle":"";return`
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${n.score}</b></div>
        <div class="stat stat--seed"><span>🌱</span><b>${n.seeds}</b></div>
        <div class="stat"><span>📅</span><b>${n.season}</b></div>
      </div>
    </header>

    <section class="bank gauges" aria-label="Farm gauges">
      <div class="bank-box">
        <div class="bank-label gauge-kicker">🌾 Grain Bank</div>
        <div class="bank-value">${n.grain}<small>${r>0?` · −${r}/season`:""}</small></div>
      </div>
      <div class="bank-box bank-box--herd">
        <div class="bank-label gauge-kicker">🐄 Pasture <span class="cashout-note">${n.herd.length}/${T} · +${V} cash-out</span></div>
        <div class="pasture">${Ke(n)}</div>
      </div>
      <div class="bank-box season-gauge" data-season="${t}">
        <div class="bank-label gauge-kicker">Temperature</div>
        <div class="bank-value season-value">${i.emoji} ${i.label}</div>
        <p class="season-copy">Only ${i.label} Seed cards plant this mini-deck. Tractors ${m}.</p>
        <ol class="season-pips">${ae}</ol>
      </div>
    </section>

    <p class="upkeep${le}" data-upkeep>${Ye(n)}</p>

    <section class="hand-panel">
      <div class="hand-cards" data-hand>${I}</div>
      <div class="hand-info">
        <div class="hand-title">Season ${n.season} · ${n.deck.length} in deck · hand ${n.hand.length}</div>
        <div class="hand-sub ${k?"is-stuck":""}">${se}</div>
        ${ie}
        <div class="hand-actions">${oe}</div>
      </div>
    </section>

    <section class="fields-wrap" aria-label="Suit columns">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="suits">
        ${n.columns.map((l,ce)=>Ve(n,ce,s,t)).join("")}
      </div>
    </section>

    <footer class="controls">
      <div class="legend-row">${re}</div>
      <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
    </footer>
  </div>`}function Xe(e){const n=e.failed;return`
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">${n?"🏦🌧️":"🌾🐄🏆"}</div>
      <h2>${n?"Bankrupt! 🥀":"Farm Complete! 🌻"}</h2>
      <p>${n?"You couldn't fund the next season — idle barns and tractors burn tokens when crops and cattle aren't paying.":"You worked the whole deck to the last card."}</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${e.score}</b></div>
        <div><span>🐄 Cashed</span><b>${e.cattleCashed}</b></div>
        <div><span>🌾 Grain</span><b>${e.grain}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`}class Qe{constructor(n,t){b(this,"root");b(this,"state");b(this,"seed");b(this,"selectedId",null);this.root=n;const i=new URLSearchParams(location.search).get("seed"),s=i!==null&&i.trim()!==""&&Number.isFinite(Number(i))?Number(i):void 0;this.seed=t??s,this.state=O(this.seed),this.bindEvents(),this.render()}currentSelection(){var n,t;return this.selectedId&&this.state.hand.some(i=>i.id===this.selectedId)?this.selectedId:((n=this.state.hand.find(i=>!p(i)))==null?void 0:n.id)??((t=this.state.hand[0])==null?void 0:t.id)??null}newGame(){this.state=O(this.seed),this.selectedId=null,this.render()}bindEvents(){this.root.addEventListener("click",n=>{const i=n.target.closest("[data-action]");if(!i||i.dataset.action==="noop")return;const s=i.dataset.action,o=i.dataset.col!==void 0?Number(i.dataset.col):-1,r=i.dataset.id??i.dataset.cardId??void 0;switch(s){case"select":r&&(this.selectedId=r);break;case"expansion":{if(!r)break;He(this.state,r)?this.selectedId=null:this.selectedId=r;break}case"boom":r&&(this.selectedId=r);break;case"boom-grain":{const a=this.currentSelection();a&&P(this.state,a,"grain")&&(this.selectedId=null);break}case"boom-cow":{const a=this.currentSelection();a&&P(this.state,a,"cow")&&(this.selectedId=null);break}case"place":{const a=this.currentSelection();a&&Ue(this.state,a,o)&&(this.selectedId=null);break}case"sell":{const a=this.currentSelection();a&&Fe(this.state,a),this.selectedId=null;break}case"draw-mini":case"loan":Pe(this.state),this.selectedId=null;break;case"fold-grain":U(this.state,o,"grain");break;case"fold-cattle":U(this.state,o,"cattle");break;case"new":this.newGame();return}this.render()})}render(){const n={state:this.state,selectedId:this.currentSelection()};let t=We(n);this.state.over&&(t+=Xe(this.state)),this.root.innerHTML=t}}const H=document.getElementById("app");H&&new Qe(H);
