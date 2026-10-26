import type {Project,Salesperson,WorkspaceData} from './model';
export function business(project:Project):WorkspaceData{
 return project.workspace??={sales:[],goal:{goal:'',positioning:'',actions:[]}};
}
export function newSalesperson():Salesperson{return {id:crypto.randomUUID(),name:'',marketIds:[],title:'',languages:'',phone:'',email:'',active:true,notes:''};}
