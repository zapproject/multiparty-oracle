const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require("./helpers/utils");
const EVMRevert = require("./helpers/EVMRevert");

const Dispatch = artifacts.require("Dispatch");
const DispatchStorage = artifacts.require("DispatchStorage");
const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const ZapToken = artifacts.require("ZapToken");
const Cost = artifacts.require("CurrentCost");
const Subscriber = artifacts.require("TestClient");
const Provider = artifacts.require("TestProvider");
const Provider2 = artifacts.require("TestProvider2");
// const ansi = require('ansicolor').nice;

// const Subscriber = artifacts.require("Subscriber");

const MPO = artifacts.require("MultiPartyOracle");
const MPO2 = artifacts.require("MPO2");

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
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);
        this.currentTest.token = await ZapToken.new();

        this.currentTest.cost = await Cost.new(this.currentTest.registry.address);
        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

        this.currentTest.dispStor = await DispatchStorage.new();
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.dispStor.address, this.currentTest.bondage.address);
        await this.currentTest.dispStor.transferOwnership(this.currentTest.dispatch.address);
        this.currentTest.subscriber = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
        this.currentTest.subscriber2 = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
    
        this.currentTest.MPOStorage = await MPOStorage.new();
        this.currentTest.MPO = await MPO2.new(this.currentTest.registry.address, this.currentTest.dispatch.address, this.currentTest.MPOStorage.address);
        await this.currentTest.MPOStorage.transferOwnership(this.currentTest.MPO.address);
    });

    it("MultiPartyOracle_0 - Check that MPO can emit an incoming event.", async function() {
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
        for(let i in inclogs){
            if(accounts.includes(inclogs[i].args.provider)){
                console.log(inclogs[i].args)
                // Insert data handling here
                await this.test.MPO.callback(inclogs[i].args.id,"Hello","World",
                  {from: inclogs[i].args.provider});   
                }

        }
        let sublogs = await subscriberEvents.get();
        //console.log(sublogs)
        await expect(isEventReceived(sublogs, "Result2")).to.be.equal(true);
        var result = sublogs[0].args["response1"]
        await expect(result).to.be.equal("Hello")
        result = sublogs[0].args["response2"]
        await expect(result).to.be.equal("World")
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();

    });

});