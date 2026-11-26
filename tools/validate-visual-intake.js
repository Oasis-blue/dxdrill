#!/usr/bin/env node
"use strict";

/*
 * Validate a new visual-practical intake document.
 * Read-only by design: this tool never writes question files, registries or manifest.
 * Legacy image metadata is deliberately not inspected or revalidated.
 */
const fs = require("node:fs");
const path = require("node:path");

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const KINDS = new Set(["specimen", "model", "diagram", "xray", "clinical-sign"]);
const ALLOWED_LICENSES = [
  /^own original (photograph|image|drawing)$/i,
  /^public domain(?: .*)?$/i,
  /^cc0(?: 1\.0)?$/i,
  /^cc by(?:-sa)?(?: [0-9.]+)?$/i,
  /^creative commons attribution(?:-sharealike)?(?: [0-9.]+)?$/i
];

function issue(list, code, pathName, message) {
  list.push({ code, path: pathName, message });
}
function nonempty(v) { return typeof v === "string" && v.trim().length > 0; }
function uniqueId(v) { return typeof v === "string" && ID.test(v); }
function isAllowedLicense(v) { return nonempty(v) && ALLOWED_LICENSES.some(re => re.test(v.trim())); }
function safeImagePath(value) {
  if (!nonempty(value)) return false;
  if (value.includes("\\") || value.startsWith("/") || /[%?#:]/.test(value)) return false;
  const parts = value.split("/");
  if (parts.some(p => !p || p === "." || p === "..")) return false;
  if (!["gross", "diagrams", "clinical", "xray"].includes(parts[0])) return false;
  return IMAGE_EXT.has(path.posix.extname(value).toLowerCase());
}
function imageInfo(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (ext === ".png" && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    if (buffer.length < 33 || buffer.toString("ascii",12,16) !== "IHDR") return null;
    const w=buffer.readUInt32BE(16), h=buffer.readUInt32BE(20);
    if (!w || !h || w > 50000 || h > 50000) return null;
    let offset=8, ended=false, hasData=false;
    while (offset + 12 <= buffer.length) {
      const len=buffer.readUInt32BE(offset), end=offset+12+len;
      if (end > buffer.length) return null;
      const type=buffer.toString("ascii",offset+4,offset+8);
      if (type === "IDAT") hasData=true;
      if (type === "IEND") { if (len !== 0) return null; ended=true; break; }
      offset=end;
    }
    return ended && hasData ? {width:w,height:h,format:"png"} : null;
  }
  if (ext === ".gif" && (buffer.toString("ascii",0,6)==="GIF87a" || buffer.toString("ascii",0,6)==="GIF89a")) {
    const w=buffer.readUInt16LE(6), h=buffer.readUInt16LE(8);
    return w && h && buffer.includes(0x3b) ? {width:w,height:h,format:"gif"} : null;
  }
  if (ext === ".webp" && buffer.toString("ascii",0,4)==="RIFF" && buffer.toString("ascii",8,12)==="WEBP") {
    return buffer.length >= 30 ? {width:null,height:null,format:"webp"} : null;
  }
  if ((ext === ".jpg" || ext === ".jpeg") && buffer[0]===0xff && buffer[1]===0xd8 && buffer[buffer.length-2]===0xff && buffer[buffer.length-1]===0xd9) {
    let i=2;
    while (i+4 < buffer.length) {
      if (buffer[i]!==0xff) { i++; continue; }
      const marker=buffer[i+1]; i+=2;
      if (marker===0xd9 || marker===0xda) break;
      if (i+2>buffer.length) return null;
      const len=buffer.readUInt16BE(i);
      if (len<2 || i+len>buffer.length) return null;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if (len<7) return null;
        const h=buffer.readUInt16BE(i+3), w=buffer.readUInt16BE(i+5);
        return w && h ? {width:w,height:h,format:"jpeg"} : null;
      }
      i+=len;
    }
  }
  return null;
}
function flattenTopics(curriculum) {
  const out = new Set();
  (curriculum.subjects || []).forEach(s => (s.areas || []).forEach(a => (a.topics || []).forEach(t => out.add(t.id))));
  return out;
}
function readExistingIds(root, manifest, errors) {
  const ids = new Set();
  for (const file of manifest.questions || []) {
    const p=path.join(root,"data","questions",file+".json");
    try {
      const data=JSON.parse(fs.readFileSync(p,"utf8"));
      for (const q of data.questions || []) if (q && q.id) ids.add(q.id);
    } catch (e) { issue(errors,"BANK_READ_ERROR",p,"Could not read existing question file for collision checking: "+e.message); }
  }
  for (const registry of ["visual-assets.json","visual-stations.json"]) {
    const p=path.join(root,"data",registry);
    if (!fs.existsSync(p)) continue;
    try {
      const data=JSON.parse(fs.readFileSync(p,"utf8"));
      const rows=Array.isArray(data) ? data : (data.assets || data.stations || []);
      rows.forEach(x=>{ if(x && x.id) ids.add(x.id); });
    } catch(e) { issue(errors,"REGISTRY_READ_ERROR",p,"Could not read existing registry for ID collision checking: "+e.message); }
  }
  return ids;
}
function validateIntake(intake, options={}) {
  const errors=[], quarantined=[], accepted=[];
  const root=options.root || process.cwd();
  if (!intake || typeof intake!=="object" || Array.isArray(intake)) {
    issue(errors,"INVALID_ROOT","$","Intake must be a JSON object.");
    return report(accepted,quarantined,errors);
  }
  if (intake.schemaVersion!==1) issue(errors,"SCHEMA_VERSION","schemaVersion","Expected numeric schemaVersion 1.");
  let topics=new Set(), existing=new Set();
  if (options.checkRepository !== false) {
    try {
      const curriculum=JSON.parse(fs.readFileSync(path.join(root,"data/curriculum.json"),"utf8"));
      topics=flattenTopics(curriculum);
    } catch(e) { issue(errors,"CURRICULUM_READ_ERROR","data/curriculum.json",e.message); }
    try {
      const manifest=JSON.parse(fs.readFileSync(path.join(root,"data/manifest.json"),"utf8"));
      existing=readExistingIds(root,manifest,errors);
    } catch(e) { issue(errors,"MANIFEST_READ_ERROR","data/manifest.json",e.message); }
  } else if (options.topics) topics=new Set(options.topics);
  if (!nonempty(intake.topic) || (options.checkRepository !== false && !topics.has(intake.topic)) || (options.checkRepository === false && options.topics && !topics.has(intake.topic))) issue(errors,"UNKNOWN_TOPIC","topic","Topic must be an exact ID in data/curriculum.json.");
  if (!Array.isArray(intake.assets) || intake.assets.length===0) {
    issue(errors,"EMPTY_ASSETS","assets","At least one asset is required.");
    return report(accepted,quarantined,errors);
  }
  const batchIds=new Set();
  function claim(id, where) {
    if (!uniqueId(id)) issue(errors,"INVALID_ID",where,"ID must be lowercase kebab-case.");
    else if(batchIds.has(id) || existing.has(id)) issue(errors,"DUPLICATE_ID",where,"ID is duplicated in this batch or already exists in the bank/registries.");
    else batchIds.add(id);
  }
  intake.assets.forEach((asset,ai)=>{
    const base="assets["+ai+"]", localErrors=[], localQuarantine=[];
    if (!asset || typeof asset!=="object" || Array.isArray(asset)) { issue(errors,"INVALID_ASSET",base,"Asset must be an object."); return; }
    claim(asset.id,base+".id"); claim(asset.station && asset.station.id,base+".station.id");
    if (!KINDS.has(asset.kind)) issue(localErrors,"INVALID_KIND",base+".kind","Unsupported asset kind.");
    if (!nonempty(asset.alt)) issue(localErrors,"MISSING_ALT",base+".alt","Meaningful alt text is required.");
    if (!nonempty(asset.credit)) issue(localErrors,"MISSING_CREDIT",base+".credit","A truthful visible credit is required.");
    if (!isAllowedLicense(asset.licence)) issue(localErrors,"UNSUPPORTED_OR_UNCLEAR_LICENCE",base+".licence","Licence must be explicit and permit reuse (own original, public domain, CC0, CC BY or CC BY-SA).");
    const own=/^own original (photograph|image|drawing)$/i.test(String(asset.licence||"").trim());
    if (!own && (!nonempty(asset.sourceUrl) || !/^https?:\/\/\S+$/i.test(asset.sourceUrl))) issue(localErrors,"MISSING_SOURCE_URL",base+".sourceUrl","Third-party assets require a valid source URL.");
    if (own && nonempty(asset.sourceUrl) && !/^https?:\/\/\S+$/i.test(asset.sourceUrl)) issue(localErrors,"INVALID_SOURCE_URL",base+".sourceUrl","Source URL must be an http(s) URL or empty.");
    if (!safeImagePath(asset.file)) issue(localErrors,"UNSAFE_IMAGE_PATH",base+".file","Use a safe relative path beneath data/img/{gross,diagrams,clinical,xray}/ with a supported raster extension.");
    else {
      const full=path.resolve(root,"data","img",...asset.file.split("/"));
      const imgRoot=path.resolve(root,"data","img")+path.sep;
      if (!full.startsWith(imgRoot)) issue(localErrors,"UNSAFE_IMAGE_PATH",base+".file","Image path escapes data/img.");
      else {
        try {
          const bytes=fs.readFileSync(full), info=imageInfo(bytes,path.extname(full).toLowerCase());
          if (!bytes.length || !info) issue(localErrors,"INVALID_IMAGE",base+".file","Image is empty, corrupt, truncated or does not match its extension.");
        } catch(e) { issue(localErrors,"IMAGE_NOT_FOUND",base+".file","Referenced image file is missing: "+asset.file); }
      }
    }
    if (!asset.marks || typeof asset.marks!=="object" || Array.isArray(asset.marks)) issue(localErrors,"INVALID_MARKS",base+".marks","marks must be an object mapping visible labels to structures.");
    else Object.entries(asset.marks).forEach(([label,value])=>{ if(!/^[A-Z0-9]$/.test(label)||!nonempty(value)) issue(localErrors,"INVALID_MARK",base+".marks."+label,"Each marker needs a single visible label and a non-empty proposed structure."); });
    if (asset.unsure===true || nonempty(asset.check)) localQuarantine.push({code:"ASSET_NEEDS_REVIEW",path:base,message:nonempty(asset.check)?asset.check:"Asset is marked unsure."});
    if (!asset.station || typeof asset.station!=="object") issue(localErrors,"MISSING_STATION",base+".station","A station object is required.");
    else {
      if (!nonempty(asset.station.title)) issue(localErrors,"MISSING_STATION_TITLE",base+".station.title","Station title is required.");
      if (asset.station.seconds!==undefined && (!Number.isInteger(asset.station.seconds)||asset.station.seconds<5||asset.station.seconds>600)) issue(localErrors,"INVALID_STATION_DURATION",base+".station.seconds","Duration must be an integer from 5 to 600 seconds.");
    }
    if (!Array.isArray(asset.questions)||asset.questions.length===0) issue(localErrors,"EMPTY_QUESTIONS",base+".questions","Each station needs at least one question.");
    const qids=[];
    (Array.isArray(asset.questions)?asset.questions:[]).forEach((q,qi)=>{
      const qp=base+".questions["+qi+"]";
      if(!q||typeof q!=="object"||Array.isArray(q)){issue(localErrors,"INVALID_QUESTION",qp,"Question must be an object.");return;}
      claim(q.id,qp+".id"); qids.push(q.id);
      if(!nonempty(q.q)) issue(localErrors,"MISSING_QUESTION",qp+".q","Question stem is required.");
      if(!Number.isInteger(q.level)||q.level<1||q.level>3) issue(localErrors,"INVALID_LEVEL",qp+".level","Level must be 1, 2 or 3.");
      if(q.sub!==undefined&&!nonempty(q.sub)) issue(localErrors,"INVALID_SUB",qp+".sub","If supplied, sub must be non-empty.");
      if(!Array.isArray(q.options)||q.options.length!==4||!q.options.every(nonempty)) issue(localErrors,"INVALID_OPTIONS",qp+".options","Exactly four non-empty options are required.");
      if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3) issue(localErrors,"INVALID_ANSWER",qp+".answer","Answer must be an integer index from 0 to 3.");
      if(!nonempty(q.explain)) issue(localErrors,"MISSING_EXPLANATION",qp+".explain","A non-empty teaching explanation is required.");
      if(q.unsure===true||nonempty(q.check)) localQuarantine.push({code:"QUESTION_NEEDS_REVIEW",path:qp,message:nonempty(q.check)?q.check:"Question is marked unsure."});
      const marks=asset.marks&&typeof asset.marks==="object"?asset.marks:{};
      const refs=[...String(q.q||"").matchAll(/(?:marked|labelled|labeled|marker|arrow)\s+([A-Z0-9])\b/gi)].map(m=>m[1].toUpperCase());
      refs.forEach(label=>{if(!Object.prototype.hasOwnProperty.call(marks,label)) issue(localErrors,"UNKNOWN_MARKER",qp+".q","Question refers to marker "+label+" which is not defined in asset.marks.");});
    });
    if(new Set(qids).size!==qids.length) issue(localErrors,"DUPLICATE_STATION_QUESTION",base+".questions","A question ID appears more than once in this station.");
    if(localQuarantine.length) quarantined.push({assetId:asset.id,stationId:asset.station&&asset.station.id,reasons:localQuarantine});
    if(localErrors.length) localErrors.forEach(e=>errors.push(e));
    else if(!localQuarantine.length) accepted.push({assetId:asset.id,stationId:asset.station.id,questionIds:qids});
  });
  return report(accepted,quarantined,errors);
}
function report(accepted,quarantined,errors) {
  return {ok:errors.length===0&&quarantined.length===0,summary:{accepted:accepted.length,quarantined:quarantined.length,rejected:errors.length},accepted,quarantined,errors};
}
function main(argv) {
  const file=argv.find(x=>!x.startsWith("--"));
  if(!file){console.error("Usage: node tools/validate-visual-intake.js <intake.json> [--root <repository-root>]");process.exitCode=2;return;}
  const ri=argv.indexOf("--root"), root=ri>=0?path.resolve(argv[ri+1]):process.cwd();
  try {
    const intake=JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));
    const result=validateIntake(intake,{root});
    console.log(JSON.stringify(result,null,2));
    if(!result.ok) process.exitCode=1;
  } catch(e) { console.error("Could not validate intake:",e.message);process.exitCode=2; }
}
if(require.main===module) main(process.argv.slice(2));
module.exports={validateIntake,imageInfo,safeImagePath};
