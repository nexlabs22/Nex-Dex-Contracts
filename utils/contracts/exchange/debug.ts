import { toNumber } from "../../basics"
import {
  ATTR_CONTRACT_PRINTSTATUS
} from "../../constant"
import { GetUserName } from "../../core/worker"


export default function (contract: any): any {
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
        Collateral: collateral,
        AccountValue: accountValue,
        NotionalValue: notionValue,
        PNL: pnl,
        Margin: margin,
        VirtualUsdBalance: vUsdBalance,
        VirtuaBaycBalance: vBaycBalance
      })
    }
    //   // if (this.activeUsers[i] === address(0)) break;
    //   const status = this.getUserStatus(this.userAccounts[i].address, this.poolState);
    //   result.push({
    //     Id: "User" + i,
    //     Collateral: toNumber(status.collateral),
    //     AccountValue: toNumber(status.accountValue),
    //     NotionalValue: toNumber(status.notionalValue),
    //     PNL: toNumber(status.pnl),
    //     Margin: toNumber(status.margin),
    //     VirtuaUsdBalance: toNumber(status.vUsdBalance),
    //     VirtuaBaycBalance: toNumber(status.vBaycBalance),
    //   });
    // }

    result.push({});

    // result.push({
    //   Collateral: 'Virtual Collateral',
    //   AccountValue: 'Insurance Fund',
    //   NotionalValue: 'Contract Collateral',
    //   PNL: 'Total Fee',
    //   Margin: 'Price',
    // })

    // result.push({
    //   Id: 'Contract',
    //   Collateral: toNumber(this.virtualCollateral),
    //   AccountValue: toNumber(this.insuranceFunds),
    //   NotionalValue: toNumber(this.realCollateral),
    //   PNL: toNumber(this.feeCollector),
    //   Margin: toNumber(this.price),
    // })

    console.table(result);

    // console.log(toNumber(contract?.pool?.vBaycPoolSize), toNumber(contract?.pool?.vUsdPoolSize));
    // console.log(toNumber(contract?.showPriceUSD()));
  }

  return contract;
}
