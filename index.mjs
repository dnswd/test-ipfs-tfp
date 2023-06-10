import path from 'path'
import { spawn } from 'child_process';
import {execa} from 'execa'

class TcpDump {
    name = "tcpdump";
    child//: ChildProcess;
    filePath//: string;
    closed//: boolean;
    stderr//: string;

    constructor(dir) {
        this.filePath = path.join(process.cwd(), dir);
    }

    async start(filename, callback) {
        process.on('beforeExit', () => {
                this.close();
            }
        );

        process.on('uncaughtExceptionMonitor', () => {
                this.close();
            }
        );

        console.log("Starting tcpdump");
        this.closed = false;
        this.stderr = "";
        const args = [
            'tcpdump',
            '-i', 'any',
            '-w', `${this.filePath}/${filename}.pcap`
        ];

        this.child = spawn('sudo', args)

        for await (const chunk of this.child.stderr) {
            //console.log("tshark stderr: " + chunk);
            this.stderr += chunk.toString();
            //if (this.stderr.includes("Capture started.")) {
            if (this.stderr.includes("listening on")) {
                //console.log("tshark stderr: ", this.stderr);
                console.log("tcpdump started");
                callback()
                break;
            }
        }
        
        // wait 100 millis
        await new Promise(r => setTimeout(r, 100));

        if (this.child.exitCode) {
            throw new Error(`tcpdump exited early with code ${this.child.exitCode}\nstderr: ${this.stderr}\nstderr read: ${this.child.stderr.read().toString()}`);
        } else {
            this.stderr += this.child.stderr.read();
            //this.process.stderr.on('data', data => {
            //    //this.stderr += data.toString();
            //    //console.log("tshark stderr: ", data.toString());
            //});
            this.child.on('exit', code => {
                if (code != 0 && code != 255) {
                    console.log("tshark stderr: " + this.stderr);
                    throw new Error(`tcpdump exited with code ${code}\nstderr: ${this.stderr}\nstderr read: ${this.child.stderr.read().toString()}`);
                }
            });
        }
    }

    close() {
        // if (!this.closed) {
            // console.log("Stopping tcpdump");
            this.child.kill(0);
            // this.closed = true;
        // }
    }
}

async function wait(s) {
    return new Promise(resolve => setTimeout(resolve, s*1000));
}

async function startdump(filename, callback) {
    const args = [
        'tcpdump',
        '-i', 'any',
        '-w', `${filename}.pcap`
    ];
    const c = execa('sudo', args)
    
    // for await (const chunk of c.stderr) {
    //     if (chunk.toString().includes("listening on")) {
    //         console.log("tcpdump started");
    //         callback()
    //         break;
    //     }
    // }

    console.log('here')

    return c
}

async function main() {
    // const dumper = new TcpDump("")
    for (let i = 0; i < 2; i++) {
        console.log(i)
        const args = [
            'tcpdump',
            '-i', 'any',
            '-w', `${i}.pcap`
        ];
        const c = execa('sudo', args)
        c.pid
        // const c = await startdump(i, ()=> {console.log('UYEY')})
        // console.log('i')
        // await dumper.start(`1-${i}`, () => {console.log('UYEY')})
        await wait(5)
        console.log(c.pid)
        execa('sudo', ['pkill', '-9', 'tcpdump']);
        // console.log('zczcz')
    }
    console.log('Done')
}



main().catch(e => console.log(e))