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

config.FilterProductType = [
    { key: 'DV', label: 'Dry Van' },
    { key: 'RF', label: 'Reefer' },
    { key: 'OT', label: 'Open Top' },
    { key: 'FR', label: 'Flat Rack' },
    { key: 'DD', label: 'Double Door' },
];
config.FilterProductSize = [
    { key: '20', label: '20FT' },
    { key: '20HC', label: '20FT High Cube' },
    { key: '40', label: '40FT' },
    { key: '40HC', label: '40FT High Cube' },
    { key: '40PW', label: '40FT Pallet Wide' },
    { key: '45HC', label: '45FT High Cube' },
    { key: '45PW', label: '45FT Pallet Wide' },
    { key: '45HCPW', label: '45FT High Cube Pallet Wide' },
];
config.FilterProductCategory = [
    { key: 'IICX', label: 'IICL New' },
    { key: 'IICA', label: 'IICL Used' },
    { key: 'CWCA', label: 'Cargoworthy (or Roadworthy for chassis)' },
    { key: 'AICU', label: 'As-Is (Ex-Service)' },
];

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

    // Order

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
                return 'N/A'; // Not available
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

function startUI(DOM) {

    // filters

    renderFilterGroup(DOM, 'FilterProductType');
    renderFilterGroup(DOM, 'FilterProductSize');
    renderFilterGroup(DOM, 'FilterProductCategory');

    const {
        MasterFilterProductType,
        MasterFilterProductSize,
        MasterFilterProductCategory,
    } = DOM;

    MasterFilterProductType.addEventListener('change', event => {
        setCheckboxGroupMasterValues('FilterProductType');
    });
    MasterFilterProductSize.addEventListener('change', event => {
        setCheckboxGroupMasterValues('FilterProductSize');
    });
    MasterFilterProductCategory.addEventListener('change', event => {
        setCheckboxGroupMasterValues('FilterProductCategory');
    });

    // main events

    const {
        ButtonRunSearch,
        'value-country': SelectCountry,
    } = DOM;

    SelectCountry.addEventListener('change', event => {
        setActionsDisabledStatus(DOM, !SelectCountry.value)
    });

    ButtonRunSearch.addEventListener('click', event => {
        runSearch({DOM});
    });

    // initial state

    setActionsDisabledStatus(DOM, true);
    console.log('All good!')

};

async function runSearch({DOM}) {

    // start
    setLoadingEnabled(DOM);

    // data
    const searchQuery = readFormValues(DOM);
    const resultRaw = await fetchDataInventory(searchQuery);
    const result = filterFetchedRecords(resultRaw);

    // render
    renderOutputTable(DOM, result);

    // finish
    setLoadingDisabled(DOM);
};

function filterFetchedRecords(records = []) {
    const filterValues = {
        productGroup: getCheckboxGroupValues('FilterProductType'),
        size:         getCheckboxGroupValues('FilterProductSize'),
        baseCategory: getCheckboxGroupValues('FilterProductCategory'),
    };
    const filterEnabled = Object.keys(filterValues).reduce(
        (count, key) => count + filterValues[key].length,
        0
    ) > 0;

    // ALL ARE UNCHECKED same as ALL ARE CHECKED for better usability
    if (!filterEnabled) return records;

    const checkField = (record, key) => {
        if (!filterValues[key].length) return true; // no filtering
        if  (filterValues[key].includes(record[key])) return true;
        else return false;
    };
    const checkRecord = (record) => Object.keys(filterValues).reduce(
        (pass, key) => pass && checkField(record, key)
        , true
    );
    const listReducer = (list, item) => [
        ...list,
        ...(checkRecord(item) ? [item] : [])
    ];

    return [...records].reduce(listReducer, []);
}

function runApplyFilter({DOM}) {
    const filterValues = readFilterValues(DOM);
    const filterEnabled = Object.keys(filterValues).reduce(
        (count, key) => count + filterValues[key].length,
        0
    ) > 0;
    const rows = getRowsForFiltering(DOM);
    if (rows.length && filterEnabled) {
        rows.forEach(row => {
            const pass = compareRowForFiltering(row, filterValues);
            if (pass) console.log('pass', row.dataset['FilterProductType']);
        });
    };


};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Filtering

function getRowsForFiltering({OutputTable}) {
    const tbody = OutputTable.getElementsByTagName('tbody')[0];
    return [...tbody.getElementsByTagName('tr')];
};
function updateRowForFiltering(row, item) {
    row.dataset.id = item.id;
    row.dataset['FilterProductType']     = item.productGroup;
    row.dataset['FilterProductSize']     = item.size;
    row.dataset['FilterProductCategory'] = item.baseCategory;
};
function compareRowForFiltering(row, filter) {
    return Object.keys(filter).reduce(
        (pass, key) => pass || filter[key].includes(row.dataset[key]),
        false
    );
};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ UI

function setLoadingEnabled({GeneralWrap}) {
    GeneralWrap.classList.add('isLoading');
};
function setLoadingDisabled({GeneralWrap}) {
    GeneralWrap.classList.remove('isLoading');
};

function setActionsDisabledStatus(DOM, isDisabled) {
    DOM['ButtonRunSearch'].disabled = isDisabled;
};

function getCheckboxGroupValues(group = '') {
    return config[group].reduce(
        (list, item) => {
            const checkboxId = makeCheckboxId(group, item.key);
            const checkbox = document.getElementById(checkboxId);
            return [
                ...list,
                ...(checkbox && checkbox.checked
                    ? [checkbox.value]
                    : []
                   ),
            ];
        }, []
    );
};

function setCheckboxGroupMasterValues(group = '') {
    const master = document.getElementById(makeCheckboxMasterId(group));
    config[group].forEach(item => {
        const checkboxId = makeCheckboxId(group, item.key);
        const checkbox   = document.getElementById(checkboxId);
        checkbox.checked = master.checked;
    });
    setCheckboxMasterDirtyStatus(group, false);
};

function setCheckboxMasterDirtyStatus(group = '', isDirty = true) {
    const master = document.getElementById(makeCheckboxMasterId(group));
    if (isDirty) master.classList.add('is-dirty');
    else         master.classList.remove('is-dirty');
};

function readFormValues(DOM) {
    return {
        'country':  DOM['value-country'].value || '',
        'currency': DOM['value-currency'].value || '',
    };
};

function DEPECATEDreadFilterValues(DOM) {
    const filterValues = {
        FilterProductType: [],
        FilterProductSize: [],
        FilterProductCategory: [],
    };

    Object.keys(filterValues).forEach(groupKey => {
        config[groupKey].forEach(item => {
            const checkboxId = makeCheckboxId(groupKey, item.key);
            const checkbox = document.getElementById(checkboxId);
            if (checkbox && checkbox.checked && checkbox.value) {
                filterValues[groupKey].push(checkbox.value);
            };
        });
    });

    return filterValues;
};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Render Filter

function renderFilterGroup(DOM, GroupKey = '') {
    config[GroupKey].forEach(item => {
        const {checkbox, label} = makeCheckboxElements(item, GroupKey);
        const wrap = document.createElement('div');
        wrap.classList.add('filter-list-item');
        wrap.appendChild(checkbox);
        wrap.appendChild(label);
        DOM[GroupKey].appendChild(wrap);

        checkbox.addEventListener('change', event => {
            setCheckboxMasterDirtyStatus(GroupKey, true);
        });
    });
};

function makeCheckboxMasterId(groupKey) {
    return `Master${groupKey}`;
};
function makeCheckboxId(groupKey, itemKey) {
    return `filterbox-${groupKey}-${itemKey}`;
};

function makeCheckboxElements(
    item = {},
    groupKey = ''
) {
    const checkbox = document.createElement('input');
    const checkboxId = makeCheckboxId(groupKey, item.key);
    checkbox.setAttribute('type', 'checkbox');
    checkbox.setAttribute('name', checkboxId);
    checkbox.id = checkboxId;
    checkbox.value = item.key;

    const label = document.createElement('label');
    label.setAttribute('for', checkboxId);
    label.innerHTML = item.label;

    return {checkbox, label};
};

//~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Render Table

function renderOutputTable(
    {OutputTable},
    data = []
) {
    const fragment = document.createDocumentFragment();
    const table    = document.createElement('TABLE');
    const thead    = document.createElement('THEAD');
    const tbody    = document.createElement('TBODY');
    const tfoot    = document.createElement('TFOOT');
    const messageEmpty = 'Nothing found';

    // table head

    thead.appendChild( makeRowCaption() );

    // table content

    if (data && data.length) {
        data.forEach(item => {
            tbody.appendChild( makeRowValues(item) );
        });
    } else {
        tfoot.appendChild( makeRowMessage(messageEmpty) );
    }

    // render procedure

    table.appendChild(thead);
    table.appendChild(tbody);
    table.appendChild(tfoot);
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
        if (typeof column.getValue === 'function') {
            cell.innerHTML = column.getValue(item);
        } else if (key === 'action') {
            cell.appendChild( makeRequestButton(item) );
        } else {
            cell.textContent = item[key] || '-';
        }
        row.appendChild(cell);
    });
    updateRowForFiltering(row, item);
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
