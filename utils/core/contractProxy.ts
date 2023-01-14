import { isContract } from "../solidity/contract"

const handler = {
  get: function (target, prop, receiver) {
    if (!(target && prop && typeof target[prop] === "function"))
      return Reflect.get(target, prop, receiver)
      
  },
}

export default function (object) {
  if (isContract(object)) {
    return new Proxy(object, handler)
  }
}
