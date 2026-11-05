/* AegisUI — minimal ZIP writer (STORE method, CRC-32, UTF-8 names).
 * Produces a standards-compliant .zip readable by every OS archiver.
 */
(function (Aegis) {
  'use strict';

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  /**
   * @param {{name: string, content: string|Uint8Array}[]} files
   * @returns {Blob} application/zip
   */
  function createZip(files, when = new Date()) {
    const enc = new TextEncoder();
    const { time, date } = dosDateTime(when);
    const locals = [];
    const centrals = [];
    let offset = 0;

    files.forEach((f) => {
      const nameBytes = enc.encode(f.name);
      const data = typeof f.content === 'string' ? enc.encode(f.content) : f.content;
      const crc = crc32(data);

      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); // local file header signature
      lh.setUint16(4, 20, true);          // version needed (2.0)
      lh.setUint16(6, 0x0800, true);      // flags: UTF-8 file names
      lh.setUint16(8, 0, true);           // method: STORE
      lh.setUint16(10, time, true);
      lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      locals.push(new Uint8Array(lh.buffer), nameBytes, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);  // central directory signature
      ch.setUint16(4, 0x0314, true);      // made by: UNIX, v2.0
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true);
      ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint16(30, 0, true);          // extra length
      ch.setUint16(32, 0, true);          // comment length
      ch.setUint16(34, 0, true);          // disk number
      ch.setUint16(36, 0, true);          // internal attrs
      ch.setUint32(38, (0o100644 << 16) >>> 0, true); // external attrs: -rw-r--r--
      ch.setUint32(42, offset, true);
      centrals.push(new Uint8Array(ch.buffer), nameBytes);

      offset += 30 + nameBytes.length + data.length;
    });

    const cdSize = centrals.reduce((n, a) => n + a.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);

    return new Blob([...locals, ...centrals, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  Aegis.zip = { createZip, crc32 };
})(window.Aegis = window.Aegis || {});
