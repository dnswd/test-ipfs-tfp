import path from 'path'
import { spawn } from 'child_process';
import {execa} from 'execa'

async function startdump(filename, callback) {
    const args = [
        'tcpdump',
        '-i', 'any',
        '-w', `${filename}.pcap`
    ];
    const c = execa('sudo', args)
    
    for await (const chunk of c.stderr) {
        if (chunk.toString().includes("listening on")) {
            console.log("tcpdump started");
            callback()
            break;
        }
    }
    await execa('sudo', ['pkill', '-15', 'tcpdump']);
    await execa('sudo', ['pkill', '-9', 'tcpdump']);
    console.log(`dump stored at ${filename}`);
    return c
}
