"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {validateIntake}=require("../tools/validate-visual-intake.js");

function png1x1(){
  // Small structurally valid PNG fixture; test-only, never a production visual.
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2cAAAAASUVORK5CYII=","base64");
}
function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"dxdrill-visual-"));
  fs.mkdirSync(path.join(root,"data/img/gross"),{recursive:true});
  fs.mkdirSync(path.join(root,"data/questions"),{recursive:true});
  fs.writeFileSync(path.join(root,"data/curriculum.json"),JSON.stringify({subjects:[{areas:[{topics:[{id:"gr-upper-limb"}]}]}]}));
  fs.writeFileSync(path.join(root,"data/manifest.json"),JSON.stringify({questions:["legacy-histo"]}));
  fs.writeFileSync(path.join(root,"data/questions/legacy-histo.json"),JSON.stringify({topic:"gh-epithelium",questions:[{id:"legacy-histo-001",image:"old-slide.jpg",credit:"Existing legacy credit"}]}));
  fs.writeFileSync(path.join(root,"data/img/gross/liver.png"),png1x1());
  return root;
}
function valid(){
  return {schemaVersion:1,topic:"gr-upper-limb",assets:[{
    id:"gross-liver-demo",file:"gross/liver.png",kind:"specimen",alt:"A labelled anatomical specimen.",credit:"Photo: own",
    sourceUrl:"",licence:"Own original photograph",marks:{A:"Hepatic artery"},unsure:false,check:"",
    station:{id:"station-liver-demo",title:"Liver specimen",seconds:60},
    questions:[{id:"liver-demo-q1",level:1,sub:"Gross anatomy",q:"Identify the structure marked A.",options:["Hepatic artery","Portal vein","Hepatic duct","Inferior vena cava"],answer:0,explain:"The hepatic artery supplies oxygenated blood to the liver.",unsure:false,check:""}]
  }]};
}
test("accepts a valid new intake and leaves legacy histology records untouched",()=>{
  const root=setup();
  const before=fs.readFileSync(path.join(root,"data/questions/legacy-histo.json"),"utf8");
  const result=validateIntake(valid(),{root});
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.summary.accepted,1);
  assert.equal(fs.readFileSync(path.join(root,"data/questions/legacy-histo.json"),"utf8"),before);
  assert.equal(fs.existsSync(path.join(root,"data/visual-assets.json")),false);
  fs.rmSync(root,{recursive:true,force:true});
});
test("rejects unsafe paths and missing images",()=>{
  const root=setup(), intake=valid();
  intake.assets[0].file="../histo/old.jpg";
  const result=validateIntake(intake,{root});
  assert.ok(result.errors.some(e=>e.code==="UNSAFE_IMAGE_PATH"));
  fs.rmSync(root,{recursive:true,force:true});
});
test("quarantines uncertain assets without accepting them",()=>{
  const root=setup(), intake=valid();
  intake.assets[0].questions[0].unsure=true;
  intake.assets[0].questions[0].check="Confirm the marker.";
  const result=validateIntake(intake,{root});
  assert.equal(result.summary.quarantined,1);
  assert.equal(result.summary.accepted,0);
  assert.equal(result.ok,false);
  fs.rmSync(root,{recursive:true,force:true});
});
test("rejects missing attribution, invalid answer and unknown marker",()=>{
  const root=setup(), intake=valid();
  intake.assets[0].licence="Unknown";
  intake.assets[0].questions[0].answer=4;
  intake.assets[0].questions[0].q="Identify the structure marked B.";
  const result=validateIntake(intake,{root});
  const codes=result.errors.map(e=>e.code);
  assert.ok(codes.includes("UNSUPPORTED_OR_UNCLEAR_LICENCE"));
  assert.ok(codes.includes("INVALID_ANSWER"));
  assert.ok(codes.includes("UNKNOWN_MARKER"));
  fs.rmSync(root,{recursive:true,force:true});
});
test("rejects duplicate IDs and malformed MCQ options",()=>{
  const root=setup(), intake=valid();
  intake.assets[0].questions[0].id="legacy-histo-001";
  intake.assets[0].questions[0].options=["only two","options"];
  const result=validateIntake(intake,{root});
  const codes=result.errors.map(e=>e.code);
  assert.ok(codes.includes("DUPLICATE_ID"));
  assert.ok(codes.includes("INVALID_OPTIONS"));
  fs.rmSync(root,{recursive:true,force:true});
});

test("rejects an image reference whose file is missing",()=>{
  const root=setup(), intake=valid();
  intake.assets[0].file="gross/not-present.png";
  const result=validateIntake(intake,{root});
  assert.ok(result.errors.some(e=>e.code==="IMAGE_NOT_FOUND"));
  fs.rmSync(root,{recursive:true,force:true});
});
test("fails closed when the curriculum cannot be read",()=>{
  const root=setup();
  fs.rmSync(path.join(root,"data/curriculum.json"));
  const result=validateIntake(valid(),{root});
  assert.ok(result.errors.some(e=>e.code==="CURRICULUM_READ_ERROR"));
  assert.ok(result.errors.some(e=>e.code==="UNKNOWN_TOPIC"));
  fs.rmSync(root,{recursive:true,force:true});
});
