// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./IVerifier.sol";

contract TheWord {

    event GameCreated(uint256 indexed game, bytes32 indexed wordHash);
    event Whispered(uint256 indexed game, address indexed player);
    event Shouted(uint256 indexed game, address indexed player);
    
    /**
     * Check that a word can be whispered or shouted
     * @param game - game index
     */
    modifier playable(uint256 game) {
        require(words[game] != 0 && game <= gameIndex, "Game does not exist");
        require(!over[game], "Game is over");
        require(!whispered[game][msg.sender], "Player already whispered");
        _;
    }

    struct Player {
        uint256 numShouted;
        uint256 numWhispered;
    }

    // map of game index to word hash
    mapping(uint256 => bytes32) public words;
    // map of game index to boolean indicating if the game is over (someone shouted)
    mapping(uint256 => bool) public over;
    // map of game index to player address to whether or not they shouted
    mapping(uint256 => mapping(address => bool)) public shouted;
    // map of game index to player address to whether or not they whispered
    mapping(uint256 => mapping(address => bool)) public whispered;
    // map of player address to Player struct
    mapping(address => Player) public players;

    
    uint256 public gameIndex;
    IVerifier verifier;

    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }

    /**
     * Create a new game of guessing the secret word/ phrase
     * @param wordHash - Poseidon hash of the word/ phrase
     * @param proof - proof of knowledge of the preimage of the word hash
     */
    function newGame(bytes32 wordHash, bytes calldata proof) public {
        // verify the proof
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = wordHash;
        require(verifier.verify(proof, publicInputs), "Invalid proof");

        // create new game
        gameIndex++;
        words[gameIndex] = wordHash;
        emit GameCreated(gameIndex, wordHash);

        // mark creator as whispering the word
        players[msg.sender].numWhispered++;
        whispered[gameIndex][msg.sender] = true;
        emit Whispered(gameIndex, msg.sender);
    }

    /**
     * Join the group of players who know the word but do not reveal it
     * @param proof - proof of knowledge of the preimage of the word hash
     * @param game - game index
     */
    function whisper(bytes calldata proof, uint256 game) public playable(game) {
        // get word hash for the game
        bytes32 wordHash = words[game];

        // verify the proof
        bytes32[] memory publicInputs = new bytes32[](1);
        publicInputs[0] = wordHash;
        require(verifier.verify(proof, publicInputs), "Invalid proof");

        // mark player as whispering the word
        players[msg.sender].numWhispered++;
        whispered[gameIndex][msg.sender] = true;
        emit Whispered(gameIndex, msg.sender);
    }

    /**
     * Given a word, convert it into the field elements to be hashed by Poseidon
     * @param title - the string to convert into field elements
     * @return chunks - the field elements to hash with Poseidon
     */
    function convertTitleToFelts(string memory title) public pure returns (bytes32[7] memory chunks) {
        // check that the string is not too long
        require(bytes(title).length <= 200, "Title too long");

        // convert to field elements
        for (uint256 i = 0; i < 7; i++) {
            uint256 start = i * 31;
            uint256 end = start + 31;

            bytes memory chunk = new bytes(32);
            bytes32 chunk32;

            // copy the bytes from the title into the chunk if not past length
            if (start < bytes(title).length) {
                uint256 endAdjusted = end > bytes(title).length ? bytes(title).length : end;
                for (uint256 j = start; j < endAdjusted; j++) {
                    chunk[j - start] = bytes(title)[j];
                }
            }
            // load 32 bytes of chunk into array
            assembly {
                chunk32 := mload(add(chunk, 32))
            }

            chunks[i] = chunk32;
        }
    }
}
