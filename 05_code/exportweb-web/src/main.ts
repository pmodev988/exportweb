import {createApp} from 'vue';
import {createPinia} from 'pinia';
import {createRouter,createWebHashHistory} from 'vue-router';
import {createI18n} from 'vue-i18n';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import App from './App.vue';
import './style.css';
import './workspace.css';
import './generated/approved-workspace.css';
import './website-workspace.css';
import './site-view.css';
const router=createRouter({history:createWebHashHistory(),routes:[
 {path:'/',redirect:'/website'},
 {path:'/plan',component:()=>import('./CompanyPlan.vue')},
 {path:'/website',component:()=>import('./Website.vue')},
 {path:'/inquiries',component:()=>import('./WebsiteInquiries.vue')},
 {path:'/:pathMatch(.*)*',redirect:'/website'}
]});
createApp(App).use(createPinia()).use(router).use(createI18n({legacy:false,locale:'zh',fallbackLocale:'en',messages:{zh:{home:'首页',plan:'公司与市场',website:'独立网站'},en:{home:'Home',plan:'Company and markets',website:'Website'},ja:{home:'ホーム',plan:'会社と市場',website:'ウェブサイト'}}})).use(ElementPlus).mount('#app');
