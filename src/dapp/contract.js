import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    getConfig() {
        return this.config;
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    getFlights(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getFlights()
            .send({from: self.owner},callback);
    }

    fetchFlightStatus(flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: timestamp
        };
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(flight, timestamp, value, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: timestamp
        };
        self.flightSuretyApp.methods
            .buyInsurance(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner, value: value}, (error, result) => {
                callback(error, payload);
            });
    }

    registerFlight(flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            name: flight,
            timestamp: timestamp
        };
        self.flightSuretyApp.methods
            .registerFlight(payload.name, payload.timestamp, payload.airline)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    authorizeContract(address, callback) {
        let self = this;
        let payload = {
            address: address
        };
        self.flightSuretyData.methods
            .authorizeCaller(payload.address)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}