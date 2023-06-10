import { Storage } from "@google-cloud/storage";
import { create as createHttpClient } from 'ipfs-http-client'
import crypto from 'crypto';
import path from 'path'

const generateRandomKiloBytes = (kiloByteSize) => {
    const byteSize = kiloByteSize * 1024;
    return crypto.randomBytes(byteSize);
};

const ipfs = createHttpClient({
    host: 'localhost',
    port: 5001,
    protocol: 'http'
})

const logger = (message) => {
    console.log(`${Date.now()},${message}`)
}

const serviceKey = path.join(process.cwd(), "keys.json");

const storage = new Storage({
    keyFilename: serviceKey,
    projectId: "rclone-tasla",
});

const bucket = storage.bucket("test-centralized-store");

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

async function main() {
    logger("Downloading files")

    for (const size in bitSize) {
        logger(`Downloading test-${size}`)
        await downloadGCP(path.join(process.cwd(), `test-${size}`))
    }

    for (const size in bitSize) {
        const filePath = path.join(process.cwd(), `test-${size}`)
        const readStream = fs.createReadStream(filePath)
        const res = await ipfs.add(readStream, {
            pin: true
        })
        console.log(`${size}: ${res.path},`)
        logger(`Pinned test-${size}: ${res.path}`)
    }

    logger("Done")
}

main().catch(e => logger(e))