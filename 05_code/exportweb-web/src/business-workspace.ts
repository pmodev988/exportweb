import type {Project} from './model';

export interface ArticleVersion {revision:number;title:string;body:string;savedAt:string}
export interface Article {id:string;siteId:string;title:string;keywords:string;audience:string;language:string;facts:string;body:string;pageId:string;revision:number;history:ArticleVersion[];detailId?:string}
// Approved presentation state is bounded and validated again by the server. Its sample
// records remain explicitly tagged and are never used as operational business metrics.
export interface BusinessWorkspace {sequence:number;articles:Article[];geo?:Record<string,Record<string,string>[]>}
export function business(p:Project):BusinessWorkspace {
 p.workspace||={sales:[],goal:{goal:'',positioning:'',actions:[]}};
 return p.workspace.business||={sequence:0,articles:[]};
}
