// Version: 2025.12.09
// Status: Draft

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Config

const config = {

    apiUrlBase: 'https://api.trtn.com/triton/api/v1/',
    apiToken: 'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJUcml0b24iLCJzdWIiOiJXRUJBRE1JTiIsImlhdCI6MTc2NDE0NTE3OCwic3lzdGVtX3Rva2VuIjp0cnVlfQ.zpSVrFW8weF9upyAYr07-r3ZX8dbc7_v1GIMm5nQlFM', // DEV TOKEN, 2025.12.09

    updatePrice: price => {
        if (!!Number(price)) {
            price = price * 115 / 100; // add 15%
            price = Math.round(price/10) * 10; // round by 10
        }
        return price;
    },

};

config.outputColumns = [

    // Location

    {
        key:   'port',
        label: 'Port',
    },
    {
        key:   'portName',
        label: 'Port Name',
    },
    {
        key:   'depot',
        label: 'Depot',
    },
    {
        key:   'depotName',
        label: 'Depot Name',
    },

    // Product

    {
        key:   'equipmentName',
        label: 'Product',
    },
    {
        key:   'categoryName',
        label: 'Category',
    },
//    {
//        key:   'equipmentOptions',
//        label: 'Options',
//        getValue: rowData => {
//            const list = rowData['equipmentOptions'];
//            if (list.length) {
//                return list.join(', ');
//            } else {
//                return '-';
//            }
//        },
//    },

    // Order details

    {
        key:   'available',
        label: 'Available',
    },
    {
        key:   'price',
        label: 'Price',
        getValue: rowData => {
            const showPrice = config.updatePrice(rowData['price']);
            if (!!Number(showPrice)) {
                return `${showPrice} ${rowData['currency']}`;
            } else {
                return '-'; // Not available
            }
        },
    },
    {
        key:   'action',
        label: '',
    },
];


//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Fetchers

async function fetchDataInventory(searchQuery = {}) {

    // prepare request
    const query = new URLSearchParams(searchQuery);
    const url = `${config.apiUrlBase}inventory?${query}`;
    const method = 'GET';
    const headers = {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${config.apiToken}`
    }

    // fetch data
    let result = [];
    try {

        const response = await fetch(url, {method, headers});
        if (response.ok) {
            result = await response.json();
        }

    } catch (error) {
        console.error(error.message);
    };

    // finish
    return result;
};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Controllers

async function runSearch({DOM}) {

    // start
    setLoadingEnabled(DOM);

    // data
    const searchQuery = readFormValues(DOM);
    const result = await fetchDataInventory(searchQuery);

    // render
    if (result) {
        renderOutputTable(DOM, result);
    };

    // finish
    setLoadingDisabled(DOM);
};


//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ UI

function setLoadingEnabled({GeneralWrap}) {
    GeneralWrap.classList.add('isLoading');
};
function setLoadingDisabled({GeneralWrap}) {
    GeneralWrap.classList.remove('isLoading');
};

function readFormValues(DOM) {
    return {
        'country':  DOM['value-country'].value || 'CA', // required
        'currency': DOM['value-currency'].value || '',
    };
};

function startUI(DOM) {

    // main form action
    const {ButtonRunSearch} = DOM;
    ButtonRunSearch.addEventListener(
        'click', event => {
            runSearch({DOM});
        }
    );

};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ UI Render

function renderOutputTable(
    {OutputTable},
    data = []
) {
    const fragment = document.createDocumentFragment();
    const table    = document.createElement('TABLE');
    const thead    = document.createElement('THEAD');
    const tbody    = document.createElement('TBODY');
    const messageEmpty = 'Nothing found';

    // table head

    thead.appendChild( makeRowCaption() );

    // table content

    if (data && data.length) {
        data.forEach(item => {
            tbody.appendChild( makeRowValues(item) );
        });
    } else {
        tbody.appendChild( makeRowMessage(messageEmpty) );
    }

    // render procedure

    table.appendChild(thead);
    table.appendChild(tbody);
    fragment.appendChild(table);
    OutputTable.replaceChildren(fragment);

    // finish render
    return table;
};

function makeRowCaption() {
    const row = document.createElement('TR');
    config.outputColumns.forEach(column => {
        const cell = document.createElement('TH');
        cell.classList.add(`valueType-${column.key}`);
        cell.textContent = column.label;
        row.appendChild(cell);
    });
    return row;
};
function makeRowValues(item = {}) {
    const row = document.createElement('TR');
    config.outputColumns.forEach(column => {
        const key  = column.key;
        const cell = document.createElement('TD');
        cell.classList.add(`valueType-${key}`);
        if (item[key] && typeof column.getValue === 'function') {
            cell.innerHTML = column.getValue(item);
        } else if (key === 'action') {
            cell.appendChild( makeRequestButton(item) );
        } else {
            cell.textContent = item[key] || '-';
        }
        row.appendChild(cell);
    });
    return row;
};
function makeRowMessage(message = '') {
    const row = document.createElement('TR');
    const cell = document.createElement('TD');
    cell.setAttribute('colspan', config.outputColumns.length);
    cell.classList.add('row-message');
    cell.innerHTML = message;
    row.appendChild(cell);
    return row;
};
function makeRequestButton(item = {}) {
    const button = document.createElement('button');
    button.id = `row-action-${item.id}`;
    button.classList.add('row-action');
    button.dataset.id = item.id;
    button.innerHTML = 'Request';
    return button;
};