import { create as createHttpClient } from 'ipfs-http-client'
import path from 'path'
import { execa } from 'execa'

const dlSize = '16MB'
const id = 1
const folder = 'ipfs'

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
    return c
}

async function cleanup() {
    for await (const _ of ipfs.repo.gc()) {
        continue
    }
}

const bitSize = {
    '4KB': 4,
    '16KB': 16,
    '64KB': 64,
    '1MB': 1 * 1024,
    '4MB': 4 * 1024,
    '16MB': 16 * 1024,
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

async function main() {
    const filename = `test1-${bitSize[dlSize]}KB`
    const dlPath = path.join(process.cwd(), folder, filename)
    logger(`Downloading file ${filename}`)
    await startdump(dlPath, async () => {
        await downloadIPFS(filename)
    })
    logger("Cleaning local")
    await cleanup()
    await wait(2)
}

main().catch(e => logger(e))