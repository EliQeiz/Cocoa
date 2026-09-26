import { mkdirSync, writeFileSync } from 'node:fs';

const first = ['Akosua','Ama','Adwoa','Afia','Esi','Mabel','Abena','Yaa','Kofi','Kwame','Kojo','Yaw','Daniel','Samuel','Isaac','Ernest','Nana','Kwaku'];
const last = ['Mensah','Boateng','Asante','Owusu','Ofori','Agyeman','Badu','Appiah','Frimpong','Kwarteng','Adjei','Amoako','Antwi','Serwaa','Agyapong','Nyarko'];
const places = [
  ['Western North','Sefwi Wiawso','Kwaso'],['Western North','Bibiani-Anhwiaso-Bekwai','Chiraa'],['Western North','Juaboso','Boinso'],['Ashanti','Atwima Mponua','Nyinahin'],['Ahafo','Goaso','Kukuom'],['Ahafo','Tano North','Duayaw Nkwanta'],['Ahafo','Asunafo North','Kenyasi'],['Western','Wassa Amenfi West','Asankragwa'],['Central','Assin North','Assin Fosu'],['Eastern','Suhum','Adoagyiri'],['Bono','Ahafo Ano South West','Kenyasi'],['Western','Tarkwa-Nsuaem','Tarkwa']
];
const headers = ['record_id','farmer_code','farmer_name','gender','phone','region','district','community','society','farm_code','farm_hectares','polygon_status','polygon_points','latitude','longitude','deforestation_risk','protected_area_km','id_verified','consent_status','bag_id','bag_weight_kg','moisture_pct','purchase_date','purchase_price_ghs','payment_method','agent_code','lot_code','warehouse','export_status','sync_status','yield_kg','weather_condition','anomaly_flag'];
const rows = [];
for (let i=0;i<5000;i++) {
  const p=places[i%places.length], risk=(i*37+11)%100, poly=i%13===0?'missing':i%11===0?'review':'verified', verified=i%17!==0, day=String(1+i%28).padStart(2,'0');
  rows.push([
    `ATR-26-${String(i+1).padStart(6,'0')}`,`GH-${String(2401+i%1284).padStart(4,'0')}`,`${first[i%first.length]} ${last[(i*3)%last.length]}`,i%2?'M':'F',`+23324${String(1000000+i%8999999).padStart(7,'0')}`,...p,`${p[2]} ${i%2?'Society':'Depot'}`,`FARM-${String(1000+i%2046).padStart(5,'0')}`,(1.1+(i%15)*.37).toFixed(2),poly,poly==='missing'?0:4+i%5,(6.11+(i%210)*.001).toFixed(6),(-2.92+(i%310)*.001).toFixed(6),risk,(.3+(i%31)*.17).toFixed(2),verified?'true':'false',i%19?'captured':'pending',`AF-26-${String(10001+i).padStart(6,'0')}`,(61+i%7*1.35).toFixed(1),(6.1+i%23*.13).toFixed(1),`2026-09-${day}`,(1800+i%9*25).toFixed(2),['Mobile money','Cash','Deferred'][i%3],`PC-WN-${String(1+i%24).padStart(2,'0')}`,`LOT-${['WN','AH','W','BN'][i%4]}-0926-${String(1+i%40).padStart(2,'0')}`,['Takoradi Warehouse','Tema Warehouse','Kumasi Warehouse'][i%3],risk>75||poly==='missing'?'review required':'export ready',i%8===0?'queued':'synced',450+i%820,['Clear','Light rain','Cloudy','Humid'][i%4],risk>88||i%97===0?'true':'false'
  ]);
}
mkdirSync('data', {recursive:true});
const csv = [headers.join(','),...rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
writeFileSync('data/agritrace-synthetic-pilot-5000.csv', csv);
writeFileSync('data/agritrace-synthetic-pilot-sample.json', JSON.stringify(rows.slice(0,100).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]]))),null,2));
console.log(`Generated ${rows.length} synthetic cocoa traceability records.`);
