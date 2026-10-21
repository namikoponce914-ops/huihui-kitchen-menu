const API_BASE=(window.HUIHUI_API_BASE||"").replace(/\/$/,"");
const STATUS_META={
 pending:{label:"待接单",action:"开始准备",next:"cooking"},
 cooking:{label:"准备中",action:"完成啦",next:"done"},
 done:{label:"已完成",action:"已完成",next:""}
};
let adminKey=sessionStorage.getItem("huihuiOwnerKey")||"";
let refreshTimer;
const loginPanel=document.querySelector("#loginPanel");
const inboxPanel=document.querySelector("#inboxPanel");
const orderList=document.querySelector("#orderList");
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatTime(value){const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});}
async function api(path,options={}){
 if(!API_BASE)throw new Error("同步后台尚未配置");
 const response=await fetch(`${API_BASE}${path}`,{...options,headers:{"content-type":"application/json","x-admin-key":adminKey,...options.headers}});
 const data=await response.json().catch(()=>({}));
 if(response.status===401)throw Object.assign(new Error("口令不正确"),{unauthorized:true});
 if(!response.ok)throw new Error(data.error||"请求失败");
 return data;
}
function renderOrders(orders){
 const counts={pending:0,cooking:0,done:0};
 orders.forEach(order=>{if(counts[order.status]!==undefined)counts[order.status]++;});
 Object.entries(counts).forEach(([status,count])=>document.querySelector(`#${status}Count`).textContent=count);
 if(!orders.length){orderList.innerHTML='<div class="empty-inbox"><span>🎀</span><h2>收件箱还是空的</h2><p>宝宝提交点单后，会自动出现在这里。</p></div>';return;}
 orderList.innerHTML=orders.map(order=>{
  const items=(order.items||[]).map(item=>`<li><span>${escapeHtml(item.name)}${item.customText?`<small>想要：${escapeHtml(item.customText)}</small>`:""}</span><b>× ${item.qty}</b></li>`).join("");
  const meta=STATUS_META[order.status]||STATUS_META.pending;
  return `<article class="owner-order status-${escapeHtml(order.status)}">
    <header><div><small>${escapeHtml(order.number)}</small><h2>${escapeHtml(order.nickname)}</h2></div><span class="status-chip">${meta.label}</span></header>
    <time>${formatTime(order.createdAt)}</time>
    <ul>${items}</ul>
    ${order.note?`<blockquote>“${escapeHtml(order.note)}”</blockquote>`:""}
    ${meta.next?`<button class="primary status-button" type="button" data-id="${escapeHtml(order.id)}" data-from="${escapeHtml(order.status)}" data-to="${meta.next}">${meta.action}</button>`:'<div class="done-note">这一份心愿已经完成啦 ♥</div>'}
  </article>`;
 }).join("");
}
async function loadOrders({silent=false}={}){
 if(!silent)orderList.innerHTML='<div class="loading-card">正在同步最新点单…</div>';
 try{
  const data=await api("/orders");
  renderOrders(data.orders||[]);
  document.querySelector("#lastUpdated").textContent=`刚刚同步 · ${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}`;
 }catch(error){
  if(error.unauthorized){logout("主理人口令不正确，请重新输入。");return;}
  if(!silent)orderList.innerHTML=`<div class="error-card"><b>暂时没有连上收件箱</b><p>${escapeHtml(error.message)}</p><button class="secondary" type="button" id="retryButton">再试一次</button></div>`;
 }
}
function showInbox(){
 loginPanel.hidden=true;inboxPanel.hidden=false;
 clearInterval(refreshTimer);refreshTimer=setInterval(()=>loadOrders({silent:true}),15000);
 loadOrders();
}
function logout(message=""){
 clearInterval(refreshTimer);adminKey="";sessionStorage.removeItem("huihuiOwnerKey");
 inboxPanel.hidden=true;loginPanel.hidden=false;
 document.querySelector("#ownerKey").value="";
 document.querySelector("#loginError").textContent=message;
}
async function login(){
 const key=document.querySelector("#ownerKey").value.trim();
 if(!key){document.querySelector("#loginError").textContent="请输入主理人口令。";return;}
 adminKey=key;document.querySelector("#loginError").textContent="";
 const button=document.querySelector("#loginButton");button.disabled=true;button.textContent="正在打开…";
 try{await api("/orders");sessionStorage.setItem("huihuiOwnerKey",adminKey);showInbox();}
 catch(error){adminKey="";document.querySelector("#loginError").textContent=error.unauthorized?"口令不正确，请再试一次。":error.message;}
 finally{button.disabled=false;button.textContent="打开收件箱 ♥";}
}
document.querySelector("#loginButton").addEventListener("click",login);
document.querySelector("#ownerKey").addEventListener("keydown",event=>{if(event.key==="Enter")login();});
document.querySelector("#refreshButton").addEventListener("click",()=>loadOrders());
document.querySelector("#logoutButton").addEventListener("click",()=>logout());
orderList.addEventListener("click",async event=>{
 const button=event.target.closest(".status-button");
 if(!button)return;
 button.disabled=true;button.textContent="正在更新…";
 try{await api("/orders/status",{method:"POST",body:JSON.stringify({id:button.dataset.id,from:button.dataset.from,to:button.dataset.to})});await loadOrders({silent:true});}
 catch(error){button.disabled=false;button.textContent="更新失败，请重试";}
});
orderList.addEventListener("click",event=>{if(event.target.id==="retryButton")loadOrders();});
if(adminKey)showInbox();
