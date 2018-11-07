pragma solidity ^0.4.24;

import "./lib/Ownable.sol";

contract MPOStorage is Ownable{


	// check if msg.sender is in global approved list of responders
	mapping(address => bool) approvedAddress; 
	// Threshold reached, do not accept any more responses
	mapping(uint256 => uint256) queryStatus;
	// Tally of each response.
	mapping(uint256 => mapping(string => uint256) ) responseTally; 
	mapping(uint256 => int[]) responseIntArr; 
	mapping(uint256 => int) average;
	// Make sure each party can only submit one response
	mapping(uint256 => mapping(address => bool)) oneAddressResponse; 
	mapping(uint256 => uint256) mpoToClientId;
	
	uint256 delta; 
	uint256 threshold;
	address[] responders;

	// implements Client1
	address client;
	uint256 clientQueryId; 


	// Set Methods / Mutators
	function setThreshold(uint256 _threshold) external onlyOwner {
		threshold = _threshold;
	}

	

	function setClientQueryId(uint256 _clientQueryId) external onlyOwner {
		clientQueryId = _clientQueryId;
	}
	function setClientQueryId(uint256 mpoId, uint256 _clientQueryId) external onlyOwner {
		mpoToClientId[mpoId] = _clientQueryId;
	}
 
	function setResponders(address[] parties) external onlyOwner {
		responders=parties;
		for(uint256 i=0;i<parties.length;i++){
			approvedAddress[parties[i]]=true;
		}
	}

	function setQueryStatus(uint queryId, uint status) external onlyOwner {
		queryStatus[queryId]=status;
	}

	function addResponse(uint256 queryId, string response, address party) external onlyOwner {
		responseTally[queryId][response]++;
		oneAddressResponse[queryId][party] = true;
	}
	function addIntResponse(uint256 queryId, int response, address party) external onlyOwner {
		responseIntArr[queryId].push(response);
		oneAddressResponse[queryId][party] = true;
	}
	function setDelta(uint256 _delta) external{
		delta = _delta;
	}

	// Get Methods / Accessors

	function onlyOneResponse(uint256 queryId, address party) external view returns(bool) {
        return oneAddressResponse[queryId][party];
    }

    function getAddressStatus(address party) external view returns(bool){
        return approvedAddress[party];
    }
	
	function getThreshold() external view returns(uint) { 
		return threshold;
	}
	
	function getTally(uint256 queryId, string response)external view returns(uint256){
		return responseTally[queryId][response];
	}

	function getClientQueryId() external view returns(uint256){
		return clientQueryId;
	}
	function getClientQueryId(uint256 mpoId) external view returns(uint256){
		return mpoToClientId[mpoId];
	}

	function getQueryStatus(uint256 queryId) external view returns(uint256){
		return queryStatus[queryId];
	}

	function getNumResponders() external view returns (uint) {
		return responders.length;
	}

	function getResponderAddress(uint index) external view returns(address){
		return responders[index];
	}
	function getIntResponses(uint256 queryId) external view returns(int[]){
		return responseIntArr[queryId];
	}
	function getDelta() external view returns(uint256){
		return delta;
	}
	function getMedian(uint256 queryId)external returns(int){
		quickSort(responseIntArr[queryId],0, responseIntArr[queryId].length-1);
		return responseIntArr[queryId][(responseIntArr[queryId].length - 1)/2];
	}
	function getAverage(int[] arr) external view returns(int[]){
		require(arr.length!=0, "Division error");
		int total = 0;
		int length=0;
		for (uint i =0; i<arr.length;i++){
			if(arr[i]!=0){length++;}
			total+=arr[i];
		}
		require(total>arr[0], "Overflow error");
		int[] memory avg = new int[](1);
		avg[0]=total / length;
		return avg;
	}
	function quickSort(int[] storage arr, uint left, uint right) internal {
        uint i = left;
        uint j = right;
        int pivot = arr[left + (right - left) / 2];
        while (i <= j) {
            while (arr[i] < pivot) i++;
            while (pivot < arr[j]) j--;
            if (i <= j) {
                (arr[i], arr[j]) = (arr[j], arr[i]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSort(arr, left, j);
        if (i < right)
            quickSort(arr, i, right);
    }

}
