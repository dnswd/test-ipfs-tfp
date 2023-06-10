import { create as createHttpClient } from 'ipfs-http-client'
import path from 'path'
import { execa } from 'execa'

const nodeCount = 2

const ipfs = createHttpClient({
    host: 'localhost',
    port: 5001,
    protocol: 'http'
})

const logger = (message) => {
    console.log(`${Date.now() / 1000},${message}`)
}

async function wait(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function startdump(filename, callback) {
    const args = [
        'tcpdump',
        '-i', 'any',
        '-w', `${filename}.pcap`
    ];
    const c = execa('sudo', args)

    for await (const chunk of c.stderr) {
        if (chunk.toString().includes("listening on")) {
            logger("tcpdump started");
            await callback()
            break;
        }
    }
    logger('stopping');
    await execa('sudo', ['pkill', '-15', 'tcpdump']);
    logger(`dump stored at ${filename}`);
}

async function cleanup() {
    for await (const _ of ipfs.repo.gc()) {
        continue
    }
}

const ipfsCid = {
    '4KB': '',
    '16KB': '',
    '64KB': '',
    '1MB': '',
    '4MB': '',
    '16MB': '',
}

async function downloadIPFS(cid) {
    try {
        // Add try/catch for catch fetch errors throw navigation
        for await (const file of ipfs.get(cid)) {
            // Navigate all files (and dirs if exists though not in this test)
            if (file.type === 'dir') {
                continue;
            }

            if (file.type === 'file') {
                for await (const chunk of file.content) {
                    continue
                }
            }
        }
    } catch {
        logger('Fetch failed');
    }
}

const downloaded = []

async function main() {
    for (const size in ipfsCid) {
        if (downloaded.indexOf(size) > -1) continue
        for (let i = 1; i <= 5; i++) {
            logger(`Downloading file ${size}: ${ipfsCid[size]}`)
            const dumpPath = path.join(process.cwd(), 'ipfs', size, nodeCount, i.toString())
            await startdump(dumpPath, async () => {
                await downloadIPFS(ipfsCid[size])
            })
            // logger("Cleaning local") // not stored in the disk
            // await cleanup(path.join(process.cwd(), filename)) 
            await wait(2)
        }
    }
}

main().catch(e => logger(e))