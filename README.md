# The Word
```
  _____ _           __        __            _ 
 |_   _| |__   ___  \ \      / /__  _ __ __| |
   | | | '_ \ / _ \  \ \ /\ / / _ \| '__/ _` |
   | | | | | |  __/   \ V  V / (_) | | | (_| |
   |_| |_| |_|\___|    \_/\_/ \___/|_|  \__,_|
                                              
```
A game to see how large a secret can grow before it becomes to big to keep!

## Installation
1. Download the repository
```console
git clone git@github.com:Mach-34/the-word.git
```
2. build the typescript
```console
cd the-word
npm run build
```
3. run the project from the local build
```console
node ./dest/main.js
```
4. optionally, link the binary globally
```console
npm link
# now you can access the cli from anywhere:
the-word
```

## Usage

### Proving
`the-word` cli can prove knowledge that a given poseidon hash is of some secret phrase up to 200 characters - the title of a song.

Use the cli to prove knowledge of the song "Stayin' Alive":
```console
# cmd
the-word -p . -t "Stayin' Alive"

# output
...
Proved secret song title "Stayin' Alive" creats public hash "0x2b1e9f9d2eacddf14ab7a85ab7a6cac1124180f59f9653c84ff0c5fa3d06fb10"
Saved to proof to ..././song_hash.proof
```

### Verifying
`the-word` cli can verify a proof (which contains the hash as the first 32 bytes) of a song title secret.
Use the cli to verify knowledge of the "Stayin' Alive" song hash we previously saved:
```
# cmd
the-word -v ./song_hash.proof

# output
...
VERIFIED proof of knowledge of song hash 0x2b1e9f9d2eacddf14ab7a85ab7a6cac1124180f59f9653c84ff0c5fa3d06fb10
```

### Creating a new round on-chain


### Whispering the solution
todo

### Shouting the solution
todo

## About
Todo: elaborate on playing the game
 * [Figma](https://www.figma.com/file/qs5ZXi5kvsZVeV9BkboLST/Good-people-society?type=whiteboard&node-id=0%3A1&t=mwt5JJLARsdbZdM0-1)
 * [Notion](https://www.notion.so/pse-team/secret-code-game-Good-people-society-2c310212327b45dcb0b1d11a0c228888?pvs=4)