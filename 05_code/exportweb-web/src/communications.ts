import type {Contact,Project,SiteSettings} from './model';
export const contactTypes=[['whatsapp','WhatsApp'],['email','邮箱'],['phone','电话'],['telegram','Telegram'],['line','LINE'],['wechat','微信'],['messenger','Messenger'],['signal','Signal'],['viber','Viber'],['link','其他通讯链接']] as const;
export function contactHref(c:Contact):string{
 const value=c.value.trim();if(!value)return '';
 if(c.type==='email'){if(!/^[^\s@<>?#]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))throw Error('联系邮箱格式无效');return 'mailto:'+value;}
 if(c.type==='phone'||c.type==='whatsapp'){if(!/^\+?[0-9 ()-]+$/.test(value)||value.replace(/\D/g,'').length<6||value.replace(/\D/g,'').length>20)throw Error('通讯号码请包含国家或地区代码');return c.type==='whatsapp'?'https://wa.me/'+value.replace(/\D/g,''):'tel:'+value.replace(/[^+\d]/g,'');}
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||/[\r\n]/.test(value))throw Error('通讯链接请输入不含登录凭据的 HTTPS 地址');return url.href;
}
export function globalContacts(p:Project):Contact[]{
 const config=p.system||={socialAccounts:{},channels:[]};const contacts=config.contacts||=[];
 // Existing site-local contacts become shared records, retaining each site's own selection.
 const sites=[p.site,...p.websites?.items.map(s=>s.document.site)||[]].filter((s):s is SiteSettings=>!!s);
 for(const site of sites)if(site.communicationIds==null){site.communicationIds=[];for(const [type,label] of contactTypes){const value=site.communications?.[type as keyof typeof site.communications]?.trim();if(!value)continue;let contact=contacts.find(c=>c.type===type&&c.value===value);if(!contact){contact={id:crypto.randomUUID(),type,label,value};contacts.push(contact);}site.communicationIds.push(contact.id);}}
 return contacts;
}
export function selectedContacts(p:Project):Contact[]{
 if(p.site?.communicationIds!=null)return (p.system?.contacts||[]).filter(c=>p.site!.communicationIds!.includes(c.id));
 return contactTypes.flatMap(([type,label])=>{const value=p.site?.communications?.[type as keyof NonNullable<Project['site']>['communications']];return value?[{id:'legacy-'+type,type,label,value}]:[];});
}
export function removeContact(p:Project,id:string){
 const contacts=globalContacts(p);p.system!.contacts=contacts.filter(c=>c.id!==id);
 for(const site of [p.site,...p.websites?.items.map(s=>s.document.site)||[]])if(site?.communicationIds)site.communicationIds=site.communicationIds.filter(x=>x!==id);
}
