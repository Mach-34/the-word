
/**
 * Converts a given word to array of 7 field elements
 * @dev split into 31-byte strings to fit in finite field and pad with 0's where necessary
 * @dev spotify allows maximum song length of 200 characters, so 7 field elements are used
 * @param title - the string entered by user to compute hash for (will be length checked)
 * @return - array of 7 bigints compatible with noir field element api
 */
export function convertTitleToFelts(title: string) : Array<bigint> {
    // check length of title does not exceed spotify's requirements
    if (title.length > 200)
        throw Error('title too long: must be <= 200 characters');
    // convert to chunks of bytes
    let chunks: bigint[] = [];
    for (let i = 0; i < 7; i++) {
        const start = i * 31;
        const end = (i + 1) * 31;
        let chunk: Buffer;
        if (start >= title.length) {
            // if start is out of bounds, field element = 0
            chunk = Buffer.alloc(31);
        } else if (end > title.length) {
            // if end is out of bounds, pad front with 0's
            const partial = Buffer.from(title.slice(start), 'utf-8');
            chunk = Buffer.concat([Buffer.alloc(31 - partial.length), partial]);
        } else {
            // chunk 31 bytes from the title string
            chunk = Buffer.from(title.slice(start, end), 'utf-8');
        }
        // pad an additional 0 to the front of the chunk
        chunk = Buffer.concat([Buffer.alloc(1), chunk]);
        // return as compatible hex string
        chunks.push(BigInt(`0x${chunk.toString('hex')}`) as bigint);
    }
    return chunks;
}