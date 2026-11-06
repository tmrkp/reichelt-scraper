#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { JSDOM } = require('jsdom')
const { Parser } = require('json2csv')

const PARALLEL_REQUESTS = 8
const ITEMS_PER_PAGE = 16

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error("Error: You must provide at least one filename and one category ID.")
  console.error("Example: node scrape.js result 3141 3160")
  process.exit(1)
}

let fileBase = args[0]

if (!fileBase || typeof fileBase !== "string") {
  console.error("Error: Invalid filename.")
  process.exit(1)
}

if (/^\d+$/.test(fileBase)) {
  console.error("Error: Filename cannot be only numbers.")
  process.exit(1)
}

if (!/^[a-zA-Z0-9_\-]+$/.test(fileBase)) {
  console.error("Error: Filename contains invalid characters. Use letters, numbers, underscores or dashes.")
  process.exit(1)
}

const now = new Date()
const yyyy = now.getFullYear()
const mm = String(now.getMonth() + 1).padStart(2, "0") // month is 0-based
const dd = String(now.getDate()).padStart(2, "0")
const dateStr = `${yyyy}-${mm}-${dd}`

// Build CSV filename with date
const csvFile = `${fileBase}_${dateStr}.csv`;

const categoryIds = args.slice(1)

if (!categoryIds.every(id => /^\d+$/.test(id))) {
  console.error("Error: All arguments after the CSV file must be numbers.")
  process.exit(1)
}

console.log("CSV file:", csvFile)
console.log("Category IDs:", categoryIds.map(Number))

function getURL(category, offset) {
    return `https://www.reichelt.de/api/category/getProducts/${category}/${offset}/${ITEMS_PER_PAGE}/*/0/2000000/filter/null/null/null/null/null/article_artnr%20asc`
}

async function getData(category, offset) {
    const url = getURL(category, offset)
    try {
        const response = await fetch(url)
        if (response.ok) {
            return await response.json()
        } else {
            console.error(`Request failed with status ${response.status} for offset ${offset}`)
            return null
        }
    } catch (error) {
        console.error(`Error fetching data for offset ${offset}:`, error.message)
        return null
    }
}

async function scrapeCategory(categoryId) {
    console.log(`Fetching initial data for category ${categoryId}...`)
    const firstPage = await getData(categoryId, 0)
    if (!firstPage || !firstPage.count) {
        console.error(`Failed to fetch initial data for category ${categoryId}. Exiting.`)
        process.exit(0)
    }

    const totalCount = firstPage.count
    console.log(`Total items in category ${categoryId}: ${totalCount}`)

    let results = [firstPage.html]

    const offsets = []
    for (let offset = ITEMS_PER_PAGE; offset < totalCount; offset += ITEMS_PER_PAGE) {
        offsets.push(offset)
    }

    let pages = offsets.length
    let i = 0

    console.log(`Fetching remaining ${offsets.length} pages in parallel...`);

    let activeRequests = []
    for (const offset of offsets) {
        activeRequests.push(
            getData(categoryId, offset).then(async data => {
                if (data) {
                    results.push(data.html)
                    i++
                    console.log(`Scraped page ${i}/${pages}`)
                }
            })
        );

        if (activeRequests.length >= PARALLEL_REQUESTS) {
            await Promise.all(activeRequests)
            activeRequests = []
        }
    }

    if (activeRequests.length > 0) {
        await Promise.all(activeRequests)
    }
    console.log(`Scraping completed for category ${categoryId}`)

    return results
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
        const price = article.querySelector('meta[itemprop=price]')?.content.replace(/\./g, ',') || ''
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
    let htmlPages = []
    for (let categoryId of categoryIds) {
        htmlPages = [...htmlPages, await scrapeCategory(categoryId)]
    }

    let allProducts = []
    htmlPages.forEach(html => {
        allProducts = allProducts.concat(extractProductData(html))
    });
    console.log(`Extracted ${allProducts.length} products.`)

    const allFields = [...new Set(allProducts.flatMap(obj => Object.keys(obj)))]

    const json2csvParser = new Parser({ fields: allFields })

    const csv = json2csvParser.parse(allProducts)

    fs.writeFileSync(csvFile, csv)
})();
