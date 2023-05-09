<br/>
<p align="center">
<a href="https://github.com/nexlabs22/Nex-Dex-Contracts" target="_blank">
<img src="https://avatars.githubusercontent.com/u/110898646?s=200&v=4" width="225" alt="Nex logo">
</a>
</p>
<br/>

```

exchange= https://goerli.etherscan.io/address/0xf4338c04b412434943e9301dD357C2Ed54e775Cf#writeContract

exchangeInfo=
https://goerli.etherscan.io/address/0x5E07aC161537572054e0F1A76F73fefCDe6c4545#code

Gold = https://goerli.etherscan.io/address/0x6B1383F637d4Ad470c3F27d320340c9189fE8f47#code

GoldInfo =
https://goerli.etherscan.io/address/0x91C6623357C1C6E94674feBCD26e6e21FB6Eb382#readContract

Silver = 
https://goerli.etherscan.io/address/0x9b6F6D0994De28DF13d820F7fAA29a2d29224DcB#writeContract

SilverInfo=
https://goerli.etherscan.io/address/0x5Cd93F5C4ECE56b7faC31ABb3c1933f6a6FE7182#readContract
```

# Getting Started

It's recommended that you've gone through the [hardhat getting started documentation](https://hardhat.org/getting-started/) before proceeding here.

## Requirements

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
- [Nodejs](https://nodejs.org/en/)
  - You'll know you've installed nodejs right if you can run:
    - `node --version`and get an ouput like: `vx.x.x`
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/) instead of `npm`
  - You'll know you've installed yarn right if you can run:
    - `yarn --version` And get an output like: `x.x.x`
    - You might need to install it with npm

> If you're familiar with `npx` and `npm` instead of `yarn`, you can use `npx` for execution and `npm` for installing dependencies.

## Quickstart

1. Clone and install dependencies

After installing all the requirements, run the following:

```bash
git clone https://github.com/nexlabs22/Nex-Dex-Contracts.git
cd Nex-Dex-Contracts
```

Then:

```
yarn
```

or

```
npm i
```

2. Change .env.sample file name to .env
3. You can now do stuff!

```
yarn test
```

or

```
yarn hardhat test
```

# Usage

If you run `yarn hardhat --help` you'll get an output of all the tasks you can run.

## Deploying Contracts

First add your private key(if you want deploy contracts) to .env file

After thet run:

```
yarn hardhat deploy
```

# Thank You!
