// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract TokenPay {

    function balance(address tokenAddress) public view returns(uint){
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function pay(address tokenAddress, uint tokenAmount) public {
        require(IERC20(tokenAddress).balanceOf(address(this)) >= tokenAmount, "contract doesnt have enough balance");
        IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
    }
}