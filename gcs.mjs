import { Storage } from "@google-cloud/storage";
import path from 'path'
import fs from 'fs'
import { execa } from 'execa'

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

const serviceKey = path.join(process.cwd(), "keys.json");

const storage = new Storage({
    keyFilename: serviceKey,
    projectId: "rclone-tasla",
});

const bucket = storage.bucket("test-centralized-store");

async function cleanup(filename) {
    await fs.unlink(filename, (err) => {
        if (err) {
            logger(err)
        }
    })
}

const bitSize = {
    '4KB': 4,
    '16KB': 16,
    '64KB': 64,
    '1MB': 1 * 1024,
    '4MB': 4 * 1024,
    '16MB': 16 * 1024,
}

async function downloadGCP(filename) {
    const file = bucket.file(filename)
    const readStream = file.createReadStream();
    const writeStream = fs.createWriteStream(filename);

    readStream.pipe(writeStream);
    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

const downloaded = ['4KB', '16KB', '64KB']

async function main() {
    for (const size in bitSize) {
        if (downloaded.indexOf(size) > -1) continue
        const filename = `test-${size}`
        for (let i = 1; i <= 5; i++) {
            logger(`Downloading file ${filename}`)
            const dumpPath = path.join(process.cwd(), 'gcs', size, i.toString())
            await startdump(dumpPath, async () => {
                await downloadGCP(filename)
            })
            logger("Cleaning local")
            await cleanup(path.join(process.cwd(), filename))
            await wait(2)
        }
    }

}

main().catch(e => logger(e))