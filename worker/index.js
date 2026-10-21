const ALLOWED_ORIGIN="https://namikoponce914-ops.github.io";
const MENU=new Map([
 ["comfort","需要张珈源哄"],
 ["angry","我生气了"],
 ["happy","我今天很开心"],
 ["custom","我需要宝宝给我买 xxx"],
 ["staple","暖心主食"],
 ["signature","拿手好菜"],
 ["vegetable","清爽时蔬"],
 ["soup","热乎小汤"],
 ["drink","快乐饮品"],
 ["dessert","饭后甜点"]
]);
const VALID_TRANSITIONS=new Set(["pending:cooking","cooking:done"]);

function corsHeaders(request){
 const origin=request.headers.get("origin");
 return {
  "access-control-allow-origin":origin===ALLOWED_ORIGIN?origin:ALLOWED_ORIGIN,
  "access-control-allow-methods":"GET,POST,OPTIONS",
  "access-control-allow-headers":"content-type,x-admin-key",
  "access-control-max-age":"86400",
  "vary":"Origin"
 };
}
function json(request,data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...corsHeaders(request)}});
}
function clean(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
function authorized(request,env){
 const supplied=request.headers.get("x-admin-key")||"";
 return Boolean(env.ADMIN_KEY)&&supplied===env.ADMIN_KEY;
}
async function readBody(request){
 const length=Number(request.headers.get("content-length")||0);
 if(length>20000)throw new Error("提交内容太长");
 return request.json();
}
function validateItems(value){
 if(!Array.isArray(value)||value.length<1||value.length>12)throw new Error("请选择 1 至 12 项内容");
 let total=0;
 const seen=new Set();
 const items=value.map(raw=>{
  const id=clean(raw?.id,30);
  if(!MENU.has(id)||seen.has(id))throw new Error("点单内容无效");
  seen.add(id);
  const qty=Number(raw?.qty);
  if(!Number.isInteger(qty)||qty<1||qty>9)throw new Error("每项数量需为 1 至 9 份");
  total+=qty;
  const customText=clean(raw?.customText,40);
  if(id==="custom"&&!customText)throw new Error("请填写想买的东西");
  return {id,name:MENU.get(id),qty,customText:id==="custom"?customText:""};
 });
 if(total>30)throw new Error("一次最多点 30 份");
 return items;
}
function makeNumber(now){
 const part=now.toISOString().replace(/\D/g,"").slice(4,12);
 const tail=crypto.randomUUID().replace(/-/g,"").slice(0,4).toUpperCase();
 return `HH${part}-${tail}`;
}
async function createOrder(request,env){
 let payload;
 try{payload=await readBody(request);}catch(error){return json(request,{error:error.message==="提交内容太长"?error.message:"提交格式不正确"},400);}
 let items;
 try{items=validateItems(payload?.items);}catch(error){return json(request,{error:error.message},400);}
 const nickname=clean(payload?.nickname,20)||"灰灰宝宝";
 const note=clean(payload?.note,140);
 const now=new Date();
 const createdAt=now.toISOString();
 const id=crypto.randomUUID();
 const number=makeNumber(now);
 await env.DB.prepare("INSERT INTO orders (id, number, nickname, note, items, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)")
  .bind(id,number,nickname,note,JSON.stringify(items),createdAt,createdAt).run();
 return json(request,{ok:true,id,number,createdAt},201);
}
async function listOrders(request,env){
 if(!authorized(request,env))return json(request,{error:"主理人口令不正确"},401);
 const result=await env.DB.prepare("SELECT id, number, nickname, note, items, status, created_at, updated_at FROM orders ORDER BY created_at DESC LIMIT 100").all();
 const orders=(result.results||[]).map(row=>({
  id:row.id,number:row.number,nickname:row.nickname,note:row.note,
  items:JSON.parse(row.items),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at
 }));
 return json(request,{orders});
}
async function updateStatus(request,env){
 if(!authorized(request,env))return json(request,{error:"主理人口令不正确"},401);
 let payload;
 try{payload=await readBody(request);}catch{return json(request,{error:"提交格式不正确"},400);}
 const id=clean(payload?.id,80);
 const from=clean(payload?.from,20);
 const to=clean(payload?.to,20);
 if(!id||!VALID_TRANSITIONS.has(`${from}:${to}`))return json(request,{error:"状态更新无效"},400);
 const result=await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?")
  .bind(to,new Date().toISOString(),id,from).run();
 if(!result.meta?.changes)return json(request,{error:"订单状态已经变化，请刷新后重试"},409);
 return json(request,{ok:true,status:to});
}

export default {
 async fetch(request,env){
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(request)});
  const url=new URL(request.url);
  try{
   if(request.method==="GET"&&url.pathname==="/health")return json(request,{ok:true,service:"huihui-kitchen-sync"});
   if(request.method==="POST"&&url.pathname==="/orders")return await createOrder(request,env);
   if(request.method==="GET"&&url.pathname==="/orders")return await listOrders(request,env);
   if(request.method==="POST"&&url.pathname==="/orders/status")return await updateStatus(request,env);
   return json(request,{error:"接口不存在"},404);
  }catch(error){
   console.error(error);
   return json(request,{error:"收件箱暂时开小差了，请稍后再试"},500);
  }
 }
};
