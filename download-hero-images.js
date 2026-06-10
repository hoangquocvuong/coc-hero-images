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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function heroFolder(hero){
  return String(hero || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function findImageUrl(skinName){
  const api =
    "https://clashofclans.fandom.com/api.php" +
    "?action=query" +
    "&format=json" +
    "&origin=*" +
    "&generator=search" +
    "&gsrnamespace=6" +
    "&gsrlimit=5" +
    "&gsrsearch=" + encodeURIComponent(skinName) +
    "&prop=imageinfo" +
    "&iiprop=url";

  const res = await fetch(api, {
    headers: {
      "User-Agent": "cocbasepro-image-downloader"
    }
  });

  if(!res.ok) return "";

  const data = await res.json();
  const pages = data.query && data.query.pages
    ? Object.values(data.query.pages)
    : [];

  for(const p of pages){
    const title = (p.title || "").toLowerCase();
    const clean = skinName.toLowerCase();

    if(
      title.includes(clean.replace(/\s+/g, " ")) ||
      title.includes(clean.replace(/\s+/g, "_"))
    ){
      if(p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url){
        return p.imageinfo[0].url;
      }
    }
  }

  if(pages[0] && pages[0].imageinfo && pages[0].imageinfo[0]){
    return pages[0].imageinfo[0].url;
  }

  return "";
}

async function downloadFile(url, dest){
  const res = await fetch(url, {
    headers: {
      "User-Agent": "cocbasepro-image-downloader"
    }
  });

  if(!res.ok) throw new Error("Download failed " + res.status);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function main(){

  let total = 0;
  let success = 0;
  let failed = [];

  for(const file of HERO_FILES){

    console.log("Reading", file);

    const res = await fetch(SKINS_BASE + file + "?v=" + Date.now());
    const data = await res.json();

    const hero = data.hero;
    const folder = heroFolder(hero);

    fs.mkdirSync(folder, { recursive:true });

    for(const skin of data.skins || []){

      total++;

      const name = skin.name;
      const filename = slugify(name) + ".png";
      const dest = path.join(folder, filename);

      if(fs.existsSync(dest)){
        console.log("SKIP:", name);
        success++;
        continue;
      }

      try{
        console.log("Finding:", name);

        const imgUrl = await findImageUrl(name);

        if(!imgUrl){
          console.log("NO IMAGE:", name);
          failed.push(name);
          continue;
        }

        await downloadFile(imgUrl, dest);

        console.log("SAVED:", dest);
        success++;

        await new Promise(r => setTimeout(r, 600));

      }catch(e){
        console.log("FAIL:", name, e.message);
        failed.push(name);
      }
    }
  }

  fs.writeFileSync(
    "failed-images.json",
    JSON.stringify(failed, null, 2),
    "utf8"
  );

  console.log("DONE");
  console.log("Total:", total);
  console.log("Success:", success);
  console.log("Failed:", failed.length);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});