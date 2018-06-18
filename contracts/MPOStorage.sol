pragma solidity ^0.4.19;

contract MPOStorage{

	struct Response{
		address party;
		string res;
	}
	mapping(uint => Response[]) queryToResponses;
	mapping(uint => uint) responseThreshold;
//TODO maybe have a thresholdFull event?

	//Set Methods/Mutators
	function addResponse(
		uint queryId, 
		address party, 
		string partyResponse){
		require(queryToResponses[queryId].length <= responseThreshold[queryId]);

		queryToResponses[queryId].push(new Response(party, partyResponse));
	}
	function setThreshold(
		uint queryId, 
		uint threshold){
		responseThreshold[queryId] = threshold;
	}

	//Get Methods/Accessors
	function getResponses(uint queryId) returns(Response[]){
		return queryToResponses[queryId];
	}
	function getThreshold(uint queryId) returns(uint){
		return responseThreshold[queryId];
	}

}