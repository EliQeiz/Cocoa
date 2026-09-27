-- Controlled, idempotent demo seed. Run only from the SQL editor as postgres.
-- It creates one organization and a 5,000-bag Ghana cocoa pilot dataset.
do $$
declare
  org_id uuid;
  region_ids uuid[];
  district_ids uuid[];
  society_ids uuid[];
  farmer_ids uuid[];
  farm_ids uuid[];
  agent_ids uuid[];
  warehouse_ids uuid[];
  lot_ids uuid[];
  purchase_ids uuid[];
begin
  select id into org_id from organizations where name = 'AuraFlow AgriTrace Synthetic Pilot 2026';
  if org_id is not null then
    raise notice 'Synthetic pilot already exists: %', org_id;
    return;
  end if;

  insert into organizations (name) values ('AuraFlow AgriTrace Synthetic Pilot 2026') returning id into org_id;
  insert into regions (organization_id,name) values
    (org_id,'Western North'),(org_id,'Ashanti'),(org_id,'Western'),(org_id,'Ahafo'),(org_id,'Bono'),(org_id,'Eastern'),(org_id,'Central');
  select array_agg(id order by name) into region_ids from regions where organization_id=org_id;

  insert into districts (organization_id,region_id,name)
  select org_id, region_ids[1+((g-1)%7)], (array['Sefwi Wiawso','Bibiani-Anhwiaso-Bekwai','Juaboso','Atwima Mponua','Goaso','Tano North','Asunafo North','Ahafo Ano South West','Wassa Amenfi West','Suhum','Assin North','Tarkwa-Nsuaem'])[g]
  from generate_series(1,12) g;
  select array_agg(id order by name) into district_ids from districts where organization_id=org_id;

  insert into societies (organization_id,district_id,name,community)
  select org_id,district_ids[1+((g-1)%12)],'Society '||lpad(g::text,2,'0'),(array['Kwaso','Chiraa','Boinso','Nyinahin','Kukuom','Duayaw Nkwanta','Kenyasi','Asankragwa','Assin Fosu','Adoagyiri'])[1+((g-1)%10)]
  from generate_series(1,25) g;
  select array_agg(id order by name) into society_ids from societies where organization_id=org_id;

  insert into farmers (organization_id,society_id,farmer_code,full_name,phone,gender,community,id_number,consent_at,compliance_status)
  select org_id,society_ids[1+((g-1)%25)],'GH-'||lpad((2400+g)::text,5,'0'),
    (array['Akosua','Ama','Adwoa','Esi','Mabel','Kofi','Kwame','Kojo','Yaw','Daniel'])[1+((g-1)%10)]||' '||(array['Mensah','Boateng','Asante','Owusu','Ofori','Agyeman','Badu','Appiah','Frimpong','Kwarteng'])[1+((g*3-1)%10)],
    '+23324'||lpad((1000000+g)::text,7,'0'),case when g%2=0 then 'F' else 'M' end,(array['Kwaso','Chiraa','Boinso','Nyinahin','Kukuom'])[1+((g-1)%5)],'GHA-'||lpad(g::text,7,'0'),now()-(g%700)*interval '1 day',case when g%13=0 then 'incomplete' when g%17=0 then 'high risk' else 'verified' end
  from generate_series(1,1284) g;
  select array_agg(id order by farmer_code) into farmer_ids from farmers where organization_id=org_id;

  insert into farms (organization_id,farmer_id,district_id,name,size_hectares,crop_type,centroid,deforestation_risk_score,protected_area_proximity_km,last_verified_at)
  select org_id,farmer_ids[1+((g-1)%1284)],district_ids[1+((g-1)%12)],'Cocoa plot '||lpad(g::text,4,'0'),1.1+(g%15)*0.37,'cocoa',
    ST_SetSRID(ST_MakePoint(-2.92+(g%310)*0.001,6.11+(g%210)*0.001),4326)::geography,(g*37+11)%100,0.3+(g%31)*0.17,now()-(g%540)*interval '1 day'
  from generate_series(1,2046) g;
  select array_agg(id order by name) into farm_ids from farms where organization_id=org_id;

  insert into farm_polygons (organization_id,farm_id,geometry,area_hectares,completeness_score,sync_status)
  select org_id,farm_ids[g],jsonb_build_object('type','Polygon','coordinates',jsonb_build_array(jsonb_build_array(jsonb_build_array(-2.92+(g%310)*0.001,6.11+(g%210)*0.001),jsonb_build_array(-2.919+(g%310)*0.001,6.11+(g%210)*0.001),jsonb_build_array(-2.919+(g%310)*0.001,6.111+(g%210)*0.001),jsonb_build_array(-2.92+(g%310)*0.001,6.111+(g%210)*0.001),jsonb_build_array(-2.92+(g%310)*0.001,6.11+(g%210)*0.001)))),1.1+(g%15)*0.37,case when g%13=0 then 0 else 100 end,case when g%8=0 then 'queued' else 'synced' end
  from generate_series(1,2046) g;

  insert into field_agents (organization_id,territory,device_id) select org_id,'Western North cluster '||g,'GH-WN-'||lpad(g::text,2,'0') from generate_series(1,24) g;
  select array_agg(id order by device_id) into agent_ids from field_agents where organization_id=org_id;
  insert into warehouses (organization_id,district_id,name,kind) values (org_id,district_ids[1],'Sefwi Wiawso Depot','depot'),(org_id,district_ids[5],'Goaso Depot','depot'),(org_id,district_ids[9],'Takoradi Warehouse','warehouse'),(org_id,district_ids[10],'Tema Warehouse','warehouse');
  select array_agg(id order by name) into warehouse_ids from warehouses where organization_id=org_id;
  insert into lots (organization_id,lot_code,warehouse_id,buyer,export_readiness_status) select org_id,'LOT-'||(array['WN','AH','W','BN'])[1+((g-1)%4)]||'-0926-'||lpad(g::text,2,'0'),warehouse_ids[1+((g-1)%4)],(array['Cargill Cocoa BV','Olam Food Ingredients','Barry Callebaut','ECOM'])[1+((g-1)%4)],case when g%9=0 then 'blocked' when g%6=0 then 'review' else 'export ready' end from generate_series(1,40) g;
  select array_agg(id order by lot_code) into lot_ids from lots where organization_id=org_id;

  insert into purchases (organization_id,farmer_id,farm_id,agent_id,purchased_at,price,payment_method,moisture,sync_status)
  select org_id,farmer_ids[1+((g-1)%1284)],farm_ids[1+((g-1)%2046)],agent_ids[1+((g-1)%24)],now()-(g%180)*interval '1 day',1800+(g%9)*25,(array['mobile_money','cash','deferred'])[1+((g-1)%3)],6.1+(g%23)*0.13,case when g%8=0 then 'queued' else 'synced' end from generate_series(1,5000) g;
  select array_agg(id order by purchased_at,id) into purchase_ids from purchases where organization_id=org_id;
  insert into bags (organization_id,bag_code,purchase_id,lot_id,weight_kg,status) select org_id,'AF-26-'||lpad((10000+g)::text,6,'0'),purchase_ids[g],lot_ids[1+((g-1)%40)],61+(g%7)*1.35,case when g%17=0 then 'review required' else 'verified' end from generate_series(1,5000) g;
  insert into batch_movements (organization_id,lot_id,from_warehouse_id,to_warehouse_id,moved_at,status) select org_id,lot_ids[g],warehouse_ids[1],warehouse_ids[3],now()-g*interval '1 day','received' from generate_series(1,15) g;
  insert into compliance_checks (organization_id,farm_id,status,checked_at,evidence) select org_id,farm_ids[g],case when g%17=0 then 'high risk' when g%13=0 then 'incomplete' else 'verified' end,now()-(g%365)*interval '1 day',jsonb_build_object('source','synthetic pilot','risk_score',(g*37+11)%100) from generate_series(1,2046) g;
  insert into risk_alerts (organization_id,farm_id,severity,status,recommendation) select org_id,farm_ids[g],case when g%5=0 then 'critical' when g%2=0 then 'high' else 'medium' end,'open','Review polygon, farmer consent, and simulated risk evidence.' from generate_series(1,20) g;
  insert into audit_reports (organization_id,buyer,report_code,report_data) select org_id,(array['Cargill Cocoa BV','Olam Food Ingredients','Barry Callebaut','ECOM'])[1+((g-1)%4)],'AF-AUD-2026-'||lpad((900+g)::text,4,'0'),jsonb_build_object('synthetic',true,'bag_count',625,'status','prototype ready') from generate_series(1,8) g;
end $$;
