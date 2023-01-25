import { ATTR_CONTRACT_TOKEN } from './../../constant';
import { WeitoNumber } from "../../basics"
import {
  ATTR_CONTRACT_PRINTSTATUS
} from "../../constant"
import { GetContractByAddress, GetUserName } from "../../core/worker"
import { GetContractOwner } from '../../solidity/contract';


export default function (contract: any): any {
  // print current contract status
  contract[ATTR_CONTRACT_PRINTSTATUS] = function () {
    const users = Object.keys(this.collateral[this.usdc])
    
    const result = []
    for (let i = 0; i < users.length; i++) {
      const address = users[i]
      const name          = GetUserName(address)
      const collateral    = this.collateral[this.usdc][address]
      const accountValue  = this.getAccountValue(address)
      const notionValue   = this.getPositionNotional(address)
      const pnl           = this.getPNL(address)
      const margin        = this.userMargin(address)
      const vUsdBalance   = this.uservUsdBalance(address)
      const vBaycBalance  = this.uservBaycBalance(address)

      result.push({
        Name: name,
        Collateral: WeitoNumber(collateral),
        AccountValue: WeitoNumber(accountValue),
        NotionalValue: WeitoNumber(notionValue),
        PNL: WeitoNumber(pnl),
        Margin: +margin.toFixed(2),
        VirtualUsdBalance: WeitoNumber(vUsdBalance),
        VirtualBaycBalance: WeitoNumber(vBaycBalance)
      })
    }

    result.push({});

    result.push({
      Collateral: 'Price',
      AccountValue: 'Insurance Fund',
      NotionalValue: 'Contract Collateral',
      PNL: 'Owner Collateral',
    })

    const owner = GetContractByAddress(GetContractOwner(this))

    result.push({
      Name: 'Contract',
      Collateral: WeitoNumber(this.getCurrentExchangePrice()),
      AccountValue: WeitoNumber(this.insuranceFunds),
      NotionalValue: WeitoNumber(this[ATTR_CONTRACT_TOKEN][this.usdc]),
      PNL: owner && WeitoNumber(owner[ATTR_CONTRACT_TOKEN][this.usdc] || 0),
    })

    console.table(result);
  }

  // returns an array of all users who have deposited money into the contract
  contract.__getAllUsers = function() {
    return Object.keys(this.collateral[this.usdc])
  }

  return contract;
}
