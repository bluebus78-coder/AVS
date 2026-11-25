const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const officialOrigins = ['https://dkblossom.co.kr', 'https://www.alphavipertrading.com'];

async function validateRelease(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mobile/update.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (!Number.isInteger(manifest.versionCode) || manifest.versionCode < 248 || !/^\d+\.\d+$/.test(manifest.versionName)) {
    throw Error('MOBILE_RELEASE_ROLLBACK');
  }
  const filename = `AVS_Mobile_${manifest.versionName}.apk`;
  const apkPath = `downloads/mobile/${filename}`;
  if (!officialOrigins.some(origin => manifest.apkUrl === `${origin}/${apkPath}`) || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
    throw Error('INVALID_RELEASE_METADATA');
  }
  const apkFile = path.join(root, apkPath);
  let bytes;
  if (fs.existsSync(apkFile)) {
    bytes = fs.readFileSync(apkFile);
  } else {
    const response = await fetch(manifest.apkUrl, {redirect: 'error', signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw Error(`MOBILE_DOWNLOAD_ARTIFACT_MISSING:${apkPath}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() !== manifest.sha256.toUpperCase()) {
    throw Error('MOBILE_ARTIFACT_HASH_MISMATCH');
  }
  const downloadPage = fs.readFileSync(path.join(root, 'download.html'), 'utf8');
  if (!downloadPage.includes(apkPath)) throw Error('DOWNLOAD_PAGE_RELEASE_MISMATCH');

  const pcLinks = [...downloadPage.matchAll(/href=["']((?:https:\/\/[^/"']+)?\/?downloads\/pc\/AVS_\d+\.\d+\.ZIP)["']/gi)];
  if (!pcLinks.length) throw Error('PC_DOWNLOAD_LINK_MISSING');
  for (const [, link] of pcLinks) {
    const url = new URL(link, `${officialOrigins[0]}/`);
    const relative = url.pathname.slice(1);
    if (!officialOrigins.includes(url.origin) || url.username || url.password) throw Error('INVALID_PC_DOWNLOAD_ORIGIN');
    if (link.startsWith('https://')) {
      const response = await fetch(url, {method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(20000)});
      if (!response.ok || Number(response.headers.get('content-length')) <= 0) {
        throw Error(`PC_DOWNLOAD_ARTIFACT_MISSING:${relative}`);
      }
    } else {
      const pcFile = fs.statSync(path.join(root, relative), {throwIfNoEntry: false});
      if (!pcFile?.isFile() || pcFile.size === 0) throw Error(`PC_DOWNLOAD_ARTIFACT_MISSING:${relative}`);
    }
  }
  for (const route of ['data-hub', 'financial-research', 'krx-data', 'krx-research', 'data-refresh']) {
    if (!fs.existsSync(path.join(root, `api/${route}.js`))) throw Error(`MISSING_DATA_ROUTE:${route}`);
  }
  return {version: manifest.versionName, code: manifest.versionCode, apk_sha256: manifest.sha256, status: 'release_files_verified'};
}

module.exports = {validateRelease};
if (require.main === module) {
  validateRelease(process.cwd()).then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
