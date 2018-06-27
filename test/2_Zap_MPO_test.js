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
// const Subscriber = artifacts.require("Subscriber");

const MPOProvider = artifacts.require("MPOProvider");
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

    const tokensForOwner = new BigNumber("5000e18");
    const tokensForSubscriber = new BigNumber("3000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const params = ["param1", "param2"];

    const spec1 = "Hello?";
    const spec2 = "Reverse";
    const spec3 = "Add";
    const spec4 = "Double";


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

        // this.currentTest.p1 = await MPOProvider.new("A");
        // this.currentTest.p2 = await MPOProvider.new("B");
        // this.currentTest.p3 = await MPOProvider.new("A");

    });

    // it("DISPATCH_1 - respond1() - Check that a clien can make query to MPO through dispatch", async function () {
    //     await prepareTokens.call(this.test, subscriber);

    //     //this.test.p1 = await MPOProvider.new("A");
    //     //this.test.p2 = await MPOProvider.new("B");
    //     //this.test.p3 = await MPOProvider.new("A");

    //     // let p1 = this.test.p1.address;
    //     // let p2 = this.test.p2.address;
    //     // let p3 = this.test.p3.address;

    //     this.test.MPOStorage = await MPOStorage.new();
    //     this.test.oracle = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
    //     await this.test.MPOStorage.transferOwnership(this.test.oracle.address);


    //     var oracleAddr = this.test.oracle.address;
    //     //var MPOAddr = this.test.MPO.address;
    //     var subAddr = this.test.subscriber.address; 


    //     // watch events
    //     const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
    //     dispatchEvents.watch((err, res) => { });
    //     const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
    //     subscriberEvents.watch((err, res) => { }); 
    //     const OracleEvents = this.test.oracle.allEvents({ fromBlock: 0, toBlock: 'latest' });
    //     OracleEvents.watch((err, res) => { }); 
    //     await this.test.oracle.setParams( [], this.test.dispatch.address, 1);

    //     // holder: subAddr (holder of dots)
    //     // subscriber: owner of zap
    //     await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
    //     await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 100, {from: subscriber});

    //     // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
    //     await this.test.subscriber.testQuery(oracleAddr, query, spec1, params);

    //     // wait for callback

    //     // GET ALL EVENTS LOG 
    //     let logs = await subscriberEvents.get();
    //     let dlogs = await dispatchEvents.get();
    //     //let mpologs = await MPOEvents.get();
    //     console.log(logs);
    //     console.log(dlogs);
    //     //console.log(mpologs);
    //     await expect(isEventReceived(logs, "Result1")).to.be.equal(true);

    //     // subscriber should have emitted one event
    //     var result = logs[0].args["response1"];
    //     await expect(result).to.be.equal("Hello World");

    //     // STOP WATCHING EVENTS 
    //     dispatchEvents.stopWatching();
    //     subscriberEvents.stopWatching();
    // });

    it("DISPATCH_2 - Check that MPO can make a query to an Onchain Provider through Dispatch", async function () {
        await prepareTokens.call(this.test, provider);

        this.test.p1 = await Provider.new(this.test.registry.address);
        //this.test.p2 = await MPOProvider.new("B");
        //this.test.p3 = await MPOProvider.new("A");

        // let p1 = this.test.p1.address;
        // let p2 = this.test.p2.address;
        // let p3 = this.test.p3.address;

        this.test.MPOStorage = await MPOStorage.new();
        this.test.MPO = await MPO.new(this.test.registry.address, this.test.dispatch.address, this.test.MPOStorage.address);
        await this.test.MPOStorage.transferOwnership(this.test.MPO.address);


        var oracleAddr = this.test.p1.address;
        //var MPOAddr = this.test.MPO.address;
        var subAddr = this.test.MPO.address; 

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        
        const subscriberEvents = this.test.MPO.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { }); 

        const OracleEvents = this.test.p1.allEvents({ fromBlock: 0, toBlock: 'latest' });
        OracleEvents.watch((err, res) => { }); 
        //await this.test.oracle.setParams( [], this.test.dispatch.address, 1);

        // holder: subAddr (holder of dots)
        // subscriber: owner of zap
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: provider});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 100, {from: provider});
        // const dots = await expect(this.test.bondage.getBoundDots(subAddr, oracleAddr, spec1));
        // console.log("NUMBER OF DOTS = " + JSON.stringify(dots));
        //await expect(this.test.bondage.getBoundDots(subAddr, oracleAddr, spec1).to.equal(100));


        // // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        // //uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber
         await this.test.MPO.testQuery(oracleAddr, query, spec1, params);
        // await this.test.dispatch.query(subAddr, query, spec1, params, true, true);
        // // // wait for callback

        // GET ALL EVENTS LOG 
        let logs = await subscriberEvents.get();
        // let dlogs = await dispatchEvents.get();
        // let mpologs = await MPOEvents.get();

        console.log(logs);
        // console.log(dlogs);
        // console.log(mpologs);

        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        // // subscriber should have emitted one event
        var result = logs[0].args["response1"];
        console.log("Result: " + result);
        await expect(result).to.be.equal("Hello World");

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


}); 
