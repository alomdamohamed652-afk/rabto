// Landing page screenshots (AR/EN desktop and mobile) for the illustration check. Needs E2E_PROD=1.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
for(const lang of ['ar','en'])for(const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]){
 const pg=await br.newPage();await pg.setCookie({name:'rabto_lang',value:lang,url:B});await pg.setViewport({width:w,height:h,deviceScaleFactor:1.5});await pg.goto(B+'/',{waitUntil:'networkidle0'});
 await pg.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);});await new Promise(r=>setTimeout(r,800));
 await pg.evaluate(()=>document.querySelector('#uses').scrollIntoView());await new Promise(r=>setTimeout(r,1800));await pg.screenshot({path:`/downloads/land-${lang}-${tag}.png`,fullPage:false});
 console.log(lang,tag,JSON.stringify(await pg.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth,illus:document.querySelectorAll('.lp-illus svg').length}))));await pg.close();}
await br.close();process.exit(0);
