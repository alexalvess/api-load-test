import { environment } from './environments/environment';
import tl = require('azure-pipelines-task-lib/task');

const fs = require('fs');
const exec = require('child_process').exec;

async function run() {
    try {
        let filePath: string | undefined;
        let baseAddress: string | undefined;

        if(environment.production) {
            baseAddress  = tl.getInput('baseAddress', true);
            filePath = tl.getInput('filePath', true);
        } else {
            filePath = environment.filePath;
            baseAddress = environment.baseAddress;
        }

        console.log("########## Starting the basic validation");
        if(!filePath)
            throw new Error("File not found.");
        console.log(`✔ File path found: ${filePath}`);

        const dataFile = fs.readFileSync(filePath);
        const data = JSON.parse(dataFile);

        if(!data)
            throw new Error("File can not read.");
        console.log("✔ File can read.")

        if(!baseAddress) 
            throw new Error("Inform a valid host/address.");
        console.log("✔ The base address/host is valid.")

        if(!data.testCases || (data.testCases as []).length == 0) 
            throw new Error("Test Cases not found.");
        console.log("✔ Test cases found.")
        
        console.log("########## Ending basic validation");

        console.log(`########## Starting the load test for base address: ${baseAddress}`);
        (data.testCases as []).forEach((item: any, index: number) => {
            if(!item.route) 
                throw new Error("Inform a valid route.");
            console.log("✔ A valid route was found.");

            if(!item.verb) 
                throw new Error(`Invalid verb on route ${item.route}.`);
            console.log("✔ A valid verb was found.");

            if(!item.statusCodeExpect || item.statusCodeExpect.length === 0)
                throw new Error('Status code is expect.');
            console.log("✔ The status codes expect were found.");

            if(!item.vus || !item.time) 
                throw new Error(`Inform a valid battery of test from route ${item.route}`);
            if((item.vus as []).length != (item.time as []).length) 
                throw new Error(`Inform a valid battery of test from route ${item.route}`);
            console.log("✔ A valid battery of the test was found.");
            
            if(baseAddress?.endsWith('/'))
                baseAddress = baseAddress.slice(0, -1);
            if((item.route as string).startsWith('/'))
                item.route = (item.route as string).slice(1);
            console.log("✔ The base address and route were normalized.");

            process.env["BASE_ADDRESS"] = baseAddress;
            process.env["ROUTE"] = item.route;
            process.env["VERB"] = item.verb;
            process.env["DATA_PARAMETERS"] = JSON.stringify(data.parameters);
            process.env["PAYLOAD"] = item.payload ? JSON.stringify(item.payload) : undefined;
            process.env["STATUS_CODE_EXPECT"] = JSON.stringify(item.statusCodeExpect);
            console.log("✔ Base address, route, verb, parameters, payload format, and status codes expected were added on environment variables.");

            (item.vus as []).forEach((vu: any, vu_index: number) => {
                const reportFileName = `../dist/test_result_${index + 1}_${vu_index + 1}.json`;
                const envs = {
                    report: `--summary-export=${reportFileName}`,
                    vu: `--vus=${vu}`,
                    duration: `--duration=${item.time[vu_index]}s`
                };

                exec(
                    `k6 run ${envs.report} ${envs.vu} ${envs.duration} ../dist/script.js`, 
                    (error: any, stdout: any, stderr: any) => {
                        if(error || (stderr && stderr.includes('level=error'))) {
                            console.error(error, stderr);
                            return;
                        }

                        const reportFile = fs.readFileSync(reportFileName);
                        const reportData = JSON.parse(reportFile);

                        const webhookData = {
                            baseAddress: baseAddress,
                            route: `${item.verb.toUpperCase()} ${item.route}`,
                            vus: vu,
                            duration: item.time[vu_index],
                            checks: {
                                success: reportData.metrics.checks.passes,
                                fails: reportData.metrics.checks.fails,
                                percentage: reportData.metrics.checks.value
                            },
                            dataSent:reportData.metrics.data_sent.count,
                            dataReceived: reportData.metrics.data_received.count,
                            iterations: {
                                count: reportData.metrics.iterations.count,
                                rate: reportData.metrics.iterations.rate
                            },
                            iterationDuration: {
                                med: reportData.metrics.iteration_duration.med,
                                max: reportData.metrics.iteration_duration.max,
                                p90: reportData.metrics.iteration_duration["p(90)"],
                                p95: reportData.metrics.iteration_duration["p(95)"],
                                avg: reportData.metrics.iteration_duration.avg,
                                min: reportData.metrics.iteration_duration.min
                            }
                        };

                        console.log(`########## The ${index +1}° battery result from the route ${webhookData.route}:`);
                        console.log(`ℹ VUs: ${vu} | Duration: ${item.time[vu_index]}`);
                        console.log(`ℹ Data sent: ${webhookData.dataSent}B | Data received: ${webhookData.dataReceived}B`);
                        console.log(`ℹ Iterations: ${webhookData.iterations.count} | ${webhookData.iterations.rate}/ms | ${webhookData.iterations.rate / 60} TPS`);
                        console.log(`ℹ Iterations: avg = ${webhookData.iterationDuration.avg}ms | min = ${webhookData.iterationDuration.min}ms | med = ${webhookData.iterationDuration.med}ms | max = ${webhookData.iterationDuration.max}ms | p(90) = ${webhookData.iterationDuration.p90}ms | p(95) = ${webhookData.iterationDuration.p95}ms`);
                        console.log(`${webhookData.checks.percentage === 1 ? '✅' : '❌'} Percentage: ${webhookData.checks.percentage * 100}% | Success: ${webhookData.checks.success} | Fails: ${webhookData.checks.fails}`);
                        console.log(" ");
                });
            });
        });
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
};

run();