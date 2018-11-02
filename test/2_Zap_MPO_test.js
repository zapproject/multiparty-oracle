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
const nullAddr = "0x0000000000000000000000000000000000000000";
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
    const subscriber2 =accounts[2];
    const provider = accounts[3];
    const offchainOwner = accounts[4];
    const offchainOwner2 = accounts[5];
    const offchainOwner3 = accounts[6];
    const offchainSubscriber = accounts[7];

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

    it("MULTIPARTY ORACLE_0 - Check that MPO can make queries to multple Offchain Providers", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);
            
            await this.test.registry.initiateProvider(
                23456,
                "OffchainProvider",
                {from: offchainOwner});

            await this.test.registry.initiateProviderCurve(
                "Hello?",
                [2,2,2,1000],
                nullAddr,
                {from: offchainOwner});
            await this.test.registry.initiateProvider(
                23456,
                "OffchainProvider2",
                {from: offchainOwner2});

            await this.test.registry.initiateProviderCurve(
                "Hello?",
                [2,2,2,1000],
                nullAddr,
                {from: offchainOwner2});
            await this.test.registry.initiateProvider(
                23456,
                "OffchainProvider3",
                {from: offchainOwner3});

            await this.test.registry.initiateProviderCurve(
                "Hello?",
                [2,2,2,1000],
                nullAddr,
                {from: offchainOwner3});

        
        
        

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 

        // // watch events
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
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner2, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner3, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([offchainOwner, offchainOwner2, offchainOwner3], 2);

        // //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)

        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(dislogs, "Incoming")).to.be.equal(true);
        console.log(dislogs);
        for(let i in dislogs) console.log(dislogs[i].args["id"]);
        await this.test.dispatch.respond1(dislogs[0].args["id"], "Hello World", {from: offchainOwner});
        await this.test.dispatch.respond1(dislogs[1].args["id"], "Hello World", {from: offchainOwner2});
        await this.test.dispatch.respond1(dislogs[2].args["id"], "Hello World", {from: offchainOwner3});

        let sublogs = await subscriberEvents.get();
        console.log(sublogs)
        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        // var result = sublogs[0].args["response1"]
        for(let i in sublogs){
            if(sublogs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result = sublogs[i].args["response1"]
                // Insert data handling here
                for(let i in sublogs){
            if(sublogs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result = sublogs[i].args["response1"]
                // Insert data handling here
                await expect(result).to.be.equal("Hello World")
                
                }

        }
                
                }

        }
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_1 - Check that MPO can query multiple Onchain Providers", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider2.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 2);

        //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec2, params)

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(sublogs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        var result = sublogs[0].args["response1"]
        for(let i in sublogs){
            if(sublogs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result = sublogs[i].args["response1"]
                // Insert data handling here
                await expect(result).to.be.equal("Hello World")
                
                }

        }

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


    it("MULTIPARTY ORACLE_2 - Check if offchain subscriber can still make queries to MPO", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, offchainSubscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider2.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

        var MPOAddr = this.test.MPO.address;
 
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

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: offchainSubscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});

        await this.test.bondage.delegateBond(offchainSubscriber, MPOAddr, spec2, 100, {from: offchainSubscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 2);

        //client queries MPO through dispatch
        await this.test.dispatch.query(MPOAddr, query, spec2, params, {from: offchainSubscriber});

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(dislogs);

        await expect(isEventReceived(dislogs, "OffchainResult1")).to.be.equal(true);
        // var result = dislogs[dislogs.length - 1].args["response1"]
        // await expect(result).to.be.equal("Hello World")
         for(let i in dislogs){
            if(dislogs[i].event == "OffchainResult1"){
                // console.log(sublogs[i])
                let result = dislogs[i].args["response1"]
                // Insert data handling here
                await expect(result).to.be.equal("Hello World")
                
                }

        }
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


    it("MULTIPARTY ORACLE_3 - Check that the following MPO can query multiple Onchain Providers through dispatch", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider2.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);


        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec2, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 2);

        //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec2, params)
        await this.test.subscriber2.testQuery(MPOAddr, query, spec2, params)

        let sublogs = await subscriberEvents.get();
        let sub2logs = await subscriber2Events.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(mpologs, "Result1")).to.be.equal(true);

        console.log(sublogs);
        console.log(sub2logs);

        
        for(let i in sublogs){
            if(sublogs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result = sublogs[i].args["response1"]
                // Insert data handling here
                await expect(result).to.be.equal("Hello World")
                
                }

        }
         for(let i in sub2logs){
            if(sub2logs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result2 = sub2logs[i].args["response1"]
                // Insert data handling here
                await expect(result2).to.be.equal("Hello World")
                
                }

        }
        
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_4 - Check that Multiparty Oracle emits no response if threshold is not met.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider2.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec2, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 3);

        await this.test.subscriber.testQuery(MPOAddr, query, spec2, params)
        await this.test.subscriber2.testQuery(MPOAddr, query, spec2, params)

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

    it("MULTIPARTY ORACLE_5 - Check to see what happens if Onchain providers send responses after queryid has been met", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Reverse", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 2);
        await this.test.subscriber.testQuery(MPOAddr, query, spec2, params);

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(mpologs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        
        var result = sublogs[0].args["response1"];
        for(let i in sublogs){
            if(sublogs[i].event == "Result1"){
                // console.log(sublogs[i])
                let result = sublogs[i].args["response1"]
                // Insert data handling here
                await expect(result).to.be.equal("Hello World")
                
                }

        };
        
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_6 - Should revert if number of providers === 0.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        await expect(this.test.MPO.setParams([], this.test.subscriber.address, 2)).to.be.eventually.rejectedWith(EVMRevert);;

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_7 - Revert if Threshold is 0", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        //await this.test.bondage.delegateBond(subAddr2, MPOAddr, spec1, 100, {from: subscriber2});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        await expect(this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 0)).to.be.eventually.rejectedWith(EVMRevert);;
        await expect(this.test.subscriber.testQuery(MPOAddr, query, spec2, params)).to.be.eventually.rejectedWith(EVMRevert);

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_8 - Revert if Threshold is greater than number of responders", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        await expect(this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 4)).to.be.eventually.rejectedWith(EVMRevert);
        await expect(this.test.subscriber.testQuery(MPOAddr, query, spec2, params)).to.be.eventually.rejectedWith(EVMRevert);

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });
    it("MULTIPARTY ORACLE_9 - Revert if no providers", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        
        
        

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 
    
        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});        
        //eventually the MPO will have to bond to multiple providers through a FOR loop

        await expect(this.test.MPO.setParams([], 4)).to.be.eventually.rejectedWith(EVMRevert);
        await expect(this.test.subscriber.testQuery(MPOAddr, query, spec2, params)).to.be.eventually.rejectedWith(EVMRevert); 

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


    it("MULTIPARTY ORACLE_10 - Check that client can query multiple endpoints of onchain providers.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address,false);
        this.test.p2 = await Provider.new(this.test.registry.address,false);
        this.test.p3 = await Provider.new(this.test.registry.address,false);

        
        
        

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

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});
        
        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});


        await this.test.bondage.delegateBond(MPOAddr, p1Addr, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p2Addr, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Reverse", 100, {from: provider});

        this.test.MPO.setParams([p1Addr, p2Addr, p3Addr], 2);

        await this.test.subscriber.testQuery(MPOAddr, query2, spec2, ["Test"]);

        let sublogs = await subscriberEvents.get();
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        console.log(mpologs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);

        var result = sublogs[0].args["response1"];
        await expect(result).to.be.equal("tseT");

        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_11 - Check that MPO can make queries to multple Offchain Providers", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, provider);
            
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider",
            {from: offchainOwner});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner});
        await this.test.registry.initiateProviderCurve(
            "Reverse",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner});
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider2",
            {from: offchainOwner2});
        await this.test.registry.initiateProviderCurve(
            "Reverse",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner2});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner2});
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider3",
            {from: offchainOwner3});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner3});
        await this.test.registry.initiateProviderCurve(
            "Reverse",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner3});

        
        
        

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 

        // // watch events
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
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner2, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner3, "Hello?", 100, {from: provider});

        await this.test.bondage.delegateBond(MPOAddr, offchainOwner, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner2, "Reverse", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner3, "Reverse", 100, {from: provider});

        this.test.MPO.setParams([offchainOwner, offchainOwner2, offchainOwner3], 2);

        // //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)
        await this.test.subscriber.testQuery(MPOAddr, query2, spec1, params)

        
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(dislogs, "Incoming")).to.be.equal(true);
        console.log(dislogs);

        await this.test.dispatch.respond1(dislogs[0].args["id"], "Hello World", {from: offchainOwner});
        await this.test.dispatch.respond1(dislogs[1].args["id"], "Goodbye World", {from: offchainOwner2});
        await this.test.dispatch.respond1(dislogs[2].args["id"], "Hello World", {from: offchainOwner3});


        await this.test.dispatch.respond1(dislogs[3].args["id"], "reverse", {from: offchainOwner});
        await this.test.dispatch.respond1(dislogs[4].args["id"], "2marap", {from: offchainOwner2});
        await this.test.dispatch.respond1(dislogs[5].args["id"], "2marap", {from: offchainOwner3});

        // console.log(sublogs);
        let sublogs = await subscriberEvents.get();
        console.log(sublogs)
        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        var results = [];
        results.push(sublogs[0].args["response1"]);
        results.push(sublogs[1].args["response1"]);

        console.log(results);
        await expect(results).to.include( '2marap','Hello World');


        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("MULTIPARTY ORACLE_12 - Check that 2 separate clients can make queries to MultiParty Oracle.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);
            
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider",
            {from: offchainOwner});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner});

        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider2",
            nullAddr,
            {from: offchainOwner2});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner2});
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider3",
            nullAddr,
            {from: offchainOwner3});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner3});

        
        
        

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 
        var sub2Addr = this.test.subscriber2.address;

        // // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const subscriber2Events = this.test.subscriber2.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriber2Events.watch((err, res) => { });

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber2});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});


        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(sub2Addr, MPOAddr, spec1, 100, {from: subscriber2});        

        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner2, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner3, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([offchainOwner, offchainOwner2, offchainOwner3], 2);

        // //client queries MPO through dispatch
        await this.test.subscriber.testQuery(MPOAddr, query, spec1, params)
        await this.test.subscriber2.testQuery(MPOAddr, query, spec1, params)

        
        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        await expect(isEventReceived(dislogs, "Incoming")).to.be.equal(true);

        console.log(dislogs);
        
        for(let i in dislogs) console.log(dislogs[i].args["id"]);
        await this.test.dispatch.respond1(dislogs[0].args["id"], "Hello World", {from: offchainOwner});
        
        await this.test.dispatch.respond1(dislogs[3].args["id"], "Hello World2", {from: offchainOwner})
        await this.test.dispatch.respond1(dislogs[4].args["id"], "Goodbye World2", {from: offchainOwner2});
        await this.test.dispatch.respond1(dislogs[5].args["id"], "Hello World2", {from: offchainOwner3});
        
        await this.test.dispatch.respond1(dislogs[1].args["id"], "Goodbye World", {from: offchainOwner2});
        await this.test.dispatch.respond1(dislogs[2].args["id"], "Hello World", {from: offchainOwner3});
        

        // console.log(sublogs);
        let sublogs = await subscriberEvents.get();
        let sub2logs = await subscriber2Events.get();
        
        console.log(sublogs)
        console.log(sub2logs);

        await expect(isEventReceived(sublogs, "Result1")).to.be.equal(true);
        var results = [];
        results.push(sublogs[0].args["response1"]);
        results.push(sub2logs[0].args["response1"]);

        console.log(results);
        await expect(results).to.include( 'Hello World','Hello World2');


        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
        subscriber2Events.stopWatching();
    });

    it("MULTIPARTY ORACLE_13 - Will revert if the Multiparty Oracle queries offchain providers using the onchain providers call.", async function () {
        //suscribe Client to MPO
        await prepareTokens.call(this.test, subscriber);
        //await prepareTokens.call(this.test, subscriber2);
        await prepareTokens.call(this.test, provider);
            
        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider",
            {from: offchainOwner});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            {from: offchainOwner});

        await this.test.registry.initiateProvider(
            23456,
            "OffchainProvider2",
            {from: offchainOwner2});

        await this.test.registry.initiateProviderCurve(
            "Hello?",
            [2,2,2,1000],
            nullAddr,
            nullAddr,
            {from: offchainOwner2});

        
        
        

        this.test.p3 = await Provider.new(this.test.registry.address,false);

        var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.subscriber.address; 
        var p3Addr = this.test.p3.address;

        // // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});

        await this.test.bondage.delegateBond(subAddr, MPOAddr, spec2, 100, {from: subscriber});

        //eventually the MPO will have to bond to multiple providers through a FOR loop
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, offchainOwner2, "Hello?", 100, {from: provider});
        await this.test.bondage.delegateBond(MPOAddr, p3Addr, "Hello?", 100, {from: provider});

        this.test.MPO.setParams([offchainOwner, offchainOwner2], 2);

        let mpologs = await OracleEvents.get();
        let dislogs = await dispatchEvents.get();

        // //client queries MPO through dispatch
        await expect(this.test.subscriber.testQuery(MPOAddr, query, spec2, params)).to.be.eventually.rejectedWith(EVMRevert);
        
        OracleEvents.stopWatching();
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


}); 
