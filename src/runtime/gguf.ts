// Adapter: inspect bounded GGUF metadata without executing repository code or loading tensors.
import { open } from 'node:fs/promises';
export async function inspectGguf(path: string): Promise<Record<string, unknown>> {
  const handle = await open(path, 'r');
  const buffer = Buffer.alloc(32 * 1024 * 1024);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0).finally(() => handle.close());
  const data = buffer.subarray(0, bytesRead);
  if (data.toString('ascii', 0, 4) !== 'GGUF') throw new Error('CORRUPT_GGUF');
  let cursor = 4;
  function take(size: number): Buffer {
    if (!Number.isSafeInteger(size) || size < 0 || cursor + size > data.length) throw new Error('GGUF_METADATA_LIMIT');
    const slice = data.subarray(cursor, cursor + size); cursor += size; return slice;
  }
  const u32 = () => take(4).readUInt32LE();
  const u64 = () => Number(take(8).readBigUInt64LE());
  const str = () => take(u64()).toString('utf8');
  function value(type: number): unknown {
    if (type === 8) return str();
    if (type === 9) {
      const subtype = u32(), length = u64();
      if (subtype === 9 || length > 2000000) throw new Error('GGUF_ARRAY_LIMIT');
      for (let i = 0; i < length; i++) value(subtype);
      return { arrayLength: length, type: subtype };
    }
    const sizes = [1, 1, 2, 2, 4, 4, 4, 1, 0, 0, 8, 8, 8];
    const size = sizes[type];
    if (!size) throw new Error('GGUF_TYPE_UNSUPPORTED');
    const raw = take(size);
    if (type === 6) return raw.readFloatLE();
    if (type === 12) return raw.readDoubleLE();
    if (type === 7) return raw[0] !== 0;
    return size === 8 ? Number(raw.readBigUInt64LE()) : raw.readUIntLE(0, size);
  }
  const version = u32(), tensors = u64(), count = u64();
  if (version !== 3 || count > 100000) throw new Error('GGUF_HEADER_UNSUPPORTED');
  const metadata: Record<string, unknown> = { version, tensors };
  for (let i = 0; i < count; i++) {
    const key = str(), item = value(u32());
    if (/^(general\.|tokenizer\.chat_template)|context_length|embedding_length/.test(key)) metadata[key] = item;
  }
  return metadata;
}
