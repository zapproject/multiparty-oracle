const BigNumber = web3.BigNumber;
const expect = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.expect;

const EVMRevert = require("./helpers/EVMRevert");


const MPO = artifacts.require("MultiPartyOracle");
const MPOStorage = artifacts.require("MPOStorage");
const Oracle = artifacts.require("TestProvider");
const MaliciousOracle = artifacts.require("MaliciousProvider");
const Subscriber = artifacts.require("TestClient");


contract('MultiPartyOracle', function (accounts) {
	const owner = accounts[0];
	const subscriber = accounts[1];
	const provider1 = accounts[2];
	const provider2 = accounts[3];
	const provider3 = accounts[4];
	const provider4 = accounts[5];

	const spec = "Hello?";
 	const params = ["param1", "param2"];


	function isEventReceived(logs, eventName) {
	    for (let i in logs) {
	        let log = logs[i];
	        if (log.event === eventName) {
	            return true;
	        }
	    }
	    return false;
	}


	it("MultiPartyOracle_1 - Check that we threshold is met.", async function () {
		this.test.p1 = await Oracle.new("Hello World");
		this.test.p2 = await Oracle.new("Goodbye World");
		this.test.p3 = await Oracle.new("Hello World");
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();

		this.test.MPO = await MPO.new(this.test.MPOStorage.address);
		
		let oracleAddr = this.test.MPO.address;

		await this.test.MPOStorage.transferOwnership(oracleAddr);
		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);

		let query = "querydoesntmatter";

		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);

		let logs = await MPOEvents.get();
		let clientLogs = await clientEvents.get();

		console.log(clientLogs);
		await expect(isEventReceived(clientLogs, "Result1")).to.be.equal(true);

        // subscriber should have emitted one event
        var result = clientLogs[0].args["response1"];
        await expect(result).to.be.equal("Hello World");
	});

	
	// test that for 3 oracles if each submits a different response then no reponse will be given
	it("MultiPartyOracle_2 - Check that not meeting the threshold will cause no response to be emitted", async function () {
		this.test.p1 = await Oracle.new("A");
		this.test.p2 = await Oracle.new("B");
		this.test.p3 = await Oracle.new("C");
		let threshold = 2;
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);
		let query = "querydoesntmatter";

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);

		let clientLogs = await clientEvents.get();
		await expect(isEventReceived(clientLogs, "Result1")).to.be.equal(false);
	});

	it("MultiPartyOracle_3 - Disallow queries from accepting more responses when the threshold has been met", async function () {
		this.test.p1 = await Oracle.new("A");
		this.test.p2 = await Oracle.new("C");
		this.test.p3 = await Oracle.new("C");
		this.test.p4 = await Oracle.new("A");
		
		let threshold = 2;

		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		let p4 = this.test.p4.address;

		this.test.MPOStorage = await MPOStorage.new();

		this.test.MPO = await MPO.new(this.test.MPOStorage.address);
		
		let oracleAddr = this.test.MPO.address;

		await this.test.MPOStorage.transferOwnership(oracleAddr);
		this.test.MPO.setParams( [p1,p2,p3,p4], this.test.client.address, threshold);

		let query = "querydoesntmatter";


		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

        await expect(this.test.client.testQuery(oracleAddr, query, spec, params)).to.be.eventually.rejectedWith(EVMRevert);

	});

	it("MultiPartyOracle_4 - Check that the MPO only takes an input once from each provider for a query", async function () {
		this.test.p1 = await Oracle.new("A");
		this.test.p2 = await Oracle.new("C");
		this.test.p3 = await Oracle.new("C");
		let threshold = 2;
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

		this.test.MPO.setParams( [p1,p2,p1,p3], this.test.client.address, threshold);
		let query = "querydoesntmatter";

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

        await expect(this.test.client.testQuery(oracleAddr, query, spec, params)).to.be.eventually.rejectedWith(EVMRevert);
	});

    it("MultiPartyOracle_5 - Revert if threshold is less than 1.", async function () {
        this.test.p1 = await Oracle.new("Hello World");
        this.test.p2 = await Oracle.new("Goodbye World");
        this.test.p3 = await Oracle.new("Hello World");
        
        this.test.client = await Subscriber.new();

        let p1 = this.test.p1.address;
        let p2 = this.test.p2.address;
        let p3 = this.test.p3.address;
        let threshold = 0;

        this.test.MPOStorage = await MPOStorage.new();

        let MPOStorage_address = this.test.MPOStorage.address;
        let address = this.test.client.address;
		this.test.MPO = await MPO.new(this.test.MPOStorage.address)

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

        await expect(this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("MultiPartyOracle_6 - Revert if threshold is greater than the number of responders.", async function () {
        this.test.p1 = await Oracle.new("Hello World");
        this.test.p2 = await Oracle.new("Goodbye World");
        this.test.p3 = await Oracle.new("Hello World");
        
        this.test.client = await Subscriber.new();

        let p1 = this.test.p1.address;
        let p2 = this.test.p2.address;
        let p3 = this.test.p3.address;
        let threshold = 0;

        this.test.MPOStorage = await MPOStorage.new();

        let MPOStorage_address = this.test.MPOStorage.address;
        let address = this.test.client.address;
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

        await expect(this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("MultiPartyOracle_7 - Revert if number of responders is 0.", async function () {

        this.test.client = await Subscriber.new();
        let threshold = 0;

        this.test.MPOStorage = await MPOStorage.new();

        let MPOStorage_address = this.test.MPOStorage.address;
        let address = this.test.client.address;
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

        await expect(this.test.MPO.setParams( [], this.test.client.address, threshold)).to.be.eventually.rejectedWith(EVMRevert);
    });

	it("MultiPartyOracle_8 - Check that a malicious provider cannot call MultiPartyOracle's callback.", async function () {
		this.test.p1 = await Oracle.new("Hello World");
		this.test.p2 = await Oracle.new("Goodbye World");
		this.test.p3 = await Oracle.new("Hello World");

		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;

		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);
		let query = "querydoesntmatter";

		//create a maclious provider
		this.test.attacker = await MaliciousOracle.new("Attack", oracleAddr); 
		let attacker = this.test.attacker.address;


		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);
        
        await expect(this.test.attacker.receive(oracleAddr, query, spec, params)).to.be.eventually.rejectedWith(EVMRevert);
	})

		//test to make sure that only the client passed in MPO's constructor can make a query to the MPO
	it("MultiPartyOracle_9 - Revert if a client that isn't passed into the MultiPartyOracle's constructor attempts to make a query.", async function () {
		this.test.p1 = await Oracle.new("A");
		this.test.p2 = await Oracle.new("A");
		this.test.p3 = await Oracle.new("C");

		this.test.client = await Subscriber.new();
		this.test.client2 = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;

		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address);

		let oracleAddr = this.test.MPO.address;
		await this.test.MPOStorage.transferOwnership(oracleAddr);

		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);
		let query = "querydoesntmatter";

		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

        const client2Events = this.test.client2.allEvents({ fromBlock: 0, toBlock: 'latest' });
        client2Events.watch((err, res) => { }); 

		await expect(this.test.client2.testQuery(oracleAddr, query, spec, params)).to.be.eventually.rejectedWith(EVMRevert);
	})

	it("MultiPartyOracle_10 - Test client making 2 different queries.", async function () {
		this.test.p1 = await Oracle.new("Hello World");
		this.test.p2 = await Oracle.new("Goodbye World");
		this.test.p3 = await Oracle.new("Hello World");
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();

		this.test.MPO = await MPO.new(this.test.MPOStorage.address);
		
		let oracleAddr = this.test.MPO.address;

		await this.test.MPOStorage.transferOwnership(oracleAddr);
		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);

		let query = "querydoesntmatter";

		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);
		await this.test.client.testQuery2(oracleAddr, query, spec, params);

		let logs = await MPOEvents.get();
		let clientLogs = await clientEvents.get();

		console.log(clientLogs);
		await expect(isEventReceived(clientLogs, "Result1")).to.be.equal(true);

        // subscriber should have emitted one event
        var result = clientLogs[0].args["response1"];
        await expect(result).to.be.equal("Hello World");

        var result = clientLogs[1].args["response1"];
        await expect(result).to.be.equal("Hello World");
	});

	it("MultiPartyOracle_11 - Test client should revert if same query is called twice.", async function () {
		this.test.p1 = await Oracle.new("Hello World");
		this.test.p2 = await Oracle.new("Goodbye World");
		this.test.p3 = await Oracle.new("Hello World");
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();

		this.test.MPO = await MPO.new(this.test.MPOStorage.address);
		
		let oracleAddr = this.test.MPO.address;

		await this.test.MPOStorage.transferOwnership(oracleAddr);
		this.test.MPO.setParams( [p1,p2,p3], this.test.client.address, threshold);

		let query = "querydoesntmatter";

		const MPOEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        MPOEvents.watch((err, res) => { }); 

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);
		await expect(this.test.client.testQuery(oracleAddr, query, spec, params)).to.be.eventually.rejectedWith(EVMRevert);

		let logs = await MPOEvents.get();
		let clientLogs = await clientEvents.get();

		console.log(clientLogs);
		await expect(isEventReceived(clientLogs, "Result1")).to.be.equal(true);

        // subscriber should have emitted one event
        var result = clientLogs[0].args["response1"];
        await expect(result).to.be.equal("Hello World");
	});
});