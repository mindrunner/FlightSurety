import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

    let result = null;


    let flights = new Map();

    let contract = new Contract('localhost');
    await contract.initialize();


    // contract.web3.eth.subscribe('newBlockHeaders', function (error, blockHeader) {
    //     if (error) console.log(error);
    //     console.log(blockHeader);
    // }).on('data', function (blockHeader) {
    //         // alternatively we can log it here
    // console.log(blockHeader);
    // });

    // Read transaction
    {
        let operational = false;
        let error = null;
        try {
            operational = await contract.isOperational();
        } catch (e) {
            error = e;
        }
        display('Operational Status', 'Check if contract is operational', [{
            label: 'Operational Status',
            error: error,
            value: operational
        }]);
    }

    {
        let error = null;
        let f = [];
        try {
            f = await contract.getFlights();
        } catch (e) {
            error = e;
            console.log(error);
        }

        let y = 0;
        const KEY_NAME = '' + y++;
        const KEY_AIRLINE = '' + y++;
        const KEY_TIMESTAMP = '' + y++;

        for (let i = 0; i < f[KEY_NAME].length; ++i) {
            flights.set(''+i, {
                name: f[KEY_NAME][i],
                airline: f[KEY_AIRLINE][i],
                timestamp: f[KEY_TIMESTAMP][i]
            });
        }

        flights.forEach((flight, key) => {
            DOM.elid('flights-select').appendChild(DOM.option({id: key}, flight.name + " - " + flight.timestamp));
        });
    }

    DOM.elid('auth-addr').value = contract.getConfig().appAddress;

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', async () => {
        // Write transaction

        let key = DOM.elid('flights-select').selectedIndex;
        let flight = flights.get('' + key);

        if(!flight) {
            console.log("Error with key " + key);
            return
        }
        let error = null;
        try {
            await contract.fetchFlightStatus(flight.name, flight.timestamp);
        } catch (e) {
            error = e;
        }
        display('Oracles', 'Trigger oracles', [{
            label: 'Fetch Flight Status',
            error: error,
            value: flight.name + ' ' + flight.timestamp
        }]);
    });

    // User-submitted transaction
    DOM.elid('submit-insurance').addEventListener('click', async () => {
        let value = DOM.elid('num-value').value;
        let key = DOM.elid('flights-select').selectedIndex;
        let flight = flights.get('' + key);

        if(!flight) {
            console.log("Error with key " + key);
            return
        }

        // Write transaction
        let result;
        let error = null;
        try {
            result = await contract.buyInsurance(flight.name, flight.timestamp, value);
        } catch (e) {
            error = e;
        }



        display('Insurance', 'Buy Insurance', [{label: 'Insurance', error: error, value: JSON.stringify(result)}]);
    });

    DOM.elid('register-flight').addEventListener('click', async () => {
        let name = DOM.elid('text-flight').value;
        let timestamp = DOM.elid('num-timestamp').value;
        // Write transaction

        let result;
        let error = null;
        try {
            result = await contract.registerFlight(name, timestamp);
        } catch (e) {
            error = e;
        }

        flights.set(''+flights.size, {
            name: name,
            airline: 0,
            timestamp: timestamp
        });

        display('Flight', 'Register Flight', [{label: 'Flight', error: error, value: JSON.stringify(result)}]);
        DOM.elid('flights-select').appendChild(DOM.option({id: flights.size}, name + " - " + timestamp));

    });

    DOM.elid('auth').addEventListener('click', async () => {
        let address = DOM.elid('auth-addr').value;

        let result;
        let error = null;
        try {
            result = await contract.authorizeContract(address);
        } catch (e) {
            error = e;
        }
        display('Auth', 'AuthorizeContract', [{label: 'Auth', error: error, value: JSON.stringify(result)}]);
    })
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}







