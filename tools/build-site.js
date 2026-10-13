// Company homepage generator; original AVS generator is retained in company-legacy.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.DKBLOSSOM_PYTHON || (fs.existsSync(bundled)?bundled:'python');
const result=spawnSync(python,[path.join(__dirname,'build-company.py')],{stdio:'inherit'});
if(result.error) console.error(result.error.message);
process.exit(result.status===null?1:result.status);
