# The Word
```
  _____ _           __        __            _ 
 |_   _| |__   ___  \ \      / /__  _ __ __| |
   | | | '_ \ / _ \  \ \ /\ / / _ \| '__/ _` |
   | | | | | |  __/   \ V  V / (_) | | | (_| |
   |_| |_| |_|\___|    \_/\_/ \___/|_|  \__,_|
                                              
```
A game to see how large a secret can grow before it becomes to big to keep!

See subfolder's readmes for additional info on running yourslef (TODO)

## Installing the CLI
Note: the installation instructions may be overly verbose for experienced CLI users. The instructions are meant to ensure non-technical users have a chance to use this repository.
0. Install a version of Node >= 18, and install yarn
1. Clone the repository
```
git clone https://github.com/Mach-34/the-word.git
```
2. Go to the cli directory
```
cd the-word/cli
```
3. Create a .env file with your preferred text editor (ex. nano)
```
nano .env
```
4. Inside this file, copy paste the following string
```
API=http://192.46.218.134:8000
```
5. Save the .env file (ex: nano)
```
CTRL+O
CTRL+X
```
6. Install package dependencies and build the repository
```
yarn
npx tsc
```
7. Link the built executable globally (would use yarn if we could but yarn link doesn't globally expose :/)
```
npm link
```
8. You should now be able to use the CLI. Running `the-word` should output something like
```
  _____ _           __        __            _ 
 |_   _| |__   ___  \ \      / /__  _ __ __| |
   | | | '_ \ / _ \  \ \ /\ / / _ \| '__/ _` |
   | | | | | |  __/   \ V  V / (_) | | | (_| |
   |_| |_| |_|\___|    \_/\_/ \___/|_|  \__,_|
                                              
Usage: cli [options] [command]

A game to see how big a secret can become before it's too big to keep

Options:
  -V, --version                   output the version number
  -h, --help                      display help for command

Commands:
  create <phrase> <username> <hint>    Create a new round with a secret phrase
  get <round>                     Get information about a round
  whisper <round> <phrase> <username>  Whisper a secret phrase
  shout <round> <phrase> <username>    Shout a secret phrase
  help [command]                  display help for command
```

## Using the CLI
If you've followed the installation instructions, you can use the CLI to interact with the deployed app! The Word enables users to create secret phrases, whisper the solution to other's secret phrases and expand the secret's size, or shout the solution to end the round. Secrets are stored onchain, sometimes with a "prize" that is burned when a user shouts the solution. This app is *entirely gasless*.

### Creating a new round
To create a new game, run `the-word create <phrase> <username> <hint>`. The CLI will hash the secret phrase and generate a zk proof of knowledge of the secret phrase that creates that hash. Then, the CLI tells the server to start up a new round onchain. The CLI will return the round number which you can then share with others so that they can try to guess the secret!
 - "phrase": This is the secret phrase you want people to guess. It cannot be more than 180 UTF8 characters.
 - "username": This is an arbitrary username that is used to constrain the proof to a unique domain
 - "hint": Some text to help other users guess what your secret phrase is!

Example:
```
the-word create \
  "hunter2" \
  "u53rn@m3" \
  "hey, if you type in your pw, it will show as stars"
```

Note: The Word secrets have prizes attached to them which are burned to 0x00 when a solution is shouted. However, the current build does not provide metatransaction functionality needed to fund prizes from the CLI. This functionality will be figured out in the future, however persistent users can utilize the `fundPrize()` contract call *outside the CLI* if they really want to attach a prize to a secret phrase.

### Whispering the solution to a round
You can prove you know the solution to a secret without exposing the secret to others, you can "Whisper" the solution by running `the-word whisper <round> <phrase> <username>`. The CLI will hash the secret phrase and generate a zk proof of the secret phrase. The CLI then sends the proof to the server which checks the veracity of the proof and tracks you as a whisperer. No onchain action is taken at this point.
 - "round": This is the round number that is used to look up/ target a secret phrase.
 - "phrase": This is the phrase you are asserting is the secret of a given round.
 - "username": This is an arbitrary username that is used to constrain the proof to a unique domain
Example:
```
the-word whisper \
  1 \
  "hunter2" \
  "u53rn@m3" \
```

### Shouting the solution to a round
Instead of whispering a solution and "growing" the secret, you can end the round for everyone by shouting the solution publicly by running `the-word shout <round> <phrase> <username>`. The CLI will simply send off the solution to the server, which in turn will post the secret to the smart contract where it is hashed and compared to the commitment. If they're a match, the round ends and any prize attached to the round will be burned! Once a secret has been shouted, it is publicly known and users can no longer whisper the solution to grow the secret.
 - "round": This is the round number that is used to look up/ target a secret phrase.
 - "phrase": This is the phrase you are asserting is the secret of a given round.
 - "username": This is an arbitrary username that is used to constrain the proof to a unique domain
Example:
```
the-word shout \
  1 \
  "hunter2" \
  "u53rn@m3" \
```

### Retrieving round information
You can retrieve information about a round by running `the word get <round>`. If the secret in a round is still *secret*, it will return a hint and the number of whisperers. If the secret has already been shouted, it will also return the secret phrase and the username of the user who shouted the solution.
Example:
```
the-word get 1
```

## Deployment info
Sepolia deployment: https://sepolia.etherscan.io/address/0x20A02653367d7278eF5738311Cd2D82B91d7DcC1#code
Sepolia Server: 192.46.218.134:8000 (set in cli's .env)