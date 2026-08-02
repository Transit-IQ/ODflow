(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();function _(e,...t){const n=e.reduce((o,a,i)=>o+a+(t[i]??""),""),s=document.createElement("template");return s.innerHTML=n.trim(),s.content.firstElementChild}function g(e,t){return e.querySelector(t)}const u={day:"avg",period:"all",layers:{speed:!0,cong:!1,dest:!1,stops:!1},destCats:null,area:null,areaName:null,areaRecord:null},ce=new Set;function S(e){Object.assign(u,e),ze(Object.keys(e))}function ze(e){const t=new Set(e);for(const n of ce)n(u,t)}function gt(e){return ce.add(e),()=>ce.delete(e)}const bt="theme",de=new Set;function ye(){return document.documentElement.dataset.theme==="light"?"light":"dark"}function R(){return ye()==="light"}function vt(){const e=R()?"dark":"light";document.documentElement.dataset.theme=e;try{localStorage.setItem(bt,e)}catch{}for(const t of de)t(e)}function mt(e){return de.add(e),()=>de.delete(e)}const U={dark:{base:"https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"},light:{base:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}},yt={neighHighlightPane:350,routeCasingPane:405,routeLinePane:410,pointPane:420},$e=[32.08,34.78];let m=null,Ne=null,pe=null;function $t(e){m=L.map(e,{zoomControl:!1,attributionControl:!1,preferCanvas:!0}).setView($e,15),L.control.zoom({position:"topright"}).addTo(m);const t=ye();Ne=L.tileLayer(U[t].base,{maxZoom:19,subdomains:"abcd",className:"basemap"}).addTo(m),pe=L.tileLayer(U[t].labels,{maxZoom:19,subdomains:"abcd",opacity:De()}).addTo(m);for(const[n,s]of Object.entries(yt))m.createPane(n).style.zIndex=String(s);return m}function De(){return R()?.8:.7}function Lt(){const e=ye();Ne.setUrl(U[e].base),pe.setUrl(U[e].labels),pe.setOpacity(De())}function J(e,t){t?m.hasLayer(e)||m.addLayer(e):m.hasLayer(e)&&m.removeLayer(e)}const kt=e=>`/ODflow/data/${e}`,l={center:$e,border:null,segments:[],speedProfile:null,stopTotals:null,destinations:null,stops:null,neighbourhoods:[],routesById:null};async function O(e){const t=await fetch(kt(e));if(!t.ok)throw new Error(`${e}: HTTP ${t.status}`);return t.json()}async function Et(){var s,o,a;const[e,t,n]=await Promise.allSettled([O("border.json"),O("speeds.json"),O("kpis.json")]);if(e.status==="fulfilled"){l.border=e.value;const i=(a=(o=(s=e.value)==null?void 0:s.geometry)==null?void 0:o.coordinates)==null?void 0:a[0];if(i!=null&&i.length){const r=i.map(d=>d[1]),p=i.map(d=>d[0]);l.center=[(Math.min(...r)+Math.max(...r))/2,(Math.min(...p)+Math.max(...p))/2]}}return t.status==="fulfilled"&&(l.segments=t.value),n.status==="fulfilled"&&(l.speedProfile=n.value.speed_profile||null,l.stopTotals=n.value.stops||null),{segmentsFailed:t.status==="rejected"}}async function _t(){return l.neighbourhoods.length||(l.neighbourhoods=await O("neighbourhoods.json")),l.neighbourhoods}const H=new Map;function Le(e,t){return H.has(e)||H.set(e,t().catch(n=>{throw H.delete(e),n})),H.get(e)}function St(){return Le("destinations",async()=>(l.destinations=await O("destinations.json"),l.destinations))}function wt(){return Le("stops",async()=>(l.stops=await O("stops.json"),l.stops))}function xt(){return Le("routes",async()=>(l.routesById=await O("neighbourhood_routes.json"),l.routesById))}function xe(e,t,n){let s=!1;for(let o=0,a=n.length-1;o<n.length;a=o++){const i=n[o][0],r=n[o][1],p=n[a][0],d=n[a][1];r>e!=d>e&&t<(p-i)*(e-r)/(d-r)+i&&(s=!s)}return s}function Te(e,t,n){if(!xe(e,t,n[0]))return!1;for(let s=1;s<n.length;s++)if(xe(e,t,n[s]))return!1;return!0}function Tt(e,t,n){return n?n.type==="Polygon"?Te(e,t,n.coordinates):n.type==="MultiPolygon"?n.coordinates.some(s=>Te(e,t,s)):!1:!1}function ke(e,t,n){const s=n.bbox;return e<s.min_lat||e>s.max_lat||t<s.min_lon||t>s.max_lon?!1:n.boundary?Tt(e,t,n.boundary):!0}function Ct(e,t){for(const n of e.getLatLngs())if(ke(n.lat,n.lng,t))return!0;return!1}const F=[8,15,22,30],Pt=[5,4,3.25,2.75,2.5],He=15,Ce={dark:{bands:["#e11d48","#f97316","#facc15","#34d399","#60a5fa"],empty:"#3d4a63",cong:"#fb7185",focus:"#2dd4bf",imported:"#38bdf8",casing:"#0b1220",hairline:"#0b0b0b",selected:"#ffffff"},light:{bands:["#e11d48","#9a3412","#ca8a04","#15803d","#1d4ed8"],empty:"#cbd5e1",cong:"#be123c",focus:"#0f766e",imported:"#1d4ed8",casing:"#ffffff",hairline:"#ffffff",selected:"#0f1f3e"}};function w(){return R()?Ce.light:Ce.dark}function Ge(e){if(e==null||e<=0)return-1;let t=0;for(;t<F.length&&e>=F[t];)t++;return t}function Ve(e){const t=w(),n=Ge(e);return n<0?t.empty:t.bands[n]}function jt(e){const t=Ge(e);return t<0?2:Pt[t]}const ue={dark:["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"],light:["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"]},Mt=ue.dark.length;function Ot(e){const t=R()?ue.light:ue.dark;return t[e%t.length]}const V=[{id:"edu",name:"חינוך",test:/ספר|גנ[יי]? ילדים|חינוך|לימוד/},{id:"health",name:"בריאות",test:/רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/},{id:"sport",name:"ספורט ופנאי",test:/ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/},{id:"comm",name:"קהילה ותרבות",test:/קהיל|תרבות|מתנ״?ס/},{id:"relig",name:"דת",test:/כנסת|דת|מסגד|כנסי/},{id:"other",name:"אחר",test:/.^/}],Pe={dark:{edu:"#3987e5",health:"#d95926",sport:"#199e70",comm:"#c98500",relig:"#d55181",other:"#9085e9"},light:{edu:"#2a78d6",health:"#eb6834",sport:"#1baf7a",comm:"#eda100",relig:"#e87ba4",other:"#4a3aa7"}};function At(e){return(V.find(n=>n.test.test(e||""))||V[V.length-1]).id}function qe(e){return(R()?Pe.light:Pe.dark)[e]}const je={dark:["#115e59","#0f766e","#0d9488","#14b8a6","#5eead4"],light:["#14b8a6","#0d9488","#0f766e","#115e59","#0b3d39"]};function Q(){return R()?je.light:je.dark}const K=L.layerGroup(),fe=L.layerGroup(),Y=[];let I=null;function Ue(e){const t=u.day==="avg"?[0,1,2,3,4]:[u.day],n=u.period==="all"?[0,1,2,3,4,5,6]:[u.period];let s=0,o=0;for(const a of t)for(const i of n){const r=e[a*7+i];r&&r>0&&(s+=r,o++)}return o?s/o:null}function Je(){K.clearLayers(),Y.length=0;const e=w();for(const t of l.segments){const n=L.polyline(t.coordinates,{color:e.empty,weight:3,opacity:.9});n._speeds=t.speeds,n.on("mouseover",function(){this.setStyle({weight:(this._w||3)+3})}),n.on("mouseout",function(){this.setStyle({weight:this._w||3})}),n.on("click",function(){const s=Ue(this._speeds),o=this.getLatLngs()[Math.floor(this.getLatLngs().length/2)];L.popup().setLatLng(o).setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${s?s.toFixed(1):"—"} קמ״ש</b></div>`).openOn(m)}),Y.push(n),K.addLayer(n)}Ke()}function Ke(){I=u.area?new Set(Y.filter(e=>Ct(e,u.area))):null}function Ft(){fe.clearLayers();const e=w();let t=0,n=0,s=0;for(const o of Y){const a=Ue(o._speeds),i=jt(a);o._w=i,o.setStyle({color:Ve(a),opacity:a==null?.5:.9,weight:i}),a!=null&&(I&&!I.has(o)||(t+=a,n++,a<He&&(s++,fe.addLayer(L.polyline(o.getLatLngs(),{color:e.cong,weight:8,opacity:.35})))))}return{avgSpeed:n?t/n:null,congestedPct:n?Math.round(s/n*100):null,segmentCount:I?I.size:l.segments.length}}function Bt({speed:e,cong:t}){J(K,e),J(fe,t)}const z=["בוקר מוקדם","שעות הבוקר","לפני הצהריים","צהריים","אחר הצהריים","שעת שיא ערב","ערב / לילה"],he=["≈05–07","≈07–09","≈09–12","≈12–15","≈15–17","≈17–19","≈19–24"],Rt=["ראשון","שני","שלישי","רביעי","חמישי"],q=["א׳","ב׳","ג׳","ד׳","ה׳"];function $(e,t=0){return e==null?"—":(+e).toLocaleString("he-IL",{minimumFractionDigits:t,maximumFractionDigits:t})}function It(e){return e==="avg"?"ממוצע ימי חול (א׳–ה׳)":"יום "+Rt[e]}function Ye(e){return e==="all"?"כל שעות היום":z[e]+" "+he[e]}function k(e){return String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}const ge=L.layerGroup();function Ze(e){var n;const t=(n=l.destinations)==null?void 0:n.categories[e];return At(t==null?void 0:t.name)}function We(e){return qe(Ze(e))}function Z(){var n;if(!l.destinations)return;ge.clearLayers();const e=l.destinations.categories,t=w().hairline;for(const[s,o,a,i,r]of l.destinations.points){if(u.destCats&&!u.destCats.has(s)||u.area&&!ke(o,a,u.area))continue;const p=k(i||"(ללא שם)"),d=k(((n=e[s])==null?void 0:n.name)||""),f=r?" · "+k(r):"";L.circleMarker([o,a],{pane:"pointPane",radius:3,color:t,weight:.75,fillColor:We(s),fillOpacity:.9}).bindPopup(`<div dir="rtl" style="text-align:right"><b>${p}</b><br><span style="opacity:.75">${d}${f}</span></div>`).addTo(ge)}}function zt(e){J(ge,e)}const be=L.layerGroup(),ve=new Map;let Xe=()=>{};const E={visible:[],breaks:[],selected:null};function W(e){return`${e.code}@${e.lat},${e.lon}`}function Nt(e){Xe=e}function Dt(e){const t=e.map(s=>s.boardings_day).filter(s=>s!=null).sort((s,o)=>s-o);if(!t.length)return[];const n=Q();return Array.from({length:n.length-1},(s,o)=>t[Math.floor(t.length*(o+1)/n.length)])}function Ht(e){if(e==null)return null;const t=Q();let n=0;for(;n<E.breaks.length&&e>E.breaks[n];)n++;return t[n]}function Gt(e,t){return e==null||!t?3:3.5+9*Math.sqrt(e/t)}function Ee(){if(!l.stops)return;be.clearLayers(),ve.clear(),E.visible=l.stops.stations.filter(s=>!u.area||ke(s.lat,s.lon,u.area)),E.breaks=Dt(E.visible);const e=E.visible.reduce((s,o)=>Math.max(s,o.boardings_day||0),0),t=w(),n=t.empty;for(const s of E.visible){const o=Ht(s.boardings_day),a=L.circleMarker([s.lat,s.lon],{pane:"pointPane",radius:Gt(s.boardings_day,e),color:o?t.hairline:n,weight:o?1:1.5,fillColor:o||"transparent",fillOpacity:o?.9:0});a._stroke=o?t.hairline:n,a._weight=o?1:1.5,a.bindTooltip(`<div dir="rtl" style="text-align:right"><b>${k(s.name)}</b><br>`+(s.boardings_day!=null?`${$(s.boardings_day)} עליות ביום`:"ללא נתוני סקר")+"</div>",{direction:"top",opacity:.95}),a.on("click",()=>Qe(s)),a.addTo(be),ve.set(W(s),a)}E.selected&&_e()}function _e(){const e=w().selected;for(const[t,n]of ve){const s=E.selected&&t===W(E.selected);n.setStyle({color:s?e:n._stroke,weight:s?2.5:n._weight}),s&&n.bringToFront()}}function Qe(e){E.selected=e,_e(),Xe(e)}function Me(){E.selected=null,_e()}function Vt(e){J(be,e)}const qt={5:"דן",3:"אגד",16:"מטרופולין",18:"קווים",14:"נסיעות",42:"גלים",91:"רכבת",7:'דן בי"ש',15:"קווים"};function et(e){return qt[String(e)]||`סוכנות ${e}`}const N=L.layerGroup(),M=new Map,oe=new Map;let Oe=0;function Se(e){return oe.has(e)||(oe.set(e,Oe%Mt),Oe++),Ot(oe.get(e))}function Ut(e){return M.has(e)}function tt(e){var o;if(M.has(e.route_id)||!((o=e.coordinates)!=null&&o.length))return;const t=Se(e.route_id),n=L.polyline(e.coordinates,{pane:"routeCasingPane",color:w().casing,weight:8,opacity:.85,smoothFactor:1.2}),s=L.polyline(e.coordinates,{pane:"routeLinePane",color:t,weight:4.5,opacity:1,smoothFactor:1.2});s.bindTooltip(`קו ${e.route_short_name} · ${et(e.agency_id)}<br><small>${e.route_long_name||""}</small>`,{sticky:!0,direction:"top"}),n.addTo(N),s.addTo(N),M.set(e.route_id,{stroke:s,casing:n})}function st(e){const t=M.get(e);t&&(N.removeLayer(t.stroke),N.removeLayer(t.casing),M.delete(e))}function Jt(e){M.has(e.route_id)?st(e.route_id):tt(e)}function ie(){for(const e of[...M.keys()])st(e)}function Kt(){const e=w().casing;for(const[t,n]of M)n.stroke.setStyle({color:Se(t)}),n.casing.setStyle({color:e})}function Yt(e){N.addTo(e||m)}const Zt={togeojson:"https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js",shp:"https://unpkg.com/shpjs@6.2.0/dist/shp.js",jszip:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"},G=new Map;function Wt(e){return G.has(e)||G.set(e,new Promise((t,n)=>{const s=document.createElement("script");s.src=e,s.onload=t,s.onerror=()=>{G.delete(e),n(new Error(`failed to load ${e}`))},document.head.appendChild(s)})),G.get(e)}function Ae(...e){return Promise.all(e.map(t=>Wt(Zt[t])))}const Xt=/\.(geojson|json|kml|zip)$/i,B=[];let ee=()=>{};function Qt(e){ee=e}function nt(e){return{color:e,weight:2,opacity:.9,fillOpacity:.15}}function re(e,t){const n=w().imported,s=L.geoJSON(e,{style:nt(n),pointToLayer:(o,a)=>L.circleMarker(a,{radius:6,color:n,weight:2,fillColor:n,fillOpacity:.8}),onEachFeature:(o,a)=>{if(!o.properties)return;const i=Object.entries(o.properties).filter(([,r])=>r!=null).map(([r,p])=>`<tr><td style="color:var(--ink3);padding-left:8px">${k(r)}</td><td>${k(p)}</td></tr>`).join("");i&&a.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${i}</table>`)}}).addTo(m);try{m.fitBounds(s.getBounds(),{padding:[30,30]})}catch{}B.push({layer:s,name:t,visible:!0}),ee()}const le=(e,t)=>new Promise((n,s)=>{const o=new FileReader;o.onload=a=>n(a.target.result),o.onerror=()=>s(o.error),o[t](e)});async function Fe(e){const t=e.name.replace(/\.[^.]+$/,""),n=e.name.split(".").pop().toLowerCase();try{if(n==="kml"){const[s]=await Promise.all([le(e,"readAsText"),Ae("togeojson")]);re(toGeoJSON.kml(new DOMParser().parseFromString(s,"text/xml")),t)}else if(n==="zip"){const[s]=await Promise.all([le(e,"readAsArrayBuffer"),Ae("jszip","shp")]),o=await JSZip.loadAsync(s),a=Object.values(o.files).filter(h=>!h.dir),i=a.find(h=>/\.shp$/i.test(h.name)),r=a.find(h=>/\.dbf$/i.test(h.name)),p=a.find(h=>/\.prj$/i.test(h.name));if(!i||!r){alert("קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)");return}const[d,f,b]=await Promise.all([i.async("arraybuffer"),r.async("arraybuffer"),p?p.async("string"):Promise.resolve(null)]);re(shp.combine([shp.parseShp(d,b),shp.parseDbf(f)]),t)}else n==="geojson"||n==="json"?re(JSON.parse(await le(e,"readAsText")),t):alert(`סוג קובץ לא נתמך: .${n}
ניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`)}catch(s){console.error("[Import] failed:",s),alert(`שגיאה בייבוא ${e.name}: ${s.message}`)}}function es(e){const t=B[e];t&&(t.visible=!t.visible,t.visible?m.addLayer(t.layer):m.removeLayer(t.layer),ee())}function ts(e){const t=B[e];t&&(m.removeLayer(t.layer),B.splice(e,1),ee())}function ss(){const e=w().imported;for(const{layer:t}of B)t.setStyle(n=>n instanceof L.CircleMarker?{color:e,weight:2,fillColor:e,fillOpacity:.8}:nt(e))}const me=L.layerGroup();let T=null;function at(e={}){return{color:w().focus,opacity:.7,fill:!1,dashArray:"4 4",...e}}function ot(e){me.clearLayers(),e&&L.geoJSON(e,{style:at({weight:2,opacity:.75,dashArray:"6 4"})}).addTo(me)}function it(e){if(rt(),!e)return null;const t=at({pane:"neighHighlightPane",weight:1.5});if(e.boundary)T=L.geoJSON(e.boundary,{style:t}),T.bindTooltip(e.name);else{const n=e.bbox;T=L.rectangle([[n.min_lat,n.min_lon],[n.max_lat,n.max_lon]],t),T.bindTooltip(`${e.name} (אזור משוער — אין גבול מדויק בנתונים)`)}return T.addTo(m),T.getBounds()}function rt(){T&&(m.removeLayer(T),T=null)}const ns='<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>',as='<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>';function os(){const e=_`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${ns}${as}</button>
      </div>
    </header>`;return g(e,"#themeToggle").addEventListener("click",vt),{el:e}}const is=[{id:"avg",label:"מהירות אוטובוס ממוצעת",unit:"קמ״ש",tint:"var(--ramp)",note:"ממוצע כל היום"},{id:"cong",label:"מקטעים בגודש",unit:"% מהרשת",tint:"var(--c-cong)",tone:"var(--c-cong)",note:"מתחת ל־15 קמ״ש"},{id:"seg",label:"מקטעי כביש בניתוח",unit:"",tint:"var(--c-net)",note:"ברחבי העיר"},{id:"board",label:"עליות לאוטובוס ביום",unit:"",tint:"var(--c-ride)",tone:"var(--c-ride)",note:"סקר תחנות"}];function rs(){const e=_`
    <div class="kpis">
      ${is.map(s=>`
        <div class="kpi" style="--tint:${s.tint}${s.tone?`;--tone:${s.tone}`:""}">
          <div class="k">${s.label}</div>
          <div class="row">
            <span class="v" data-v="${s.id}">—</span>
            ${s.unit?`<span class="u">${s.unit}</span>`:""}
          </div>
          <div class="d" data-d="${s.id}">${s.note}</div>
        </div>`).join("")}
    </div>`,t=s=>g(e,`[data-v="${s}"]`),n=s=>g(e,`[data-d="${s}"]`);return{el:e,setLoading(s="טוען…"){t("avg").textContent=s,t("seg").textContent=s},setSpeedStats({avgSpeed:s,congestedPct:o,segmentCount:a},i){t("avg").textContent=s==null?"—":s.toFixed(1),t("cong").textContent=o??"—",a&&(t("seg").textContent=$(a)),n("avg").textContent=Ye(i)},setScope(s){n("seg").textContent=s?`בגבולות ${s}`:"ברחבי העיר"},setSegmentError(s){t("seg").textContent=s},setRidership(s,o){s!=null&&s.transit?(t("board").textContent=$(s.transit.boardings_day),n("board").textContent=`${$(s.transit.surveyed)} תחנות · ${s.name}`):s?(t("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${s.name}`):o&&(t("board").textContent=$(o.boardings_day),n("board").textContent=`${$(o.surveyed)} תחנות מסוקרות · כל העיר`)}}}const Be="▶ הרצת יום",ls="⏸ עצור",cs=1100;function ds({onReset:e}={}){const t=_`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${Be}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`,n=g(t,".days"),s=g(t,".periods"),o=g(t,".allp"),a=g(t,".spark"),i=g(t,"[data-play]");let r=null;q.forEach((h,y)=>{const c=_`<div class="day">${h}</div>`;c.addEventListener("click",()=>S({day:y})),n.appendChild(c)});const p=_`<div class="day avg">ממוצע</div>`;p.addEventListener("click",()=>S({day:"avg"})),n.appendChild(p),z.forEach((h,y)=>{const c=_`
      <div class="prow">
        <span class="pn">P${y+1}</span>
        <span class="pl">${h}</span>
        <span class="pt">${he[y]}</span>
      </div>`;c.addEventListener("click",()=>S({period:y})),s.appendChild(c)}),o.addEventListener("click",()=>S({period:"all"}));function d(){r&&(clearInterval(r),r=null,i.textContent=Be)}i.addEventListener("click",()=>{if(r){d();return}i.textContent=ls,S({period:0});let h=0;r=setInterval(()=>{h=(h+1)%z.length,S({period:h})},cs)}),g(t,"[data-reset]").addEventListener("click",()=>{d(),S({day:"avg",period:"all"}),e==null||e()});function f(){if(a.replaceChildren(),!l.speedProfile)return;const h=l.speedProfile.filter(c=>c!=null),y=h.length?Math.max(...h):1;l.speedProfile.forEach((c,v)=>{const x=c==null?0:c/y*100,C=_`
        <div class="spk" title="${z[v]} ${he[v]}${c==null?" · אין נתונים":` · ${c.toFixed(1)} קמ״ש`}">
          <span class="val">${c==null?"—":c.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${x}%;background:${Ve(c)}"></span></span>
          <span class="lab">P${v+1}</span>
        </div>`;C.addEventListener("click",()=>S({period:v})),a.appendChild(C)}),b()}function b(){[...n.children].forEach((h,y)=>{h.classList.toggle("on",y<q.length&&u.day===y||y===q.length&&u.day==="avg")}),[...s.children].forEach((h,y)=>h.classList.toggle("on",u.period===y)),o.classList.toggle("on",u.period==="all"),[...a.children].forEach((h,y)=>h.classList.toggle("on",u.period===y))}return b(),{el:t,sync:b,buildSpark:f,stopPlaying:d}}const ps=[{key:"speed",label:"רשת מהירויות אוטובוס",tint:"var(--ramp)",swatch:null},{key:"cong",label:"מוקדי גודש (&lt;15 קמ״ש)",tint:"var(--c-cong)",swatch:"background:var(--sp1)"},{key:"dest",label:"מוקדי שירות ותעסוקה",tint:"var(--c-place)",swatch:"multi"},{key:"stops",label:"תחנות ועליות",tint:"var(--c-ride)",swatch:"background:var(--primary)"}];function us(){const e=_`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${ps.map(i=>`
        <div class="toggle${u.layers[i.key]?" on":""}" data-layer="${i.key}" style="--tint:${i.tint}">
          <span class="sw"></span>
          ${i.swatch==="multi"?'<span class="tc tc-multi"></span>':i.swatch?`<span class="tc" style="${i.swatch}"></span>`:""}
          <span class="tl">${i.label}</span>
        </div>
        ${i.key==="dest"?'<div class="dest-cats" hidden></div>':""}
        ${i.key==="stops"?'<div id="stopsLegend" class="legend" hidden></div>':""}`).join("")}
    </div>`,t=g(e,".dest-cats"),n=g(e,"#stopsLegend");e.querySelectorAll(".toggle").forEach(i=>{i.addEventListener("click",()=>{const r=i.dataset.layer;u.layers[r]=!u.layers[r],i.classList.toggle("on",u.layers[r]),ze(["layers"])})});function s(){if(!l.destinations)return;const i=r=>l.destinations.categories.filter(p=>Ze(p.id)===r.id).map(p=>`
        <label class="dest-cat" title="${k(p.name)}">
          <input type="checkbox" data-cat="${p.id}" ${!u.destCats||u.destCats.has(p.id)?"checked":""}>
          <span class="dest-dot" style="background:${We(p.id)}"></span>
          <span class="dest-name">${k(p.name)}</span>
          <span class="dest-count">${$(p.count)}</span>
        </label>`).join("");t.innerHTML=V.map(r=>{const p=i(r);return p?`<div class="dest-group">
                <span class="dest-dot" style="background:${qe(r.id)}"></span>${r.name}
              </div>${p}`:""}).join(""),t.querySelectorAll("input[data-cat]").forEach(r=>{r.addEventListener("change",()=>{S({destCats:new Set([...t.querySelectorAll("input[data-cat]:checked")].map(p=>+p.dataset.cat))})})})}function o(){if(!l.stops)return;const i=Q(),r=E.visible.filter(d=>d.boardings_day!=null).length,p=i.map((d,f)=>{const b=f===0?0:E.breaks[f-1],h=f<E.breaks.length?E.breaks[f]:null,y=h==null?`${$(b)}+`:`${$(b)}–${$(h)}`;return`<div class="lg"><span style="background:${d}"></span> ${y}</div>`}).join("");n.innerHTML=`
      <div class="stops-legend-title">עליות ליום · ${$(r)} תחנות עם נתוני סקר</div>
      ${p}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`}function a(){t.hidden=!u.layers.dest,n.hidden=!u.layers.stops}return a(),{el:e,renderCategories:s,renderStopsLegend:o,syncPanels:a}}const fs=["גודש קשה","גודש","איטי","זורם","מהיר / נתיב מהיר"];function hs(){const e=fs.map((s,o)=>{const a=o===0?0:F[o-1],i=o<F.length?F[o]:null,r=i==null?`${a}+`:`${a}–${i}`;return`<span style="background:var(--sp${o+1})" title="${r} קמ״ש · ${s}"></span>`}).join(""),t=["0",...F.map(String),"+"].map(s=>`<i>${s}</i>`).join("");return{el:_`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${e}</div>
      <div class="ramp-ticks">${t}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${He} קמ״ש</b>.
      </div>
    </div>`}}function gs({onAreaChange:e}={}){const t=_`
    <div class="block" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-select-wrap">
        <select class="neigh-select" aria-label="בחירת שכונה">
          <option value="">כל העיר — ללא סינון</option>
        </select>
      </div>

      <div class="neigh-routes" hidden>
        <div class="neigh-header"></div>
        <div class="neigh-stats" hidden></div>

        <h3 style="--tint:var(--c-net)">קווי אוטובוס באזור</h3>

        <div class="neigh-actions">
          <button class="btn ghost" data-all>בחר הכל</button>
          <button class="btn ghost" data-clear>נקה</button>
        </div>

        <div class="neigh-loading" hidden><span class="neigh-spinner"></span> טוען קווים…</div>
        <div class="neigh-route-count"></div>
        <div class="lines-scroll" style="max-height:240px"><ul class="lines"></ul></div>
      </div>
    </div>`,n=g(t,".neigh-select"),s=g(t,".neigh-routes"),o=g(t,".neigh-header"),a=g(t,".neigh-stats"),i=g(t,".neigh-loading"),r=g(t,".neigh-route-count"),p=g(t,".lines");let d=[];function f(c){const v=c==null?void 0:c.population;if(!(v!=null&&v.total)){a.hidden=!0,a.replaceChildren();return}const x=v.by_age||{},C=(...ae)=>ae.reduce((ft,ht)=>ft+(x[ht]||0),0),we=ae=>v.total?Math.round(ae/v.total*100):0;a.innerHTML=`
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${$(v.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${we(C("g0to9","g10to19"))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${we(C("g60to69","g70to79","g80up"))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`,a.hidden=!1}function b(){p.replaceChildren();for(const c of d){const v=Ut(c.route_id),x=Se(c.route_id),C=_`
        <li class="${v?"neigh-active":""}">
          <span class="num" style="background:${v?x:`color-mix(in srgb, ${x} 20%, transparent)`};color:${v?"#fff":x}">${k(c.route_short_name||"?")}</span>
          <span class="desc" title="${k(c.route_long_name||"")}">${k(c.route_long_name||"ללא תיאור")}</span>
          <span class="ag">${k(et(c.agency_id))}</span>
          ${v?`<span class="neigh-color-dot" style="background:${x}"></span>`:""}
        </li>`;C.addEventListener("click",()=>{Jt(c),b()}),p.appendChild(C)}}g(t,"[data-all]").addEventListener("click",()=>{d.forEach(c=>tt(c)),b()}),g(t,"[data-clear]").addEventListener("click",()=>{ie(),b()}),n.addEventListener("change",async()=>{ie(),d=[],b();const c=l.neighbourhoods.find(v=>v.id===n.value)||null;if(!c){s.hidden=!0,S({area:null,areaName:null,areaRecord:null}),e==null||e(null);return}s.hidden=!1,i.hidden=!1,r.textContent="",S({area:{bbox:c.bbox,boundary:c.boundary},areaName:c.name,areaRecord:c}),e==null||e(c),f(c);try{const v=await xt();d=(c.route_ids||[]).map(x=>v[x]).filter(Boolean)}catch(v){console.error("[AreaPanel] failed to load the route index:",v),i.hidden=!0,o.textContent=`שגיאה: ${v.message}`;return}i.hidden=!0,o.innerHTML=`<b>${k(c.name)}</b> · ${$(d.length)} קווים פעילים ב-GTFS`,r.textContent=d.length?`${$(d.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`:"לא נמצאו קווים באזור זה",b()});async function h(){try{const c=await _t();n.append(...c.map(v=>new Option(v.name,v.id)))}catch(c){console.error("[AreaPanel] failed to load neighbourhoods.json:",c)}}function y(){ie(),b()}return{el:t,load:h,renderRoutes:b,clearRoutes:y}}function bs({dropTarget:e}={}){const t=_`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`,n=g(t,"input[type=file]"),s=g(t,".imported-list");n.addEventListener("change",()=>{[...n.files].forEach(Fe),n.value=""});function o(){s.replaceChildren(),B.forEach((a,i)=>{const r=_`
        <li class="imported-item${a.visible?" on":""}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${k(a.name)}">${k(a.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;g(r,".sw").addEventListener("click",()=>es(i)),g(r,".imported-remove").addEventListener("click",()=>ts(i)),s.appendChild(r)})}if(Qt(o),e){let a=0;e.addEventListener("dragenter",i=>{i.preventDefault(),++a===1&&e.classList.add("drop-active")}),e.addEventListener("dragover",i=>i.preventDefault()),e.addEventListener("dragleave",()=>{--a<=0&&(a=0,e.classList.remove("drop-active"))}),e.addEventListener("drop",i=>{i.preventDefault(),a=0,e.classList.remove("drop-active"),[...i.dataTransfer.files].filter(r=>Xt.test(r.name)).forEach(Fe)})}return{el:t,renderList:o}}const vs={ADULT:"בוגר",YOUTH:"נוער",ELDERLY:"קשיש",STUDENT:"סטודנט",DISABLED:"נכה",OTHER:"אחר"};function P(e,t,n){return`<div class="stop-tile">
            <div class="stop-tile-val"${n?` style="color:${n}"`:""}>${e}</div>
            <div class="stop-tile-lbl">${t}</div>
          </div>`}function ms(e){const t=e.reduce((n,s)=>n+s,0);return t>0?e.map(n=>n/t*100):e.map(()=>0)}function Re(e,t,n){const s=Math.max(...t),o=t.indexOf(s),a=Q(),i=t.reduce((d,f)=>d+f,0),r=s>=1e4?d=>(+d).toLocaleString("he-IL",{notation:"compact",maximumFractionDigits:1}):d=>$(d);return`<div class="bands">${t.map((d,f)=>{const b=s>0?Math.max(2,Math.round(d/s*46)):2,h=i>0?d/i*100:0;return`
      <div class="band ${f===o?"peak":""}" title="${e[f]} · ${$(d,1)} ${n} (${h.toFixed(0)}%)">
        <div class="band-val">${r(d)}</div>
        <div class="band-bar" style="height:${b}px;background:${f===o?a[a.length-1]:a[2]}"></div>
        <div class="band-lbl">${e[f]}</div>
      </div>`}).join("")}</div>`}function Ie(e,t){const n=ms(t);return`<div class="riders">${e.map((o,a)=>({label:vs[o]||o,pct:n[a],value:t[a]})).sort((o,a)=>a.pct-o.pct).map(o=>`
      <div class="rider" title="${o.label} · ${$(o.value,1)} עליות ביום">
        <span class="rider-lbl">${o.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${o.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${o.pct.toFixed(0)}%</span>
      </div>`).join("")}</div>`}function ys(){const e=_`<div id="stopPanel" dir="rtl"></div>`;function t(){Me(),e.style.display="none"}function n(a){const i=l.stops.bands,r=a.boardings_day!=null,p=r?i[a.boardings_by_band.indexOf(Math.max(...a.boardings_by_band))]:null,d=[a.street,a.house||""].filter(Boolean).join(" ");return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${k(a.name)}</div>
        <div class="stop-sub">מק״ט ${k(a.code)} · ${a.routes.length||a.routes_reported||0} קווים${d?" · "+k(d):""}</div>
      </div>

      <div class="stop-tiles">
        ${P($(a.departures_day),"עצירות מתוזמנות ביום")}
        ${P(r?$(a.boardings_day):"—","עליות ביום","var(--primary)")}
        ${P(a.transfer_pct!=null?a.transfer_pct.toFixed(0)+"%":"—","% נסיעות מעבר")}
        ${P($(a.routes.length||a.routes_reported),"קווים")}
      </div>

      ${a.routes.length?`
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${a.routes.map(f=>`<span class="chip">${k(f)}</span>`).join("")}</div>`:""}

      ${r?`
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${Re(i,a.boardings_by_band,"עליות")}

        <div class="stop-sec">פילוח נוסעים</div>
        ${Ie(l.stops.rider_types,a.riders)}

        <div class="stop-tiles">
          ${P(a.trips_to_dest!=null?a.trips_to_dest.toFixed(2):"—","נסיעות ממוצע ליעד")}
          ${P(p,"שעת שיא","var(--primary)")}
        </div>`:`
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${k(l.stops.source)}</div>`}function s(){const a=E.visible.filter(f=>f.boardings_day!=null),i=l.stops.bands.map((f,b)=>a.reduce((h,y)=>h+(y.boardings_by_band?y.boardings_by_band[b]:0),0)),r=l.stops.rider_types.map((f,b)=>a.reduce((h,y)=>h+(y.riders?y.riders[b]:0),0)),p=a.reduce((f,b)=>f+b.boardings_day,0),d=[...a].sort((f,b)=>b.boardings_day-f.boardings_day).slice(0,5);return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${u.area?"בשכונה הנבחרת":"ברחבי העיר"}</div>
        <div class="stop-sub">${$(E.visible.length)} תחנות · ${$(a.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${P($(p),"עליות ביום","var(--primary)")}
        ${P($(a.reduce((f,b)=>f+(b.departures_day||0),0)),"עצירות ביום")}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${Re(l.stops.bands,i,"עליות")}

      <div class="stop-sec">פילוח נוסעים</div>
      ${Ie(l.stops.rider_types,r)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${d.map(f=>`
          <button class="stop-top-row" data-key="${k(W(f))}">
            <span class="stop-top-name">${k(f.name)}</span>
            <span class="stop-top-val">${$(f.boardings_day)}</span>
          </button>`).join("")}
      </div>
      <div class="stop-src">${k(l.stops.source)}</div>`}function o(){var a;l.stops&&(e.style.display="block",e.scrollTop=0,e.innerHTML=E.selected?n(E.selected):s(),e.querySelector(".stop-close").addEventListener("click",t),(a=e.querySelector(".stop-link"))==null||a.addEventListener("click",()=>{Me(),o()}),e.querySelectorAll(".stop-top-row").forEach(i=>{i.addEventListener("click",()=>{const r=E.visible.find(p=>W(p)===i.dataset.key);r&&(Qe(r),m.setView([r.lat,r.lon],Math.max(m.getZoom(),16)))})}))}return{el:e,render:o,close:t,refresh(){e.style.display==="block"&&o()}}}function $s(){const e=_`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`,t=g(e,".now"),n=g(e,".lbl");return{el:e,update({day:s,period:o}){const a=s==="avg"?"ממוצע":q[s],i=o==="all"?"כל היום":z[o];t.textContent=`${a} · ${i}`,n.textContent=`${It(s)} · ${Ye(o)}`}}}const lt=document.getElementById("app"),te=_`
  <div class="shell" style="display:contents">
    <aside></aside>
    <div id="mapwrap"><div id="map"></div></div>
  </div>`;lt.appendChild(te);const Ls=g(te,"aside"),ct=g(te,"#mapwrap"),dt=g(te,"#map");$t(dt);const ks=os(),j=rs(),pt=$s(),D=ys(),se=gs({onAreaChange:Ss}),ne=ds({onReset:ws}),A=us(),Es=hs(),_s=bs({dropTarget:ct});lt.prepend(ks.el);ct.prepend(j.el);dt.append(pt.el,D.el);Ls.append(se.el,ne.el,A.el,Es.el,_s.el);me.addTo(m);K.addTo(m);Yt(m);Nt(()=>D.render());function X(){j.setSpeedStats(Ft(),u.period),pt.update(u)}function ut(){Bt(u.layers),zt(u.layers.dest),Vt(u.layers.stops),A.syncPanels(),u.layers.dest&&St().then(()=>{A.renderCategories(),Z()}).catch(e=>console.error("[Destinations] failed to load:",e)),u.layers.stops?wt().then(()=>{Ee(),A.renderStopsLegend()}).catch(e=>console.error("[Stops] failed to load:",e)):D.close()}gt((e,t)=>{(t.has("day")||t.has("period"))&&(ne.sync(),X()),t.has("layers")&&ut(),t.has("destCats")&&l.destinations&&Z(),t.has("area")&&(Ke(),j.setScope(e.areaName),X(),l.destinations&&e.layers.dest&&Z(),l.stops&&(Ee(),A.renderStopsLegend(),D.refresh()),j.setRidership(e.areaRecord,l.stopTotals))});function Ss(e){if(!e){rt();return}const t=it(e);t&&m.fitBounds(t,{padding:[30,30]})}function ws(){se.clearRoutes(),m.setView(l.center||$e,15)}mt(()=>{Lt(),Je(),X(),ne.buildSpark(),ot(l.border),u.areaRecord&&it(u.areaRecord),Kt(),se.renderRoutes(),ss(),l.destinations&&(A.renderCategories(),Z()),l.stops&&(Ee(),A.renderStopsLegend(),D.refresh())});async function xs(){j.setLoading(),se.load();const{segmentsFailed:e}=await Et();ot(l.border),l.center&&m.setView(l.center,13),Je(),ne.buildSpark(),X(),j.setRidership(null,l.stopTotals),ut(),e&&j.setSegmentError("שגיאת נתונים")}xs().catch(e=>{console.error("Dashboard failed to start",e),j.setSegmentError("שגיאת רשת")});
