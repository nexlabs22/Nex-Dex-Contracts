import { 
  GetCurrentSender,
  GetCurrentContract 
} from "../core";
import { getContractOwner } from "./contract";

export function Owner() {
  return getContractOwner(GetCurrentContract());
}

export const msg = {
  get sender() {
    return GetCurrentSender();
  }
}
