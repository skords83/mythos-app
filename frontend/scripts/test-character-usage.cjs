// Isolated browser fixtures: no user data is read or modified.
const { chromium } = require(process.env.MYTHOS_PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
;(async () => {
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
 try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const world={id:'world',title:'Die Nordlande',visibility:'PRIVATE',updatedAt:'v1'}
  const book={id:'book',universeId:'world',title:'Die Küste',wordGoal:500,createdAt:'2026-11-03',updatedAt:'v1'}
  const person={id:'person',universeId:'world',name:'Mara',visibility:'PRIVATE',updatedAt:'v1'}
  let used=false
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname
   let data=[]
   if(path==='/api/auth') data={user:{id:'author',name:'Testautorin'}}
   if(path==='/api/projects')data={projects:[{...book,_count:{characters:used?1:0,chapters:0}}],pagination:{totalPages:1}}
   if(path==='/api/projects/book')data=book
   if(path==='/api/chapters')data={chapters:[],pagination:{totalPages:1}}
   if(path==='/api/settings')data={settings:{}}
   if(path==='/api/characters')data=used?[person]:[]
   if(path==='/api/story'){
    const {action,args}=route.request().postDataJSON();data={entries:[],hasMore:false}
    if(action==='universes')data={entries:[world],hasMore:false}
    if(action==='universe')data=world
    if(action==='universe_books')data={entries:[book],hasMore:false}
    if(action==='universe_entries')data={entries:args.entityType==='CHARACTER'?[person]:[],hasMore:false}
    if(action==='use_universe_entry'){used=!args.remove;person.updatedAt+='x'}
    if(action==='universe_entry'||action==='use_universe_entry')data={entry:person,usages:used?[{projectId:'book',project:book}]:[]}
    return route.fulfill({json:{data}})
   }
   return route.fulfill({json:data})
  })
  const origin=process.env.MYTHOS_UI_TEST_ORIGIN||'http://127.0.0.1:4000'
  await page.addInitScript(()=>localStorage.setItem('selectedProjectId','book'))
  await page.goto(origin+'/')
  await page.getByRole('button',{name:'Charaktere',exact:true}).click()
  await page.getByText('In diesem Buch verwendet: 0.',{exact:false}).waitFor()
  await page.getByRole('link',{name:/Figuren im Universum auswählen/}).click()
  await page.getByRole('button',{name:'Mara',exact:true}).click()
  await page.getByRole('checkbox',{name:/Die Küste/}).click()
  await page.getByText('Buchverwendung gespeichert.',{exact:true}).waitFor()
  fs.mkdirSync('/tmp/mythos-character-usage',{recursive:true})
  for(const mobile of [false,true]){
   await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000})
   await page.getByRole('checkbox',{name:/Die Küste/}).evaluate(el=>el.scrollIntoView({block:'center'}))
   await page.screenshot({path:`/tmp/mythos-character-usage/universe-${mobile?'mobile':'desktop'}.png`})
   assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth>el.clientWidth),false)
  }
  await page.getByRole('button',{name:'Zum geöffneten Buch'}).click()
  await page.getByRole('button',{name:'Charaktere',exact:true}).click()
  await page.getByText('In diesem Buch verwendet: 1.',{exact:false}).waitFor()
  await page.getByText('Im Universum · In diesem Buch verwendet',{exact:true}).waitFor()
  await page.screenshot({path:'/tmp/mythos-character-usage/book-mobile.png'})
  await page.getByRole('link',{name:/Figuren im Universum auswählen/}).click()
  await page.getByRole('button',{name:'Mara',exact:true}).click()
  await page.getByRole('checkbox',{name:/Die Küste/}).click()
  await page.getByText('Buchverwendung gelöst. Der Eintrag bleibt im Universum.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Mara',exact:true}).waitFor()
  await page.getByRole('button',{name:'Zum geöffneten Buch'}).click()
  await page.getByRole('button',{name:'Charaktere',exact:true}).click()
  await page.getByText('In diesem Buch verwendet: 0.',{exact:false}).waitFor()
  await page.goto(origin+'/dashboard')
  await page.getByText('0 Charaktere in diesem Buch',{exact:true}).waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS: universe selection, add/remove usage, book list/count, dashboard count, retained identity, desktop/mobile')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
