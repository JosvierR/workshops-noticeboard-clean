$ErrorActionPreference = "Stop"

$backend = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$build = Join-Path $backend "_build"
$package = Join-Path $build "package"
$zipPath = Join-Path $build "noticeboard-lambda.zip"

if (Test-Path $package) {
    Remove-Item $package -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $package | Out-Null

docker run --rm `
    -v "${backend}:/src" `
    -w /src `
    python:3.12-slim `
    bash -c "pip install --no-cache-dir -r requirements.txt -t /src/_build/package && cp /src/lambda_function.py /src/_build/package/lambda_function.py && cp -a /src/app /src/_build/package/app && find /src/_build/package -type d -name __pycache__ -prune -exec rm -rf {} + && find /src/_build/package -type f -name '*.pyc' -delete"

if (-not (Test-Path (Join-Path $package "lambda_function.py"))) {
    throw "lambda_function.py was not copied to the package root."
}

python -c @"
import zipfile
from pathlib import Path
root = Path(r'$package')
zip_path = Path(r'$zipPath')
blocked = {'fastapi', 'uvicorn', 'httpx', 'pytest', 'local_app.py'}
if zip_path.exists():
    zip_path.unlink()
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        if '__pycache__' in path.parts or path.suffix == '.pyc':
            continue
        relative = path.relative_to(root).as_posix()
        top = relative.split('/', 1)[0]
        if top in blocked or path.name in blocked:
            raise SystemExit(f'refused to package {relative}')
        archive.write(path, relative)
names = zipfile.ZipFile(zip_path).namelist()
required = [
    'lambda_function.py',
    'app/__init__.py',
    'app/db.py',
    'app/notices.py',
    'app/responses.py',
    'app/validation.py',
]
missing = [name for name in required if name not in names]
if missing:
    raise SystemExit('missing from zip: ' + ', '.join(missing))
if any(name.startswith('backend/') for name in names):
    raise SystemExit('zip entries must be at the package root')
print(f'zip-bytes={zip_path.stat().st_size}')
print('zip-root-handler=yes')
"@
