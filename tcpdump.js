export class TcpDump {
    name = "tshark";
    process//: ChildProcess;
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
            '-i', 'any',
            '-w', `${filename}.pcap`
        ];

        this.process = spawn('tcpdump', args)

        for await (const chunk of this.process.stderr) {
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

        if (this.process.exitCode) {
            throw new Error(`tcpdump exited early with code ${this.process.exitCode}\nstderr: ${this.stderr}\nstderr read: ${this.process.stderr.read().toString()}`);
        } else {
            this.stderr += this.process.stderr.read();
            //this.process.stderr.on('data', data => {
            //    //this.stderr += data.toString();
            //    //console.log("tshark stderr: ", data.toString());
            //});
            this.process.on('exit', code => {
                if (code != 0 && code != 255) {
                    //console.log("tshark stderr: " + this.stderr);
                    throw new Error(`tcpdump exited with code ${code}\nstderr: ${this.stderr}\nstderr read: ${this.process.stderr.read().toString()}`);
                }
            });
        }
    }

    close() {
        if (!this.closed) {
            console.log("Stopping tcpdump");
            this.process.kill();
            this.closed = true;
        }
    }
}