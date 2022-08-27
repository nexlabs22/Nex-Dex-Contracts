<br/>
<p align="center">
<a href="https://chain.link" target="_blank">
<img src="https://avatars.githubusercontent.com/u/110898646?s=200&v=4" width="225" alt="Chainlink Hardhat logo">
</a>
</p>
<br/>



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

