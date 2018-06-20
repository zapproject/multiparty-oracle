pragma solidity ^0.4.24;

contract MPOStorage{




//TODO maybe have a thresholdFull event?
	mapping(uint256 => bytes32[]) queryResponses;
	mapping(address => bool) approvedAddress;
	mapping(uint256 => bool) queryFulfilled;
	mapping(uint256 => mapping(bytes32 => uint256) ) responseTally;
	mapping(uint256 => mapping(address => bool)) oneAddressResponse;

	uint256 threshold;
	address[] responders;
	//Set Methods/Mutators

	function setThreshold(uint256 _threshold){
		threshold = _threshold;
	}
	function setResponders(address[] parties){
		for(uint256 i=0;i<parties.length;i++){
			responders.push(parties[i]);
			approvedAddress[parties[i]]=true;
		}
	}
	function addResponse(uint256 queryId, string response, address responder){
		queryResponses[queryId].push(keccak256(response));
		oneAddressResponse[queryId][responder]=true;
		responseTally[queryId][keccak256(response)]++;
	}
	function fulfillQuery(uint queryId){
		queryFulfilled[queryId]=true;
	}
	//Get Methods/Accessors
	/* function getResponses(uint256 queryId) returns(string[]){
		 return queryResponses[queryId];
	} */
	function getThreshold() returns(uint){
		return threshold;
	}
	function getAddressStatus(address party) returns(bool){
		return approvedAddress[party];
	}
	function getTally(uint256 queryId, string response) returns(uint256){
		return responseTally[queryId][keccak256(response)];

	}

}
