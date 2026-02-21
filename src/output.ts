let _pretty = false;

export function setPretty(val: boolean) { _pretty = val; }
export function isPretty(): boolean { return _pretty; }

export function outputOk(data: any): void {
  if (_pretty) {
    console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, data }));
}

export function outputError(error: string, details?: any): void {
  if (_pretty) {
    console.error(error);
    if (details) console.error(typeof details === "string" ? details : JSON.stringify(details, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: false, error, details: details || undefined }));
  process.exit(1);
}