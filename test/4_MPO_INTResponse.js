const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require("./helpers/utils");
const EVMRevert = require("./helpers/EVMRevert");
const {hexToUtf8, utf8ToHex} = require("web3-utils");
const ZapDB = artifacts.require("Database");
const ZapCoord = artifacts.require("ZapCoordinator");
const Dispatch = artifacts.require("Dispatch");
const Bondage = artifacts.require("Bondage");
const Registry = artifacts.require("Registry");
const ZapToken = artifacts.require("ZapToken");
const Cost = artifacts.require("CurrentCost");
const Subscriber = artifacts.require("TestClient");
const Provider = artifacts.require("TestProvider");
const Provider2 = artifacts.require("TestProvider");

// const Subscriber = artifacts.require("Subscriber");

const MPO = artifacts.require("MultiPartyOracle");
// const MPO2 = artifacts.require("MPO2");

const MPOStorage = artifacts.require("MPOStorage");

function showReceivedEvents(res) {
    for (let i = 0; i < bondRes.logs.length; i++) {
        let log = bondRes.logs[i];
        console.log("Event ", log.event);
        for (let j = 0; j < log.args.length; j++) {
            let arg = log.args[j];
            console.log("   ", arg);
        }
    }
}

function isEventReceived(logs, eventName) {
    for (let i in logs) {
        let log = logs[i];
        if (log.event === eventName) {
            return true;
        }
    }
    return false;
}

function getParamsFromIncomingEvent(logs) {
    for (let i in logs) {
        let log = logs[i];
        if (log.event === "Incoming") {
            let obj = new Object();
            obj.id = new BigNumber(log.args.id);
            obj.provider = log.args.provider.toString();
            obj.recipient = log.args.recipient.toString();
            obj.query = log.args.query.toString();
            obj.endpoint = log.args.endpoint.toString();
            obj.params = log.args.endpoint_params;

            return obj;
        }
    }
    return false;
}

contract('Dispatch', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const provider = accounts[2];
    const offchainOwner = accounts[3];
    const offchainOwner2 = accounts[4];
    const offchainOwner3 = accounts[5];

    const tokensForOwner = new BigNumber("5000e18");
    const tokensForSubscriber = new BigNumber("3000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const params = ["param1", "param2"];

    const spec1 = "Offchain";
    const spec2 = "Onchain";

    const publicKey = 10001;
    const title = "tst";
    const extInfo = [111, 222, 333];

    const piecewiseFunction = { // 2x^2
        constants: [2, 2, 0],
        parts: [0, 1000000000],
        dividers: [1]
    };

    const query = "Hello?";
    const query2 = "Reverse"

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
    }

    beforeEach(async function deployContracts() {
        this.currentTest.zapdb = await ZapDB.new()
        this.currentTest.zapcoord = await ZapCoord.new();
        await this.currentTest.zapdb.transferOwnership(this.currentTest.zapcoord.address);
        await this.currentTest.zapcoord.addImmutableContract('DATABASE', this.currentTest.zapdb.address);

        this.currentTest.token = await ZapToken.new();
        await this.currentTest.zapcoord.addImmutableContract('ZAP_TOKEN', this.currentTest.token.address);

        this.currentTest.registry = await Registry.new(this.currentTest.zapcoord.address);
        await this.currentTest.zapcoord.updateContract('REGISTRY', this.currentTest.registry.address);

        this.currentTest.cost = await Cost.new(this.currentTest.zapcoord.address);
        await this.currentTest.zapcoord.updateContract('CURRENT_COST', this.currentTest.cost.address);

        this.currentTest.bondage = await Bondage.new(this.currentTest.zapcoord.address);
        await this.currentTest.zapcoord.updateContract('BONDAGE', this.currentTest.bondage.address);

        this.currentTest.dispatch = await Dispatch.new(this.currentTest.zapcoord.address);
        await this.currentTest.zapcoord.updateContract('DISPATCH', this.currentTest.dispatch.address);

        await this.currentTest.zapcoord.updateAllDependencies();

        this.currentTest.MPOStorage = await MPOStorage.new();
        this.currentTest.MPO = await MPO.new(this.currentTest.zapcoord.address, this.currentTest.MPOStorage.address);
        await this.currentTest.MPOStorage.transferOwnership(this.currentTest.MPO.address);

        this.currentTest.subscriber = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
        this.currentTest.subscriber2 = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
    });

    it("MultiPartyOracle_0 - Check that MPO can handle Int responses.", async function() {
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);     

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 
        
        const incomingEvents = this.test.MPO.Incoming({ fromBlock: 0, toBlock: 'latest' });
        incomingEvents.watch((err, res) => { }); 
        

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});

        await this.test.bondage.delegateBond(subAddr, MPOAddr, "Nonproviders", 100, {from: subscriber});       
    
        this.test.MPO.setParams([offchainOwner, offchainOwner2, offchainOwner3], 2);

        await this.test.subscriber.testQuery(MPOAddr, query, "Nonproviders", params)       

        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();
        let inclogs = await incomingEvents.get();

        await expect(isEventReceived(mpologs, "Incoming")).to.be.equal(true);
        // console.log(inclogs);

        function dataHandle(queryString, endpoint, endpointParams, onchainSubscriber){
            return "Hello World"
        }
        var tmp=[6400,6500,7000]
        for(let i in inclogs){
            if(accounts.includes(inclogs[i].args.provider)){
                
                await this.test.MPO.callback(inclogs[i].args.id,[tmp[i]],
                  {from: inclogs[i].args.provider});   
                }

        }
        
        let sublogs = await subscriberEvents.get();
        await expect(isEventReceived(sublogs, "ResultInt")).to.be.equal(true);
        for(let i in sublogs){
            if(sublogs[i].event == "ResultInt"){
                
                let result = sublogs[i].args["responses"][0]
                console.log(result)
                // Insert data handling here
                await expect(String(result)).to.be.equal(String(6450))
                
                }

        }
        
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();

    });

it("MultiPartyOracle_1 - Check that MPO can handle threshold not being met.", async function() {
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);     

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 
        
        const incomingEvents = this.test.MPO.Incoming({ fromBlock: 0, toBlock: 'latest' });
        incomingEvents.watch((err, res) => { }); 
        

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});

        await this.test.bondage.delegateBond(subAddr, MPOAddr, "Nonproviders", 100, {from: subscriber});       
    
        this.test.MPO.setParams([offchainOwner, offchainOwner2, offchainOwner3], 3);

        await this.test.subscriber.testQuery(MPOAddr, query, "Nonproviders", params)       

        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();
        let inclogs = await incomingEvents.get();

        await expect(isEventReceived(mpologs, "Incoming")).to.be.equal(true);
        // console.log(inclogs);

        function dataHandle(queryString, endpoint, endpointParams, onchainSubscriber){
            return "Hello World"
        }
        var tmp=[6400,6500,7000]
        for(let i in inclogs){
            if(accounts.includes(inclogs[i].args.provider)){
                
                await this.test.MPO.callback(inclogs[i].args.id,[tmp[i]],
                  {from: inclogs[i].args.provider});   
                }

        }
        
        let sublogs = await subscriberEvents.get();
        await expect(isEventReceived(sublogs, "ResultInt")).to.be.equal(false);
        for(let i in sublogs){
            if(sublogs[i].event == "ResultInt"){
                
                let result = sublogs[i].args["responses"][0]
                console.log(result)
                // Insert data handling here
                await expect(String(result)).to.be.equal(String(6450))
                
                }

        }
        
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();

    });

});