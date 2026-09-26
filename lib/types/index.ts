export type ComplianceStatus = 'Verified' | 'Pending review' | 'Incomplete' | 'High risk';
export type Farmer = { id:string; code:string; name:string; community:string; district:string; region:string; phone:string; farms:number; polygonCoverage:number; lastPurchase:string; status:ComplianceStatus; agent:string; risk:number; idVerified:boolean; hectares:number };
export type Bag = { id:string; farmer:string; farm:string; agent:string; depot:string; date:string; weight:number; moisture:number; lot:string; status:ComplianceStatus };
export type Alert = { id:string; title:string; detail:string; severity:'Critical'|'High'|'Medium'; owner:string; status:'Open'|'In review'|'Resolved'; district:string };
export type Lot = { id:string; bags:number; weight:string; source:string; destination:string; buyer:string; status:'Export ready'|'Blocked'|'Review'; progress:number };
