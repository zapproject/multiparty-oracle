pragma solidity ^0.4.19;

contract MPOStorage{

	struct Response{
		address party;
		string res;
	}
	mapping(uint256 => Response[]) queryToResponses;
	mapping(uint256 => uint256) responseThreshold;
//TODO maybe have a thresholdFull event?

	//Set Methods/Mutators
	function submitResponse1(
		uint256 queryId, 
		string response){
		require(queryToResponses[queryId].length <= responseThreshold[queryId]);

		queryToResponses[queryId].push(new Response(party, response));
	}
	function setThreshold(
		uint256 queryId, 
		uint256 threshold){
		responseThreshold[queryId] = threshold;
	}

	//Get Methods/Accessors
	function getResponses(uint256 queryId) returns(Response[]){
		return queryToResponses[queryId];
	}
	function getThreshold(uint256 queryId) returns(uint){
		return responseThreshold[queryId];
	}

}