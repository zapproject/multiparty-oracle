pragma solidity ^0.4.19

interface MPOInterface(){
	function submitResponse1(uint256, address, string);
	function setThreshold(uint256, uint256);
	function setResponders(address[])
	function getResponses(uint256);
	function getThreshold(uint256);
}