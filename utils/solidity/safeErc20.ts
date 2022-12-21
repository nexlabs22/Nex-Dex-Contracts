import address from "./address";
import IERC20 from "./ierc20";
import uint256 from "./uint256";

const SafeERC20 = {
  safeTransferFrom: function (token: IERC20, from: address | undefined, to: address | undefined, value: uint256) {
    
  },

  safeTransfer: function (token: IERC20, to: address, value: uint256) {
    
  },
}

export default SafeERC20;