# Overview
The Multiparty Oracle (MPO) is a novel method of getting reliable data. The client queries the MPO. The MPO then relays this query to multiple designated providers until a "consensus" is reached. At this point the MPO sends the response to the client.
## Types of Providers
The Multiparty Oracle can make queries to three different types of providers:

* Offchain:
    * Registered through Zap Contracts. Listens for MPO events and responds with a contract call, usually with web3.
* Onchain:
    * Registered through Zap Contracts. Operate on the blockchain directly.
* "Nonproviders":
    * Not registered, but listens for an event and makes an external contract call, typically with web3.

## MPOStorage
-------------------
MPOStorage is Ownable. At deployment, owner of MPOStorage should transfer ownership to the Multiparty Oracle contract. Then only the Multiparty Oracle can call setter methods in storage. This design is to separate storage logic from business logic.

### Setters
* `function setThreshold(uint256 _threshold) external onlyOwner`
    * Sets the threshold that the MPO must reach before sending results to the client.
* `function setClientQueryId(uint256 _clientQueryId) external onlyOwner`
    * Used for Onchain Providers. This function is best for synchronous calls, keeping track of a singular client ID throughout the pipeline.
* `function setClientQueryId(uint256 mpoId, uint256 _clientQueryId) external onlyOwner`
    * Used for Offchain Providers and "Non providers". This creates a unique MPO ID used to keep track of asynchronously stored Client IDs.
* `function setResponders(address[] parties) external onlyOwner`
    * Adds the list of provider/responder addresses. Also approves "Nonproviders" that want to call MPO's callback function.
* `function setQueryStatus(uint queryId, uint status) external onlyOwner`
    * There are 4 types of query statuses. 
        * 0: This is the default. In this scenario queries are free to pass through.
        * 1: A query to an offchain provider is being processed. 
        * 2: A query to an onchain provider is being processed.
        * 3: The query has been fulfilled. More responses to the query are not allowed.
* `function addResponse(uint256 queryId, string response, address party) external onlyOwner`
    * Takes a query ID and a string and maps it to a tally. For each response equal/appropriately similar to past responses, the tally increments. 
    * Also enforces that each provider sends only one response and does not flood the oracle with its own responses, influencing tally count.

## Multiparty Oracle
---
### Functions
* `constructor(address registryAddress, address _dispatchAddress, address mpoStorageAddress)`
    * Stores/initializes dispatch, registry, and MPOStorage addresses MPO will call to.
    * Registers MPO as a provider in registry and initiates provider curves for Offchain, Onchain, and Nonproviders.
* `setParams(address[] _responders, uintV256 _threshold) public`
    * Sets the threshold and adds the approved providers to an array.
* `receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external`
    * id: Dispatch-generated client ID.
    * userQuery: subscriber-provided query string to be submitted to providers.
    * endpoint: determines the type of provider to use
    * endpointParams: to the discretion of MPO host who coordinates with and caters to the requirements of each provider.
    * onchainSubscriber: unused.
* `callback(uint256 queryId, string response) external`
    * Called by either the approved providers OR dispatch. Ensures that msg.sender did not issue a response to the query already by checking query status.
    * queryId: Dispatch-generated query Id for MPO to providers.
    * response: Provider response to query. Can have up to four responses.
### Endpoints
Each of the endpoints take in three parameters:

* `(uint256 id, string userQuery, bytes32[] endpointParams)`
    * id: the client ID. For offchain providers, used to help map the dispatch-generated MPO IDs to the client IDs. For non-providers,used to generate an MPO ID before creating the mapping.
    * userQuery and endpointParams: Passed towards the provider no matter what type. Both endpoints one and two call on dispatch, while endpoint 3 creates an Incoming event. In all three cases, after providers are called, contract waits for providers to call MPO's callback function.
* `Endpoint1`: queries Onchain Providers through dispatch.
* `Endpoint2`: queries Offchain Providers through dispatch.
* `Endpoint3`: queries Nonproviders. Rather than querying dispatch, emits an Incoming event that the provider listens for. Provider should check to make sure that provider from event is correct before responding. 