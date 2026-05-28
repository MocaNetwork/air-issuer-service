export function hexStrToBuffer(hexString: string) {
  const str = hexString.replace(/^0x/i, '');
  return Buffer.from(str, 'hex');
}
