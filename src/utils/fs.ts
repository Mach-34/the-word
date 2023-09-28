import { execSync } from "child_process";
import { assert } from "console";
import { Groth16Proof } from "snarkjs";

/**
 * Checks if a path given is a valid path to a directory to save the proof in
 * 
 * @param proofPath - the directory path to check
 * @return - the fully qualified path to the directory to save the proof in
 */
function checkProofPathDir(proofPath: string) : string {
    // format the filepath
    let cwd = execSync('pwd').toString();
    cwd = cwd.search("\n") == -1 ? cwd : cwd.slice(0, cwd.search("\n"));
    let filepath = `${cwd}/${proofPath}`;
    filepath = filepath.slice(filepath.length - 1) == "/"
        ? filepath.slice(0, filepath.length - 1)
        : filepath;

    // check if filepath is a valid directory
    let fileCmd = execSync(`file ${filepath}`).toString();    
    if (fileCmd.search("directory") == -1 || fileCmd.search("No such file or directory") != -1) {
        return "";
    } else {
        return filepath;
    }
}

/**
 * Checks if a path given is a valid path of a saved proof
 * @dev must end in .proof
 * @param proofPath - the filepath
 * @return - true if the path points to a valid proof, and false otherwise
 */
function checkProofPath(proofPath: string): boolean {
    // check that proof path is valid
    return execSync(`file ${proofPath}`).toString().search("JSON data") != -1;
}

/**
 * Read a proof from a json file on fs
 * @param proofPath - the relative path to the proof
 * @returns - the proof (not yet ty)
 */
async function getProof(proofPath: string): Promise<any> {
    // check that proof path is valid
    const cwd = execSync('pwd').toString();
    return await import(`${cwd}/${proofPath}`, { assert: { type: "json" } }) ;
}

export {
    checkProofPathDir,
    checkProofPath,
    getProof,
};