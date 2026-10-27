const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function validateRelease(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mobile/update.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (!Number.isInteger(manifest.versionCode) || manifest.versionCode < 248 || !/^\d+\.\d+$/.test(manifest.versionName)) {
    throw Error('MOBILE_RELEASE_ROLLBACK');
  }
  const expected = `https://www.alphavipertrading.com/downloads/mobile/AVS_Mobile_${manifest.versionName}.apk`;
  if (manifest.apkUrl !== expected || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) throw Error('INVALID_RELEASE_METADATA');
  const filename = `AVS_Mobile_${manifest.versionName}.apk`;
  const bytes = fs.readFileSync(path.join(root, 'downloads/mobile', filename));
  if (crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() !== manifest.sha256.toUpperCase()) {
    throw Error('MOBILE_ARTIFACT_HASH_MISMATCH');
  }
  if (!fs.readFileSync(path.join(root, 'download.html'), 'utf8').includes(`downloads/mobile/${filename}`)) {
    throw Error('DOWNLOAD_PAGE_RELEASE_MISMATCH');
  }
  for (const route of ['data-hub', 'financial-research', 'krx-data', 'krx-research', 'data-refresh']) {
    if (!fs.existsSync(path.join(root, `api/${route}.js`))) throw Error(`MISSING_DATA_ROUTE:${route}`);
  }
  return {version: manifest.versionName, code: manifest.versionCode, apk_sha256: manifest.sha256, status: 'release_files_verified'};
}
module.exports = {validateRelease};
if (require.main === module) console.log(JSON.stringify(validateRelease(process.cwd())));
