const fs = require("fs");
const path = require("path");

const aliasMap = {
  "Dragonscale King": ["DragonScale King", "Dragon Scale King"],
  "Shadow Samurai": ["Samurai King", "Shadow King"],
  "Skeleton King Resurrected": ["Skeleton King"],
  "Stringshredder King": ["String Shredder King"],

  "Bassbow Queen": ["Bass Bow Queen"],
  "Dragonscale Queen": ["DragonScale Queen", "Dragon Scale Queen"],

  "Dragonscale Warden": ["DragonScale Warden", "Dragon Scale Warden"],
  "Keystriker Warden": ["Key Striker Warden"],
  "River Warden": ["River Grand Warden"],
  "Clash-A-Rama Warden": ["Clash A Rama Warden"],
  "Eternal Warden": ["Grand Warden Eternal"],
  "Grand Doctor": ["Doctor Warden"],
  "Grand Monk": ["Monk Warden"],
  "Ivan Warden": ["Warden Ivan"],
  "Shaman Warden": ["Grand Shaman"],

  "Dragonscale Champion": ["DragonScale Champion", "Dragon Scale Champion"],
  "Mirage Champion": ["Royal Champion Mirage"],
  "Red Champion": ["Red Royal Champion"],
  "Cursed Champion": ["Royal Champion Cursed"],
  "Nomad Champion": ["Royal Champion Nomad"],
  "Royal Officer": ["Officer Champion"],
  "Showtime Champion": ["Royal Champion Showtime"],
  "Yeti Champion": ["Royal Champion Yeti"],
  "Clash-A-Rama Champion": ["Clash A Rama Champion"],
  "Royal Screamstress": ["Screamstress Champion"],

  "Anime Fury Prince": ["Anime Prince"],
  "Beatsmasher Prince": ["Beat Smasher Prince"],
  "DragonScale Prince": ["Dragonscale Prince", "Dragon Scale Prince"],
  "Ox Prince": ["Minion Ox Prince"],
  "Skeleton Prince": ["Skeleton Minion Prince"]
};

const heroFolders = {
  "King": "barbarian-king",
  "Queen": "archer-queen",
  "Warden": "grand-warden",
  "Champion": "royal-champion",
  "Prince": "minion-prince",
  "Samurai": "barbarian-king",
  "Screamstress": "royal-champion"
};

function slugify(str){
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFolder(name){
  for(const key of Object.keys(heroFolders)){
    if(name.includes(key)) return heroFolders[key];
  }
  return "";
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

  let repaired = 0;
  let failed = [];

  for(const original of Object.keys(aliasMap)){

    const folder = getFolder(original);
    if(!folder){
      failed.push(original);
      continue;
    }

    const dest = path.join(folder, slugify(original) + ".png");

    if(fs.existsSync(dest)){
      console.log("SKIP:", original);
      continue;
    }

    let found = "";

    const queries = [
      original,
      original + " Clash of Clans",
      ...aliasMap[original],
      ...aliasMap[original].map(x => x + " Clash of Clans")
    ];

    for(const q of queries){
      console.log("Searching:", q);
      found = await searchFandomImage(q);
      if(found) break;
    }

    if(!found){
      console.log("FAILED:", original);
      failed.push(original);
      continue;
    }

    try{
      await download(found, dest);
      console.log("REPAIRED:", dest);
      repaired++;
      await new Promise(r => setTimeout(r, 600));
    }catch(e){
      console.log("DOWNLOAD FAILED:", original, e.message);
      failed.push(original);
    }
  }

  fs.writeFileSync(
    "alias-failed-images.json",
    JSON.stringify(failed, null, 2),
    "utf8"
  );

  console.log("DONE");
  console.log("Repaired:", repaired);
  console.log("Still failed:", failed.length);
}

main();