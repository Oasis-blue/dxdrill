#!/usr/bin/env node
"use strict";
/*
 * Optional deployed-image preflight. Downloads each unique image referenced by
 * a new intake, enforces same-origin redirects and image MIME, then performs
 * a full Pillow decode. It never changes repository or bank files.
 */
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

async function main(){
  const args=process.argv.slice(2), file=args.find(x=>!x.startsWith("--"));
  const bi=args.indexOf("--base-url");
  if(!file||bi<0||!args[bi+1]){console.error("Usage: node tools/check-deployed-visual-images.js <intake.json> --base-url https://example.github.io/dxdrill");process.exitCode=2;return;}
  let base;
  try{base=new URL(args[bi+1]);if(!["https:","http:"].includes(base.protocol))throw new Error("HTTP(S) URL required");}
  catch(e){console.error("Invalid base URL:",e.message);process.exitCode=2;return;}
  const intake=JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));
  const assets=Array.isArray(intake.assets)?intake.assets:[];
  const unique=[...new Map(assets.filter(a=>a&&typeof a.file==="string").map(a=>[a.file,a])).values()];
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"dxdrill-image-preflight-"));
  const results=[];
  try{
    for(const asset of unique){
      if(!/^(gross|diagrams|clinical|xray)\/[A-Za-z0-9._/-]+\.(?:jpe?g|png|gif|webp)$/i.test(asset.file)||asset.file.split("/").some(p=>p===".."||p==="."||!p)){
        results.push({file:asset.file,ok:false,error:"Unsafe image path"});continue;
      }
      const target=new URL("data/img/"+asset.file.split("/").map(encodeURIComponent).join("/"),base.href.endsWith("/")?base.href:base.href+"/");
      if(target.origin!==base.origin){results.push({file:asset.file,ok:false,error:"Image URL escaped configured origin"});continue;}
      try{
        const response=await fetch(target,{redirect:"follow",signal:AbortSignal.timeout(20000)});
        if(response.url&&new URL(response.url).origin!==base.origin)throw new Error("Redirected to a different origin");
        if(!response.ok)throw new Error("HTTP "+response.status);
        const mime=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
        if(!["image/jpeg","image/png","image/gif","image/webp"].includes(mime))throw new Error("Unexpected content type: "+mime);
        const bytes=Buffer.from(await response.arrayBuffer());
        if(!bytes.length||bytes.length>25*1024*1024)throw new Error("Image is empty or exceeds 25 MB");
        const local=path.join(tmp,String(results.length)+path.extname(asset.file).toLowerCase());
        fs.writeFileSync(local,bytes,{flag:"wx"});
        const dec=spawnSync(process.env.PYTHON||"python3",[path.join(__dirname,"decode-image.py"),local],{encoding:"utf8"});
        if(dec.error||dec.status!==0)throw new Error((dec.stderr||"Full image decode failed").trim());
        results.push({file:asset.file,ok:true,httpStatus:response.status,contentType:mime,decoded:(dec.stdout||"").trim()});
      }catch(e){results.push({file:asset.file,ok:false,error:e.message});}
    }
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
  const failed=results.filter(r=>!r.ok);
  console.log(JSON.stringify({ok:failed.length===0,checked:results.length,failed:failed.length,results},null,2));
  if(failed.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=2;});
