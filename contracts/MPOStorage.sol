pragma solidity ^0.4.24;

contract MPOStorage{

//TODO maybe have a thresholdFull event?
	//mapping(uint256 => string[]) queryResponses;
	mapping(address => bool) approvedAddress;

	mapping(uint256 => mapping(string=>uint256) ) responseTally;
	uint256 threshold;
	address[] responders;

	// implements Client1
	address client; 


	//Set Methods/Mutators
	function setThreshold(uint256 _threshold) public {
		threshold = _threshold;
	}

	function setClient(address _client) public {
		client = _client;
	}
 
	function setResponders(address[] parties) public {
		for(uint256 i=0;i<parties.length;i++){
			responders.push(parties[i]);
			approvedAddress[parties[i]]=true;
		}
	}

	function addResponse(uint256 queryId, string response) public {
		// queryResponses[queryId].push(response);
		responseTally[queryId][response]++;
	}

	//Get Methods/Accessors

	function getThreshold() public view returns(uint) { 
		return threshold;
	}
	function getAddressStatus(address party) public view returns(bool){
		return approvedAddress[party];
	}
	function getTally(uint256 queryId, string response) public view returns(uint256){
		return responseTally[queryId][response];
	}

	function getClient() public view returns (address){
		return client;
	}

	function getNumResponders() public view returns (uint) {
		return responders.length;
	}

	function getResponderAddress(uint index) public view returns (address){
		return responders[index];
	}
}
