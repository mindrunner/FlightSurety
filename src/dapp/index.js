
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;
    let flights = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log("isOperationalCallback");
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        contract.getFlights((error, result) => {
            console.log("getFlightsCallback");
            console.log(error,result);
            flights = result;
            console.log(JSON.stringify(result));
        });

        DOM.elid('auth-addr').value = contract.getConfig().appAddress;

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('text-flight').value;
            let time = DOM.elid('num-timestamp').value;
            // Write transaction
            contract.fetchFlightStatus(flight, time, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        });
        // User-submitted transaction
        DOM.elid('submit-insurance').addEventListener('click', () => {
            let value = DOM.elid('num-value').value;
            let timestamp = DOM.elid('num-timestamp').value;
            let flight = DOM.elid('text-flight').value;
            // Write transaction
            contract.buyInsurance(flight, timestamp, value, (error, result) => {
                display('Insurance', 'Buy Insurance', [ { label: 'Insurance', error: error, value: JSON.stringify(result)} ]);
            });
        });

        DOM.elid('register-flight').addEventListener('click', () => {
            let name = DOM.elid('text-flight').value;
            let timestamp = DOM.elid('num-timestamp').value;
            // Write transaction
            contract.registerFlight(name, timestamp, (error, result) => {
                display('Flight', 'Register Flight', [ { label: 'Flight', error: error, value: JSON.stringify(result)} ]);
            });
        });

        DOM.elid('auth').addEventListener('click', () => {
            let address = DOM.elid('auth-addr').value;
            contract.authorizeContract(address, (error, result) => {
                display('Auth', 'AuthorizeContract', [ { label: 'Auth', error: error, value: JSON.stringify(result)} ]);
            });
        })

    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}







