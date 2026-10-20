import { describe, expect, it } from "vitest";
import { filterRulaMobileRows, type RulaMobileRow } from "./RulaMobileEvaluationTable";
const rows: RulaMobileRow[] = [
  { id:"one",number:1,group:"A",label:"بازوی بالا",angle:"60°",diagnosis:"Detected",score:3,share:43,title:"تکیه‌گاه بازو",description:"توضیح کامل",priority:"HIGH",status:"IN_PROGRESS" },
  { id:"two",number:2,group:"B",label:"گردن",angle:"—",diagnosis:"Pending",score:null,share:null,title:"",description:"",image:"neck.png" },
  { id:"three",number:3,group:"B",label:"تنه",angle:"15°",diagnosis:"Detected",score:2,share:29,title:"تنظیم ارتفاع",description:"",priority:"LOW",status:"COMPLETED" },
];
describe("RULA mobile filtering", () => {
  it("preserves rows and scores while combining group, priority and action state", () => {
    expect(filterRulaMobileRows(rows,"","all","all","all",false)).toEqual(rows);
    expect(filterRulaMobileRows(rows,"","A","HIGH","pending",false)).toEqual([rows[0]]);
    expect(filterRulaMobileRows(rows,"","B","all","done",false)).toEqual([rows[2]]);
    expect(filterRulaMobileRows(rows,"","all","all","none",false)).toEqual([rows[1]]);
    expect(rows[1].score).toBeNull();
  });
  it("finds full action descriptions, image names and Persian row numbers", () => {
    for (const query of ["توضیح کامل","۱","تکیه‌گاه"]) expect(filterRulaMobileRows(rows,query,"all","all","all",false)).toEqual([rows[0]]);
    expect(filterRulaMobileRows(rows,"neck.png","all","all","all",false)).toEqual([rows[1]]);
  });
  it("sorts priorities without changing original numbering or input order", () => {
    const input=[rows[2],rows[1],rows[0]];
    expect(filterRulaMobileRows(input,"","all","all","all",true).map(row=>row.number)).toEqual([1,3,2]);
    expect(input.map(row=>row.number)).toEqual([3,2,1]);
  });
});
