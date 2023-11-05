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
0. Requires Node & NPM. Built on Node v18.17.1

1. Install the CLI with `npm i -g @the-word-pse/cli`

2. Once the package has been installed and the executable linked, you should be able to access the command in your terminal: `the-word`
```console
# Output from running `the-word`
  _____ _           __        __            _ 
 |_   _| |__   ___  \ \      / /__  _ __ __| |
   | | | '_ \ / _ \  \ \ /\ / / _ \| '__/ _` |
   | | | | | |  __/   \ V  V / (_) | | | (_| |
   |_| |_| |_|\___|    \_/\_/ \___/|_|  \__,_|
                                              
Usage: cli [options] [command]

A game to see how big a secret can become before it's too big to keep

Options:
  -V, --version                        output the version number
  -h, --help                           display help for command

Commands:
  get <round>                          Get information about a round
  whisper <round> <phrase> <username>  Whisper a secret phrase
  shout <round> <phrase> <username>    Shout a secret phrase
  help [command]                       display help for command

```

## Using the CLI
The CLI points to a server running at `https://theword.mach34.space` linked to a smart contract at https://etherscan.io/address/0x0070a09d0c7a3c91806e6a3eff8c025a1324748c#code. You can use the CLI to interact with deployed rounds. If someone has told you the secret phrase for a given round, you can "whisper" or "shout" the phrase using the CLI. See below for more details.

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
Whispering the solution from the CLI will also save the generated Groth16 proof of knowledge of the secret. You can share this file with others if you want to convince them you know the secret phrase!

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
The currently active round #1 (as of October 16, 2023) has .1 eth in it. While whispering the solution can have social benefits, you can choose to shout the solution, burn the .1 eth, and end the round for everyone!

### Retrieving round information
You can retrieve information about a round by running `the word get <round>`. If the secret in a round is still *secret*, it will return a hint and the number of whisperers. If the secret has already been shouted, it will also return the secret phrase and the username of the user who shouted the solution.
Example:
```
the-word get 1
```