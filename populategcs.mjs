import { Storage } from "@google-cloud/storage";
import crypto from 'crypto';
import path from 'path'

const generateRandomKiloBytes = (kiloByteSize) => {
    const byteSize = kiloByteSize * 1024;
    return crypto.randomBytes(byteSize);
};

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

function uploadGCP(filename, size) {
    return new Promise((resolve, reject) => {
        const blobStream = bucket
            .file(filename)
            .createWriteStream({ resumable: false });
        blobStream.on("finish", () => {
            logger(`Finished upload ${size}`)
            resolve(filename)
        }).on("error", (e) => {
            logger(`Unable to upload ${size}: \n${e}`)
            reject(e)
        });

        logger(`Uploading ${size}`)
        blobStream.end(generateRandomKiloBytes(bitSize[size]))
        // return filename
    })
}

async function main() {
    logger("Uploading files")
    for (const size in bitSize) {
        await uploadGCP(`test-${size}`, size)
    }
    logger("Done")
}

main().catch(e => logger(e))