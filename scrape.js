const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)

const CATEGORY_ID = '3149'
const PARALLEL_REQUESTS = 8
const ITEMS_PER_PAGE = 16

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
        return
    }

    const totalCount = firstPage.count
    console.log(`Total items in category ${categoryId}: ${totalCount}`)

    const categoryDir = path.join(__dirname, '', categoryId)
    await mkdir(categoryDir, { recursive: true })

    await writeFile(
        path.join(categoryDir, `${categoryId}-0.json`),
        JSON.stringify(firstPage, null, 2)
    );

    const offsets = [];
    for (let offset = ITEMS_PER_PAGE; offset < totalCount; offset += ITEMS_PER_PAGE) {
        offsets.push(offset);
    }

    console.log(`Fetching remaining ${offsets.length} pages in parallel...`);

    let activeRequests = []
    for (const offset of offsets) {
        activeRequests.push(
            getData(categoryId, offset).then(async data => {
                if (data) {
                    const filePath = path.join(categoryDir, `${categoryId}-${offset}.json`)
                    await writeFile(filePath, JSON.stringify(data, null, 2))
                    console.log(`Saved: ${filePath}`)
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
}

scrapeCategory(CATEGORY_ID)