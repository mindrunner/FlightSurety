const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');
const INITIAL_FUND = web3.utils.toWei('10', "ether");

contract('Flight Surety Tests', async (accounts) => {

    let config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        await config.flightSuretyApp.sendTransaction({from: config.firstAirline, value: INITIAL_FUND});
        await config.flightSuretyApp.registerAirline('Root Air', config.firstAirline, {from: config.owner});
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {from: config.testAddresses[2]});
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        } catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        let newAirline = accounts[2];
        let failAirline = accounts[99];
        try {
            await config.flightSuretyApp.registerAirline("My Airline", newAirline, {from: config.firstAirline});
        } catch (e) {

        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        assert.equal(result, true, "Airline should be registered");
        result = await config.flightSuretyData.isAirlineFunded.call(newAirline);
        assert.equal(result, false, "Airline should not be funded");
        try {
            await config.flightSuretyApp.registerAirline("My Airline", failAirline, {from: newAirline});
        } catch (e) {
        }
        result = await config.flightSuretyData.isAirlineRegistered.call(failAirline);
        assert.equal(result, false, "Unfunded airline should not be able to register new airline");
    });

    it("First airline is registered when contract is deployed", async () => {
        let result = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
        assert.equal(result, true, "First Airline should always be registered");
    });

    it("Only existing airline may register a new airline until there are at least four airlines registered", async () => {
        const account_offset = 4; // start with 3 because  1 and 2 are already in use (use clean address)
        const max_airlines = 2; // four minus two which are already registered

        for (let i = 0; i < max_airlines; ++i) {
            // let count = BigNumber(await config.flightSuretyData.getAirlineCount.call());
            // console.log("registered airlines: ", count);
            try {
                await config.flightSuretyApp.sendTransaction({from: accounts[i + account_offset], value: INITIAL_FUND});
                await config.flightSuretyApp.registerAirline("My Airline", accounts[i + account_offset], {from: config.firstAirline});
            } catch (e) {
                console.log(e)
            }
            let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[i + account_offset]);
            assert.equal(result, i < max_airlines, "Airline should not be able to register another airline until there are at least four airlines registered");
        }
    });

    it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {
        const account_offset = 6; // account_offset + max_airlines of previous test (aligned)
        const vote_offset = 4; // account_offset of previous test
        const max_airlines = 10;

        for (let i = 0; i < max_airlines; ++i) {
            await config.flightSuretyApp.sendTransaction({from: accounts[i + account_offset], value: INITIAL_FUND});
            let count = BigNumber(await config.flightSuretyData.getAirlineCount.call());
            // console.log("registered airlines: ", count);
            let votes_needed = Math.ceil(count / 2);
            for (let k = 0; k < votes_needed; ++k) {
                try {
                    // console.log("airline ", k+vote_offset, " registers airline ", i+account_offset);
                    await config.flightSuretyApp.registerAirline("My Airline", accounts[i + account_offset], {from: accounts[k + vote_offset]});
                } catch (e) {
                    console.log(e)
                }
                let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[i + account_offset]);
                // console.log("vote ", k + 1);
                // if(result) {
                //     console.log("airline accepted, now", BigNumber(await config.flightSuretyData.getAirlineCount.call()));
                // }
                assert.equal(result, k === (votes_needed - 1), "multi-party consensus failed");
            }
        }
    });

    it("Airline can be registered, but does not participate in contract until it submits funding of 10 ether", async () => {
        //see previous tests
        let unfunded_airline = accounts[2];
        let new_airline = accounts[97];
        let funded = await config.flightSuretyData.isAirlineFunded.call(unfunded_airline);
        assert.equal(funded, false, "Airline should be unfunded");
        let pass;
        try {
            await config.flightSuretyApp.registerAirline("New airline", new_airline, {from: unfunded_airline});
            pass = true;
        } catch (e) {
            pass = false;
        }
        assert.equal(pass, false, "Airline should not be able to participate without funding");

    });

    it("Passengers may pay up to 1 ether for purchasing flight insurance.", async () => {
    });

    it("If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid", async () => {
    });

    it("Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout", async () => {
    });

    it("Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory", async () => {
    });

    it("Server will loop through all registered oracles, identify those oracles for which the OracleRequest event applies, and respond by calling into FlightSuretyApp contract with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)", async () => {

    });

});
