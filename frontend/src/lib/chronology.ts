export interface ChronologyEvent {id:string;title:string;order:number}
export interface ChronologyRelation {sourceId:string;sourceType:string;targetId:string;targetType:string;relationType:string}
export function chronologyWarnings(events:ChronologyEvent[],relations:ChronologyRelation[],scenes:{id:string;name:string}[]) {
  const byId=new Map(events.map(e=>[e.id,e]));const warnings:string[]=[]
  for(const r of relations){
    if(r.relationType==='BEFORE'&&r.sourceType==='EVENT'&&r.targetType==='EVENT'){
      const a=byId.get(r.sourceId),b=byId.get(r.targetId)
      if(a&&b&&a.order>=b.order)warnings.push(`„${a.title}“ soll vor „${b.title}“ liegen, steht aber nicht davor im Zeitstrahl.`)
    }
    if(r.relationType==='REFERENCES_PAST'&&r.sourceType==='SCENE'&&r.targetType==='EVENT'){
      const referenced=byId.get(r.targetId)
      const anchors=relations.filter(a=>a.sourceType==='SCENE'&&a.sourceId===r.sourceId&&a.targetType==='EVENT'&&a.relationType==='TAKES_PLACE_AT')
      for(const anchor of anchors){const now=byId.get(anchor.targetId);if(now&&referenced&&referenced.order>now.order)warnings.push(`„${scenes.find(s=>s.id===r.sourceId)?.name??'Szene'}“ verweist als Vergangenheit auf „${referenced.title}“, das erst nach „${now.title}“ stattfindet.`)}
    }
  }
  return Array.from(new Set(warnings))
}
