// import EVMRevert from './helpers/EVMRevert';

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
// const Subscriber = artifacts.require("Subscriber");

const MPO = artifacts.require("MultiPartyOracle");
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
    const MPO_Provider = accounts[3];
    const MPO_Provider2 = accounts[4];
    const MPO_Provider3 = accounts[5];
    const subscriber2 =accounts[6];

    const tokensForOwner = new BigNumber("5000e18");
    const tokensForSubscriber = new BigNumber("3000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const params = ["param1", "param2"];

    const spec1 = "Hello?";
    const spec2 = "Reverse";


    const publicKey = 10001;
    const title = "tst";
    const extInfo = [111, 222, 333];

    const piecewiseFunction = { // 2x^2
        constants: [2, 2, 0],
        parts: [0, 1000000000],
        dividers: [1]
    };

    const query = "query";

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);
        this.currentTest.token = await ZapToken.new();
        //this.currentTest.oracle = await Oracle.new(this.currentTest.registry.address);

        this.currentTest.cost = await Cost.new(this.currentTest.registry.address);
        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

        this.currentTest.dispStor = await DispatchStorage.new();
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.dispStor.address, this.currentTest.bondage.address);
        await this.currentTest.dispStor.transferOwnership(this.currentTest.dispatch.address);
        this.currentTest.subscriber = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
        this.currentTest.subscriber2 = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address, this.currentTest.registry.address);
        // this.currentTest.p1 = await MPOProvider.new("A");
        // this.currentTest.p2 = await MPOProvider.new("B");
        // this.currentTest.p3 = await MPOProvider.new("A");

    });


    it("MULTIPARTY ORACLE_1 - Check that the following MPO can query multiple Onchain Providers through dispatch", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        this.test.p2 = await Provider2.new(this.test.registry.address);
        this.test.p3 = await Provider.new(this.test.registry.address);


        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 
        var p1Addr = this.test.p1.address;
        var p2Addr = this.test.p2.address;
        var p3Addr = this.test.p3.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec1, 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], this.test.subscriber.address, 2);

        //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(sublogs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        var result = sublogs[0].args["response1"]
        await expect(result).to.be.equal("Hello World")


        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_2 - Check that the following MPO can query multiple Onchain Providers through dispatch", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        this.test.p2 = await Provider2.new(this.test.registry.address);
        this.test.p3 = await Provider.new(this.test.registry.address);


        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);


        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address;
        var subAddr2 = this.test.subscriber2.address;  
        var p1Addr = this.test.p1.address;
        var p2Addr = this.test.p2.address;
        var p3Addr = this.test.p3.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 
    
        const subscriber2Events = this.test.subscriber2.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber2});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec1, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec1, 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], this.test.subscriber.address, 2);


        // let addr = await this.test.MPOStorage.getClient();
        // console.log("ADDRESS: " + addr);

        //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)
        await this.test.subscriber2.testQuery(MPOAddr, query, spec1, params)

        let sublogs = await subscriberEvents.get();
        let sub2logs = await subscriber2Events.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(mpologs, "Result1")).to.be.equal(true);

        console.log(sublogs);
        console.log(sub2logs);

        var result = sublogs[0].args["response1"]
        await expect(result).to.be.equal("Hello World")
        var result2 = sub2logs[0].args["response1"]
        await expect(result2).to.be.equal("Hello World")

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_3 - Check that Multiparty Oracle emits no response if threshold is not met.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        this.test.p2 = await Provider2.new(this.test.registry.address);
        this.test.p3 = await Provider.new(this.test.registry.address);


        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);


        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address;
        var subAddr2 = this.test.subscriber2.address;  
        var p1Addr = this.test.p1.address;
        var p2Addr = this.test.p2.address;
        var p3Addr = this.test.p3.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 
    
        const subscriber2Events = this.test.subscriber2.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber2});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec1, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec1, 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], this.test.subscriber.address, 3);

        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)
        await this.test.subscriber2.testQuery(MPOAddr, query, spec1, params)

        let sublogs = await subscriberEvents.get();
        let sub2logs = await subscriber2Events.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(mpologs, "Result1")).to.be.equal(false);

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
        subscriber2Events.stopWatching();
    }); 

    it("MULTIPARTY ORACLE_4 - Check that client can make query to differend enpoints on Multiparty Oracle.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        //await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        this.test.p2 = await Provider2.new(this.test.registry.address);
        this.test.p3 = await Provider.new(this.test.registry.address);


        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);


        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address;
        //var subAddr2 = this.test.subscriber2.address;  
        var p1Addr = this.test.p1.address;
        var p2Addr = this.test.p2.address;
        var p3Addr = this.test.p3.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 
    
        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        //await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber2});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        //await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec1, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec1, 100, {from: provider});

        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec2, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec2, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec2, 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], this.test.subscriber.address, 2);

        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params);
        await this.test.subscriber.testQuery(MPOAddr, query, spec2, params);
        //await this.test.subscriber2.testQuery(MPOAddr, this.test.dispatch.address, spec1, params)

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(sublogs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        

        var results = [];
        results.push(sublogs[0].args["response1"]);
        results.push(sublogs[1].args["response1"]);

        console.log(results);
        await expect(results).to.include( 'yreuq','Hello World');

        // await expect(result).to.be.equal("Hello World");
        
        // var result2 = 
        // await expect(result2).to.be.equal("yreuq");

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });   

    it("MULTIPARTY ORACLE_5 - Check to see what happens if Onchain providers send responses after queryid has been met", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        //await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        this.test.p2 = await Provider.new(this.test.registry.address);
        this.test.p3 = await Provider.new(this.test.registry.address);


        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);


        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address;
        //var subAddr2 = this.test.subscriber2.address;  
        var p1Addr = this.test.p1.address;
        var p2Addr = this.test.p2.address;
        var p3Addr = this.test.p3.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 
    
        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        //await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber2});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        //await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec1, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec1, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec1, 100, {from: provider});

        await this.test.bondage.delegateBond(MPOAddr, p1Addr, spec2, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, spec2, 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, spec2, 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], this.test.subscriber.address, 2);

        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params);
        //await this.test.subscriber.testQuery(MPOAddr, query, spec2, params);
        //await this.test.subscriber2.testQuery(MPOAddr, this.test.dispatch.address, spec1, params)

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(mpologs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        
        var result = sublogs[0].args["response1"];
        await expect(result).to.be.equal("Hello World");
        

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

}); 
