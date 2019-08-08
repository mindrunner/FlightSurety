import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network) {
        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.config.url.replace('http', 'ws')));
        // this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress, {
            gas: 4712388,
            gasPrice: 100000000000
        });
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress, 2);
        this.airlines = [];
        this.passengers = [];
        // this.owner = '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';
        this.owner = null;
    }

    async initialize() {
        console.log("initializing");
        await this.web3.eth.getAccounts(async (error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            // await this.flightSuretyData.events.allEvents({
            //     fromBlock: 0
            // }, function (error, event) {
            //     if (error) console.log(error);
            //     console.log(event);
            // });
            //
            // await this.flightSuretyApp.events.allEvents({
            //     fromBlock: 0
            // }, function (error, event) {
            //     if (error) console.log(error);
            //     console.log(event);
            // });

            await this.flightSuretyApp.events.allEvents({ fromBlock: 'latest' })
                .on('data', console.log)
                .on('changed', console.log)
                .on('error', console.log);

            await this.flightSuretyData.events.allEvents({ fromBlock: 'latest' })
                .on('data', console.log)
                .on('changed', console.log)
                .on('error', console.log);

            // this.flightSuretyApp.events.OracleRequest({
            //     fromBlock: 0
            // }, (error, event) => {
            //     if (error) console.log(error);
            //     console.log(event);
            // });
            //
            // this.flightSuretyData.events.InsureeCredited({
            //     fromBlock: 0
            // }, async (error, event) => {
            //     if (error) console.log(error);
            //     console.log("%s Credit for %s, new value %d", event.returnValues.credit, event.returnValues.insuree, event.returnValues.total);
            // });
        });
    }

    getConfig() {
        return this.config;
    }

    async isOperational() {
        let self = this;
        return await self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner, gas: 4712388, gasPrice: 100000000000});
    }

    async getFlights() {
        let self = this;
        return await self.flightSuretyData.methods
            .getFlights()
            .call({from: self.owner});
    }

    async fetchFlightStatus(flight, timestamp) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: timestamp
        };
        return await self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .call({from: self.owner});
    }

    async buyInsurance(flight, timestamp, value) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: timestamp
        };
        return await self.flightSuretyApp.methods
            .buyInsurance(payload.flight, payload.timestamp, payload.airline)
            .send({from: self.owner, value: value, gas: 4712388, gasPrice: 100000000000});
    }

    async registerFlight(flight, timestamp) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            name: flight,
            timestamp: timestamp
        };
        return await self.flightSuretyApp.methods
            .registerFlight(payload.name, payload.timestamp, payload.airline)
            .send({from: self.owner, gas: 4712388, gasPrice: 100000000000});
    }

    async authorizeContract(address) {
        let self = this;
        let payload = {
            address: address
        };
        return await self.flightSuretyData.methods
            .authorizeCaller(payload.address)
            .send({from: self.owner});
    }
}