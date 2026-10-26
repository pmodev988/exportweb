// These browser hints contain no credentials and never grant organization access.
const pendingKey='exportweb-login-return',signedOutKey='exportweb-explicit-logout';
function workspaceHash(value:string){return /^#\/(?!\/)[^\u0000-\u001f]*$/.test(value)?value:'#/';}
export function beginLogin(automatic=false){
  try{
    if(automatic&&(sessionStorage.getItem(pendingKey)!==null||sessionStorage.getItem(signedOutKey)==='1'||new URLSearchParams(location.search).has('signedOut')))return false;
    sessionStorage.setItem(pendingKey,workspaceHash(location.hash||'#/'));
    sessionStorage.removeItem(signedOutKey);
  }catch{if(automatic)return false;} // Storage-blocked browsers retain a usable manual login without redirect loops.
  location.assign('/oauth2/authorization/exportweb');return true;
}
export function completeLogin(){
  let target:string|null=null;
  try{target=sessionStorage.getItem(pendingKey);sessionStorage.removeItem(pendingKey);sessionStorage.removeItem(signedOutKey);}catch{}
  if(target&&workspaceHash(target)===target&&target!==(location.hash||'#/')){location.replace('/workspace/'+target);return true;}
  return false;
}
export function leaveAfterLogout(){
  try{sessionStorage.removeItem(pendingKey);sessionStorage.setItem(signedOutKey,'1');}catch{}
  location.assign('/workspace/?signedOut=1');
}
