(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();function w(t,...e){const n=t.reduce((o,a,i)=>o+a+(e[i]??""),""),s=document.createElement("template");return s.innerHTML=n.trim(),s.content.firstElementChild}function b(t,e){return t.querySelector(e)}const u={day:"avg",period:"all",layers:{speed:!0,cong:!1,dest:!1,stops:!1,roads:!1},destCats:null,area:null,areaName:null,areaRecord:null},ft=new Set;function x(t){Object.assign(u,t),qt(Object.keys(t))}function qt(t){const e=new Set(t);for(const n of ft)n(u,e)}function we(t){return ft.add(t),()=>ft.delete(t)}const Ee="theme",ht=new Set;function kt(){return document.documentElement.dataset.theme==="light"?"light":"dark"}function j(){return kt()==="light"}function Se(){const t=j()?"dark":"light";document.documentElement.dataset.theme=t;try{localStorage.setItem(Ee,t)}catch{}for(const e of ht)e(t)}function xe(t){return ht.add(t),()=>ht.delete(t)}const J={dark:{base:"https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"},light:{base:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",labels:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}},Te={neighHighlightPane:350,roadPane:390,routeCasingPane:405,routeLinePane:410,pointPane:420,arrowPane:422},wt=[32.08,34.78];let g=null,Ut=null,gt=null;function Ce(t){g=L.map(t,{zoomControl:!1,attributionControl:!1,preferCanvas:!0}).setView(wt,15),L.control.zoom({position:"topright"}).addTo(g);const e=kt();Ut=L.tileLayer(J[e].base,{maxZoom:19,subdomains:"abcd",className:"basemap"}).addTo(g),gt=L.tileLayer(J[e].labels,{maxZoom:19,subdomains:"abcd",opacity:Jt()}).addTo(g);for(const[n,s]of Object.entries(Te))g.createPane(n).style.zIndex=String(s);return g}function Jt(){return j()?.8:.7}function Pe(){const t=kt();Ut.setUrl(J[t].base),gt.setUrl(J[t].labels),gt.setOpacity(Jt())}function F(t,e){e?g.hasLayer(t)||g.addLayer(t):g.hasLayer(t)&&g.removeLayer(t)}const Oe=t=>`/ODflow/data/${t}`,l={center:wt,border:null,segments:[],speedProfile:null,stopTotals:null,destinations:null,stops:null,neighbourhoods:[],routesById:null,roads:null};async function O(t){const e=await fetch(Oe(t));if(!e.ok)throw new Error(`${t}: HTTP ${e.status}`);return e.json()}async function Me(){var s,o,a;const[t,e,n]=await Promise.allSettled([O("border.json"),O("speeds.json"),O("kpis.json")]);if(t.status==="fulfilled"){l.border=t.value;const i=(a=(o=(s=t.value)==null?void 0:s.geometry)==null?void 0:o.coordinates)==null?void 0:a[0];if(i!=null&&i.length){const r=i.map(c=>c[1]),d=i.map(c=>c[0]);l.center=[(Math.min(...r)+Math.max(...r))/2,(Math.min(...d)+Math.max(...d))/2]}}return e.status==="fulfilled"&&(l.segments=e.value),n.status==="fulfilled"&&(l.speedProfile=n.value.speed_profile||null,l.stopTotals=n.value.stops||null),{segmentsFailed:e.status==="rejected"}}async function je(){return l.neighbourhoods.length||(l.neighbourhoods=await O("neighbourhoods.json")),l.neighbourhoods}const V=new Map;function nt(t,e){return V.has(t)||V.set(t,e().catch(n=>{throw V.delete(t),n})),V.get(t)}function Re(){return nt("destinations",async()=>(l.destinations=await O("destinations.json"),l.destinations))}function Ie(){return nt("stops",async()=>(l.stops=await O("stops.json"),l.stops))}function Ae(){return nt("routes",async()=>(l.routesById=await O("neighbourhood_routes.json"),l.routesById))}function Fe(){return nt("roads",async()=>(l.roads=await O("roads.geojson"),l.roads))}function Ot(t,e,n){let s=!1;for(let o=0,a=n.length-1;o<n.length;a=o++){const i=n[o][0],r=n[o][1],d=n[a][0],c=n[a][1];r>t!=c>t&&e<(d-i)*(t-r)/(c-r)+i&&(s=!s)}return s}function Mt(t,e,n){if(!Ot(t,e,n[0]))return!1;for(let s=1;s<n.length;s++)if(Ot(t,e,n[s]))return!1;return!0}function Be(t,e,n){return n?n.type==="Polygon"?Mt(t,e,n.coordinates):n.type==="MultiPolygon"?n.coordinates.some(s=>Mt(t,e,s)):!1:!1}function Et(t,e,n){const s=n.bbox;return t<s.min_lat||t>s.max_lat||e<s.min_lon||e>s.max_lon?!1:n.boundary?Be(t,e,n.boundary):!0}function De(t,e){for(const n of t.getLatLngs())if(Et(n.lat,n.lng,e))return!0;return!1}const A=[8,15,22,30],ze=[5,4,3.25,2.75,2.5],Yt=15,jt={dark:{bands:["#e11d48","#f97316","#facc15","#34d399","#60a5fa"],empty:"#3d4a63",cong:"#fb7185",focus:"#2dd4bf",imported:"#38bdf8",casing:"#0b1220",hairline:"#0b0b0b",selected:"#ffffff"},light:{bands:["#e11d48","#9a3412","#ca8a04","#15803d","#1d4ed8"],empty:"#cbd5e1",cong:"#be123c",focus:"#0f766e",imported:"#1d4ed8",casing:"#ffffff",hairline:"#ffffff",selected:"#0f1f3e"}};function T(){return j()?jt.light:jt.dark}function Zt(t){if(t==null||t<=0)return-1;let e=0;for(;e<A.length&&t>=A[e];)e++;return e}function Wt(t){const e=T(),n=Zt(t);return n<0?e.empty:e.bands[n]}function Ne(t){const e=Zt(t);return e<0?2:ze[e]}const bt={dark:["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"],light:["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"]},He=bt.dark.length;function Ge(t){const e=j()?bt.light:bt.dark;return e[t%e.length]}const q=[{id:"edu",name:"חינוך",test:/ספר|גנ[יי]? ילדים|חינוך|לימוד/},{id:"health",name:"בריאות",test:/רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/},{id:"sport",name:"ספורט ופנאי",test:/ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/},{id:"comm",name:"קהילה ותרבות",test:/קהיל|תרבות|מתנ״?ס/},{id:"relig",name:"דת",test:/כנסת|דת|מסגד|כנסי/},{id:"other",name:"אחר",test:/.^/}],Rt={dark:{edu:"#3987e5",health:"#d95926",sport:"#199e70",comm:"#c98500",relig:"#d55181",other:"#9085e9"},light:{edu:"#2a78d6",health:"#eb6834",sport:"#1baf7a",comm:"#eda100",relig:"#e87ba4",other:"#4a3aa7"}};function Ve(t){return(q.find(n=>n.test.test(t||""))||q[q.length-1]).id}function Xt(t){return(j()?Rt.light:Rt.dark)[t]}const Ke={motorway:"#fc8a8a",motorway_link:"#fc8a8a",trunk:"#fbb88a",trunk_link:"#fbb88a",primary:"#fce08a",primary_link:"#fce08a",secondary:"#d8d8b0",secondary_link:"#d8d8b0",tertiary:"#909090",tertiary_link:"#909090",residential:"#606878",unclassified:"#606878",living_street:"#606878"},qe={motorway:"#e892a2",motorway_link:"#e892a2",trunk:"#f9b29c",trunk_link:"#f9b29c",primary:"#fcd6a4",primary_link:"#fcd6a4",secondary:"#d8d8a0",secondary_link:"#d8d8a0",tertiary:"#b8b8b8",tertiary_link:"#b8b8b8",residential:"#c8c8c8",unclassified:"#c8c8c8",living_street:"#c8c8c8"},Ue={motorway:4,motorway_link:2.5,trunk:4,trunk_link:2.5,primary:3,primary_link:2,secondary:2.5,secondary_link:1.5,tertiary:1.5,tertiary_link:1,residential:1,unclassified:1,living_street:1};function Je(t){return(j()?qe:Ke)[t]??(j()?"#b0b0b0":"#505060")}function Ye(t){return Ue[t]??1}const It={dark:["#115e59","#0f766e","#0d9488","#14b8a6","#5eead4"],light:["#14b8a6","#0d9488","#0f766e","#115e59","#0b3d39"]};function st(){return j()?It.light:It.dark}const Y=L.layerGroup(),yt=L.layerGroup(),Z=[];let z=null;function Qt(t){const e=u.day==="avg"?[0,1,2,3,4]:[u.day],n=u.period==="all"?[0,1,2,3,4,5,6]:[u.period];let s=0,o=0;for(const a of e)for(const i of n){const r=t[a*7+i];r&&r>0&&(s+=r,o++)}return o?s/o:null}function te(){Y.clearLayers(),Z.length=0;const t=T();for(const e of l.segments){const n=L.polyline(e.coordinates,{color:t.empty,weight:3,opacity:.9});n._speeds=e.speeds,n.on("mouseover",function(){this.setStyle({weight:(this._w||3)+3})}),n.on("mouseout",function(){this.setStyle({weight:this._w||3})}),n.on("click",function(){const s=Qt(this._speeds),o=this.getLatLngs()[Math.floor(this.getLatLngs().length/2)];L.popup().setLatLng(o).setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${s?s.toFixed(1):"—"} קמ״ש</b></div>`).openOn(g)}),Z.push(n),Y.addLayer(n)}ee()}function ee(){z=u.area?new Set(Z.filter(t=>De(t,u.area))):null}function Ze(){yt.clearLayers();const t=T();let e=0,n=0,s=0;for(const o of Z){const a=Qt(o._speeds),i=Ne(a);o._w=i,o.setStyle({color:Wt(a),opacity:a==null?.5:.9,weight:i}),a!=null&&(z&&!z.has(o)||(e+=a,n++,a<Yt&&(s++,yt.addLayer(L.polyline(o.getLatLngs(),{color:t.cong,weight:8,opacity:.35})))))}return{avgSpeed:n?e/n:null,congestedPct:n?Math.round(s/n*100):null,segmentCount:z?z.size:l.segments.length}}function We({speed:t,cong:e}){F(Y,t),F(yt,e)}const N=["בוקר מוקדם","שעות הבוקר","לפני הצהריים","צהריים","אחר הצהריים","שעת שיא ערב","ערב / לילה"],mt=["≈05–07","≈07–09","≈09–12","≈12–15","≈15–17","≈17–19","≈19–24"],Xe=["ראשון","שני","שלישי","רביעי","חמישי"],U=["א׳","ב׳","ג׳","ד׳","ה׳"];function m(t,e=0){return t==null?"—":(+t).toLocaleString("he-IL",{minimumFractionDigits:e,maximumFractionDigits:e})}function Qe(t){return t==="avg"?"ממוצע ימי חול (א׳–ה׳)":"יום "+Xe[t]}function ne(t){return t==="all"?"כל שעות היום":N[t]+" "+mt[t]}function $(t){return String(t).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}const vt=L.layerGroup();function se(t){var n;const e=(n=l.destinations)==null?void 0:n.categories[t];return Ve(e==null?void 0:e.name)}function ae(t){return Xt(se(t))}function W(){var n;if(!l.destinations)return;vt.clearLayers();const t=l.destinations.categories,e=T().hairline;for(const[s,o,a,i,r]of l.destinations.points){if(u.destCats&&!u.destCats.has(s)||u.area&&!Et(o,a,u.area))continue;const d=$(i||"(ללא שם)"),c=$(((n=t[s])==null?void 0:n.name)||""),f=r?" · "+$(r):"";L.circleMarker([o,a],{pane:"pointPane",radius:3,color:e,weight:.75,fillColor:ae(s),fillOpacity:.9}).bindPopup(`<div dir="rtl" style="text-align:right"><b>${d}</b><br><span style="opacity:.75">${c}${f}</span></div>`).addTo(vt)}}function tn(t){F(vt,t)}const $t=L.layerGroup(),Lt=new Map;let oe=()=>{};const k={visible:[],breaks:[],selected:null};function X(t){return`${t.code}@${t.lat},${t.lon}`}function en(t){oe=t}function nn(t){const e=t.map(s=>s.boardings_day).filter(s=>s!=null).sort((s,o)=>s-o);if(!e.length)return[];const n=st();return Array.from({length:n.length-1},(s,o)=>e[Math.floor(e.length*(o+1)/n.length)])}function sn(t){if(t==null)return null;const e=st();let n=0;for(;n<k.breaks.length&&t>k.breaks[n];)n++;return e[n]}function an(t,e){return t==null||!e?3:3.5+9*Math.sqrt(t/e)}function St(){if(!l.stops)return;$t.clearLayers(),Lt.clear(),k.visible=l.stops.stations.filter(s=>!u.area||Et(s.lat,s.lon,u.area)),k.breaks=nn(k.visible);const t=k.visible.reduce((s,o)=>Math.max(s,o.boardings_day||0),0),e=T(),n=e.empty;for(const s of k.visible){const o=sn(s.boardings_day),a=L.circleMarker([s.lat,s.lon],{pane:"pointPane",radius:an(s.boardings_day,t),color:o?e.hairline:n,weight:o?1:1.5,fillColor:o||"transparent",fillOpacity:o?.9:0});a._stroke=o?e.hairline:n,a._weight=o?1:1.5,a.bindTooltip(`<div dir="rtl" style="text-align:right"><b>${$(s.name)}</b><br>`+(s.boardings_day!=null?`${m(s.boardings_day)} עליות ביום`:"ללא נתוני סקר")+"</div>",{direction:"top",opacity:.95}),a.on("click",()=>ie(s)),a.addTo($t),Lt.set(X(s),a)}k.selected&&xt()}function xt(){const t=T().selected;for(const[e,n]of Lt){const s=k.selected&&e===X(k.selected);n.setStyle({color:s?t:n._stroke,weight:s?2.5:n._weight}),s&&n.bringToFront()}}function ie(t){k.selected=t,xt(),oe(t)}function At(){k.selected=null,xt()}function on(t){F($t,t)}const rn={5:"דן",3:"אגד",16:"מטרופולין",18:"קווים",14:"נסיעות",42:"גלים",91:"רכבת",7:'דן בי"ש',15:"קווים"};function re(t){return rn[String(t)]||`סוכנות ${t}`}const H=L.layerGroup(),R=new Map,ct=new Map;let Ft=0;function Tt(t){return ct.has(t)||(ct.set(t,Ft%He),Ft++),Ge(ct.get(t))}function ln(t){return R.has(t)}function le(t){var o;if(R.has(t.route_id)||!((o=t.coordinates)!=null&&o.length))return;const e=Tt(t.route_id),n=L.polyline(t.coordinates,{pane:"routeCasingPane",color:T().casing,weight:8,opacity:.85,smoothFactor:1.2}),s=L.polyline(t.coordinates,{pane:"routeLinePane",color:e,weight:4.5,opacity:1,smoothFactor:1.2});s.bindTooltip(`קו ${t.route_short_name} · ${re(t.agency_id)}<br><small>${t.route_long_name||""}</small>`,{sticky:!0,direction:"top"}),n.addTo(H),s.addTo(H),R.set(t.route_id,{stroke:s,casing:n})}function ce(t){const e=R.get(t);e&&(H.removeLayer(e.stroke),H.removeLayer(e.casing),R.delete(t))}function cn(t){R.has(t.route_id)?ce(t.route_id):le(t)}function dt(){for(const t of[...R.keys()])ce(t)}function dn(){const t=T().casing;for(const[e,n]of R)n.stroke.setStyle({color:Tt(e)}),n.casing.setStyle({color:t})}function pn(t){H.addTo(t||g)}const un={togeojson:"https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js",shp:"https://unpkg.com/shpjs@6.2.0/dist/shp.js",jszip:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"},K=new Map;function fn(t){return K.has(t)||K.set(t,new Promise((e,n)=>{const s=document.createElement("script");s.src=t,s.onload=e,s.onerror=()=>{K.delete(t),n(new Error(`failed to load ${t}`))},document.head.appendChild(s)})),K.get(t)}function Bt(...t){return Promise.all(t.map(e=>fn(un[e])))}const hn=/\.(geojson|json|kml|zip)$/i,B=[];let at=()=>{};function gn(t){at=t}function de(t){return{color:t,weight:2,opacity:.9,fillOpacity:.15}}function pt(t,e){const n=T().imported,s=L.geoJSON(t,{style:de(n),pointToLayer:(o,a)=>L.circleMarker(a,{radius:6,color:n,weight:2,fillColor:n,fillOpacity:.8}),onEachFeature:(o,a)=>{if(!o.properties)return;const i=Object.entries(o.properties).filter(([,r])=>r!=null).map(([r,d])=>`<tr><td style="color:var(--ink3);padding-left:8px">${$(r)}</td><td>${$(d)}</td></tr>`).join("");i&&a.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${i}</table>`)}}).addTo(g);try{g.fitBounds(s.getBounds(),{padding:[30,30]})}catch{}B.push({layer:s,name:e,visible:!0}),at()}const ut=(t,e)=>new Promise((n,s)=>{const o=new FileReader;o.onload=a=>n(a.target.result),o.onerror=()=>s(o.error),o[e](t)});async function Dt(t){const e=t.name.replace(/\.[^.]+$/,""),n=t.name.split(".").pop().toLowerCase();try{if(n==="kml"){const[s]=await Promise.all([ut(t,"readAsText"),Bt("togeojson")]);pt(toGeoJSON.kml(new DOMParser().parseFromString(s,"text/xml")),e)}else if(n==="zip"){const[s]=await Promise.all([ut(t,"readAsArrayBuffer"),Bt("jszip","shp")]),o=await JSZip.loadAsync(s),a=Object.values(o.files).filter(p=>!p.dir),i=a.find(p=>/\.shp$/i.test(p.name)),r=a.find(p=>/\.dbf$/i.test(p.name)),d=a.find(p=>/\.prj$/i.test(p.name));if(!i||!r){alert("קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)");return}const[c,f,_]=await Promise.all([i.async("arraybuffer"),r.async("arraybuffer"),d?d.async("string"):Promise.resolve(null)]);pt(shp.combine([shp.parseShp(c,_),shp.parseDbf(f)]),e)}else n==="geojson"||n==="json"?pt(JSON.parse(await ut(t,"readAsText")),e):alert(`סוג קובץ לא נתמך: .${n}
ניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`)}catch(s){console.error("[Import] failed:",s),alert(`שגיאה בייבוא ${t.name}: ${s.message}`)}}function bn(t){const e=B[t];e&&(e.visible=!e.visible,e.visible?g.addLayer(e.layer):g.removeLayer(e.layer),at())}function yn(t){const e=B[t];e&&(g.removeLayer(e.layer),B.splice(t,1),at())}function mn(){const t=T().imported;for(const{layer:e}of B)e.setStyle(n=>n instanceof L.CircleMarker?{color:t,weight:2,fillColor:t,fillOpacity:.8}:de(t))}const Q=L.layerGroup(),tt=L.layerGroup(),vn=14;let Ct=!1;function $n(t){const[e,n]=t[0],[s,o]=t[t.length-1],a=(s-e)*Math.PI/180,i=n*Math.PI/180,r=o*Math.PI/180,d=Math.sin(a)*Math.cos(r),c=Math.cos(i)*Math.sin(r)-Math.sin(i)*Math.cos(r)*Math.cos(a);return(Math.atan2(d,c)*180/Math.PI+360)%360}function Ln(t){let e=0;for(let n=1;n<t.length;n++){const s=t[n][0]-t[n-1][0],o=t[n][1]-t[n-1][1];e+=Math.sqrt(s*s+o*o)}return e}function _n(t){return L.divIcon({html:`<div style="transform:rotate(${t}deg);width:10px;height:14px"><svg viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg"><polygon points="5,0 10,14 5,10 0,14" fill="rgba(255,255,255,0.88)" stroke="rgba(0,0,0,0.35)" stroke-width="0.5"/></svg></div>`,className:"",iconSize:[10,14],iconAnchor:[5,7]})}function pe(t){Q.clearLayers(),tt.clearLayers(),L.geoJSON(t,{pane:"roadPane",style:e=>({color:Je(e.properties.fclass),weight:Ye(e.properties.fclass),opacity:.72}),onEachFeature:(e,n)=>{const{name:s,ref:o}=e.properties,a=[s,o].filter(Boolean).join(" · ");a&&n.bindTooltip(a,{sticky:!0,opacity:.85})}}).addTo(Q);for(const e of t.features){const{oneway:n,fclass:s}=e.properties;if(n!=="T"&&n!=="F")continue;const o=e.geometry.type==="LineString"?[e.geometry.coordinates]:e.geometry.coordinates;for(const a of o){if(a.length<2||Ln(a)<3e-4)continue;let i=$n(a);n==="T"&&(i=(i+180)%360);const r=a[Math.floor(a.length/2)];L.marker([r[1],r[0]],{icon:_n(i),pane:"arrowPane",interactive:!1}).addTo(tt)}}}function zt(t){Ct=t,F(Q,t),ue()}function kn(){Ct&&ue()}function ue(){F(tt,Ct&&g.getZoom()>=vn)}const _t=L.layerGroup();let C=null;function fe(t={}){return{color:T().focus,opacity:.7,fill:!1,dashArray:"4 4",...t}}function he(t){_t.clearLayers(),t&&L.geoJSON(t,{style:fe({weight:2,opacity:.75,dashArray:"6 4"})}).addTo(_t)}function ge(t){if(be(),!t)return null;const e=fe({pane:"neighHighlightPane",weight:1.5});if(t.boundary)C=L.geoJSON(t.boundary,{style:e}),C.bindTooltip(t.name);else{const n=t.bbox;C=L.rectangle([[n.min_lat,n.min_lon],[n.max_lat,n.max_lon]],e),C.bindTooltip(`${t.name} (אזור משוער — אין גבול מדויק בנתונים)`)}return C.addTo(g),C.getBounds()}function be(){C&&(g.removeLayer(C),C=null)}const wn='<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>',En='<svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.8 3.5-8.9 8.2-9.8.6-.1 1.2.3 1.3.9.1.6-.3 1.2-.9 1.3-3.7.8-6.4 4-6.4 7.8 0 4.4 3.6 8 8 8 3.8 0 7.1-2.7 7.8-6.4.1-.6.7-1 1.3-.9.6.1 1 .7.9 1.3-.9 4.7-5 8.2-9.8 8.2z"/></svg>';function Sn(){const t=w`
    <header>
      <div class="brand">OD<span class="flow">flow</span></div>
      <div class="sub">ניתוח פערי שירות בתח״צ &nbsp;·&nbsp; <b>תל אביב-יפו</b></div>
      <div class="head-right">
        <div class="tag" title="מקור הנתונים המוצגים כרגע">
          <span class="dot"></span>מהירויות אוטובוס · GTFS · סקר תחנות
        </div>
        <button class="icon-btn" id="themeToggle"
                title="מעבר בין ערכת צבעים בהירה לכהה"
                aria-label="החלפת ערכת צבעים">${wn}${En}</button>
      </div>
    </header>`;return b(t,"#themeToggle").addEventListener("click",Se),{el:t}}const xn=[{id:"avg",label:"מהירות אוטובוס ממוצעת",unit:"קמ״ש",tint:"var(--ramp)",note:"ממוצע כל היום"},{id:"cong",label:"מקטעים בגודש",unit:"% מהרשת",tint:"var(--c-cong)",tone:"var(--c-cong)",note:"מתחת ל־15 קמ״ש"},{id:"seg",label:"מקטעי כביש בניתוח",unit:"",tint:"var(--c-net)",note:"ברחבי העיר"},{id:"board",label:"עליות לאוטובוס ביום",unit:"",tint:"var(--c-ride)",tone:"var(--c-ride)",note:"סקר תחנות"}];function Tn(){const t=w`
    <div class="kpis">
      ${xn.map(s=>`
        <div class="kpi" style="--tint:${s.tint}${s.tone?`;--tone:${s.tone}`:""}">
          <div class="k">${s.label}</div>
          <div class="row">
            <span class="v" data-v="${s.id}">—</span>
            ${s.unit?`<span class="u">${s.unit}</span>`:""}
          </div>
          <div class="d" data-d="${s.id}">${s.note}</div>
        </div>`).join("")}
    </div>`,e=s=>b(t,`[data-v="${s}"]`),n=s=>b(t,`[data-d="${s}"]`);return{el:t,setLoading(s="טוען…"){e("avg").textContent=s,e("seg").textContent=s},setSpeedStats({avgSpeed:s,congestedPct:o,segmentCount:a},i){e("avg").textContent=s==null?"—":s.toFixed(1),e("cong").textContent=o??"—",a&&(e("seg").textContent=m(a)),n("avg").textContent=ne(i)},setScope(s){n("seg").textContent=s?`בגבולות ${s}`:"ברחבי העיר"},setSegmentError(s){e("seg").textContent=s},setRidership(s,o){s!=null&&s.transit?(e("board").textContent=m(s.transit.boardings_day),n("board").textContent=`${m(s.transit.surveyed)} תחנות · ${s.name}`):s?(e("board").textContent="—",n("board").textContent=`אין תחנות מסוקרות ב${s.name}`):o&&(e("board").textContent=m(o.boardings_day),n("board").textContent=`${m(o.surveyed)} תחנות מסוקרות · כל העיר`)}}}const Nt="▶ הרצת יום",Cn="⏸ עצור",Pn=1100;function On({onReset:t}={}){const e=w`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${Nt}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`,n=b(e,".days"),s=b(e,".periods"),o=b(e,".allp"),a=b(e,".spark"),i=b(e,"[data-play]");let r=null;U.forEach((p,v)=>{const E=w`<div class="day">${p}</div>`;E.addEventListener("click",()=>x({day:v})),n.appendChild(E)});const d=w`<div class="day avg">ממוצע</div>`;d.addEventListener("click",()=>x({day:"avg"})),n.appendChild(d),N.forEach((p,v)=>{const E=w`
      <div class="prow">
        <span class="pn">P${v+1}</span>
        <span class="pl">${p}</span>
        <span class="pt">${mt[v]}</span>
      </div>`;E.addEventListener("click",()=>x({period:v})),s.appendChild(E)}),o.addEventListener("click",()=>x({period:"all"}));function c(){r&&(clearInterval(r),r=null,i.textContent=Nt)}i.addEventListener("click",()=>{if(r){c();return}i.textContent=Cn,x({period:0});let p=0;r=setInterval(()=>{p=(p+1)%N.length,x({period:p})},Pn)}),b(e,"[data-reset]").addEventListener("click",()=>{c(),x({day:"avg",period:"all"}),t==null||t()});function f(){if(a.replaceChildren(),!l.speedProfile)return;const p=l.speedProfile.filter(E=>E!=null),v=p.length?Math.max(...p):1;l.speedProfile.forEach((E,h)=>{const y=E==null?0:E/v*100,S=w`
        <div class="spk" title="${N[h]} ${mt[h]}${E==null?" · אין נתונים":` · ${E.toFixed(1)} קמ״ש`}">
          <span class="val">${E==null?"—":E.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${y}%;background:${Wt(E)}"></span></span>
          <span class="lab">P${h+1}</span>
        </div>`;S.addEventListener("click",()=>x({period:h})),a.appendChild(S)}),_()}function _(){[...n.children].forEach((p,v)=>{p.classList.toggle("on",v<U.length&&u.day===v||v===U.length&&u.day==="avg")}),[...s.children].forEach((p,v)=>p.classList.toggle("on",u.period===v)),o.classList.toggle("on",u.period==="all"),[...a.children].forEach((p,v)=>p.classList.toggle("on",u.period===v))}return _(),{el:e,sync:_,buildSpark:f,stopPlaying:c}}const Mn=[{key:"speed",label:"רשת מהירויות אוטובוס",tint:"var(--ramp)",swatch:null},{key:"cong",label:"מוקדי גודש (&lt;15 קמ״ש)",tint:"var(--c-cong)",swatch:"background:var(--sp1)"},{key:"roads",label:"רשת דרכים + כיוונים",tint:"#f9b29c",swatch:"background:#f9b29c"},{key:"dest",label:"מוקדי שירות ותעסוקה",tint:"var(--c-place)",swatch:"multi"},{key:"stops",label:"תחנות ועליות",tint:"var(--c-ride)",swatch:"background:var(--primary)"}];function jn(){const t=w`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${Mn.map(i=>`
        <div class="toggle${u.layers[i.key]?" on":""}" data-layer="${i.key}" style="--tint:${i.tint}">
          <span class="sw"></span>
          ${i.swatch==="multi"?'<span class="tc tc-multi"></span>':i.swatch?`<span class="tc" style="${i.swatch}"></span>`:""}
          <span class="tl">${i.label}</span>
        </div>
        ${i.key==="dest"?'<div class="dest-cats" hidden></div>':""}
        ${i.key==="stops"?'<div id="stopsLegend" class="legend" hidden></div>':""}`).join("")}
    </div>`,e=b(t,".dest-cats"),n=b(t,"#stopsLegend");t.querySelectorAll(".toggle").forEach(i=>{i.addEventListener("click",()=>{const r=i.dataset.layer;u.layers[r]=!u.layers[r],i.classList.toggle("on",u.layers[r]),qt(["layers"])})});function s(){if(!l.destinations)return;const i=r=>l.destinations.categories.filter(d=>se(d.id)===r.id).map(d=>`
        <label class="dest-cat" title="${$(d.name)}">
          <input type="checkbox" data-cat="${d.id}" ${!u.destCats||u.destCats.has(d.id)?"checked":""}>
          <span class="dest-dot" style="background:${ae(d.id)}"></span>
          <span class="dest-name">${$(d.name)}</span>
          <span class="dest-count">${m(d.count)}</span>
        </label>`).join("");e.innerHTML=q.map(r=>{const d=i(r);return d?`<div class="dest-group">
                <span class="dest-dot" style="background:${Xt(r.id)}"></span>${r.name}
              </div>${d}`:""}).join(""),e.querySelectorAll("input[data-cat]").forEach(r=>{r.addEventListener("change",()=>{x({destCats:new Set([...e.querySelectorAll("input[data-cat]:checked")].map(d=>+d.dataset.cat))})})})}function o(){if(!l.stops)return;const i=st(),r=k.visible.filter(c=>c.boardings_day!=null).length,d=i.map((c,f)=>{const _=f===0?0:k.breaks[f-1],p=f<k.breaks.length?k.breaks[f]:null,v=p==null?`${m(_)}+`:`${m(_)}–${m(p)}`;return`<div class="lg"><span style="background:${c}"></span> ${v}</div>`}).join("");n.innerHTML=`
      <div class="stops-legend-title">עליות ליום · ${m(r)} תחנות עם נתוני סקר</div>
      ${d}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`}function a(){e.hidden=!u.layers.dest,n.hidden=!u.layers.stops}return a(),{el:t,renderCategories:s,renderStopsLegend:o,syncPanels:a}}const Rn=["גודש קשה","גודש","איטי","זורם","מהיר / נתיב מהיר"];function In(){const t=Rn.map((s,o)=>{const a=o===0?0:A[o-1],i=o<A.length?A[o]:null,r=i==null?`${a}+`:`${a}–${i}`;return`<span style="background:var(--sp${o+1})" title="${r} קמ״ש · ${s}"></span>`}).join(""),e=["0",...A.map(String),"+"].map(s=>`<i>${s}</i>`).join("");return{el:w`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${t}</div>
      <div class="ramp-ticks">${e}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${Yt} קמ״ש</b>.
      </div>
    </div>`}}const Ht="תל אביב יפו",An=/^\d+[#֐-׿]?$/,Fn=[{id:"urban",label:"עירוני"},{id:"intercity",label:"בין-עירוני"}];function Bn(t){const e=t?t.indexOf("<->"):-1;if(e<0)return null;const n=t.slice(0,e);let s=t.slice(e+3);const o=s.lastIndexOf("-");o>0&&An.test(s.slice(o+1).trim())&&(s=s.slice(0,o));const a=n.slice(n.lastIndexOf("-")+1).trim(),i=s.slice(s.lastIndexOf("-")+1).trim();return a&&i?[a,i]:null}function Dn(t){const e=Bn(t==null?void 0:t.route_long_name);return e&&e[0]===Ht&&e[1]===Ht?"urban":"intercity"}function Gt(t){const e=String(t??""),n=e.match(/^(\d+)(.*)$/);return n?[0,Number(n[1]),n[2]]:[1,0,e]}function zn(t,e){const n=Gt(t.route_short_name),s=Gt(e.route_short_name);return n[0]-s[0]||n[1]-s[1]||n[2].localeCompare(s[2],"he")}function Nn(t){return Fn.map(e=>({...e,routes:t.filter(n=>Dn(n)===e.id).sort(zn)})).filter(e=>e.routes.length>0)}function Hn({onAreaChange:t}={}){const e=w`
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
    </div>`,n=b(e,".neigh-select"),s=b(e,".neigh-routes"),o=b(e,".neigh-header"),a=b(e,".neigh-stats"),i=b(e,".neigh-loading"),r=b(e,".neigh-route-count"),d=b(e,".lines-scroll");let c=[];function f(h){const y=h==null?void 0:h.population;if(!(y!=null&&y.total)){a.hidden=!0,a.replaceChildren();return}const S=y.by_age||{},D=(...lt)=>lt.reduce((_e,ke)=>_e+(S[ke]||0),0),Pt=lt=>y.total?Math.round(lt/y.total*100):0;a.innerHTML=`
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${m(y.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${Pt(D("g0to9","g10to19"))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${Pt(D("g60to69","g70to79","g80up"))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`,a.hidden=!1}function _(h){const y=ln(h.route_id),S=Tt(h.route_id),D=w`
      <li class="${y?"neigh-active":""}">
        <span class="num" style="background:${y?S:`color-mix(in srgb, ${S} 20%, transparent)`};color:${y?"#fff":S}">${$(h.route_short_name||"?")}</span>
        <span class="desc" title="${$(h.route_long_name||"")}">${$(h.route_long_name||"ללא תיאור")}</span>
        <span class="ag">${$(re(h.agency_id))}</span>
        ${y?`<span class="neigh-color-dot" style="background:${S}"></span>`:""}
      </li>`;return D.addEventListener("click",()=>{cn(h),p()}),D}function p(){d.replaceChildren();for(const h of Nn(c)){d.append(w`
        <div class="lines-group">
          <span>${h.label}</span>
          <span class="lines-group-n">${m(h.routes.length)}</span>
        </div>`);const y=w`<ul class="lines"></ul>`;y.append(...h.routes.map(_)),d.append(y)}}b(e,"[data-all]").addEventListener("click",()=>{c.forEach(h=>le(h)),p()}),b(e,"[data-clear]").addEventListener("click",()=>{dt(),p()}),n.addEventListener("change",async()=>{dt(),c=[],p();const h=l.neighbourhoods.find(y=>y.id===n.value)||null;if(!h){s.hidden=!0,x({area:null,areaName:null,areaRecord:null}),t==null||t(null);return}s.hidden=!1,i.hidden=!1,r.textContent="",x({area:{bbox:h.bbox,boundary:h.boundary},areaName:h.name,areaRecord:h}),t==null||t(h),f(h);try{const y=await Ae();c=(h.route_ids||[]).map(S=>y[S]).filter(Boolean)}catch(y){console.error("[AreaPanel] failed to load the route index:",y),i.hidden=!0,o.textContent=`שגיאה: ${y.message}`;return}i.hidden=!0,o.innerHTML=`<b>${$(h.name)}</b> · ${m(c.length)} קווים פעילים ב-GTFS`,r.textContent=c.length?`${m(c.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`:"לא נמצאו קווים באזור זה",p()});async function v(){try{const h=await je();n.append(...h.map(y=>new Option(y.name,y.id)))}catch(h){console.error("[AreaPanel] failed to load neighbourhoods.json:",h)}}function E(){dt(),p()}return{el:e,load:v,renderRoutes:p,clearRoutes:E}}function Gn({dropTarget:t}={}){const e=w`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`,n=b(e,"input[type=file]"),s=b(e,".imported-list");n.addEventListener("change",()=>{[...n.files].forEach(Dt),n.value=""});function o(){s.replaceChildren(),B.forEach((a,i)=>{const r=w`
        <li class="imported-item${a.visible?" on":""}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${$(a.name)}">${$(a.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;b(r,".sw").addEventListener("click",()=>bn(i)),b(r,".imported-remove").addEventListener("click",()=>yn(i)),s.appendChild(r)})}if(gn(o),t){let a=0;t.addEventListener("dragenter",i=>{i.preventDefault(),++a===1&&t.classList.add("drop-active")}),t.addEventListener("dragover",i=>i.preventDefault()),t.addEventListener("dragleave",()=>{--a<=0&&(a=0,t.classList.remove("drop-active"))}),t.addEventListener("drop",i=>{i.preventDefault(),a=0,t.classList.remove("drop-active"),[...i.dataTransfer.files].filter(r=>hn.test(r.name)).forEach(Dt)})}return{el:e,renderList:o}}const Vn={ADULT:"בוגר",YOUTH:"נוער",ELDERLY:"קשיש",STUDENT:"סטודנט",DISABLED:"נכה",OTHER:"אחר"};function P(t,e,n){return`<div class="stop-tile">
            <div class="stop-tile-val"${n?` style="color:${n}"`:""}>${t}</div>
            <div class="stop-tile-lbl">${e}</div>
          </div>`}function Kn(t){const e=t.reduce((n,s)=>n+s,0);return e>0?t.map(n=>n/e*100):t.map(()=>0)}function Vt(t,e,n){const s=Math.max(...e),o=e.indexOf(s),a=st(),i=e.reduce((c,f)=>c+f,0),r=s>=1e4?c=>(+c).toLocaleString("he-IL",{notation:"compact",maximumFractionDigits:1}):c=>m(c);return`<div class="bands">${e.map((c,f)=>{const _=s>0?Math.max(2,Math.round(c/s*46)):2,p=i>0?c/i*100:0;return`
      <div class="band ${f===o?"peak":""}" title="${t[f]} · ${m(c,1)} ${n} (${p.toFixed(0)}%)">
        <div class="band-val">${r(c)}</div>
        <div class="band-bar" style="height:${_}px;background:${f===o?a[a.length-1]:a[2]}"></div>
        <div class="band-lbl">${t[f]}</div>
      </div>`}).join("")}</div>`}function Kt(t,e){const n=Kn(e);return`<div class="riders">${t.map((o,a)=>({label:Vn[o]||o,pct:n[a],value:e[a]})).sort((o,a)=>a.pct-o.pct).map(o=>`
      <div class="rider" title="${o.label} · ${m(o.value,1)} עליות ביום">
        <span class="rider-lbl">${o.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${o.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${o.pct.toFixed(0)}%</span>
      </div>`).join("")}</div>`}function qn(){const t=w`<div id="stopPanel" dir="rtl"></div>`;function e(){At(),t.style.display="none"}function n(a){const i=l.stops.bands,r=a.boardings_day!=null,d=r?i[a.boardings_by_band.indexOf(Math.max(...a.boardings_by_band))]:null,c=[a.street,a.house||""].filter(Boolean).join(" ");return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${$(a.name)}</div>
        <div class="stop-sub">מק״ט ${$(a.code)} · ${a.routes.length||a.routes_reported||0} קווים${c?" · "+$(c):""}</div>
      </div>

      <div class="stop-tiles">
        ${P(m(a.departures_day),"עצירות מתוזמנות ביום")}
        ${P(r?m(a.boardings_day):"—","עליות ביום","var(--primary)")}
        ${P(a.transfer_pct!=null?a.transfer_pct.toFixed(0)+"%":"—","% נסיעות מעבר")}
        ${P(m(a.routes.length||a.routes_reported),"קווים")}
      </div>

      ${a.routes.length?`
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${a.routes.map(f=>`<span class="chip">${$(f)}</span>`).join("")}</div>`:""}

      ${r?`
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${Vt(i,a.boardings_by_band,"עליות")}

        <div class="stop-sec">פילוח נוסעים</div>
        ${Kt(l.stops.rider_types,a.riders)}

        <div class="stop-tiles">
          ${P(a.trips_to_dest!=null?a.trips_to_dest.toFixed(2):"—","נסיעות ממוצע ליעד")}
          ${P(d,"שעת שיא","var(--primary)")}
        </div>`:`
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${$(l.stops.source)}</div>`}function s(){const a=k.visible.filter(f=>f.boardings_day!=null),i=l.stops.bands.map((f,_)=>a.reduce((p,v)=>p+(v.boardings_by_band?v.boardings_by_band[_]:0),0)),r=l.stops.rider_types.map((f,_)=>a.reduce((p,v)=>p+(v.riders?v.riders[_]:0),0)),d=a.reduce((f,_)=>f+_.boardings_day,0),c=[...a].sort((f,_)=>_.boardings_day-f.boardings_day).slice(0,5);return`
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${u.area?"בשכונה הנבחרת":"ברחבי העיר"}</div>
        <div class="stop-sub">${m(k.visible.length)} תחנות · ${m(a.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${P(m(d),"עליות ביום","var(--primary)")}
        ${P(m(a.reduce((f,_)=>f+(_.departures_day||0),0)),"עצירות ביום")}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${Vt(l.stops.bands,i,"עליות")}

      <div class="stop-sec">פילוח נוסעים</div>
      ${Kt(l.stops.rider_types,r)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${c.map(f=>`
          <button class="stop-top-row" data-key="${$(X(f))}">
            <span class="stop-top-name">${$(f.name)}</span>
            <span class="stop-top-val">${m(f.boardings_day)}</span>
          </button>`).join("")}
      </div>
      <div class="stop-src">${$(l.stops.source)}</div>`}function o(){var a;l.stops&&(t.style.display="block",t.scrollTop=0,t.innerHTML=k.selected?n(k.selected):s(),t.querySelector(".stop-close").addEventListener("click",e),(a=t.querySelector(".stop-link"))==null||a.addEventListener("click",()=>{At(),o()}),t.querySelectorAll(".stop-top-row").forEach(i=>{i.addEventListener("click",()=>{const r=k.visible.find(d=>X(d)===i.dataset.key);r&&(ie(r),g.setView([r.lat,r.lon],Math.max(g.getZoom(),16)))})}))}return{el:t,render:o,close:e,refresh(){t.style.display==="block"&&o()}}}function Un(){const t=w`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`,e=b(t,".now"),n=b(t,".lbl");return{el:t,update({day:s,period:o}){const a=s==="avg"?"ממוצע":U[s],i=o==="all"?"כל היום":N[o];e.textContent=`${a} · ${i}`,n.textContent=`${Qe(s)} · ${ne(o)}`}}}const ye=document.getElementById("app"),ot=w`
  <div class="shell" style="display:contents">
    <aside></aside>
    <div id="mapwrap"><div id="map"></div></div>
  </div>`;ye.appendChild(ot);const Jn=b(ot,"aside"),me=b(ot,"#mapwrap"),ve=b(ot,"#map");Ce(ve);const Yn=Sn(),M=Tn(),$e=Un(),G=qn(),it=Hn({onAreaChange:Xn}),rt=On({onReset:Qn}),I=jn(),Zn=In(),Wn=Gn({dropTarget:me});ye.prepend(Yn.el);me.prepend(M.el);ve.append($e.el,G.el);Jn.append(it.el,rt.el,I.el,Zn.el,Wn.el);_t.addTo(g);Q.addTo(g);tt.addTo(g);Y.addTo(g);pn(g);g.on("zoomend",()=>kn());en(()=>G.render());function et(){M.setSpeedStats(Ze(),u.period),$e.update(u)}function Le(){We(u.layers),tn(u.layers.dest),on(u.layers.stops),zt(u.layers.roads),I.syncPanels(),u.layers.roads&&!l.roads&&Fe().then(t=>{pe(t),zt(u.layers.roads)}).catch(t=>console.error("[Roads] failed to load:",t)),u.layers.dest&&Re().then(()=>{I.renderCategories(),W()}).catch(t=>console.error("[Destinations] failed to load:",t)),u.layers.stops?Ie().then(()=>{St(),I.renderStopsLegend()}).catch(t=>console.error("[Stops] failed to load:",t)):G.close()}we((t,e)=>{(e.has("day")||e.has("period"))&&(rt.sync(),et()),e.has("layers")&&Le(),e.has("destCats")&&l.destinations&&W(),e.has("area")&&(ee(),M.setScope(t.areaName),et(),l.destinations&&t.layers.dest&&W(),l.stops&&(St(),I.renderStopsLegend(),G.refresh()),M.setRidership(t.areaRecord,l.stopTotals))});function Xn(t){if(!t){be();return}const e=ge(t);e&&g.fitBounds(e,{padding:[30,30]})}function Qn(){it.clearRoutes(),g.setView(l.center||wt,15)}xe(()=>{Pe(),te(),et(),rt.buildSpark(),he(l.border),u.areaRecord&&ge(u.areaRecord),dn(),it.renderRoutes(),mn(),l.roads&&pe(l.roads),l.destinations&&(I.renderCategories(),W()),l.stops&&(St(),I.renderStopsLegend(),G.refresh())});async function ts(){M.setLoading(),it.load();const{segmentsFailed:t}=await Me();he(l.border),l.center&&g.setView(l.center,13),te(),rt.buildSpark(),et(),M.setRidership(null,l.stopTotals),Le(),t&&M.setSegmentError("שגיאת נתונים")}ts().catch(t=>{console.error("Dashboard failed to start",t),M.setSegmentError("שגיאת רשת")});
