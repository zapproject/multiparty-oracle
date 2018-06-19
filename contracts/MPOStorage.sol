pragma solidity ^0.4.19;

contract MPOStorage{

	struct Response{
		string responseString;
	}
	
//TODO maybe have a thresholdFull event?
	mapping(uint => string[]) queryResponses;
	mapping(address => bool) approvedAddress;

	mapping(uint256 => mapping(string=>uint256) ) responseTally;
	uint256 threshold;
	address[] responders;
	//Set Methods/Mutators

	function setThreshold(uint threshold){
		this.threshold = threshold;
	}
	function setResponders(address[] parties){
		for(int i=0;i<parties.length;i++){
			responders.push(parties[i]);
			approvedAddress[parties[i]]=true;
		}
			
	}
	//Get Methods/Accessors
	function getResponses(uint256 queryId) returns(Response[]){
		 return responseTally[queryId];
	}
	function getThreshold(uint256 queryId) returns(uint){
		return threshold;
	}
		}

}