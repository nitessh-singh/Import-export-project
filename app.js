const pup = require('puppeteer');
const fs = require('fs');

let storeCountryData  =  async () => {
  const browser = await pup.launch({headless: false, executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'});
    const page = await browser.newPage()

    await page.goto('https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)', {
        waitUntil: 'networkidle2'
    })

    // await page.screenshot({path: 'mangoWiki.png'})

    await page.waitForSelector('table.wikitable')

    const data = await page.evaluate(async () => {
        let countryWiseData = [];
        let countryDivs = document.querySelectorAll('td .flagicon ~ a[href*="/wiki/"]')
        countryDivs.forEach((el) => {
            countryWiseData.push({
                countryName: el.innerText,
                url: el.href
            })
        })
        return countryWiseData;
    })

    let results = []
    for (object of data) {
        await page.goto(object.url, { waitUntil: 'load' })
        let eachcountryWiseData = await page.evaluate(async (obj) => {
            let dataNeeded = {};
            dataNeeded.country = obj.countryName;
            // dataNeeded.wikipedia_page = obj.url;
            let statistic = getElementsByXPath(`//table[@class="infobox"]//th[contains(text(),"Statistics")]`)
            if (statistic) {
                let exportList = getElementsByXPath(`//th//div[contains(text(),'Main export partner')]//parent::th/following-sibling::td//a[@title]`)
                let importList = getElementsByXPath(`//th//div[contains(text(),'Main import partner')]//parent::th/following-sibling::td//a[@title]`)
                let exportPartner = [];
                let importPartner = [];
                for (partner of exportList) {
                    exportPartner.push(partner.innerText ? partner.innerText : '')
                }
                for (partner of importList) {
                    importPartner.push(partner.innerText ? partner.innerText : '')
                }
                dataNeeded.export_partners = exportPartner.join(',');
                dataNeeded.import_partners = importPartner.join(',');
            } else {
                dataNeeded.import_partners = ''
                dataNeeded.export_partners = ''
            }
            return dataNeeded
            function getElementsByXPath(xpath, parent) {
                let results = [];
                let query = document.evaluate(xpath, parent || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); for (let i = 0, length = query.snapshotLength; i < length; ++i) {
                    results.push(query.snapshotItem(i));
                } return results;
            }
        }, object)
        results.push(eachcountryWiseData)
    }
    // creating csv file
     function jsonToCsv(items) {
        const header = Object.keys(items[0]);

        const headerString = header.join(',');

        // handle null or undefined values here
        const replacer = (key, value) => value ?? '';

        const rowItems = items.map((row) =>
            header
                .map((fieldName) => JSON.stringify(row[fieldName], replacer))
                .join(',')
        );

        // join header and body, and break into separate lines
        const csv = [headerString, ...rowItems].join('\r\n');
        
        return csv;
    }
    
    const csv = await jsonToCsv(results);
    console.log(csv);
    try {
        fs.appendFileSync("./export_import.csv", csv);
    } catch (err) {
        console.error(err);
    }
    console.log("stored csv file successfully")
    //
    await browser.close()
};

storeCountryData();
