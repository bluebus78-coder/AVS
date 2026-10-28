const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {validateRelease} = require('../server/release-check.cjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-release-check-'));
  for (const p of ['mobile', 'downloads/mobile', 'downloads/pc', 'api']) fs.mkdirSync(path.join(root, p), {recursive: true});
  const bytes = Buffer.from('synthetic-package-not-an-apk');
  const manifest = {versionName: '9.3', versionCode: 248, apkUrl: 'https://www.alphavipertrading.com/downloads/mobile/AVS_Mobile_9.3.apk',
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  fs.writeFileSync(path.join(root, 'mobile/update.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(root, 'downloads/mobile/AVS_Mobile_9.3.apk'), bytes);
  fs.writeFileSync(path.join(root, 'downloads/pc/AVS_7.2.ZIP'), 'synthetic-pc-zip');
  fs.writeFileSync(path.join(root, 'download.html'), '<a href="downloads/mobile/AVS_Mobile_9.3.apk">download</a><a href="downloads/pc/AVS_7.2.ZIP">PC</a>');
  for (const p of ['data-hub', 'financial-research', 'krx-data', 'krx-research', 'data-refresh']) fs.writeFileSync(path.join(root, `api/${p}.js`), '');
  return {root, manifest, clean: () => fs.rmSync(root, {recursive: true, force: true})};
}
test('deployment gate binds current package metadata, download link and required data routes', () => {
  const f = fixture(); try {assert.equal(validateRelease(f.root).code, 248);} finally {f.clean();}
});
test('deployment gate refuses old metadata and corrupted package bytes', () => {
  const f = fixture(); try {
    fs.writeFileSync(path.join(f.root, 'mobile/update.json'), JSON.stringify({...f.manifest, versionCode: 232}));
    assert.throws(() => validateRelease(f.root), /ROLLBACK/);
    fs.writeFileSync(path.join(f.root, 'mobile/update.json'), JSON.stringify(f.manifest));
    fs.writeFileSync(path.join(f.root, 'downloads/mobile/AVS_Mobile_9.3.apk'), 'corrupted');
    assert.throws(() => validateRelease(f.root), /HASH_MISMATCH/);
  } finally {f.clean();}
});

test('deployment gate refuses missing or empty current PC download', () => {
  const f = fixture(); try {
    fs.writeFileSync(path.join(f.root, 'downloads/pc/AVS_7.2.ZIP'), '');
    assert.throws(() => validateRelease(f.root), /PC_DOWNLOAD_ARTIFACT_MISSING/);
    fs.unlinkSync(path.join(f.root, 'downloads/pc/AVS_7.2.ZIP'));
    assert.throws(() => validateRelease(f.root), /PC_DOWNLOAD_ARTIFACT_MISSING/);
  } finally {f.clean();}
});
test('deployment gate refuses missing data services and stale download links', () => {
  const f = fixture(); try {
    fs.unlinkSync(path.join(f.root, 'api/krx-data.js'));
    assert.throws(() => validateRelease(f.root), /MISSING_DATA_ROUTE/);
    fs.writeFileSync(path.join(f.root, 'download.html'), '<a href="downloads/mobile/AVS_Mobile_7.7.apk">old</a>');
    assert.throws(() => validateRelease(f.root), /DOWNLOAD_PAGE_RELEASE_MISMATCH/);
  } finally {f.clean();}
});
