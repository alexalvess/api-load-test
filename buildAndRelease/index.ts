import tl = require('azure-pipelines-task-lib/task');
import http from 'k6/http';

const fs = require('fs');

async function run() {
    try {
        const filePath: string | undefined = tl.getInput('filePath', true);

        if(!filePath) 
            throw new Error("File not found.");

        const dataFile = fs.readFileSync(filePath);
        const data = JSON.parse(dataFile);

        if(!data)
            throw new Error("File can not read.");
        if(!data.baseAddress) 
            throw new Error("Inform a valid host/address.");
        if(!data.testCases || (data.testCases as []).length == 0) 
            throw new Error("Test Cases not found.");
        
        (data.testCases as []).forEach((item: any) => {
            if(!item.route) 
                throw new Error("Inform a valid route.");
            if(!item.verb) 
                throw new Error(`Invalid verb on route ${item.route}.`);
            if(!item.vus || !item.time) 
                throw new Error(`Inform a valid battery of test from route ${item.route}`);
            if((item.vus as []).length != (item.time as []).length) 
                throw new Error(`Inform a valid battery of test from route ${item.route}`);
            
            const params = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const variables: string[] = (item.route as string).match(/\{([^}]*)}/g);
            
            variables.forEach((variable) => {
                var randomData = loadRandomData(item.parameters[variable.match(/\{([^}]*)}/)[1]])
                item.route.replace(variable, randomData);
            });
        });

    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
};

run();

function loadRandomData(list) {
    let randomData = list[Math.floor(Math.random() * list.length)];
    return randomData;
}