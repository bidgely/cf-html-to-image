import puppeteer from "@cloudflare/puppeteer";

async function banao(eventBody) {
    try {
        const browser = await puppeteer.launch(env.MYBROWSER, { keep_alive: 60_000 });
        const page = await browser.newPage();

        // Handle HTML content
        if (eventBody.html) {
            const screenshotOptions = {};
            let dimensions = {};
            let setViewport = false;

            if (eventBody.width && eventBody.height) {
                setViewport = true;
                dimensions.width = eventBody.width;
                dimensions.height = eventBody.height;
            } else {
                screenshotOptions.fullPage = true;
            }

            if (eventBody.qualityFactor) {
                setViewport = true;
                dimensions.deviceScaleFactor = eventBody.qualityFactor;
            }

            if (setViewport) {
                await page.setViewport(dimensions);
            }

            await page.setContent(eventBody.html, { waitUntil: 'networkidle2' });

            // Wait 2 seconds like Lambda function
            await new Promise(resolve => setTimeout(resolve, 2000));

            const screenshot = await page.screenshot(screenshotOptions);
            const screenshotBase64 = Buffer.from(screenshot).toString('base64');

            return new Response(JSON.stringify({
                statusCode: 200,
                headers: {
                    'Content-Type': 'image/png'
                },
                body: screenshotBase64,
                isBase64Encoded: true
            }), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Handle URL screenshot
        if (eventBody.url) {
            const screenshotOptions = { fullPage: true };
            await page.setViewport({
                width: eventBody.width ? eventBody.width : 1280,
                height: 0
            });
            await page.goto(eventBody.url, { waitUntil: 'networkidle0' });

            const screenshot = await page.screenshot(screenshotOptions);
            const screenshotBase64 = Buffer.from(screenshot).toString('base64');

            return new Response(JSON.stringify({
                statusCode: 200,
                headers: {
                    'Content-Type': 'image/png'
                },
                body: screenshotBase64,
                isBase64Encoded: true
            }), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Handle PDF generation
        if (eventBody.pdfURL) {
            await page.goto(eventBody.pdfURL, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ printBackground: true });

            return new Response(JSON.stringify({
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/pdf'
                },
                body: pdf.toString('base64'),
                isBase64Encoded: true
            }), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        return new Response('No valid payload found', { status: 400 });

    } catch (error) {
        console.error('Error:', error);
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}

let eventBody = {
    "html": "<!DOCTYPE html>\n<html>\n   <head>\n      <script src='https://code.highcharts.com/10.3.3/highcharts.js'></script>\n   </head>\n   <body style='margin:0;'\n      <div id='container' style='width: 600px; height: 360px;'></div>\n      <script type='text/javascript'>Highcharts.chart('container',{chart:{type: 'column', backgroundColor: '#F4F7FA',\n      }, title:{text: ''}, xAxis:{categories: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], crosshair: true, labels:{ style:{color : '#333333'}}, reversed: false}, yAxis:{  title:{text: ''}, opposite: false, labels:{format: \"$value\",style:{color:'#333333'}}, gridLineColor: '#D9D9D9'}, plotOptions:{column:{pointPadding: 0.2, borderWidth: 0, negativeColor: '#379C4F'}, series:{animation:false,states:{hover:{enabled: false}}}}, series: [ { showInLegend: false,  data: [122.35, 259.62, 223.93, 217.73, 137.17, 98.99, 79.81, 92.23, 79.46, 78.28, 97.64, 104.01, 137.23],color:'#D6291A'}], tooltip:{enabled: false}, credits:{enabled: false}});\n</script>\n   </body>\n</html>\n",
    "height": 360,
    "width": 600,
    "imageExpiryTime": 63072000,
    "imageIdentifier": "uYUKFIfXri-1750783761"
}

banao(eventBody);


