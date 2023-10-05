import "dotenv/config";

export async function getWasm() {
    return await fetch(`${process.env.API}/artifacts/the_word.wasm`);
}