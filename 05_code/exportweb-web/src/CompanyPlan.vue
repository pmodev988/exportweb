<script setup lang="ts">
import {computed,nextTick,onMounted,ref,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {useProject} from './store';
import {marketMatches,type Catalog} from './model';
import {marketRegions} from './generated/market-regions';
const store=useProject(),route=useRoute(),router=useRouter(),catalog=ref<Catalog>(),query=ref(''),error=ref(''),busy=ref(false),dialog=ref<HTMLDialogElement>();
const tabs=[['company','公司及产品','填写公司和产品，补充强项与业务情况。'],['markets','目标市场','选择你希望开展业务的国家或地区，可以多选。']] as const;
const tab=computed(()=>tabs.find(t=>t[0]===route.query.tab)||tabs[0]);
const markets=computed(()=>catalog.value?.markets.filter(m=>marketMatches(m,query.value))||[]);
const marketRegion=ref('north-america'),marketSubregion=ref('all');
const currentMarketRegion=computed(()=>marketRegions.find(r=>r.id===marketRegion.value)!);
const currentMarketCodes=computed(()=>currentMarketRegion.value.subgroups.flatMap(g=>g.markets));
const marketPanels=computed(()=>marketRegions.flatMap(r=>r.subgroups.map(g=>({...g,region:r.id,heading:r.zh+' · '+g.zh,rows:markets.value.filter(m=>g.markets.includes(m.id))}))).filter(g=>g.rows.length&&(query.value.trim()||(g.region===marketRegion.value&&(marketSubregion.value==='all'||g.id===marketSubregion.value)))));
function chooseMarketRegion(id:string){marketRegion.value=id;marketSubregion.value='all';query.value='';}
function selectedIn(codes:string[]){return store.project.company.markets.filter(id=>codes.includes(id)).length;}
watch(()=>route.query.tab,value=>{if(value==='goal')void router.replace({path:'/plan'});},{immediate:true});
const productDescription=computed({get:()=>{const c=store.project.company;return c.description.includes(c.product)?c.description:[c.product,c.description].filter(Boolean).join('\n');},set:(value:string)=>{store.project.company.description=value;store.project.company.product=value.trim().split(/\r?\n/)[0].slice(0,300);}});
async function go(id:string){await router.push({path:'/plan',query:{tab:id}});}
async function save(next?:string){busy.value=true;error.value='';try{await store.flush();if(next)await go(next);}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{busy.value=false;}}
async function tabKey(event:KeyboardEvent,index:number){
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
 const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 await go(tabs[next]![0]);await nextTick();document.getElementById('company-tab-'+tabs[next]![0])?.focus();
}
onMounted(async()=>{try{const response=await fetch('/workspace/catalog.json');if(!response.ok)throw Error('目标市场资料未能读取，请刷新重试。');catalog.value=await response.json();}catch(e){error.value=e instanceof Error?e.message:String(e);}});
</script>
<template><div class="approved-page"><div class="workspace"><div :class="{'profile-workspace':['company','markets'].includes(tab[0])}">
 <div class="pagehead"><div class="between company-page-heading"><div><h1>{{tab[1]}}</h1><p v-if="tab[2]">{{tab[2]}}</p></div></div></div>
 <div class="layout single-task"><div class="stack">
 <nav class="task-tabs" role="tablist" aria-label="公司与市场"><button v-for="(item,index) in tabs" :id="'company-tab-'+item[0]" :key="item[0]" type="button" role="tab" :class="{selected:tab[0]===item[0]}" :aria-selected="tab[0]===item[0]" :aria-controls="'company-panel-'+item[0]" :tabindex="tab[0]===item[0]?0:-1" @click="go(item[0])" @keydown="tabKey($event,index)">{{item[1]}}</button></nav>
 <p v-if="error" role="alert" class="hint error">{{error}}</p>
 <section v-for="item in tabs" :id="'company-panel-'+item[0]" :key="item[0]" class="stack tab-panel" role="tabpanel" :aria-labelledby="'company-tab-'+item[0]" :hidden="tab[0]!==item[0]" tabindex="0">
 <section v-if="item[0]==='company'" class="card company-profile">
  <div class="profile-heading"><h2>公司及产品</h2><p class="small muted">填写公司名称和主要产品，再选择目标市场。补充资料可以帮助分析合作方向。</p><span class="tag" :class="store.revision?'green':'gray'">{{store.revision?'已保存':'待填写'}}</span></div>
  <form @input="store.changed()" @submit.prevent="save()">
   <div><label for="company-name">公司名称 <span class="field-required">必填</span></label><input id="company-name" v-model="store.project.company.name" required maxlength="160" placeholder="公司、工厂或品牌名称"></div>
   <div class="field-grid company-description-fields"><div><label for="company-description">产品或服务描述 <span class="field-required">必填</span></label><textarea id="company-description" v-model="productDescription" required rows="6" maxlength="20000" placeholder="例如：产品或服务的用途、规格、可以提供哪些配合。"></textarea></div><div><label for="company-strength">特色与强项</label><textarea id="company-strength" v-model="store.project.company.strength" rows="6" maxlength="5000" placeholder="例如：按图定制、小批量试制、技术支持。"></textarea></div></div>
   <div class="page-actions"><button type="submit" :disabled="busy">保存</button><button class="primary" type="submit" :disabled="busy" @click.prevent="($event.currentTarget as HTMLButtonElement).form?.reportValidity()&&save('markets')">选择目标市场</button></div>
  </form>
 </section>
 <section v-else-if="item[0]==='markets'" class="card"><div class="market-heading"><h2>目标市场</h2><p class="small muted">选择你想开展业务的国家或地区，可以多选。</p></div>
  <form @submit.prevent="save()"><div class="market-search-heading"><label for="markets-search">查找国家或地区</label><span id="markets-search-help" class="small muted">支持汉字、英文、代码、拼音与拼音首字母</span></div><input id="markets-search" v-model="query" type="search" aria-describedby="markets-search-help" placeholder="美国 / USA / meiguo / mg">
   <div class="market-region-nav" role="group" aria-label="市场地区"><button v-for="r in marketRegions" :key="r.id" type="button" :aria-pressed="!query.trim()&&marketRegion===r.id" @click="chooseMarketRegion(r.id)">{{r.zh}}<small v-if="selectedIn(r.subgroups.flatMap(g=>g.markets))">{{selectedIn(r.subgroups.flatMap(g=>g.markets))}}</small></button></div>
   <div v-if="!query.trim()&&currentMarketRegion.subgroups.length>1" class="market-subregion-nav" role="group" aria-label="地区分区"><button type="button" :aria-pressed="marketSubregion==='all'" @click="marketSubregion='all'">所有<small v-if="selectedIn(currentMarketCodes)">{{selectedIn(currentMarketCodes)}}</small></button><button v-for="g in currentMarketRegion.subgroups" :key="g.id" type="button" :aria-pressed="marketSubregion===g.id" @click="marketSubregion=g.id">{{g.zh}}<small v-if="selectedIn(g.markets)">{{selectedIn(g.markets)}}</small></button></div>
   <div class="market-groups"><section v-for="g in marketPanels" :key="g.id" class="market-region-panel" :aria-label="g.heading"><h3 v-if="query.trim()||(marketSubregion==='all'&&currentMarketRegion.subgroups.length>1)">{{g.heading}}</h3><div class="choice-list"><label v-for="m in g.rows" :key="m.id" class="choice"><input v-model="store.project.company.markets" type="checkbox" :value="m.id" @change="store.changed()"><span><strong>{{m.zh}}</strong><small>{{m.id}} · {{m.en}}</small></span></label></div></section></div><p v-if="catalog&&!markets.length" class="choice-empty muted">没有匹配结果，请换一种名称或缩写。</p>
   <div class="selection-footer"><p role="status">已选 {{store.project.company.markets.length}} 个市场</p><div class="card-actions"><button class="primary" :disabled="busy">保存目标市场</button></div></div>
  </form>
 </section>


 </section>
 </div></div></div></div>

</div></template>
