pragma solidity ^0.4.19;

contract MPOStorage{

	struct Response{
		bool approved;
		string responseString;
	}
	
//TODO maybe have a thresholdFull event?
	address[] responders;
	//Set Methods/Mutators
	function submitResponse1(
		uint256 queryId, 
		string response){
		
	}
	function setThreshold(
		uint256 queryId, 
		uint256 threshold){
		responseThreshold[queryId] = threshold;
	}
	function setResponders(address[] parties){
		
	}
	//Get Methods/Accessors
	function getResponses(uint256 queryId) returns(Response[]){
		return queryToResponses[queryId];
	}
	function getThreshold(uint256 queryId) returns(uint){
		return responseThreshold[queryId];
	}

}