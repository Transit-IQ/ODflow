(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();function E(e,...t){const n=e.reduce((o,a,i)=>o+a+(t[i]??""),""),s=document.createElement("template");return s.innerHTML=n.trim(),s.content.firstElementChild}function g(e,t){return e.querySelector(t)}const u={day:"avg",period:"all",layers:{speed:!0,cong:!1,dest:!1,stops:!1},destCats:null,area:null,areaName:null,areaRecord:null},de=new Set;function x(e){Object.assign(u,e),He(Object.keys(e))}function He(e){const t=new Set(e);for(const n of de)n(u,t)}function vt(e){return de.add(e),()=>de.delete(e)}const yt="theme",pe=new Set;function $e(){return document.documentElement.dataset.theme==="light"?"light":"dark"}function F(){return $e()==="light"}function $t(){const e=F()?"dark":"light";document.documentElement.dataset.theme=e;try{localStorage.setItem(yt,e)}catch{}for(const t of pe)t(e)}function Lt(e){return pe.add(e),()=>pe.delete(e)}const q={dark:{base:"https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"},light:{base:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}},_t={neighHighlightPane:350,routeCasingPane:405,routeLinePane:410,pointPane:420},Le=[32.08,34.78];let m=null,Ge=null,ue=null;function kt(e){m=L.map(e,{zoomControl:!1,attributionControl:!1,preferCanvas:!0}).setView(Le,15),L.control.zoom({position:"topright"}).addTo(m);const t=$e();Ge=L.tileLayer(q[t].base,{maxZoom:19,subdomains:"abcd",className:"basemap"}).addTo(m),ue=L.tileLayer(q[t].labels,{maxZoom:19,subdomains:"abcd",opacity:Ke()}).addTo(m);for(const[n,s]of Object.entries(_t))m.createPane(n).style.zIndex=String(s);return m}function Ke(){return F()?.8:.7}function Et(){const e=$e();Ge.setUrl(q[e].base),ue.setUrl(q[e].labels),ue.setOpacity(Ke())}function Y(e,t){t?m.hasLayer(e)||m.addLayer(e):m.hasLayer(e)&&m.removeLayer(e)}const St=e=>`/ODflow/data/${e}`,l={center:Le,border:null,segments:[],speedProfile:null,stopTotals:null,destinations:null,stops:null,neighbourhoods:[],routesById:null};async function j(e){const t=await fetch(St(e));if(!t.ok)throw new Error(`${e}: HTTP ${t.status}`);return t.json()}async function wt(){var s,o,a;const[e,t,n]=await Promise.allSettled([j("border.json"),j("speeds.json"),j("kpis.json")]);if(e.status==="fulfilled"){l.border=e.value;const i=(a=(o=(s=e.value)==null?void 0:s.geometry)==null?void 0:o.coordinates)==null?void 0:a[0];if(i!=null&&i.length){const r=i.map(c=>c[1]),d=i.map(c=>c[0]);l.center=[(Math.min(...r)+Math.max(...r))/2,(Math.min(...d)+Math.max(...d))/2]}}return t.status==="fulfilled"&&(l.segments=t.value),n.status==="fulfilled"&&(l.speedProfile=n.value.speed_profile||null,l.stopTotals=n.value.stops||null),{segmentsFailed:t.status==="rejected"}}async function xt(){return l.neighbourhoods.length||(l.neighbourhoods=await j("neighbourhoods.json")),l.neighbourhoods}const G=new Map;function _e(e,t){return G.has(e)||G.set(e,t().catch(n=>{throw G.delete(e),n})),G.get(e)}function Ct(){return _e("destinations",async()=>(l.destinations=await j("destinations.json"),l.destinations))}function Tt(){return _e("stops",async()=>(l.stops=await j("stops.json"),l.stops))}function Pt(){return _e("routes",async()=>(l.routesById=await j("neighbourhood_routes.json"),l.routesById))}function Ce(e,t,n){let s=!1;for(let o=0,a=n.length-1;o<n.length;a=o++){const i=n[o][0],r=n[o][1],d=n[a][0],c=n[a][1];r>e!=c>e&&t<(d-i)*(e-r)/(c-r)+i&&(s=!s)}return s}function Te(e,t,n){if(!Ce(e,t,n[0]))return!1;for(let s=1;s<n.length;s++)if(Ce(e,t,n[s]))return!1;return!0}function Ot(e,t,n){return n?n.type==="Polygon"?Te(e,t,n.coordinates):n.type==="MultiPolygon"?n.coordinates.some(s=>Te(e,t,s)):!1:!1}function ke(e,t,n){const s=n.bbox;return e<s.min_lat||e>s.max_lat||t<s.min_lon||t>s.max_lon?!1:n.boundary?Ot(e,t,n.boundary):!0}function Mt(e,t){for(const n of e.getLatLngs())if(ke(n.lat,n.lng,t))return!0;return!1}const I=[8,15,22,30],jt=[5,4,3.25,2.75,2.5],Ve=15,Pe={dark:{bands:["#e11d48","#f97316","#facc15","#34d399","#60a5fa"],empty:"#3d4a63",cong:"#fb7185",focus:"#2dd4bf",imported:"#38bdf8",casing:"#0b1220",hairline:"#0b0b0b",selected:"#ffffff"},light:{bands:["#e11d48","#9a3412","#ca8a04","#15803d","#1d4ed8"],empty:"#cbd5e1",cong:"#be123c",focus:"#0f766e",imported:"#1d4ed8",casing:"#ffffff",hairline:"#ffffff",selected:"#0f1f3e"}};function C(){return F()?Pe.light:Pe.dark}function Ue(e){if(e==null||e<=0)return-1;let t=0;for(;t<I.length&&e>=I[t];)t++;return t}function qe(e){const t=C(),n=Ue(e);return n<0?t.empty:t.bands[n]}function At(e){const t=Ue(e);return t<0?2:jt[t]}const fe={dark:["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"],light:["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"]},It=fe.dark.length;function Rt(e){const t=F()?fe.light:fe.dark;return t[e%t.length]}const V=[{id:"edu",name:"חינוך",test:/ספר|גנ[יי]? ילדים|חינוך|לימוד/},{id:"health",name:"בריאות",test:/רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/},{id:"sport",name:"ספורט ופנאי",test:/ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/},{id:"comm",name:"קהילה ותרבות",test:/קהיל|תרבות|מתנ״?ס/},{id:"relig",name:"דת",test:/כנסת|דת|מסגד|כנסי/},{id:"other",name:"אחר",test:/.^/}],Oe={dark:{edu:"#3987e5",health:"#d95926",sport:"#199e70",comm:"#c98500",relig:"#d55181",other:"#9085e9"},light:{edu:"#2a78d6",health:"#eb6834",sport:"#1baf7a",comm:"#eda100",relig:"#e87ba4",other:"#4a3aa7"}};function Ft(e){return(V.find(n=>n.test.test(e||""))||V[V.length-1]).id}function Ye(e){return(F()?Oe.light:Oe.dark)[e]}const Me={dark:["#115e59","#0f766e","#0d9488","#14b8a6","#5eead4"],light:["#14b8a6","#0d9488","#0f766e","#115e59","#0b3d39"]};function ee(){return F()?Me.light:Me.dark}const J=L.layerGroup(),he=L.layerGroup(),Z=[];let D=null;function Je(e){const t=u.day==="avg"?[0,1,2,3,4]:[u.day],n=u.period==="all"?[0,1,2,3,4,5,6]:[u.period];let s=0,o=0;for(const a of t)for(const i of n){const r=e[a*7+i];r&&r>0&&(s+=r,o++)}return o?s/o:null}function Ze(){J.clearLayers(),Z.length=0;const e=C();for(const t of l.segments){const n=L.polyline(t.coordinates,{color:e.empty,weight:3,opacity:.9});n._speeds=t.speeds,n.on("mouseover",function(){this.setStyle({weight:(this._w||3)+3})}),n.on("mouseout",function(){this.setStyle({weight:this._w||3})}),n.on("click",function(){const s=Je(this._speeds),o=this.getLatLngs()[Math.floor(this.getLatLngs().length/2)];L.popup().setLatLng(o).setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${s?s.toFixed(1):"—"} קמ״ש</b></div>`).openOn(m)}),Z.push(n),J.addLayer(n)}We()}function We(){D=u.area?new Set(Z.filter(e=>Mt(e,u.area))):null}function Bt(){he.clearLayers();const e=C();let t=0,n=0,s=0;for(const o of Z){const a=Je(o._speeds),i=At(a);o._w=i,o.setStyle({color:qe(a),opacity:a==null?.5:.9,weight:i}),a!=null&&(D&&!D.has(o)||(t+=a,n++,a<Ve&&(s++,he.addLayer(L.polyline(o.getLatLngs(),{color:e.cong,weight:8,opacity:.35})))))}return{avgSpeed:n?t/n:null,congestedPct:n?Math.round(s/n*100):null,segmentCount:D?D.size:l.segments.length}}function Dt({speed:e,cong:t}){Y(J,e),Y(he,t)}const z=["בוקר מוקדם","שעות הבוקר","לפני הצהריים","צהריים","אחר הצהריים","שעת שיא ערב","ערב / לילה"],ge=["≈05–07","≈07–09","≈09–12","≈12–15","≈15–17","≈17–19","≈19–24"],zt=["ראשון","שני","שלישי","רביעי","חמישי"],U=["א׳","ב׳","ג׳","ד׳","ה׳"];function v(e,t=0){return e==null?"—":(+e).toLocaleString("he-IL",{minimumFractionDigits:t,maximumFractionDigits:t})}function Nt(e){return e==="avg"?"ממוצע ימי חול (א׳–ה׳)":"יום "+zt[e]}function Xe(e){return e==="all"?"כל שעות היום":z[e]+" "+ge[e]}function $(e){return String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}const be=L.layerGroup();function Qe(e){var n;const t=(n=l.destinations)==null?void 0:n.categories[e];return Ft(t==null?void 0:t.name)}function et(e){return Ye(Qe(e))}function W(){var n;if(!l.destinations)return;be.clearLayers();const e=l.destinations.categories,t=C().hairline;for(const[s,o,a,i,r]of l.destinations.points){if(u.destCats&&!u.destCats.has(s)||u.area&&!ke(o,a,u.area))continue;const d=$(i||"(ללא שם)"),c=$(((n=e[s])==null?void 0:n.name)||""),f=r?" · "+$(r):"";L.circleMarker([o,a],{pane:"pointPane",radius:3,color:t,weight:.75,fillColor:et(s),fillOpacity:.9}).bindPopup(`<div dir="rtl" style="text-align:right"><b>${d}</b><br><span style="opacity:.75">${c}${f}</span></div>`).addTo(be)}}function Ht(e){Y(be,e)}const me=L.layerGroup(),ve=new Map;let tt=()=>{};const k={visible:[],breaks:[],selected:null};function X(e){return`${e.code}@${e.lat},${e.lon}`}function Gt(e){tt=e}function Kt(e){const t=e.map(s=>s.boardings_day).filter(s=>s!=null).sort((s,o)=>s-o);if(!t.length)return[];const n=ee();return Array.from({length:n.length-1},(s,o)=>t[Math.floor(t.length*(o+1)/n.length)])}function Vt(e){if(e==null)return null;const t=ee();let n=0;for(;n<k.breaks.length&&e>k.breaks[n];)n++;return t[n]}function Ut(e,t){return e==null||!t?3:3.5+9*Math.sqrt(e/t)}function Ee(){if(!l.stops)return;me.clearLayers(),ve.clear(),k.visible=l.stops.stations.filter(s=>!u.area||ke(s.lat,s.lon,u.area)),k.breaks=Kt(k.visible);const e=k.visible.reduce((s,o)=>Math.max(s,o.boardings_day||0),0),t=C(),n=t.empty;for(const s of k.visible){const o=Vt(s.boardings_day),a=L.circleMarker([s.lat,s.lon],{pane:"pointPane",radius:Ut(s.boardings_day,e),color:o?t.hairline:n,weight:o?1:1.5,fillColor:o||"transparent",fillOpacity:o?.9:0});a._stroke=o?t.hairline:n,a._weight=o?1:1.5,a.bindTooltip(`<div dir="rtl" style="text-align:right"><b>${$(s.name)}</b><br>`+(s.boardings_day!=null?`${v(s.boardings_day)} עליות ביום`:"ללא נתוני סקר")+"</div>",{direction:"top",opacity:.95}),a.on("click",()=>st(s)),a.addTo(me),ve.set(X(s),a)}k.selected&&Se()}function Se(){const e=C().selected;for(const[t,n]of ve){const s=k.selected&&t===X(k.selected);n.setStyle({color:s?e:n._stroke,weight:s?2.5:n._weight}),s&&n.bringToFront()}}function st(e){k.selected=e,Se(),tt(e)}function je(){k.selected=null,Se()}function qt(e){Y(me,e)}const Yt={5:"דן",3:"אגד",16:"מטרופולין",18:"קווים",14:"נסיעות",42:"גלים",91:"רכבת",7:'דן בי"ש',15:"קווים"};function nt(e){return Yt[String(e)]||`סוכנות ${e}`}const N=L.layerGroup(),M=new Map,ie=new Map;let Ae=0;function we(e){return ie.has(e)||(ie.set(e,Ae%It),Ae++),Rt(ie.get(e))}function Jt(e){return M.has(e)}function at(e){var o;if(M.has(e.route_id)||!((o=e.coordinates)!=null&&o.length))return;const t=we(e.route_id),n=L.polyline(e.coordinates,{pane:"routeCasingPane",color:C().casing,weight:8,opacity:.85,smoothFactor:1.2}),s=L.polyline(e.coordinates,{pane:"routeLinePane",color:t,weight:4.5,opacity:1,smoothFactor:1.2});s.bindTooltip(`קו ${e.route_short_name} · ${nt(e.agency_id)}<br><small>${e.route_long_name||""}</small>`,{sticky:!0,direction:"top"}),n.addTo(N),s.addTo(N),M.set(e.route_id,{stroke:s,casing:n})}function ot(e){const t=M.get(e);t&&(N.removeLayer(t.stroke),N.removeLayer(t.casing),M.delete(e))}function Zt(e){M.has(e.route_id)?ot(e.route_id):at(e)}function re(){for(const e of[...M.keys()])ot(e)}function Wt(){const e=C().casing;for(const[t,n]of M)n.stroke.setStyle({color:we(t)}),n.casing.setStyle({color:e})}function Xt(e){N.addTo(e||m)}const Qt={togeojson:"https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js",shp:"https://unpkg.com/shpjs@6.2.0/dist/shp.js",jszip:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"},K=new Map;function es(e){return K.has(e)||K.set(e,new Promise((t,n)=>{const s=document.createElement("script");s.src=e,s.onload=t,s.onerror=()=>{K.delete(e),n(new Error(`failed to load ${e}`))},document.head.appendChild(s)})),K.get(e)}function Ie(...e){return Promise.all(e.map(t=>es(Qt[t])))}const ts=/\.(geojson|json|kml|zip)$/i,R=[];let te=()=>{};function ss(e){te=e}function it(e){return{color:e,weight:2,opacity:.9,fillOpacity:.15}}function le(e,t){const n=C().imported,s=L.geoJSON(e,{style:it(n),pointToLayer:(o,a)=>L.circleMarker(a,{radius:6,color:n,weight:2,fillColor:n,fillOpacity:.8}),onEachFeature:(o,a)=>{if(!o.properties)return;const i=Object.entries(o.properties).filter(([,r])=>r!=null).map(([r,d])=>`<tr><td style="color:var(--ink3);padding-left:8px">${$(r)}</td><td>${$(d)}</td></tr>`).join("");i&&a.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${i}</table>`)}}).addTo(m);try{m.fitBounds(s.getBounds(),{padding:[30,30]})}catch{}R.push({layer:s,name:t,visible:!0}),te()}const ce=(e,t)=>new Promise((n,s)=>{const o=new FileReader;o.onload=a=>n(a.target.result),o.onerror=()=>s(o.error),o[t](e)});async function Re(e){const t=e.name.replace(/\.[^.]+$/,""),n=e.name.split(".").pop().toLowerCase();try{if(n==="kml"){const[s]=await Promise.all([ce(e,"readAsText"),Ie("togeojson")]);le(toGeoJSON.kml(new DOMParser().parseFromString(s,"text/xml")),t)}else if(n==="zip"){const[s]=await Promise.all([ce(e,"readAsArrayBuffer"),Ie("jszip","shp")]),o=await JSZip.loadAsync(s),a=Object.values(o.files).filter(p=>!p.dir),i=a.find(p=>/\.shp$/i.test(p.name)),r=a.find(p=>/\.dbf$/i.test(p.name)),d=a.find(p=>/\.prj$/i.test(p.name));if(!i||!r){alert("קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)");return}const[c,f,_]=await Promise.all([i.async("arraybuffer"),r.async("arraybuffer"),d?d.async("string"):Promise.resolve(null)]);le(shp.combine([shp.parseShp(c,_),shp.parseDbf(f)]),t)}else n==="geojson"||n==="json"?le(JSON.parse(await ce(e,"readAsText")),t):alert(`סוג קובץ לא נתמך: .${n}
ניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`)}catch(s){console.error("[Import] failed:",s),alert(`שגיאה בייבוא ${e.name}: ${s.message}`)}}function ns(e){const t=R[e];t&&(t.visible=!t.visible,t.visible?m.addLayer(t.layer):m.removeLayer(t.layer),te())}function as(e){const t=R[e];t&&(m.removeLayer(t.layer),R.splice(e,1),te())}function os(){const e=C().imported;for(const{layer:t}of R)t.setStyle(n=>n instanceof L.CircleMarker?{color:e,weight:2,fillColor:e,fillOpacity:.8}:it(e))}const ye=L.layerGroup();let T=null;function rt(e={}){return{color:C().focus,opacity:.7,fill:!1,dashArray:"4 4",...e}}function lt(e){ye.clearLayers(),e&&L.geoJSON(e,{style:rt({weight:2,opacity:.75,dashArray:"6 4"})}).addTo(ye)}function ct(e){if(dt(),!e)return null;const t=rt({pane:"neighHighlightPane",weight:1.5});if(e.boundary)T=L.geoJSON(e.boundary,{style:t}),T.bindTooltip(e.name);else{const n=e.bbox;T=L.rectangle([[n.min_lat,n.min_lon],[n.max_lat,n.max_lon]],t),T.bindTooltip(`${e.name} (אזור משוער — אין גבול מדויק בנתונים)`)}return T.addTo(m),T.getBounds()}function dt(){T&&(m.removeLayer(T),T=null)}const is='<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>',rs='<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>';function ls(){const e=E`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${is}${rs}</button>
      </div>
    </header>`;return g(e,"#themeToggle").addEventListener("click",$t),{el:e}}const cs=[{id:"avg",label:"מהירות אוטובוס ממוצעת",unit:"קמ״ש",tint:"var(--ramp)",note:"ממוצע כל היום"},{id:"cong",label:"מקטעים בגודש",unit:"% מהרשת",tint:"var(--c-cong)",tone:"var(--c-cong)",note:"מתחת ל־15 קמ״ש"},{id:"seg",label:"מקטעי כביש בניתוח",unit:"",tint:"var(--c-net)",note:"ברחבי העיר"},{id:"board",label:"עליות לאוטובוס ביום",unit:"",tint:"var(--c-ride)",tone:"var(--c-ride)",note:"סקר תחנות"}];function ds(){const e=E`
    <div class="kpis">
      ${cs.map(s=>`
        <div class="kpi" style="--tint:${s.tint}${s.tone?`;--tone:${s.tone}`:""}">
          <div class="k">${s.label}</div>
          <div class="row">
            <span class="v" data-v="${s.id}">—</span>
            ${s.unit?`<span class="u">${s.unit}</span>`:""}
          </div>
          <div class="d" data-d="${s.id}">${s.note}</div>
        </div>`).join("")}
    </div>`,t=s=>g(e,`[data-v="${s}"]`),n=s=>g(e,`[data-d="${s}"]`);return{el:e,setLoading(s="טוען…"){t("avg").textContent=s,t("seg").textContent=s},setSpeedStats({avgSpeed:s,congestedPct:o,segmentCount:a},i){t("avg").textContent=s==null?"—":s.toFixed(1),t("cong").textContent=o??"—",a&&(t("seg").textContent=v(a)),n("avg").textContent=Xe(i)},setScope(s){n("seg").textContent=s?`בגבולות ${s}`:"ברחבי העיר"},setSegmentError(s){t("seg").textContent=s},setRidership(s,o){s!=null&&s.transit?(t("board").textContent=v(s.transit.boardings_day),n("board").textContent=`${v(s.transit.surveyed)} תחנות · ${s.name}`):s?(t("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${s.name}`):o&&(t("board").textContent=v(o.boardings_day),n("board").textContent=`${v(o.surveyed)} תחנות מסוקרות · כל העיר`)}}}const Fe="▶ הרצת יום",ps="⏸ עצור",us=1100;function fs({onReset:e}={}){const t=E`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${Fe}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`,n=g(t,".days"),s=g(t,".periods"),o=g(t,".allp"),a=g(t,".spark"),i=g(t,"[data-play]");let r=null;U.forEach((p,y)=>{const S=E`<div class="day">${p}</div>`;S.addEventListener("click",()=>x({day:y})),n.appendChild(S)});const d=E`<div class="day avg">ממוצע</div>`;d.addEventListener("click",()=>x({day:"avg"})),n.appendChild(d),z.forEach((p,y)=>{const S=E`
      <div class="prow">
        <span class="pn">P${y+1}</span>
        <span class="pl">${p}</span>
        <span class="pt">${ge[y]}</span>
      </div>`;S.addEventListener("click",()=>x({period:y})),s.appendChild(S)}),o.addEventListener("click",()=>x({period:"all"}));function c(){r&&(clearInterval(r),r=null,i.textContent=Fe)}i.addEventListener("click",()=>{if(r){c();return}i.textContent=ps,x({period:0});let p=0;r=setInterval(()=>{p=(p+1)%z.length,x({period:p})},us)}),g(t,"[data-reset]").addEventListener("click",()=>{c(),x({day:"avg",period:"all"}),e==null||e()});function f(){if(a.replaceChildren(),!l.speedProfile)return;const p=l.speedProfile.filter(S=>S!=null),y=p.length?Math.max(...p):1;l.speedProfile.forEach((S,h)=>{const b=S==null?0:S/y*100,w=E`
        <div class="spk" title="${z[h]} ${ge[h]}${S==null?" · אין נתונים":` · ${S.toFixed(1)} קמ״ש`}">
          <span class="val">${S==null?"—":S.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${b}%;background:${qe(S)}"></span></span>
          <span class="lab">P${h+1}</span>
        </div>`;w.addEventListener("click",()=>x({period:h})),a.appendChild(w)}),_()}function _(){[...n.children].forEach((p,y)=>{p.classList.toggle("on",y<U.length&&u.day===y||y===U.length&&u.day==="avg")}),[...s.children].forEach((p,y)=>p.classList.toggle("on",u.period===y)),o.classList.toggle("on",u.period==="all"),[...a.children].forEach((p,y)=>p.classList.toggle("on",u.period===y))}return _(),{el:t,sync:_,buildSpark:f,stopPlaying:c}}const hs=[{key:"speed",label:"רשת מהירויות אוטובוס",tint:"var(--ramp)",swatch:null},{key:"cong",label:"מוקדי גודש (&lt;15 קמ״ש)",tint:"var(--c-cong)",swatch:"background:var(--sp1)"},{key:"dest",label:"מוקדי שירות ותעסוקה",tint:"var(--c-place)",swatch:"multi"},{key:"stops",label:"תחנות ועליות",tint:"var(--c-ride)",swatch:"background:var(--primary)"}];function gs(){const e=E`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${hs.map(i=>`
        <div class="toggle${u.layers[i.key]?" on":""}" data-layer="${i.key}" style="--tint:${i.tint}">
          <span class="sw"></span>
          ${i.swatch==="multi"?'<span class="tc tc-multi"></span>':i.swatch?`<span class="tc" style="${i.swatch}"></span>`:""}
          <span class="tl">${i.label}</span>
        </div>
        ${i.key==="dest"?'<div class="dest-cats" hidden></div>':""}
        ${i.key==="stops"?'<div id="stopsLegend" class="legend" hidden></div>':""}`).join("")}
    </div>`,t=g(e,".dest-cats"),n=g(e,"#stopsLegend");e.querySelectorAll(".toggle").forEach(i=>{i.addEventListener("click",()=>{const r=i.dataset.layer;u.layers[r]=!u.layers[r],i.classList.toggle("on",u.layers[r]),He(["layers"])})});function s(){if(!l.destinations)return;const i=r=>l.destinations.categories.filter(d=>Qe(d.id)===r.id).map(d=>`
        <label class="dest-cat" title="${$(d.name)}">
          <input type="checkbox" data-cat="${d.id}" ${!u.destCats||u.destCats.has(d.id)?"checked":""}>
          <span class="dest-dot" style="background:${et(d.id)}"></span>
          <span class="dest-name">${$(d.name)}</span>
          <span class="dest-count">${v(d.count)}</span>
        </label>`).join("");t.innerHTML=V.map(r=>{const d=i(r);return d?`<div class="dest-group">
                <span class="dest-dot" style="background:${Ye(r.id)}"></span>${r.name}
              </div>${d}`:""}).join(""),t.querySelectorAll("input[data-cat]").forEach(r=>{r.addEventListener("change",()=>{x({destCats:new Set([...t.querySelectorAll("input[data-cat]:checked")].map(d=>+d.dataset.cat))})})})}function o(){if(!l.stops)return;const i=ee(),r=k.visible.filter(c=>c.boardings_day!=null).length,d=i.map((c,f)=>{const _=f===0?0:k.breaks[f-1],p=f<k.breaks.length?k.breaks[f]:null,y=p==null?`${v(_)}+`:`${v(_)}–${v(p)}`;return`<div class="lg"><span style="background:${c}"></span> ${y}</div>`}).join("");n.innerHTML=`
      <div class="stops-legend-title">עליות ליום · ${v(r)} תחנות עם נתוני סקר</div>
      ${d}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`}function a(){t.hidden=!u.layers.dest,n.hidden=!u.layers.stops}return a(),{el:e,renderCategories:s,renderStopsLegend:o,syncPanels:a}}const bs=["גודש קשה","גודש","איטי","זורם","מהיר / נתיב מהיר"];function ms(){const e=bs.map((s,o)=>{const a=o===0?0:I[o-1],i=o<I.length?I[o]:null,r=i==null?`${a}+`:`${a}–${i}`;return`<span style="background:var(--sp${o+1})" title="${r} קמ״ש · ${s}"></span>`}).join(""),t=["0",...I.map(String),"+"].map(s=>`<i>${s}</i>`).join("");return{el:E`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${e}</div>
      <div class="ramp-ticks">${t}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${Ve} קמ״ש</b>.
      </div>
    </div>`}}const Be="תל אביב יפו",vs=/^\d+[#֐-׿]?$/,ys=[{id:"urban",label:"עירוני"},{id:"intercity",label:"בין-עירוני"}];function $s(e){const t=e?e.indexOf("<->"):-1;if(t<0)return null;const n=e.slice(0,t);let s=e.slice(t+3);const o=s.lastIndexOf("-");o>0&&vs.test(s.slice(o+1).trim())&&(s=s.slice(0,o));const a=n.slice(n.lastIndexOf("-")+1).trim(),i=s.slice(s.lastIndexOf("-")+1).trim();return a&&i?[a,i]:null}function Ls(e){const t=$s(e==null?void 0:e.route_long_name);return t&&t[0]===Be&&t[1]===Be?"urban":"intercity"}function De(e){const t=String(e??""),n=t.match(/^(\d+)(.*)$/);return n?[0,Number(n[1]),n[2]]:[1,0,t]}function _s(e,t){const n=De(e.route_short_name),s=De(t.route_short_name);return n[0]-s[0]||n[1]-s[1]||n[2].localeCompare(s[2],"he")}function ks(e){return ys.map(t=>({...t,routes:e.filter(n=>Ls(n)===t.id).sort(_s)})).filter(t=>t.routes.length>0)}function Es({onAreaChange:e}={}){const t=E`
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
        <div class="lines-scroll" style="max-height:280px"></div>
      </div>
    </div>`,n=g(t,".neigh-select"),s=g(t,".neigh-routes"),o=g(t,".neigh-header"),a=g(t,".neigh-stats"),i=g(t,".neigh-loading"),r=g(t,".neigh-route-count"),d=g(t,".lines-scroll");let c=[];function f(h){const b=h==null?void 0:h.population;if(!(b!=null&&b.total)){a.hidden=!0,a.replaceChildren();return}const w=b.by_age||{},B=(...oe)=>oe.reduce((bt,mt)=>bt+(w[mt]||0),0),xe=oe=>b.total?Math.round(oe/b.total*100):0;a.innerHTML=`
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${v(b.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${xe(B("g0to9","g10to19"))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${xe(B("g60to69","g70to79","g80up"))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`,a.hidden=!1}function _(h){const b=Jt(h.route_id),w=we(h.route_id),B=E`
      <li class="${b?"neigh-active":""}">
        <span class="num" style="background:${b?w:`color-mix(in srgb, ${w} 20%, transparent)`};color:${b?"#fff":w}">${$(h.route_short_name||"?")}</span>
        <span class="desc" title="${$(h.route_long_name||"")}">${$(h.route_long_name||"ללא תיאור")}</span>
        <span class="ag">${$(nt(h.agency_id))}</span>
        ${b?`<span class="neigh-color-dot" style="background:${w}"></span>`:""}
      </li>`;return B.addEventListener("click",()=>{Zt(h),p()}),B}function p(){d.replaceChildren();for(const h of ks(c)){d.append(E`
        <div class="lines-group">
          <span>${h.label}</span>
          <span class="lines-group-n">${v(h.routes.length)}</span>
        </div>`);const b=E`<ul class="lines"></ul>`;b.append(...h.routes.map(_)),d.append(b)}}g(t,"[data-all]").addEventListener("click",()=>{c.forEach(h=>at(h)),p()}),g(t,"[data-clear]").addEventListener("click",()=>{re(),p()}),n.addEventListener("change",async()=>{re(),c=[],p();const h=l.neighbourhoods.find(b=>b.id===n.value)||null;if(!h){s.hidden=!0,x({area:null,areaName:null,areaRecord:null}),e==null||e(null);return}s.hidden=!1,i.hidden=!1,r.textContent="",x({area:{bbox:h.bbox,boundary:h.boundary},areaName:h.name,areaRecord:h}),e==null||e(h),f(h);try{const b=await Pt();c=(h.route_ids||[]).map(w=>b[w]).filter(Boolean)}catch(b){console.error("[AreaPanel] failed to load the route index:",b),i.hidden=!0,o.textContent=`שגיאה: ${b.message}`;return}i.hidden=!0,o.innerHTML=`<b>${$(h.name)}</b> · ${v(c.length)} קווים פעילים ב-GTFS`,r.textContent=c.length?`${v(c.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`:"לא נמצאו קווים באזור זה",p()});async function y(){try{const h=await xt();n.append(...h.map(b=>new Option(b.name,b.id)))}catch(h){console.error("[AreaPanel] failed to load neighbourhoods.json:",h)}}function S(){re(),p()}return{el:t,load:y,renderRoutes:p,clearRoutes:S}}function Ss({dropTarget:e}={}){const t=E`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`,n=g(t,"input[type=file]"),s=g(t,".imported-list");n.addEventListener("change",()=>{[...n.files].forEach(Re),n.value=""});function o(){s.replaceChildren(),R.forEach((a,i)=>{const r=E`
        <li class="imported-item${a.visible?" on":""}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${$(a.name)}">${$(a.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;g(r,".sw").addEventListener("click",()=>ns(i)),g(r,".imported-remove").addEventListener("click",()=>as(i)),s.appendChild(r)})}if(ss(o),e){let a=0;e.addEventListener("dragenter",i=>{i.preventDefault(),++a===1&&e.classList.add("drop-active")}),e.addEventListener("dragover",i=>i.preventDefault()),e.addEventListener("dragleave",()=>{--a<=0&&(a=0,e.classList.remove("drop-active"))}),e.addEventListener("drop",i=>{i.preventDefault(),a=0,e.classList.remove("drop-active"),[...i.dataTransfer.files].filter(r=>ts.test(r.name)).forEach(Re)})}return{el:t,renderList:o}}const ws={ADULT:"בוגר",YOUTH:"נוער",ELDERLY:"קשיש",STUDENT:"סטודנט",DISABLED:"נכה",OTHER:"אחר"};function P(e,t,n){return`<div class="stop-tile">
            <div class="stop-tile-val"${n?` style="color:${n}"`:""}>${e}</div>
            <div class="stop-tile-lbl">${t}</div>
          </div>`}function xs(e){const t=e.reduce((n,s)=>n+s,0);return t>0?e.map(n=>n/t*100):e.map(()=>0)}function ze(e,t,n){const s=Math.max(...t),o=t.indexOf(s),a=ee(),i=t.reduce((c,f)=>c+f,0),r=s>=1e4?c=>(+c).toLocaleString("he-IL",{notation:"compact",maximumFractionDigits:1}):c=>v(c);return`<div class="bands">${t.map((c,f)=>{const _=s>0?Math.max(2,Math.round(c/s*46)):2,p=i>0?c/i*100:0;return`
      <div class="band ${f===o?"peak":""}" title="${e[f]} · ${v(c,1)} ${n} (${p.toFixed(0)}%)">
        <div class="band-val">${r(c)}</div>
        <div class="band-bar" style="height:${_}px;background:${f===o?a[a.length-1]:a[2]}"></div>
        <div class="band-lbl">${e[f]}</div>
      </div>`}).join("")}</div>`}function Ne(e,t){const n=xs(t);return`<div class="riders">${e.map((o,a)=>({label:ws[o]||o,pct:n[a],value:t[a]})).sort((o,a)=>a.pct-o.pct).map(o=>`
      <div class="rider" title="${o.label} · ${v(o.value,1)} עליות ביום">
        <span class="rider-lbl">${o.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${o.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${o.pct.toFixed(0)}%</span>
      </div>`).join("")}</div>`}function Cs(){const e=E`<div id="stopPanel" dir="rtl"></div>`;function t(){je(),e.style.display="none"}function n(a){const i=l.stops.bands,r=a.boardings_day!=null,d=r?i[a.boardings_by_band.indexOf(Math.max(...a.boardings_by_band))]:null,c=[a.street,a.house||""].filter(Boolean).join(" ");return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${$(a.name)}</div>
        <div class="stop-sub">מק״ט ${$(a.code)} · ${a.routes.length||a.routes_reported||0} קווים${c?" · "+$(c):""}</div>
      </div>

      <div class="stop-tiles">
        ${P(v(a.departures_day),"עצירות מתוזמנות ביום")}
        ${P(r?v(a.boardings_day):"—","עליות ביום","var(--primary)")}
        ${P(a.transfer_pct!=null?a.transfer_pct.toFixed(0)+"%":"—","% נסיעות מעבר")}
        ${P(v(a.routes.length||a.routes_reported),"קווים")}
      </div>

      ${a.routes.length?`
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${a.routes.map(f=>`<span class="chip">${$(f)}</span>`).join("")}</div>`:""}

      ${r?`
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${ze(i,a.boardings_by_band,"עליות")}

        <div class="stop-sec">פילוח נוסעים</div>
        ${Ne(l.stops.rider_types,a.riders)}

        <div class="stop-tiles">
          ${P(a.trips_to_dest!=null?a.trips_to_dest.toFixed(2):"—","נסיעות ממוצע ליעד")}
          ${P(d,"שעת שיא","var(--primary)")}
        </div>`:`
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${$(l.stops.source)}</div>`}function s(){const a=k.visible.filter(f=>f.boardings_day!=null),i=l.stops.bands.map((f,_)=>a.reduce((p,y)=>p+(y.boardings_by_band?y.boardings_by_band[_]:0),0)),r=l.stops.rider_types.map((f,_)=>a.reduce((p,y)=>p+(y.riders?y.riders[_]:0),0)),d=a.reduce((f,_)=>f+_.boardings_day,0),c=[...a].sort((f,_)=>_.boardings_day-f.boardings_day).slice(0,5);return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${u.area?"בשכונה הנבחרת":"ברחבי העיר"}</div>
        <div class="stop-sub">${v(k.visible.length)} תחנות · ${v(a.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${P(v(d),"עליות ביום","var(--primary)")}
        ${P(v(a.reduce((f,_)=>f+(_.departures_day||0),0)),"עצירות ביום")}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${ze(l.stops.bands,i,"עליות")}

      <div class="stop-sec">פילוח נוסעים</div>
      ${Ne(l.stops.rider_types,r)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${c.map(f=>`
          <button class="stop-top-row" data-key="${$(X(f))}">
            <span class="stop-top-name">${$(f.name)}</span>
            <span class="stop-top-val">${v(f.boardings_day)}</span>
          </button>`).join("")}
      </div>
      <div class="stop-src">${$(l.stops.source)}</div>`}function o(){var a;l.stops&&(e.style.display="block",e.scrollTop=0,e.innerHTML=k.selected?n(k.selected):s(),e.querySelector(".stop-close").addEventListener("click",t),(a=e.querySelector(".stop-link"))==null||a.addEventListener("click",()=>{je(),o()}),e.querySelectorAll(".stop-top-row").forEach(i=>{i.addEventListener("click",()=>{const r=k.visible.find(d=>X(d)===i.dataset.key);r&&(st(r),m.setView([r.lat,r.lon],Math.max(m.getZoom(),16)))})}))}return{el:e,render:o,close:t,refresh(){e.style.display==="block"&&o()}}}function Ts(){const e=E`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`,t=g(e,".now"),n=g(e,".lbl");return{el:e,update({day:s,period:o}){const a=s==="avg"?"ממוצע":U[s],i=o==="all"?"כל היום":z[o];t.textContent=`${a} · ${i}`,n.textContent=`${Nt(s)} · ${Xe(o)}`}}}const pt=document.getElementById("app"),se=E`
  <div class="shell" style="display:contents">
    <aside></aside>
    <div id="mapwrap"><div id="map"></div></div>
  </div>`;pt.appendChild(se);const Ps=g(se,"aside"),ut=g(se,"#mapwrap"),ft=g(se,"#map");kt(ft);const Os=ls(),O=ds(),ht=Ts(),H=Cs(),ne=Es({onAreaChange:As}),ae=fs({onReset:Is}),A=gs(),Ms=ms(),js=Ss({dropTarget:ut});pt.prepend(Os.el);ut.prepend(O.el);ft.append(ht.el,H.el);Ps.append(ne.el,ae.el,A.el,Ms.el,js.el);ye.addTo(m);J.addTo(m);Xt(m);Gt(()=>H.render());function Q(){O.setSpeedStats(Bt(),u.period),ht.update(u)}function gt(){Dt(u.layers),Ht(u.layers.dest),qt(u.layers.stops),A.syncPanels(),u.layers.dest&&Ct().then(()=>{A.renderCategories(),W()}).catch(e=>console.error("[Destinations] failed to load:",e)),u.layers.stops?Tt().then(()=>{Ee(),A.renderStopsLegend()}).catch(e=>console.error("[Stops] failed to load:",e)):H.close()}vt((e,t)=>{(t.has("day")||t.has("period"))&&(ae.sync(),Q()),t.has("layers")&&gt(),t.has("destCats")&&l.destinations&&W(),t.has("area")&&(We(),O.setScope(e.areaName),Q(),l.destinations&&e.layers.dest&&W(),l.stops&&(Ee(),A.renderStopsLegend(),H.refresh()),O.setRidership(e.areaRecord,l.stopTotals))});function As(e){if(!e){dt();return}const t=ct(e);t&&m.fitBounds(t,{padding:[30,30]})}function Is(){ne.clearRoutes(),m.setView(l.center||Le,15)}Lt(()=>{Et(),Ze(),Q(),ae.buildSpark(),lt(l.border),u.areaRecord&&ct(u.areaRecord),Wt(),ne.renderRoutes(),os(),l.destinations&&(A.renderCategories(),W()),l.stops&&(Ee(),A.renderStopsLegend(),H.refresh())});async function Rs(){O.setLoading(),ne.load();const{segmentsFailed:e}=await wt();lt(l.border),l.center&&m.setView(l.center,13),Ze(),ae.buildSpark(),Q(),O.setRidership(null,l.stopTotals),gt(),e&&O.setSegmentError("שגיאת נתונים")}Rs().catch(e=>{console.error("Dashboard failed to start",e),O.setSegmentError("שגיאת רשת")});
