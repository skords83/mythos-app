// UI acceptance with isolated in-memory API fixtures. Never contacts a real data API.
const { chromium } = require(process.env.MYTHOS_PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
;(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 let page
 try {
 page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.setDefaultTimeout(15000)
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 const world={id:'world',title:'Testuniversum',visibility:'PRIVATE',updatedAt:'v1'}
 const books=[{id:'one',title:'Buch Eins',universeId:'world'},{id:'two',title:'Buch Zwei',universeId:'world'}]
 const people=[{id:'a',name:'Anna',appearance:'Rot',visibility:'PRIVATE',updatedAt:'v1'},{id:'b',name:'Berta',appearance:'Blau',visibility:'PRIVATE',updatedAt:'v1'}]
 const claims=[];let failSave=false,failChapters=false,slowA=false,releaseA
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let data=[]
  if(url.pathname==='/api/auth')data={user:{id:'test',name:'Testautorin'}}
  if(url.pathname==='/api/projects')data={projects:books,pagination:{totalPages:1}}
  if(url.pathname==='/api/settings')data={settings:{}}
  if(url.pathname==='/api/chapters'){
   if(failChapters)return route.fulfill({status:500,json:{error:'Testfehler'}})
   const one=url.searchParams.get('projectId')==='one',second=url.searchParams.get('page')==='2'
   data={chapters:one?(second?[{id:'c101',title:'Kapitel 101'}]:Array.from({length:100},(_,i)=>({id:`c${i+1}`,title:`Kapitel ${i+1}`}))):[{id:'other',title:'Kapitel im zweiten Buch'}],pagination:{totalPages:one?2:1}}
  }
  if(url.pathname==='/api/story'){
   const {action,args}=route.request().postDataJSON();data={entries:[],hasMore:false}
   if(action==='universes')data={entries:[world],hasMore:false}
   if(action==='universe')data=world
   if(action==='universe_books')data={entries:books,hasMore:false}
   if(action==='universe_entries')data={entries:args.entityType==='CHARACTER'?people:[],hasMore:false}
   if(action==='universe_entry'){
    if(slowA&&args.entityId==='a')await new Promise(resolve=>{releaseA=resolve})
    data={entry:people.find(p=>p.id===args.entityId),usages:[]}
   }
   if(action==='update_universe_entry'){
    if(failSave)return route.fulfill({status:500,json:{error:'Test: Speichern fehlgeschlagen'}})
    const person=people.find(p=>p.id===args.entityId);Object.assign(person,args.fields);data={entry:person}
   }
   if(action==='universe_assertions')data={entries:claims,hasMore:false}
   if(action==='create_universe_assertion'){claims.push({...args,id:'claim',updatedAt:'v1',sources:[]});data=claims[0]}
   if(action==='update_universe_assertion'){Object.assign(claims.find(c=>c.id===args.id),args);data=claims[0]}
   return route.fulfill({json:{data}})
  }
  return route.fulfill({json:data})
 })
 await page.goto((process.env.MYTHOS_UI_TEST_ORIGIN||'http://127.0.0.1:4000')+'/universes?universeId=world&entityType=CHARACTER')
 console.log('Opening Anna');await page.getByRole('button',{name:'Anna',exact:true}).click();await page.getByLabel('Name').waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='Anna'));await page.getByLabel('Name').fill('Anna Neu');failSave=true
 await page.getByRole('button',{name:'Allgemeine Angaben speichern'}).click();await page.getByRole('alert').filter({hasText:'Test: Speichern fehlgeschlagen'}).waitFor()
 assert.equal(await page.getByLabel('Name').inputValue(),'Anna Neu')
 assert.equal(await page.getByText('Allgemeine Angaben gespeichert.',{exact:true}).count(),0)
 failSave=false;await page.getByRole('button',{name:'Allgemeine Angaben speichern'}).click();await page.getByText('Allgemeine Angaben gespeichert.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Berta',exact:true}).click();await page.waitForFunction(()=>document.querySelector('textarea')!==null)
 await page.getByLabel('Aussehen').filter({visible:true}).waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='Blau'))
 console.log('Testing delayed selection');slowA=true;await page.getByRole('button',{name:'Anna Neu',exact:true}).click();await page.getByRole('button',{name:'Berta',exact:true}).click()
 await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='Berta'));releaseA();slowA=false
 await page.getByRole('button',{name:'Neuer gemeinsamer Eintrag'}).click();assert.equal(await page.getByLabel('Name').inputValue(),'')
 await page.getByRole('button',{name:'Berta',exact:true}).click()
 console.log('Testing assertions');await page.getByLabel('Ansicht').selectOption('author')
 await page.getByLabel('Eigenschaft / Aussage').fill('Beruf')
 await page.getByLabel('Wert / Inhalt').fill('Pilotin')
 await page.getByLabel('Gültig ab: Buch wählen').selectOption('one')
 await page.getByLabel('Gültig ab: Kapitel optional').selectOption('c101')
 assert.equal(await page.getByLabel('Gültig ab: Kapitel optional').locator('option').count(),102)
 await page.getByRole('button',{name:'Neue Entwicklung speichern'}).click();await page.getByText('Beruf: Pilotin',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Aussage korrigieren'}).click()
 assert.equal(await page.getByLabel('Gültig ab: Kapitel optional').inputValue(),'c101')
 await page.getByLabel('Wert / Inhalt').fill('Kapitänin');await page.getByRole('button',{name:'Korrektur speichern'}).click();await page.getByText('Beruf: Kapitänin',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Aussage korrigieren'}).click();await page.getByRole('button',{name:'Stattdessen neue Entwicklung'}).click()
 assert.equal(await page.getByLabel('Wert / Inhalt').inputValue(),'')
 await page.getByLabel('Gültig ab: Buch wählen').selectOption('two');await page.getByLabel('Gültig ab: Kapitel optional').selectOption('other')
 assert.equal(await page.getByLabel('Gültig ab: Kapitel optional').locator('option').count(),2)
 console.log('Testing chapter failure');failChapters=true;await page.getByLabel('Gültig ab: Buch wählen').selectOption('one')
 const anchor=page.locator('fieldset').filter({has:page.locator('legend').getByText('Gültig ab',{exact:true})}).last()
 await anchor.getByRole('alert').waitFor()
 fs.mkdirSync('/tmp/mythos-form-reliability',{recursive:true})
 await anchor.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/mythos-form-reliability/load-error-desktop.png'})
 failChapters=false;await anchor.getByRole('button',{name:'Erneut laden'}).click();await page.getByLabel('Gültig ab: Kapitel optional').selectOption('c101')
 for(const mobile of [false,true]){
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000})
  await anchor.scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/mythos-form-reliability/anchor-${mobile?'mobile':'desktop'}.png`})
  assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth>el.clientWidth),false)
 }
 assert.deepEqual(errors,[])
 console.log('PASS: draft reset, latest entry wins, failed save retains input, figure rename, statement create/update/reset, chapter 101, book isolation, load retry, desktop/mobile')
 }catch(e){if(page){console.log((await page.locator('body').innerText()).slice(-10000));await page.screenshot({path:'/tmp/forms-failure.png'})}throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
