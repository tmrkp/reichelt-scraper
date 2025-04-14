const { JSDOM } = require('jsdom')
const path = require('path')
const fs = require('fs')
const { Parser } = require('json2csv');

const CATEGORY_IDS = ['3149']
const CATEGORY_DIRS = CATEGORY_IDS.map(id => path.join(__dirname, id))

async function readJSONFiles(directory) {
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.json'))
    let data = []
    for (const file of files) {
        const filePath = path.join(directory, file)
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        if (content.html) {
            data.push(content.html)
        }
    }
    return data
}

async function readHTMLFiles(directory) {
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.html'))
    let data = []
    for (const file of files) {
        const filePath = path.join(directory, file)
        const content = fs.readFileSync(filePath, 'utf8')
        data.push(content)
    }
    return data
}

function extractProductData(html) {
    const dom = new JSDOM(html)
    const document = dom.window.document
    let products = []
    document.querySelectorAll('.al_gallery_article').forEach(article => {
        const name = article.querySelector('meta[itemprop=name]')?.content || ''
        const productID = article.querySelector('meta[itemprop=productID]')?.content || ''
        const sku = article.querySelector('meta[itemprop=sku]')?.content || ''
        const url = article.querySelector('a[itemprop=url]')?.href || ''
        const price = article.querySelector('meta[itemprop=price]')?.content || ''
        const props = Array.from(article.querySelectorAll('.al_artinfo_props li')).reduce((acc, li) => {
            const key = li.querySelector('p:first-child')?.textContent.trim()
            const value = li.querySelector('p:last-child')?.textContent.trim()
            acc[key] = value
            return acc
        }, {})
        if (productID) {
            products.push({ productID, name, sku, url, price, ...props })
        }
    });
    return products;
}

(async function main() {
    htmlPages = []
    for (const categoryDir of CATEGORY_DIRS) {
        console.log(`Reading JSON files from ${categoryDir}...`)
        const jsonFiles = await readJSONFiles(categoryDir)
        console.log(`Reading HTML files from ${categoryDir}...`)
        const htmlFiles = await readHTMLFiles(categoryDir)
        htmlPages = [...htmlPages, ...jsonFiles, ...htmlFiles]
    }

    let allProducts = []
    htmlPages.forEach(html => {
        allProducts = allProducts.concat(extractProductData(html))
    });
    console.log(`Extracted ${allProducts.length} products.`)
    
    const allFields = [...new Set(allProducts.flatMap(obj => Object.keys(obj)))]

    const json2csvParser = new Parser({ fields: allFields })

    const csv = json2csvParser.parse(allProducts)

    fs.writeFileSync(`result.csv`, csv)
})();