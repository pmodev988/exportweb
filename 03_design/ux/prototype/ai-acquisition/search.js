(function(root){
'use strict';
const data=typeof module!=='undefined'&&module.exports?require('./search-index.js'):root.LGASearchIndex;
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g,'');
function find(kind,query){const q=normalize(query),rows=data[kind]||[];return rows.filter(row=>!q||row.keys.some(k=>k.includes(q))).sort((a,b)=>Number(b.keys.includes(q))-Number(a.keys.includes(q)));}
const api={find,normalize,data};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGASearch=api;
})(globalThis);
