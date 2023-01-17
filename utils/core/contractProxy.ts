import { isContract, getContractAddress, getContractName } from "../solidity/contract"
import { ContractFunctionCalled, ContractFunctionEnded, ContractSenderChanged } from "./worker"

export default function (object: any) {
  if (isContract(object)) {
    const objectProxy = new Proxy(object, {
      get: function (target, prop, receiver) {
        // To add connect feature to contracts
        // await exchange.connect(account1).deposit...
        if (prop === "connect") {
          return function () {
            const [account] = arguments
            ContractSenderChanged({
              address: getContractAddress(target),
              sender: account?.address,
            })
            return objectProxy
          }
        }

        if (!(target && prop && typeof prop === "string" && typeof target[prop] === "function"))
          return Reflect.get(target, prop, receiver)

        return function () {
          ContractFunctionCalled({
            address: getContractName(target),
            funcName: prop,
          })
          const result = target[prop].call(objectProxy, ...arguments)
          ContractFunctionEnded({
            address: getContractName(target),
            funcName: prop,
          })
          return result
        }
      },
    })

    return objectProxy
  }
}
