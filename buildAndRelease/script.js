import http from 'k6/http';
import { check } from 'k6';

export default function() {
    let baseAddress = __ENV.BASE_ADDRESS;
    let route = __ENV.ROUTE;
    let verb = __ENV.VERB;
    let dataParameters = JSON.parse(__ENV.DATA_PARAMETERS);
    let checks = JSON.parse(__ENV.STATUS_CODE_EXPECT);
    let payload;

    try {
        payload = JSON.parse(__ENV.PAYLOAD);
    } catch (error) { }

    const params = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    route = normalizeRoute(route, dataParameters);
    payload = normalizePayload(payload, dataParameters);
    const url = `${baseAddress}/${route}`;

    if(payload)
        payload = JSON.stringify(payload);

    let response = http[verb.toLowerCase()](url, payload, params);

    check(response, {
        [`is status code ${checks.join(' or ')} from route ${verb.toUpperCase()} ${route}`]: (r) => checks.includes(r.status)
    });
}

function normalizePayload(payload, dataParameters) {
    if(!payload)
        return;

    Object.keys(payload).forEach(key => {
        const value = payload[key];
        const valueNormalized = value.match(/\{([^}]*)}/)[1];

        payload[key] = loadRandomData(dataParameters[valueNormalized]);
    });

    return payload;
}

function normalizeRoute(route, dataParameters) {
    const variables = (route).match(/\{([^}]*)}/g);

    if(!variables)
        return route;

    variables.forEach((variable) => {
        var randomData = loadRandomData(dataParameters[variable.match(/\{([^}]*)}/)[1]])
        route = route.replace(variable, randomData);
    });

    return route;
}

function loadRandomData(list) {
    let randomData = list[Math.floor(Math.random() * list.length)];
    return randomData;
}