import { type Reader, Writer } from "@keybr/binary";

export const HEADER_SIGNATURE = 0x4b455942;
export const HEADER_VERSION = 3;
export const HEADER = new Writer()
  .putInt32(HEADER_SIGNATURE)
  .putInt32(HEADER_VERSION)
  .buffer();

export function getHeaderVersion(reader: Reader): number | null {
  if (reader.remaining() < HEADER.byteLength) {
    return null;
  }
  if (reader.getUint32() !== HEADER_SIGNATURE) {
    return null;
  }
  const version = reader.getUint32();
  return version === 2 || version === 3 ? version : null;
}

export function validateHeader(reader: Reader): boolean {
  return getHeaderVersion(reader) != null;
}
