"use strict";import{QueryClient as F,onlineManager as E,focusManager as R}from"@tanstack/query-core";import{nanoid as j}from"nanoid/non-secure";import v from"object-hash";import{proxy as A}from"valtio/vanilla";export function createOptq(e){const t=e.queryClient??new F,s=A([]),u=A({}),f=A({}),r=getSetter({config:e,requestStore:s,cacheStore:u,predictionStore:f}),d=getGetter({config:e,predictionStore:f}),o=getFetcher({config:e,set:r}),l=getMutator({config:e,requestStore:s,cacheStore:u,predictionStore:f,set:r}),a=new Promise(c=>{if(E.isOnline())return c();const i=E.subscribe(n=>{n&&(i(),c())})}).then(async()=>{if(e?.resumeRequestMode==="sequential"){const c=[];for(const i of s)if(i.waitingNetwork){i.waitingNetwork=!1;try{const n=await l(i);c.push({status:"fulfilled",value:{request:i,response:n}})}catch(n){c.push({status:"rejected",value:{request:i},reason:n})}}return c}return await Promise.all(s.filter(c=>c.waitingNetwork).map(async c=>{c.waitingNetwork=!1;try{const i=await l(c);return{status:"fulfilled",value:{request:c,response:i}}}catch(i){return{status:"rejected",value:{request:c},reason:i}}}))});return R.setEventListener(c=>{const i=()=>c();if(typeof window<"u"&&window.addEventListener)return window.addEventListener("visibilitychange",i,!1),window.addEventListener("focus",i,!1),()=>{window.removeEventListener("visibilitychange",i),window.removeEventListener("focus",i)}}),{config:e,queryClient:t,requestStore:s,cacheStore:u,predictionStore:f,set:r,get:d,fetch:o,mutate:l,pendingResponses:a}}export function getSetter(e){return(t,s,u,f)=>{var r;const d=`GET ${t}`,w=(e.config?.routes?.[d]?.hash??v)(s??{}),a=e.cacheStore[t]?.[w]?.respondedAt;(a===void 0||a<=f)&&((r=e.cacheStore)[t]??(r[t]={}),e.cacheStore[t][w]={value:u,respondedAt:f}),y(e,t,w)}}export function getGetter(e){return(t,...s)=>{const[u]=s,f=`GET ${t}`,r=e.config.routes?.[f];if(!r)return;const o=(r?.hash??v)(u??{}),l=e.predictionStore[t]?.[o];return l!==void 0?l:typeof r.defaultValue=="function"?r.defaultValue(u):r.defaultValue}}export function getFetcher(e){return async(t,...s)=>{const[u,f]=s,r=`GET ${t}`,d=e.config.routes?.[r],o=await k({baseUrl:e.config?.baseUrl??"",method:"GET",path:t,params:u,headers:f});if(o.ok){const l=d?.respondedAt?.(o)??e.config?.respondedAt?.(o)??O(o),w={...o,params:u,request:{headers:f},respondedAt:l},a=d?.transform?.(w)??o.data;e.set(t,u,a,l)}return o}}export function getMutator(e){return async function({id:t=j(),apiId:s,params:u,headers:f,body:r}){let d,o=100;arguments.length>1&&(console.warn("Do not use additional arguments of `mutate` in production."),d=arguments[1],o=arguments[2]??100);const l=e.config?.routes?.[s],w={id:t,apiId:s,params:u,headers:f,body:r},a=[],p=(n,m)=>{const g=`GET ${n}`,x=(e.config?.routes?.[g]?.hash??v)(m??{});for(const[P,b]of a)if(n===P&&x===b)return;a.push([n,x])};if(!e.requestStore.some(n=>n.id===t)){e.requestStore.push({...w,waitingNetwork:!E.isOnline(),affectedPredictions:a}),l?.actions?.({...w,set:p});for(const[n,m]of a)y(e,n,m)}const c=s.slice(0,s.indexOf(" "));return(d?new Promise(n=>setTimeout(()=>n(),o)).then(d):new Promise(n=>{if(E.isOnline())return n();const m=E.subscribe(g=>{if(g){m(),n();const h=e.requestStore.findIndex(S=>S.id===t);h>=0&&(e.requestStore[h].waitingNetwork=!1)}})}).then(()=>k({baseUrl:e.config?.baseUrl??"",method:c,path:s.slice(c.length+1),params:u,headers:f,body:r}))).then(n=>{const m=l?.respondedAt?.(n)??e.config?.respondedAt?.(n)??O(n),g=e.requestStore.findIndex(h=>h.id===t);return g>=0&&(e.requestStore[g].respondedAt=m),l?.onResponse?.({respondedAt:m,params:u,status:n.status,ok:n.ok,headers:n.headers,data:n.data,set:(h,S,x)=>e.set(h,S,x,m),request:w,removeRequest(){const h=e.requestStore.findIndex(S=>S.id===t);if(h>=0){const[S]=e.requestStore.splice(h,1);for(const[x,P]of S.affectedPredictions??[])y(e,x,P)}}}),{...n,respondedAt:m}}).catch(n=>{const m=e.requestStore.findIndex(g=>g.id===t);if(m>=0){const[g]=e.requestStore.splice(m,1);for(const[h,S]of g.affectedPredictions??[])y(e,h,S)}throw n})}}function y(e,t,s){var u;const f=`GET ${t}`,d=e.config.routes?.[f]?.hash??v;(u=e.predictionStore)[t]??(u[t]={}),e.predictionStore[t][s]=e.cacheStore[t]?.[s]?.value;for(const o of e.requestStore){o.affectedPredictions=[];const l=(w,a,p)=>{function c(n){return n===t&&s===d(a)}if(!c(w)||o.respondedAt!==void 0&&e.cacheStore?.[t]?.[s].respondedAt!==void 0&&o.respondedAt<=e.cacheStore[t][s].respondedAt)return;const i=typeof p!="function"?p:p(e.predictionStore[t][s]);e.predictionStore[t][s]=i,o.affectedPredictions.push([t,s])};e.config.routes?.[o.apiId]?.actions?.({...o,set:l})}for(let o=e.requestStore.length-1;o>=0;o--)e.requestStore[o].affectedPredictions.length||e.requestStore.splice(o,1)}async function k({baseUrl:e,method:t,path:s,params:u,headers:f,body:r}){let d=/^https?:\/\//.test(s)?s:e+s;{const n=new URLSearchParams;for(const[g,h]of Object.entries(u??{})){if(h==null)continue;const S=new RegExp(`:${g}(?=/|$)`,"g");S.test(d)?d=d.replace(S,h.toString()):n.append(g,h.toString())}const m=n.toString();d+=`${m?"?":""}${m}`}const o=r===void 0?!0:typeof r=="object"&&(r===null||r.constructor===Object),l=r===void 0?!1:typeof r=="string",w=r===void 0?!1:r instanceof FormData,a=await fetch(d,{method:t,headers:{"content-type":o?"application/json":l?"text/plain":w?"multipart/form-data":"application/octet-stream",...f},body:r===void 0?void 0:o?JSON.stringify(r):r}),p=a.headers.get("content-type"),c=Object.fromEntries(a.headers.entries());let i;try{i=p?.includes("json")?await a.json():p?.startsWith("text/")?await a.text():await a.arrayBuffer()}catch{i=void 0}return{status:a.status,ok:a.ok,headers:c,data:i,raw:a}}function O(e){return BigInt(new Date(e.headers.date??Date.now()).getTime())}
