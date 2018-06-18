pragma solidity ^0.4.19

interface MPOInterface(){
	function addResponse(uint queryId, address party, string partyResponse);
	function setThreshold(uint queryId, uint threshold);
	function getResponses(uint queryId);
	function getThreshold(uint queryId);
}