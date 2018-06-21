const BigNumber = web3.BigNumber;
const expect = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.expect;

//const EVMRevert = require("./helpers/EVMRevert");


const MPO = artifacts.require("MultiPartyOracle");
const MPOStorage = artifacts.require("MPOStorage");
const Oracle = artifacts.require("TestProvider");
const Subscriber = artifacts.require("TestClient");

contract('MultiPartyOracle', function (accounts) {
	const owner = accounts[0];
	const subscriber = accounts[1];
	const provider1 = accounts[2];
	const provider2 = accounts[3];
	const provider3 = accounts[4];

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


	it("DISPATCH_1 - respond1() - Check that we can fulfill 2/3", async function () {
		this.test.p1 = await Oracle.new("Hello World");
		this.test.p2 = await Oracle.new("Goodbye World");
		this.test.p3 = await Oracle.new("Hello World");
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		let threshold = 2;

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address, [p1,p2,p3], this.test.client.address, threshold);

		let oracleAddr = this.test.MPO.address;
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
	it("DISPATCH_1 - respond1() - Check that not meeting the threshold will cause no response to be emitted", async function () {
		this.test.p1 = await Oracle.new("A");
		this.test.p2 = await Oracle.new("B");
		this.test.p3 = await Oracle.new("C");
		let threshold = 2;
		
		this.test.client = await Subscriber.new();

		let p1 = this.test.p1.address;
		let p2 = this.test.p2.address;
		let p3 = this.test.p3.address;
		

		this.test.MPOStorage = await MPOStorage.new();
		this.test.MPO = await MPO.new(this.test.MPOStorage.address, [p1,p2,p3], this.test.client.address, threshold);

		let oracleAddr = this.test.MPO.address;

		let query = "querydoesntmatter";

        const clientEvents = this.test.client.allEvents({ fromBlock: 0, toBlock: 'latest' });
        clientEvents.watch((err, res) => { }); 

		await this.test.client.testQuery(oracleAddr, query, spec, params);

		let clientLogs = await clientEvents.get();
		await expect(isEventReceived(clientLogs, "Result1")).to.be.equal(false);
	});

		// TODO: add more test cases
});