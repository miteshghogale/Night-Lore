const fs = require('fs');
const path = require('path');
const https = require('https');

const coversDir = path.join(__dirname, '..', 'public', 'images', 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const images = [
  {
    slug: 'amityville-horror-case',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/112_Ocean_Ave_house_February_2010.jpg'
  },
  {
    slug: 'aokigahara-sea-of-trees',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Aokigahara_Forest_%2810863169686%29.jpg'
  },
  {
    slug: 'balete-drive-white-lady',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Enchanted_Balete_Tree_in_Lazi.JPG'
  },
  {
    slug: 'black-eyed-children-encounter',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Foggy_night.JPG'
  },
  {
    slug: 'enfield-poltergeist',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/284_Green_Street%2C_Enfield.jpg'
  },
  {
    slug: 'exorcist-roland-doe',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Alexian_Brothers_Hospital%2C_3933_South_Broadway.jpg'
  },
  {
    slug: 'hoichi-the-earless',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Akama-jingu_20170223.jpg'
  },
  {
    slug: 'okiku-nine-plates',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Okiku_Well_in_Himeji_Castle.JPG'
  },
  {
    slug: 'point-pleasant-mothman',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Mothman_Statue.jpg'
  },
  {
    slug: 'skinwalker-ranch-anomalies',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Weber_Sandstone_%26_Moenkopi_Formation_%28Dinosaur_National_Monument%2C_Utah%2C_USA%29_2_%2848863309691%29.jpg'
  },
  {
    slug: 'sleep-paralysis-demon',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Johann_Heinrich_F%C3%BCssli_-_The_Nightmare_-_WGA08332.jpg'
  },
  {
    slug: 'the-bell-witch-haunting',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Bell_Witch_Cave.JPG'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'NightLoreBot/1.0 (https://nightlore.com; contact@nightlore.com)'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  for (const img of images) {
    const dest = path.join(coversDir, `${img.slug}.jpg`);
    console.log(`Downloading ${img.slug}...`);
    try {
      await download(img.url, dest);
      console.log(`Saved ${img.slug}.jpg (${fs.statSync(dest).size} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${img.slug}:`, err.message);
    }
  }
}

run();
