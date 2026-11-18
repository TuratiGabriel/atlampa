/* Nivel 4 sur: BIM individual + planta amueblada de la lámina 20.
   La lectura BIM no se modifica. Al aislar un departamento se recortan sólo
   las mallas de presentación por las celdas que lo forman. */
export function creaVivienda4(api) {
  const { THREE, data, CEN, pieza, geos, ponGeos, pide, ray, cam, lienzo } = api;
  if (!data || !data.buffer) return null;
  const OR = data.origin, Z = data.floorZ;
  const featured = new Map(data.featuredApartments.map(x => [x.id, x]));
  const PAPEL = { floors: 'modulo', walls: 'modulo', doors: 'modulo', windows: 'vidrio-vivienda' };
  const plano = new THREE.TextureLoader().load(data.image, () => pide());
  plano.colorSpace = THREE.SRGBColorSpace;
  plano.magFilter = THREE.LinearFilter;
  const matPlano = new THREE.MeshBasicMaterial({ map: plano, color: 0xffcce5,
    transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2 });
  const matBase = new THREE.MeshBasicMaterial({color:0x682541,side:THREE.DoubleSide});
  const matBaseDestacado = new THREE.MeshBasicMaterial({color:0xa84977,side:THREE.DoubleSide});
  const colorMueble = {
    cama: new THREE.MeshBasicMaterial({ color: 0xe4a6ce }),
    mesa: new THREE.MeshBasicMaterial({ color: 0x8ee1d6 }),
    mueble: new THREE.MeshBasicMaterial({ color: 0xf1bd64 })
  };
  const tintaMueble = new THREE.LineBasicMaterial({ color: 0x281d29 });
  const geometriaDe = (r, celdas) => {
    const src = new Float32Array(data.buffer, r.offset, r.floats);
    const pos = [];
    const aplica = p => [p[0] + OR[0] - CEN[0], p[2] + OR[2], CEN[1] - p[1] - OR[1]];
    const mete = tri => tri.forEach(p => pos.push(...aplica(p)));
    if (!celdas) for (let i = 0; i < src.length; i += 9)
      mete([[src[i], src[i+1], src[i+2]], [src[i+3], src[i+4], src[i+5]],
        [src[i+6], src[i+7], src[i+8]]]);
    else for (const cell of celdas) {
      const ca = Math.cos(cell.angle), sa = Math.sin(cell.angle);
      const toLocal = p => {
        const x = p[0] + OR[0] - cell.center[0], y = p[1] + OR[1] - cell.center[1];
        return [x*ca + y*sa, -x*sa + y*ca, p[2]];
      };
      const toWorld = p => [cell.center[0] + p[0]*ca - p[1]*sa - OR[0],
        cell.center[1] + p[0]*sa + p[1]*ca - OR[1], p[2]];
      // Sólo elementos que tocan la celda. El filtro es conservador; el
      // recorte exacto se hace triángulo por triángulo más abajo.
      const b = r.bbox;
      if (b[1][0]+OR[0] < cell.center[0]-4 || b[0][0]+OR[0] > cell.center[0]+4 ||
          b[1][1]+OR[1] < cell.center[1]-4 || b[0][1]+OR[1] > cell.center[1]+4) continue;
      for (let i = 0; i < src.length; i += 9) {
        let poly = [toLocal([src[i],src[i+1],src[i+2]]),
          toLocal([src[i+3],src[i+4],src[i+5]]),
          toLocal([src[i+6],src[i+7],src[i+8]])];
        for (const [axis, limit, sign] of [[0,-2.75,1],[0,2.75,-1],[1,-2,1],[1,2,-1]]) {
          const next = [];
          for (let j=0; j<poly.length; j++) {
            const a=poly[j], b=poly[(j+1)%poly.length];
            const da=sign*(a[axis]-limit), db=sign*(b[axis]-limit);
            if (da >= -1e-5) next.push(a);
            if ((da < -1e-5 && db > 1e-5) || (da > 1e-5 && db < -1e-5)) {
              const t=da/(da-db);
              next.push(a.map((v,k) => v+(b[k]-v)*t));
            }
          }
          poly=next;
          if (poly.length < 3) break;
        }
        for (let j=1; j<poly.length-1; j++) mete([toWorld(poly[0]),toWorld(poly[j]),toWorld(poly[j+1])]);
      }
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  };
  function grupoElemento(r, celdas, sufijo) {
    const geo = geometriaDe(r, celdas);
    if (!geo) return null;
    const g = pieza('vivienda4-' + r.category + '-' + r.id + '-' + sufijo, 'vivienda', .75);
    g.userData.oculto = true;
    g.userData.element = r;
    ponGeos(g, geos(geo, PAPEL[r.category], 35, null, true), PAPEL[r.category], 'vivienda');
    g.traverse(o => { if (o.isMesh) o.userData.wallId = r.category === 'walls' && r.wallFunction === '1' ? r.id : null; });
    return g;
  }
  const completos = data.elements.map(r => grupoElemento(r, null, 'completo')).filter(Boolean);
  const apt = new Map(), planos = [], mobiliario = [];
  const reg = data.registration;
  const worldToPixel = (u,v) => [reg.x0+reg.a*(u-reg.center[0])+reg.b*(v-reg.center[1]),
    reg.y0+reg.b*(u-reg.center[0])-reg.a*(v-reg.center[1])];
  const angle = -10*Math.PI/180;
  for (const a of data.apartments) {
    const cells = a.centers.map(center => ({center,angle}));
    const g = pieza('vivienda4-plano-' + a.id, 'vivienda', .76);
    g.userData.oculto = true;
    for (const c of cells) {
      const corners = [[-2.75,-2], [2.75,-2], [2.75,2], [-2.75,2]].map(([x,y]) =>
        [c.center[0]+x*Math.cos(angle)-y*Math.sin(angle),
         c.center[1]+x*Math.sin(angle)+y*Math.cos(angle)]);
      const vertices=[], uv=[];
      for (const [u,v] of corners) {
        vertices.push(u-CEN[0], Z+.018, CEN[1]-v);
        const [px,py]=worldToPixel(u,v);
        uv.push(px/data.imageSize[0], 1-py/data.imageSize[1]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      geo.setIndex([0,2,1,0,3,2]);
      geo.computeVertexNormals();
      const baseGeo=geo.clone();
      const basePos=baseGeo.getAttribute('position');
      for(let j=0;j<basePos.count;j++) basePos.setY(j,Z+.011);
      basePos.needsUpdate=true;
      const baseMesh=new THREE.Mesh(baseGeo,featured.has(a.id)?matBaseDestacado:matBase);
      baseMesh.userData.apartmentId=a.id;
      g.add(baseMesh);
      const mesh=new THREE.Mesh(geo,matPlano);
      mesh.userData.apartmentId=a.id;
      g.add(mesh);
    }
    apt.set(a.id, { id:a.id, cells, plane:g, groups:null });
    planos.push(g);
  }
  for (let i=0; i<data.furniture.length; i++) {
    const item=data.furniture[i], corners=item.corners;
    if (!data.furniture3dEnabled || !featured.has(item.apartment)) continue;
    const p0=corners[0], p1=corners[1], p2=corners[2];
    const w=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);
    const d=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);
    const h=item.kind==='cama'?.48:item.kind==='mesa'?.74:.72;
    const center=[(p0[0]+p2[0])/2,(p0[1]+p2[1])/2];
    const g=pieza('vivienda4-mueble-'+i,'vivienda',.77);
    g.userData.oculto=true;
    g.userData.apartmentId=item.apartment;
    const geo=new THREE.BoxGeometry(w,h,d);
    const mesh=new THREE.Mesh(geo,colorMueble[item.kind]);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),tintaMueble));
    g.add(mesh);
    g.rotation.y=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);
    g.position.set(center[0]-CEN[0],Z+h/2+.03,CEN[1]-center[1]);
    mobiliario.push(g);
  }
  let selected=null, selectedWall=null, wallPart=null, exploded=null;
  const resultFloor = () => [...completos,...planos,...mobiliario];
  function apartmentIds() { return [...featured.keys()]; }
  function apartmentAt(ev) {
    if (!ev) return null;
    const r=lienzo.getBoundingClientRect();
    const ndc=new THREE.Vector2((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(ndc,cam());
    const meshes=planos.flatMap(g=>g.children);
    const hit=ray.intersectObjects(meshes,false)[0];
    const id=hit?.object.userData.apartmentId;
    return featured.has(id) ? id : null;
  }
  function selectApartment(id) {
    const entry=apt.get(id);
    if (!entry || !featured.has(id)) return {ok:false,reason:'departamento_no_preparado',apartments:apartmentIds()};
    if (!entry.groups) entry.groups=data.elements.map(r=>grupoElemento(r,entry.cells,id)).filter(Boolean);
    selected=entry; selectedWall=null;
    const furniture=mobiliario.filter(g=>g.userData.apartmentId===id);
    return {ok:true,id,groups:[...entry.groups,entry.plane,...furniture],
      wallIds:[featured.get(id).wallId]};
  }
  function wallAt(ev) {
    if (!selected || !ev) return null;
    const r=lienzo.getBoundingClientRect();
    const ndc=new THREE.Vector2((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(ndc,cam());
    const wanted=featured.get(selected.id).wallId;
    const meshes=selected.groups.filter(g=>g.userData.element.category==='walls' && g.userData.element.id===wanted)
      .flatMap(g=>g.children.filter(o=>o.isMesh));
    const hit=ray.intersectObjects(meshes,false)[0];
    return hit ? hit.object.userData.wallId : null;
  }
  function selectWall(id) {
    if (!selected) return {ok:false,reason:'departamento_no_aislado'};
    const g=selected.groups.find(g=>g.userData.element.category==='walls' &&
      g.userData.element.wallFunction==='1' && g.userData.element.id===id &&
      featured.get(selected.id).wallId===id);
    if (!g) return {ok:false,reason:'muro_exterior_no_en_departamento'};
    selectedWall=g.userData.element;
    wallPart=g;
    return {ok:true,id,groups:[g],name:selectedWall.name};
  }
  function explodeWall() {
    if (!selectedWall || !selectedWall.axis) return {ok:false,reason:'muro_no_aislado'};
    if (exploded && exploded.userData.wallId===selectedWall.id)
      return {ok:true,id:selectedWall.id,groups:[exploded],layers:data.wallLayers};
    const a=selectedWall.axis[0], b=selectedWall.axis[1];
    const x1=a[0]+OR[0],y1=a[1]+OR[1],x2=b[0]+OR[0],y2=b[1]+OR[1];
    const len=Math.hypot(x2-x1,y2-y1), height=selectedWall.bbox[1][2]-selectedWall.bbox[0][2];
    if (len<.2 || height<.3) return {ok:false,reason:'muro_sin_dimensiones'};
    const g=pieza('vivienda4-muro-capas-'+selectedWall.id,'vivienda',.9);
    g.userData.oculto=true; g.userData.wallId=selectedWall.id;
    g.position.set((x1+x2)/2-CEN[0],selectedWall.bbox[0][2]+height/2,CEN[1]-(y1+y2)/2);
    g.rotation.y=Math.atan2(y2-y1,x2-x1);
    const colors=[0xf5f2e8,0xc7894d,0xf384ab,0xd9a15b,0xe5eef0,0x7e8795];
    const thickness=[.025,.12,.11,.025,.008,.035];
    for(let i=0;i<6;i++) {
      const layer=new THREE.Group();
      layer.position.z=(i-2.5)*.48;
      const mat=new THREE.MeshBasicMaterial({color:colors[i],side:THREE.DoubleSide});
      if(i===1 || i===2) {
        const studs=i===1;
        const count=Math.max(3,Math.ceil(len/.6));
        for(let j=0;j<count;j++) {
          if(!studs && j===count-1) break;
          const w=studs ? .065 : Math.max(.15,len/count-.08);
          const q=new THREE.Mesh(new THREE.BoxGeometry(w,height,thickness[i]),mat);
          q.position.x=-len/2+(j+(studs ? .5 : 1))*len/count;
          layer.add(q);
        }
      } else if(i===5) {
        const count=Math.max(4,Math.ceil(height/.42));
        for(let j=0;j<count;j++) {
          const q=new THREE.Mesh(new THREE.BoxGeometry(len,height/count-.018,thickness[i]),mat);
          q.position.y=-height/2+(j+.5)*height/count;
          layer.add(q);
        }
      } else layer.add(new THREE.Mesh(new THREE.BoxGeometry(len,height,thickness[i]),mat));
      layer.traverse(o=>{if(o.isMesh)o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),tintaMueble));});
      g.add(layer);
    }
    exploded=g;
    return {ok:true,id:selectedWall.id,groups:[g],layers:data.wallLayers};
  }
  return {floorGroups:resultFloor,apartmentIds,apartmentAt,selectApartment,wallAt,selectWall,explodeWall,
    get selectedApartment(){return selected ? selected.id : null;},
    get selectedWall(){return selectedWall ? selectedWall.id : null;}};
}
