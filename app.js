const categories=["全部","宝宝专属","暖心主食","拿手好菜","清爽时蔬","汤汤水水","甜蜜时刻"];
const dishes=[
 {id:"comfort",category:"宝宝专属",tag:"现在需要你",name:"需要张珈源哄",desc:"想被认真抱抱，也想听你好好哄我",emoji:"🫶",special:true},
 {id:"angry",category:"宝宝专属",tag:"生气预警",name:"我生气了",desc:"请立刻开启哄宝宝模式",emoji:"😾",special:true},
 {id:"happy",category:"宝宝专属",tag:"分享快乐",name:"我今天很开心",desc:"有好心情，想第一时间告诉你",emoji:"🥰",special:true},
 {id:"custom",category:"宝宝专属",tag:"自定义愿望",name:"我需要宝宝给我买 xxx",desc:"选中后，可以填写想要的东西",emoji:"🎁",special:true,custom:true},
 {id:"staple",category:"暖心主食",tag:"人气灵感",name:"暖心主食",desc:"好好吃饭，从这一口开始",image:"assets/food-1.png"},
 {id:"signature",category:"拿手好菜",tag:"主理人推荐",name:"拿手好菜",desc:"想把拿手的，留给你",image:"assets/food-2.png"},
 {id:"vegetable",category:"清爽时蔬",tag:"轻盈一点",name:"清爽时蔬",desc:"餐桌上的一抹小清新",image:"assets/food-3.png"},
 {id:"soup",category:"汤汤水水",tag:"暖心滋味",name:"热乎小汤",desc:"热气腾腾，暖到心里",image:"assets/food-4.png"},
 {id:"drink",category:"甜蜜时刻",tag:"快乐补给",name:"快乐饮品",desc:"给今天加一点点甜",image:"assets/food-5.png"},
 {id:"dessert",category:"甜蜜时刻",tag:"甜蜜收尾",name:"饭后甜点",desc:"甜甜的收尾，也很好",image:"assets/food-6.png"}
];
const API_BASE=(window.HUIHUI_API_BASE||"").replace(/\/$/,"");
const cart=new Map(); let active="全部";
const filters=document.querySelector("#filters"),grid=document.querySelector("#menuGrid"),cartCount=document.querySelector("#cartCount");
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderFilters(){filters.innerHTML=categories.map(c=>`<button type="button" class="${c===active?'active':''}" data-category="${c}">${c}</button>`).join("");}
function renderMenu(){const list=active==="全部"?dishes:dishes.filter(d=>d.category===active);grid.innerHTML=list.map(d=>{const item=cart.get(d.id)||{qty:0,customText:""};return `<article class="dish ${d.special?'special':''}"><div class="dish-image">${d.image?`<img src="${d.image}" alt="${d.name}">`:`<span>${d.emoji}</span>`}</div><div class="dish-body"><small>${d.tag}</small><h3>${d.name}</h3><p>${d.desc}</p>${d.custom?`<input class="wish-input" data-wish="${d.id}" maxlength="40" value="${escapeHtml(item.customText)}" placeholder="想让宝宝买什么？">`:''}<div class="quantity">${item.qty?`<button type="button" data-action="minus" data-id="${d.id}" aria-label="减少">−</button><span>${item.qty} 份</span><button type="button" data-action="plus" data-id="${d.id}" aria-label="增加">＋</button>`:`<span></span><button type="button" class="add" data-action="plus" data-id="${d.id}">选这个</button>`}</div></div></article>`}).join("");}
function updateCount(){cartCount.textContent=[...cart.values()].reduce((n,i)=>n+i.qty,0);}
function toast(text){const el=document.createElement("div");el.className="toast";el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),1800);}
filters.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;active=b.dataset.category;renderFilters();renderMenu();});
grid.addEventListener("input",e=>{if(!e.target.matches("[data-wish]"))return;const old=cart.get(e.target.dataset.wish)||{qty:0,customText:""};cart.set(e.target.dataset.wish,{...old,customText:e.target.value});});
grid.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const d=dishes.find(x=>x.id===b.dataset.id),old=cart.get(d.id)||{qty:0,customText:""};const qty=Math.max(0,Math.min(9,old.qty+(b.dataset.action==="plus"?1:-1)));if(qty)cart.set(d.id,{...old,qty});else cart.delete(d.id);renderMenu();updateCount();});
function renderCart(){const selected=dishes.filter(d=>cart.get(d.id)?.qty);document.querySelector("#cartList").innerHTML=selected.length?selected.map(d=>{const i=cart.get(d.id);return `<div class="cart-line"><span><b>${d.name}</b>${i.customText?`<small>想要：${escapeHtml(i.customText)}</small>`:""}</span><strong>× ${i.qty}</strong></div>`}).join(""):`<p>还没有选择内容，先去挑一挑吧。</p>`;}
document.querySelector("#cartButton").addEventListener("click",()=>{if(!cart.size)return toast("先选一份心愿吧");renderCart();document.querySelector("#orderDialog").showModal();});
document.querySelector("#createMessage").addEventListener("click",async()=>{
 const custom=cart.get("custom");
 if(custom?.qty&&!custom.customText.trim())return toast("请填写想买的东西");
 const nickname=document.querySelector("#nickname").value.trim()||"灰灰宝宝";
 const note=document.querySelector("#note").value.trim();
 const selected=dishes.filter(d=>cart.get(d.id)?.qty).map(d=>{const i=cart.get(d.id);return {id:d.id,name:d.name,qty:i.qty,customText:(i.customText||"").trim()};});
 const lines=selected.map(i=>`• ${i.name}${i.customText?`：${i.customText}`:""} × ${i.qty}`);
 const now=new Date();
 let orderNumber="";
 let syncOk=false;
 const submit=document.querySelector("#createMessage");
 submit.disabled=true;submit.textContent="正在同步点单…";
 try{
  if(!API_BASE)throw new Error("同步后台尚未配置");
  const response=await fetch(`${API_BASE}/orders`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nickname,note,items:selected})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"同步失败");
  orderNumber=data.number||"";syncOk=true;
 }catch(error){console.error(error);}
 finally{submit.disabled=false;submit.textContent="同步点单并生成消息 ♥";}
 const numberLine=orderNumber?`订单号：${orderNumber}\n`:"";
 const message=`🍓 灰灰的小厨房 · 宝宝点单\n\n${numberLine}点单人：${nickname}\n时间：${now.toLocaleString("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}\n\n${lines.join("\n")}${note?`\n\n悄悄话：${note}`:""}\n\n请张珈源主理人查收 ♥`;
 document.querySelector("#messageText").value=message;
 document.querySelector("#syncResult").textContent=syncOk?`点单已同步到主理人收件箱${orderNumber?`，订单号 ${orderNumber}`:""}。也可以把下面的消息发给宝宝。`:"云端同步暂时失败，请先把下面的消息通过微信发给宝宝。";
 document.querySelector("#orderDialog").close();document.querySelector("#messageDialog").showModal();
});
async function copyMessage(){const text=document.querySelector("#messageText").value;try{await navigator.clipboard.writeText(text);toast("点单消息已复制");document.querySelector("#resultHint").textContent="已经复制好啦，回到微信聊天窗口粘贴发送给宝宝。";}catch{const box=document.querySelector("#messageText");box.focus();box.select();toast("请长按文字复制");}}
document.querySelector("#copyMessage").addEventListener("click",copyMessage);
document.querySelector("#shareMessage").addEventListener("click",async()=>{const text=document.querySelector("#messageText").value;if(navigator.share){try{await navigator.share({title:"灰灰的小厨房点单",text});return;}catch(e){if(e.name==="AbortError")return;}}await copyMessage();});
document.querySelector("#closeResult").addEventListener("click",()=>document.querySelector("#messageDialog").close());
renderFilters();renderMenu();updateCount();
