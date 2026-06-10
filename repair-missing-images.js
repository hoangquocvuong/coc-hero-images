const fs = require("fs");
const path = require("path");

const SKINS_BASE = "https://hoangquocvuong.github.io/coc-hero-skins/";

const HERO_FILES = [
  "barbarian-king.json",
  "archer-queen.json",
  "grand-warden.json",
  "royal-champion.json",
  "minion-prince.json"
];

function slugify(str){
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function heroFolder(hero){
  return String(hero || "")
    .toLowerCase()
    .replace(/\s+/g,"-");
}

async function fileExists(url){
  try{
    const r = await fetch(url, { method:"HEAD" });
    return r.ok;
  }catch(e){
    return false;
  }
}

async function searchFandomImage(query){
  const api =
    "https://clashofclans.fandom.com/api.php" +
    "?action=query&format=json&origin=*" +
    "&generator=search" +
    "&gsrnamespace=6" +
    "&gsrlimit=10" +
    "&gsrsearch=" + encodeURIComponent(query) +
    "&prop=imageinfo&iiprop=url";

  const res = await fetch(api);
  if(!res.ok) return "";

  const data = await res.json();
  const pages = data.query && data.query.pages
    ? Object.values(data.query.pages)
    : [];

  for(const p of pages){
    if(p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url){
      return p.imageinfo[0].url;
    }
  }

  return "";
}

async function download(url, dest){
  const res = await fetch(url);
  if(!res.ok) throw new Error("Download failed " + res.status);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function main(){

  let checked = 0;
  let repaired = 0;
  let failed = [];

  for(const file of HERO_FILES){

    console.log("Checking", file);

    const res = await fetch(SKINS_BASE + file + "?v=" + Date.now());
    const data = await res.json();

    const folder = heroFolder(data.hero);
    fs.mkdirSync(folder, { recursive:true });

    for(const skin of data.skins || []){

      checked++;

      const name = skin.name;
      const localFile = path.join(folder, slugify(name) + ".png");
      const publicUrl =
        "https://hoangquocvuong.github.io/coc-hero-images/" +
        folder + "/" + slugify(name) + ".png";

      if(fs.existsSync(localFile)){
        continue;
      }

      const onlineOk = await fileExists(publicUrl);
      if(onlineOk){
        continue;
      }

      console.log("MISSING:", name);

      const queries = [
        name,
        name + " Clash of Clans",
        name + " Skin",
        name.replace("Dragonscale", "DragonScale"),
        name.replace("Anime Fury", "Anime")
      ];

      let imgUrl = "";

      for(const q of queries){
        imgUrl = await searchFandomImage(q);
        if(imgUrl) break;
      }

      if(!imgUrl){
        console.log("NO IMAGE FOUND:", name);
        failed.push(name);
        continue;
      }

      try{
        await download(imgUrl, localFile);
        console.log("REPAIRED:", localFile);
        repaired++;
        await new Promise(r => setTimeout(r, 500));
      }catch(e){
        console.log("DOWNLOAD FAIL:", name, e.message);
        failed.push(name);
      }
    }
  }

  fs.writeFileSync(
    "repair-failed-images.json",
    JSON.stringify(failed, null, 2),
    "utf8"
  );

  console.log("DONE");
  console.log("Checked:", checked);
  console.log("Repaired:", repaired);
  console.log("Still failed:", failed.length);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});