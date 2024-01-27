"use strict";import{jsx as g}from"react/jsx-runtime";import{QueryClientProvider as S,useQuery as q}from"@tanstack/react-query";import w from"object-hash";import{createContext as b,useCallback as y,useContext as A,useEffect as O,useMemo as k,useState as C}from"react";import{subscribe as x,useSnapshot as T}from"valtio";import{getDefaultRespondedAt as v,getGetterInner as E,internalFetch as N}from"./internal.js";const h=b(void 0);export function OptqProvider({children:e,value:u}){return g(h.Provider,{value:u,children:g(S,{client:u.queryClient,children:e})})}export function useOptq(){const e=A(h);if(!e)throw new Error("Missing OptqProvider");const u=y(({resourceId:s,params:i,headers:a,...c})=>{const f=`GET ${s}`,t=e.config.routes?.[f],o=t?.hash??w,r=E(e),{data:n,...d}=q({queryKey:[s,o(i??{})],queryFn:async()=>{const l=await N({baseUrl:e.config?.baseUrl??"",method:"GET",path:s,params:i,headers:a});if(l.ok){const m=t?.respondedAt?.(l)??e.config?.respondedAt?.(l)??v(l);e.set(s,i,l.data,m)}return l},...c}),p=T(e.predictionStore);return{data:k(()=>r(p,s,i),[r,p,s,i]),last:n,...d}},[e]);return{...e,useQuery:u}}export function useOptqRequestStats(e,u={debounce:1e3}){const[s,i]=C({completed:0,offline:0,pending:0,total:0,ratio:0});return O(()=>{let a;return x(e.requestStore,c=>{e.requestStore.length===0?a=setTimeout(()=>{i({completed:0,offline:0,pending:0,total:0,ratio:1})},u.debounce):clearTimeout(a);const f=c.find(t=>t[0]==="set"&&t[1].length===1&&t[1][0]!=="length"&&t[3]===void 0);i(f?t=>{const o=Math.max(t.total+1,e.requestStore.length),r=e.requestStore.filter(d=>!d.waitingNetwork&&d.respondedAt===void 0).length,n=e.requestStore.filter(d=>d.waitingNetwork&&d.respondedAt===void 0).length;return{completed:o-r-n,offline:n,pending:r,total:o,ratio:(o-r-n)/o}}:t=>{const o=e.requestStore.filter(n=>!n.waitingNetwork&&n.respondedAt===void 0).length,r=e.requestStore.filter(n=>n.waitingNetwork&&n.respondedAt===void 0).length;return{completed:t.total-o-r,offline:r,pending:o,total:t.total,ratio:(t.total-o-r)/t.total}})})},[e.requestStore,u.debounce]),s}