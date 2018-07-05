const assert = require("assert");
const contracts = require("./ContractsData");
const web3 = contracts.web3;

class Provider{
    constructor({owner}){
        assert(owner,"owner address is required");
        this.owner = owner;
    }

    async  create({pubkey, title,endpoint,params}){
        try {
            assert(Array.isArray(params),"params need to be an array");
            if(params.length >0) {
                for (let i in params) {
                    params[i] = web3.utils.utf8ToHex(params[i])
                }
            }
            let provider = await contracts.zapRegistry.methods.initiateProvider(
                new web3.utils.BN(pubkey),
                web3.utils.utf8ToHex(title),
                web3.utils.utf8ToHex(endpoint),
                params)
                .send({from: this.owner, gas: 6000000});
            console.log("provider : ", provider)
            return provider
        }catch(err){console.error(err)}
    }

    async  initCurve({endpoint,constants,parts,dividers}){
        try{
            assert((constants instanceof Array
                && parts instanceof Array
                && dividers instanceof Array),
                "curve's arguments need to be array");
            assert(endpoint&&constants.length>0
                && parts.length>0
                && dividers.length>0,
                "cant init empty curve args");
            let convertedConstants = constants.map(item=>{return web3.utils.toHex(item)});
            let convertedParts = parts.map(item=> {return web3.utils.toHex(item)});
            let convertedDividers = dividers.map(item=>{ return web3.utils.toHex(item)});
            console.log("converted : ",convertedConstants);
            let success = await contracts.zapRegistry.methods.initiateProviderCurve(
                web3.utils.utf8ToHex(endpoint),
                convertedConstants,
                convertedParts,
                convertedDividers).send({from:this.owner, gas: 600000});
            assert(success,"fail to init curve ");
            return success
        }catch(err){
            console.error(err)
            return null
        }
    }

    async getProviderTitle(){
        let title =  await contracts.zapRegistry.methods.getProviderTitle(this.owner).call()
        return web3.utils.hexToUtf8(title)
    }

    async getProviderPubkey(){
        let title =  await contracts.zapRegistry.methods.getProviderPublicKey(this.owner).call()
        return web3.utils.toHex(title)
    }

    async getProviderCurve({endpoint}){
        try{
            let curve = await contracts.zapRegistry.methods.getProviderCurve(
                this.owner,web3.utils.utf8ToHex(endpoint)).call();
            return curve
        }catch(err){
            console.error(err)
            return null
        }
    }

    async isCreated(){
        try{
            let title =  await contracts.zapRegistry.methods.getProviderTitle(this.owner).call();
            title = web3.utils.hexToUtf8(title);
            console.log("title : ", title)
            return title;
        }catch(err){
            console.error("error get isCreated : ", err)
            return false}
    }
    async isCurveInit(endpoint){
        try{
            let init =  await this.getProviderCurve(endpoint);
            //console.log("init :" , init);
            return init
        }catch(err){return false}
    }

    async getZapBound({endpoint}){
        assert(endpoint,"endpoint required");
        let zapBound = await contracts.zapBondage.methods.getZapBound(this.owner,web3.utils.utf8ToHex(endpoint)).call();
        return zapBound;
    }

    async getZapRequired({endpoint,dots}){
        let zapRequired = await contracts.zapBondage.methods.calcZapForDots(this.owner,web3.utils.utf8ToHex(endpoint),web3.utils.toBN(dots)).call();
        return parseInt(zapRequired);
    }

    async calcDotsForZap({endpoint,zapNum}){
        let res =  await contracts.zapBondage.methods.calcBondRate(
            this.owner,
            web3.utils.utf8ToHex(endpoint),
            web3.utils.toBN(zapNum)).call();
        console.log("dot for zap : ", zapNum,res);
        return res
    }


    listenUnubscribeEvent({endpoint,callback}){
        assert(endpoint&&callback,"missing args, require: endpoint, callback");
        let unsubscribeFiler = contracts.zapArbiter.events.DataSubscriptionEnd({
                providerAddress:this.owner,
                endpoint: web3.utilsutf8ToHex(endpoint)
            },
            {fromBlock: 0,
                toBlock: 'latest'
            });
        unsubscribeFiler.watch(callback)

    }


    listenSubscribeEvent({endpoint,callback}){
        assert(endpoint&&callback,"missing args, require: endpoint, callback");
        let subscribeFiler = contracts.zapArbiter.events.DataPurchase({
                providerAddress:this.owner,
                endpoint: web3.utilsutf8ToHex(endpoint)
            },
            {fromBlock: 0,
                toBlock: 'latest'
            });
        subscribeFiler.watch(callback)

    }

    // listenToQueryEvent({subscriber,query,endpoint,fromBlock,callback}){
    //     assert(subscriber&&query&&endpoint&&fromBlock&&callback,
    //         "missing args, require: subscriber,query,endpoint,fromBlock,callback");
    //     let filter = contracts.zapDispatch.events.Incoming(
    //         {provider:this.owner,subscriber,fromBlock},
    //         { fromBlock: fromBlock ? fromBlock : 0, toBlock: 'latest' });
    //     filter.watch((err,event)=> {
    //         if (err) callback(err, null)
    //         let incoming = {
    //             id: event.id,
    //             provider: event.provider,
    //             subscriber: event.subscriber,
    //             query: event.query,
    //             endpoint: web3.utils.hexToUtf8(event.endpoint),
    //             endpointParams: event.endpointParams.map(i => web3.utils.hexToUtf8(i))
    //         };
    //         callback(null, incoming)
    //     });
    // }

    listenToQueryEvent({endpoint,fromBlock,callback}){
        assert(endpoint&&fromBlock&&callback, 
                "missing args, require: endpoint,fromBlock,callback");

        contracts.zapDispatch.events.Incoming({
            filter: { 
                provider:this.owner,
                fromBlock: fromBlock ? fromBlock : 0, 
                toBlock: 'latest'
            }
        }, (err,event)=> {
                if (err) callback(err, null)
                let incoming = {
                    id: event.id,
                    provider: event.provider,
                    // subscriber: event.subscriber,
                    // query: event.query,
                    endpoint: web3.utils.hexToUtf8(event.endpoint),
                    endpointParams: event.endpointParams.map(i => web3.utils.hexToUtf8(i))
                };
                callback(null, incoming)
        })
    }

    getQueryEvent({endpoint,fromBlock,callback}){
        //todo wss to watch instead
        contracts.zapDispatch.getPastEvents('Incoming',{
            provider:this.owner,
            endpoint:web3.utils.utf8ToHex(endpoint),
            fromBlock:fromBlock,
            toBlock:'latest'
        },(err,res)=>{
            if(err) callback(err,null)
            console.log('RES', res);
            if(res.length < 1){
                callback(res, null);
            }
            else {
                let event = res[res.length-1].returnValues
                let incoming = {
                    id: event.id,
                    provider: event.provider,
                    subscriber:event.subscriber,
                    query: event.query,
                    endpoint :web3.utils.hexToUtf8(event.endpoint),
                    endpointParams : event.endpointParams.map(i=>web3.utils.hexToUtf8(i))
                };
                callback(null,incoming)
            } 
        })
    }

    async respond2({id,response1, response2}){
        return await contracts.zapDispatch.methods.respond2(web3.utils.toBN(id),
            web3.utils.utf8ToHex(response1),
            web3.utils.utf8ToHex(response2))
            .send({from:this.owner,gas:6000000});
    }

    async processMessage(error, message){
        console.log("message from dispatch",error, message);
        return message
    }

}

module.exports = Provider
